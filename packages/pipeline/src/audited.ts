import { XMLParser, XMLValidator } from 'fast-xml-parser';

export const SAFE_ALIASES: Record<string, string> = {
  亻: '人',
  氵: '水',
  氺: '水',
  忄: '心',
  '⺗': '心',
  扌: '手',
  犭: '犬',
  礻: '示',
  衤: '衣',
  刂: '刀',
  '⺉': '刀',
  灬: '火',
  艹: '艸',
  '⺤': '爪',
  爫: '爪',
  '⻏': '邑',
  '⻖': '阜'
};

export interface AuditedNode {
  id: string;
  element?: string;
  original?: string;
  variant: boolean;
  partial: boolean;
  part?: number;
  number?: string;
  paths: string[];
  children: AuditedNode[];
}

export interface AuditedSource {
  name: string;
  url: string;
  revision: string;
  license: string;
  sha256: string;
}

export interface AuditedRecipe {
  id: string;
  output: string;
  components: string[];
  signature: string;
  source: { file: string; nodeId: string };
  originalComponents: string[];
}

export interface AuditedBundle {
  contentVersion: string;
  source: AuditedSource;
  normalizationMap: Record<string, string>;
  elements: Array<{
    id: string;
    glyph: string;
    kind: 'kanji' | 'component';
    atomicReason?: string;
  }>;
  recipes: AuditedRecipe[];
  fusionIndex: Record<string, string[]>;
  seeds: string[];
  witnesses: Record<string, { depth: number; recipeId?: string }>;
  stats: {
    kanji: number;
    elements: number;
    recipes: number;
    seeds: number;
    reachable: number;
    arities: Record<string, number>;
    seedMinimality: 'minimum-for-acyclic-graph' | 'inclusion-minimal';
  };
}

export interface RejectedCandidate {
  output: string;
  file: string;
  nodeId: string;
  reason: string;
}
export interface SourceTree {
  file: string;
  kanji: string;
  tree: AuditedNode;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: false,
  isArray: (name) => name === 'g' || name === 'path'
});

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const textAttribute = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
export const signature = (components: string[]): string => [...components].sort().join('|');
const normalize = (value: string): string => SAFE_ALIASES[value] ?? value;
const isGlyph = (value: string): boolean => [...value].length === 1 && !/[|\s]/u.test(value);

export function parseAuditedSvg(xml: string, file: string): SourceTree {
  const match = /^([0-9a-f]{5,6})\.svg$/.exec(file);
  if (!match) throw new Error(`Noncanonical filename: ${file}`);
  const kanji = String.fromCodePoint(Number.parseInt(match[1], 16));
  if (!/^\p{Unified_Ideograph}$/u.test(kanji)) throw new Error(`Not a unified ideograph: ${file}`);
  const clean = xml.replace(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/g, '');
  const valid = XMLValidator.validate(clean);
  if (valid !== true) throw new Error(`Malformed SVG: ${file}: ${valid.err.msg}`);
  const svg = record(record(parser.parse(clean))['svg']);
  const makeNode = (value: unknown): AuditedNode => {
    const raw = record(value);
    const part = textAttribute(raw['@_kvg:part']);
    return {
      id: textAttribute(raw['@_id']) ?? '',
      element: textAttribute(raw['@_kvg:element']),
      original: textAttribute(raw['@_kvg:original']),
      variant: raw['@_kvg:variant'] === 'true',
      partial: raw['@_kvg:partial'] === 'true',
      part: part === undefined ? undefined : Number(part),
      number: textAttribute(raw['@_kvg:number']),
      paths: array(raw['path']).map((p) => textAttribute(record(p)['@_id']) ?? ''),
      children: array(raw['g']).map(makeNode)
    };
  };
  const roots = array(svg['g']).map(makeNode);
  const find = (nodes: AuditedNode[]): AuditedNode | undefined => {
    for (const node of nodes) {
      if (node.id === `kvg:${match[1]}`) return node;
      const nested = find(node.children);
      if (nested) return nested;
    }
    return undefined;
  };
  const tree = find(roots);
  if (!tree || tree.element !== kanji) throw new Error(`Missing or mismatched root: ${file}`);
  const paths = allPaths(tree);
  if (!paths.length || paths.some((p) => !p) || new Set(paths).size !== paths.length) {
    throw new Error(`Invalid stroke IDs: ${file}`);
  }
  return { file, kanji, tree };
}

const allPaths = (node: AuditedNode): string[] => [
  ...node.paths,
  ...node.children.flatMap(allPaths)
];

function boundaries(node: AuditedNode): { nodes: AuditedNode[]; reason?: string } {
  if (node.partial) return { nodes: [], reason: 'partial-element' };
  const collect = (children: AuditedNode[]): AuditedNode[] =>
    children.flatMap((child) => (child.element ? [child] : collect(child.children)));
  const raw = collect(node.children);
  if (!raw.length) return { nodes: [], reason: 'no-named-decomposition' };
  if (raw.flatMap(allPaths).length !== allPaths(node).length) {
    return { nodes: [], reason: 'uncovered-strokes' };
  }
  const groups = new Map<string, AuditedNode[]>();
  for (const child of raw) {
    if (child.part === undefined) continue;
    const key = `${child.element}|${child.number ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), child]);
  }
  const merged = new Map<AuditedNode, AuditedNode>();
  const consumed = new Set<AuditedNode>();
  for (const parts of groups.values()) {
    const ordered = [...parts].sort((a, b) => (a.part ?? 0) - (b.part ?? 0));
    if (
      ordered.length < 2 ||
      ordered.some((p, i) => p.part !== i + 1) ||
      ordered.some(
        (p) => p.partial || p.variant !== ordered[0].variant || p.original !== ordered[0].original
      )
    ) {
      return { nodes: [], reason: 'ambiguous-or-incomplete-split-element' };
    }
    const first = ordered[0];
    merged.set(parts[0], {
      ...first,
      id: ordered.map((p) => p.id).join('+'),
      part: undefined,
      paths: ordered.flatMap((p) => p.paths),
      children: ordered.flatMap((p) => p.children)
    });
    parts.slice(1).forEach((p) => consumed.add(p));
  }
  const nodes = raw.filter((n) => !consumed.has(n)).map((n) => merged.get(n) ?? n);
  if (nodes.some((n) => n.partial)) return { nodes: [], reason: 'partial-child-element' };
  if (nodes.some((n) => !n.element || !isGlyph(n.element)))
    return { nodes: [], reason: 'unsupported-component-label' };
  return { nodes };
}

function frontiers(node: AuditedNode): { cuts: AuditedNode[][]; reason?: string } {
  const first = boundaries(node);
  if (first.reason) return { cuts: [], reason: first.reason };
  if (first.nodes.length > 4) return { cuts: [], reason: 'arity-above-four' };
  const cuts: AuditedNode[][] = [];
  const queue = [first.nodes];
  const seen = new Set<string>();
  while (queue.length) {
    const cut = queue.shift()!;
    const key = cut.map((n) => n.id).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    if (cut.length >= 2) cuts.push(cut);
    cut.forEach((child, index) => {
      // A contextual variant's internals cannot stand in for its canonical shape.
      if (child.variant || (child.original && child.original !== child.element)) return;
      const expanded = boundaries(child);
      if (expanded.reason || !expanded.nodes.length) return;
      const next = [...cut.slice(0, index), ...expanded.nodes, ...cut.slice(index + 1)];
      if (next.length <= 4) queue.push(next);
    });
  }
  return { cuts, reason: cuts.length ? undefined : 'no-multi-element-decomposition' };
}

export function closure(
  seeds: Iterable<string>,
  recipes: AuditedRecipe[]
): Record<string, { depth: number; recipeId?: string }> {
  const witnesses: Record<string, { depth: number; recipeId?: string }> = {};
  for (const id of seeds) witnesses[id] = { depth: 0 };
  let changed = true;
  while (changed) {
    changed = false;
    for (const recipe of recipes) {
      if (witnesses[recipe.output] || recipe.components.some((id) => !witnesses[id])) continue;
      witnesses[recipe.output] = {
        depth: 1 + Math.max(...recipe.components.map((id) => witnesses[id].depth)),
        recipeId: recipe.id
      };
      changed = true;
    }
  }
  return witnesses;
}

function isAcyclic(ids: string[], recipes: AuditedRecipe[]): boolean {
  const dependencies = new Map<string, Set<string>>(ids.map((id) => [id, new Set<string>()]));
  for (const recipe of recipes)
    for (const id of recipe.components) dependencies.get(recipe.output)?.add(id);
  const done = new Set<string>();
  const active = new Set<string>();
  const visit = (id: string): boolean => {
    if (active.has(id)) return false;
    if (done.has(id)) return true;
    active.add(id);
    for (const dep of dependencies.get(id) ?? []) if (!visit(dep)) return false;
    active.delete(id);
    done.add(id);
    return true;
  };
  return ids.every(visit);
}

export function compileAudited(
  trees: SourceTree[],
  source: AuditedSource
): {
  bundle: AuditedBundle;
  audit: {
    rejectedCandidates: RejectedCandidate[];
    reasons: Record<string, number>;
    mandatorySeeds: string[];
    cycleSeeds: string[];
    source: AuditedSource;
    stats: AuditedBundle['stats'];
  };
} {
  const targets = new Set(trees.map((tree) => tree.kanji));
  const recipes: AuditedRecipe[] = [];
  const rejectedCandidates: RejectedCandidate[] = [];
  const dedupe = new Set<string>();
  const reasonsById = new Map<string, Set<string>>();
  const reject = (output: string, file: string, nodeId: string, reason: string): void => {
    rejectedCandidates.push({ output, file, nodeId, reason });
    reasonsById.set(output, new Set([...(reasonsById.get(output) ?? []), reason]));
  };
  for (const { file, tree } of [...trees].sort((a, b) => a.file.localeCompare(b.file))) {
    const visit = (node: AuditedNode, incompleteAncestor: boolean): void => {
      const incomplete =
        incompleteAncestor ||
        node.partial ||
        node.part !== undefined ||
        node.variant ||
        Boolean(node.original && node.original !== node.element);
      if (node.element && isGlyph(node.element)) {
        if (incomplete) {
          reject(node.element, file, node.id, 'contextual-or-partial-node');
        } else {
          const result = frontiers(node);
          if (result.reason) reject(node.element, file, node.id, result.reason);
          for (const cut of result.cuts) {
            const originalComponents = cut.map((n) => n.element!);
            const components = originalComponents.map(normalize);
            const sig = signature(components);
            if (components.includes(node.element)) {
              reject(node.element, file, node.id, 'self-dependent-recipe');
              continue;
            }
            const key = `${node.element}:${sig}`;
            if (dedupe.has(key)) continue;
            dedupe.add(key);
            recipes.push({
              id: `r${recipes.length + 1}`,
              output: node.element,
              components,
              signature: sig,
              source: { file, nodeId: node.id },
              originalComponents
            });
          }
        }
      }
      node.children.forEach((child) => visit(child, incomplete));
    };
    visit(tree, false);
  }
  const ids = [
    ...new Set([...targets, ...recipes.flatMap((r) => [r.output, ...r.components])])
  ].sort();
  const producers = new Set(recipes.map((r) => r.output));
  const mandatorySeeds = ids.filter((id) => !producers.has(id));
  const seedSet = new Set(mandatorySeeds);
  let witnesses = closure(seedSet, recipes);
  for (const id of ids) {
    if (witnesses[id]) continue;
    seedSet.add(id);
    witnesses = closure(seedSet, recipes);
  }
  for (const id of [...seedSet].reverse()) {
    if (!producers.has(id)) continue;
    const candidate = new Set(seedSet);
    candidate.delete(id);
    if (Object.keys(closure(candidate, recipes)).length === ids.length) seedSet.delete(id);
  }
  const seeds = [...seedSet].sort();
  witnesses = closure(seeds, recipes);
  if (Object.keys(witnesses).length !== ids.length)
    throw new Error('Graph reachability invariant failed');
  const fusionIndex: Record<string, string[]> = {};
  for (const recipe of recipes)
    fusionIndex[recipe.signature] = [
      ...new Set([...(fusionIndex[recipe.signature] ?? []), recipe.output])
    ].sort();
  const arities: Record<string, number> = {};
  for (const recipe of recipes)
    arities[recipe.components.length] = (arities[recipe.components.length] ?? 0) + 1;
  const stats: AuditedBundle['stats'] = {
    kanji: targets.size,
    elements: ids.length,
    recipes: recipes.length,
    seeds: seeds.length,
    reachable: Object.keys(witnesses).length,
    arities,
    seedMinimality: isAcyclic(ids, recipes) ? 'minimum-for-acyclic-graph' : 'inclusion-minimal'
  };
  const bundle: AuditedBundle = {
    contentVersion: '3.0.0',
    source,
    normalizationMap: SAFE_ALIASES,
    elements: ids.map((id) => ({
      id,
      glyph: id,
      kind: targets.has(id) ? 'kanji' : 'component',
      ...(!producers.has(id)
        ? {
            atomicReason: [...(reasonsById.get(id) ?? ['no-complete-source-decomposition'])]
              .sort()
              .join('; ')
          }
        : {})
    })),
    recipes,
    fusionIndex,
    seeds,
    witnesses,
    stats
  };
  const reasons: Record<string, number> = {};
  for (const rejected of rejectedCandidates)
    reasons[rejected.reason] = (reasons[rejected.reason] ?? 0) + 1;
  return {
    bundle,
    audit: {
      source,
      stats,
      rejectedCandidates,
      reasons,
      mandatorySeeds,
      cycleSeeds: seeds.filter((id) => producers.has(id))
    }
  };
}

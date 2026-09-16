import { createSignature } from './engine.js';

export interface AlchemyElement {
  id: string;
  glyph: string;
  kind: 'kanji' | 'component';
  atomicReason?: string;
}

export interface AlchemyRecipe {
  id: string;
  output: string;
  components: string[];
  originalComponents: string[];
  signature: string;
  source: { file: string; nodeId: string };
}

export interface AlchemyBundle {
  contentVersion: string;
  source: { name: string; url: string; revision: string; license: string; sha256: string };
  normalizationMap: Record<string, string>;
  elements: AlchemyElement[];
  recipes: AlchemyRecipe[];
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

export interface AlchemyResult {
  success: boolean;
  outputs: string[];
  newDiscoveries: string[];
  reason?: 'arity' | 'locked' | 'no-recipe';
}

export function mergeAlchemy({
  components,
  inventory,
  content
}: {
  components: string[];
  inventory: ReadonlySet<string>;
  content: AlchemyBundle;
}): AlchemyResult {
  const failure = (reason: AlchemyResult['reason']): AlchemyResult => ({
    success: false,
    outputs: [],
    newDiscoveries: [],
    reason
  });
  if (components.length < 2 || components.length > 4) return failure('arity');
  const owned = new Set(
    [...inventory].map((id) => createSignature([id], content.normalizationMap))
  );
  if (components.some((id) => !owned.has(createSignature([id], content.normalizationMap)))) {
    return failure('locked');
  }
  const signature = createSignature(components, content.normalizationMap);
  const outputs = Object.hasOwn(content.fusionIndex, signature)
    ? content.fusionIndex[signature]
    : [];
  if (!outputs.length) return failure('no-recipe');
  return {
    success: true,
    outputs: [...outputs],
    newDiscoveries: outputs.filter((id) => !inventory.has(id))
  };
}

export function getCraftableRecipes(
  content: AlchemyBundle,
  inventory: ReadonlySet<string>
): AlchemyRecipe[] {
  const ownedForms = new Map<string, string>();
  for (const id of inventory) {
    const canonical = createSignature([id], content.normalizationMap);
    if (!ownedForms.has(canonical) || id === canonical) ownedForms.set(canonical, id);
  }
  return content.recipes.flatMap((recipe) => {
    if (inventory.has(recipe.output)) return [];
    const components = recipe.components.map((id) =>
      ownedForms.get(createSignature([id], content.normalizationMap))
    );
    if (components.some((id) => id === undefined)) return [];
    return [{ ...recipe, components: components.filter((id): id is string => id !== undefined) }];
  });
}

export function reachableElements(
  seeds: readonly string[],
  recipes: readonly AlchemyRecipe[]
): Set<string> {
  const reached = new Set(seeds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const recipe of recipes) {
      if (!reached.has(recipe.output) && recipe.components.every((id) => reached.has(id))) {
        reached.add(recipe.output);
        changed = true;
      }
    }
  }
  return reached;
}

export function readAlchemyProgress(value: string | null, content: AlchemyBundle): string[] {
  const seeds = [...content.seeds];
  if (!value) return seeds;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('contentVersion' in parsed) ||
      parsed.contentVersion !== content.contentVersion ||
      !('unlocked' in parsed) ||
      !Array.isArray(parsed.unlocked)
    )
      return seeds;
    const known = new Set(content.elements.map((element) => element.id));
    const unlocked = parsed.unlocked.filter(
      (id): id is string => typeof id === 'string' && known.has(id)
    );
    return [...new Set([...seeds, ...unlocked])];
  } catch {
    return seeds;
  }
}

export function serializeAlchemyProgress(
  unlocked: readonly string[],
  content: AlchemyBundle
): string {
  const known = new Set(content.elements.map((element) => element.id));
  return JSON.stringify({
    contentVersion: content.contentVersion,
    unlocked: [...new Set([...content.seeds, ...unlocked.filter((id) => known.has(id))])]
  });
}

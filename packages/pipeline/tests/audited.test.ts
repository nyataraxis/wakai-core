import { describe, expect, it } from 'vitest';
import { closure, compileAudited, parseAuditedSvg, SAFE_ALIASES } from '../src/audited';
import type { AuditedNode, AuditedSource, SourceTree } from '../src/audited';

const source: AuditedSource = {
  name: 'fixture',
  url: 'https://example.com',
  revision: 'test',
  license: 'test',
  sha256: 'test'
};
let sequence = 0;
function node(
  element: string | undefined,
  children: AuditedNode[] = [],
  attributes: Partial<AuditedNode> = {}
): AuditedNode {
  const id = `g${sequence++}`;
  return {
    id,
    element,
    variant: false,
    partial: false,
    paths: children.length ? [] : [`${id}-s1`],
    children,
    ...attributes
  };
}
const tree = (root: AuditedNode): SourceTree => ({
  kanji: root.element!,
  file: `${root.element}.svg`,
  tree: root
});
const build = (...roots: AuditedNode[]) => compileAudited(roots.map(tree), source);

describe('audited decomposition', () => {
  it('rejects omitted strokes instead of inventing 木 → 本', () => {
    const { bundle, audit } = build(node('本', [node('木')], { paths: ['extra-stroke'] }));
    expect(bundle.recipes).toEqual([]);
    expect(bundle.seeds).toEqual(['本']);
    expect(audit.reasons['uncovered-strokes']).toBe(1);
  });

  it('normalizes safe input shapes on both signatures and ingredients', () => {
    const { bundle } = build(
      node('休', [node('亻', [], { variant: true, original: '人' }), node('木')])
    );
    expect(bundle.fusionIndex['人|木']).toEqual(['休']);
    expect(bundle.recipes[0].originalComponents).toEqual(['亻', '木']);
    expect(SAFE_ALIASES['月']).toBeUndefined();
    expect(SAFE_ALIASES['冫']).toBeUndefined();
    expect(SAFE_ALIASES['ク']).toBeUndefined();
  });

  it('retains binary and ternary tree frontiers with multiplicity', () => {
    const { bundle } = build(node('森', [node('木'), node('林', [node('木'), node('木')])]));
    expect(bundle.fusionIndex['木|林']).toEqual(['森']);
    expect(bundle.fusionIndex['木|木|木']).toEqual(['森']);
    expect(bundle.fusionIndex['木|木']).toEqual(['林']);
  });

  it('supports four ingredients and rejects unrepresented five-way merges', () => {
    const { bundle, audit } = build(
      node(
        '叕',
        Array.from({ length: 4 }, () => node('又'))
      ),
      node('器', [node('口'), node('口'), node('大'), node('口'), node('口')])
    );
    expect(bundle.fusionIndex['又|又|又|又']).toEqual(['叕']);
    expect(bundle.recipes.some((recipe) => recipe.output === '器')).toBe(false);
    expect(audit.reasons['arity-above-four']).toBe(1);
  });

  it('preserves different outputs sharing one unordered signature', () => {
    const { bundle } = build(
      node('杏', [node('木'), node('口')]),
      node('呆', [node('口'), node('木')])
    );
    expect(bundle.fusionIndex['口|木']).toEqual(['呆', '杏']);
  });

  it('joins enclosure parts without counting 囗 twice', () => {
    const { bundle } = build(
      node('国', [node('囗', [], { part: 1 }), node('玉'), node('囗', [], { part: 2 })])
    );
    expect(bundle.fusionIndex['囗|玉']).toEqual(['国']);
    expect(bundle.fusionIndex['囗|囗|玉']).toBeUndefined();
  });

  it('distinguishes multiple numbered split elements', () => {
    const { bundle } = build(
      node('回', [
        node('口', [], { part: 1, number: '1' }),
        node('口', [], { part: 1, number: '2' }),
        node('口', [], { part: 2, number: '1' }),
        node('口', [], { part: 2, number: '2' })
      ])
    );
    expect(bundle.fusionIndex['口|口']).toEqual(['回']);
  });

  it('quarantines incomplete split and partial child groups', () => {
    const { bundle, audit } = build(
      node('国', [node('囗', [], { part: 1 }), node('玉')]),
      node('玉', [node('王', [], { partial: true }), node('丶')])
    );
    expect(bundle.recipes).toEqual([]);
    expect(audit.reasons['ambiguous-or-incomplete-split-element']).toBe(1);
    expect(audit.reasons['partial-child-element']).toBe(1);
  });

  it('does not project contextual variant internals into standalone recipes', () => {
    const variant = node('月', [node('冂'), node('二')], { variant: true, original: '肉' });
    const { bundle } = build(node('肝', [variant, node('干')]));
    expect(bundle.fusionIndex['干|月']).toEqual(['肝']);
    expect(bundle.recipes.some((recipe) => recipe.output === '月')).toBe(false);
    expect(bundle.recipes.some((recipe) => recipe.components.includes('二'))).toBe(false);
  });

  it('proves full reachability and inclusion minimality with a cycle', () => {
    const { bundle } = build(
      node('甲', [node('乙'), node('木')]),
      node('乙', [node('甲'), node('木')])
    );
    expect(bundle.stats.seedMinimality).toBe('inclusion-minimal');
    expect(Object.keys(bundle.witnesses).sort()).toEqual(
      bundle.elements.map((element) => element.id)
    );
    for (const seed of bundle.seeds) {
      expect(
        Object.keys(
          closure(
            bundle.seeds.filter((id) => id !== seed),
            bundle.recipes
          )
        ).length
      ).toBeLessThan(bundle.elements.length);
    }
  });

  it('claims exact minimum only for acyclic recipe dependencies', () => {
    const { bundle } = build(node('林', [node('木'), node('木')]));
    expect(bundle.stats.seedMinimality).toBe('minimum-for-acyclic-graph');
    expect(bundle.seeds).toEqual(['木']);
    expect(bundle.witnesses['林'].depth).toBe(1);
  });

  it('validates canonical SVG identity and unique stroke coverage', () => {
    const xml = '<svg><g id="kvg:06728" kvg:element="木"><path id="s1"/></g></svg>';
    expect(parseAuditedSvg(xml, '06728.svg').kanji).toBe('木');
    expect(() => parseAuditedSvg(xml, '06728-Kaisho.svg')).toThrow('Noncanonical');
    expect(() => parseAuditedSvg(xml, '0672c.svg')).toThrow('mismatched');
    expect(() =>
      parseAuditedSvg(xml.replace('<path id="s1"/>', '<path id="s1"/><path id="s1"/>'), '06728.svg')
    ).toThrow('stroke IDs');
  });
});

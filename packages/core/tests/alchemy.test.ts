import { describe, expect, it } from 'vitest';
import {
  createSignature,
  mergeAlchemy,
  getCraftableRecipes,
  reachableElements,
  readAlchemyProgress,
  serializeAlchemyProgress,
  type AlchemyBundle,
  type AlchemyRecipe
} from '../src';

const recipe = (output: string, components: string[]): AlchemyRecipe => ({
  id: output,
  output,
  components,
  originalComponents: components,
  signature: createSignature(components, {}),
  source: { file: '06728.svg', nodeId: 'fixture' }
});
const recipes = [
  recipe('林', ['木', '木']),
  recipe('森', ['木', '木', '木']),
  recipe('燚', ['火', '火', '火', '火']),
  recipe('杏', ['木', '口']),
  recipe('呆', ['木', '口'])
];
const fixture: AlchemyBundle = {
  contentVersion: 'test',
  source: {
    name: 'fixture',
    url: 'https://example.com',
    revision: 'test',
    license: 'test',
    sha256: 'a'.repeat(64)
  },
  normalizationMap: { 亻: '人' },
  elements: ['木', '口', '火', '人', '林', '森', '燚', '杏', '呆'].map((id) => ({
    id,
    glyph: id,
    kind: 'kanji'
  })),
  recipes,
  fusionIndex: Object.fromEntries(
    [...new Set(recipes.map((entry) => entry.signature))].map((signature) => [
      signature,
      recipes.filter((entry) => entry.signature === signature).map((entry) => entry.output)
    ])
  ),
  seeds: ['木', '口', '火', '人'],
  witnesses: {},
  stats: {
    kanji: 9,
    elements: 9,
    recipes: 5,
    seeds: 4,
    reachable: 9,
    arities: { 2: 3, 3: 1, 4: 1 },
    seedMinimality: 'minimum-for-acyclic-graph'
  }
};

describe('alchemy gameplay', () => {
  const inventory = new Set(fixture.seeds);
  it('offers playable hints using an owned variant when the canonical form is locked', () => {
    const variantContent = {
      ...fixture,
      normalizationMap: { 犭: '犬' },
      recipes: [recipe('伏', ['人', '犬'])],
      fusionIndex: { '人|犬': ['伏'] }
    };
    const variantInventory = new Set(['人', '犭']);
    const hints = getCraftableRecipes(variantContent, variantInventory);
    expect(hints[0].components).toEqual(['人', '犭']);
    expect(hints[0].components.every((id) => variantInventory.has(id))).toBe(true);
    expect(
      mergeAlchemy({
        components: hints[0].components,
        inventory: variantInventory,
        content: variantContent
      }).outputs
    ).toEqual(['伏']);
    expect(getCraftableRecipes(variantContent, new Set(['人']))).toEqual([]);
    expect(getCraftableRecipes(variantContent, new Set(['人', '犭', '伏']))).toEqual([]);
  });
  it('keeps repeated pieces reusable and distinguishes two from three', () => {
    expect(mergeAlchemy({ components: ['木', '木'], inventory, content: fixture }).outputs).toEqual(
      ['林']
    );
    expect(
      mergeAlchemy({ components: ['木', '木', '木'], inventory, content: fixture }).outputs
    ).toEqual(['森']);
  });
  it('accepts four ingredients and any ordering', () => {
    expect(
      mergeAlchemy({ components: ['火', '火', '火', '火'], inventory, content: fixture }).outputs
    ).toEqual(['燚']);
  });
  it('preserves all outputs of an ambiguous ingredient bag', () => {
    expect(
      mergeAlchemy({ components: ['口', '木'], inventory, content: fixture }).newDiscoveries
    ).toEqual(['杏', '呆']);
  });
  it('does not grant a second discovery', () => {
    expect(
      mergeAlchemy({
        components: ['木', '木'],
        inventory: new Set([...inventory, '林']),
        content: fixture
      }).newDiscoveries
    ).toEqual([]);
  });
  it('rejects locked ingredients, unsupported arity, and absent recipes', () => {
    expect(
      mergeAlchemy({ components: ['口', '木'], inventory: new Set(['木']), content: fixture })
        .reason
    ).toBe('locked');
    for (const length of [0, 1, 5])
      expect(
        mergeAlchemy({
          components: Array.from({ length }, () => '木'),
          inventory,
          content: fixture
        }).reason
      ).toBe('arity');
    expect(mergeAlchemy({ components: ['人', '人'], inventory, content: fixture }).reason).toBe(
      'no-recipe'
    );
  });
  it('resolves alias chains and rejects cycles', () => {
    expect(createSignature(['a', 'c'], { a: 'b', b: 'c' })).toBe('c|c');
    expect(() => createSignature(['a'], { a: 'b', b: 'c', c: 'a' })).toThrow('cycle');
    expect(createSignature(['constructor'], {})).toBe('constructor');
  });
  it('does not count mutually dependent cycles as reachable', () => {
    expect(
      reachableElements(['木'], [recipe('林', ['森', '木']), recipe('森', ['林', '木'])])
    ).toEqual(new Set(['木']));
  });
  it('repairs malformed, outdated, and unknown saved entries', () => {
    for (const value of [null, '{', 'null', '42', '{"contentVersion":"old","unlocked":["森"]}']) {
      expect(readAlchemyProgress(value, fixture)).toEqual(fixture.seeds);
    }
    expect(
      readAlchemyProgress(
        JSON.stringify({ contentVersion: 'test', unlocked: ['森', '森', 'unknown', 42] }),
        fixture
      )
    ).toEqual([...fixture.seeds, '森']);
    expect(readAlchemyProgress(serializeAlchemyProgress(['林'], fixture), fixture)).toEqual([
      ...fixture.seeds,
      '林'
    ]);
  });
});

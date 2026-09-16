import { describe, expect, it } from 'vitest';
import {
  createAlchemyMode,
  createSignature,
  getCraftableRecipes,
  mergeAlchemy,
  reachableElements,
  readAlchemyProgress,
  serializeAlchemyProgress,
  type AlchemyBundle,
  type AlchemyRecipe
} from '../src';

const recipe = (id: string, output: string, components: string[]): AlchemyRecipe => ({
  id,
  output,
  components,
  originalComponents: components,
  signature: createSignature(components, {}),
  source: { file: 'fixture.svg', nodeId: id }
});

function bundle(recipes: AlchemyRecipe[], seeds: string[]): AlchemyBundle {
  const ids = [
    ...new Set([...seeds, ...recipes.flatMap((entry) => [...entry.components, entry.output])])
  ];
  const witnesses: AlchemyBundle['witnesses'] = Object.fromEntries(
    seeds.map((id) => [id, { depth: 0 }])
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of recipes) {
      if (witnesses[entry.output] || entry.components.some((id) => !witnesses[id])) continue;
      witnesses[entry.output] = {
        depth: 1 + Math.max(...entry.components.map((id) => witnesses[id].depth)),
        recipeId: entry.id
      };
      changed = true;
    }
  }
  return {
    contentVersion: 'mixed-test',
    source: {
      name: 'fixture',
      url: 'https://example.com',
      revision: 'test',
      license: 'test',
      sha256: 'a'.repeat(64)
    },
    normalizationMap: {},
    elements: ids.map((id) => ({ id, glyph: id, kind: id === '口' ? 'component' : 'kanji' })),
    recipes,
    fusionIndex: Object.fromEntries(
      [...new Set(recipes.map((entry) => entry.signature))].map((signature) => [
        signature,
        recipes.filter((entry) => entry.signature === signature).map((entry) => entry.output)
      ])
    ),
    seeds,
    witnesses,
    stats: {
      kanji: ids.filter((id) => id !== '口').length,
      elements: ids.length,
      recipes: recipes.length,
      seeds: seeds.length,
      reachable: Object.keys(witnesses).length,
      arities: Object.fromEntries(
        [2, 3, 4].map((arity) => [
          arity,
          recipes.filter((entry) => entry.components.length === arity).length
        ])
      ),
      seedMinimality: 'inclusion-minimal'
    }
  };
}

const fixture = bundle(
  [
    recipe('grove', '林', ['木', '木']),
    recipe('forest-2', '森', ['林', '木']),
    recipe('apricot', '杏', ['木', '口']),
    recipe('dull', '呆', ['木', '口']),
    recipe('forest-3', '森', ['林', '林', '林']),
    recipe('crystal', '晶', ['森', '森', '森']),
    recipe('blaze', '燚', ['晶', '晶', '晶', '晶'])
  ],
  ['木', '口', 'unused']
);

describe('independent alchemy modes', () => {
  it('keeps only participating elements and gives each arity its own starting set', () => {
    const modes = ([2, 3, 4] as const).map((arity) => createAlchemyMode(fixture, arity));
    expect(new Set(modes[0].seeds)).toEqual(new Set(['木', '口']));
    expect(modes[1].seeds).toEqual(['林']);
    expect(modes[2].seeds).toEqual(['晶']);
    expect(new Set(modes[0].elements.map((entry) => entry.id))).toEqual(
      new Set(['木', '口', '林', '森', '杏', '呆'])
    );
    expect(new Set(modes[1].elements.map((entry) => entry.id))).toEqual(
      new Set(['林', '森', '晶'])
    );
    expect(new Set(modes[2].elements.map((entry) => entry.id))).toEqual(new Set(['晶', '燚']));
    for (const [index, mode] of modes.entries()) {
      expect(mode.recipes.every((entry) => entry.components.length === index + 2)).toBe(true);
      expect(reachableElements(mode.seeds, mode.recipes)).toEqual(
        new Set(mode.elements.map((entry) => entry.id))
      );
    }
  });

  it('keeps repeated ingredients reusable and all outputs of a shared recipe', () => {
    const mode = createAlchemyMode(fixture, 2);
    const inventory = new Set(mode.seeds);
    expect(mergeAlchemy({ components: ['木', '木'], inventory, content: mode }).outputs).toEqual([
      '林'
    ]);
    expect(
      new Set(mergeAlchemy({ components: ['口', '木'], inventory, content: mode }).outputs)
    ).toEqual(new Set(['杏', '呆']));
    expect(
      mergeAlchemy({ components: ['林', '林', '林'], inventory: new Set(['林']), content: mode })
        .success
    ).toBe(false);
    const triples = createAlchemyMode(fixture, 3);
    expect(
      mergeAlchemy({
        components: ['林', '林', '林'],
        inventory: new Set(triples.seeds),
        content: triples
      }).outputs
    ).toEqual(['森']);
  });

  it('offers only playable hints in the selected mode as discoveries unlock a chain', () => {
    const mode = createAlchemyMode(fixture, 2);
    const inventory = new Set(mode.seeds);
    expect(new Set(getCraftableRecipes(mode, inventory).map((entry) => entry.output))).toEqual(
      new Set(['林', '杏', '呆'])
    );
    inventory.add('林');
    const hints = getCraftableRecipes(mode, inventory);
    expect(hints.some((entry) => entry.id === 'forest-2')).toBe(true);
    for (const hint of hints) {
      expect(hint.components).toHaveLength(2);
      expect(
        mergeAlchemy({ components: hint.components, inventory, content: mode }).newDiscoveries
      ).toContain(hint.output);
    }
    inventory.add('森');
    expect(getCraftableRecipes(mode, inventory).some((entry) => entry.output === '森')).toBe(false);
  });

  it('isolates saved discoveries even when modes share the same output', () => {
    const modes = [
      createAlchemyMode(fixture, 2),
      createAlchemyMode(fixture, 3),
      createAlchemyMode(fixture, 4)
    ];
    expect(
      new Set([fixture.contentVersion, ...modes.map((mode) => mode.contentVersion)]).size
    ).toBe(4);
    const saved = serializeAlchemyProgress(['森'], modes[0]);
    expect(readAlchemyProgress(saved, modes[0])).toContain('森');
    expect(readAlchemyProgress(saved, modes[1])).toEqual(modes[1].seeds);
    expect(readAlchemyProgress(saved, modes[2])).toEqual(modes[2].seeds);
    expect(readAlchemyProgress(serializeAlchemyProgress(['森'], fixture), modes[0])).toEqual(
      modes[0].seeds
    );
    expect(createAlchemyMode(fixture, 2).contentVersion).toBe(modes[0].contentVersion);
  });

  it('recomputes statistics and discovery witnesses for each mode', () => {
    for (const arity of [2, 3, 4] as const) {
      const mode = createAlchemyMode(fixture, arity);
      expect(mode.stats.elements).toBe(mode.elements.length);
      expect(mode.stats.kanji).toBe(mode.elements.filter((entry) => entry.kind === 'kanji').length);
      expect(mode.stats.recipes).toBe(mode.recipes.length);
      expect(mode.stats.seeds).toBe(mode.seeds.length);
      expect(mode.stats.reachable).toBe(mode.elements.length);
      expect(mode.stats.arities[arity]).toBe(mode.recipes.length);
      expect(Object.values(mode.stats.arities).reduce((total, count) => total + count, 0)).toBe(
        mode.recipes.length
      );
      expect(new Set(Object.keys(mode.witnesses))).toEqual(
        new Set(mode.elements.map((entry) => entry.id))
      );
      for (const element of mode.elements) {
        const witness = mode.witnesses[element.id];
        if (mode.seeds.includes(element.id)) {
          expect(witness).toEqual({ depth: 0 });
        } else {
          const producingRecipe = mode.recipes.find((entry) => entry.id === witness.recipeId);
          expect(producingRecipe?.output).toBe(element.id);
          expect(witness.depth).toBe(
            1 +
              Math.max(...(producingRecipe?.components.map((id) => mode.witnesses[id].depth) ?? []))
          );
        }
      }
    }
    expect(createAlchemyMode(fixture, 3).witnesses.晶.depth).toBe(2);
  });

  it('breaks recipe cycles with an inclusion-minimal independent starter set', () => {
    const cyclic = bundle(
      [
        recipe('downstream', 'downstream', ['a', 'b']),
        recipe('a', 'a', ['b', 'root']),
        recipe('b', 'b', ['a', 'root']),
        recipe('c', 'c', ['c', 'c'])
      ],
      ['downstream', 'root', 'a', 'c', 'unused']
    );
    const mode = createAlchemyMode(cyclic, 2);
    expect(mode.seeds).toHaveLength(3);
    expect(mode.seeds).toContain('root');
    expect(mode.seeds).toContain('c');
    const all = new Set(['root', 'a', 'b', 'c', 'downstream']);
    expect(reachableElements(mode.seeds, mode.recipes)).toEqual(all);
    for (const seed of mode.seeds) {
      expect(
        reachableElements(
          mode.seeds.filter((id) => id !== seed),
          mode.recipes
        )
      ).not.toEqual(all);
    }
  });

  it('does not mutate the mixed bundle or retain unrelated seeds in an empty mode', () => {
    const before = JSON.stringify(fixture);
    createAlchemyMode(fixture, 2);
    createAlchemyMode(fixture, 3);
    createAlchemyMode(fixture, 4);
    expect(JSON.stringify(fixture)).toBe(before);
    const empty = createAlchemyMode(bundle([recipe('grove', '林', ['木', '木'])], ['木']), 4);
    expect(empty.elements).toEqual([]);
    expect(empty.recipes).toEqual([]);
    expect(empty.seeds).toEqual([]);
    expect(empty.fusionIndex).toEqual({});
    expect(empty.witnesses).toEqual({});
    expect(empty.stats.reachable).toBe(0);
  });
});

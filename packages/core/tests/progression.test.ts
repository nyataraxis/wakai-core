import { describe, expect, it } from 'vitest';
import {
  advanceAlchemyJourney,
  createAlchemyJourney,
  createAlchemyProgression,
  createSignature,
  getCraftableRecipes,
  readAlchemyJourney,
  serializeAlchemyJourney,
  serializeAlchemyProgress,
  type AlchemyBundle,
  type AlchemyRecipe
} from '../src';

function recipe(output: string, components: string[]): AlchemyRecipe {
  return {
    id: output,
    output,
    components,
    originalComponents: components,
    signature: createSignature(components, {}),
    source: { file: 'fixture.svg', nodeId: output }
  };
}

function bundle(seeds: string[], recipes: AlchemyRecipe[]): AlchemyBundle {
  const ids = [...new Set([...seeds, ...recipes.flatMap((r) => [...r.components, r.output])])];
  return {
    contentVersion: 'progression-test:merge-2',
    source: { name: 'fixture', url: '', revision: 'test', license: 'test', sha256: '' },
    normalizationMap: {},
    elements: ids.map((id) => ({ id, glyph: id, kind: 'kanji' })),
    recipes,
    fusionIndex: {},
    seeds,
    witnesses: {},
    stats: {
      kanji: ids.length,
      elements: ids.length,
      recipes: recipes.length,
      seeds: seeds.length,
      reachable: ids.length,
      arities: { 2: recipes.length },
      seedMinimality: 'inclusion-minimal'
    }
  };
}

const fixture = bundle(
  ['f', 'e', 'd', 'c', 'b', 'a'],
  [
    ...Array.from({ length: 24 }, (_, i) => recipe(`x${i}`, ['a', 'b'])),
    recipe('x24', ['x0', 'a']),
    recipe('y0', ['c', 'd']),
    recipe('y1', ['x0', 'c']),
    recipe('z', ['e', 'f'])
  ]
);
const progression = createAlchemyProgression(fixture, { initialSize: 2, batchSize: 2 });
const discoveries = Array.from({ length: 20 }, (_, i) => `x${i}`);

describe('alchemy progression', () => {
  it('ranks reusable starters by recipe coverage and keeps a deterministic cumulative closure', () => {
    expect(progression.levels.map((level) => level.newSeeds)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e', 'f']
    ]);
    expect(progression.levels.map((level) => level.discoveryTarget)).toEqual([20, 27, 28]);
    expect(progression.levels[1].seeds).toEqual(['a', 'b', 'c', 'd']);
    expect(progression.elementLevels.x24).toBe(0);
    expect(progression.elementLevels.y1).toBe(1);
    expect(progression.elementLevels.z).toBe(2);
    expect(new Set(progression.levels[2].reachable)).toEqual(
      new Set(fixture.elements.map(({ id }) => id))
    );
    expect(
      createAlchemyProgression(
        { ...fixture, seeds: [...fixture.seeds].reverse() },
        {
          initialSize: 2,
          batchSize: 2
        }
      )
    ).toEqual(progression);
    const repeated = bundle(['b', 'a'], [recipe('x', ['b', 'b']), recipe('y', ['a', 'a'])]);
    expect(createAlchemyProgression(repeated).levels[0].seeds).toEqual(['a', 'b']);
  });

  it('starts with 48 elements and expands by 20 without granting reachable discoveries', () => {
    const many = bundle(
      Array.from({ length: 89 }, (_, i) => `seed-${i}`),
      []
    );
    const steps = createAlchemyProgression(many);
    expect(steps.levels.map((level) => level.newSeeds.length)).toEqual([48, 20, 20, 1]);
    expect(createAlchemyJourney(fixture, progression)).toEqual({ level: 0, unlocked: ['a', 'b'] });
    expect(createAlchemyProgression(many, { initialSize: 0, batchSize: -1 })).toEqual(steps);
  });

  it('counts distinct earned discoveries and advances only one level at each milestone', () => {
    const repeated = { level: 0, unlocked: ['a', 'b', ...Array<string>(30).fill('x0')] };
    expect(advanceAlchemyJourney(repeated, fixture, progression).level).toBe(0);
    expect(
      advanceAlchemyJourney({ level: 0, unlocked: discoveries.slice(0, 19) }, fixture, progression)
        .level
    ).toBe(0);
    const next = advanceAlchemyJourney({ level: 0, unlocked: discoveries }, fixture, progression);
    expect(next.level).toBe(1);
    expect(next.unlocked).toEqual(['a', 'b', 'c', 'd', ...discoveries]);
    expect(advanceAlchemyJourney(next, fixture, progression)).toEqual(next);
    const final = advanceAlchemyJourney(
      { level: 1, unlocked: progression.levels[1].reachable },
      fixture,
      progression
    );
    expect(final.level).toBe(2);
    expect(final.unlocked).toContain('e');
    expect(final.unlocked).not.toContain('z');
    expect(advanceAlchemyJourney(final, fixture, progression)).toEqual(final);
  });

  it('carries earned intermediates into new recipes without leaking locked outputs or future seeds', () => {
    const next = advanceAlchemyJourney(
      { level: 0, unlocked: [...discoveries, 'c', 'f', 'z', 'y1'] },
      fixture,
      progression
    );
    expect(next.level).toBe(1);
    expect(next.unlocked).toContain('x0');
    expect(next.unlocked).not.toContain('f');
    expect(next.unlocked).not.toContain('z');
    expect(next.unlocked).not.toContain('y1');
    expect(
      getCraftableRecipes(fixture, new Set(next.unlocked)).map(({ output }) => output)
    ).toContain('y1');
  });

  it('round trips journeys while restoring current seeds and filtering invalid or locked elements', () => {
    const value = JSON.stringify({
      contentVersion: `${fixture.contentVersion}:levels-1`,
      level: 1,
      unlocked: ['x0', 'x0', 'y1', 'f', 'z', 'unknown', 7, null]
    });
    const restored = readAlchemyJourney(value, fixture, progression);
    expect(restored).toEqual({ level: 1, unlocked: ['a', 'b', 'c', 'd', 'x0', 'y1'] });
    expect(
      readAlchemyJourney(
        serializeAlchemyJourney(restored, fixture, progression),
        fixture,
        progression
      )
    ).toEqual(restored);
    const serialized = serializeAlchemyJourney(
      { level: 0, unlocked: ['x0', 'f', 'z'] },
      fixture,
      progression
    );
    expect(readAlchemyJourney(serialized, fixture, progression)).toEqual({
      level: 0,
      unlocked: ['a', 'b', 'x0']
    });
  });

  it('resets malformed, old sandbox, and other-mode saves, and clamps integer levels', () => {
    const fresh = createAlchemyJourney(fixture, progression);
    const version = `${fixture.contentVersion}:levels-1`;
    for (const value of [
      null,
      '',
      '{',
      'null',
      '[]',
      '{}',
      JSON.stringify({ contentVersion: version, level: 0.5, unlocked: [] }),
      JSON.stringify({ contentVersion: version, level: '1', unlocked: [] }),
      JSON.stringify({ contentVersion: version, level: 1, unlocked: {} }),
      JSON.stringify({ contentVersion: 'other:levels-1', level: 1, unlocked: discoveries }),
      serializeAlchemyProgress(
        fixture.elements.map(({ id }) => id),
        fixture
      )
    ])
      expect(readAlchemyJourney(value, fixture, progression)).toEqual(fresh);
    expect(
      readAlchemyJourney(
        JSON.stringify({ contentVersion: version, level: -1, unlocked: ['x0', 'f'] }),
        fixture,
        progression
      )
    ).toEqual({ level: 0, unlocked: ['a', 'b', 'x0'] });
    expect(
      readAlchemyJourney(
        JSON.stringify({ contentVersion: version, level: 999, unlocked: [] }),
        fixture,
        progression
      )
    ).toEqual({ level: 2, unlocked: ['a', 'b', 'c', 'd', 'e', 'f'] });
  });

  it('handles empty modes and exhausted early levels without trapping the player', () => {
    const empty = bundle([], []);
    const emptyProgression = createAlchemyProgression(empty);
    expect(emptyProgression).toEqual({
      levels: [{ index: 0, newSeeds: [], seeds: [], reachable: [], discoveryTarget: 0 }],
      elementLevels: {}
    });
    const emptyJourney = createAlchemyJourney(empty, emptyProgression);
    expect(advanceAlchemyJourney(emptyJourney, empty, emptyProgression)).toEqual(emptyJourney);
    const sparse = bundle(['a', 'b', 'c'], [recipe('x', ['a', 'b'])]);
    const sparseProgression = createAlchemyProgression(sparse, { initialSize: 1, batchSize: 1 });
    expect(sparseProgression.levels[0].discoveryTarget).toBe(0);
    expect(
      advanceAlchemyJourney(
        createAlchemyJourney(sparse, sparseProgression),
        sparse,
        sparseProgression
      )
    ).toEqual({ level: 1, unlocked: ['a', 'b'] });
  });

  it('does not mutate the content, progression, or supplied journey', () => {
    const journey = { level: 0, unlocked: [...discoveries] };
    const before = JSON.stringify({ fixture, progression, journey });
    createAlchemyProgression(fixture);
    serializeAlchemyJourney(journey, fixture, progression);
    advanceAlchemyJourney(journey, fixture, progression);
    expect(JSON.stringify({ fixture, progression, journey })).toBe(before);
  });
});

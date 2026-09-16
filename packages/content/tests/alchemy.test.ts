import { describe, expect, it } from 'vitest';
import { loadAlchemyContent } from '../src/alchemy.js';
import type { AlchemyBundle } from '@wakai-core/core';

const fixture = (): AlchemyBundle => ({
  contentVersion: 'test',
  source: {
    name: 'fixture',
    url: 'https://example.com',
    revision: 'test',
    license: 'test',
    sha256: 'a'.repeat(64)
  },
  normalizationMap: {},
  elements: ['木', '林'].map((id) => ({ id, glyph: id, kind: 'kanji' })),
  recipes: [
    {
      id: 'r1',
      output: '林',
      components: ['木', '木'],
      originalComponents: ['木', '木'],
      signature: '木|木',
      source: { file: '06797.svg', nodeId: 'kvg:06797' }
    }
  ],
  fusionIndex: { '木|木': ['林'] },
  seeds: ['木'],
  witnesses: { 木: { depth: 0 }, 林: { depth: 1, recipeId: 'r1' } },
  stats: {
    kanji: 2,
    elements: 2,
    recipes: 1,
    seeds: 1,
    reachable: 2,
    arities: { 2: 1 },
    seedMinimality: 'minimum-for-acyclic-graph'
  }
});

describe('content integrity boundary', () => {
  it('loads a complete reachable bundle from JSON', () => {
    expect(loadAlchemyContent(JSON.stringify(fixture()))).toEqual(fixture());
  });
  it('rejects dangling IDs and lost collision outputs', () => {
    const dangling = fixture();
    dangling.recipes[0].components[1] = '口';
    expect(() => loadAlchemyContent(dangling)).toThrow('dangling');
    const collision = fixture();
    collision.fusionIndex['木|木'] = ['林', '森'];
    expect(() => loadAlchemyContent(collision)).toThrow('index');
  });
  it('rejects invalid signatures and duplicate ingredients removed by normalization', () => {
    const content = fixture();
    content.recipes[0].signature = '木';
    expect(() => loadAlchemyContent(content)).toThrow('signature');
    const original = fixture();
    original.recipes[0].originalComponents = ['木', '口'];
    expect(() => loadAlchemyContent(original)).toThrow('normalization');
  });
  it('rejects forged reachability witnesses and statistics', () => {
    const cycle = fixture();
    cycle.witnesses.林.depth = 0;
    expect(() => loadAlchemyContent(cycle)).toThrow('witness');
    const counts = fixture();
    counts.stats.reachable = 999;
    expect(() => loadAlchemyContent(counts)).toThrow('statistics');
  });
  it('rejects alias cycles, malformed JSON, and unsupported arity', () => {
    const cyclic = fixture();
    cyclic.normalizationMap = { a: 'b', b: 'a' };
    expect(() => loadAlchemyContent(cyclic)).toThrow('cycle');
    expect(() => loadAlchemyContent('{')).toThrow();
    const tooMany = fixture();
    tooMany.recipes[0].components = Array.from({ length: 5 }, () => '木');
    expect(() => loadAlchemyContent(tooMany)).toThrow();
  });
});

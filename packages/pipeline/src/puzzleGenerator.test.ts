import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validatePuzzleLevel } from '@wakai-core/core';
import {
  generatePuzzleLevels,
  glyphDigest,
  parsePuzzleMaps,
  serializePuzzleContent
} from './puzzleGenerator.js';
import type { PuzzleMaps } from './puzzleGenerator.js';

const root = resolve(import.meta.dirname, '../../..');
const index: unknown = JSON.parse(
  readFileSync(resolve(root, 'data/generated/content.full.json'), 'utf8')
);
const maps = parsePuzzleMaps(
  JSON.parse(readFileSync(resolve(root, 'data/puzzles/maps.json'), 'utf8')) as unknown
);
const readSvg = (filename: string): string =>
  readFileSync(resolve(root, 'data/puzzles/glyphs', filename), 'utf8');

describe('reviewed puzzle generation', () => {
  it('reproduces the shipped offline levels byte for byte', () => {
    const generated = generatePuzzleLevels(index, maps, readSvg);
    expect(generated.levels).toHaveLength(7);
    expect(serializePuzzleContent(generated)).toBe(
      readFileSync(resolve(root, 'packages/content/src/puzzleLevels.json'), 'utf8').replace(
        /\r\n/g,
        '\n'
      )
    );
    expect(serializePuzzleContent(generatePuzzleLevels(index, maps, readSvg))).toBe(
      serializePuzzleContent(generated)
    );
    for (const level of generated.levels) expect(() => validatePuzzleLevel(level)).not.toThrow();
  });

  it('retains exact path geometry and original stroke order', () => {
    const forest = generatePuzzleLevels(index, maps, readSvg).levels.find(
      (level) => level.id === 'forest'
    )!;
    const svg = readSvg('068ee.svg');
    expect(forest.sourceGlyphs[0].strokes.map((stroke) => stroke.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => `kvg:068ee-s${i + 1}`)
    );
    for (const stroke of forest.sourceGlyphs[0].strokes)
      expect(svg).toContain(`d="${stroke.path}"`);
    expect(
      forest.requiredAnswers.find((answer) => answer.character === '木')?.variants
    ).toHaveLength(3);
  });

  it('merges repeated answers from multiple source glyphs without combining their strokes', () => {
    const level = generatePuzzleLevels(index, maps, readSvg).levels.find(
      (entry) => entry.id === 'bright-rest'
    )!;
    const one = level.requiredAnswers.filter((answer) => answer.character === '一');
    expect(one).toHaveLength(1);
    expect(one[0].variants).toHaveLength(5);
    expect(new Set(one[0].variants.map((variant) => variant.sourceGlyph))).toEqual(new Set([0, 1]));
    for (const variant of one[0].variants) {
      const ids = level.sourceGlyphs[variant.sourceGlyph].strokes.map((stroke) => stroke.id);
      expect(variant.strokeIds.every((id) => ids.includes(id))).toBe(true);
    }
  });

  it('always adds the complete source glyph to the required answer set', () => {
    for (const level of generatePuzzleLevels(index, maps, readSvg).levels) {
      level.sourceGlyphs.forEach((glyph, sourceGlyph) => {
        const full = level.requiredAnswers.find((answer) => answer.character === glyph.character);
        expect(full?.variants).toContainEqual({
          sourceGlyph,
          strokeIds: glyph.strokes.map((stroke) => stroke.id).sort()
        });
      });
    }
  });

  it('promotes a shared bonus to required and deduplicates repeated variants', () => {
    const custom = structuredClone(maps);
    const rest = custom.glyphs.find((glyph) => glyph.character === '休')!;
    const one = rest.requiredAnswers.find((answer) => answer.character === '一')!;
    rest.requiredAnswers = rest.requiredAnswers.filter((answer) => answer.character !== '一');
    rest.bonusAnswers.push(one, one);
    const level = generatePuzzleLevels(index, custom, readSvg).levels.find(
      (entry) => entry.id === 'bright-rest'
    )!;
    expect(
      level.requiredAnswers.find((answer) => answer.character === '一')?.variants
    ).toHaveLength(5);
    expect(level.bonusAnswers.some((answer) => answer.character === '一')).toBe(false);
  });

  it('rejects an index that references different or missing glyphs', () => {
    expect(() => generatePuzzleLevels({ kanji: {} }, maps, readSvg)).toThrow('Index entry');
    expect(() =>
      generatePuzzleLevels({ kanji: { 木: { svgFile: 'other.svg' } } }, maps, readSvg)
    ).toThrow('SVG index mismatch');
  });

  it('requires re-review when fixture geometry changes, but tolerates checkout line endings', () => {
    expect(() =>
      generatePuzzleLevels(index, maps, (file) => readSvg(file).replace('M19.5', 'M20.5'))
    ).toThrow('Glyph changed');
    expect(glyphDigest('one\r\ntwo\r\n')).toBe(glyphDigest('one\ntwo\n'));
  });

  it('rejects unknown stroke references and unknown source glyphs', () => {
    const custom = structuredClone(maps);
    custom.glyphs[0].requiredAnswers[0].variants[0] = ['kvg:06728-s999'];
    expect(() => generatePuzzleLevels(index, custom, readSvg)).toThrow();
    expect(() =>
      generatePuzzleLevels(
        index,
        { ...maps, levels: [{ id: 'bad', title: 'Bad', sources: ['鬱'] }] },
        readSvg
      )
    ).toThrow('No reviewed glyph');
  });

  it('rejects transformed SVG geometry even after its digest is updated', () => {
    const custom = structuredClone(maps);
    const changed = readSvg('06728.svg').replace(
      '<g id="kvg:StrokePaths_',
      '<g transform="rotate(90)" id="kvg:StrokePaths_'
    );
    custom.glyphs[0].sha256 = glyphDigest(changed);
    expect(() =>
      generatePuzzleLevels(index, custom, (file) =>
        file === '06728.svg' ? changed : readSvg(file)
      )
    ).toThrow('Transformed strokes');
  });

  it('rejects transforms inherited from a wrapper outside the stroke group', () => {
    const custom = structuredClone(maps);
    const changed = readSvg('06728.svg')
      .replace(/(<svg\b[^>]*>)/, '$1<g transform="rotate(90)">')
      .replace('</svg>', '</g></svg>');
    custom.glyphs[0].sha256 = glyphDigest(changed);
    expect(() =>
      generatePuzzleLevels(index, custom, (file) =>
        file === '06728.svg' ? changed : readSvg(file)
      )
    ).toThrow('Transformed strokes');
  });

  it('rejects duplicate level IDs and malformed input', () => {
    expect(() =>
      generatePuzzleLevels(index, { ...maps, levels: [maps.levels[0], maps.levels[0]] }, readSvg)
    ).toThrow('Duplicate level ID');
    expect(() => parsePuzzleMaps({ glyphs: [], levels: [{ id: 'missing' }] })).toThrow(
      'level title'
    );
    expect(() =>
      generatePuzzleLevels(index, { glyphs: [], levels: [] } satisfies PuzzleMaps, readSvg)
    ).toThrow('At least one level');
  });
});

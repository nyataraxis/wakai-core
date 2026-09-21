import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPuzzleState, submitSelection } from '@wakai-core/core';
import { deriveCampaignGlyph, selectCampaign } from './puzzleCampaign.js';
import {
  generatePuzzleLevels,
  parsePuzzleMaps,
  serializePuzzleContent
} from './puzzleGenerator.js';

const root = resolve(import.meta.dirname, '../../..');
const maps = parsePuzzleMaps(
  JSON.parse(readFileSync(resolve(root, 'data/puzzles/campaign.json'), 'utf8')) as unknown
);
const index = {
  kanji: Object.fromEntries(
    maps.glyphs.map((glyph) => [glyph.character, { svgFile: glyph.svgFile }])
  )
};
const readSvg = (file: string) =>
  readFileSync(resolve(root, 'data/puzzles/campaign-glyphs', file), 'utf8');
const audit: { canonicalStrokeCounts: Record<string, number> } = JSON.parse(
  readFileSync(resolve(root, 'data/puzzles/campaign-audit.json'), 'utf8')
);
const counts = new Map(Object.entries(audit.canonicalStrokeCounts));

describe('complex single-kanji campaign', () => {
  it('ships 500 distinct, reproducible puzzles with complex sources and proper hidden answers', () => {
    const content = generatePuzzleLevels(index, maps, readSvg);
    expect(content.levels).toHaveLength(500);
    expect(new Set(content.levels.map((level) => level.sourceGlyphs[0].character)).size).toBe(500);
    expect(serializePuzzleContent(content)).toBe(
      readFileSync(resolve(root, 'packages/content/src/puzzleLevels.json'), 'utf8').replace(
        /\r\n/g,
        '\n'
      )
    );
    for (const level of content.levels) {
      expect(level.sourceGlyphs).toHaveLength(1);
      expect(level.sourceGlyphs[0].strokes.length).toBeGreaterThanOrEqual(12);
      expect(level.requiredAnswers.length).toBeGreaterThanOrEqual(3);
      let state = createPuzzleState();
      for (const answer of [...level.requiredAnswers, ...level.bonusAnswers]) {
        for (const variant of answer.variants) {
          const result = submitSelection(level, { ...createPuzzleState(), selection: variant });
          expect(result.answer?.character).toBe(answer.character);
          expect(result.outcome).toBe(level.requiredAnswers.includes(answer) ? 'CORRECT' : 'BONUS');
        }
        if (level.requiredAnswers.includes(answer))
          state = submitSelection(level, { ...state, selection: answer.variants[0] }).state;
      }
      expect(state.status).toBe('COMPLETED');
    }
  });

  it('rederives every mapped answer from the unchanged source groups', () => {
    for (const glyph of maps.glyphs) {
      expect(deriveCampaignGlyph(glyph.svgFile, readSvg(glyph.svgFile), counts).glyph).toEqual(
        glyph
      );
    }
  });

  it('rejects partial groups, normalized radicals, variants, and mismatched stroke counts', () => {
    const svg = (attrs: string) =>
      `<svg viewBox="0 0 109 109"><g id="kvg:StrokePaths_06728"><g id="kvg:06728" kvg:element="木"><g id="child" kvg:element="十" ${attrs}><path id="kvg:06728-s1" d="M0 0L10 0"/><path id="kvg:06728-s2" d="M5 0L5 10"/></g><path id="kvg:06728-s3" d="M5 0L0 10"/><path id="kvg:06728-s4" d="M5 0L10 10"/></g></g></svg>`;
    const canonical = new Map([['十', 2]]);
    expect(
      deriveCampaignGlyph('06728.svg', svg(''), canonical).glyph.requiredAnswers.map(
        (answer) => answer.character
      )
    ).toEqual(['十']);
    for (const attrs of [
      'kvg:partial="true"',
      'kvg:variant="true"',
      'kvg:part="1"',
      'kvg:original="水"'
    ]) {
      expect(deriveCampaignGlyph('06728.svg', svg(attrs), canonical).glyph.requiredAnswers).toEqual(
        []
      );
    }
    expect(
      deriveCampaignGlyph('06728.svg', svg(''), new Map([['十', 3]])).glyph.requiredAnswers
    ).toEqual([]);
    expect(
      deriveCampaignGlyph(
        '06728.svg',
        svg('').replace('kvg:element="十"', 'kvg:element="氵"'),
        new Map([['氵', 2]])
      ).glyph.bonusAnswers
    ).toEqual([]);
  });

  it('refuses to pad a campaign with duplicate or ineligible levels', () => {
    const candidate = deriveCampaignGlyph(
      maps.glyphs[0].svgFile,
      readSvg(maps.glyphs[0].svgFile),
      counts
    );
    expect(() => selectCampaign([candidate, candidate], 2)).toThrow('Only 1');
    expect(() => selectCampaign([candidate], 0)).toThrow('positive integer');
  });
});

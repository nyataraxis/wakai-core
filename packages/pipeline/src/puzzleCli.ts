import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
const content = generatePuzzleLevels(index, maps, (file) =>
  readFileSync(resolve(root, 'data/puzzles/campaign-glyphs', file), 'utf8')
);
const output = resolve(root, 'packages/content/src/puzzleLevels.json');
writeFileSync(output, serializePuzzleContent(content), 'utf8');
console.log(`Generated ${content.levels.length} source-mapped stroke puzzles: ${output}`);

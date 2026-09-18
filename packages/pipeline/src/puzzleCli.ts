import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  generatePuzzleLevels,
  parsePuzzleMaps,
  serializePuzzleContent
} from './puzzleGenerator.js';

const root = resolve(import.meta.dirname, '../../..');
const maps: unknown = JSON.parse(readFileSync(resolve(root, 'data/puzzles/maps.json'), 'utf8'));
const index: unknown = JSON.parse(
  readFileSync(resolve(root, 'data/generated/content.full.json'), 'utf8')
);
const content = generatePuzzleLevels(index, parsePuzzleMaps(maps), (file) =>
  readFileSync(resolve(root, 'data/puzzles/glyphs', file), 'utf8')
);
const output = resolve(root, 'packages/content/src/puzzleLevels.json');
writeFileSync(output, serializePuzzleContent(content), 'utf8');
console.log(`Generated ${content.levels.length} reviewed stroke puzzles: ${output}`);

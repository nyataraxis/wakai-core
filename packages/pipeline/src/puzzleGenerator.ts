import { createHash } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { validatePuzzleLevel } from '@wakai-core/core';
import type { PuzzleAnswer, PuzzleGlyph, PuzzleLevel, PuzzleStroke } from '@wakai-core/core';

export interface ReviewedAnswer {
  character: string;
  type: 'KANJI' | 'KANA';
  variants: string[][];
  readings?: string[];
  meaning?: string;
}

export interface ReviewedGlyph {
  character: string;
  svgFile: string;
  sha256: string;
  readings?: string[];
  meaning?: string;
  requiredAnswers: ReviewedAnswer[];
  bonusAnswers: ReviewedAnswer[];
}

export interface PuzzleMaps {
  glyphs: ReviewedGlyph[];
  levels: { id: string; title: string; sources: string[] }[];
}

export interface PuzzleContent {
  contentVersion: '1.0.0';
  levels: PuzzleLevel[];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function nonemptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a nonempty string`);
  }
  return value;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function strings(value: unknown, label: string): string[] {
  return array(value, label).map((entry) => nonemptyString(entry, label));
}

function metadata(value: Record<string, unknown>): { readings?: string[]; meaning?: string } {
  return {
    ...(value.readings === undefined ? {} : { readings: strings(value.readings, 'readings') }),
    ...(value.meaning === undefined ? {} : { meaning: nonemptyString(value.meaning, 'meaning') })
  };
}

function parseAnswer(value: unknown): ReviewedAnswer {
  const answer = record(value, 'answer');
  if (answer.type !== 'KANJI' && answer.type !== 'KANA') throw new Error('Invalid answer type');
  return {
    character: nonemptyString(answer.character, 'answer character'),
    type: answer.type,
    variants: array(answer.variants, 'variants').map((variant) => strings(variant, 'stroke IDs')),
    ...metadata(answer)
  };
}

export function parsePuzzleMaps(value: unknown): PuzzleMaps {
  const maps = record(value, 'puzzle maps');
  return {
    glyphs: array(maps.glyphs, 'glyphs').map((value) => {
      const glyph = record(value, 'reviewed glyph');
      return {
        character: nonemptyString(glyph.character, 'glyph character'),
        svgFile: nonemptyString(glyph.svgFile, 'svgFile'),
        sha256: nonemptyString(glyph.sha256, 'sha256'),
        requiredAnswers: array(glyph.requiredAnswers, 'requiredAnswers').map(parseAnswer),
        bonusAnswers: array(glyph.bonusAnswers, 'bonusAnswers').map(parseAnswer),
        ...metadata(glyph)
      };
    }),
    levels: array(maps.levels, 'levels').map((value) => {
      const level = record(value, 'level recipe');
      return {
        id: nonemptyString(level.id, 'level id'),
        title: nonemptyString(level.title, 'level title'),
        sources: strings(level.sources, 'sources')
      };
    })
  };
}

export function glyphDigest(svg: string): string {
  return createHash('sha256').update(svg.replace(/\r\n/g, '\n')).digest('hex');
}

function parseGlyph(character: string, svg: string): PuzzleGlyph {
  const cleaned = svg.replace(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/g, '');
  if (XMLValidator.validate(cleaned) !== true) throw new Error(`Malformed SVG for ${character}`);
  const parser = new XMLParser({ ignoreAttributes: false, processEntities: false });
  const parsed: unknown = parser.parse(cleaned);
  const root = record(record(parsed, 'SVG document').svg, 'svg');
  const strokes: PuzzleStroke[] = [];
  let matchedGlyph = false;

  function visit(value: unknown, insideStrokePaths: boolean, ancestorTransformed = false): void {
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, insideStrokePaths, ancestorTransformed));
      return;
    }
    if (typeof value !== 'object' || value === null) return;
    const node = record(value, 'SVG node');
    const id = typeof node['@_id'] === 'string' ? node['@_id'] : '';
    const inside = insideStrokePaths || id.startsWith('kvg:StrokePaths_');
    const transformed = ancestorTransformed || node['@_transform'] !== undefined;
    if (inside && transformed) {
      throw new Error(`Transformed strokes are not supported for ${character}`);
    }
    if (inside && /^kvg:[0-9a-f]{5}$/.test(id) && node['@_kvg:element'] === character) {
      matchedGlyph = true;
    }
    if (inside && node.path !== undefined) {
      const paths: unknown[] = Array.isArray(node.path) ? node.path : [node.path];
      for (const value of paths) {
        const stroke = record(value, 'stroke');
        if (stroke['@_transform'] !== undefined)
          throw new Error(`Transformed stroke for ${character}`);
        strokes.push({
          id: nonemptyString(stroke['@_id'], 'stroke id'),
          path: nonemptyString(stroke['@_d'], 'stroke path')
        });
      }
    }
    if (node.g !== undefined) visit(node.g, inside, transformed);
  }

  if (root['@_transform'] !== undefined) throw new Error(`Transformed SVG for ${character}`);
  visit(root, false);
  if (!matchedGlyph || strokes.length === 0)
    throw new Error(`SVG does not contain glyph ${character}`);
  for (const stroke of strokes) {
    if (!/-s\d+$/.test(stroke.id)) throw new Error(`Invalid KanjiVG stroke ID: ${stroke.id}`);
  }
  strokes.sort((left, right) => Number(left.id.split('-s')[1]) - Number(right.id.split('-s')[1]));
  return { character, viewBox: nonemptyString(root['@_viewBox'], 'viewBox'), strokes };
}

export function generatePuzzleLevels(
  contentIndex: unknown,
  maps: PuzzleMaps,
  readSvg: (filename: string) => string
): PuzzleContent {
  const index = record(record(contentIndex, 'content index').kanji, 'kanji index');
  const glyphs = new Map<string, { glyph: PuzzleGlyph; review: ReviewedGlyph }>();
  for (const review of maps.glyphs) {
    if (glyphs.has(review.character))
      throw new Error(`Duplicate reviewed glyph: ${review.character}`);
    const entry = record(index[review.character], `Index entry for ${review.character}`);
    if (!/^[0-9a-f]{5}\.svg$/.test(review.svgFile) || entry.svgFile !== review.svgFile) {
      throw new Error(`SVG index mismatch for ${review.character}`);
    }
    const svg = readSvg(review.svgFile);
    if (glyphDigest(svg) !== review.sha256)
      throw new Error(`Glyph changed; review mappings for ${review.character}`);
    glyphs.set(review.character, { glyph: parseGlyph(review.character, svg), review });
  }

  const ids = new Set<string>();
  const levels = maps.levels.map((recipe): PuzzleLevel => {
    if (ids.has(recipe.id)) throw new Error(`Duplicate level ID: ${recipe.id}`);
    ids.add(recipe.id);
    const answers = new Map<string, { answer: PuzzleAnswer; required: boolean }>();
    const sourceGlyphs = recipe.sources.map((character, sourceGlyph) => {
      const source = glyphs.get(character);
      if (!source) throw new Error(`No reviewed glyph for ${character}`);
      function merge(answer: ReviewedAnswer, required: boolean): void {
        const variants = answer.variants.map((strokeIds) => ({
          sourceGlyph,
          strokeIds: [...strokeIds].sort()
        }));
        const existing = answers.get(answer.character);
        if (existing) {
          if (existing.answer.type !== answer.type)
            throw new Error(`Conflicting answer type: ${answer.character}`);
          existing.required ||= required;
          for (const variant of variants) {
            if (
              !existing.answer.variants.some(
                (entry) =>
                  entry.sourceGlyph === variant.sourceGlyph &&
                  entry.strokeIds.join('|') === variant.strokeIds.join('|')
              )
            ) {
              existing.answer.variants.push(variant);
            }
          }
        } else {
          answers.set(answer.character, {
            required,
            answer: {
              character: answer.character,
              type: answer.type,
              variants,
              ...(answer.readings === undefined ? {} : { readings: [...answer.readings] }),
              ...(answer.meaning === undefined ? {} : { meaning: answer.meaning })
            }
          });
        }
      }
      merge(
        {
          character,
          type: 'KANJI',
          variants: [source.glyph.strokes.map((stroke) => stroke.id)],
          readings: source.review.readings,
          meaning: source.review.meaning
        },
        true
      );
      source.review.requiredAnswers.forEach((answer) => merge(answer, true));
      source.review.bonusAnswers.forEach((answer) => merge(answer, false));
      return source.glyph;
    });
    const level: PuzzleLevel = {
      id: recipe.id,
      title: recipe.title,
      sourceGlyphs,
      requiredAnswers: [...answers.values()]
        .filter((entry) => entry.required)
        .map((entry) => entry.answer),
      bonusAnswers: [...answers.values()]
        .filter((entry) => !entry.required)
        .map((entry) => entry.answer)
    };
    validatePuzzleLevel(level);
    return level;
  });
  if (levels.length === 0) throw new Error('At least one level is required');
  return { contentVersion: '1.0.0', levels };
}

export function serializePuzzleContent(content: PuzzleContent): string {
  return `${JSON.stringify(content, null, 2)}\n`;
}

import { z } from 'zod';
import { validatePuzzleLevel, type PuzzleLevel } from '@wakai-core/core';
import generated from './puzzleLevels.json';

const answerSchema = z.object({
  character: z.string().min(1),
  type: z.enum(['KANJI', 'KANA']),
  variants: z
    .array(
      z.object({
        sourceGlyph: z.number().int().nonnegative(),
        strokeIds: z.array(z.string()).min(1)
      })
    )
    .min(1),
  readings: z.array(z.string()).optional(),
  meaning: z.string().optional()
});

export const PuzzleBundleSchema = z.object({
  contentVersion: z.string().min(1),
  levels: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        sourceGlyphs: z
          .array(
            z.object({
              character: z.string().min(1),
              viewBox: z.string().min(1),
              strokes: z.array(z.object({ id: z.string().min(1), path: z.string().min(1) })).min(1)
            })
          )
          .min(1),
        requiredAnswers: z.array(answerSchema).min(1),
        bonusAnswers: z.array(answerSchema)
      })
    )
    .min(1)
});

export interface PuzzleBundle {
  contentVersion: string;
  levels: PuzzleLevel[];
}

export const loadPuzzleContent = (value: unknown): PuzzleBundle => {
  const bundle = PuzzleBundleSchema.parse(value);
  const ids = new Set<string>();
  for (const level of bundle.levels) {
    if (ids.has(level.id)) throw new Error(`Duplicate puzzle level: ${level.id}`);
    ids.add(level.id);
    validatePuzzleLevel(level);
  }
  return bundle;
};

export const getPuzzleContent = (): PuzzleBundle => loadPuzzleContent(generated);

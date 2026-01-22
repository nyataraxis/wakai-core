import { z } from 'zod'
import type { ComponentId, KanjiId, NormalizationTable } from '@wakai-core/core'

export type ContentVersion = string

const componentIdSchema: z.ZodType<ComponentId> = z.string()
const kanjiIdSchema: z.ZodType<KanjiId> = z.string()
const contentVersionSchema: z.ZodType<ContentVersion> = z.string()

export const KanjiEntrySchema = z.object({
  kanji: kanjiIdSchema,
  components: z.array(componentIdSchema),
  readings: z.array(z.string()),
  meanings: z.array(z.string()),
  jlpt: z.number().int(),
  freq: z.number().int()
})

export type KanjiEntry = z.infer<typeof KanjiEntrySchema>

const normalizationMapSchema: z.ZodType<NormalizationTable> = z.record(
  componentIdSchema,
  componentIdSchema
)

export const ContentSchema = z.object({
  contentVersion: contentVersionSchema,
  kanji: z.array(KanjiEntrySchema),
  fusionIndex: z.record(z.string(), kanjiIdSchema),
  normalizationMap: normalizationMapSchema
})

export type ContentBundle = z.infer<typeof ContentSchema>

export type FusionIndexRecord = Record<string, KanjiId>

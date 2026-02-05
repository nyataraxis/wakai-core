import { z } from 'zod'

export type ContentVersion = string
export type KanjiId = string
export type ComponentId = string
export type FusionIndex = Record<string, KanjiId>
export type NormalizeMap = Record<ComponentId, ComponentId>
export type SourceId = 'kanjivg' | 'kradfile2'

const componentIdSchema = z.string()
const kanjiIdSchema = z.string()
const contentVersionSchema = z.string()
const sourceIdSchema = z.enum(['kanjivg', 'kradfile2'])

export const KanjiEntrySchema = z.object({
  components: z.array(componentIdSchema),
  meta: z
    .object({
      source: sourceIdSchema,
      warnings: z.array(z.string()).optional()
    })
    .optional()
})

export type KanjiEntry = z.infer<typeof KanjiEntrySchema>

const normalizeMapSchema: z.ZodType<NormalizeMap> = z.record(componentIdSchema, componentIdSchema)

export const ContentSchema = z.object({
  contentVersion: contentVersionSchema,
  kanji: z.record(kanjiIdSchema, KanjiEntrySchema),
  fusionIndex: z.record(z.string(), kanjiIdSchema),
  normalizeMap: normalizeMapSchema,
  startSet: z.array(componentIdSchema),
  debug: z.object({
    sourceByKanji: z.record(kanjiIdSchema, sourceIdSchema),
    warnings: z.array(z.string())
  })
})

export type Content = z.infer<typeof ContentSchema>

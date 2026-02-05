import { z } from 'zod'

export type ContentVersion = string
export type KanjiId = string
export type ComponentId = string
export type SymbolId = string
export type FusionIndex = Record<string, KanjiId>
export type NormalizeMap = Record<ComponentId, ComponentId>
export type SourceId = 'kanjivg' | 'kradfile2'

const componentIdSchema = z.string()
const kanjiIdSchema = z.string()
const symbolIdSchema = z.string()
const contentVersionSchema = z.string()
const sourceIdSchema = z.enum(['kanjivg', 'kradfile2'])

export const KanjiEntrySchema = z.object({
  id: symbolIdSchema,
  components: z.array(componentIdSchema),
  svgFile: z.string().optional(),
  meta: z
    .object({
      source: sourceIdSchema,
      warnings: z.array(z.string()).optional()
    })
    .optional()
})

export type KanjiEntry = z.infer<typeof KanjiEntrySchema>

const normalizeMapSchema: z.ZodType<NormalizeMap> = z.record(componentIdSchema, componentIdSchema)
const fusionIndexSchema = z.record(z.string(), kanjiIdSchema)

export const KanjiLevelFileSchema = z.object({
  contentVersion: contentVersionSchema,
  level: z.number(),
  kanji: z.record(kanjiIdSchema, KanjiEntrySchema)
})

export type KanjiLevelFile = z.infer<typeof KanjiLevelFileSchema>

export const FusionIndexLevelFileSchema = z.object({
  contentVersion: contentVersionSchema,
  level: z.number(),
  fusionIndex: fusionIndexSchema
})

export type FusionIndexLevelFile = z.infer<typeof FusionIndexLevelFileSchema>

export const NormalizeMapFileSchema = z.object({
  contentVersion: contentVersionSchema,
  normalizeMap: normalizeMapSchema
})

export type NormalizeMapFile = z.infer<typeof NormalizeMapFileSchema>

export const StartSetFileSchema = z.object({
  contentVersion: contentVersionSchema,
  startSet: z.array(componentIdSchema)
})

export type StartSetFile = z.infer<typeof StartSetFileSchema>

export const DebugFileSchema = z.object({
  contentVersion: contentVersionSchema,
  sourceByKanji: z.record(kanjiIdSchema, sourceIdSchema),
  warnings: z.array(z.string())
})

export type DebugFile = z.infer<typeof DebugFileSchema>

export const MinimalSetFileSchema = z.object({
  contentVersion: contentVersionSchema,
  level: z.number(),
  minimalSet: z.array(componentIdSchema)
})

export type MinimalSetFile = z.infer<typeof MinimalSetFileSchema>

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

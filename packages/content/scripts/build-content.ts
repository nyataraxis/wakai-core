import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ContentSchema,
  DebugFileSchema,
  FusionIndexLevelFileSchema,
  KanjiLevelFileSchema,
  NormalizeMapFileSchema,
  StartSetFileSchema,
  type Content,
  type DebugFile,
  type FusionIndexLevelFile,
  type KanjiEntry,
  type KanjiLevelFile,
  type NormalizeMapFile,
  type StartSetFile
} from '../src/schema'
import { NORMALIZE_MAP_V1 } from '../src/normalizeMap'
import { buildComponents } from './build-components'
import { buildFusionIndex, signature } from './build-fusion-index'
import { parseKanjivgDir } from './parse-kanjivg'
import { parseKradFile } from './parse-krad'

const CONTENT_VERSION = '1.0.0'
const RAW_DIR_ENV = 'WAKAI_RAW_DIR'
const GENERATED_DIR_ENV = 'WAKAI_GENERATED_DIR'
const KANJIVG_DIR_NAME = 'kanjivg'
const KRAD_FILE_NAME = 'kradfile2'
const WARNING_SEPARATOR = ':'
const MAX_LEVEL = 5
const ID_PREFIX_KANJI = 'k'
const HEX_PAD_LENGTH = 5

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(scriptDir, '..')

const repoRoot = path.resolve(packageDir, '..', '..')
const defaultRawDir = path.join(repoRoot, 'data', 'raw')
const defaultGeneratedDir = path.join(repoRoot, 'data', 'generated')
const rawDir = process.env[RAW_DIR_ENV] ?? defaultRawDir
const generatedDir = process.env[GENERATED_DIR_ENV] ?? defaultGeneratedDir

const startSetPath = path.join(packageDir, 'startSet.json')
const kanjivgPath = path.join(rawDir, KANJIVG_DIR_NAME)
const kradPath = path.join(rawDir, KRAD_FILE_NAME)

const generateId = (char: string): string => {
  const codePoint = char.codePointAt(0)
  if (codePoint === undefined) {
    return `${ID_PREFIX_KANJI}-unknown`
  }
  const hex = codePoint.toString(16).padStart(HEX_PAD_LENGTH, '0')
  return `${ID_PREFIX_KANJI}-${hex}`
}

const getLevelName = (level: number): string => {
  if (level >= MAX_LEVEL) {
    return `level${MAX_LEVEL}plus`
  }
  return `level${level}`
}

const getComponentLevel = (componentCount: number): number => {
  if (componentCount <= 1) {
    return 1
  }
  if (componentCount >= MAX_LEVEL) {
    return MAX_LEVEL
  }
  return componentCount
}

const parseStartSet = async (): Promise<string[]> => {
  const raw = await readFile(startSetPath, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) {
    return []
  }
  return parsed.map((entry) => String(entry))
}

const splitWarnings = (warnings: string[]): Record<string, string[]> => {
  const result: Record<string, string[]> = {}
  for (const warning of warnings) {
    const separatorIndex = warning.indexOf(WARNING_SEPARATOR)
    if (separatorIndex === -1) {
      continue
    }
    const type = warning.slice(0, separatorIndex)
    const kanji = warning.slice(separatorIndex + WARNING_SEPARATOR.length)
    if (!kanji) {
      continue
    }
    const list = result[kanji] ?? []
    list.push(type)
    result[kanji] = list
  }
  return result
}

const buildKanjiEntries = (
  componentsByKanji: Record<string, string[]>,
  sourceByKanji: Record<string, 'kanjivg' | 'kradfile2'>,
  svgFileByKanji: Record<string, string>,
  warnings: string[]
): Record<string, KanjiEntry> => {
  const warningMap = splitWarnings(warnings)
  const entries: Record<string, KanjiEntry> = {}
  for (const [kanji, components] of Object.entries(componentsByKanji)) {
    const warningList = warningMap[kanji]
    const svgFile = svgFileByKanji[kanji]
    entries[kanji] = {
      id: generateId(kanji),
      components,
      svgFile: svgFile || undefined,
      meta: {
        source: sourceByKanji[kanji],
        warnings: warningList?.length ? warningList : undefined
      }
    }
  }
  return entries
}

const splitKanjiByLevel = (
  kanjiEntries: Record<string, KanjiEntry>
): Record<number, Record<string, KanjiEntry>> => {
  const levels: Record<number, Record<string, KanjiEntry>> = {}
  for (let level = 1; level <= MAX_LEVEL; level++) {
    levels[level] = {}
  }
  for (const [kanji, entry] of Object.entries(kanjiEntries)) {
    const level = getComponentLevel(entry.components.length)
    levels[level][kanji] = entry
  }
  return levels
}

const splitFusionIndexByLevel = (
  fusionIndex: Record<string, string>,
  kanjiEntries: Record<string, KanjiEntry>
): Record<number, Record<string, string>> => {
  const levels: Record<number, Record<string, string>> = {}
  for (let level = 1; level <= MAX_LEVEL; level++) {
    levels[level] = {}
  }
  for (const [sig, kanji] of Object.entries(fusionIndex)) {
    const entry = kanjiEntries[kanji]
    if (!entry) {
      continue
    }
    const level = getComponentLevel(entry.components.length)
    levels[level][sig] = kanji
  }
  return levels
}

const writeKanjiLevelFile = async (
  level: number,
  kanji: Record<string, KanjiEntry>
): Promise<void> => {
  const fileName = `kanji.${getLevelName(level)}.json`
  const filePath = path.join(generatedDir, fileName)
  const data: KanjiLevelFile = {
    contentVersion: CONTENT_VERSION,
    level,
    kanji
  }
  const validated = KanjiLevelFileSchema.parse(data)
  await writeFile(filePath, JSON.stringify(validated, null, 2), 'utf8')
}

const writeFusionIndexLevelFile = async (
  level: number,
  fusionIndex: Record<string, string>
): Promise<void> => {
  const fileName = `fusionIndex.${getLevelName(level)}.json`
  const filePath = path.join(generatedDir, fileName)
  const data: FusionIndexLevelFile = {
    contentVersion: CONTENT_VERSION,
    level,
    fusionIndex
  }
  const validated = FusionIndexLevelFileSchema.parse(data)
  await writeFile(filePath, JSON.stringify(validated, null, 2), 'utf8')
}

const writeNormalizeMapFile = async (): Promise<void> => {
  const filePath = path.join(generatedDir, 'normalizeMap.json')
  const data: NormalizeMapFile = {
    contentVersion: CONTENT_VERSION,
    normalizeMap: NORMALIZE_MAP_V1
  }
  const validated = NormalizeMapFileSchema.parse(data)
  await writeFile(filePath, JSON.stringify(validated, null, 2), 'utf8')
}

const writeStartSetFile = async (startSet: string[]): Promise<void> => {
  const filePath = path.join(generatedDir, 'startSet.json')
  const data: StartSetFile = {
    contentVersion: CONTENT_VERSION,
    startSet
  }
  const validated = StartSetFileSchema.parse(data)
  await writeFile(filePath, JSON.stringify(validated, null, 2), 'utf8')
}

const writeDebugFile = async (
  sourceByKanji: Record<string, 'kanjivg' | 'kradfile2'>,
  warnings: string[]
): Promise<void> => {
  const filePath = path.join(generatedDir, 'debug.json')
  const data: DebugFile = {
    contentVersion: CONTENT_VERSION,
    sourceByKanji,
    warnings
  }
  const validated = DebugFileSchema.parse(data)
  await writeFile(filePath, JSON.stringify(validated, null, 2), 'utf8')
}

const writeFullContentFile = async (content: Content): Promise<void> => {
  const filePath = path.join(generatedDir, 'content.full.json')
  await writeFile(filePath, JSON.stringify(content, null, 2), 'utf8')
}

const buildContent = async (): Promise<void> => {
  await access(kanjivgPath)
  await access(kradPath)
  const [kanjivg, krad, startSet] = await Promise.all([
    parseKanjivgDir(kanjivgPath),
    parseKradFile(kradPath),
    parseStartSet()
  ])

  const { componentsByKanji, sourceByKanji, svgFileByKanji, warnings } = buildComponents(
    kanjivg,
    krad
  )
  const { fusionIndex, collisions } = buildFusionIndex(componentsByKanji)
  const kanji = buildKanjiEntries(componentsByKanji, sourceByKanji, svgFileByKanji, warnings)
  const collisionWarnings = Object.keys(collisions).map(
    (signatureValue) => `fusion-collision:${signatureValue}`
  )
  const allWarnings = [...warnings, ...collisionWarnings]

  const kanjiByLevel = splitKanjiByLevel(kanji)
  const fusionByLevel = splitFusionIndexByLevel(fusionIndex, kanji)

  await mkdir(generatedDir, { recursive: true })

  const levelWrites: Promise<void>[] = []
  for (let level = 1; level <= MAX_LEVEL; level++) {
    levelWrites.push(writeKanjiLevelFile(level, kanjiByLevel[level]))
    levelWrites.push(writeFusionIndexLevelFile(level, fusionByLevel[level]))
  }

  await Promise.all([
    ...levelWrites,
    writeNormalizeMapFile(),
    writeStartSetFile(startSet),
    writeDebugFile(sourceByKanji, allWarnings)
  ])

  const content: Content = {
    contentVersion: CONTENT_VERSION,
    kanji,
    fusionIndex,
    normalizeMap: NORMALIZE_MAP_V1,
    startSet,
    debug: {
      sourceByKanji,
      warnings: allWarnings
    }
  }
  const validatedContent = ContentSchema.parse(content)
  await writeFullContentFile(validatedContent)
}

const run = async (): Promise<void> => {
  await buildContent()
}

run().catch((error) => {
  process.stderr.write(String(error))
  process.exit(1)
})

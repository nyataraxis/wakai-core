import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ContentSchema, type Content, type KanjiEntry } from '../src/schema'
import { NORMALIZE_MAP_V1 } from '../src/normalizeMap'
import { buildComponents } from './build-components'
import { buildFusionIndex } from './build-fusion-index'
import { parseKanjivgDir } from './parse-kanjivg'
import { parseKradFile } from './parse-krad'

const CONTENT_VERSION = '1.0.0'
const RAW_DIR_ENV = 'WAKAI_RAW_DIR'
const GENERATED_DIR_ENV = 'WAKAI_GENERATED_DIR'
const KANJIVG_DIR_NAME = 'kanjivg'
const KRAD_FILE_NAME = 'kradfile2'
const OUTPUT_FILE_NAME = 'content.full.json'
const WARNING_SEPARATOR = ':'

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
const outputPath = path.join(generatedDir, OUTPUT_FILE_NAME)

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
  warnings: string[]
): Record<string, KanjiEntry> => {
  const warningMap = splitWarnings(warnings)
  const entries: Record<string, KanjiEntry> = {}
  for (const [kanji, components] of Object.entries(componentsByKanji)) {
    const warningList = warningMap[kanji]
    entries[kanji] = {
      components,
      meta: {
        source: sourceByKanji[kanji],
        warnings: warningList?.length ? warningList : undefined
      }
    }
  }
  return entries
}

const buildContent = async (): Promise<Content> => {
  await access(kanjivgPath)
  await access(kradPath)
  const [kanjivg, krad, startSet] = await Promise.all([
    parseKanjivgDir(kanjivgPath),
    parseKradFile(kradPath),
    parseStartSet()
  ])

  const { componentsByKanji, sourceByKanji, warnings } = buildComponents(kanjivg, krad)
  const { fusionIndex, collisions } = buildFusionIndex(componentsByKanji)
  const kanji = buildKanjiEntries(componentsByKanji, sourceByKanji, warnings)
  const collisionWarnings = Object.keys(collisions).map(
    (signatureValue) => `fusion-collision:${signatureValue}`
  )

  const content: Content = {
    contentVersion: CONTENT_VERSION,
    kanji,
    fusionIndex,
    normalizeMap: NORMALIZE_MAP_V1,
    startSet,
    debug: {
      sourceByKanji,
      warnings: [...warnings, ...collisionWarnings]
    }
  }

  return ContentSchema.parse(content)
}

const run = async (): Promise<void> => {
  const content = await buildContent()
  await mkdir(generatedDir, { recursive: true })
  await writeFile(outputPath, JSON.stringify(content, null, 2), 'utf8')
}

run().catch((error) => {
  process.stderr.write(String(error))
  process.exit(1)
})

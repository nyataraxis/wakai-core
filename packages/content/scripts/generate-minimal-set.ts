import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  KanjiLevelFileSchema,
  MinimalSetFileSchema,
  type KanjiEntry,
  type MinimalSetFile
} from '../src/schema'

const GENERATED_DIR_ENV = 'WAKAI_GENERATED_DIR'
const CONTENT_VERSION = '1.0.0'
const MAX_LEVEL = 5
const DEFAULT_FUSIONS_LEVEL = 2

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(packageDir, '..', '..')
const defaultGeneratedDir = path.join(repoRoot, 'data', 'generated')
const generatedDir = process.env[GENERATED_DIR_ENV] ?? defaultGeneratedDir

const getLevelName = (level: number): string => {
  if (level >= MAX_LEVEL) {
    return `level${MAX_LEVEL}plus`
  }
  return `level${level}`
}

const parseArgs = (): number => {
  const args = process.argv.slice(2)
  for (const arg of args) {
    if (arg.startsWith('--fusions=')) {
      const value = Number.parseInt(arg.slice('--fusions='.length), 10)
      if (!Number.isNaN(value) && value >= 1 && value <= MAX_LEVEL) {
        return value
      }
    }
  }
  return DEFAULT_FUSIONS_LEVEL
}

const loadKanjiLevel = async (level: number): Promise<Record<string, KanjiEntry>> => {
  const fileName = `kanji.${getLevelName(level)}.json`
  const filePath = path.join(generatedDir, fileName)
  const raw = await readFile(filePath, 'utf8')
  const parsed = KanjiLevelFileSchema.parse(JSON.parse(raw))
  return parsed.kanji
}

const loadAllKanjiUpToLevel = async (
  targetLevel: number
): Promise<Record<string, KanjiEntry>> => {
  const allKanji: Record<string, KanjiEntry> = {}
  for (let level = 1; level <= targetLevel; level++) {
    const levelKanji = await loadKanjiLevel(level)
    Object.assign(allKanji, levelKanji)
  }
  return allKanji
}

const findMinimalSet = (
  kanjiEntries: Record<string, KanjiEntry>,
  targetLevel: number
): string[] => {
  const primitives = new Set<string>()
  const nonPrimitives: Array<{ kanji: string; components: string[] }> = []

  for (const [kanji, entry] of Object.entries(kanjiEntries)) {
    if (entry.components.length <= 1) {
      primitives.add(kanji)
    } else {
      nonPrimitives.push({ kanji, components: entry.components })
    }
  }

  const required = new Set<string>(primitives)
  const reachable = new Set<string>(primitives)

  let changed = true
  while (changed) {
    changed = false
    for (const { kanji, components } of nonPrimitives) {
      if (reachable.has(kanji)) {
        continue
      }
      const allComponentsReachable = components.every((component) => reachable.has(component))
      if (allComponentsReachable) {
        reachable.add(kanji)
        changed = true
      }
    }
  }

  for (const { components } of nonPrimitives) {
    for (const component of components) {
      if (!reachable.has(component) && !required.has(component)) {
        required.add(component)
      }
    }
  }

  const finalRequired = new Set<string>(primitives)

  const targetKanji = Object.entries(kanjiEntries)
    .filter(([, entry]) => entry.components.length <= targetLevel)
    .map(([kanji]) => kanji)

  const findRequiredComponents = (kanji: string, visited: Set<string>): void => {
    if (visited.has(kanji)) {
      return
    }
    visited.add(kanji)

    const entry = kanjiEntries[kanji]
    if (!entry) {
      finalRequired.add(kanji)
      return
    }

    if (entry.components.length <= 1) {
      finalRequired.add(kanji)
      return
    }

    for (const component of entry.components) {
      findRequiredComponents(component, visited)
    }
  }

  for (const kanji of targetKanji) {
    const visited = new Set<string>()
    findRequiredComponents(kanji, visited)
  }

  return Array.from(finalRequired).sort()
}

const writeMinimalSetFile = async (level: number, minimalSet: string[]): Promise<void> => {
  const fileName = `minimalSet.${getLevelName(level)}.json`
  const filePath = path.join(generatedDir, fileName)
  const data: MinimalSetFile = {
    contentVersion: CONTENT_VERSION,
    level,
    minimalSet
  }
  const validated = MinimalSetFileSchema.parse(data)
  await writeFile(filePath, JSON.stringify(validated, null, 2), 'utf8')
}

const run = async (): Promise<void> => {
  const targetLevel = parseArgs()
  process.stdout.write(`Generating minimal set for fusions level ${targetLevel}...\n`)

  const kanjiEntries = await loadAllKanjiUpToLevel(targetLevel)
  const minimalSet = findMinimalSet(kanjiEntries, targetLevel)

  await mkdir(generatedDir, { recursive: true })
  await writeMinimalSetFile(targetLevel, minimalSet)

  process.stdout.write(
    `Generated minimalSet.${getLevelName(targetLevel)}.json with ${minimalSet.length} entries\n`
  )
}

run().catch((error) => {
  process.stderr.write(String(error))
  process.exit(1)
})

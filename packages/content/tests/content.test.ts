import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  ContentSchema,
  DebugFileSchema,
  FusionIndexLevelFileSchema,
  KanjiLevelFileSchema,
  NormalizeMapFileSchema,
  StartSetFileSchema,
  type KanjiEntry
} from '../src/schema'

const GENERATED_DIR_ENV = 'WAKAI_GENERATED_DIR'
const repoRoot = path.resolve(process.cwd(), '..', '..')
const DEFAULT_GENERATED_DIR = path.join(repoRoot, 'data', 'generated')
const generatedDir = process.env[GENERATED_DIR_ENV] ?? DEFAULT_GENERATED_DIR

const loadContent = async () => {
  const filePath = path.join(generatedDir, 'content.full.json')
  const raw = await readFile(filePath, 'utf8')
  return ContentSchema.parse(JSON.parse(raw))
}

const loadKanjiLevel = async (level: number): Promise<Record<string, KanjiEntry>> => {
  const levelName = level >= 5 ? 'level5plus' : `level${level}`
  const filePath = path.join(generatedDir, `kanji.${levelName}.json`)
  const raw = await readFile(filePath, 'utf8')
  const parsed = KanjiLevelFileSchema.parse(JSON.parse(raw))
  return parsed.kanji
}

const loadFusionIndexLevel = async (level: number): Promise<Record<string, string>> => {
  const levelName = level >= 5 ? 'level5plus' : `level${level}`
  const filePath = path.join(generatedDir, `fusionIndex.${levelName}.json`)
  const raw = await readFile(filePath, 'utf8')
  const parsed = FusionIndexLevelFileSchema.parse(JSON.parse(raw))
  return parsed.fusionIndex
}

const loadNormalizeMap = async () => {
  const filePath = path.join(generatedDir, 'normalizeMap.json')
  const raw = await readFile(filePath, 'utf8')
  return NormalizeMapFileSchema.parse(JSON.parse(raw))
}

const loadStartSet = async () => {
  const filePath = path.join(generatedDir, 'startSet.json')
  const raw = await readFile(filePath, 'utf8')
  return StartSetFileSchema.parse(JSON.parse(raw))
}

const loadDebug = async () => {
  const filePath = path.join(generatedDir, 'debug.json')
  const raw = await readFile(filePath, 'utf8')
  return DebugFileSchema.parse(JSON.parse(raw))
}

describe('content build', () => {
  test('generated full content matches schema', async () => {
    const content = await loadContent()
    expect(content).toBeTruthy()
    expect(content.contentVersion).toBe('1.0.0')
  })

  test('kanji level files match schema', async () => {
    for (let level = 1; level <= 5; level++) {
      const kanji = await loadKanjiLevel(level)
      expect(kanji).toBeTruthy()
      for (const entry of Object.values(kanji)) {
        expect(entry.id).toMatch(/^k-[0-9a-f]{5}$/)
      }
    }
  })

  test('fusion index level files match schema', async () => {
    for (let level = 1; level <= 5; level++) {
      const fusionIndex = await loadFusionIndexLevel(level)
      expect(fusionIndex).toBeTruthy()
    }
  })

  test('normalize map file matches schema', async () => {
    const normalizeMap = await loadNormalizeMap()
    expect(normalizeMap).toBeTruthy()
    expect(normalizeMap.contentVersion).toBe('1.0.0')
  })

  test('start set file matches schema', async () => {
    const startSet = await loadStartSet()
    expect(startSet).toBeTruthy()
    expect(startSet.startSet.length).toBeGreaterThan(0)
  })

  test('debug file matches schema', async () => {
    const debug = await loadDebug()
    expect(debug).toBeTruthy()
  })

  test('level 1 and 2 kanji data is available', async () => {
    const level1 = await loadKanjiLevel(1)
    const level2 = await loadKanjiLevel(2)

    const level1Count = Object.keys(level1).length
    const level2Count = Object.keys(level2).length

    const level1WithComponents = Object.values(level1).filter((e) => e.components.length === 1)
    const level2WithComponents = Object.values(level2).filter((e) => e.components.length === 2)

    console.info(`level 1 total: ${level1Count}`)
    console.info(`level 1 with exactly 1 component: ${level1WithComponents.length}`)
    console.info(`level 2 total: ${level2Count}`)
    console.info(`level 2 with exactly 2 components: ${level2WithComponents.length}`)

    expect(level1Count).toBeGreaterThan(0)
    expect(level2Count).toBeGreaterThan(0)
    expect(level1WithComponents.length).toBeGreaterThan(0)
    expect(level2WithComponents.length).toBeGreaterThan(0)
  })
})

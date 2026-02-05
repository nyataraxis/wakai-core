import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { ContentSchema } from '../src/schema'

const GENERATED_DIR_ENV = 'WAKAI_GENERATED_DIR'
const repoRoot = path.resolve(process.cwd(), '..', '..')
const DEFAULT_GENERATED_DIR = path.join(repoRoot, 'data', 'generated')
const OUTPUT_FILE_NAME = 'content.full.json'
const generatedDir = process.env[GENERATED_DIR_ENV] ?? DEFAULT_GENERATED_DIR
const generatedPath = path.join(generatedDir, OUTPUT_FILE_NAME)

const loadContent = async () => {
  const raw = await readFile(generatedPath, 'utf8')
  return ContentSchema.parse(JSON.parse(raw))
}

describe('content build', () => {
  test('generated content matches schema', async () => {
    const content = await loadContent()
    expect(content).toBeTruthy()
  })

  test('all kanji are reachable from start set', async () => {
    const content = await loadContent()
    const startSet = new Set(content.startSet)
    const kanjiEntries = content.kanji
    const allKanji = Object.keys(kanjiEntries)
    const reachable = new Set(startSet)
    let changed = true
    let iterations = 0

    while (changed) {
      changed = false
      iterations += 1
      for (const kanji of allKanji) {
        if (reachable.has(kanji)) {
          continue
        }
        const components = kanjiEntries[kanji].components
        if (components.length === 0) {
          continue
        }
        if (components.every((component) => reachable.has(component))) {
          reachable.add(kanji)
          changed = true
        }
      }
    }

    const unreachable = allKanji.filter((kanji) => !reachable.has(kanji))
    console.info(`reachability iterations:${iterations}`)
    console.info(`reachability unreachable:${unreachable.length}`)
    expect(unreachable).toEqual([])
  })
})

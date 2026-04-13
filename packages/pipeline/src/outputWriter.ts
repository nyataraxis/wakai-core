import * as fs from 'node:fs'
import * as path from 'node:path'
import type { KanjiDecomposition, KanjiRecord, MergeRecipe, DebugInfo } from './types.js'
import { mergeMapToRecord } from './mergeMaps.js'

const CONTENT_VERSION = '2.0.0'
const INDENT = 2

function writeJson(filePath: string, data: unknown): void {
  const json = JSON.stringify(data, null, INDENT)
  fs.writeFileSync(filePath, json + '\n', 'utf-8')
  console.log(`  Wrote ${filePath} (${Math.round(json.length / 1024)}KB)`)
}

export function writeAllOutputs(
  outputDir: string,
  primitives: Set<string>,
  normalizeMap: Record<string, string>,
  mergeMaps: Map<number, Map<string, MergeRecipe>>,
  decompositions: Map<string, KanjiDecomposition>
): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  console.log('\nWriting output files...')

  writePrimitives(outputDir, primitives)
  writeNormalizeMap(outputDir, normalizeMap)
  writeMergeMaps(outputDir, mergeMaps)
  writeFullContent(outputDir, decompositions, mergeMaps)
  writeDebug(outputDir, decompositions, primitives, mergeMaps)
}

function writePrimitives(outputDir: string, primitives: Set<string>): void {
  const sorted = [...primitives].sort()
  writeJson(path.join(outputDir, 'primitives.json'), {
    contentVersion: CONTENT_VERSION,
    primitives: sorted,
  })
}

function writeNormalizeMap(outputDir: string, normalizeMap: Record<string, string>): void {
  const sorted = Object.keys(normalizeMap).sort()
  const ordered: Record<string, string> = {}
  for (const key of sorted) {
    ordered[key] = normalizeMap[key]
  }
  writeJson(path.join(outputDir, 'normalizeMap.json'), {
    contentVersion: CONTENT_VERSION,
    normalizeMap: ordered,
  })
}

function writeMergeMaps(
  outputDir: string,
  mergeMaps: Map<number, Map<string, MergeRecipe>>
): void {
  const HIGH_ARITY_THRESHOLD = 5

  for (const [arity, recipes] of mergeMaps) {
    if (recipes.size === 0 || arity >= HIGH_ARITY_THRESHOLD) continue

    writeJson(path.join(outputDir, `mergeMap.${arity}.json`), {
      contentVersion: CONTENT_VERSION,
      arity,
      mergeMap: mergeMapToRecord(recipes),
    })
  }

  const highArityMap = getMergedHighArityMap(mergeMaps)
  if (Object.keys(highArityMap).length > 0) {
    writeJson(path.join(outputDir, 'mergeMap.5plus.json'), {
      contentVersion: CONTENT_VERSION,
      arity: '5+',
      mergeMap: highArityMap,
    })
  }
}

function getMergedHighArityMap(
  mergeMaps: Map<number, Map<string, MergeRecipe>>
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [arity, recipes] of mergeMaps) {
    if (arity >= 5) {
      for (const [sig, recipe] of recipes) {
        result[sig] = recipe.kanji
      }
    }
  }

  return result
}

function writeFullContent(
  outputDir: string,
  decompositions: Map<string, KanjiDecomposition>,
  mergeMaps: Map<number, Map<string, MergeRecipe>>
): void {
  const mergeByKanji = new Map<string, MergeRecipe>()
  for (const recipes of mergeMaps.values()) {
    for (const recipe of recipes.values()) {
      mergeByKanji.set(recipe.kanji, recipe)
    }
  }

  const kanji: Record<string, KanjiRecord> = {}

  const sorted = [...decompositions.entries()].sort(([a], [b]) => a.localeCompare(b))

  for (const [char, decomp] of sorted) {
    const recipe = mergeByKanji.get(char)

    kanji[char] = {
      id: `k-${decomp.codepoint}`,
      components: decomp.leafComponents,
      mergeComponents: recipe?.components ?? decomp.leafComponents,
      arity: recipe?.arity ?? decomp.leafComponents.length,
      svgFile: decomp.svgFile,
      meta: {
        source: 'kanjivg',
        ...(decomp.leafComponents.length === 0 ? { warnings: ['primitive'] } : {}),
      },
    }
  }

  writeJson(path.join(outputDir, 'content.full.json'), {
    contentVersion: CONTENT_VERSION,
    kanji,
  })
}

function writeDebug(
  outputDir: string,
  decompositions: Map<string, KanjiDecomposition>,
  primitives: Set<string>,
  mergeMaps: Map<number, Map<string, MergeRecipe>>
): void {
  const arityDistribution: Record<number, number> = {}

  for (const recipes of mergeMaps.values()) {
    for (const recipe of recipes.values()) {
      arityDistribution[recipe.arity] = (arityDistribution[recipe.arity] ?? 0) + 1
    }
  }

  const sourceByKanji: Record<string, string> = {}
  for (const [char] of decompositions) {
    sourceByKanji[char] = 'kanjivg'
  }

  const debug: DebugInfo = {
    contentVersion: CONTENT_VERSION,
    totalKanji: decompositions.size,
    totalPrimitives: primitives.size,
    arityDistribution,
    sourceByKanji,
  }

  writeJson(path.join(outputDir, 'debug.json'), debug)
}

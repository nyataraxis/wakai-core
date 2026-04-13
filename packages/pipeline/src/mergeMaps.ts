import type { KanjiDecomposition, MergeRecipe } from './types.js'

const SIGNATURE_SEPARATOR = '|'
const MAX_MERGE_ARITY = 10

export function createSignature(components: string[]): string {
  return [...components].sort().join(SIGNATURE_SEPARATOR)
}

export function computeMinimalMerge(
  components: string[],
  reverseLookup: Map<string, string>
): string[] {
  if (components.length <= 2) {
    return components
  }

  let bestResult = components
  let improved = true

  while (improved) {
    improved = false
    const current = bestResult

    for (let windowSize = 2; windowSize <= Math.min(current.length - 1, 5); windowSize++) {
      for (let start = 0; start <= current.length - windowSize; start++) {
        const subset = current.slice(start, start + windowSize)
        const sig = createSignature(subset)
        const match = reverseLookup.get(sig)

        if (match) {
          const newResult = [
            ...current.slice(0, start),
            match,
            ...current.slice(start + windowSize),
          ]

          if (newResult.length < bestResult.length) {
            bestResult = newResult
            improved = true
            break
          }
        }
      }
      if (improved) break
    }
  }

  return bestResult
}

export function buildReverseLookup(
  decompositions: Map<string, KanjiDecomposition>
): Map<string, string> {
  const lookup = new Map<string, string>()

  for (const [kanji, decomp] of decompositions) {
    if (decomp.leafComponents.length >= 2) {
      const sig = createSignature(decomp.leafComponents)
      if (!lookup.has(sig)) {
        lookup.set(sig, kanji)
      }
    }
  }

  console.log(`Reverse lookup initialized with ${lookup.size} signatures`)
  return lookup
}

export function buildMergeMaps(
  decompositions: Map<string, KanjiDecomposition>,
  knownKanji: Set<string>
): Map<number, Map<string, MergeRecipe>> {
  const reverseLookup = buildReverseLookup(decompositions)
  const mergeMaps = new Map<number, Map<string, MergeRecipe>>()

  for (let arity = 2; arity <= MAX_MERGE_ARITY; arity++) {
    mergeMaps.set(arity, new Map())
  }

  let processed = 0
  const total = decompositions.size

  for (const [kanji, decomp] of decompositions) {
    if (decomp.leafComponents.length < 2) {
      continue
    }

    const mergeComponents = computeMinimalMerge(decomp.leafComponents, reverseLookup)

    if (mergeComponents.length < 2) {
      continue
    }

    const arity = mergeComponents.length
    const cappedArity = Math.min(arity, MAX_MERGE_ARITY)
    const sig = createSignature(mergeComponents)

    const recipe: MergeRecipe = {
      kanji,
      components: mergeComponents,
      arity,
      svgFile: decomp.svgFile,
      source: 'kanjivg',
    }

    const arityMap = mergeMaps.get(cappedArity)!
    arityMap.set(sig, recipe)
    processed++

    if (processed % 1000 === 0) {
      console.log(`  Processed ${processed}/${total} kanji...`)
    }
  }

  console.log(`Built merge maps for ${processed} kanji`)

  for (const [arity, map] of mergeMaps) {
    if (map.size > 0) {
      console.log(`  Arity ${arity}: ${map.size} recipes`)
    }
  }

  return mergeMaps
}

export function mergeMapToRecord(
  mergeMap: Map<string, MergeRecipe>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [sig, recipe] of mergeMap) {
    result[sig] = recipe.kanji
  }
  return result
}

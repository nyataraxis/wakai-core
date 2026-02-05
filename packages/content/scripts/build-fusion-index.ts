import type { FusionIndex } from '../src/schema'
import { normalizeComponent } from '../src/normalizeMap'

const SIGNATURE_SEPARATOR = '|'

export const signature = (components: string[]): string => {
  const normalized = components.map((component) => normalizeComponent(component))
  const sorted = [...normalized].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
  return sorted.join(SIGNATURE_SEPARATOR)
}

export interface FusionIndexResult {
  fusionIndex: FusionIndex
  collisions: Record<string, string[]>
}

export const buildFusionIndex = (
  componentsByKanji: Record<string, string[]>
): FusionIndexResult => {
  const index: FusionIndex = {}
  const collisions: Record<string, string[]> = {}

  for (const [kanji, components] of Object.entries(componentsByKanji)) {
    if (components.length === 0) {
      continue
    }
    const key = signature(components)
    const existing = index[key]
    if (existing && existing !== kanji) {
      const list = collisions[key] ?? [existing]
      list.push(kanji)
      collisions[key] = list
      delete index[key]
      continue
    }
    if (!collisions[key]) {
      index[key] = kanji
    }
  }

  return { fusionIndex: index, collisions }
}

import type { SourceId } from '../src/schema'
import { normalizeComponents } from '../src/normalizeMap'
import type { ComponentPosition, KanjivgEntry, RawComponent } from './parse-kanjivg'

export interface ComponentBuildResult {
  componentsByKanji: Record<string, string[]>
  sourceByKanji: Record<string, SourceId>
  svgFileByKanji: Record<string, string>
  warnings: string[]
}

const MIN_COMPONENTS = 1
const AMBIGUOUS_RADICAL = '阝'

const buildPositions = (components: RawComponent[]): Array<ComponentPosition | undefined> =>
  components.map((entry) => entry.position)

const buildComponentList = (components: RawComponent[]): string[] =>
  components.map((entry) => entry.component)

export const buildComponents = (
  kanjivg: Record<string, KanjivgEntry>,
  krad: Record<string, string[]>
): ComponentBuildResult => {
  const componentsByKanji: Record<string, string[]> = {}
  const sourceByKanji: Record<string, SourceId> = {}
  const svgFileByKanji: Record<string, string> = {}
  const warnings: string[] = []
  const kanjiSet = new Set([...Object.keys(kanjivg), ...Object.keys(krad)])

  for (const kanji of kanjiSet) {
    const kanjivgEntry = kanjivg[kanji]
    const fromKanjivg = kanjivgEntry?.components ?? []
    const fromKrad = krad[kanji] ?? []

    if (kanjivgEntry?.svgFile) {
      svgFileByKanji[kanji] = kanjivgEntry.svgFile
    }

    if (fromKanjivg.length >= MIN_COMPONENTS) {
      const componentWarnings: string[] = []
      const normalized = normalizeComponents(
        buildComponentList(fromKanjivg),
        buildPositions(fromKanjivg),
        componentWarnings
      )
      componentsByKanji[kanji] = normalized
      sourceByKanji[kanji] = 'kanjivg'
      if (componentWarnings.includes(AMBIGUOUS_RADICAL)) {
        warnings.push(`ambiguous-radical:${kanji}`)
      }
      continue
    }
    if (fromKrad.length >= MIN_COMPONENTS) {
      const componentWarnings: string[] = []
      const normalized = normalizeComponents(fromKrad, new Array(fromKrad.length), componentWarnings)
      componentsByKanji[kanji] = normalized
      sourceByKanji[kanji] = 'kradfile2'
      if (componentWarnings.includes(AMBIGUOUS_RADICAL)) {
        warnings.push(`ambiguous-radical:${kanji}`)
      }
      continue
    }
    componentsByKanji[kanji] = []
    sourceByKanji[kanji] = fromKanjivg.length > 0 ? 'kanjivg' : 'kradfile2'
    warnings.push(`missing-components:${kanji}`)
  }

  return { componentsByKanji, sourceByKanji, svgFileByKanji, warnings }
}

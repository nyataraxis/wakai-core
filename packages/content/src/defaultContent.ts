import { createSignature } from '@wakai-core/core'
import type { ComponentId, KanjiId, NormalizationTable } from '@wakai-core/core'
import type { Content, FusionIndex, KanjiEntry, NormalizeMap } from './schema'

const DEFAULT_CONTENT_VERSION = '1.0.0'

const DEFAULT_NORMALIZE_MAP: NormalizeMap = {}

const DEFAULT_KANJI: Record<KanjiId, KanjiEntry> = {
  人: { components: ['人'] },
  木: { components: ['木'] },
  水: { components: ['水'] },
  火: { components: ['火'] },
  日: { components: ['日'] },
  月: { components: ['月'] },
  休: { components: ['人', '木'] },
  林: { components: ['木', '木'] },
  明: { components: ['日', '月'] },
  炎: { components: ['火', '火'] }
}

const DEFAULT_FUSIONS: Array<{ components: [ComponentId, ComponentId]; output: KanjiId }> = [
  { components: ['人', '木'], output: '休' },
  { components: ['木', '木'], output: '林' },
  { components: ['日', '月'], output: '明' },
  { components: ['火', '火'], output: '炎' }
]

const buildFusionIndex = (
  fusions: Array<{ components: [ComponentId, ComponentId]; output: KanjiId }>,
  normalizationMap: NormalizationTable
): FusionIndex =>
  fusions.reduce<FusionIndex>((acc, fusion) => {
    const signature = createSignature(fusion.components, normalizationMap)
    acc[signature] = fusion.output
    return acc
  }, {})

export const getDefaultContent = (): Content => ({
  contentVersion: DEFAULT_CONTENT_VERSION,
  kanji: DEFAULT_KANJI,
  fusionIndex: buildFusionIndex(DEFAULT_FUSIONS, DEFAULT_NORMALIZE_MAP),
  normalizeMap: DEFAULT_NORMALIZE_MAP,
  startSet: ['人', '木', '水', '火', '日', '月'],
  debug: {
    sourceByKanji: Object.keys(DEFAULT_KANJI).reduce<Record<KanjiId, 'kanjivg'>>(
      (acc, key) => {
        acc[key] = 'kanjivg'
        return acc
      },
      {}
    ),
    warnings: []
  }
})

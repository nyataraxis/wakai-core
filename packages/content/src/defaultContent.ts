import { createSignature } from '@wakai-core/core'
import type { ComponentId, KanjiId, NormalizationTable } from '@wakai-core/core'
import type { ContentBundle, FusionIndexRecord, KanjiEntry } from './schema'

const DEFAULT_CONTENT_VERSION = '0.1.0'

const DEFAULT_NORMALIZATION_MAP: NormalizationTable = {
  'タ': '夕',
  'ト': '卜',
  'ハ': '八',
  'ム': '厶',
  'カ': '力',
  'ニ': '二',
  'エ': '工',
  'ロ': '口',
  '氵': '水',
  '忄': '心',
  '扌': '手',
  '亻': '人',
}

const createKanjiEntry = (
  kanji: KanjiId,
  components: ComponentId[],
  readings: string[],
  meanings: string[],
  jlpt: number,
  freq: number
): KanjiEntry => ({
  kanji,
  components,
  readings,
  meanings,
  jlpt,
  freq
})

const DEFAULT_KANJI: KanjiEntry[] = [
  createKanjiEntry('人', ['人'], ['じん', 'ひと'], ['person'], 5, 5),
  createKanjiEntry('木', ['木'], ['もく', 'き'], ['tree'], 5, 5),
  createKanjiEntry('水', ['水'], ['すい', 'みず'], ['water'], 5, 5),
  createKanjiEntry('火', ['火'], ['か', 'ひ'], ['fire'], 5, 5),
  createKanjiEntry('日', ['日'], ['にち', 'ひ'], ['sun'], 5, 5),
  createKanjiEntry('月', ['月'], ['げつ', 'つき'], ['moon'], 5, 5),
  createKanjiEntry('休', ['人', '木'], ['きゅう', 'やす'], ['rest'], 4, 4),
  createKanjiEntry('林', ['木', '木'], ['りん', 'はやし'], ['woods'], 4, 4),
  createKanjiEntry('明', ['日', '月'], ['めい', 'あか'], ['bright'], 3, 3),
  createKanjiEntry('炎', ['火', '火'], ['えん', 'ほのお'], ['blaze'], 3, 3)
]

const DEFAULT_FUSIONS: Array<{ components: ComponentId[]; output: KanjiId }> = [
  { components: ['人', '木'], output: '休' },
  { components: ['木', '木'], output: '林' },
  { components: ['日', '月'], output: '明' },
  { components: ['火', '火'], output: '炎' },
  { components: ['夕', '夕'], output: '多' },
  { components: ['卜', '夕'], output: '外' },
  { components: ['宀', '⺦', '⺕', '冖', '又'], output: '寝' },
]

const buildFusionIndex = (
  fusions: Array<{ components: ComponentId[]; output: KanjiId }>,
  normalizationMap: NormalizationTable
): FusionIndexRecord =>
  fusions.reduce<FusionIndexRecord>((acc, fusion) => {
    const signature = createSignature(fusion.components, normalizationMap)
    acc[signature] = fusion.output
    return acc
  }, {})

export const getDefaultContent = (): ContentBundle => ({
  contentVersion: DEFAULT_CONTENT_VERSION,
  kanji: DEFAULT_KANJI,
  fusionIndex: buildFusionIndex(DEFAULT_FUSIONS, DEFAULT_NORMALIZATION_MAP),
  normalizationMap: DEFAULT_NORMALIZATION_MAP
})

const KANA_TO_COMPONENT: Record<string, string> = {
  'タ': '夕',
  'ト': '卜',
  'ハ': '八',
  'ム': '厶',
  'カ': '力',
  'ニ': '二',
  'エ': '工',
  'ロ': '口',
  'ナ': 'ナ',
  'ヨ': 'ヨ',
  'ク': '久',
  'ノ': '丿',
  'マ': 'マ',
  'フ': 'フ',
  'ウ': '宀',
  'ラ': 'ラ',
  'リ': 'リ',
}

const RADICAL_VARIANT_TO_CANONICAL: Record<string, string> = {
  '氵': '水',
  '忄': '心',
  '扌': '手',
  '犭': '犬',
  '艹': '艸',
  '礻': '示',
  '衤': '衣',
  '亻': '人',
  '刂': '刀',
  '冫': '氷',
  '讠': '言',
  '饣': '食',
  '钅': '金',
  '纟': '糸',
  '⺡': '水',
  '⺢': '水',
  '⺨': '犬',
  '⺭': '示',
}

const NORMALIZATION_BLOCKLIST = new Set([
  '人',
  '月',
  '東',
  '柬',
  '黒',
  '黑',
  '鼠',
  '鼡',
  '匚',
  '刀',
  '四',
  '士',
  '王',
])

export function buildNormalizeMap(
  variantMappings: Map<string, string>
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [kana, component] of Object.entries(KANA_TO_COMPONENT)) {
    if (kana !== component) {
      result[kana] = component
    }
  }

  for (const [variant, canonical] of Object.entries(RADICAL_VARIANT_TO_CANONICAL)) {
    result[variant] = canonical
  }

  for (const [variant, original] of variantMappings) {
    if (
      variant !== original &&
      !result[variant] &&
      !NORMALIZATION_BLOCKLIST.has(variant) &&
      !hasCircularMapping(variant, original, result)
    ) {
      result[variant] = original
    }
  }

  return result
}

function hasCircularMapping(
  variant: string,
  original: string,
  existing: Record<string, string>
): boolean {
  return existing[original] === variant
}

export function normalizeComponent(
  component: string,
  normalizeMap: Record<string, string>
): string {
  return normalizeMap[component] ?? component
}

export { KANA_TO_COMPONENT, RADICAL_VARIANT_TO_CANONICAL }

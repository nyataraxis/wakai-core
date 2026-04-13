export interface ComponentNode {
  element: string
  position?: string
  radical?: string
  variant?: boolean
  original?: string
  children: ComponentNode[]
}

export interface KanjiDecomposition {
  kanji: string
  codepoint: string
  svgFile: string
  tree: ComponentNode
  leafComponents: string[]
}

export interface MergeRecipe {
  kanji: string
  components: string[]
  arity: number
  svgFile: string
  source: string
}

export interface PipelineOutput {
  contentVersion: string
  primitives: string[]
  normalizeMap: Record<string, string>
  mergeMaps: Record<number, Record<string, MergeRecipe>>
  fullContent: Record<string, KanjiRecord>
  debug: DebugInfo
}

export interface KanjiRecord {
  id: string
  components: string[]
  mergeComponents: string[]
  arity: number
  svgFile: string
  meta: {
    source: string
    warnings?: string[]
  }
}

export interface DebugInfo {
  contentVersion: string
  totalKanji: number
  totalPrimitives: number
  arityDistribution: Record<number, number>
  sourceByKanji: Record<string, string>
}

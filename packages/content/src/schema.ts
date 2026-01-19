export type ContentVersion = string

export interface ContentMeta {
  version: ContentVersion
  updatedAt: string
}

export interface ElementRecord {
  id: string
  name: string
  kana?: string
}

export interface FusionRuleRecord {
  inputA: string
  inputB: string
  output: string
}

export interface ContentBundle {
  meta: ContentMeta
  elements: ElementRecord[]
  rules: FusionRuleRecord[]
}

export type ElementId = string

export interface ElementDefinition {
  id: ElementId
  name: string
}

export interface FusionRule {
  inputA: ElementId
  inputB: ElementId
  output: ElementId
  signature: string
}

export interface EngineContent {
  elements: ElementDefinition[]
  rules: FusionRule[]
}

export interface ProgressModel {
  discovered: ElementId[]
  fusionCount: number
}

export interface FusionSuccess {
  success: true
  outputId: ElementId
  progress: ProgressModel
}

export interface FusionFailure {
  success: false
  progress: ProgressModel
}

export type FusionResult = FusionSuccess | FusionFailure

const SIGNATURE_SEPARATOR = '+'
const INITIAL_FUSION_COUNT = 0

export const createSignature = (a: ElementId, b: ElementId): string => {
  const [left, right] = normalizePair(a, b)
  return `${left}${SIGNATURE_SEPARATOR}${right}`
}

export const createProgress = (initialDiscovered: ElementId[] = []): ProgressModel => {
  return {
    discovered: [...initialDiscovered],
    fusionCount: INITIAL_FUSION_COUNT
  }
}

export const fuse = (
  content: EngineContent,
  inputA: ElementId,
  inputB: ElementId,
  progress: ProgressModel
): FusionResult => {
  const signature = createSignature(inputA, inputB)
  const rule = content.rules.find((item) => item.signature === signature)
  const nextFusionCount = progress.fusionCount + 1
  if (!rule) {
    return {
      success: false,
      progress: {
        discovered: [...progress.discovered],
        fusionCount: nextFusionCount
      }
    }
  }

  const nextDiscovered = addUnique(progress.discovered, rule.output)
  return {
    success: true,
    outputId: rule.output,
    progress: {
      discovered: nextDiscovered,
      fusionCount: nextFusionCount
    }
  }
}

const normalizePair = (a: ElementId, b: ElementId): [ElementId, ElementId] => {
  if (a <= b) {
    return [a, b]
  }
  return [b, a]
}

const addUnique = (items: ElementId[], value: ElementId): ElementId[] => {
  if (items.includes(value)) {
    return [...items]
  }
  return [...items, value]
}

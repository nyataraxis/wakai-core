export type ComponentPosition = 'left' | 'right'

export const NORMALIZE_MAP_V1: Record<string, string> = {
  氵: '水',
  忄: '心',
  扌: '手',
  犭: '犬',
  艹: '艸',
  礻: '示',
  衤: '衣',
  亻: '人',
  刂: '刀',
  冫: '氷',
  宀: '宀',
  讠: '言'
}

const AMBIGUOUS_RADICAL = '阝'
const LEFT_CANONICAL = '阜'
const RIGHT_CANONICAL = '邑'

export const normalizeComponent = (
  component: string,
  position?: ComponentPosition,
  warnings?: string[]
): string => {
  if (component === AMBIGUOUS_RADICAL) {
    if (position === 'left') {
      return LEFT_CANONICAL
    }
    if (position === 'right') {
      return RIGHT_CANONICAL
    }
    if (warnings) {
      warnings.push(component)
    }
    return component
  }
  return NORMALIZE_MAP_V1[component] ?? component
}

export const normalizeComponents = (
  components: string[],
  positions: Array<ComponentPosition | undefined>,
  warnings?: string[]
): string[] =>
  components.map((component, index) => normalizeComponent(component, positions[index], warnings))

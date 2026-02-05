import { XMLParser } from 'fast-xml-parser'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

export type ComponentPosition = 'left' | 'right'

export interface RawComponent {
  component: string
  position?: ComponentPosition
}

const KVG_ELEMENT_ATTR = '@_kvg:element'
const KVG_POSITION_ATTR = '@_kvg:position'
const SVG_EXT = '.svg'
const MIN_COMPONENTS_FOR_POSITION = 2
const CJK_SINGLE_CHAR = /^\p{sc=Han}$/u
const HEX_CODE_REGEX = /[0-9a-fA-F]{4,6}/

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  trimValues: true
})

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value]

const getAttr = (node: Record<string, unknown>, name: string): string | undefined => {
  const value = node[name]
  return typeof value === 'string' ? value : undefined
}

const getGroups = (node: Record<string, unknown>): Record<string, unknown>[] =>
  asArray(node.g as Record<string, unknown> | Record<string, unknown>[] | undefined)

const isSingleKanji = (value: string): boolean => CJK_SINGLE_CHAR.test(value)

const normalizePosition = (value?: string): ComponentPosition | undefined => {
  if (!value) {
    return undefined
  }
  const normalized = value.toLowerCase()
  if (normalized.includes('left')) {
    return 'left'
  }
  if (normalized.includes('right')) {
    return 'right'
  }
  return undefined
}

const findGroupByElement = (
  node: Record<string, unknown>,
  target: string
): Record<string, unknown> | null => {
  const element = getAttr(node, KVG_ELEMENT_ATTR)
  if (element === target) {
    return node
  }
  for (const group of getGroups(node)) {
    const found = findGroupByElement(group, target)
    if (found) {
      return found
    }
  }
  return null
}

const collectDirectComponents = (node: Record<string, unknown>): RawComponent[] => {
  const directGroups = getGroups(node)
  return directGroups
    .map((group) => {
      const element = getAttr(group, KVG_ELEMENT_ATTR)
      if (!element || !isSingleKanji(element)) {
        return null
      }
      return {
        component: element,
        position: normalizePosition(getAttr(group, KVG_POSITION_ATTR))
      }
    })
    .filter((entry): entry is RawComponent => Boolean(entry))
}

const collectFallbackComponents = (node: Record<string, unknown>): RawComponent[] => {
  const results: RawComponent[] = []
  const visit = (current: Record<string, unknown>): void => {
    for (const group of getGroups(current)) {
      const element = getAttr(group, KVG_ELEMENT_ATTR)
      if (element && isSingleKanji(element)) {
        results.push({
          component: element,
          position: normalizePosition(getAttr(group, KVG_POSITION_ATTR))
        })
        continue
      }
      visit(group)
    }
  }
  visit(node)
  return results
}

const applyOrderPositions = (components: RawComponent[]): RawComponent[] => {
  if (components.length < MIN_COMPONENTS_FOR_POSITION) {
    return components
  }
  if (components.some((entry) => entry.position)) {
    return components
  }
  const midpoint = components.length / MIN_COMPONENTS_FOR_POSITION
  return components.map((entry, index) => ({
    ...entry,
    position: index < midpoint ? 'left' : 'right'
  }))
}

const kanjiFromFilename = (filename: string): string | null => {
  const match = filename.match(HEX_CODE_REGEX)
  if (!match) {
    return null
  }
  const codePoint = Number.parseInt(match[0], 16)
  if (Number.isNaN(codePoint)) {
    return null
  }
  return String.fromCodePoint(codePoint)
}

export const parseKanjivgDir = async (
  directory: string
): Promise<Record<string, RawComponent[]>> => {
  const files = await readdir(directory)
  const result: Record<string, RawComponent[]> = {}
  for (const file of files) {
    if (!file.endsWith(SVG_EXT)) {
      continue
    }
    const kanji = kanjiFromFilename(file)
    if (!kanji) {
      continue
    }
    const fullPath = path.join(directory, file)
    const xml = await readFile(fullPath, 'utf8')
    const parsed = parser.parse(xml) as Record<string, unknown>
    const root = (parsed.svg ?? parsed) as Record<string, unknown>
    const group = findGroupByElement(root, kanji)
    if (!group) {
      continue
    }
    const direct = collectDirectComponents(group)
    const components = direct.length > 0 ? direct : collectFallbackComponents(group)
    result[kanji] = applyOrderPositions(components)
  }
  return result
}

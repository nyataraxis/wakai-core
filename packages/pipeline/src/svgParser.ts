import { XMLParser } from 'fast-xml-parser'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { ComponentNode, KanjiDecomposition } from './types.js'

const KVG_ELEMENT = '@_kvg:element'
const KVG_POSITION = '@_kvg:position'
const KVG_RADICAL = '@_kvg:radical'
const KVG_VARIANT = '@_kvg:variant'
const KVG_ORIGINAL = '@_kvg:original'
const KVG_ID = '@_id'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'g' || name === 'path',
  processEntities: false,
  ignoreDeclaration: true,
  ignorePiTags: true,
  removeNSPrefix: false,
})

function extractChildComponents(gNode: Record<string, unknown>): ComponentNode[] {
  const results: ComponentNode[] = []
  const childGroups = gNode['g'] as Record<string, unknown>[] | undefined

  if (!childGroups) return results

  for (const child of childGroups) {
    const element = child[KVG_ELEMENT] as string | undefined

    if (element) {
      results.push({
        element,
        position: child[KVG_POSITION] as string | undefined,
        radical: child[KVG_RADICAL] as string | undefined,
        variant: child[KVG_VARIANT] === 'true',
        original: child[KVG_ORIGINAL] as string | undefined,
        children: extractChildComponents(child),
      })
    } else {
      results.push(...extractChildComponents(child))
    }
  }

  return results
}

function extractComponentTree(gNode: Record<string, unknown>): ComponentNode | null {
  const element = gNode[KVG_ELEMENT] as string | undefined
  if (!element) return null

  return {
    element,
    position: gNode[KVG_POSITION] as string | undefined,
    radical: gNode[KVG_RADICAL] as string | undefined,
    variant: gNode[KVG_VARIANT] === 'true',
    original: gNode[KVG_ORIGINAL] as string | undefined,
    children: extractChildComponents(gNode),
  }
}

function findRootKanjiGroup(obj: unknown): Record<string, unknown> | null {
  if (typeof obj !== 'object' || obj === null) return null
  const record = obj as Record<string, unknown>

  if (record[KVG_ELEMENT] && typeof record[KVG_ID] === 'string') {
    const id = record[KVG_ID] as string
    if (id.startsWith('kvg:') && !id.includes('-') && !id.includes('StrokePaths')) {
      return record
    }
  }

  const children = record['g'] as Record<string, unknown>[] | undefined
  if (children) {
    for (const child of children) {
      const found = findRootKanjiGroup(child)
      if (found) return found
    }
  }

  return null
}

export function parseSvgFile(filePath: string): KanjiDecomposition | null {
  const content = fs.readFileSync(filePath, 'utf-8')
  const cleaned = content.replace(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/g, '')

  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(cleaned) as Record<string, unknown>
  } catch {
    return null
  }

  const svg = parsed['svg'] as Record<string, unknown> | undefined
  if (!svg) return null

  const rootGroup = findRootKanjiGroup(svg)
  if (!rootGroup) return null

  const tree = extractComponentTree(rootGroup)
  if (!tree) return null

  const basename = path.basename(filePath)
  const codepoint = basename.replace('.svg', '')

  return {
    kanji: tree.element,
    codepoint,
    svgFile: basename,
    tree,
    leafComponents: [],
  }
}

export function parseAllSvgs(kanjivgDir: string): Map<string, KanjiDecomposition> {
  const results = new Map<string, KanjiDecomposition>()
  const files = fs.readdirSync(kanjivgDir).filter((f) => f.endsWith('.svg'))

  let parsed = 0
  let skipped = 0

  for (const file of files) {
    const filePath = path.join(kanjivgDir, file)
    const decomposition = parseSvgFile(filePath)
    if (decomposition) {
      results.set(decomposition.kanji, decomposition)
      parsed++
    } else {
      skipped++
    }
  }

  console.log(`Parsed ${parsed} SVGs, skipped ${skipped}`)
  return results
}

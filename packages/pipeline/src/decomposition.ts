import type { ComponentNode, KanjiDecomposition } from './types.js'

export function collectDirectComponents(node: ComponentNode): string[] {
  if (node.children.length === 0) {
    return []
  }

  return node.children.map((child) => child.element)
}

export function collectVariantMappings(
  decompositions: Map<string, KanjiDecomposition>
): Map<string, string> {
  const variants = new Map<string, string>()

  for (const decomp of decompositions.values()) {
    walkTreeForVariants(decomp.tree, variants)
  }

  return variants
}

function walkTreeForVariants(
  node: ComponentNode,
  variants: Map<string, string>
): void {
  if (node.variant && node.original) {
    variants.set(node.element, node.original)
  }
  for (const child of node.children) {
    walkTreeForVariants(child, variants)
  }
}

export function identifyPrimitives(
  decompositions: Map<string, KanjiDecomposition>
): Set<string> {
  const primitives = new Set<string>()
  const appearsAsNonLeaf = new Set<string>()

  for (const decomp of decompositions.values()) {
    categorizeNode(decomp.tree, primitives, appearsAsNonLeaf)
  }

  for (const decomp of decompositions.values()) {
    if (decomp.tree.children.length === 0) {
      primitives.add(decomp.kanji)
    }
  }

  return primitives
}

function categorizeNode(
  node: ComponentNode,
  primitives: Set<string>,
  appearsAsNonLeaf: Set<string>
): void {
  if (node.children.length === 0) {
    if (!appearsAsNonLeaf.has(node.element)) {
      primitives.add(node.element)
    }
  } else {
    appearsAsNonLeaf.add(node.element)
    for (const child of node.children) {
      categorizeNode(child, primitives, appearsAsNonLeaf)
    }
  }
}

export function populateLeafComponents(
  decompositions: Map<string, KanjiDecomposition>
): void {
  for (const decomp of decompositions.values()) {
    decomp.leafComponents = collectDirectComponents(decomp.tree)
  }
}

export function getDirectChildren(node: ComponentNode): string[] {
  return node.children.map((child) => child.element)
}

export function collectAllElements(
  decompositions: Map<string, KanjiDecomposition>
): Set<string> {
  const elements = new Set<string>()

  for (const decomp of decompositions.values()) {
    elements.add(decomp.kanji)
    walkTreeForElements(decomp.tree, elements)
  }

  return elements
}

function walkTreeForElements(
  node: ComponentNode,
  elements: Set<string>
): void {
  elements.add(node.element)
  for (const child of node.children) {
    walkTreeForElements(child, elements)
  }
}

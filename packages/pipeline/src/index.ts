export { parseSvgFile, parseAllSvgs } from './svgParser.js'
export {
  collectDirectComponents,
  collectVariantMappings,
  identifyPrimitives,
  populateLeafComponents,
  getDirectChildren,
  collectAllElements,
} from './decomposition.js'
export { buildNormalizeMap, normalizeComponent } from './normalization.js'
export { buildMergeMaps, buildReverseLookup, computeMinimalMerge, createSignature, mergeMapToRecord } from './mergeMaps.js'
export { writeAllOutputs } from './outputWriter.js'
export { generatePuzzleLevels, parsePuzzleMaps, glyphDigest, serializePuzzleContent } from './puzzleGenerator.js'
export type { PuzzleMaps, PuzzleContent, ReviewedGlyph, ReviewedAnswer } from './puzzleGenerator.js'
export type {
  ComponentNode,
  KanjiDecomposition,
  MergeRecipe,
  PipelineOutput,
  KanjiRecord,
  DebugInfo,
} from './types.js'

export {
  createSignature,
  deserializePlayerState,
  fuse,
  serializePlayerState,
  type ComponentId,
  type ElementId,
  type FusionFailure,
  type FusionIndex,
  type FusionOptions,
  type FusionResult,
  type FusionSuccess,
  type KanjiId,
  type NormalizationTable,
  type PlayerState
} from './engine.js'
export {
  mergeAlchemy,
  getCraftableRecipes,
  reachableElements,
  readAlchemyProgress,
  serializeAlchemyProgress
} from './alchemy.js'
export type { AlchemyBundle, AlchemyElement, AlchemyRecipe, AlchemyResult } from './alchemy.js'
export { createAlchemyMode, type MergeArity } from './modes.js'
export {
  advanceAlchemyJourney,
  createAlchemyJourney,
  createAlchemyProgression,
  readAlchemyJourney,
  serializeAlchemyJourney,
  type AlchemyJourney,
  type AlchemyLevel,
  type AlchemyProgression,
  type AlchemyProgressionOptions
} from './progression.js'
export {
  clearSelection,
  createPuzzleState,
  submitSelection,
  toggleStroke,
  validatePuzzleLevel,
  type AnswerVariant,
  type PuzzleAnswer,
  type PuzzleGlyph,
  type PuzzleLevel,
  type PuzzleSelection,
  type PuzzleState,
  type PuzzleStroke,
  type PuzzleSubmission
} from './puzzle.js'

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

export interface PuzzleStroke {
  id: string
  path: string
}

export interface PuzzleGlyph {
  character: string
  viewBox: string
  strokes: PuzzleStroke[]
}

export interface AnswerVariant {
  sourceGlyph: number
  strokeIds: string[]
}

export interface PuzzleAnswer {
  character: string
  type: 'KANJI' | 'KANA'
  variants: AnswerVariant[]
  readings?: string[]
  meaning?: string
}

export interface PuzzleLevel {
  id: string
  title: string
  sourceGlyphs: PuzzleGlyph[]
  requiredAnswers: PuzzleAnswer[]
  bonusAnswers: PuzzleAnswer[]
}

export interface PuzzleSelection {
  sourceGlyph: number
  strokeIds: string[]
}

export interface PuzzleState {
  selection: PuzzleSelection | null
  foundRequired: string[]
  foundBonus: string[]
  status: 'UNSTARTED' | 'IN_PROGRESS' | 'COMPLETED'
}

export interface PuzzleSubmission {
  state: PuzzleState
  outcome: 'EMPTY' | 'WRONG' | 'ALREADY_FOUND' | 'CORRECT' | 'BONUS'
  answer?: PuzzleAnswer
}

const selectionSignature = ({ sourceGlyph, strokeIds }: PuzzleSelection): string =>
  JSON.stringify([sourceGlyph, [...strokeIds].sort()])

export const createPuzzleState = (): PuzzleState => ({
  selection: null,
  foundRequired: [],
  foundBonus: [],
  status: 'UNSTARTED'
})

export const toggleStroke = (
  level: PuzzleLevel,
  state: PuzzleState,
  sourceGlyph: number,
  strokeId: string
): PuzzleState => {
  if (
    !Number.isInteger(sourceGlyph) ||
    !level.sourceGlyphs[sourceGlyph]?.strokes.some((stroke) => stroke.id === strokeId)
  ) {
    throw new Error(`Unknown stroke ${strokeId} in source glyph ${sourceGlyph}`)
  }

  const previous = state.selection?.sourceGlyph === sourceGlyph ? state.selection.strokeIds : []
  const strokeIds = previous.includes(strokeId)
    ? previous.filter((id) => id !== strokeId)
    : [...previous, strokeId]

  return {
    ...state,
    selection: strokeIds.length ? { sourceGlyph, strokeIds } : null,
    status: state.status === 'UNSTARTED' ? 'IN_PROGRESS' : state.status
  }
}

export const clearSelection = (state: PuzzleState): PuzzleState => ({ ...state, selection: null })

export const submitSelection = (level: PuzzleLevel, state: PuzzleState): PuzzleSubmission => {
  if (!state.selection?.strokeIds.length) {
    return { state: clearSelection(state), outcome: 'EMPTY' }
  }

  const signature = selectionSignature(state.selection)
  const matches = (answer: PuzzleAnswer): boolean =>
    answer.variants.some((variant) => selectionSignature(variant) === signature)
  const requiredAnswer = level.requiredAnswers.find(matches)
  const answer = requiredAnswer ?? level.bonusAnswers.find(matches)
  const nextState: PuzzleState = {
    ...clearSelection(state),
    status: state.status === 'UNSTARTED' ? 'IN_PROGRESS' : state.status
  }

  if (!answer) {
    return { state: nextState, outcome: 'WRONG' }
  }
  if ([...state.foundRequired, ...state.foundBonus].includes(answer.character)) {
    return { state: nextState, outcome: 'ALREADY_FOUND', answer }
  }
  if (!requiredAnswer) {
    return {
      state: { ...nextState, foundBonus: [...state.foundBonus, answer.character] },
      outcome: 'BONUS',
      answer
    }
  }

  const foundRequired = [...state.foundRequired, answer.character]
  return {
    state: {
      ...nextState,
      foundRequired,
      status: level.requiredAnswers.every((required) => foundRequired.includes(required.character))
        ? 'COMPLETED'
        : 'IN_PROGRESS'
    },
    outcome: 'CORRECT',
    answer
  }
}

export const validatePuzzleLevel = (level: PuzzleLevel): void => {
  if (!level.id.trim() || !level.title.trim()) {
    throw new Error('Puzzle level needs an id and title')
  }
  if (!level.sourceGlyphs.length || !level.requiredAnswers.length) {
    throw new Error('Puzzle level needs source glyphs and required answers')
  }

  const glyphStrokeIds = level.sourceGlyphs.map((glyph) => {
    const viewBox = glyph.viewBox.trim().split(/[\s,]+/).map(Number)
    if (
      !glyph.character.trim() ||
      viewBox.length !== 4 ||
      !viewBox.every(Number.isFinite) ||
      viewBox[2] <= 0 ||
      viewBox[3] <= 0 ||
      !glyph.strokes.length
    ) {
      throw new Error(`Invalid source glyph geometry: ${glyph.character}`)
    }
    const ids = new Set<string>()
    for (const stroke of glyph.strokes) {
      if (!stroke.id.trim() || !stroke.path.trim() || ids.has(stroke.id)) {
        throw new Error(`Invalid or duplicate stroke in ${glyph.character}: ${stroke.id}`)
      }
      ids.add(stroke.id)
    }
    return ids
  })

  const characters = new Set<string>()
  const signatures = new Map<string, string>()
  for (const answer of [...level.requiredAnswers, ...level.bonusAnswers]) {
    if (
      !answer.character.trim() ||
      characters.has(answer.character) ||
      !['KANJI', 'KANA'].includes(answer.type) ||
      !answer.variants.length
    ) {
      throw new Error(`Invalid or duplicate puzzle answer: ${answer.character}`)
    }
    characters.add(answer.character)
    for (const variant of answer.variants) {
      const sourceIds = glyphStrokeIds[variant.sourceGlyph]
      if (
        !Number.isInteger(variant.sourceGlyph) ||
        !sourceIds ||
        !variant.strokeIds.length ||
        new Set(variant.strokeIds).size !== variant.strokeIds.length ||
        variant.strokeIds.some((id) => !sourceIds.has(id))
      ) {
        throw new Error(`Invalid stroke references for answer: ${answer.character}`)
      }
      const signature = selectionSignature(variant)
      if (signatures.has(signature)) {
        throw new Error(`Duplicate or ambiguous stroke selection for answer: ${answer.character}`)
      }
      signatures.set(signature, answer.character)
    }
  }

  level.sourceGlyphs.forEach((glyph, sourceGlyph) => {
    const signature = selectionSignature({ sourceGlyph, strokeIds: [...glyphStrokeIds[sourceGlyph]] })
    if (signatures.get(signature) !== glyph.character) {
      throw new Error(`Full source glyph must be an accepted answer: ${glyph.character}`)
    }
  })
}

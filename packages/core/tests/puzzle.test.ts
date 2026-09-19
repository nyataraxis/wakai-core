import { describe, expect, it } from 'vitest'
import {
  clearSelection,
  createPuzzleState,
  submitSelection,
  toggleStroke,
  validatePuzzleLevel,
  type PuzzleLevel,
  type PuzzleState
} from '../src'

const createLevel = (): PuzzleLevel => ({
  id: 'two-trees',
  title: 'Two trees',
  sourceGlyphs: [0, 1].map(() => ({
    character: '木',
    viewBox: '0 0 100 100',
    strokes: [
      { id: 'h', path: 'M20 35 L80 35' },
      { id: 'v', path: 'M50 10 L50 90' },
      { id: 'l', path: 'M50 35 L15 85' },
      { id: 'r', path: 'M50 35 L85 85' }
    ]
  })),
  requiredAnswers: [
    {
      character: '木',
      type: 'KANJI',
      variants: [0, 1].map((sourceGlyph) => ({ sourceGlyph, strokeIds: ['h', 'v', 'l', 'r'] }))
    },
    {
      character: '十',
      type: 'KANJI',
      variants: [0, 1].map((sourceGlyph) => ({ sourceGlyph, strokeIds: ['h', 'v'] }))
    }
  ],
  bonusAnswers: [
    { character: '一', type: 'KANJI', variants: [{ sourceGlyph: 0, strokeIds: ['h'] }] }
  ]
})

const select = (
  level: PuzzleLevel,
  state: PuzzleState,
  strokeIds: string[],
  sourceGlyph = 0
): PuzzleState => strokeIds.reduce((next, id) => toggleStroke(level, next, sourceGlyph, id), state)

describe('stroke subtraction puzzle', () => {
  it('starts on interaction, toggles strokes off, and switches to a single source', () => {
    const level = createLevel()
    const initial = createPuzzleState()
    const selected = toggleStroke(level, initial, 0, 'h')
    expect(selected.status).toBe('IN_PROGRESS')
    expect(initial.selection).toBeNull()
    expect(toggleStroke(level, selected, 0, 'h').selection).toBeNull()
    expect(toggleStroke(level, selected, 1, 'v').selection).toEqual({
      sourceGlyph: 1,
      strokeIds: ['v']
    })
    expect(clearSelection(selected).selection).toBeNull()
    expect(() => toggleStroke(level, initial, 2, 'h')).toThrow('Unknown stroke')
    expect(() => toggleStroke(level, initial, 0, 'missing')).toThrow('Unknown stroke')
  })

  it('requires the exact stroke set regardless of selection order', () => {
    const level = createLevel()
    const selected = select(level, createPuzzleState(), ['v', 'h'])
    const result = submitSelection(level, selected)
    expect(result.outcome).toBe('CORRECT')
    expect(result.answer?.character).toBe('十')
    expect(result.state.foundRequired).toEqual(['十'])
    expect(result.state.selection).toBeNull()
    expect(selected.selection?.strokeIds).toEqual(['v', 'h'])
    const wrong = submitSelection(level, select(level, result.state, ['h', 'v', 'l']))
    expect(wrong.outcome).toBe('WRONG')
    expect(wrong.state.foundRequired).toEqual(['十'])
    expect(wrong.state.selection).toBeNull()
  })

  it('counts variants across glyphs once and permits reusing strokes', () => {
    const level = createLevel()
    const first = submitSelection(level, select(level, createPuzzleState(), ['h', 'v']))
    const repeated = submitSelection(level, select(level, first.state, ['v', 'h'], 1))
    expect(repeated.outcome).toBe('ALREADY_FOUND')
    expect(repeated.state.selection).toBeNull()
    expect(repeated.state.foundRequired).toEqual(['十'])
    const fullSource = submitSelection(level, select(level, repeated.state, ['h', 'v', 'l', 'r']))
    expect(fullSource.state.foundRequired).toEqual(['十', '木'])
    expect(fullSource.state.status).toBe('COMPLETED')
  })

  it('keeps bonuses separate from completion and allows them after completion', () => {
    const level = createLevel()
    const bonus = submitSelection(level, select(level, createPuzzleState(), ['h']))
    expect(bonus.outcome).toBe('BONUS')
    expect(bonus.state.foundBonus).toEqual(['一'])
    expect(bonus.state.foundRequired).toEqual([])
    expect(bonus.state.status).toBe('IN_PROGRESS')
    const repeated = submitSelection(level, select(level, bonus.state, ['h']))
    expect(repeated.outcome).toBe('ALREADY_FOUND')
    const tree = submitSelection(level, select(level, createPuzzleState(), ['h', 'v', 'l', 'r']))
    const complete = submitSelection(level, select(level, tree.state, ['h', 'v']))
    expect(complete.state.status).toBe('COMPLETED')
    const lateBonus = submitSelection(level, select(level, complete.state, ['h']))
    expect(lateBonus.outcome).toBe('BONUS')
    expect(lateBonus.state.status).toBe('COMPLETED')
  })

  it('does not start or penalize an empty submission', () => {
    const initial = createPuzzleState()
    const result = submitSelection(createLevel(), initial)
    expect(result.outcome).toBe('EMPTY')
    expect(result.state).toEqual(initial)
  })
})

describe('puzzle level validation', () => {
  it('accepts distinct variants and glyph-local stroke identifiers', () => {
    expect(() => validatePuzzleLevel(createLevel())).not.toThrow()
  })

  it.each([
    ['missing glyph', (level: PuzzleLevel) => { level.requiredAnswers[0].variants[0].sourceGlyph = 4 }],
    ['fractional glyph', (level: PuzzleLevel) => { level.requiredAnswers[0].variants[0].sourceGlyph = 0.5 }],
    ['missing stroke', (level: PuzzleLevel) => { level.requiredAnswers[0].variants[0].strokeIds.push('missing') }],
    ['duplicate stroke', (level: PuzzleLevel) => { level.requiredAnswers[0].variants[0].strokeIds.push('h') }],
    ['empty variant', (level: PuzzleLevel) => { level.requiredAnswers[0].variants[0].strokeIds = [] }]
  ])('rejects %s references', (_name, mutate) => {
    const level = createLevel()
    mutate(level)
    expect(() => validatePuzzleLevel(level)).toThrow('Invalid stroke references')
  })

  it('rejects one stroke selection mapping to different characters', () => {
    const level = createLevel()
    level.bonusAnswers.push({
      character: 'ニ',
      type: 'KANA',
      variants: [{ sourceGlyph: 0, strokeIds: ['v', 'h'] }]
    })
    expect(() => validatePuzzleLevel(level)).toThrow('ambiguous stroke selection')
  })

  it('rejects duplicate answer identities across required and bonus sets', () => {
    const level = createLevel()
    level.bonusAnswers.push({ ...level.requiredAnswers[0] })
    expect(() => validatePuzzleLevel(level)).toThrow('duplicate puzzle answer')
  })

  it('requires each complete source glyph to be accepted', () => {
    const level = createLevel()
    level.requiredAnswers[0].variants.pop()
    expect(() => validatePuzzleLevel(level)).toThrow('Full source glyph')
  })

  it('rejects invalid rendering geometry and repeated source stroke IDs', () => {
    const level = createLevel()
    level.sourceGlyphs[0].viewBox = '0 0 0 100'
    expect(() => validatePuzzleLevel(level)).toThrow('Invalid source glyph geometry')
    level.sourceGlyphs[0].viewBox = '0 0 100 100'
    level.sourceGlyphs[0].strokes[0].path = ''
    expect(() => validatePuzzleLevel(level)).toThrow('Invalid or duplicate stroke')
    level.sourceGlyphs[0].strokes[0].path = 'M0 0 L1 1'
    level.sourceGlyphs[0].strokes[0].id = 'v'
    expect(() => validatePuzzleLevel(level)).toThrow('Invalid or duplicate stroke')
  })
})

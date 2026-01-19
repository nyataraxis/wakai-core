import { describe, expect, it } from 'vitest'
import {
  createProgress,
  createSignature,
  fuse,
  type EngineContent,
  type ElementDefinition,
  type FusionRule
} from '../src'

const ELEMENT_WATER = 'water'
const ELEMENT_FIRE = 'fire'
const ELEMENT_STEAM = 'steam'

const elements: ElementDefinition[] = [
  { id: ELEMENT_WATER, name: 'Water' },
  { id: ELEMENT_FIRE, name: 'Fire' },
  { id: ELEMENT_STEAM, name: 'Steam' }
]

const rules: FusionRule[] = [
  {
    inputA: ELEMENT_WATER,
    inputB: ELEMENT_FIRE,
    output: ELEMENT_STEAM,
    signature: createSignature(ELEMENT_WATER, ELEMENT_FIRE)
  }
]

const content: EngineContent = {
  elements,
  rules
}

describe('core engine', () => {
  it('creates deterministic signatures', () => {
    const signatureA = createSignature(ELEMENT_WATER, ELEMENT_FIRE)
    const signatureB = createSignature(ELEMENT_FIRE, ELEMENT_WATER)
    expect(signatureA).toBe(signatureB)
  })

  it('fuses elements and updates progress', () => {
    const progress = createProgress([ELEMENT_WATER, ELEMENT_FIRE])
    const result = fuse(content, ELEMENT_WATER, ELEMENT_FIRE, progress)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.outputId).toBe(ELEMENT_STEAM)
      expect(result.progress.discovered).toContain(ELEMENT_STEAM)
      expect(result.progress.fusionCount).toBe(1)
    }
  })
})

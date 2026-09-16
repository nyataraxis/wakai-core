import { describe, expect, it } from 'vitest'
import { createSignature, fuse, type FusionIndex, type NormalizationTable } from '../src'

const normalizationMap: NormalizationTable = {
  氵: '水'
}

describe('kanji alchemy core', () => {
  it('preserves multiplicity in signatures', () => {
    const signature = createSignature(['木', '木', '人'], {})
    expect(signature).toBe('人|木|木')
  })

  it('normalizes components before signatures', () => {
    const signature = createSignature(['氵', '木'], normalizationMap)
    expect(signature).toBe('木|水')
  })

  it('looks up fusion results by signature', () => {
    const signature = createSignature(['人', '木'], {})
    const fusionIndex: FusionIndex = new Map([[signature, '休']])
    const inventory = new Set(['人', '木'])
    const result = fuse({
      inventory,
      components: ['人', '木'],
      normalizationMap: {},
      fusionIndex
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toBe('休')
      expect(result.unlockDelta).toEqual(['休'])
    }
  })

  it('supports 3-element fusions', () => {
    const sig = createSignature(['木', '木', '木'], {})
    const fusionIndex: FusionIndex = new Map([[sig, '森']])
    const inventory = new Set(['木'])
    const result = fuse({
      inventory,
      components: ['木', '木', '木'],
      normalizationMap: {},
      fusionIndex
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toBe('森')
    }
  })

  it('supports 5-element fusions', () => {
    const components = ['宀', '⺦', '⺕', '冖', '又']
    const sig = createSignature(components, {})
    const fusionIndex: FusionIndex = new Map([[sig, '寝']])
    const inventory = new Set(components)
    const result = fuse({
      inventory,
      components,
      normalizationMap: {},
      fusionIndex
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toBe('寝')
    }
  })

  it('normalizes kana in multi-element fusions', () => {
    const kanaMap: NormalizationTable = { 'タ': '夕' }
    const sig = createSignature(['タ', 'タ'], kanaMap)
    expect(sig).toBe('夕|夕')

    const fusionIndex: FusionIndex = new Map([[sig, '多']])
    const result = fuse({
      inventory: new Set(['タ']),
      components: ['タ', 'タ'],
      normalizationMap: kanaMap,
      fusionIndex
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toBe('多')
    }
  })

  it('rejects fusions with fewer than 2 components', () => {
    const fusionIndex: FusionIndex = new Map()
    const result = fuse({
      inventory: new Set(['人']),
      components: ['人'],
      normalizationMap: {},
      fusionIndex
    })

    expect(result.success).toBe(false)
  })
})

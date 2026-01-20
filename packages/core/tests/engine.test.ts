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
})

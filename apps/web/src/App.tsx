import { useState } from 'react'
import { Card, PrimaryButton } from '@wakai-core/ui'
import {
  createSignature,
  fuse,
  type FusionIndex,
  type FusionResult,
  type NormalizationTable
} from '@wakai-core/core'
import styles from './App.module.css'

const ELEMENT_WATER = 'water'
const ELEMENT_FIRE = 'fire'
const ELEMENT_STEAM = 'steam'

const normalizationMap: NormalizationTable = {}
const signature = createSignature([ELEMENT_WATER, ELEMENT_FIRE], normalizationMap)
const fusionIndex: FusionIndex = new Map([[signature, ELEMENT_STEAM]])
const inventory = new Set([ELEMENT_WATER, ELEMENT_FIRE])

export const App = () => {
  const [result, setResult] = useState<FusionResult | null>(null)

  const handleFusion = () => {
    const next = fuse({
      inventory,
      components: [ELEMENT_WATER, ELEMENT_FIRE],
      normalizationMap,
      fusionIndex
    })
    setResult(next)
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Wakai Core</h1>
        <p className={styles.subtitle}>Offline-first fusion demo</p>
      </header>
      <Card title="Sample Fusion">
        <div className={styles.row}>
          <span className={styles.badge}>Water</span>
          <span className={styles.badge}>Fire</span>
          <span className={styles.badgeResult}>Steam</span>
        </div>
        <PrimaryButton label="Fuse Elements" onClick={handleFusion} />
        <div className={styles.result}>
          {result?.success
            ? `Result: ${result.output}`
            : result
              ? 'No rule found'
              : 'Tap to run a fusion'}
        </div>
      </Card>
    </main>
  )
}

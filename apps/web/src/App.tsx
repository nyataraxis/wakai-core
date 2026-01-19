import { useState } from 'react'
import { Card, PrimaryButton } from '@kanji-alchemy/ui'
import {
  createProgress,
  createSignature,
  fuse,
  type EngineContent,
  type FusionResult
} from '@kanji-alchemy/core'
import styles from './App.module.css'

const ELEMENT_WATER = 'water'
const ELEMENT_FIRE = 'fire'
const ELEMENT_STEAM = 'steam'

const content: EngineContent = {
  elements: [
    { id: ELEMENT_WATER, name: 'Water' },
    { id: ELEMENT_FIRE, name: 'Fire' },
    { id: ELEMENT_STEAM, name: 'Steam' }
  ],
  rules: [
    {
      inputA: ELEMENT_WATER,
      inputB: ELEMENT_FIRE,
      output: ELEMENT_STEAM,
      signature: createSignature(ELEMENT_WATER, ELEMENT_FIRE)
    }
  ]
}

const initialProgress = createProgress([ELEMENT_WATER, ELEMENT_FIRE])

export const App = () => {
  const [result, setResult] = useState<FusionResult | null>(null)

  const handleFusion = () => {
    const next = fuse(content, ELEMENT_WATER, ELEMENT_FIRE, initialProgress)
    setResult(next)
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Kanji Alchemy</h1>
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
            ? `Result: ${result.outputId}`
            : result
              ? 'No rule found'
              : 'Tap to run a fusion'}
        </div>
      </Card>
    </main>
  )
}

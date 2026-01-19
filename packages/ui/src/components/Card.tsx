import type { ReactNode } from 'react'
import styles from '../styles/Card.module.css'

export interface CardProps {
  title: string
  children: ReactNode
}

export const Card = ({ title, children }: CardProps) => {
  return (
    <section className={styles.root}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.content}>{children}</div>
    </section>
  )
}

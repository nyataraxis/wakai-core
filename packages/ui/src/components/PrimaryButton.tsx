import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from '../styles/PrimaryButton.module.css'

export interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: ReactNode
}

export const PrimaryButton = ({ label, ...props }: PrimaryButtonProps) => {
  return (
    <button className={styles.root} type="button" {...props}>
      {label}
    </button>
  )
}

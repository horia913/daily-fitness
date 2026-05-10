'use client'

import { Star } from 'lucide-react'
import styles from './gymConsoleV1.module.css'

export function PrBadge() {
  return (
    <span className={styles.prBadge}>
      <Star size={8} strokeWidth={2.5} aria-hidden />
      PR
    </span>
  )
}

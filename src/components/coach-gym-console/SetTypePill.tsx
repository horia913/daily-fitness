'use client'

import { cn } from '@/lib/utils'
import styles from './gymConsoleV1.module.css'

export function mapSetTypeToPill(setType: string): 'straight' | 'cluster' | 'drop' {
  const t = (setType || '').toLowerCase().replace(/\s+/g, '_')
  if (t.includes('cluster')) return 'cluster'
  if (t.includes('drop')) return 'drop'
  return 'straight'
}

export function SetTypePill({ setType }: { setType: string }) {
  const k = mapSetTypeToPill(setType)
  const label = k === 'cluster' ? 'Cluster' : k === 'drop' ? 'Drop' : 'Straight'
  return (
    <span
      className={cn(
        styles.pill,
        k === 'straight' && styles.pillStraight,
        k === 'cluster' && styles.pillCluster,
        k === 'drop' && styles.pillDrop,
      )}
    >
      {label}
    </span>
  )
}

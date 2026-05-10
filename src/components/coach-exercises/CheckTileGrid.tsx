'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './checkTileGrid.module.css'

export function CheckTileGrid({
  options,
  selected,
  onToggle,
  maxSelected,
  onMaxReached,
}: {
  options: string[]
  selected: string[]
  onToggle: (label: string, nextChecked: boolean) => void
  maxSelected?: number
  onMaxReached?: () => void
}) {
  return (
    <div className={styles.grid}>
      {options.map((label) => {
        const on = selected.includes(label)
        return (
          <button
            key={label}
            type="button"
            className={cn(styles.tile, on && styles.tileOn)}
            onClick={() => {
              if (!on && maxSelected != null && selected.length >= maxSelected) {
                onMaxReached?.()
                return
              }
              onToggle(label, !on)
            }}
          >
            <span className={cn(styles.cb, on && styles.cbOn)} aria-hidden>
              {on ? <Check size={10} strokeWidth={3} className={styles.cbIcon} /> : null}
            </span>
            <span className={styles.tileLabel}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

'use client'

import type { LucideIcon } from 'lucide-react'
import { Activity, Brain, Droplet, LayoutGrid, Moon, Utensils } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './habitLibraryModalV1.module.css'

export type ChipFilterId =
  | 'all'
  | 'hydration'
  | 'nutrition'
  | 'movement'
  | 'sleep_recovery'
  | 'mindfulness'

const CHIP_DEFS: {
  id: ChipFilterId
  label: string
  Icon: LucideIcon
  active: 'cyan' | 'good' | 'lime' | 'purple' | 'rose'
}[] = [
  { id: 'all', label: 'All', Icon: LayoutGrid, active: 'cyan' },
  { id: 'hydration', label: 'Hydration', Icon: Droplet, active: 'cyan' },
  { id: 'nutrition', label: 'Nutrition', Icon: Utensils, active: 'good' },
  { id: 'movement', label: 'Movement', Icon: Activity, active: 'lime' },
  { id: 'sleep_recovery', label: 'Sleep & recovery', Icon: Moon, active: 'purple' },
  { id: 'mindfulness', label: 'Mindfulness', Icon: Brain, active: 'rose' },
]

const activeClass: Record<(typeof CHIP_DEFS)[number]['active'], string> = {
  cyan: styles.chipActiveCyan,
  good: styles.chipActiveGood,
  lime: styles.chipActiveLime,
  purple: styles.chipActivePurple,
  rose: styles.chipActiveRose,
}

export function CategoryChips({
  active,
  onChange,
  counts,
}: {
  active: ChipFilterId
  onChange: (id: ChipFilterId) => void
  counts: Record<ChipFilterId, number>
}) {
  return (
    <div className={styles.chipRow}>
      {CHIP_DEFS.map(({ id, label, Icon, active: tone }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(styles.chip, isActive && styles.chipActive, isActive && activeClass[tone])}
          >
            <Icon className={styles.chipIcon} aria-hidden strokeWidth={2} />
            {label}
            <span className={styles.chipCount}>{counts[id]}</span>
          </button>
        )
      })}
    </div>
  )
}

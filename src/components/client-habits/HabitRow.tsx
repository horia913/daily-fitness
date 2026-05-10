'use client'

import { Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HabitTemplateRow } from '@/lib/habitTemplateService'
import { HabitLucideIcon } from '@/components/client/habitLucideIcon'
import { HabitTagPill } from './HabitTagPill'
import { rowTintClass } from './habitRowTints'
import styles from './habitLibraryModalV1.module.css'

export function HabitRow({
  template,
  manualLike,
  autoTracked,
  isAdded,
  disabled,
  onPress,
}: {
  template: HabitTemplateRow
  manualLike: boolean
  autoTracked: boolean
  isAdded: boolean
  disabled?: boolean
  onPress: () => void
}) {
  const tint = rowTintClass(template, manualLike)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      className={cn(styles.row, isAdded ? styles.rowAdded : styles.rowDefault)}
    >
      <div className={cn(styles.rowIcon, tint)}>
        <HabitLucideIcon name={template.icon} className="h-[15px] w-[15px]" />
      </div>
      <div className={styles.rowMeta}>
        <div className={styles.nameRow}>
          <span className={styles.rowName}>{template.name}</span>
          <HabitTagPill mode={autoTracked ? 'auto' : 'manual'} />
        </div>
        {template.description ? (
          <p className={styles.rowDesc}>{template.description}</p>
        ) : null}
      </div>
      {isAdded ? (
        <span className={styles.addedMark} aria-hidden>
          <Check size={13} strokeWidth={2.5} />
        </span>
      ) : (
        <span className={styles.addBtn} aria-hidden>
          <Plus size={13} strokeWidth={2} />
        </span>
      )}
    </button>
  )
}

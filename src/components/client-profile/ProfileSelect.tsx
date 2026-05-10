import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import styles from './clientProfileV1.module.css'

export function ProfileSelect({
  value,
  onChange,
  disabled,
  children,
  ariaLabel,
  dirty,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  children: ReactNode
  ariaLabel: string
  dirty?: boolean
}) {
  return (
    <select
      aria-label={ariaLabel}
      className={cn(styles.select, dirty && styles.selectDirty)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  )
}

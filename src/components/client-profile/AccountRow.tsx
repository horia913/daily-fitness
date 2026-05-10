import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import styles from './clientProfileV1.module.css'

export function AccountRow({
  variant,
  icon,
  label,
  onClick,
}: {
  variant: 'neutral' | 'danger'
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        styles.accountRow,
        variant === 'neutral' && styles.accountRowNeutral,
        variant === 'danger' && styles.accountRowDanger
      )}
      onClick={onClick}
    >
      <span className={styles.accountIcon}>{icon}</span>
      <span className={styles.accountLabel}>{label}</span>
      <ChevronRight className={styles.hubChevron} aria-hidden />
    </button>
  )
}

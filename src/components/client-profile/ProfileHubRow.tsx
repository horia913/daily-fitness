import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import styles from './clientProfileV1.module.css'

export type HubCountVariant = 'warn' | 'good' | 'muted'

export function ProfileHubRow({
  icon,
  iconClassName,
  title,
  subtitle,
  countLabel,
  countVariant,
  onClick,
}: {
  icon: ReactNode
  iconClassName: string
  title: string
  subtitle: string
  countLabel?: string
  countVariant?: HubCountVariant
  onClick: () => void
}) {
  const pillClass =
    countVariant === 'warn'
      ? styles.countPillWarn
      : countVariant === 'good'
        ? styles.countPillGood
        : countVariant === 'muted'
          ? styles.countPillMuted
          : ''

  return (
    <button type="button" className={styles.hubRow} onClick={onClick}>
      <div className={cn(styles.hubIcon, iconClassName)}>{icon}</div>
      <div className={styles.hubMeta}>
        <div className={styles.hubName}>{title}</div>
        <div className={styles.hubSub}>{subtitle}</div>
      </div>
      {countLabel && countVariant ? (
        <span className={cn(styles.countPill, pillClass)}>{countLabel}</span>
      ) : null}
      <ChevronRight className={styles.hubChevron} aria-hidden />
    </button>
  )
}

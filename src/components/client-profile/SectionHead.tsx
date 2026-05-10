import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import styles from './clientProfileV1.module.css'

export type SectionIconTone = 'cyan' | 'purple' | 'warn' | 'rose' | 'lime'

const toneClass: Record<SectionIconTone, string> = {
  cyan: styles.sectionIconCyan,
  purple: styles.sectionIconPurple,
  warn: styles.sectionIconWarn,
  rose: styles.sectionIconRose,
  lime: styles.sectionIconLime,
}

export function SectionHead({
  icon,
  title,
  description,
  tone,
}: {
  icon: ReactNode
  title: string
  description?: ReactNode
  tone: SectionIconTone
}) {
  return (
    <div className={styles.sectionHead}>
      <div className={cn(styles.sectionIcon, toneClass[tone])}>{icon}</div>
      <div className={styles.sectionMeta}>
        <div className={styles.sectionTitle}>{title}</div>
        {description ? <div className={styles.sectionDesc}>{description}</div> : null}
      </div>
    </div>
  )
}

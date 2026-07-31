'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { MessageCircle, X } from 'lucide-react'
import styles from './gymConsoleV1.module.css'

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase()
  return (p[0]![0] + p[p.length - 1]![0]).toUpperCase()
}

function avatarGradient(clientId: string): string {
  let h = 0
  for (let i = 0; i < clientId.length; i++) h = (h + clientId.charCodeAt(i) * 17) % 360
  const h2 = (h + 48) % 360
  return `linear-gradient(135deg, hsl(${h} 72% 38%), hsl(${h2} 58% 24%))`
}

export function SessionHead({
  clientId,
  clientName,
  workoutSubtitle,
  onRemove,
}: {
  clientId: string
  clientName: string
  workoutSubtitle: string
  onRemove: () => void
}) {
  const remove = () => {
    if (!window.confirm(`Remove ${clientName} from this session console?`)) return
    onRemove()
  }

  return (
    <div className={styles.headRow}>
      <div className={styles.avatarWrap}>
        <div className={styles.avatar} style={{ background: avatarGradient(clientId) }}>
          {initials(clientName)}
        </div>
      </div>
      <div className={styles.meta}>
        <div className={styles.clientName}>{clientName}</div>
        <div className={styles.workoutLabel}>{workoutSubtitle}</div>
      </div>
      <Link
        href={`/coach/clients/${clientId}`}
        className={cn(styles.iconBtn)}
        aria-label="Open client hub"
        title="Client hub"
      >
        <MessageCircle size={14} strokeWidth={2} aria-hidden />
      </Link>
      <button type="button" className={cn(styles.iconBtn, styles.iconBtnDanger)} onClick={remove} aria-label="Remove from console">
        <X size={14} strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}

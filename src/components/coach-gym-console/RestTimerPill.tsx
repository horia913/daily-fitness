'use client'

import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './gymConsoleV1.module.css'

function formatPrescribed(sec: number): string {
  const n = Math.round(sec)
  if (n < 60) return `${n}s rest`
  const m = Math.floor(n / 60)
  const s = n % 60
  if (s === 0) return `${m}:00 rest`
  return `${m}:${String(s).padStart(2, '0')} rest`
}

function formatCountdown(endMs: number, nowMs: number): string {
  const s = Math.max(0, Math.ceil((endMs - nowMs) / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export function RestTimerPill({
  prescribedSec,
  endMs,
  nowMs,
  onDismiss,
}: {
  prescribedSec: number
  endMs: number | null
  nowMs: number
  onDismiss: () => void
}) {
  const counting = endMs != null && nowMs < endMs
  const label = counting ? formatCountdown(endMs!, nowMs) : formatPrescribed(prescribedSec)
  return (
    <button
      type="button"
      className={cn(styles.restPill, counting && styles.restPillActive)}
      onClick={onDismiss}
      title="Tap to dismiss rest timer"
    >
      <Clock size={9} strokeWidth={2} aria-hidden />
      {label}
    </button>
  )
}

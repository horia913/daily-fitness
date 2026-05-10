'use client'

import type { ReactNode } from 'react'
import hub from './coachAnalyticsHub.module.css'

const STRIPE: Record<'critical' | 'purple' | 'rose', string> = {
  critical: 'linear-gradient(90deg, var(--critical), transparent)',
  purple: 'linear-gradient(90deg, var(--purple), transparent)',
  rose: 'linear-gradient(90deg, var(--rose), transparent)',
}

const PILL: Record<'critical' | 'purple' | 'default', { bg: string; fg: string; bd: string }> = {
  critical: {
    bg: 'var(--critical-soft)',
    fg: 'var(--critical)',
    bd: 'rgba(255,90,95,0.3)',
  },
  purple: {
    bg: 'var(--purple-soft)',
    fg: 'var(--purple)',
    bd: 'rgba(167,139,250,0.3)',
  },
  default: {
    bg: 'rgba(255,255,255,0.04)',
    fg: 'var(--t3)',
    bd: 'var(--line)',
  },
}

export function QueueCard({
  variant,
  icon,
  title,
  count,
  countTone = variant === 'critical' ? 'critical' : variant === 'purple' ? 'purple' : 'default',
  children,
}: {
  variant: 'critical' | 'purple' | 'rose'
  icon: ReactNode
  title: string
  count: number
  countTone?: 'critical' | 'purple' | 'default'
  children: ReactNode
}) {
  const pill = PILL[countTone]
  return (
    <div
      className="relative flex flex-col gap-2.5 overflow-hidden rounded-[18px] border p-3.5"
      style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
    >
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 h-0.5"
        style={{ background: STRIPE[variant] }}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex size-6 shrink-0 items-center justify-center rounded-lg"
            style={{
              background:
                variant === 'critical'
                  ? 'var(--critical-soft)'
                  : variant === 'purple'
                    ? 'var(--purple-soft)'
                    : 'var(--rose-soft)',
            }}
          >
            {icon}
          </div>
          <h3 className={hub.sectionTitle} style={{ fontSize: 14 }}>
            {title}
          </h3>
        </div>
        <span
          className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
          style={{
            background: pill.bg,
            color: pill.fg,
            borderColor: pill.bd,
            fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
          }}
        >
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

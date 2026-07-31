'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const BADGE: Record<
  'cyan' | 'action' | 'purple' | 'warn' | 'good' | 'crit',
  { bg: string; fg: string }
> = {
  cyan: { bg: 'var(--fc-accent-dim)', fg: 'var(--fc-accent)' },
  action: { bg: 'var(--fc-accent-dim)', fg: 'var(--fc-accent)' },
  purple: { bg: 'var(--purple-soft)', fg: 'var(--purple)' },
  warn: { bg: 'var(--warning-soft)', fg: 'var(--warning)' },
  good: { bg: 'var(--good-soft)', fg: 'var(--good)' },
  crit: { bg: 'var(--critical-soft)', fg: 'var(--critical)' },
}

export function StatTile({
  icon: Icon,
  variant,
  value,
  unitSuffix,
  label,
  delta,
  deltaTone,
  valueColor = 'var(--t1)',
}: {
  icon: LucideIcon
  variant: keyof typeof BADGE
  value: ReactNode
  unitSuffix?: string
  label: string
  delta: string
  deltaTone: 'up' | 'down' | 'neutral'
  valueColor?: string
}) {
  const b = BADGE[variant]
  const deltaColor =
    deltaTone === 'up' ? 'var(--good)' : deltaTone === 'down' ? 'var(--critical)' : 'var(--t3)'

  return (
    <div
      className="flex flex-col gap-0.5 rounded-xl border p-2.5"
      style={{
        background: 'var(--card-2)',
        borderColor: 'var(--line-2)',
      }}
    >
      <div
        className="flex size-[18px] shrink-0 items-center justify-center rounded-md"
        style={{ background: b.bg, color: b.fg }}
      >
        <Icon className="size-3" strokeWidth={2} aria-hidden />
      </div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-0.5 min-w-0">
        <span
          className={cn('text-[22px] leading-none font-bold')}
          style={{
            fontFamily: 'var(--f-display, var(--f-display), sans-serif)',
            color: valueColor,
          }}
        >
          {value}
        </span>
        {unitSuffix ? (
          <span className="text-[13px] ml-0.5" style={{ color: 'var(--t3)' }}>
            {unitSuffix}
          </span>
        ) : null}
      </div>
      <div
        className="mt-1.5 uppercase"
        style={{
          fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
          fontSize: '8.5px',
          letterSpacing: '0.1em',
          color: 'var(--t3)',
        }}
      >
        {label}
      </div>
      <div
        className="mt-0.5 text-[9px] leading-tight"
        style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)', color: deltaColor }}
      >
        {delta}
      </div>
    </div>
  )
}

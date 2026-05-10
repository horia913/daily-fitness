'use client'

import type { LucideIcon } from 'lucide-react'

function pctColor(pct: number | null, na: boolean): string {
  if (na || pct === null) return 'var(--t4)'
  if (pct <= 0) return 'var(--critical)'
  if (pct < 50) return 'var(--critical)'
  if (pct < 75) return 'var(--warning)'
  return 'var(--good)'
}

function barColor(pct: number | null, na: boolean, domain: string): string {
  if (na || pct === null) return 'rgba(255,255,255,0.06)'
  return domain
}

export function ClientMetricStrip({
  cells,
}: {
  cells: Array<{
    icon: LucideIcon
    abbrev: string
    domainColor: string
    valueLabel: string
    pct: number | null
    na: boolean
  }>
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {cells.map((c, i) => {
        const Icon = c.icon
        const w = c.na ? 6 : Math.max(6, Math.min(100, c.pct ?? 0))
        return (
          <div
            key={i}
            className="flex flex-col gap-1 rounded-lg border px-1.5 py-2"
            style={{ background: 'var(--card-2)', borderColor: 'var(--line-2)' }}
          >
            <div className="flex items-center gap-1">
              <Icon className="size-[9px] shrink-0" style={{ color: c.domainColor }} aria-hidden />
              <span
                className="truncate text-[8.5px] font-medium uppercase tracking-wide"
                style={{
                  fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
                  color: c.domainColor,
                }}
              >
                {c.abbrev}
              </span>
            </div>
            <div
              className="text-base font-bold leading-none"
              style={{
                fontFamily: 'var(--f-display, "Big Shoulders Display", sans-serif)',
                color: pctColor(c.pct, c.na),
              }}
            >
              {c.valueLabel}
            </div>
            <div className="h-0.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${w}%`,
                  background: barColor(c.pct, c.na, c.domainColor),
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

'use client'

import type { LucideIcon } from 'lucide-react'

export function ClientCountStrip({
  cells,
}: {
  cells: Array<{
    icon: LucideIcon
    abbrev: string
    domainColor: string
    value: number | string
    sub: string
  }>
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {cells.map((c, i) => {
        const Icon = c.icon
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
                color: 'var(--t1)',
              }}
            >
              {c.value}
            </div>
            <span
              className="text-[8.5px] uppercase tracking-wide"
              style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)', color: 'var(--t4)' }}
            >
              {c.sub}
            </span>
          </div>
        )
      })}
    </div>
  )
}

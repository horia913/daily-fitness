'use client'

import type { ComponentType, SVGProps } from 'react'

export function BreakdownRow({
  icon: Icon,
  iconBg,
  iconFg,
  name,
  valueDisplay,
  valueColor,
  barColor,
  fillPercent,
  subMeta,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  iconBg: string
  iconFg: string
  name: string
  valueDisplay: string
  valueColor: string
  barColor: string
  fillPercent: number
  subMeta?: string
}) {
  const w = Math.max(6, Math.min(100, fillPercent))

  return (
    <div>
      <div
        className="flex items-center gap-2.5 rounded-[11px] border p-2.5"
        style={{ background: 'var(--card-2)', borderColor: 'var(--line-2)' }}
      >
        <div
          className="flex size-[26px] shrink-0 items-center justify-center rounded-lg"
          style={{ background: iconBg, color: iconFg }}
        >
          <Icon className="size-3.5" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className="truncate text-[12.5px] font-medium"
              style={{ color: 'var(--t1)' }}
            >
              {name}
            </span>
            <span
              className="shrink-0 text-[14px] font-bold leading-none"
              style={{
                fontFamily: 'var(--f-display, var(--f-display), sans-serif)',
                color: valueColor,
              }}
            >
              {valueDisplay}
            </span>
          </div>
          <div
            className="mt-2 h-1 w-full overflow-hidden rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div className="h-full rounded-full" style={{ width: `${w}%`, background: barColor }} />
          </div>
          {subMeta ? (
            <div
              className="mt-1.5 text-[9px] leading-snug"
              style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)', color: 'var(--t4)' }}
            >
              {subMeta}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

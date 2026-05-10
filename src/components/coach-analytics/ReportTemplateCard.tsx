'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Accent = 'cyan' | 'purple' | 'lime' | 'good'

const ACCENT: Record<Accent, { iconBg: string; iconFg: string }> = {
  cyan: { iconBg: 'var(--cyan-soft)', iconFg: 'var(--cyan)' },
  purple: { iconBg: 'var(--purple-soft)', iconFg: 'var(--purple)' },
  lime: { iconBg: 'var(--lime-soft)', iconFg: 'var(--lime)' },
  good: { iconBg: 'var(--good-soft)', iconFg: 'var(--good)' },
}

export function ReportTemplateCard({
  name,
  description,
  meta,
  icon: Icon,
  accent,
  selected,
  popular,
  onClick,
}: {
  name: string
  description: string
  meta: string
  icon: LucideIcon
  accent: Accent
  selected: boolean
  popular?: boolean
  onClick: () => void
}) {
  const a = ACCENT[accent]
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-full cursor-pointer rounded-[11px] border p-3 text-left transition-all duration-150',
        selected
          ? 'border-[color:var(--cyan)] bg-[rgba(79,227,232,0.04)] shadow-[0_0_0_1px_var(--cyan-dim)]'
          : 'border-[color:var(--line-2)] bg-[color:var(--card-2)] hover:border-[color:var(--line)] hover:bg-[rgba(255,255,255,0.03)]',
      )}
    >
      <div className="mb-1.5 flex items-start gap-2">
        <div
          className="flex size-6 shrink-0 items-center justify-center rounded-[7px]"
          style={{ background: a.iconBg, color: a.iconFg }}
        >
          <Icon className="size-3.5" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11.5px] font-semibold leading-tight" style={{ color: 'var(--t1)' }}>
              {name}
            </span>
            {popular ? (
              <span
                className="rounded border px-1 py-px font-semibold uppercase"
                style={{
                  fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
                  fontSize: '8px',
                  letterSpacing: '0.08em',
                  background: 'var(--lime-soft)',
                  color: 'var(--lime)',
                  borderColor: 'rgba(197,255,74,0.3)',
                }}
              >
                Popular
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <p className="text-[10.5px] leading-snug" style={{ color: 'var(--t3)' }}>
        {description}
      </p>
      <p
        className="mt-0.5 text-[9px]"
        style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)', color: 'var(--t4)' }}
      >
        {meta}
      </p>
    </button>
  )
}

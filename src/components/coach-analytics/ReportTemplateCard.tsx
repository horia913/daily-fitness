'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Accent = 'cyan' | 'purple' | 'action' | 'good' | 'gold'

const ACCENT: Record<Accent, { iconBg: string; iconFg: string }> = {
  cyan: { iconBg: 'var(--fc-accent-dim)', iconFg: 'var(--fc-accent)' },
  purple: { iconBg: 'var(--purple-soft)', iconFg: 'var(--purple)' },
  action: {
    iconBg: 'color-mix(in srgb, var(--fc-group-c) 20%, transparent)',
    iconFg: 'var(--fc-group-c)',
  },
  good: { iconBg: 'var(--good-soft)', iconFg: 'var(--good)' },
  gold: {
    iconBg: 'var(--fc-accent-gold-soft)',
    iconFg: 'var(--fc-accent-gold)',
  },
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
        'relative w-full cursor-pointer rounded-[11px] border p-[13px] text-left transition-all duration-150',
        selected
          ? 'border-[color:var(--fc-accent)] bg-[color:var(--fc-accent-dim)] shadow-[0_4px_22px_-10px_var(--fc-accent-glow)]'
          : 'border-[color:var(--line)] bg-transparent hover:border-[color:var(--line-2)] hover:bg-[rgba(255,255,255,0.03)]',
      )}
    >
      {popular ? (
        <span
          className="absolute right-[11px] top-[11px] rounded px-1.5 py-[3px] font-bold uppercase"
          style={{
            fontFamily: 'var(--f-mono, ui-monospace, monospace)',
            fontSize: '7.5px',
            letterSpacing: '0.1em',
            color: 'var(--fc-accent-gold)',
            background: 'color-mix(in srgb, var(--fc-accent-gold) 16%, transparent)',
          }}
        >
          Popular
        </span>
      ) : null}
      <div
        className="mb-[9px] flex size-6 items-center justify-center rounded-[7px]"
        style={{ background: a.iconBg, color: a.iconFg }}
      >
        <Icon className="size-3.5" strokeWidth={2} aria-hidden />
      </div>
      <div className="text-[12.5px] font-bold leading-tight" style={{ color: 'var(--t1)' }}>
        {name}
      </div>
      <p className="mt-[5px] text-[10.5px] leading-snug" style={{ color: 'var(--t3)' }}>
        {description}
      </p>
      <p
        className="mt-2 uppercase"
        style={{
          fontFamily: 'var(--f-mono, ui-monospace, monospace)',
          fontSize: '9px',
          letterSpacing: '0.06em',
          color: 'var(--t4)',
        }}
      >
        {meta}
      </p>
    </button>
  )
}

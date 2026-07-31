'use client'

import { cn } from '@/lib/utils'

const OPTIONS: { id: 'month' | 'quarter' | 'year' | 'custom'; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
  { id: 'custom', label: 'Custom' },
]

export function DateRangeSeg({
  value,
  onChange,
}: {
  value: 'month' | 'quarter' | 'year' | 'custom'
  onChange: (v: 'month' | 'quarter' | 'year' | 'custom') => void
}) {
  return (
    <div
      className="grid grid-cols-4 gap-1.5 rounded-[11px] border p-[5px]"
      style={{ background: 'var(--card-2)', borderColor: 'var(--line)' }}
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'rounded-lg border-none px-2 py-[9px] text-center font-bold uppercase transition-colors',
              active ? undefined : 'bg-transparent',
            )}
            style={{
              fontFamily: 'var(--f-mono, ui-monospace, monospace)',
              fontSize: '11px',
              letterSpacing: '0.06em',
              background: active ? 'var(--fc-accent)' : 'transparent',
              color: active ? '#fff' : 'var(--t2)',
              boxShadow: active ? '0 3px 14px -5px var(--fc-accent-glow)' : 'none',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

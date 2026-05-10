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
      className="flex gap-0.5 rounded-[11px] border p-0.5"
      style={{ background: 'var(--card-2)', borderColor: 'var(--line-2)' }}
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'flex-1 rounded-lg border-none px-2 py-1.5 text-[11.5px] font-medium transition-colors',
              active ? 'shadow-[inset_0_0_0_1px_var(--cyan-dim)]' : 'bg-transparent',
            )}
            style={{
              background: active ? 'var(--cyan-soft)' : 'transparent',
              color: active ? 'var(--cyan)' : 'var(--t3)',
              fontFamily: 'var(--font-geist-sans, Geist, sans-serif)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

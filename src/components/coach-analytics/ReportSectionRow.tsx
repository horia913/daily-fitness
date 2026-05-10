'use client'

import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ReportSectionRow({
  name,
  description,
  icon: Icon,
  checked,
  required,
  onToggle,
  onRequiredClick,
}: {
  name: string
  description: string
  icon: LucideIcon
  checked: boolean
  required: boolean
  onToggle: () => void
  onRequiredClick: () => void
}) {
  const showRequiredStyle = required && checked

  const row = (
    <div
      role={required ? undefined : 'button'}
      tabIndex={required ? -1 : 0}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-[11px] border px-3 py-2.5 transition-colors',
        showRequiredStyle
          ? 'border-[rgba(52,211,153,0.18)] bg-[rgba(52,211,153,0.04)]'
          : 'border-[color:var(--line-2)] bg-[color:var(--card-2)] hover:bg-[rgba(255,255,255,0.03)]',
      )}
      onClick={() => {
        if (required) onRequiredClick()
        else onToggle()
      }}
      onKeyDown={(e) => {
        if (required) return
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onToggle()
        }
      }}
    >
      <div
        className="flex size-6 shrink-0 items-center justify-center rounded-[7px]"
        style={
          showRequiredStyle
            ? { background: 'var(--good-soft)', color: 'var(--good)' }
            : { background: 'rgba(255,255,255,0.04)', color: 'var(--t3)' }
        }
      >
        <Icon className="size-3" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--t1)' }}>
            {name}
          </span>
          {required ? (
            <span
              className="rounded border px-1 py-px font-semibold uppercase"
              style={{
                fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
                fontSize: '7.5px',
                letterSpacing: '0.1em',
                background: 'var(--good-soft)',
                color: 'var(--good)',
                borderColor: 'rgba(52,211,153,0.2)',
              }}
            >
              Required
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[10.5px] leading-snug" style={{ color: 'var(--t3)' }}>
          {description}
        </p>
      </div>
      <button
        type="button"
        title={required ? 'Required for this template' : undefined}
        className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors"
        style={
          required
            ? {
                background: 'var(--good)',
                borderColor: 'var(--good)',
                color: '#0a1a18',
              }
            : checked
              ? {
                  background: 'var(--cyan)',
                  borderColor: 'var(--cyan)',
                  color: '#0a1a26',
                }
              : {
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'var(--line)',
                }
        }
        onClick={(e) => {
          e.stopPropagation()
          if (required) {
            onRequiredClick()
            return
          }
          onToggle()
        }}
      >
        {(checked || required) && (
          <Check className="size-2.5" strokeWidth={3} aria-hidden />
        )}
      </button>
    </div>
  )

  return row
}

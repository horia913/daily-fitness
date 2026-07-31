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
  const showSelectedStyle = !required && checked

  return (
    <div
      role={required ? undefined : 'button'}
      tabIndex={required ? -1 : 0}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2.5 transition-colors',
        showRequiredStyle
          ? 'border-[color-mix(in_srgb,var(--fc-status-success)_38%,transparent)] bg-[color-mix(in_srgb,var(--fc-status-success)_7%,transparent)]'
          : showSelectedStyle
            ? 'border-[color-mix(in_srgb,var(--fc-accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--fc-accent)_7%,transparent)]'
            : 'border-[color:var(--line)] bg-transparent hover:bg-[rgba(255,255,255,0.03)]',
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
            : showSelectedStyle
              ? { background: 'var(--fc-accent-dim)', color: 'var(--fc-accent)' }
              : { background: 'rgba(255,255,255,0.06)', color: 'var(--t2)' }
        }
      >
        <Icon className="size-3" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className="truncate text-xs font-semibold"
            style={{ color: 'var(--t1)' }}
          >
            {name}
          </span>
          {required ? (
            <span
              className="shrink-0 rounded px-[5px] py-0.5 font-bold uppercase"
              style={{
                fontFamily: 'var(--f-mono, ui-monospace, monospace)',
                fontSize: '7.5px',
                letterSpacing: '0.1em',
                background: 'color-mix(in srgb, var(--fc-status-success) 18%, transparent)',
                color: 'var(--fc-status-success)',
              }}
            >
              Required
            </span>
          ) : null}
        </div>
        <p
          className="mt-0.5 truncate text-[10px] leading-snug"
          style={{ color: 'var(--t3)' }}
        >
          {description}
        </p>
      </div>
      <button
        type="button"
        title={required ? 'Required for this template' : undefined}
        className="flex size-[19px] shrink-0 items-center justify-center rounded-[6px] border transition-colors"
        style={
          required
            ? {
                background: 'var(--fc-status-success)',
                borderColor: 'var(--fc-status-success)',
                color: '#08120A',
              }
            : checked
              ? {
                  background: 'var(--fc-accent)',
                  borderColor: 'var(--fc-accent)',
                  color: '#fff',
                }
              : {
                  background: 'transparent',
                  borderColor: 'var(--line-2)',
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
}

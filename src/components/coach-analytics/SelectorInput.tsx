'use client'

import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export function SelectorInput({
  label,
  filled,
  onClick,
  left,
}: {
  label: string
  filled: boolean
  onClick: () => void
  left?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-[11px] border px-3 py-2.5 text-left text-[12.5px] transition-colors hover:bg-white/[0.02]"
      style={{
        background: 'var(--card-2)',
        borderColor: 'var(--line)',
        color: filled ? 'var(--t1)' : 'var(--t2)',
      }}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {left}
        <span className={`min-w-0 truncate ${!filled ? 'italic' : ''}`} style={{ color: filled ? 'var(--t1)' : 'var(--t4)' }}>
          {label}
        </span>
      </span>
      <ChevronDown className="size-3 shrink-0 opacity-70" style={{ color: 'var(--t3)' }} aria-hidden />
    </button>
  )
}

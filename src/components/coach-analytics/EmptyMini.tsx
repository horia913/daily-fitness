'use client'

import type { LucideIcon } from 'lucide-react'

export function EmptyMini({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-[11px] border border-dashed px-3.5 py-6 text-center"
      style={{
        background: 'rgba(255,255,255,0.02)',
        borderColor: 'var(--line-2)',
      }}
    >
      <div
        className="flex size-8 items-center justify-center rounded-[10px]"
        style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--t3)' }}
      >
        <Icon className="size-[14px]" strokeWidth={2} aria-hidden />
      </div>
      <p className="max-w-[220px] text-[11px] leading-snug" style={{ color: 'var(--t3)' }}>
        {text}
      </p>
    </div>
  )
}

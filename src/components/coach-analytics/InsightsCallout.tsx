'use client'

import { AlertTriangle } from 'lucide-react'

export function InsightsCallout({ items }: { items: string[] }) {
  if (!items.length) return null

  return (
    <div
      className="rounded-[11px] border p-2.5 pl-3"
      style={{
        borderColor: 'rgba(255,90,95,0.2)',
        borderLeftWidth: 3,
        borderLeftColor: 'var(--critical)',
        background: 'linear-gradient(90deg, var(--critical-soft), transparent 80%)',
      }}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <AlertTriangle className="size-[11px] shrink-0" style={{ color: 'var(--critical)' }} aria-hidden />
        <span
          className="text-[9.5px] font-semibold uppercase tracking-[0.12em]"
          style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)', color: 'var(--critical)' }}
        >
          Insights
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-[11px] leading-snug" style={{ color: 'var(--t1)' }}>
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--critical)]" aria-hidden />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

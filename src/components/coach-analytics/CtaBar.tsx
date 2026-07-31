'use client'

import Link from 'next/link'
import { ChevronRight, TrendingUp } from 'lucide-react'

export function CtaBar({
  title,
  subtitle,
  href,
  linkLabel,
}: {
  title: string
  subtitle: string
  href: string
  linkLabel: string
}) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-[14px] border p-3"
      style={{
        borderColor: 'var(--fc-accent-glow)',
        background: 'linear-gradient(90deg, var(--fc-accent-dim), transparent)',
      }}
    >
      <div
        className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px]"
        style={{ background: 'var(--fc-accent-dim)', color: 'var(--fc-accent)' }}
      >
        <TrendingUp className="size-[13px]" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold leading-tight" style={{ color: 'var(--t1)' }}>
          {title}
        </p>
        <p className="mt-px text-[10.5px] leading-snug" style={{ color: 'var(--t3)' }}>
          {subtitle}
        </p>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-medium"
        style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)', color: 'var(--fc-accent)' }}
      >
        {linkLabel}
        <ChevronRight className="size-2.5" aria-hidden />
      </Link>
    </div>
  )
}

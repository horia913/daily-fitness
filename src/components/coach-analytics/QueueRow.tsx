'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

function avatarGradient(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const hue = h % 360
  const hue2 = (hue + 40) % 360
  return `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${hue2} 50% 28%))`
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function isLikelyAvatarUrl(value: string | null | undefined): boolean {
  if (!value) return false
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.includes('/storage/v1/object/public/avatars/')
  )
}

export type QueueStripe = 'critical' | 'purple' | 'rose' | 'none'

const STRIPE_COLOR: Record<Exclude<QueueStripe, 'none'>, string> = {
  critical: 'var(--critical)',
  purple: 'var(--purple)',
  rose: 'var(--rose)',
}

export function QueueRow({
  href,
  name,
  avatarUrl,
  seed,
  statLine,
  statLineColor,
  rightSlot,
  stripe,
}: {
  href: string
  name: string
  avatarUrl: string | null
  seed: string
  statLine: string
  statLineColor: string
  rightSlot: ReactNode
  stripe: QueueStripe
}) {
  const showImg = avatarUrl && isLikelyAvatarUrl(avatarUrl)
  const borderLeft = stripe !== 'none' ? `2px solid ${STRIPE_COLOR[stripe]}` : undefined

  return (
    <Link
      href={href}
      className="flex cursor-pointer items-center gap-2 rounded-[10px] border px-2.5 py-2 transition-colors hover:bg-white/[0.03]"
      style={{
        background: 'var(--card-2)',
        borderColor: 'var(--line-2)',
        borderLeft,
      }}
    >
      {showImg ? (
        <img src={avatarUrl!} alt="" className="size-[26px] shrink-0 rounded-lg object-cover" />
      ) : (
        <div
          className="flex size-[26px] shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
          style={{
            fontFamily: 'var(--f-headline, "Bricolage Grotesque", sans-serif)',
            background: avatarGradient(seed),
          }}
        >
          {initials(name)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium" style={{ color: 'var(--t1)' }}>
          {name}
        </div>
        <div
          className="mt-0.5 truncate text-[9.5px] leading-tight"
          style={{
            fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
            color: statLineColor,
          }}
        >
          {statLine}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {rightSlot}
        <ChevronRight className="size-[11px] shrink-0" style={{ color: 'var(--t4)' }} aria-hidden />
      </div>
    </Link>
  )
}

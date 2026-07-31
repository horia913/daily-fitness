'use client'

import type { ReactNode } from 'react'
import hub from './coachAnalyticsHub.module.css'
import { cn } from '@/lib/utils'

export type AnalyticsHeroAccent = 'cyan' | 'warning' | 'purple' | 'good'

const ACCENT: Record<
  AnalyticsHeroAccent,
  { eyebrow: string; glow: string; pulseShadow: string }
> = {
  cyan: {
    eyebrow: 'var(--fc-accent)',
    glow: 'var(--fc-accent-dim)',
    pulseShadow: '0 0 6px var(--fc-accent)',
  },
  warning: {
    eyebrow: 'var(--warning)',
    glow: 'var(--warning-soft)',
    pulseShadow: '0 0 6px var(--warning)',
  },
  purple: {
    eyebrow: 'var(--purple)',
    glow: 'var(--purple-soft)',
    pulseShadow: '0 0 6px var(--purple)',
  },
  good: {
    eyebrow: 'var(--good)',
    glow: 'var(--good-soft)',
    pulseShadow: '0 0 6px var(--good)',
  },
}

export type HeroStat = {
  num: ReactNode
  label: string
  color?: string
}

export function AnalyticsHero({
  accent,
  eyebrow,
  title,
  subtitle,
  controls,
  stats,
  heroBackground = 'default',
}: {
  accent: AnalyticsHeroAccent
  eyebrow: string
  title: string
  subtitle: string
  controls?: ReactNode
  stats?: HeroStat[]
  heroBackground?: 'default' | 'goodTint'
}) {
  const a = ACCENT[accent]
  const showStats = Boolean(stats && stats.length > 0)

  return (
    <div className={cn(hub.hero, heroBackground === 'goodTint' ? hub.heroGoodTint : undefined)}>
      <div
        className={hub.heroGlow}
        style={{
          background: `radial-gradient(circle, ${a.glow}, transparent 70%)`,
        }}
      />
      <div className={hub.heroInner}>
        <div className={hub.eyebrowRow} style={{ color: a.eyebrow }}>
          <span
            className={hub.eyebrowPulse}
            style={{
              background: a.eyebrow,
              boxShadow: a.pulseShadow,
            }}
          />
          {eyebrow}
        </div>
        <h1 className={hub.heroTitle}>{title}</h1>
        <p className={hub.heroSubtitle}>{subtitle}</p>

        {controls ? <div className={cn(hub.controlsRow, 'flex-wrap')}>{controls}</div> : null}

        {showStats ? (
          <div
            className={hub.statStrip}
            style={{
              gridTemplateColumns: `repeat(${Math.min(Math.max(stats!.length, 1), 6)}, 1fr)`,
            }}
          >
            {stats!.map((s, i) => (
              <div key={i}>
                <div className={hub.statNum} style={{ color: s.color ?? 'var(--t1)' }}>
                  {s.num}
                </div>
                <div className={hub.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

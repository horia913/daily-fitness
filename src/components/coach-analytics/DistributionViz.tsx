'use client'

import { Target } from 'lucide-react'
import hub from './coachAnalyticsHub.module.css'

const TIERS = [
  { key: 'excellent', label: 'Excellent', range: '90%+', colorVar: 'var(--good)' },
  { key: 'good', label: 'Good', range: '75–89%', colorVar: 'var(--cyan)' },
  { key: 'fair', label: 'Fair', range: '60–74%', colorVar: 'var(--warning)' },
  { key: 'poor', label: 'Poor', range: '50–59%', colorVar: '#F59E42' },
  { key: 'critical', label: 'Critical', range: '<50%', colorVar: 'var(--critical)' },
] as const

export function DistributionViz({
  totalClients,
  distribution,
}: {
  totalClients: number
  distribution: Record<(typeof TIERS)[number]['key'], number>
}) {
  const counts = TIERS.map((t) => distribution[t.key] ?? 0)
  const sum = counts.reduce((a, b) => a + b, 0) || 1
  const segs = TIERS.map((t, i) => ({
    ...t,
    count: counts[i],
    pct: (counts[i] / sum) * 100,
  }))

  return (
    <div className={hub.sectionCard}>
      <div className={hub.sectionHead}>
        <div className={hub.sectionHeadLeft}>
          <Target className="size-3 shrink-0" style={{ color: 'var(--purple)' }} aria-hidden />
          <span className={hub.sectionTitle}>Distribution</span>
        </div>
        <span className={hub.sectionMeta}>{totalClients} clients</span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {segs.map((s) =>
          s.pct > 0 ? (
            <div
              key={s.key}
              className="h-full"
              style={{ width: `${s.pct}%`, background: s.colorVar }}
            />
          ) : null
        )}
      </div>
      <div className="mt-3 space-y-2">
        {segs.map((s) => {
          const dim = s.count === 0
          return (
            <div
              key={s.key}
              className="flex items-center gap-2.5"
              style={{ opacity: dim ? 0.5 : 1 }}
            >
              <div className="size-2 shrink-0 rounded-full" style={{ background: s.colorVar }} />
              <span className="flex-1 text-[11.5px] font-medium" style={{ color: 'var(--t1)' }}>
                {s.label}
              </span>
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[9.5px] uppercase tracking-wide"
                style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)', color: 'var(--t4)' }}
              >
                {s.range}
              </span>
              <span
                className="w-8 shrink-0 text-right text-[14px] font-bold leading-none"
                style={{
                  fontFamily: 'var(--f-display, "Big Shoulders Display", sans-serif)',
                  color:
                    s.count > 0
                      ? s.key === 'critical'
                        ? 'var(--critical)'
                        : 'var(--t1)'
                      : 'var(--t3)',
                }}
              >
                {s.count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

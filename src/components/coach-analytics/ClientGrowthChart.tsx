'use client'

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import hub from './coachAnalyticsHub.module.css'

export type GrowthPoint = { label: string; count: number }

export function ClientGrowthChart({
  series,
  growthNet,
  showEmpty,
}: {
  series: GrowthPoint[]
  growthNet: number
  showEmpty: boolean
}) {
  const positive = growthNet >= 0

  if (showEmpty) {
    return (
      <div className={hub.sectionCard}>
        <div className={hub.sectionHead}>
          <div className={hub.sectionHeadLeft}>
            <TrendingUp className="size-3 shrink-0" style={{ color: 'var(--cyan)' }} aria-hidden />
            <span className={hub.sectionTitle}>Client growth</span>
          </div>
          <span className={hub.sectionMeta}>90d</span>
        </div>
        <div
          className="relative flex h-[140px] flex-col items-center justify-center gap-2 rounded-[11px] border border-dashed p-2.5"
          style={{ background: 'var(--card-2)', borderColor: 'var(--line-2)' }}
        >
          <TrendingUp className="size-6 opacity-30" style={{ color: 'var(--t4)' }} aria-hidden />
          <p className="max-w-[240px] text-center text-[11px] leading-snug" style={{ color: 'var(--t3)' }}>
            Not enough data yet · Growth shows after 14 days
          </p>
        </div>
      </div>
    )
  }

  const n = series.length

  return (
    <div className={hub.sectionCard}>
      <div className={hub.sectionHead}>
        <div className={hub.sectionHeadLeft}>
          <TrendingUp className="size-3 shrink-0" style={{ color: 'var(--cyan)' }} aria-hidden />
          <span className={hub.sectionTitle}>Client growth</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-md border px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide"
            style={{
              fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
              background: positive ? 'var(--good-soft)' : 'var(--critical-soft)',
              color: positive ? 'var(--good)' : 'var(--critical)',
              borderColor: positive ? 'rgba(52,211,153,0.25)' : 'rgba(255,90,95,0.25)',
            }}
          >
            {positive ? `+${growthNet} this quarter` : `−${Math.abs(growthNet)}`}
          </span>
          <span className={hub.sectionMeta}>90d</span>
        </div>
      </div>
      <div
        className="relative h-[140px] rounded-[11px] border p-2.5"
        style={{ background: 'var(--card-2)', borderColor: 'var(--line-2)' }}
      >
        {/* Decorative horizontal guides (25 / 50 / 75% of plot height) */}
        <div className="pointer-events-none absolute inset-2.5 z-0 flex flex-col justify-between py-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-full border-t border-dashed"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}
            />
          ))}
        </div>
        <div className="relative z-[1] h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 2 }}>
              <defs>
                <linearGradient id="cgFillCoach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4FE3E8" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#4FE3E8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" hide />
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#4FE3E8"
                strokeWidth={2}
                fill="url(#cgFillCoach)"
                isAnimationActive={false}
                dot={(props: { cx?: number; cy?: number; index?: number }) => {
                  const { cx, cy, index } = props
                  if (index !== n - 1 || cx == null || cy == null) {
                    return <g />
                  }
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={6} fill="rgba(79,227,232,0.2)" />
                      <circle cx={cx} cy={cy} r={3.5} fill="#4FE3E8" />
                    </g>
                  )
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div
          className="pointer-events-none absolute bottom-2 left-2.5 right-2.5 z-[2] flex justify-between text-[9px]"
          style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)', color: 'var(--t4)' }}
        >
          <span>90d ago</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  )
}

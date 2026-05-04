'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import chartStyles from '@/components/coach/AdherenceTrendChart.module.css'

export interface HistoricalTrendDataPoint {
  week_start: string
  workout: number
  checkins: number
  nutrition: number | null
  habits: number | null
}

interface AdherenceTrendChartProps {
  clientId: string
  clientName: string
  trendData: HistoricalTrendDataPoint[]
  variant?: 'default' | 'coachV6'
}

function buildLinePathWithGaps(
  data: HistoricalTrendDataPoint[],
  key: 'nutrition' | 'habits',
  xForIndex: (index: number) => number,
  yForPct: (pct: number) => number
): string {
  let d = ''
  let penUp = true
  for (let i = 0; i < data.length; i++) {
    const raw = data[i][key]
    if (raw == null) {
      penUp = true
      continue
    }
    const pct = raw
    const x = xForIndex(i)
    const y = yForPct(pct)
    if (penUp) {
      d += `${d ? ' ' : ''}M ${x} ${y}`
      penUp = false
    } else {
      d += ` L ${x} ${y}`
    }
  }
  return d
}

function AdherenceTrendChartCoachV6({ data }: { data: HistoricalTrendDataPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const vbW = 360
  const vbH = 110
  const padL = 2
  const padR = 2
  const padT = 4
  const padB = 2
  const innerW = vbW - padL - padR
  const innerH = vbH - padT - padB

  const xForIndex = (index: number) =>
    padL + (index * innerW) / Math.max(1, data.length - 1)
  const yForPct = (pct: number) =>
    padT + ((100 - Math.max(0, Math.min(100, pct))) / 100) * innerH

  const linePath = (key: 'workout' | 'checkins') =>
    data
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xForIndex(index)} ${yForPct(point[key] ?? 0)}`)
      .join(' ')

  const nutritionPath = buildLinePathWithGaps(data, 'nutrition', xForIndex, yForPct)
  const habitsPath = buildLinePathWithGaps(data, 'habits', xForIndex, yForPct)

  const formatWeek = (weekStart: string) =>
    new Date(weekStart + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })

  const n = data.length
  const axisIdx = useMemo(() => {
    if (n <= 1) return [0]
    return [0, Math.round((n - 1) * 0.33), Math.round((n - 1) * 0.66), n - 1].filter(
      (v, i, a) => a.indexOf(v) === i
    )
  }, [n])

  const hoverPoint = hoveredIndex == null ? null : data[hoveredIndex]

  return (
    <div className={chartStyles.v6Outer}>
      <div className={chartStyles.v6Legend}>
        <span className={chartStyles.v6LegendItem}>
          <span className={chartStyles.v6LegendSwatch} style={{ background: '#60A5FA' }} />
          Workouts
        </span>
        <span className={chartStyles.v6LegendItem}>
          <span className={chartStyles.v6SwDash} />
          Check-ins
        </span>
        <span className={chartStyles.v6LegendItem}>
          <span
            className={chartStyles.v6LegendSwatch}
            style={{ background: 'var(--fc-effort-easy)' }}
          />
          Nutrition
        </span>
        <span className={chartStyles.v6LegendItem}>
          <span
            className={chartStyles.v6LegendSwatch}
            style={{ background: 'var(--fc-accent-lime-2)' }}
          />
          Habits
        </span>
      </div>

      <div className={chartStyles.v6Wrap}>
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          role="img"
          aria-label="Adherence trend last weeks"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {[25, 50, 100].map((tick) => {
            const y = yForPct(tick)
            return (
              <line
                key={tick}
                x1={padL}
                y1={y}
                x2={vbW - padR}
                y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            )
          })}

          <path
            d={linePath('workout')}
            fill="none"
            stroke="#60A5FA"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={linePath('checkins')}
            fill="none"
            stroke="var(--fc-set-type-straight)"
            strokeWidth={2}
            strokeDasharray="3 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {nutritionPath ? (
            <path
              d={nutritionPath}
              fill="none"
              stroke="var(--fc-effort-easy)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {habitsPath ? (
            <path
              d={habitsPath}
              fill="none"
              stroke="var(--fc-accent-lime-2)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {data.map((point, index) => {
            const x = xForIndex(index)
            const yW = yForPct(point.workout)
            const isHovered = hoveredIndex === index
            const band = Math.max(14, innerW / Math.max(data.length, 6) / 2)
            return (
              <g key={`v6-${point.week_start}`}>
                {isHovered ? (
                  <line
                    x1={x}
                    y1={padT}
                    x2={x}
                    y2={vbH - padB}
                    stroke="rgba(56,189,248,0.25)"
                    strokeWidth={1}
                  />
                ) : null}
                <circle cx={x} cy={yW} r={isHovered ? 3.2 : 2.5} fill="#60A5FA" />
                <rect
                  x={x - band}
                  y={padT}
                  width={band * 2}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(index)}
                />
              </g>
            )
          })}
        </svg>

        {hoverPoint && hoveredIndex != null ? (
          <div className={chartStyles.v6Tooltip}>
            <div style={{ marginBottom: 4, color: 'var(--fc-text-primary)' }}>
              Week of {formatWeek(hoverPoint.week_start)}
            </div>
            <div style={{ color: '#60A5FA' }}>Workouts: {hoverPoint.workout}%</div>
            <div style={{ color: 'var(--fc-set-type-straight)' }}>
              Check-ins: {hoverPoint.checkins}%
            </div>
            {hoverPoint.nutrition != null ? (
              <div style={{ color: 'var(--fc-effort-easy)' }}>Nutrition: {hoverPoint.nutrition}%</div>
            ) : (
              <div style={{ color: 'var(--fc-text-quaternary)' }}>Nutrition: —</div>
            )}
            {hoverPoint.habits != null ? (
              <div style={{ color: 'var(--fc-accent-lime-2)' }}>Habits: {hoverPoint.habits}%</div>
            ) : (
              <div style={{ color: 'var(--fc-text-quaternary)' }}>Habits: —</div>
            )}
          </div>
        ) : null}
      </div>

      <div className={chartStyles.v6Axis}>
        {axisIdx.map((i) => (
          <span key={i}>{formatWeek(data[i]!.week_start)}</span>
        ))}
      </div>
    </div>
  )
}

function AdherenceTrendChartDefault({
  clientId: _clientId,
  clientName: _clientName,
  trendData,
}: Omit<AdherenceTrendChartProps, 'variant'>) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const data = trendData ?? []

  const summary = useMemo(() => {
    if (data.length === 0)
      return {
        workoutsAvg: 0,
        checkinsAvg: 0,
        nutritionAvg: null as number | null,
        habitsAvg: null as number | null,
      }
    const workoutsAvg = Math.round(data.reduce((s, d) => s + (d.workout ?? 0), 0) / data.length)
    const checkinsAvg = Math.round(data.reduce((s, d) => s + (d.checkins ?? 0), 0) / data.length)
    const nutVals = data.map((d) => d.nutrition).filter((v): v is number => v != null)
    const nutritionAvg =
      nutVals.length > 0 ? Math.round(nutVals.reduce((s, v) => s + v, 0) / nutVals.length) : null
    const habitVals = data.map((d) => d.habits).filter((v): v is number => v != null)
    const habitsAvg =
      habitVals.length > 0 ? Math.round(habitVals.reduce((s, v) => s + v, 0) / habitVals.length) : null
    return { workoutsAvg, checkinsAvg, nutritionAvg, habitsAvg }
  }, [data])

  const summarySentence = useMemo(() => {
    const parts: string[] = [
      `workouts ${summary.workoutsAvg}% avg`,
      `check-ins ${summary.checkinsAvg}% avg`,
    ]
    if (summary.nutritionAvg != null) {
      parts.push(`nutrition ${summary.nutritionAvg}% avg (weeks on plan)`)
    }
    if (summary.habitsAvg != null) {
      parts.push(`habits ${summary.habitsAvg}% avg (weeks tracked)`)
    }
    return parts.join(', ')
  }, [summary])

  const width = Math.max(640, data.length * 86)
  const height = 260
  const padLeft = 34
  const padRight = 18
  const padTop = 20
  const padBottom = 42
  const innerWidth = width - padLeft - padRight
  const innerHeight = height - padTop - padBottom

  const xForIndex = (index: number) => padLeft + (index * innerWidth) / Math.max(1, data.length - 1)
  const yForPct = (pct: number) => padTop + ((100 - Math.max(0, Math.min(100, pct))) / 100) * innerHeight

  const linePath = (key: 'workout' | 'checkins') =>
    data
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xForIndex(index)} ${yForPct(point[key] ?? 0)}`)
      .join(' ')

  const nutritionPath = buildLinePathWithGaps(data, 'nutrition', xForIndex, yForPct)
  const habitsPath = buildLinePathWithGaps(data, 'habits', xForIndex, yForPct)

  const formatWeek = (weekStart: string) =>
    new Date(weekStart + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })

  const hoverPoint = hoveredIndex == null ? null : data[hoveredIndex]

  return (
    <Card className="fc-card-shell rounded-2xl border border-[color:var(--fc-glass-border)]">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col gap-2">
          <h4 className="font-semibold text-[color:var(--fc-text-primary)] text-base sm:text-lg">
            Adherence Trend (last {data.length} weeks)
          </h4>
          <p className="text-sm text-[color:var(--fc-text-dim)]">
            Last {data.length} weeks: {summarySentence}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-[color:var(--fc-text-primary)]">
            <span className="inline-block w-6 h-[3px] rounded bg-blue-500" />
            Workouts
          </div>
          <div className="flex items-center gap-2 text-[color:var(--fc-text-primary)]">
            <span className="inline-block w-6 h-[3px] rounded bg-teal-400 border border-teal-300" />
            Check-ins
          </div>
          <div className="flex items-center gap-2 text-[color:var(--fc-text-primary)]">
            <span className="inline-block w-6 h-[3px] rounded bg-lime-500" />
            Nutrition
          </div>
          <div className="flex items-center gap-2 text-[color:var(--fc-text-primary)]">
            <span className="inline-block w-6 h-[3px] rounded bg-violet-400" />
            Habits
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <svg width={width} height={height} className="min-w-full">
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = yForPct(tick)
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="rgba(148,163,184,0.22)"
                    strokeWidth={1}
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="rgba(148,163,184,0.9)"
                  >
                    {tick}
                  </text>
                </g>
              )
            })}

            <path d={linePath('workout')} fill="none" stroke="#3b82f6" strokeWidth={3} strokeLinecap="round" />
            <path
              d={linePath('checkins')}
              fill="none"
              stroke="#2dd4bf"
              strokeDasharray="6 4"
              strokeWidth={3}
              strokeLinecap="round"
            />
            {nutritionPath ? (
              <path
                d={nutritionPath}
                fill="none"
                stroke="#84cc16"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {habitsPath ? (
              <path
                d={habitsPath}
                fill="none"
                stroke="#a78bfa"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {data.map((point, index) => {
              const x = xForIndex(index)
              const yW = yForPct(point.workout)
              const yC = yForPct(point.checkins)
              const yN = point.nutrition != null ? yForPct(point.nutrition) : null
              const yH = point.habits != null ? yForPct(point.habits) : null
              const isHovered = hoveredIndex === index
              return (
                <g key={`pt-${point.week_start}`}>
                  {isHovered ? (
                    <line
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={height - padBottom}
                      stroke="rgba(56,189,248,0.35)"
                      strokeWidth={1}
                    />
                  ) : null}
                  <circle cx={x} cy={yW} r={isHovered ? 5 : 4} fill="#3b82f6" />
                  <circle cx={x} cy={yC} r={isHovered ? 5 : 4} fill="#2dd4bf" />
                  {yN != null ? <circle cx={x} cy={yN} r={isHovered ? 5 : 4} fill="#84cc16" /> : null}
                  {yH != null ? <circle cx={x} cy={yH} r={isHovered ? 5 : 4} fill="#a78bfa" /> : null}
                  <rect
                    x={x - Math.max(18, innerWidth / Math.max(data.length, 8) / 2)}
                    y={padTop}
                    width={Math.max(36, innerWidth / Math.max(data.length, 8))}
                    height={innerHeight}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIndex(index)}
                  />
                  <text
                    x={x}
                    y={height - 14}
                    textAnchor="middle"
                    fontSize="10"
                    fill="rgba(148,163,184,0.9)"
                  >
                    {formatWeek(point.week_start)}
                  </text>
                </g>
              )
            })}
          </svg>

          {hoverPoint && hoveredIndex != null ? (
            <div className="absolute top-2 right-2 rounded-lg border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-bg)]/95 px-3 py-2 text-xs shadow-xl">
              <div className="font-medium text-[color:var(--fc-text-primary)] mb-1">
                Week of {formatWeek(hoverPoint.week_start)}
              </div>
              <div className="text-blue-400">Workouts: {hoverPoint.workout}%</div>
              <div className="text-teal-300">Check-ins: {hoverPoint.checkins}%</div>
              {hoverPoint.nutrition != null ? (
                <div className="text-lime-400">Nutrition: {hoverPoint.nutrition}%</div>
              ) : (
                <div className="text-[color:var(--fc-text-dim)]">Nutrition: —</div>
              )}
              {hoverPoint.habits != null ? (
                <div className="text-violet-300">Habits: {hoverPoint.habits}%</div>
              ) : (
                <div className="text-[color:var(--fc-text-dim)]">Habits: —</div>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdherenceTrendChart({
  variant = 'default',
  ...rest
}: AdherenceTrendChartProps) {
  const data = rest.trendData ?? []
  if (data.length === 0) {
    if (variant === 'coachV6') {
      return (
        <div className={chartStyles.v6Empty}>
          No historical trend data yet — weekly adherence appears after logs.
        </div>
      )
    }
    return (
      <Card className="fc-card-shell rounded-2xl border border-[color:var(--fc-glass-border)]">
        <CardContent className="p-4 sm:p-6">
          <EmptyState
            variant="compact"
            title="No historical trend data"
            description="Weekly adherence appears here after workouts and check-ins are logged."
          />
        </CardContent>
      </Card>
    )
  }
  if (variant === 'coachV6') {
    return <AdherenceTrendChartCoachV6 data={data} />
  }
  return <AdherenceTrendChartDefault {...rest} trendData={data} />
}

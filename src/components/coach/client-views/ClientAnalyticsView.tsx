'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Activity,
  Flame,
  Scale,
  Target,
  Calendar,
  Dumbbell,
  Heart,
  UtensilsCrossed,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  ImageIcon,
} from 'lucide-react'
import { getClientAnalytics, type ClientAnalyticsData } from '@/lib/clientAnalyticsService'
import { WellnessTrendsCard } from '@/components/client/WellnessTrendsCard'
import type { DailyWellnessLog } from '@/lib/wellnessService'

interface ClientAnalyticsViewProps {
  clientId: string
}

function getWeekStartMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.toISOString().split('T')[0]
}

export default function ClientAnalyticsView({ clientId }: ClientAnalyticsViewProps) {
  const [data, setData] = useState<ClientAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getClientAnalytics(clientId)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'Failed to load analytics')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [clientId])

  const weekStart = useMemo(() => getWeekStartMonday(), [])
  const weekDays = useMemo(() => {
    const start = new Date(weekStart + 'T12:00:00')
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d.toISOString().split('T')[0]
    })
  }, [weekStart])
  const lastWeekStart = useMemo(() => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  }, [weekStart])
  const lastWeekDays = useMemo(() => {
    const start = new Date(lastWeekStart + 'T12:00:00')
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d.toISOString().split('T')[0]
    })
  }, [lastWeekStart])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 animate-pulse h-28" />
          ))}
        </div>
        <div className="animate-pulse h-64 fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]" />
        <div className="animate-pulse h-48 fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-8 text-center">
        <p className="fc-text-subtle">{error ?? 'No data available.'}</p>
      </div>
    )
  }

  const { overview, goals, workout, body, wellness, photos, nutrition, habits } = data
  const adherenceColor =
    overview.overallAdherencePct == null
      ? 'fc-text-dim'
      : overview.overallAdherencePct >= 80
        ? 'text-[color:var(--fc-status-success)]'
        : overview.overallAdherencePct >= 60
          ? 'text-amber-500'
          : 'text-[color:var(--fc-status-error)]'

  return (
    <div className="space-y-8">
      {/* SECTION 1: Overview Summary Cards */}
      <section>
        <h2 className="text-lg font-semibold fc-text-primary mb-4">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Card 1: Overall Adherence */}
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
            <div className="mx-auto mb-2 fc-icon-tile fc-icon-workouts flex justify-center">
              <Target className="w-5 h-5" />
            </div>
            <p className={`text-2xl font-bold leading-tight ${adherenceColor}`}>
              {overview.overallAdherencePct != null ? `${overview.overallAdherencePct}%` : '—'}
            </p>
            <p className="text-xs fc-text-dim">Overall Adherence</p>
          </div>

          {/* Card 2: Training Volume */}
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
            <div className="mx-auto mb-2 fc-icon-tile fc-icon-workouts flex justify-center">
              <Dumbbell className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold fc-text-primary leading-tight">
              {overview.trainingVolumeThisWeek >= 1000
                ? `${(overview.trainingVolumeThisWeek / 1000).toFixed(1)}k`
                : overview.trainingVolumeThisWeek}
            </p>
            <p className="text-xs fc-text-dim">Volume this week (kg)</p>
            {overview.trainingVolumeLastWeek > 0 && (
              <p className="text-xs fc-text-subtle mt-1">
                {overview.trainingVolumeTrend === 'up' && <TrendingUp className="inline w-3 h-3" />}
                {overview.trainingVolumeTrend === 'down' && <TrendingDown className="inline w-3 h-3" />}
                {overview.trainingVolumeTrend === 'same' && <Minus className="inline w-3 h-3" />}
                {' vs last week'}
              </p>
            )}
          </div>

          {/* Card 3: Check-In Streak */}
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
            <div className="mx-auto mb-2 fc-icon-tile fc-icon-workouts flex justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold fc-text-primary leading-tight">{overview.checkinStreak}</p>
            <p className="text-xs fc-text-dim">Check-in streak</p>
            <p className="text-xs fc-text-subtle mt-1">Best: {overview.bestStreak}</p>
          </div>

          {/* Card 4: Body Composition Trend */}
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
            <div className="mx-auto mb-2 fc-icon-tile fc-icon-workouts flex justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold fc-text-primary leading-tight">{overview.bodyCompositionTrend.label}</p>
            <p className="text-xs fc-text-dim mt-1">Body (30d)</p>
          </div>

          {/* Card 5: Program Progress */}
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
            <div className="mx-auto mb-2 fc-icon-tile fc-icon-workouts flex justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            {overview.programProgress ? (
              <>
                <p className="text-sm font-semibold fc-text-primary leading-tight">
                  Week {overview.programProgress.weekNum} of {overview.programProgress.totalWeeks} ({overview.programProgress.pct}%)
                </p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-[color:var(--fc-glass-highlight)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[color:var(--fc-accent)]"
                    style={{ width: `${overview.programProgress.pct}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm fc-text-subtle leading-tight">No active program</p>
            )}
            <p className="text-xs fc-text-dim mt-1">Program</p>
          </div>

          {/* Card 6: Days Active */}
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
            <div className="mx-auto mb-2 fc-icon-tile fc-icon-workouts flex justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold fc-text-primary leading-tight">
              {overview.daysActiveLast30} <span className="text-sm font-normal fc-text-dim">/ {overview.totalDays30}</span>
            </p>
            <p className="text-xs fc-text-dim">Days active (30d)</p>
          </div>
        </div>
      </section>

      {/* SECTION 2: Workout Analytics */}
      <section>
        <h2 className="text-lg font-semibold fc-text-primary mb-4">Workout Analytics</h2>
        <div className="space-y-4">
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
            <h3 className="text-base font-medium fc-text-primary mb-3">Workout adherence (this week)</h3>
            {workout.scheduledThisWeek > 0 ? (
              <>
                <p className="text-2xl font-bold fc-text-primary">
                  {workout.completedThisWeek} / {workout.scheduledThisWeek} completed
                  {workout.programAdherenceThisWeek != null && ` (${workout.programAdherenceThisWeek}%)`}
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-[color:var(--fc-glass-highlight)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[color:var(--fc-status-success)]"
                    style={{
                      width: `${workout.programAdherenceThisWeek ?? 0}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm fc-text-subtle">No workouts scheduled this week.</p>
            )}
          </div>
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
            <h3 className="text-base font-medium fc-text-primary mb-3">Volume trend (last 12 weeks)</h3>
            {workout.weeklyVolume.length > 0 ? (
              <div className="flex items-end gap-1 h-32">
                {workout.weeklyVolume.slice(-12).map((w, i) => {
                  const max = Math.max(...workout.weeklyVolume.map((x) => x.totalVolume), 1)
                  const pct = (w.totalVolume / max) * 100
                  return (
                    <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full fc-progress-track rounded-t relative flex-1 min-h-[40px] overflow-hidden">
                        <div
                          className="absolute bottom-0 w-full fc-progress-fill transition-all"
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] fc-text-dim truncate max-w-full">
                        {new Date(w.weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm fc-text-subtle">No volume data yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 3: Body Composition */}
      <section>
        <h2 className="text-lg font-semibold fc-text-primary mb-4">Body Composition</h2>
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6 space-y-6">
          {body.measurements.length > 0 ? (
            <>
              <div>
                <h3 className="text-base font-medium fc-text-primary mb-3">Weight</h3>
                <div className="flex items-end gap-1 h-24">
                  {body.measurements.slice(0, 12).reverse().map((m) => (
                    <div key={m.id} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full fc-progress-track rounded-t relative flex-1 min-h-[32px] overflow-hidden">
                        <div
                          className="absolute bottom-0 w-full bg-[color:var(--fc-accent)]/70"
                          style={{
                            height: `${Math.min(100, ((m.weight_kg ?? 0) / 150) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] fc-text-dim">
                        {new Date(m.measured_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
                {body.firstMeasurement && body.measurements[0] && (
                  <p className="text-sm fc-text-subtle mt-2">
                    Start: {body.firstMeasurement.weight_kg?.toFixed(1)} kg → Current: {body.measurements[0].weight_kg?.toFixed(1)} kg
                    {body.weightGoal != null && ` | Goal: ${body.weightGoal} kg`}
                  </p>
                )}
              </div>
              {(body.measurements.some((m) => m.body_fat_percentage != null) || body.measurements.some((m) => m.waist_circumference != null)) && (
                <div>
                  <h3 className="text-base font-medium fc-text-primary mb-2">Body fat & circumferences</h3>
                  <p className="text-sm fc-text-subtle">
                    First vs latest: Body fat {body.firstMeasurement?.body_fat_percentage?.toFixed(1) ?? '—'}% → {body.measurements[0]?.body_fat_percentage?.toFixed(1) ?? '—'}% |
                    Waist {body.firstMeasurement?.waist_circumference?.toFixed(1) ?? '—'} cm → {body.measurements[0]?.waist_circumference?.toFixed(1) ?? '—'} cm
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm fc-text-subtle">No body metrics recorded yet.</p>
          )}
          <div>
            <h3 className="text-base font-medium fc-text-primary mb-2">Progress photos</h3>
            {photos.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {photos.slice(0, 10).map((p) => (
                  <div
                    key={p.date}
                    className="flex-shrink-0 w-24 h-24 rounded-xl bg-[color:var(--fc-glass-highlight)] flex items-center justify-center border border-[color:var(--fc-glass-border)]"
                  >
                    <ImageIcon className="w-8 h-8 fc-text-dim" />
                    <span className="sr-only">{p.date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm fc-text-subtle">No progress photos uploaded yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 4: Wellness & Recovery */}
      <section>
        <h2 className="text-lg font-semibold fc-text-primary mb-4">Wellness & Recovery</h2>
        <div className="space-y-4">
          <WellnessTrendsCard
            logRange={wellness.logs as DailyWellnessLog[]}
            weekStart={weekStart}
            weekDays={weekDays}
            lastWeekStart={lastWeekStart}
            lastWeekDays={lastWeekDays}
          />
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
            <h3 className="text-base font-medium fc-text-primary mb-2">Check-in consistency (last 3 months)</h3>
            <p className="text-sm fc-text-subtle">
              Total check-ins: {wellness.logs.filter((l) => l.sleep_hours != null && l.stress_level != null && l.soreness_level != null).length} |
              Current streak: {data.overview.checkinStreak} | Best streak: {data.overview.bestStreak}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5: Nutrition (conditional) */}
      {nutrition.hasGoalsOrPlan && (
        <section>
          <h2 className="text-lg font-semibold fc-text-primary mb-4">Nutrition</h2>
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
            <h3 className="text-base font-medium fc-text-primary mb-2">Nutrition adherence</h3>
            {nutrition.adherencePct != null ? (
              <>
                <p className="text-2xl font-bold fc-text-primary">{nutrition.adherencePct}%</p>
                <p className="text-sm fc-text-subtle mt-1">
                  This week: {nutrition.complianceThisWeek ?? '—'}% | This month: {nutrition.complianceThisMonth ?? '—'}%
                </p>
              </>
            ) : (
              <p className="text-sm fc-text-subtle">No compliance data for this period.</p>
            )}
          </div>
        </section>
      )}

      {!nutrition.hasGoalsOrPlan && (
        <section>
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6 text-center">
            <UtensilsCrossed className="w-10 h-10 fc-text-dim mx-auto mb-2" />
            <p className="fc-text-subtle">No nutrition goals set. Set nutrition targets to track compliance.</p>
            <Link href={`/coach/clients/${clientId}/goals`} className="mt-3 inline-block text-sm font-medium text-[color:var(--fc-accent)]">
              Set goals
            </Link>
          </div>
        </section>
      )}

      {/* SECTION 6: Goal Progress */}
      <section>
        <h2 className="text-lg font-semibold fc-text-primary mb-4">Goal Progress</h2>
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6 space-y-4">
          {goals.active.length > 0 ? (
            <>
              {goals.active.map((g) => (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium fc-text-primary">{g.title}</span>
                    <span className="fc-text-subtle">
                      {g.current_value != null && g.target_value != null
                        ? `${g.current_value} / ${g.target_value} ${g.target_unit ?? ''}`
                        : g.progress_percentage != null
                          ? `${g.progress_percentage}%`
                          : '—'}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[color:var(--fc-glass-highlight)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[color:var(--fc-accent)]"
                      style={{ width: `${Math.min(100, g.progress_percentage ?? 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm fc-text-subtle">No active goals.</p>
          )}
          {goals.completedCount > 0 && (
            <p className="text-sm fc-text-subtle pt-2 border-t border-[color:var(--fc-glass-border)]">
              {goals.completedCount} goal{goals.completedCount !== 1 ? 's' : ''} achieved
            </p>
          )}
          <Link href={`/coach/clients/${clientId}/goals`} className="text-sm font-medium text-[color:var(--fc-accent)]">
            Manage goals
          </Link>
        </div>
      </section>

      {/* SECTION 7: Habits (conditional) */}
      {habits.hasHabits && (
        <section>
          <h2 className="text-lg font-semibold fc-text-primary mb-4">Habit Tracking</h2>
          <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
            <h3 className="text-base font-medium fc-text-primary mb-3">Completion rate (last 30 days)</h3>
            <ul className="space-y-3">
              {habits.assignments.map((a) => {
                const comp = habits.completionByHabit[a.id]
                const pct = comp && comp.total > 0 ? Math.round((comp.completed / comp.total) * 100) : 0
                return (
                  <li key={a.id} className="flex justify-between items-center">
                    <span className="text-sm fc-text-primary">{a.name ?? 'Habit'}</span>
                    <span className="text-sm fc-text-subtle">
                      {comp?.completed ?? 0} / {comp?.total ?? 30} ({pct}%) · Streak: {comp?.streak ?? 0}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}

'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
import { supabase } from '@/lib/supabase'
import {
  getClientAnalytics,
  resolveStatsTabTimezone,
  type ClientAnalyticsData,
} from '@/lib/clientAnalyticsService'
import {
  addCalendarDaysYmd,
  mondayYmdOfZonedWeekContaining,
  normalizeClientTimezone,
} from '@/lib/clientZonedCalendar'
import { EmptyState } from '@/components/ui/EmptyState'
import { WellnessTrendsCard } from '@/components/client/WellnessTrendsCard'
import type { DailyWellnessLog } from '@/lib/wellnessService'
import ClientAnalyticsCoachSections from '@/components/coach/client-views/ClientAnalyticsCoachSections'

interface ClientAnalyticsViewProps {
  clientId: string
  /** Optional actions shown at the top of the trends section (e.g. report / export). */
  toolbar?: React.ReactNode
  /** When set, skip fetch and render from this bundle (e.g. coach Stats tab parallel load). */
  prefetched?: ClientAnalyticsData | null
  /** Coach client Stats tab layout (v6 sections). */
  coachStatsLayout?: boolean
}

export default function ClientAnalyticsView({
  clientId,
  toolbar,
  prefetched,
  coachStatsLayout,
}: ClientAnalyticsViewProps) {
  const [data, setData] = useState<ClientAnalyticsData | null>(prefetched ?? null)
  const [loading, setLoading] = useState(!prefetched)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (prefetched) {
      setData(prefetched)
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const [{ data: paRow }, { data: profRow }] = await Promise.all([
          supabase
            .from('program_assignments')
            .select('timezone_snapshot')
            .eq('client_id', clientId)
            .eq('status', 'active')
            .maybeSingle(),
          supabase.from('profiles').select('timezone').eq('id', clientId).maybeSingle(),
        ])
        const tz = resolveStatsTabTimezone(
          paRow?.timezone_snapshot as string | undefined,
          profRow?.timezone as string | undefined,
        )
        const d = await getClientAnalytics(clientId, tz)
        if (!cancelled) setData(d)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load analytics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [clientId, prefetched])

  const chartTz = normalizeClientTimezone(data?.clientTimezoneForCharts)
  const weekStart = useMemo(
    () => mondayYmdOfZonedWeekContaining(new Date(), chartTz),
    [chartTz],
  )
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addCalendarDaysYmd(weekStart, i)),
    [weekStart],
  )
  const lastWeekStart = useMemo(() => addCalendarDaysYmd(weekStart, -7), [weekStart])
  const lastWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addCalendarDaysYmd(lastWeekStart, i)),
    [lastWeekStart],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-transparent p-5 animate-pulse h-28" />
          ))}
        </div>
        <div className="animate-pulse h-64 rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-transparent" />
        <div className="animate-pulse h-48 rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-transparent p-8">
        <EmptyState
          icon={BarChart3}
          title={error ? 'Could not load analytics' : 'No analytics yet'}
          description={
            error
              ? error
              : 'As this client logs workouts, check-ins, and meals, charts and trends will appear here.'
          }
          actionHref={`/coach/clients/${clientId}/progress`}
          actionLabel="View progress"
        />
      </div>
    )
  }

  if (coachStatsLayout) {
    return (
      <ClientAnalyticsCoachSections
        clientId={clientId}
        data={data}
        weekDays={weekDays}
        lastWeekDays={lastWeekDays}
      />
    )
  }

  const { overview, goals, workout, body, wellness, photos, nutrition, habits } = data
  const priorityRank = (priority: string | null | undefined): number => {
    if (priority === 'high') return 3
    if (priority === 'medium') return 2
    if (priority === 'low') return 1
    return 0
  }
  const topActiveGoals = [...goals.active]
    .sort((a, b) => {
      const p = priorityRank(b.priority) - priorityRank(a.priority)
      if (p !== 0) return p
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
    .slice(0, 3)
  return (
    <div className="space-y-8">
      {toolbar && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:justify-end">
          {toolbar}
        </div>
      )}
      {/* SECTION 1: Overview Summary Cards */}
      <section>
        <h2 className="text-lg font-semibold fc-text-primary mb-4">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Card 1: Overall Adherence */}
          <div className="rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-transparent p-5 text-center">
            <div className="mx-auto mb-2 fc-icon-tile fc-icon-workouts flex justify-center">
              <Target className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-[color:var(--fc-group-c)] tabular-nums leading-tight">
              {overview.overallAdherencePct != null ? `${overview.overallAdherencePct}%` : 'â€”'}
            </p>
            <p className="text-xs fc-text-dim">Overall Adherence</p>
          </div>

          {/* Card 2: Training Volume */}
          <div className="rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-transparent p-5 text-center">
            <div className="mx-auto mb-2 fc-icon-tile fc-icon-workouts flex justify-center">
              <Dumbbell className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-[color:var(--fc-group-c)] tabular-nums leading-tight">
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
          <div className="rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-transparent p-5 text-center">
            <div className="mx-auto mb-2 fc-icon-tile fc-icon-workouts flex justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-[color:var(--fc-group-c)] tabular-nums leading-tight">{overview.checkinStreak}</p>
            <p className="text-xs fc-text-dim">Check-in streak</p>
            <p className="text-xs fc-text-subtle mt-1">Best: {overview.bestStreak}</p>
          </div>

          {/* Card 4: Body Composition Trend */}
          <div className="rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-transparent p-5 text-center">
            <div className="mx-auto mb-2 fc-icon-tile fc-icon-workouts flex justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold fc-text-primary leading-tight">{overview.bodyCompositionTrend.label}</p>
            <p className="text-xs fc-text-dim mt-1">Body (30d)</p>
          </div>

          {/* Card 5: Program Progress */}
          <div className="rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-transparent p-5 text-center">
            <div className="mx-auto mb-2 fc-icon-tile fc-icon-workouts flex justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            {overview.programProgress ? (
              <>
                <p className="text-sm font-semibold fc-text-primary leading-tight">
                  Week {overview.programProgress.weekNum} of{" "}
                  {overview.programProgress.totalWeeks}
                </p>
                <p className="mt-1 text-xs fc-text-dim tabular-nums">
                  {overview.programProgress.pct}% complete
                </p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-transparent overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[color:var(--fc-group-c)] to-[color:var(--fc-group-c)]"
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
          <div className="rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-transparent p-5 text-center">
            <div className="mx-auto mb-2 fc-icon-tile fc-icon-workouts flex justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-[color:var(--fc-group-c)] tabular-nums leading-tight">
              {overview.daysActiveLast30} <span className="text-sm font-normal fc-text-dim">/ {overview.totalDays30}</span>
            </p>
            <p className="text-xs fc-text-dim">Days active (30d)</p>
          </div>
        </div>
      </section>

      {/* SECTION 2: Workout Analytics */}
      <section>
        <h2 className="text-lg font-semibold fc-text-primary mb-4">Workout Analytics</h2>
        <div className="space-y-3">
          <div className="rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-2">
            <h3 className="text-base font-medium fc-text-primary mb-3">Workout adherence (this week)</h3>
            {workout.scheduledThisWeek > 0 ? (
              <>
                <p className="text-2xl font-bold text-[color:var(--fc-group-c)] tabular-nums">
                  {workout.completedThisWeek} / {workout.scheduledThisWeek} completed
                  {workout.programAdherenceThisWeek != null && ` (${workout.programAdherenceThisWeek}%)`}
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-transparent overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[color:var(--fc-group-c)] to-[color:var(--fc-group-c)]"
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
          <div className="rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-2">
            <h3 className="text-base font-medium fc-text-primary mb-3">Volume trend (last 12 weeks)</h3>
            {workout.weeklyVolume.length > 0 ? (
              <div className="flex h-56 gap-1 items-stretch">
                {workout.weeklyVolume.slice(-12).map((w) => {
                  const max = Math.max(...workout.weeklyVolume.map((x) => x.totalVolume), 1)
                  const pct = (w.totalVolume / max) * 100
                  const vol = w.totalVolume
                  const volumeLabel =
                    vol >= 1000
                      ? `${Math.round(vol / 100) / 10}t`
                      : vol > 0
                        ? `${vol} kg`
                        : ''
                  return (
                    <div
                      key={w.weekStart}
                      className="flex h-full min-h-0 min-w-0 flex-1 flex-col items-center gap-1"
                    >
                      <span className="flex h-4 items-center justify-center text-[10px] font-medium fc-text-primary">
                        {volumeLabel}
                      </span>
                      <div className="relative min-h-[48px] w-full flex-1 overflow-hidden rounded-t fc-progress-track">
                        <div
                          className="absolute bottom-0 w-full rounded-t bg-gradient-to-t from-[color:var(--fc-group-c)] to-[color:var(--fc-group-c)] transition-all"
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="max-w-full truncate text-[10px] fc-text-dim">
                        {new Date(w.weekStart + 'T12:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
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
        <div className="rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-2 space-y-3">
          {body.measurements.length > 0 ? (
            <>
              <div>
                <h3 className="text-base font-medium fc-text-primary mb-3">Weight</h3>
                <div className="flex items-end gap-1 h-24">
                  {(() => {
                    const slice = body.measurements.slice(0, 12).reverse();
                    const ws = slice
                      .map((m) => m.weight_kg)
                      .filter((w): w is number => w != null && !Number.isNaN(w));
                    const wMin = ws.length ? Math.min(...ws) : 0;
                    const wMax = ws.length ? Math.max(...ws) : 1;
                    const span = Math.max(wMax - wMin, 1e-6);
                    return slice.map((m) => {
                      const h =
                        m.weight_kg != null
                          ? Math.min(100, Math.max(4, ((m.weight_kg - wMin) / span) * 100))
                          : 4;
                      return (
                    <div key={m.id} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <div className="w-full fc-progress-track rounded-t relative flex-1 min-h-[32px] overflow-hidden">
                        <div
                          className="absolute bottom-0 w-full rounded-t bg-[color-mix(in_srgb,var(--fc-group-c)_85%,transparent)]"
                          style={{
                            height: `${h}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] fc-text-dim">
                        {new Date(m.measured_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                      );
                    });
                  })()}
                </div>
                {body.firstMeasurement && body.measurements[0] && (
                  <p className="text-sm fc-text-subtle mt-2">
                    Start: {body.firstMeasurement.weight_kg?.toFixed(1)} kg â†’ Current: {body.measurements[0].weight_kg?.toFixed(1)} kg
                    {body.weightGoal != null && ` | Goal: ${body.weightGoal} kg`}
                  </p>
                )}
              </div>
              {(body.measurements.some((m) => m.body_fat_percentage != null) || body.measurements.some((m) => m.waist_circumference != null)) && (
                <div>
                  <h3 className="text-base font-medium fc-text-primary mb-2">Body fat & circumferences</h3>
                  <p className="text-sm fc-text-subtle">
                    First vs latest: Body fat {body.firstMeasurement?.body_fat_percentage?.toFixed(1) ?? 'â€”'}% â†’ {body.measurements[0]?.body_fat_percentage?.toFixed(1) ?? 'â€”'}% |
                    Waist {body.firstMeasurement?.waist_circumference?.toFixed(1) ?? 'â€”'} cm â†’ {body.measurements[0]?.waist_circumference?.toFixed(1) ?? 'â€”'} cm
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
                    className="flex-shrink-0 w-24 h-24 rounded-xl bg-transparent overflow-hidden border border-[color:var(--fc-glass-border)] relative"
                  >
                    {p.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.previewUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 fc-text-dim" />
                      </div>
                    )}
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
        <div className="space-y-3">
          <WellnessTrendsCard
            logRange={wellness.logs as DailyWellnessLog[]}
            weekStart={weekStart}
            weekDays={weekDays}
            lastWeekStart={lastWeekStart}
            lastWeekDays={lastWeekDays}
          />
          <div className="rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-2">
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
          <div className="rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-2">
            <h3 className="text-base font-medium fc-text-primary mb-2">Nutrition adherence</h3>
            {nutrition.adherencePct != null ? (
              <>
                <p className="text-2xl font-bold fc-text-primary">{nutrition.adherencePct}%</p>
                <p className="text-sm fc-text-subtle mt-1">
                  This week: {nutrition.complianceThisWeek ?? 'â€”'}% nutrition adherence | This month: {nutrition.complianceThisMonth ?? 'â€”'}%
                </p>
              </>
            ) : (
              <p className="text-sm fc-text-subtle">No adherence data for this period.</p>
            )}
          </div>
        </section>
      )}

      {!nutrition.hasGoalsOrPlan && (
        <section>
          <div className="rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-3 text-center">
            <UtensilsCrossed className="w-10 h-10 fc-text-dim mx-auto mb-2" />
            <p className="fc-text-subtle">No nutrition goals set. Set nutrition targets to track adherence.</p>
            <button
              type="button"
              className="mt-3 text-sm font-medium text-[color:var(--fc-accent)]"
              onClick={() => {
                window.location.href = `/coach/clients/${clientId}/progress?section=goals`;
              }}
            >
              Set goals
            </button>
          </div>
        </section>
      )}

      {/* SECTION 6: Goals Summary */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold fc-text-primary">Goals</h2>
          <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
            {goals.active.length} active
          </span>
        </div>
        <div className="rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-2 space-y-2">
          {goals.active.length > 0 ? (
            <>
              {topActiveGoals.map((g) => (
                <div key={g.id} className="py-1">
                  <div className="flex justify-between items-center text-sm mb-1 gap-3">
                    <span className="font-medium fc-text-primary truncate">{g.title}</span>
                    <span className="fc-text-subtle tabular-nums shrink-0">
                      {Math.round(Math.min(100, Math.max(0, g.progress_percentage ?? 0)))}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-transparent overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[color:var(--fc-accent)]"
                      style={{ width: `${Math.min(100, g.progress_percentage ?? 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm fc-text-subtle">No active goals</p>
          )}
          <Link
            href={`/coach/clients/${clientId}/progress?section=goals`}
            className="inline-block text-sm font-medium text-[color:var(--fc-accent)] pt-1"
          >
            {goals.active.length > 0 ? 'View all goals â†’' : 'View goals page â†’'}
          </Link>
        </div>
      </section>

      {/* SECTION 7: Habits (conditional) */}
      {habits.hasHabits && (
        <section>
          <h2 className="text-lg font-semibold fc-text-primary mb-4">Habit Tracking</h2>
          <div className="rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-2">
            <h3 className="text-base font-medium fc-text-primary mb-3">Completion rate (last 30 days)</h3>
            <ul className="space-y-3">
              {habits.assignments.map((a) => {
                const comp = habits.completionByHabit[a.id]
                const pct = comp && comp.total > 0 ? Math.round((comp.completed / comp.total) * 100) : 0
                return (
                  <li key={a.id} className="flex justify-between items-center border-b border-[color:var(--fc-glass-border)] py-2 last:border-b-0">
                    <span className="text-sm fc-text-primary">{a.name ?? 'Habit'}</span>
                    <span className="text-sm fc-text-subtle">
                      {comp?.completed ?? 0} / {comp?.total ?? 30} ({pct}%) Â· Streak: {comp?.streak ?? 0}
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

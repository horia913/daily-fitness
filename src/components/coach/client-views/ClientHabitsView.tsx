'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchClientHabits, type ClientHabitWithTemplate } from '@/lib/habitTemplateService'
import {
  addCalendarDaysYmd,
  normalizeClientTimezone,
  zonedCalendarDateString,
} from '@/lib/clientZonedCalendar'
import type { WellnessLogDay } from '@/lib/habitAutoTracking'
import { STUB_SOURCE_TYPES, workoutLogsToCompletedYmds } from '@/lib/habitAutoTracking'
import { isClientHabitCompleteOnDay, wellnessRowsToMap } from '@/lib/coachHabitsAdherence'
import { HabitLucideIcon } from '@/components/client/habitLucideIcon'
import { useCoachClient } from '@/contexts/CoachClientContext'
import { cn } from '@/lib/utils'
import HabitCard from '@/components/coach/client-detail/HabitCard'
import EmptyStateBlock from '@/components/coach/client-detail/EmptyStateBlock'
import sec from '@/components/coach/client-detail/coachClientDetailUi.module.css'
import { Star } from 'lucide-react'

type WindowMode = 7 | 30

function sourceBadgeLabel(sourceType: string): { kind: 'auto' | 'manual'; text: string } {
  if (sourceType === 'manual') return { kind: 'manual', text: 'Manual' }
  if (STUB_SOURCE_TYPES.has(sourceType)) return { kind: 'manual', text: 'Manual' }
  if (sourceType === 'workout_logged') return { kind: 'auto', text: 'Auto-tracked from workouts' }
  if (sourceType === 'wellness_check') return { kind: 'auto', text: 'Auto-tracked from check-in' }
  if (sourceType === 'wellness_field') return { kind: 'auto', text: 'Auto-tracked from wellness' }
  return { kind: 'auto', text: `Auto-tracked (${sourceType})` }
}

function mergedTarget(h: ClientHabitWithTemplate): Record<string, unknown> {
  return { ...h.template.default_target, ...h.target }
}

function formatTargetRow(h: ClientHabitWithTemplate): string {
  const t = mergedTarget(h)
  const st = h.template.source_type
  if (st === 'water_log' && typeof t.liters === 'number') return `Target: ${t.liters}L / day`
  if (st === 'meal_completion_count' && typeof t.min_meals === 'number')
    return `Target: at least ${t.min_meals} meals / day`
  if (st === 'nutrition_field') {
    const field = String((h.template.source_config as { field?: string })?.field ?? '')
    if (field === 'calories' && typeof t.calories === 'number') return `Target: ${Math.round(t.calories)} kcal / day`
    if (field === 'protein_g' && typeof t.protein_g === 'number') return `Target: ${Math.round(t.protein_g)} g protein / day`
  }
  if (st === 'wellness_field') {
    const field = String(h.template.source_config?.field ?? '')
    if (field === 'sleep_hours' && typeof t.hours === 'number') return `Target: ${t.hours}h sleep / night`
    if (field === 'steps' && typeof t.steps === 'number') return `Target: ${Math.round(Number(t.steps)).toLocaleString()} steps / day`
    if (field === 'sleep_quality' && typeof t.quality === 'number') return `Target: sleep quality ≥ ${t.quality} / 5`
    if (field === 'stress_level' && typeof t.max_stress === 'number') return `Target: stress ≤ ${t.max_stress} / 5`
  }
  if (st === 'workout_logged') return 'Target: 1 workout / day'
  const keys = Object.keys(t).filter((k) => t[k] != null && t[k] !== '')
  if (keys.length === 0) return 'Target: —'
  return `Target: ${keys.map((k) => `${k}: ${String(t[k])}`).join(', ')}`
}

function logKeysForHabit(habitId: string, ymds: Set<string>): Set<string> {
  return new Set([...ymds].map((d) => `${habitId}|${d}`))
}

function currentStreakFromDays(orderedYmds: string[], doneByYmd: Map<string, boolean>): number {
  let n = 0
  for (let i = orderedYmds.length - 1; i >= 0; i--) {
    const y = orderedYmds[i]!
    if (doneByYmd.get(y)) n += 1
    else break
  }
  return n
}

interface ClientHabitsViewProps {
  clientId: string
  /** Optional; falls back to CoachClientContext or profile. */
  clientName?: string
  /** Coach v6 habit cards (Check-ins + Profile Habits). */
  layoutVariant?: 'default' | 'coachV6'
}

function habitIconVariant(sourceType: string, field: string): 'warn' | 'cyan' | 'purple' | 'good' {
  if (sourceType === 'water_log') return 'warn'
  if (sourceType === 'workout_logged') return 'cyan'
  if (sourceType === 'nutrition_field' || sourceType === 'meal_completion_count') return 'good'
  if (sourceType === 'wellness_field') {
    if (field.includes('sleep')) return 'purple'
    return 'warn'
  }
  return 'cyan'
}

export function HabitsList(props: Omit<ClientHabitsViewProps, 'layoutVariant'>) {
  return <ClientHabitsView {...props} layoutVariant="coachV6" />
}

export default function ClientHabitsView({
  clientId,
  clientName: clientNameProp,
  layoutVariant = 'default',
}: ClientHabitsViewProps) {
  const { clientName: ctxName } = useCoachClient()
  const [windowDays, setWindowDays] = useState<WindowMode>(7)
  const [displayName, setDisplayName] = useState(clientNameProp ?? ctxName ?? 'Client')
  const [tz, setTz] = useState('Europe/Bucharest')
  const [habits, setHabits] = useState<ClientHabitWithTemplate[]>([])
  const [logsByHabit, setLogsByHabit] = useState<Map<string, Set<string>>>(new Map())
  const [wellnessRows, setWellnessRows] = useState<WellnessLogDay[]>([])
  const [workoutRows, setWorkoutRows] = useState<{ completed_at: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (clientNameProp) setDisplayName(clientNameProp)
    else if (ctxName) setDisplayName(ctxName)
  }, [clientNameProp, ctxName])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const { data: prof } = await supabase
        .from('profiles')
        .select('first_name, last_name, timezone')
        .eq('id', clientId)
        .maybeSingle()

      const clientTz = normalizeClientTimezone(
        typeof prof?.timezone === 'string' ? prof.timezone : undefined
      )
      setTz(clientTz)
      if (prof && !clientNameProp && !ctxName) {
        const fn = prof.first_name ?? ''
        const ln = prof.last_name ?? ''
        const n = `${fn} ${ln}`.trim()
        if (n) setDisplayName(n)
      }

      const list = await fetchClientHabits(clientId)
      setHabits(list)
      const habitIds = list.map((h) => h.id)
      if (habitIds.length === 0) {
        setLogsByHabit(new Map())
        setWellnessRows([])
        setWorkoutRows([])
        return
      }

      const todayYmd = zonedCalendarDateString(new Date(), clientTz)
      const startYmd = addCalendarDaysYmd(todayYmd, -(windowDays - 1))

      const [logsRes, wellRes, woRes] = await Promise.all([
        supabase
          .from('habit_logs')
          .select('habit_id, log_date')
          .eq('client_id', clientId)
          .in('habit_id', habitIds)
          .gte('log_date', startYmd)
          .lte('log_date', todayYmd),
        supabase
          .from('daily_wellness_logs')
          .select(
            'log_date, sleep_hours, sleep_quality, stress_level, soreness_level, energy_level, steps'
          )
          .eq('client_id', clientId)
          .gte('log_date', startYmd)
          .lte('log_date', todayYmd),
        supabase
          .from('workout_logs')
          .select('completed_at')
          .eq('client_id', clientId)
          .gte('completed_at', `${startYmd}T00:00:00.000Z`)
          .not('completed_at', 'is', null),
      ])

      const m = new Map<string, Set<string>>()
      for (const row of logsRes.data ?? []) {
        const hid = (row as { habit_id: string }).habit_id
        const d = (row as { log_date: string }).log_date
        const s = m.get(hid) ?? new Set<string>()
        s.add(d)
        m.set(hid, s)
      }
      setLogsByHabit(m)
      setWellnessRows((wellRes.data ?? []) as WellnessLogDay[])
      setWorkoutRows((woRes.data ?? []) as { completed_at: string | null }[])
    } catch (e) {
      console.error('[ClientHabitsView]', e)
      setHabits([])
    } finally {
      setLoading(false)
    }
  }, [clientId, windowDays, clientNameProp, ctxName])

  useEffect(() => {
    void load()
  }, [load])

  const dayList = useMemo(() => {
    const clientTz = normalizeClientTimezone(tz)
    const todayYmd = zonedCalendarDateString(new Date(), clientTz)
    const days: string[] = []
    for (let i = windowDays - 1; i >= 0; i--) {
      days.push(addCalendarDaysYmd(todayYmd, -i))
    }
    return days
  }, [tz, windowDays])

  const todayYmd = useMemo(
    () => zonedCalendarDateString(new Date(), normalizeClientTimezone(tz)),
    [tz]
  )

  const wellnessMap = useMemo(() => wellnessRowsToMap(wellnessRows), [wellnessRows])
  const workoutYmds = useMemo(
    () => workoutLogsToCompletedYmds(workoutRows, normalizeClientTimezone(tz)),
    [workoutRows, tz]
  )

  const sourceDataBase = useMemo(
    () => ({
      clientTimezone: normalizeClientTimezone(tz),
      wellnessByYmd: wellnessMap,
      workoutCompletedYmds: workoutYmds,
    }),
    [tz, wellnessMap, workoutYmds]
  )

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (habits.length === 0) {
    if (layoutVariant === 'coachV6') {
      return (
        <EmptyStateBlock
          icon={Star}
          title="No habits set up"
          description="Encourage your client to add habits in their app."
        />
      )
    }
    return (
      <div className="fc-card-shell p-8 text-center rounded-2xl border border-[color:var(--fc-glass-border)]">
        <p className="text-sm fc-text-dim">
          {displayName} hasn&apos;t set any habits yet.
        </p>
      </div>
    )
  }

  if (layoutVariant === 'coachV6') {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className={sec.sectionTitle}>Habits</h2>
            <p className="text-sm text-[color:var(--fc-text-subtle)] mt-1">
              {displayName} · {habits.length} active habit{habits.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className={sec.rangeRow}>
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`${sec.rangeTab} ${windowDays === d ? sec.rangeTabActive : ''}`}
                onClick={() => setWindowDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {habits.map((habit) => {
            const badge = sourceBadgeLabel(habit.template.source_type)
            const ymdSet = logsByHabit.get(habit.id) ?? new Set<string>()
            const logKeys = logKeysForHabit(habit.id, ymdSet)
            const doneByYmd = new Map<string, boolean>()
            for (const ymd of dayList) {
              doneByYmd.set(ymd, isClientHabitCompleteOnDay(habit, ymd, sourceDataBase, logKeys))
            }
            const total = dayList.length
            const completedCount = dayList.filter((y) => doneByYmd.get(y)).length
            const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0
            const streak = currentStreakFromDays(dayList, doneByYmd)
            let lastYmd: string | null = null
            for (let i = dayList.length - 1; i >= 0; i--) {
              const y = dayList[i]!
              if (doneByYmd.get(y)) {
                lastYmd = y
                break
              }
            }
            const field = String((habit.template.source_config as { field?: string })?.field ?? '')
            const iv = habitIconVariant(habit.template.source_type, field)
            const doneFlags = dayList.map((y) => Boolean(doneByYmd.get(y)))
            const lastText = lastYmd
              ? `Last: ${new Date(`${lastYmd}T12:00:00`).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}`
              : 'Never logged'
            return (
              <HabitCard
                key={habit.id}
                name={habit.template.name}
                targetLine={formatTargetRow(habit)}
                badgeKind={badge.kind}
                badgeText={badge.text}
                Icon={(p) => <HabitLucideIcon name={habit.template.icon} {...p} />}
                iconVariant={iv}
                doneFlags={doneFlags}
                completedLeft={
                  <>
                    Completed: <b>
                      {completedCount}/{total}
                    </b>{' '}
                    ({pct}%)
                    {windowDays === 30 ? (
                      <>
                        {' '}
                        · Best streak: <b>{streak}</b>d
                      </>
                    ) : null}
                  </>
                }
                lastLabel={lastText}
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold fc-text-primary">Habits</h2>
          <p className="text-sm fc-text-dim mt-1">
            {displayName} · {habits.length} active habit{habits.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex rounded-xl border border-[color:var(--fc-glass-border)] p-0.5 bg-[color:var(--fc-glass-soft)]">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setWindowDays(d)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                windowDays === d
                  ? 'bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)]'
                  : 'fc-text-dim hover:fc-text-primary'
              )}
            >
              Last {d} days
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {habits.map((habit) => {
          const badge = sourceBadgeLabel(habit.template.source_type)
          const ymdSet = logsByHabit.get(habit.id) ?? new Set<string>()
          const logKeys = logKeysForHabit(habit.id, ymdSet)
          const doneByYmd = new Map<string, boolean>()
          for (const ymd of dayList) {
            doneByYmd.set(
              ymd,
              isClientHabitCompleteOnDay(habit, ymd, sourceDataBase, logKeys)
            )
          }
          const total = dayList.length
          const completedCount = dayList.filter((y) => doneByYmd.get(y)).length
          const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0
          const streak = currentStreakFromDays(dayList, doneByYmd)

          let lastYmd: string | null = null
          for (let i = dayList.length - 1; i >= 0; i--) {
            const y = dayList[i]!
            if (doneByYmd.get(y)) {
              lastYmd = y
              break
            }
          }

          return (
            <article
              key={habit.id}
              className="rounded-2xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="fc-icon-tile fc-icon-habits shrink-0">
                  <HabitLucideIcon name={habit.template.icon} className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold fc-text-primary">{habit.template.name}</h3>
                    <span
                      className={cn(
                        'text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border',
                        badge.kind === 'auto'
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                          : 'border-[color:var(--fc-glass-border)] fc-text-dim'
                      )}
                    >
                      {badge.text}
                    </span>
                  </div>
                  <p className="text-xs fc-text-dim mt-1">{formatTargetRow(habit)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 justify-start" aria-label="Completion strip">
                {dayList.map((ymd) => {
                  const done = Boolean(doneByYmd.get(ymd))
                  const isToday = ymd === todayYmd
                  return (
                    <div
                      key={ymd}
                      title={ymd}
                      className={cn(
                        windowDays === 30 ? 'h-5 w-5 rounded-sm' : 'h-8 w-8 rounded-lg',
                        'border shrink-0',
                        done
                          ? 'bg-[color:var(--fc-domain-habits)] border-transparent'
                          : 'bg-transparent border-[color:var(--fc-glass-border)]',
                        isToday && 'ring-2 ring-cyan-500/60 ring-offset-1 ring-offset-[color:var(--fc-surface)]'
                      )}
                    />
                  )
                })}
              </div>

              <div className="text-xs fc-text-subtle space-y-1">
                <p>
                  Completed: {completedCount}/{total} days ({pct}%)
                  {streak > 0 ? ` · Current streak: ${streak} day${streak === 1 ? '' : 's'}` : null}
                </p>
                <p>
                  Last logged:{' '}
                  {lastYmd
                    ? new Date(`${lastYmd}T12:00:00`).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Never logged'}
                </p>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Goal Sync Service
 * Syncs active goals from canonical data via goal_source_links (no title heuristics).
 */

import { createClient } from '@supabase/supabase-js'
import { getTrackedFetch } from '@/lib/supabaseQueryLogger'
import {
  mondayYmdOfZonedWeekContaining,
  normalizeClientTimezone,
  zonedCalendarDateString,
  zonedDayInclusiveUtcBounds,
} from '@/lib/programWeekCalendar'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this operation. Refusing to fall back to anon key.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  global: { fetch: getTrackedFetch() },
})

export type GoalSyncClientSummary = {
  totalGoals: number
  syncedGoals: number
  skippedGoals: number
  errors: { goalId: string; error: string }[]
}

type GoalSourceLinkRow = {
  source_type: string
  source_config: Record<string, unknown>
  direction: 'increase' | 'decrease' | 'maintain'
}

type GoalWithLink = {
  id: string
  client_id: string
  title: string
  target_value: number | null
  current_value: number | null
  progress_percentage: number | null
  status: string | null
  completed_date: string | null
  goal_source_links: GoalSourceLinkRow | GoalSourceLinkRow[] | null
}

function unwrapGoalSourceLink(
  raw: GoalWithLink['goal_source_links']
): GoalSourceLinkRow | null {
  if (raw == null) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

/** Progress 0–100 from current vs target; start always null until a start_value column exists. */
export function computeProgress(
  current: number,
  target: number,
  start: number | null,
  direction: 'increase' | 'decrease' | 'maintain'
): number {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return 0
  if (direction === 'increase') {
    if (start === null || start >= target) {
      if (target <= 0) return 0
      return Math.max(0, Math.min(100, Math.round((current / target) * 100)))
    }
    const denom = target - start
    if (Math.abs(denom) < 1e-9) return 0
    return Math.max(0, Math.min(100, Math.round(((current - start) / denom) * 100)))
  }
  if (direction === 'decrease') {
    if (start === null || start <= target) {
      return current <= target ? 100 : 0
    }
    const denom = start - target
    if (Math.abs(denom) < 1e-9) return 0
    return Math.max(0, Math.min(100, Math.round(((start - current) / denom) * 100)))
  }
  const tolerance = Math.abs(target * 0.05)
  const diff = Math.abs(current - target)
  if (diff <= tolerance) return 100
  const absT = Math.abs(target)
  if (absT < 1e-9) return diff === 0 ? 100 : 0
  return Math.max(0, Math.round(100 - (diff / absT) * 100))
}

function firstDayOfMonthYmd(zonedTodayYmd: string): string {
  const [y, m] = zonedTodayYmd.split('-').map(Number)
  return `${y}-${String(m).padStart(2, '0')}-01`
}

function valuesClose(a: number | null | undefined, b: number | null | undefined): boolean {
  const x = a ?? 0
  const y = b ?? 0
  return Math.abs(x - y) < 1e-6
}

function progressClose(a: number | null | undefined, b: number | null | undefined): boolean {
  const x = a ?? 0
  const y = b ?? 0
  return Math.round(x) === Math.round(y)
}

async function fetchLatestBodyMetricsRow(clientId: string) {
  const { data, error } = await supabaseAdmin
    .from('body_metrics')
    .select('weight_kg, body_fat_percentage, muscle_mass_kg, measured_date')
    .eq('client_id', clientId)
    .order('measured_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') {
    console.error('[goalSync] body_metrics fetch error:', error)
    return null
  }
  return data
}

async function resolveBodyMetricCurrent(
  clientId: string,
  metricField: string,
  latestRow: Awaited<ReturnType<typeof fetchLatestBodyMetricsRow>>
): Promise<number | null> {
  if (!latestRow) return null
  if (metricField === 'weight_kg') {
    const v = latestRow.weight_kg
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
  if (metricField === 'body_fat_percentage') {
    const v = latestRow.body_fat_percentage
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
  if (metricField === 'muscle_mass_kg') {
    const v = latestRow.muscle_mass_kg
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
  return null
}

async function fetchPrMaxByExerciseId(
  clientId: string,
  exerciseIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (exerciseIds.length === 0) return map

  const { data, error } = await supabaseAdmin
    .from('personal_records')
    .select('exercise_id, record_value, is_current_record')
    .eq('client_id', clientId)
    .eq('record_type', 'max_strength')
    .in('exercise_id', exerciseIds)
    .or('is_current_record.is.null,is_current_record.eq.true')

  if (error) {
    console.error('[goalSync] personal_records batch error:', error)
    return map
  }
  for (const row of data || []) {
    const exId = row.exercise_id as string
    const val = row.record_value as number
    if (typeof val !== 'number' || !Number.isFinite(val)) continue
    const prev = map.get(exId)
    if (prev === undefined || val > prev) map.set(exId, val)
  }
  return map
}

async function countWorkoutsSince(clientId: string, startIso: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('workout_logs')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .not('completed_at', 'is', null)
    .gte('completed_at', startIso)

  if (error) {
    console.error('[goalSync] workout_logs count error:', error)
    return 0
  }
  return count ?? 0
}

/**
 * Sync all active goals for a client using goal_source_links.
 * Goals without a source link row are skipped (not counted in totalGoals).
 */
export async function syncGoalsForClient(clientId: string): Promise<GoalSyncClientSummary> {
  const summary: GoalSyncClientSummary = {
    totalGoals: 0,
    syncedGoals: 0,
    skippedGoals: 0,
    errors: [],
  }

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('timezone')
      .eq('id', clientId)
      .maybeSingle()

    if (profileError) {
      console.error('[goalSync] profile timezone error:', profileError)
    }
    const clientTz = normalizeClientTimezone(
      (profile as { timezone?: string | null } | null)?.timezone
    )
    const now = new Date()
    const todayYmd = zonedCalendarDateString(now, clientTz)
    const mondayYmd = mondayYmdOfZonedWeekContaining(now, clientTz)
    const weekStartIso = zonedDayInclusiveUtcBounds(mondayYmd, clientTz).startIso
    const monthFirstYmd = firstDayOfMonthYmd(todayYmd)
    const monthStartIso = zonedDayInclusiveUtcBounds(monthFirstYmd, clientTz).startIso

    const { data: goalRows, error: goalsError } = await supabaseAdmin
      .from('goals')
      .select(
        `
        id,
        client_id,
        title,
        target_value,
        current_value,
        progress_percentage,
        status,
        completed_date,
        goal_source_links (
          source_type,
          source_config,
          direction
        )
      `
      )
      .eq('client_id', clientId)
      .eq('status', 'active')

    if (goalsError) {
      console.error('[goalSync] goals fetch error:', goalsError)
      return summary
    }

    const rows = (goalRows || []) as GoalWithLink[]
    const withLinks = rows
      .map((g) => ({ goal: g, link: unwrapGoalSourceLink(g.goal_source_links) }))
      .filter((x): x is { goal: GoalWithLink; link: GoalSourceLinkRow } => x.link != null)

    summary.totalGoals = withLinks.length

    const needsBodyMetric = withLinks.some((x) => x.link.source_type === 'body_metric')
    const latestBody = needsBodyMetric ? await fetchLatestBodyMetricsRow(clientId) : null

    const prExerciseIds = new Set<string>()
    for (const { link } of withLinks) {
      if (link.source_type !== 'personal_record') continue
      const cfg = link.source_config as { exercise_id?: string }
      if (cfg.exercise_id && typeof cfg.exercise_id === 'string') {
        prExerciseIds.add(cfg.exercise_id)
      }
    }
    const prMap = await fetchPrMaxByExerciseId(clientId, Array.from(prExerciseIds))

    const needsWeeklyCount = withLinks.some(
      (x) =>
        x.link.source_type === 'workout_count' &&
        (x.link.source_config as { window?: string }).window === 'weekly'
    )
    const needsMonthlyCount = withLinks.some(
      (x) =>
        x.link.source_type === 'workout_count' &&
        (x.link.source_config as { window?: string }).window === 'monthly'
    )

    let weeklyWorkoutCount = 0
    let monthlyWorkoutCount = 0
    if (needsWeeklyCount) {
      weeklyWorkoutCount = await countWorkoutsSince(clientId, weekStartIso)
    }
    if (needsMonthlyCount) {
      monthlyWorkoutCount = await countWorkoutsSince(clientId, monthStartIso)
    }

    for (const { goal, link } of withLinks) {
      const goalId = goal.id
      const sourceType = link.source_type

      try {
        if (sourceType === 'manual') {
          summary.skippedGoals += 1
          continue
        }

        let currentValue: number | null = null

        if (sourceType === 'body_metric') {
          const field = (link.source_config as { metric_field?: string }).metric_field
          if (
            field !== 'weight_kg' &&
            field !== 'body_fat_percentage' &&
            field !== 'muscle_mass_kg'
          ) {
            summary.errors.push({
              goalId,
              error: `body_metric: invalid metric_field in source_config`,
            })
            continue
          }
          currentValue = await resolveBodyMetricCurrent(clientId, field, latestBody)
        } else if (sourceType === 'personal_record') {
          const exId = (link.source_config as { exercise_id?: string }).exercise_id
          if (!exId || typeof exId !== 'string') {
            summary.errors.push({ goalId, error: 'personal_record: missing exercise_id' })
            continue
          }
          const v = prMap.get(exId)
          currentValue = v !== undefined ? v : null
        } else if (sourceType === 'workout_count') {
          const window = (link.source_config as { window?: string }).window
          if (window === 'weekly') currentValue = weeklyWorkoutCount
          else if (window === 'monthly') currentValue = monthlyWorkoutCount
          else {
            summary.errors.push({
              goalId,
              error: `workout_count: invalid window (expected weekly|monthly)`,
            })
            continue
          }
        } else if (sourceType === 'wellness_field') {
          console.warn(`[goalSync] wellness_field not yet implemented for goal ${goalId}`)
          summary.skippedGoals += 1
          continue
        } else if (sourceType === 'meal_plan') {
          console.warn(`[goalSync] meal_plan not yet implemented for goal ${goalId}`)
          summary.skippedGoals += 1
          continue
        } else {
          summary.errors.push({ goalId, error: `unknown source_type: ${sourceType}` })
          continue
        }

        if (currentValue === null) {
          summary.skippedGoals += 1
          continue
        }

        const target = goal.target_value
        const direction = link.direction
        let progressPct = 0
        if (target != null && Number.isFinite(Number(target))) {
          progressPct = computeProgress(
            currentValue,
            Number(target),
            null,
            direction
          )
        }

        const completed =
          progressPct >= 100 && goal.status !== 'completed'
        const todayDate = new Date().toISOString().split('T')[0]
        const newCompletedDate =
          completed && !goal.completed_date ? todayDate : goal.completed_date
        const newStatus =
          progressPct >= 100 && goal.status !== 'completed' ? 'completed' : goal.status

        const curUnchanged = valuesClose(goal.current_value, currentValue)
        const progUnchanged = progressClose(goal.progress_percentage, progressPct)
        const statusUnchanged = newStatus === goal.status
        const completedDateUnchanged =
          (newCompletedDate || null) === (goal.completed_date || null)

        if (curUnchanged && progUnchanged && statusUnchanged && completedDateUnchanged) {
          summary.skippedGoals += 1
          continue
        }

        const updatePayload: Record<string, unknown> = {
          current_value: currentValue,
          progress_percentage: progressPct,
          updated_at: new Date().toISOString(),
        }
        if (newStatus !== goal.status) updatePayload.status = newStatus
        if (newCompletedDate !== goal.completed_date) {
          updatePayload.completed_date = newCompletedDate
        }

        const { error: updErr } = await supabaseAdmin
          .from('goals')
          .update(updatePayload)
          .eq('id', goalId)

        if (updErr) {
          summary.errors.push({ goalId, error: updErr.message })
          continue
        }

        summary.syncedGoals += 1
      } catch (e) {
        summary.errors.push({
          goalId,
          error: e instanceof Error ? e.message : String(e),
        })
      }
    }

    return summary
  } catch (e) {
    console.error('[goalSync] syncGoalsForClient fatal:', e)
    return summary
  }
}

// ============================================
// RESET LOGIC (weekly / daily — still title-based for reset windows)
// ============================================

/**
 * Reset weekly consistency goals
 * Called every Sunday night or Monday morning
 */
export async function resetWeeklyGoals(clientId: string): Promise<void> {
  try {
    const { data: weeklyGoals, error } = await supabaseAdmin
      .from('goals')
      .select('id, title, category')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .or('title.ilike.%Workout Consistency%,title.ilike.%Nutrition Tracking%')

    if (error) {
      console.error('Error fetching weekly goals:', error)
      return
    }

    if (!weeklyGoals || weeklyGoals.length === 0) {
      return
    }

    for (const goal of weeklyGoals) {
      await supabaseAdmin
        .from('goals')
        .update({
          current_value: 0,
          progress_percentage: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goal.id)
    }

    console.log(`Reset ${weeklyGoals.length} weekly goals for client ${clientId}`)
  } catch (error) {
    console.error('Error resetting weekly goals:', error)
  }
}

/**
 * Reset daily goals
 * Called every day at midnight for goals like water intake
 */
export async function resetDailyGoals(clientId: string): Promise<void> {
  try {
    const { data: dailyGoals, error } = await supabaseAdmin
      .from('goals')
      .select('id')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .ilike('title', '%Water Intake%')

    if (error) {
      console.error('Error fetching daily goals:', error)
      return
    }

    if (!dailyGoals || dailyGoals.length === 0) {
      return
    }

    for (const goal of dailyGoals) {
      await supabaseAdmin
        .from('goals')
        .update({
          current_value: 0,
          progress_percentage: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goal.id)
    }

    console.log(`Reset ${dailyGoals.length} daily goals for client ${clientId}`)
  } catch (error) {
    console.error('Error resetting daily goals:', error)
  }
}

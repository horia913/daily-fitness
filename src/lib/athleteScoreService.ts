/**
 * Athlete Score Service
 * Rolling 28-day (4×7) weighted score: program completion, check-ins, optional nutrition.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AthleteScore } from '@/types/athleteScore'

const WEEK_WEIGHTS = [0.5, 0.17, 0.17, 0.16] as const

type WeekBounds = { start: Date; end: Date; startYmd: string; endYmd: string }

function utcDayBoundsFromOffset(endOffsetFromToday: number): WeekBounds {
  const today = new Date()
  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - endOffsetFromToday, 23, 59, 59, 999)
  )
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - endOffsetFromToday - 6, 0, 0, 0, 0)
  )
  const toYmd = (d: Date) => d.toISOString().split('T')[0]
  return { start, end, startYmd: toYmd(start), endYmd: toYmd(end) }
}

/** Rolling week k: 0 = most recent 7 days, 1 = previous, … */
function rollingWeekBounds(k: number): WeekBounds {
  return utcDayBoundsFromOffset(7 * k)
}

/** Active meal plan assignment or legacy assigned_meal_plans row. */
export async function isClientNutritionConfigured(
  clientId: string,
  sb: SupabaseClient
): Promise<boolean> {
  const { data: mpa } = await sb
    .from('meal_plan_assignments')
    .select('id')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (mpa) return true

  const { data: amp } = await sb
    .from('assigned_meal_plans')
    .select('id')
    .eq('client_id', clientId)
    .limit(1)
    .maybeSingle()
  return !!amp
}

async function fetchDistinctProgramWeekNumbers(
  programId: string,
  sb: SupabaseClient
): Promise<number[]> {
  const { data, error } = await sb
    .from('program_schedule')
    .select('week_number')
    .eq('program_id', programId)
  if (error || !data?.length) return []
  return [...new Set(data.map((r) => r.week_number as number))].sort((a, b) => a - b)
}

async function fetchActiveProgramContext(
  clientId: string,
  sb: SupabaseClient
): Promise<{
  paId: string
  programId: string
  ppWeek: number
} | null> {
  const { data: pa, error } = await sb
    .from('program_assignments')
    .select('id, program_id')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !pa?.id || !pa.program_id) return null

  const { data: pp } = await sb
    .from('program_progress')
    .select('current_week_number')
    .eq('program_assignment_id', pa.id)
    .maybeSingle()

  return {
    paId: pa.id,
    programId: pa.program_id,
    ppWeek: pp?.current_week_number ?? 1,
  }
}

function resolveProgramWeekForLag(
  sortedWeeks: number[],
  currentWeek1Based: number,
  lag: number
): number | null {
  if (!sortedWeeks.length) return null
  const idx = currentWeek1Based - 1 - lag
  if (idx < 0) return null
  if (idx >= sortedWeeks.length) return sortedWeeks[sortedWeeks.length - 1]
  return sortedWeeks[idx] ?? null
}

async function programScoreForWeek(
  clientId: string,
  sb: SupabaseClient,
  ctx: { paId: string; programId: string },
  resolvedWeekNumber: number | null,
  bounds: WeekBounds
): Promise<number> {
  if (resolvedWeekNumber == null) return 100

  const { data: slots } = await sb
    .from('program_schedule')
    .select('id')
    .eq('program_id', ctx.programId)
    .eq('week_number', resolvedWeekNumber)

  const slotIds = (slots ?? []).map((s) => s.id).filter(Boolean)
  const scheduled = slotIds.length
  if (scheduled === 0) return 100

  const { data: sessions } = await sb
    .from('workout_sessions')
    .select('id, program_schedule_id, completed_at')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .eq('program_assignment_id', ctx.paId)
    .gte('completed_at', bounds.start.toISOString())
    .lte('completed_at', bounds.end.toISOString())

  const set = new Set(slotIds)
  const completed = (sessions ?? []).filter(
    (s) => s.program_schedule_id && set.has(s.program_schedule_id)
  ).length

  return Math.min(100, Math.round((completed / scheduled) * 100))
}

async function checkinScoreForWeek(
  clientId: string,
  sb: SupabaseClient,
  bounds: WeekBounds
): Promise<number> {
  const { data, error } = await sb
    .from('daily_wellness_logs')
    .select('log_date')
    .eq('client_id', clientId)
    .gte('log_date', bounds.startYmd)
    .lte('log_date', bounds.endYmd)
    .not('sleep_hours', 'is', null)

  if (error || !data?.length) return 0
  const days = new Set(data.map((r) => r.log_date as string))
  return Math.round((days.size / 7) * 100)
}

async function nutritionScoreForWeek(
  clientId: string,
  sb: SupabaseClient,
  bounds: WeekBounds
): Promise<number> {
  const { data, error } = await sb
    .from('meal_completions')
    .select('completed_at')
    .eq('client_id', clientId)
    .gte('completed_at', bounds.start.toISOString())
    .lte('completed_at', bounds.end.toISOString())

  if (error || !data?.length) return 0

  const days = new Set<string>()
  for (const row of data) {
    const d = row.completed_at as string
    if (d) days.add(d.split('T')[0])
  }
  return Math.min(100, Math.round((days.size / 7) * 100))
}

function getTier(score: number): AthleteScore['tier'] {
  if (score >= 90) return 'beast_mode'
  if (score >= 75) return 'locked_in'
  if (score >= 55) return 'showing_up'
  if (score >= 35) return 'slipping'
  return 'benched'
}

/**
 * Calculate athlete score (rolling 28 days, 4 weighted weeks).
 */
export async function calculateAthleteScore(
  clientId: string,
  supabaseAdmin: SupabaseClient
): Promise<AthleteScore> {
  const nutritionOn = await isClientNutritionConfigured(clientId, supabaseAdmin)
  const programW = nutritionOn ? 0.65 : 0.75
  const checkinW = 0.25
  const nutritionW = nutritionOn ? 0.1 : 0

  const ctxRaw = await fetchActiveProgramContext(clientId, supabaseAdmin)
  let sortedWeeks: number[] = []
  if (ctxRaw) {
    sortedWeeks = await fetchDistinctProgramWeekNumbers(ctxRaw.programId, supabaseAdmin)
  }
  const ctx = ctxRaw && sortedWeeks.length ? ctxRaw : null

  const weekProgramScores: number[] = []
  const weekCheckinScores: number[] = []
  const weekNutritionScores: number[] = []

  for (let k = 0; k < 4; k++) {
    const bounds = rollingWeekBounds(k)
    let pScore = 0
    if (ctx && sortedWeeks.length) {
      const resolved = resolveProgramWeekForLag(sortedWeeks, ctx.ppWeek, k)
      pScore = await programScoreForWeek(clientId, supabaseAdmin, ctx, resolved, bounds)
    }
    weekProgramScores.push(pScore)
    weekCheckinScores.push(await checkinScoreForWeek(clientId, supabaseAdmin, bounds))
    weekNutritionScores.push(
      nutritionOn ? await nutritionScoreForWeek(clientId, supabaseAdmin, bounds) : 0
    )
  }

  const currentProgramScore = ctx ? weekProgramScores[0] : 0
  const currentCheckinScore = weekCheckinScores[0]
  const currentNutritionScore = nutritionOn ? weekNutritionScores[0] : 0

  let totalScore: number
  let finalWeighted: number

  if (!ctx) {
    finalWeighted = 0
    for (let k = 0; k < 4; k++) {
      finalWeighted += weekCheckinScores[k] * WEEK_WEIGHTS[k]
    }
    totalScore = Math.round(Math.min(100, Math.max(0, finalWeighted)))
  } else {
    finalWeighted = 0
    for (let k = 0; k < 4; k++) {
      const w =
        weekProgramScores[k] * programW +
        weekCheckinScores[k] * checkinW +
        (nutritionOn ? weekNutritionScores[k] * nutritionW : 0)
      finalWeighted += w * WEEK_WEIGHTS[k]
    }
    totalScore = Math.round(Math.min(100, Math.max(0, finalWeighted)))
  }

  const tier = getTier(totalScore)

  const today = new Date()
  const windowEnd = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0)
  )
  const windowStart = new Date(windowEnd)
  windowStart.setUTCDate(windowStart.getUTCDate() - 27)
  const windowStartStr = windowStart.toISOString().split('T')[0]
  const windowEndStr = windowEnd.toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('athlete_scores')
    .upsert(
      {
        client_id: clientId,
        score: totalScore,
        tier,
        workout_completion_score: currentProgramScore,
        program_adherence_score: totalScore,
        checkin_completion_score: currentCheckinScore,
        goal_progress_score: 0,
        nutrition_compliance_score: nutritionOn ? currentNutritionScore : 0,
        window_start: windowStartStr,
        window_end: windowEndStr,
        calculated_at: new Date().toISOString(),
      },
      {
        onConflict: 'client_id,window_start,window_end',
      }
    )
    .select()
    .single()

  if (error) {
    console.error('[athleteScoreService] Error upserting score:', error)
    throw new Error(`Failed to save athlete score: ${error.message}`)
  }

  return data as AthleteScore
}

export async function getLatestAthleteScore(
  clientId: string,
  supabase: SupabaseClient
): Promise<AthleteScore | null> {
  const { data, error } = await supabase
    .from('athlete_scores')
    .select('*')
    .eq('client_id', clientId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[athleteScoreService] Error fetching latest score:', error)
    return null
  }

  return data as AthleteScore | null
}

export async function getAthleteScoreHistory(
  clientId: string,
  supabase: SupabaseClient,
  limit = 12
): Promise<{ date: string; score: number }[]> {
  const { data, error } = await supabase
    .from('athlete_scores')
    .select('score, calculated_at')
    .eq('client_id', clientId)
    .order('calculated_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data
    .map((row) => ({
      date: (row.calculated_at as string).split('T')[0],
      score: row.score as number,
    }))
    .reverse()
}

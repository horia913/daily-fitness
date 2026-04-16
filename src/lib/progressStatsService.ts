/**
 * Progress Stats Service
 * Centralized service for fetching progress statistics
 * 
 * UPDATED: Now uses same data sources as client dashboard for consistency
 */

import { supabase } from './supabase'
import { getWeeklyGoal, getCurrentWeekCompletedWorkouts, getStreak } from './programService'
import { getClientRank } from './leaderboardService'
import { AchievementService } from './achievementService'
import { BodyMetricsService } from './progressTrackingService'
import { fetchPersonalRecords } from './personalRecords'
import { getNutritionComplianceTrend } from './nutritionLogService'
import { dbToUiScale } from './wellnessService'

export interface ProgressStats {
  weeklyWorkouts: {
    completed: number
    goal: number
  }
  streak: number
  totalWorkouts: number
  personalRecords: number
  leaderboardRank: number
  totalAthletes: number
  achievementsUnlocked: number
  achievementsInProgress: number
  currentWeight: number | null
  weightChange: number // negative = lost, positive = gained
  volumeThisWeek: number
  volumeLastWeek: number
  /** Best (minimum) rank across all leaderboard entries for this client */
  bestLeaderboardRank: number | null
}

// Export for compatibility with page component
export type { ProgressStats as ProgressStatsType }

/**
 * Get total volume (sum of weight * reps) for a given week (Monday 00:00 to Sunday 23:59).
 */
async function getVolumeForWeek(clientId: string, monday: Date): Promise<number> {
  try {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const mondayISO = monday.toISOString()
    const sundayISO = sunday.toISOString()

    const { data: logs, error: logsError } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('client_id', clientId)
      .not('completed_at', 'is', null)
      .gte('completed_at', mondayISO)
      .lte('completed_at', sundayISO)

    if (logsError || !logs || logs.length === 0) return 0
    const logIds = logs.map((r) => r.id)

    const { data: sets, error: setsError } = await supabase
      .from('workout_set_logs')
      .select('weight, reps')
      .in('workout_log_id', logIds)
      .eq('client_id', clientId)

    if (setsError || !sets) return 0
    return sets.reduce((sum, row) => {
      const w = Number(row.weight) || 0
      const r = Number(row.reps) || 0
      return sum + w * r
    }, 0)
  } catch (error) {
    console.error('Error in getVolumeForWeek:', error)
    return 0
  }
}

/**
 * Get all progress stats for a client
 */
export async function getProgressStats(clientId: string): Promise<ProgressStats> {
  try {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() + diffToMonday)
    thisMonday.setHours(0, 0, 0, 0)
    const lastMonday = new Date(thisMonday)
    lastMonday.setDate(thisMonday.getDate() - 7)

    // Fetch all stats in parallel for better performance
    const [
      weeklyGoal,
      weeklyCompleted,
      streak,
      totalWorkouts,
      personalRecordsData,
      leaderboardRank,
      totalAthletes,
      achievementsUnlocked,
      achievementsInProgress,
      bodyMetrics,
      volumeThisWeek,
      volumeLastWeek,
      bestLeaderboardRank,
    ] = await Promise.all([
      getWeeklyGoal(clientId),
      getCurrentWeekCompletedWorkouts(clientId),
      getStreak(clientId),
      getTotalWorkouts(clientId),
      fetchPersonalRecords(clientId), // Use same function as dashboard for consistency
      getLeaderboardRank(clientId),
      getTotalAthletes(),
      AchievementService.getUnlockedAchievementsCount(clientId),
      AchievementService.getAchievementsInProgressCount(clientId),
      BodyMetricsService.getClientMetrics(clientId),
      getVolumeForWeek(clientId, thisMonday),
      getVolumeForWeek(clientId, lastMonday),
      getBestLeaderboardRank(clientId),
    ])

    // Get current weight and weight change
    const currentWeight = bodyMetrics.length > 0 ? bodyMetrics[0].weight_kg ?? null : null
    const weightChange = calculateWeightChange(bodyMetrics)

    return {
      weeklyWorkouts: {
        completed: weeklyCompleted,
        goal: weeklyGoal ?? 0
      },
      streak,
      totalWorkouts,
      personalRecords: personalRecordsData.length, // Count from dynamic calculation
      leaderboardRank: leaderboardRank?.rank ?? 0,
      totalAthletes,
      achievementsUnlocked,
      achievementsInProgress,
      currentWeight, // Keep null as null so UI can show "—" when no data
      weightChange,
      volumeThisWeek,
      volumeLastWeek,
      bestLeaderboardRank,
    }
  } catch (error) {
    console.error('Error fetching progress stats:', error)
    // Return zero/default values on error instead of throwing
    return {
      weeklyWorkouts: { completed: 0, goal: 0 },
      streak: 0,
      totalWorkouts: 0,
      personalRecords: 0,
      leaderboardRank: 0,
      totalAthletes: 0,
      achievementsUnlocked: 0,
      achievementsInProgress: 0,
      currentWeight: null,
      weightChange: 0,
      volumeThisWeek: 0,
      volumeLastWeek: 0,
      bestLeaderboardRank: null,
    }
  }
}

/**
 * Get total completed workouts count
 */
async function getTotalWorkouts(clientId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('workout_logs')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)

    if (error) {
      console.error('Error fetching total workouts:', error)
      return 0
    }

    return count ?? 0
  } catch (error) {
    console.error('Error in getTotalWorkouts:', error)
    return 0
  }
}

/**
 * Get personal records count
 */
async function getPersonalRecordsCount(clientId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('personal_records')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)

    if (error) {
      console.error('Error fetching personal records count:', error)
      return 0
    }

    return count ?? 0
  } catch (error) {
    console.error('Error in getPersonalRecordsCount:', error)
    return 0
  }
}

/**
 * Get client's leaderboard rank (using default leaderboard type and time window)
 */
async function getLeaderboardRank(clientId: string): Promise<{ rank: number } | null> {
  try {
    // Use a default leaderboard type (e.g., 'pr_1rm' with 'this_month' time window)
    // This matches what the progress hub might display
    const rank = await getClientRank(clientId, 'pr_1rm', undefined, 'this_month')
    return rank ? { rank: rank.rank } : null
  } catch (error) {
    console.error('Error fetching leaderboard rank:', error)
    return null
  }
}

/**
 * Get best (minimum) leaderboard rank across all entries for this client.
 */
async function getBestLeaderboardRank(clientId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('rank')
      .eq('client_id', clientId)
    if (error || !data || data.length === 0) return null
    const minRank = Math.min(...data.map((r) => r.rank))
    return minRank
  } catch (error) {
    console.error('Error fetching best leaderboard rank:', error)
    return null
  }
}

/**
 * Get total athletes count (total unique clients in leaderboard entries)
 */
async function getTotalAthletes(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('leaderboard_entries')
      .select('client_id', { count: 'exact', head: true })

    if (error) {
      console.error('Error fetching total athletes:', error)
      return 0
    }

    // Get distinct count of clients
    const { data, error: distinctError } = await supabase
      .from('leaderboard_entries')
      .select('client_id')
      .limit(10000) // Large limit to get all entries

    if (distinctError) {
      console.error('Error fetching distinct athletes:', distinctError)
      return count ?? 0
    }

    const uniqueClients = new Set(data?.map(entry => entry.client_id) || [])
    return uniqueClients.size
  } catch (error) {
    console.error('Error in getTotalAthletes:', error)
    return 0
  }
}

/**
 * Calculate weight change (current month vs previous month)
 * Returns negative number if weight lost, positive if gained
 */
function calculateWeightChange(metrics: any[]): number {
  if (metrics.length < 2) {
    return 0
  }

  // Metrics are already sorted by measured_date DESC (most recent first)
  const current = metrics[0]
  const previous = metrics[1]

  const currentWeight = current.weight_kg
  const previousWeight = previous.weight_kg

  if (!currentWeight || !previousWeight) {
    return 0
  }

  // Calculate change (negative = lost, positive = gained)
  const change = currentWeight - previousWeight
  return Math.round(change * 10) / 10 // Round to 1 decimal place
}

export interface MonthSummary {
  workouts: number
  volume: number
  avgDurationMinutes: number | null
  checkIns: number
  newPRs: number
  weightChange: number | null // first vs last weight in month; null if not enough data
  achievements: number
}

export interface MonthlyProgressSummary {
  thisMonth: MonthSummary
  lastMonth: MonthSummary | null
  isFirstMonth: boolean
}

function getMonthBounds(year: number, month: number): { first: string; last: string } {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  return {
    first: first.toISOString().split('T')[0],
    last: last.toISOString().split('T')[0],
  }
}

/**
 * Get aggregates for a single calendar month.
 */
async function getMonthSummary(clientId: string, first: string, last: string): Promise<MonthSummary> {
  const firstISO = `${first}T00:00:00.000Z`
  const lastISO = `${last}T23:59:59.999Z`

  const [workoutsRes, logsRes, checkInsRes, prsRes, bodyRes, achievementsRes] = await Promise.all([
    supabase.from('workout_logs').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('completed_at', 'is', null).gte('completed_at', firstISO).lte('completed_at', lastISO),
    supabase.from('workout_logs').select('id, total_duration_minutes').eq('client_id', clientId).not('completed_at', 'is', null).gte('completed_at', firstISO).lte('completed_at', lastISO),
    supabase.from('daily_wellness_logs').select('id', { count: 'exact', head: true }).eq('client_id', clientId).gte('log_date', first).lte('log_date', last),
    supabase.from('personal_records').select('id', { count: 'exact', head: true }).eq('client_id', clientId).gte('achieved_date', first).lte('achieved_date', last),
    supabase.from('body_metrics').select('measured_date, weight_kg').eq('client_id', clientId).gte('measured_date', first).lte('measured_date', last).order('measured_date', { ascending: true }),
    supabase.from('user_achievements').select('id', { count: 'exact', head: true }).eq('client_id', clientId).gte('achieved_date', first).lte('achieved_date', last),
  ])

  const workouts = workoutsRes.count ?? 0
  const logsData = (logsRes.data ?? []) as { id: string; total_duration_minutes: number | null }[]
  const logIds = logsData.map((r) => r.id)
  let volume = 0
  if (logIds.length > 0) {
    const { data: sets } = await supabase.from('workout_set_logs').select('weight, reps').in('workout_log_id', logIds).eq('client_id', clientId)
    volume = (sets ?? []).reduce((sum, row) => sum + (Number(row.weight) || 0) * (Number(row.reps) || 0), 0)
  }
  const durationSum = logsData.reduce((s, r) => s + (Number(r.total_duration_minutes) || 0), 0)
  const avgDurationMinutes = logsData.length > 0 ? Math.round(durationSum / logsData.length) : null
  const checkIns = checkInsRes.count ?? 0
  const newPRs = prsRes.count ?? 0
  const achievements = achievementsRes.count ?? 0

  const bodyMetrics = (bodyRes.data ?? []) as { measured_date: string; weight_kg: number | null }[]
  let weightChange: number | null = null
  if (bodyMetrics.length >= 2) {
    const firstWeight = bodyMetrics[0].weight_kg
    const lastWeight = bodyMetrics[bodyMetrics.length - 1].weight_kg
    if (firstWeight != null && lastWeight != null) weightChange = Math.round((lastWeight - firstWeight) * 10) / 10
  }

  return { workouts, volume, avgDurationMinutes, checkIns, newPRs, weightChange, achievements }
}

/** Scannable month snapshot for Progress Hub (stats + weekly workout bars). */
export interface ProgressMonthHubSnapshot {
  monthYearLabel: string
  workouts: number
  totalDurationMinutes: number
  volumeKg: number
  newPRs: number
  streakDays: number
  weeklyWorkoutCounts: number[]
  currentWeekIndex: number
}

/**
 * Current calendar month aggregates + per-week workout counts (local calendar weeks: days 1–7 → W1, etc.).
 * Workouts/volume/duration from `workout_logs` + `workout_set_logs`; PRs from `personal_records.achieved_date`;
 * streak from `getStreak` (same as dashboard).
 */
export async function getProgressMonthHubSnapshot(
  clientId: string
): Promise<ProgressMonthHubSnapshot> {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const { first, last } = getMonthBounds(y, m)
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const numWeeks = Math.ceil(daysInMonth / 7)
  const firstISO = `${first}T00:00:00.000Z`
  const lastISO = `${last}T23:59:59.999Z`
  const monthYearLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const currentWeekIndex = Math.min(
    Math.max(numWeeks - 1, 0),
    Math.floor((now.getDate() - 1) / 7)
  )

  try {
    const [logsRes, streak, prsRes] = await Promise.all([
      supabase
        .from('workout_logs')
        .select('id, completed_at, total_duration_minutes')
        .eq('client_id', clientId)
        .not('completed_at', 'is', null)
        .gte('completed_at', firstISO)
        .lte('completed_at', lastISO),
      getStreak(clientId),
      supabase
        .from('personal_records')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .gte('achieved_date', first)
        .lte('achieved_date', last),
    ])

    const logs = (logsRes.data ?? []) as {
      id: string
      completed_at: string
      total_duration_minutes: number | null
    }[]

    const weeklyWorkoutCounts = Array.from({ length: numWeeks }, () => 0)
    const inMonth = logs.filter((log) => {
      const d = new Date(log.completed_at)
      return d.getFullYear() === y && d.getMonth() === m
    })

    for (const log of inMonth) {
      const day = new Date(log.completed_at).getDate()
      const wi = Math.floor((day - 1) / 7)
      const idx = Math.min(numWeeks - 1, Math.max(0, wi))
      weeklyWorkoutCounts[idx] += 1
    }

    const workouts = inMonth.length
    const totalDurationMinutes = inMonth.reduce(
      (s, r) => s + (Number(r.total_duration_minutes) || 0),
      0
    )

    let volumeKg = 0
    const logIds = inMonth.map((r) => r.id)
    if (logIds.length > 0) {
      const { data: sets } = await supabase
        .from('workout_set_logs')
        .select('weight, reps')
        .in('workout_log_id', logIds)
        .eq('client_id', clientId)
      volumeKg = (sets ?? []).reduce(
        (sum, row) => sum + (Number(row.weight) || 0) * (Number(row.reps) || 0),
        0
      )
    }

    const newPRs = prsRes.count ?? 0

    return {
      monthYearLabel,
      workouts,
      totalDurationMinutes,
      volumeKg,
      newPRs,
      streakDays: streak,
      weeklyWorkoutCounts,
      currentWeekIndex,
    }
  } catch (error) {
    console.error('Error in getProgressMonthHubSnapshot:', error)
    return {
      monthYearLabel,
      workouts: 0,
      totalDurationMinutes: 0,
      volumeKg: 0,
      newPRs: 0,
      streakDays: 0,
      weeklyWorkoutCounts: Array.from({ length: numWeeks }, () => 0),
      currentWeekIndex,
    }
  }
}

/**
 * Get monthly progress summary for Progress Hub "This month" card.
 */
export async function getMonthlyProgressSummary(clientId: string): Promise<MonthlyProgressSummary> {
  try {
    const now = new Date()
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth()
    const { first: thisFirst, last: thisLast } = getMonthBounds(thisYear, thisMonth)
    const thisSummary = await getMonthSummary(clientId, thisFirst, thisLast)

    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear
    const { first: lastFirst, last: lastLast } = getMonthBounds(lastYear, lastMonth)
    const lastSummary = await getMonthSummary(clientId, lastFirst, lastLast)

    const isFirstMonth = lastSummary.workouts === 0 && lastSummary.checkIns === 0 && lastSummary.newPRs === 0 && lastSummary.achievements === 0
    return {
      thisMonth: thisSummary,
      lastMonth: isFirstMonth ? null : lastSummary,
      isFirstMonth,
    }
  } catch (error) {
    console.error('Error in getMonthlyProgressSummary:', error)
    const now = new Date()
    const { first, last } = getMonthBounds(now.getFullYear(), now.getMonth())
    const empty = await getMonthSummary(clientId, first, last)
    return { thisMonth: empty, lastMonth: null, isFirstMonth: true }
  }
}

export interface MonthlyNarrativeData {
  prNames: string[]
  achievementNames: string[]
  avgSleep: number | null
  avgStress: number | null
  nutritionAdherencePct: number | null
}

export async function getMonthlyNarrativeData(clientId: string): Promise<MonthlyNarrativeData> {
  try {
    const now = new Date()
    const { first, last } = getMonthBounds(now.getFullYear(), now.getMonth())
    const [prsRes, achievementsRes, wellnessRes, trend] = await Promise.all([
      supabase.from('personal_records').select('exercises(name)').eq('client_id', clientId).gte('achieved_date', first).lte('achieved_date', last),
      supabase.from('user_achievements').select('achievement_templates(name)').eq('client_id', clientId).gte('achieved_date', first).lte('achieved_date', last),
      supabase.from('daily_wellness_logs').select('sleep_quality, stress_level').eq('client_id', clientId).gte('log_date', first).lte('log_date', last),
      getNutritionComplianceTrend(clientId, first, last),
    ])
    const prRows = (prsRes.data ?? []) as unknown as { exercises?: { name?: string } | { name?: string }[] }[];
    const achievementRows = (achievementsRes.data ?? []) as unknown as { achievement_templates?: { name?: string } | { name?: string }[] }[];
    const prNames = [...new Set(prRows.map((r) => (Array.isArray(r.exercises) ? r.exercises[0]?.name : r.exercises?.name)).filter(Boolean) as string[])]
    const achievementNames = [...new Set(achievementRows.map((r) => (Array.isArray(r.achievement_templates) ? r.achievement_templates[0]?.name : r.achievement_templates?.name)).filter(Boolean) as string[])]
    const wellnessRows = (wellnessRes.data ?? []) as { sleep_quality: number | null; stress_level: number | null }[]
    let avgSleep: number | null = null
    let avgStress: number | null = null
    if (wellnessRows.length > 0) {
      const sleepVals = wellnessRows.map((r) => dbToUiScale(r.sleep_quality)).filter((v): v is number => v != null)
      const stressVals = wellnessRows.map((r) => dbToUiScale(r.stress_level)).filter((v): v is number => v != null)
      avgSleep = sleepVals.length > 0 ? Math.round((sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length) * 10) / 10 : null
      avgStress = stressVals.length > 0 ? Math.round((stressVals.reduce((a, b) => a + b, 0) / stressVals.length) * 10) / 10 : null
    }
    let nutritionAdherencePct: number | null = null
    if (trend.length > 0) nutritionAdherencePct = Math.round(trend.reduce((s, d) => s + d.compliance, 0) / trend.length)
    return { prNames, achievementNames, avgSleep, avgStress, nutritionAdherencePct }
  } catch (e) {
    console.error('Error in getMonthlyNarrativeData:', e)
    return { prNames: [], achievementNames: [], avgSleep: null, avgStress: null, nutritionAdherencePct: null }
  }
}

export interface MilestoneData {
  totalWorkouts: number
  streak: number
  lastMonthVolume: number
  maxVolumeLast24Months: number
  weightLostKg: number
}

export async function getMilestoneData(clientId: string): Promise<MilestoneData> {
  try {
    const [stats, summary, bodyMetrics] = await Promise.all([
      getProgressStats(clientId),
      getMonthlyProgressSummary(clientId),
      BodyMetricsService.getClientMetrics(clientId),
    ])
    const lastMonthVolume = summary?.lastMonth?.volume ?? 0
    const thisMonthVolume = summary?.thisMonth?.volume ?? 0
    const maxVolumeLast24Months = Math.max(lastMonthVolume, thisMonthVolume)
    let weightLostKg = 0
    if (bodyMetrics.length >= 2) {
      const a = bodyMetrics[bodyMetrics.length - 1].weight_kg ?? 0
      const b = bodyMetrics[0].weight_kg ?? 0
      if (a > b) weightLostKg = Math.round((a - b) * 10) / 10
    }
    return {
      totalWorkouts: stats.totalWorkouts,
      streak: stats.streak,
      lastMonthVolume,
      maxVolumeLast24Months,
      weightLostKg,
    }
  } catch (e) {
    console.error('Error in getMilestoneData:', e)
    return { totalWorkouts: 0, streak: 0, lastMonthVolume: 0, maxVolumeLast24Months: 0, weightLostKg: 0 }
  }
}
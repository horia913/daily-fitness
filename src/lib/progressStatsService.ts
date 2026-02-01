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
}

// Export for compatibility with page component
export type { ProgressStats as ProgressStatsType }

/**
 * Get all progress stats for a client
 */
export async function getProgressStats(clientId: string): Promise<ProgressStats> {
  try {
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
      bodyMetrics
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
      BodyMetricsService.getClientMetrics(clientId)
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
      weightChange
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
      weightChange: 0
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
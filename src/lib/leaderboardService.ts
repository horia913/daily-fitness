/**
 * Leaderboard Service
 * Handles PR rankings, BW multiples, and tonnage leaderboards with privacy controls
 */

import { supabase } from './supabase';

export interface LeaderboardEntry {
  id: string;
  client_id: string;
  leaderboard_type: string;
  exercise_id?: string | null;
  rank: number;
  score: number;
  time_window?: string | null;
  display_name: string;
  is_anonymous: boolean;
  last_updated: string;
}

export type LeaderboardType = 'pr_1rm' | 'pr_3rm' | 'pr_5rm' | 'bw_multiple' | 'tonnage_week' | 'tonnage_month' | 'tonnage_all_time';
export type TimeWindow = 'this_week' | 'this_month' | 'all_time';

/**
 * Get leaderboard rankings
 */
export async function getLeaderboard(
  type: LeaderboardType,
  exerciseId?: string,
  timeWindow: TimeWindow = 'this_month',
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  try {
    let query = supabase
      .from('leaderboard_entries')
      .select('*')
      .eq('leaderboard_type', type)
      .order('rank', { ascending: true })
      .limit(limit);

    if (exerciseId) {
      query = query.eq('exercise_id', exerciseId);
    }

    if (timeWindow) {
      query = query.eq('time_window', timeWindow);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLeaderboard:', error);
    return [];
  }
}

/**
 * Get client's position on leaderboard
 */
export async function getClientRank(
  clientId: string,
  type: LeaderboardType,
  exerciseId?: string,
  timeWindow: TimeWindow = 'this_month'
): Promise<LeaderboardEntry | null> {
  try {
    let query = supabase
      .from('leaderboard_entries')
      .select('*')
      .eq('client_id', clientId)
      .eq('leaderboard_type', type);

    if (exerciseId) {
      query = query.eq('exercise_id', exerciseId);
    }

    if (timeWindow) {
      query = query.eq('time_window', timeWindow);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching client rank:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getClientRank:', error);
    return null;
  }
}

/**
 * Calculate PR from workout_set_logs
 * (For 1RM, 3RM, 5RM - uses actual logged sets, NOT e1RM)
 */
export async function calculatePRForExercise(
  clientId: string,
  exerciseId: string,
  repTarget: 1 | 3 | 5
): Promise<number | null> {
  try {
    // Get best set matching rep count
    const { data, error } = await supabase
      .from('workout_set_logs')
      .select('weight, reps')
      .eq('client_id', clientId)
      .eq('exercise_id', exerciseId)
      .eq('reps', repTarget)
      .order('weight', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.weight;
  } catch (error) {
    console.error('Error calculating PR:', error);
    return null;
  }
}

/**
 * Calculate BW multiple (PR weight / bodyweight)
 */
export async function calculateBWMultiple(
  clientId: string,
  exerciseId: string,
  repTarget: 1 | 3 | 5
): Promise<number | null> {
  try {
    // Get latest bodyweight
    const { data: measurement } = await supabase
      .from('body_metrics')
      .select('weight_kg')
      .eq('client_id', clientId)
      .order('measured_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!measurement) return null;

    const pr = await calculatePRForExercise(clientId, exerciseId, repTarget);
    if (!pr) return null;

    return Math.round((pr / measurement.weight_kg) * 100) / 100;
  } catch (error) {
    console.error('Error calculating BW multiple:', error);
    return null;
  }
}

/**
 * Calculate tonnage for time window
 */
export async function calculateTonnage(
  clientId: string,
  timeWindow: TimeWindow,
  exerciseId?: string
): Promise<number> {
  try {
    let startDate: Date;
    const now = new Date();

    switch (timeWindow) {
      case 'this_week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'this_month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'all_time':
        startDate = new Date('2020-01-01'); // Far past
        break;
    }

    let query = supabase
      .from('workout_set_logs')
      .select('weight, reps')
      .eq('client_id', clientId)
      .gte('completed_at', startDate.toISOString());

    if (exerciseId) {
      query = query.eq('exercise_id', exerciseId);
    }

    const { data, error } = await query;

    if (error || !data) {
      return 0;
    }

    const totalTonnage = data.reduce((sum, set) => {
      return sum + (set.weight * set.reps);
    }, 0);

    return Math.round(totalTonnage);
  } catch (error) {
    console.error('Error calculating tonnage:', error);
    return 0;
  }
}

/**
 * Update leaderboard privacy setting
 */
export async function updateLeaderboardVisibility(
  clientId: string,
  visibility: 'public' | 'anonymous' | 'hidden'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ leaderboard_visibility: visibility })
      .eq('id', clientId);

    if (error) {
      console.error('Error updating leaderboard visibility:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateLeaderboardVisibility:', error);
    return false;
  }
}


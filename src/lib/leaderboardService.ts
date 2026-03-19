/**
 * Leaderboard Service
 * Handles PR rankings, BW multiples, and tonnage leaderboards with privacy controls
 */

import type { SupabaseClient } from '@supabase/supabase-js';
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
 * Get leaderboard filtered by sex (joins profiles to filter by sex)
 */
export async function getLeaderboardBySex(
  type: LeaderboardType,
  exerciseId?: string,
  timeWindow: TimeWindow = 'this_month',
  sex?: 'M' | 'F' | null,
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  if (!sex) return getLeaderboard(type, exerciseId, timeWindow, limit);

  try {
    const entries = await getLeaderboard(type, exerciseId, timeWindow, 200);
    if (entries.length === 0) return [];

    const clientIds = entries.map(e => e.client_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, sex')
      .in('id', clientIds)
      .eq('sex', sex);

    if (!profiles?.length) return [];
    const sexClientIds = new Set(profiles.map(p => p.id));

    const filtered = entries.filter(e => sexClientIds.has(e.client_id));
    return filtered.slice(0, limit).map((e, i) => ({ ...e, rank: i + 1 }));
  } catch (error) {
    console.error('Error in getLeaderboardBySex:', error);
    return [];
  }
}

/**
 * Get current champions (rank 1 per category)
 */
export async function getCurrentChampions(limit: number = 5): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('current_champions')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Error fetching champions:', error);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error('Error in getCurrentChampions:', error);
    return [];
  }
}

/** Epley 1RM estimate: weight * (1 + reps/30) */
function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Calculate PR from workout_set_logs.
 * For 1RM: best single rep or Epley estimate from heavier sets (reps > 1).
 * For 3RM/5RM: best set with reps <= 3 / <= 5.
 * @param client - optional Supabase client (e.g. service role for server-side)
 */
export async function calculatePRForExercise(
  clientId: string,
  exerciseId: string,
  repTarget: 1 | 3 | 5,
  client?: SupabaseClient
): Promise<number | null> {
  const db = client ?? supabase;
  try {
    const { data: sets, error } = await db
      .from('workout_set_logs')
      .select('weight, reps')
      .eq('client_id', clientId)
      .eq('exercise_id', exerciseId)
      .not('weight', 'is', null)
      .not('reps', 'is', null);

    if (error || !sets?.length) return null;

    const weight = (r: { weight: number | null; reps: number | null }) => Number(r.weight) || 0;
    const reps = (r: { weight: number | null; reps: number | null }) => Number(r.reps) || 0;

    if (repTarget === 1) {
      let best = 0;
      for (const set of sets) {
        const w = weight(set);
        const r = reps(set);
        if (r <= 0) continue;
        const estimated = r === 1 ? w : epley1RM(w, r);
        if (estimated > best) best = estimated;
      }
      return best > 0 ? Math.round(best * 10) / 10 : null;
    }

    const maxReps = repTarget === 3 ? 3 : 5;
    const valid = sets.filter((s) => reps(s) <= maxReps && reps(s) >= 1);
    if (valid.length === 0) return null;
    const best = valid.reduce((a, s) => {
      const w = weight(s);
      const r = reps(s);
      const e1rm = r === 1 ? w : epley1RM(w, r);
      return e1rm > a ? e1rm : a;
    }, 0);
    return best > 0 ? Math.round(best * 10) / 10 : null;
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
 * Calculate tonnage for time window.
 * @param client - optional Supabase client (e.g. service role for server-side)
 */
export async function calculateTonnage(
  clientId: string,
  timeWindow: TimeWindow,
  exerciseId?: string,
  client?: SupabaseClient
): Promise<number> {
  const db = client ?? supabase;
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

    let query = db
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


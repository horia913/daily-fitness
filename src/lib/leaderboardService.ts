/**
 * Leaderboard Service
 * Handles PR rankings, BW multiples, and tonnage leaderboards with privacy controls.
 * Reads are explicitly scoped to the viewer's coach roster (RLS is the backstop).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getLatestClientWeight } from './metrics/body';

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
export type LeaderboardVisibility = 'public' | 'anonymous' | 'hidden';

const COACH_ROLES = new Set(['coach', 'admin', 'super_coach', 'supercoach']);

/** UI shorthand → canonical exercise name in the library */
const LEADERBOARD_EXERCISE_ALIASES: Record<string, string> = {
  Squat: 'Back Squat',
  Deadlift: 'Conventional Deadlift',
};

/**
 * Resolve the coach whose roster the viewer should see.
 * Client → their coach via clients.coach_id; coach/admin → self.
 */
export async function resolveViewerCoachId(
  viewerId?: string,
  db: SupabaseClient = supabase,
): Promise<string | null> {
  let uid = viewerId;
  if (!uid) {
    const { data: auth } = await db.auth.getUser();
    uid = auth.user?.id;
  }
  if (!uid) return null;

  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', uid)
    .maybeSingle();

  const role = (profile?.role as string | undefined) ?? '';
  if (COACH_ROLES.has(role)) {
    return uid;
  }

  const { data: clientRow } = await db
    .from('clients')
    .select('coach_id')
    .eq('client_id', uid)
    .maybeSingle();

  return (clientRow?.coach_id as string | undefined) ?? null;
}

/**
 * Resolve a leaderboard filter label to an exercises.id.
 * Prefers canonical aliases (Squat → Back Squat) before fuzzy match so
 * "%Squat%" does not land on Anderson Squat with zero entries.
 */
export async function resolveLeaderboardExerciseId(
  exerciseLabel: string,
): Promise<string | undefined> {
  const label = exerciseLabel.trim();
  if (!label) return undefined;

  const candidates = [
    LEADERBOARD_EXERCISE_ALIASES[label],
    label,
  ].filter((name): name is string => Boolean(name));

  for (const name of candidates) {
    const { data } = await supabase
      .from('exercises')
      .select('id')
      .ilike('name', name)
      .limit(1)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  const { data: fuzzyMatch } = await supabase
    .from('exercises')
    .select('id')
    .ilike('name', `%${label}%`)
    .limit(1)
    .maybeSingle();

  return fuzzyMatch?.id;
}

/**
 * Get leaderboard rankings for the viewer's coach roster.
 * @param coachId - optional explicit coach; otherwise resolved from the authenticated viewer
 */
export async function getLeaderboard(
  type: LeaderboardType,
  exerciseId?: string,
  timeWindow: TimeWindow = 'this_month',
  limit: number = 50,
  coachId?: string | null,
): Promise<LeaderboardEntry[]> {
  try {
    const resolvedCoachId = coachId ?? (await resolveViewerCoachId());
    if (!resolvedCoachId) return [];

    let query = supabase
      .from('leaderboard_entries')
      .select('*')
      .eq('coach_id', resolvedCoachId)
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
 * Get leaderboard filtered by sex (joins profiles to filter by sex).
 * Base list is already coach-roster scoped.
 */
export async function getLeaderboardBySex(
  type: LeaderboardType,
  exerciseId?: string,
  timeWindow: TimeWindow = 'this_month',
  sex?: 'M' | 'F' | null,
  limit: number = 50,
  coachId?: string | null,
): Promise<LeaderboardEntry[]> {
  if (!sex) return getLeaderboard(type, exerciseId, timeWindow, limit, coachId);

  try {
    const entries = await getLeaderboard(type, exerciseId, timeWindow, 200, coachId);
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

function championCategoryLabel(
  leaderboardType: string,
  exerciseName: string | null,
): string {
  if (exerciseName) return exerciseName;
  if (leaderboardType.startsWith('tonnage')) return 'Tonnage';
  return leaderboardType.replace(/^pr_/, '').toUpperCase();
}

/**
 * Get current champions (rank 1 per leaderboard partition) for the viewer's coach roster.
 * Reads live leaderboard_entries; current_champions view / leaderboard_rankings are unused.
 */
export async function getCurrentChampions(
  limit: number = 5,
  coachId?: string | null,
): Promise<any[]> {
  try {
    const resolvedCoachId = coachId ?? (await resolveViewerCoachId());
    if (!resolvedCoachId) return [];

    const { data: entries, error } = await supabase
      .from('leaderboard_entries')
      .select('display_name, leaderboard_type, exercise_id, score, rank')
      .eq('coach_id', resolvedCoachId)
      .eq('rank', 1)
      .order('score', { ascending: false })
      .limit(limit * 3);

    if (error) {
      console.error('Error fetching champions:', error);
      return [];
    }
    if (!entries?.length) return [];

    const exerciseIds = [
      ...new Set(
        entries
          .map((e) => e.exercise_id as string | null)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const exerciseNames = new Map<string, string>();
    if (exerciseIds.length > 0) {
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', exerciseIds);
      for (const row of exercises ?? []) {
        exerciseNames.set(row.id, row.name ?? 'Exercise');
      }
    }

    const seen = new Set<string>();
    const champions: Array<{ name: string; category: string; score: number }> =
      [];
    for (const row of entries) {
      const key = `${row.leaderboard_type}|${row.exercise_id ?? 'tonnage'}|${row.rank}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const exerciseName = row.exercise_id
        ? exerciseNames.get(row.exercise_id as string) ?? null
        : null;
      champions.push({
        name: row.display_name ?? 'Champion',
        category: championCategoryLabel(
          row.leaderboard_type as string,
          exerciseName,
        ),
        score: Number(row.score),
      });
      if (champions.length >= limit) break;
    }
    return champions;
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
    const latest = await getLatestClientWeight(clientId);
    if (!latest) return null;

    const pr = await calculatePRForExercise(clientId, exerciseId, repTarget);
    if (!pr) return null;

    return Math.round((pr / latest.weightKg) * 100) / 100;
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
 * Update leaderboard privacy setting and sync table state.
 * - hidden: delete this client's leaderboard_entries, then recalc roster ranks
 * - anonymous: keep rows; set display_name + is_anonymous on existing rows
 * - public: update existing rows to real name (if any). After hidden, rows are
 *   gone — they repopulate on the next workout completion / PR log-set.
 */
export async function updateLeaderboardVisibility(
  clientId: string,
  visibility: LeaderboardVisibility
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

    const {
      deleteClientLeaderboardEntriesAndRecalc,
      syncClientLeaderboardDisplay,
    } = await import('./leaderboardPopulationService');

    if (visibility === 'hidden') {
      await deleteClientLeaderboardEntriesAndRecalc(clientId);
      return true;
    }

    if (visibility === 'anonymous') {
      await syncClientLeaderboardDisplay(clientId, 'Anonymous', true);
      return true;
    }

    // public — refresh name on any lingering rows (e.g. was anonymous)
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', clientId)
      .maybeSingle();
    const displayName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
      'Athlete';
    await syncClientLeaderboardDisplay(clientId, displayName, false);
    return true;
  } catch (error) {
    console.error('Error in updateLeaderboardVisibility:', error);
    return false;
  }
}


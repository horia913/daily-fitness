/**
 * Coach Dashboard Service
 * Handles coach dashboard data: stats, clients
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { dbToUiScale } from './wellnessService';
import {
  resolveInstanceWeeksForAssignments,
  isCoachSkipNote,
} from '@/lib/programInstanceResolver';

/** Compute program end date from start_date + duration_weeks (program_assignments has no end_date column). */
function computeProgramEndDate(start_date: string | null, duration_weeks: number | null): string | null {
  if (!start_date || duration_weeks == null || duration_weeks <= 0) return null;
  const d = new Date(start_date + 'T12:00:00Z');
  if (isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + duration_weeks * 7);
  return d.toISOString().split('T')[0];
}

export interface CoachStats {
  totalClients: number;
  activeClients: number;
  totalWorkouts: number;
  totalMealPlans: number;
}

/**
 * Get coach dashboard statistics
 */
export async function getCoachStats(coachId: string): Promise<CoachStats> {
  try {
    const [
      { data: clientsData, error: clientsError },
      { data: workoutsData, error: workoutsError },
      { data: mealPlansData, error: mealPlansError },
    ] = await Promise.all([
      supabase.from('clients').select('client_id, status').eq('coach_id', coachId),
      supabase.from('workout_templates').select('id').eq('coach_id', coachId).eq('is_active', true).eq('kind', 'library'),
      supabase.from('meal_plans').select('id').eq('coach_id', coachId).eq('is_active', true),
    ]);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
    }
    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError);
    }
    if (mealPlansError) {
      console.error('Error fetching meal plans:', mealPlansError);
    }

    const totalClients = clientsData?.length || 0;
    const activeClients = clientsData?.filter((c) => c.status === 'active').length || 0;

    return {
      totalClients,
      activeClients,
      totalWorkouts: workoutsData?.length || 0,
      totalMealPlans: mealPlansData?.length || 0,
    };
  } catch (error) {
    console.error('Error getting coach stats:', error);
    return {
      totalClients: 0,
      activeClients: 0,
      totalWorkouts: 0,
      totalMealPlans: 0,
    };
  }
}

/**
 * Get recent clients for coach dashboard
 */
export interface RecentClient {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  status?: string;
  last_active?: string;
}

export async function getRecentClients(coachId: string, limit: number = 5): Promise<RecentClient[]> {
  try {
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('client_id, status')
      .eq('coach_id', coachId)
      .limit(limit);

    if (clientsError || !clientsData || clientsData.length === 0) {
      return [];
    }

    const clientIds = clientsData.map((c) => c.client_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .in('id', clientIds);

    if (profilesError) {
      console.error('Error fetching client profiles:', profilesError);
      return [];
    }

    return (profilesData || []).map((profile) => ({
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar_url: profile.avatar_url,
      status: clientsData.find((c) => c.client_id === profile.id)?.status,
    }));
  } catch (error) {
    console.error('Error getting recent clients:', error);
    return [];
  }
}


/**
 * Client Metrics interface for client list page
 */
export interface ClientMetrics {
  clientId: string;
  lastActive: string | null;
  /** Completed workouts since Monday 00:00 UTC (ISO week); rows need non-null `completed_at`. */
  workoutsThisWeek: number;
  checkinStreak: number;
  programStatus: 'active' | 'noProgram' | 'endingSoon';
  programEndDate: string | null;
  latestStress: number | null;
  latestSoreness: number | null;
  trainedToday: boolean;
  checkedInToday: boolean;
  activeProgramName: string | null;
  programCurrentWeek: number | null;
  programDurationWeeks: number | null;
  mealCompliance7dPct: number | null;
  lastCheckinDate: string | null;
  /** Coach-managed progression: true when client has completed all required days and needs review */
  weekReviewNeeded: boolean;
  /** The week number that is complete and awaiting review */
  completedWeekNumber: number | null;
  /** The program_id for the active assignment (needed for review modal) */
  activeProgramId: string | null;
  /** The assignment ID (needed for review modal) */
  activeProgramAssignmentId: string | null;
  /** Retired subscription field — always null until a replacement exists. */
  subscriptionEndDate: string | null;
  /** Retired subscription field — always false until a replacement exists. */
  subscriptionExpiringSoon: boolean;
}

/**
 * Get metrics for multiple clients (batch query)
 * Optimized to avoid N+1 queries
 */
export async function getClientMetrics(clientIds: string[], supabaseClient?: SupabaseClient): Promise<Map<string, ClientMetrics>> {
  if (clientIds.length === 0) {
    return new Map();
  }

  const db = supabaseClient ?? supabase;
  try {
    /**
     * All "today" / rolling windows use UTC calendar dates so server TZ (e.g. dev on Windows
     * in Europe) cannot shift `toISOString()` vs local `setHours(0)` and zero out counts.
     *
     * "This week" for workouts = ISO week, Monday 00:00:00.000Z → matches
     * `get_coach_dashboard` SQL: `completed_at >= date_trunc('week', CURRENT_DATE)::timestamptz`
     * when the DB session uses UTC (Supabase default).
     */
    const now = new Date();
    const todayUtcStr = now.toISOString().slice(0, 10);
    const todayStart = `${todayUtcStr}T00:00:00.000Z`;
    const todayEnd = `${todayUtcStr}T23:59:59.999Z`;

    const sevenDaysAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgoStr = new Date(sevenDaysAgoMs).toISOString().slice(0, 10);
    const sevenDaysAgoStart = `${sevenDaysAgoStr}T00:00:00.000Z`;

    const sevenDaysFromNowStr = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const day = now.getUTCDate();
    const wd = now.getUTCDay();
    const deltaToMonday = wd === 0 ? -6 : 1 - wd;
    const weekStartUtcIso = new Date(Date.UTC(y, m, day + deltaToMonday, 0, 0, 0, 0)).toISOString();
    const weekStartMs = Date.parse(weekStartUtcIso);

    // Batch fetch workout logs (rolling 7d UTC window for last-active / trained-today)
    const { data: workoutLogs, error: workoutsError } = await db
      .from('workout_logs')
      .select('client_id, completed_at')
      .in('client_id', clientIds)
      .not('completed_at', 'is', null)
      .gte('completed_at', sevenDaysAgoStart)
      .order('completed_at', { ascending: false });

    if (workoutsError) {
      console.error('Error fetching workout logs:', workoutsError);
    }

    // Batch fetch wellness logs (last 7 days + today)
    const { data: wellnessLogs, error: wellnessError } = await db
      .from('daily_wellness_logs')
      .select('client_id, log_date, stress_level, soreness_level, sleep_hours, sleep_quality')
      .in('client_id', clientIds)
      .gte('log_date', sevenDaysAgoStr)
      .lte('log_date', todayUtcStr)
      .order('log_date', { ascending: false });

    if (wellnessError) {
      console.error('Error fetching wellness logs:', wellnessError);
    }

    // Batch fetch active programs (first row per client via order + dedupe below)
    const { data: activePrograms, error: programsError } = await db
      .from('program_assignments')
      .select('id, client_id, program_id, name, start_date, status, progression_mode, pause_status, paused_at, pause_accumulated_days, timezone_snapshot')
      .in('client_id', clientIds)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (programsError) {
      console.error('Error fetching active programs:', programsError);
    }

    const programRows = (activePrograms || []) as Array<{
      id: string;
      client_id: string;
      program_id: string;
      name: string | null;
      start_date: string;
      status: string;
      progression_mode: string | null;
      pause_status: string | null;
      paused_at: string | null;
      pause_accumulated_days: number | null;
      timezone_snapshot: string | null;
    }>;
    const firstProgramByClient = new Map<string, (typeof programRows)[0]>();
    for (const row of programRows) {
      if (!firstProgramByClient.has(row.client_id)) {
        firstProgramByClient.set(row.client_id, row);
      }
    }
    const assignmentIds = [...new Set([...firstProgramByClient.values()].map((r) => r.id))];

    const programIdsForNames = [...new Set([...firstProgramByClient.values()].map((r) => r.program_id).filter(Boolean))];
    const [{ data: programNameRows }, { data: mealCompletionRows }] = await Promise.all([
      programIdsForNames.length
        ? db.from('workout_programs').select('id, name').in('id', programIdsForNames)
        : Promise.resolve({ data: [] as { id: string; name: string }[] | null }),
      db
        .from('meal_completions')
        .select('client_id, completed_at')
        .in('client_id', clientIds)
        .gte('completed_at', sevenDaysAgoStart),
    ]);

    const programNameById = new Map((programNameRows || []).map((p: { id: string; name: string }) => [p.id, p.name]));
    // Canonical Week X of N per assignment (client tz, N = instance phases).
    const instanceWeekByAssignment = await resolveInstanceWeeksForAssignments(
      db,
      programRows.map((r) => r.id),
    );
    const currentWeekByAssignment = new Map<string, number>();
    for (const [aid, wk] of instanceWeekByAssignment) currentWeekByAssignment.set(aid, wk.currentWeek);

    const mealDaysByClient = new Map<string, Set<string>>();
    for (const row of mealCompletionRows || []) {
      const cid = (row as { client_id: string; completed_at: string }).client_id;
      const day = new Date((row as { completed_at: string }).completed_at).toISOString().slice(0, 10);
      if (!mealDaysByClient.has(cid)) mealDaysByClient.set(cid, new Set());
      mealDaysByClient.get(cid)!.add(day);
    }

    // Batch: detect which coach_managed assignments need a week review
    const coachManagedAssignments = programRows.filter(r => r.progression_mode === 'coach_managed');
    const reviewNeededByAssignment = new Map<string, number>(); // assignment_id -> completed week number
    if (coachManagedAssignments.length > 0) {
      const cmIds = coachManagedAssignments.map(a => a.id);
      const [{ data: scheduleRows }, { data: completionRows }] = await Promise.all([
        db.from('program_day_assignments').select('id, program_assignment_id, week_number, is_optional').in('program_assignment_id', cmIds),
        db.from('program_day_completions').select('program_assignment_id, program_day_assignment_id, notes').in('program_assignment_id', cmIds),
      ]);
      const scheduleByAssignment = new Map<string, typeof scheduleRows>();
      for (const s of (scheduleRows ?? [])) {
        const list = scheduleByAssignment.get(s.program_assignment_id) ?? [];
        list.push(s);
        scheduleByAssignment.set(s.program_assignment_id, list);
      }
      const completionsByAssignment = new Map<string, { done: Set<string>; skipped: Set<string> }>();
      for (const c of (completionRows ?? [])) {
        const entry = completionsByAssignment.get(c.program_assignment_id) ?? { done: new Set<string>(), skipped: new Set<string>() };
        if (c.program_day_assignment_id) {
          if (isCoachSkipNote(c.notes)) entry.skipped.add(c.program_day_assignment_id);
          else entry.done.add(c.program_day_assignment_id);
        }
        completionsByAssignment.set(c.program_assignment_id, entry);
      }
      for (const a of coachManagedAssignments) {
        const currentWeek = currentWeekByAssignment.get(a.id) ?? 1;
        const slots = (scheduleByAssignment.get(a.id) ?? []).filter(s => s.week_number === currentWeek);
        const required = slots.filter(s => !s.is_optional);
        if (required.length === 0) continue;
        const comp = completionsByAssignment.get(a.id) ?? { done: new Set<string>(), skipped: new Set<string>() };
        const effectiveRequired = required.filter(s => !comp.skipped.has(s.id));
        if (effectiveRequired.length === 0) continue;
        const allDone = effectiveRequired.every(s => comp.done.has(s.id));
        if (allDone) {
          reviewNeededByAssignment.set(a.id, currentWeek);
        }
      }
    }

    // Batch fetch all wellness logs for streak calculation (last 365 days)
    const { data: allWellnessLogs, error: allWellnessError } = await db
      .from('daily_wellness_logs')
      .select('client_id, log_date, sleep_hours, sleep_quality, stress_level, soreness_level')
      .in('client_id', clientIds)
      .lte('log_date', todayUtcStr)
      .order('log_date', { ascending: false })
      .limit(10000); // Reasonable limit for streak calculation

    if (allWellnessError) {
      console.error('Error fetching all wellness logs:', allWellnessError);
    }

    // Aggregate data per client
    const metricsMap = new Map<string, ClientMetrics>();

    // Group data by client
    const workoutsByClient = new Map<string, Array<{ completed_at: string }>>();
    (workoutLogs || []).forEach((w: any) => {
      if (!workoutsByClient.has(w.client_id)) {
        workoutsByClient.set(w.client_id, []);
      }
      workoutsByClient.get(w.client_id)!.push({ completed_at: w.completed_at });
    });

    const wellnessByClient = new Map<string, Array<{ log_date: string; stress_level: number | null; soreness_level: number | null; sleep_hours: number | null; sleep_quality: number | null }>>();
    (wellnessLogs || []).forEach((w: any) => {
      if (!wellnessByClient.has(w.client_id)) {
        wellnessByClient.set(w.client_id, []);
      }
      wellnessByClient.get(w.client_id)!.push({
        log_date: w.log_date,
        stress_level: w.stress_level,
        soreness_level: w.soreness_level,
        sleep_hours: w.sleep_hours,
        sleep_quality: w.sleep_quality,
      });
    });

    const allWellnessByClient = new Map<string, Set<string>>();
    (allWellnessLogs || []).forEach((w: any) => {
      // Only count complete check-ins (all required fields)
      if (
        w.sleep_hours != null &&
        w.sleep_quality != null &&
        w.stress_level != null &&
        w.soreness_level != null
      ) {
        if (!allWellnessByClient.has(w.client_id)) {
          allWellnessByClient.set(w.client_id, new Set());
        }
        allWellnessByClient.get(w.client_id)!.add(w.log_date);
      }
    });

    const programsByClient = new Map<
      string,
      { end_date: string | null; assignmentId: string; programId: string; assignmentName: string | null }
    >();
    for (const p of programRows) {
      if (!programsByClient.has(p.client_id)) {
        const totalWeeks = instanceWeekByAssignment.get(p.id)?.totalWeeks ?? null;
        const end_date = computeProgramEndDate(p.start_date, totalWeeks);
        programsByClient.set(p.client_id, {
          end_date,
          assignmentId: p.id,
          programId: p.program_id,
          assignmentName: p.name,
        });
      }
    }

    const lastCompleteCheckinByClient = new Map<string, string>();
    (allWellnessLogs || []).forEach((w: any) => {
      if (
        w.sleep_hours != null &&
        w.sleep_quality != null &&
        w.stress_level != null &&
        w.soreness_level != null &&
        w.log_date
      ) {
        const prev = lastCompleteCheckinByClient.get(w.client_id);
        if (!prev || w.log_date > prev) {
          lastCompleteCheckinByClient.set(w.client_id, w.log_date);
        }
      }
    });

    // Calculate metrics for each client
    for (const clientId of clientIds) {
      const clientWorkouts = workoutsByClient.get(clientId) || [];
      const clientWellness = wellnessByClient.get(clientId) || [];
      const clientAllWellness = allWellnessByClient.get(clientId) || new Set();
      const program = programsByClient.get(clientId);

      // Workouts this calendar week (ISO week, Mon UTC) — same idea as get_coach_dashboard.week_workout_count
      const workoutsThisWeek = clientWorkouts.filter((w) => {
        const t = Date.parse(w.completed_at);
        return !Number.isNaN(t) && t >= weekStartMs;
      }).length;

      // Trained today (UTC calendar day)
      const trainedToday = clientWorkouts.some((w) => {
        const t = Date.parse(w.completed_at);
        return !Number.isNaN(t) && t >= Date.parse(todayStart) && t <= Date.parse(todayEnd);
      });

      // Checked in today
      const checkedInToday = clientWellness.some((w) => w.log_date === todayUtcStr);

      // Last active (most recent of workout or check-in)
      let lastActive: string | null = null;
      const lastWorkout = clientWorkouts[0];
      const lastCheckin = clientWellness[0];
      if (lastWorkout && lastCheckin) {
        const workoutDate = lastWorkout.completed_at.split('T')[0];
        const checkinDate = lastCheckin.log_date;
        lastActive = workoutDate >= checkinDate ? workoutDate : checkinDate;
      } else if (lastWorkout) {
        lastActive = lastWorkout.completed_at.split('T')[0];
      } else if (lastCheckin) {
        lastActive = lastCheckin.log_date;
      }

      // Check-in streak
      let checkinStreak = 0;
      if (clientAllWellness.has(todayUtcStr)) {
        checkinStreak = 1;
        const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        for (let i = 0; i < 365; i++) {
          cursor.setUTCDate(cursor.getUTCDate() - 1);
          const dateStr = cursor.toISOString().slice(0, 10);
          if (clientAllWellness.has(dateStr)) {
            checkinStreak++;
          } else {
            break;
          }
        }
      }

      // Program status
      let programStatus: 'active' | 'noProgram' | 'endingSoon' = 'noProgram';
      let programEndDate: string | null = null;
      if (program) {
        programEndDate = program.end_date;
        if (program.end_date) {
          const endDate = new Date(program.end_date + 'T12:00:00Z');
          const daysUntil = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil >= 0 && daysUntil <= 7) {
            programStatus = 'endingSoon';
          } else {
            programStatus = 'active';
          }
        } else {
          programStatus = 'active';
        }
      }

      // Latest wellness (stress/soreness from most recent check-in)
      const latestWellness = clientWellness[0];
      const latestStress = latestWellness?.stress_level != null ? dbToUiScale(latestWellness.stress_level) : null;
      const latestSoreness = latestWellness?.soreness_level != null ? dbToUiScale(latestWellness.soreness_level) : null;

      const progAssignmentRow = firstProgramByClient.get(clientId);
      let activeProgramName: string | null = null;
      let programCurrentWeek: number | null = null;
      let programDurationWeeks: number | null = null;
      if (progAssignmentRow) {
        activeProgramName =
          programNameById.get(progAssignmentRow.program_id) ?? progAssignmentRow.name ?? null;
        const cw = currentWeekByAssignment.get(progAssignmentRow.id);
        programCurrentWeek = cw ?? null;
        programDurationWeeks = instanceWeekByAssignment.get(progAssignmentRow.id)?.totalWeeks ?? null;
      }

      const mealDays = mealDaysByClient.get(clientId);
      const mealCompliance7dPct =
        mealDays != null ? Math.min(100, Math.round((mealDays.size / 7) * 100)) : null;

      const lastCheckinDate = lastCompleteCheckinByClient.get(clientId) ?? null;

      const assignmentRow = firstProgramByClient.get(clientId);
      const reviewWeek = assignmentRow ? reviewNeededByAssignment.get(assignmentRow.id) : undefined;

      const subEnd: string | null = null;
      const subExpiring = false;

      metricsMap.set(clientId, {
        clientId,
        lastActive,
        workoutsThisWeek,
        checkinStreak,
        programStatus,
        programEndDate,
        latestStress,
        latestSoreness,
        trainedToday,
        checkedInToday,
        activeProgramName,
        programCurrentWeek,
        programDurationWeeks,
        mealCompliance7dPct,
        lastCheckinDate,
        weekReviewNeeded: reviewWeek != null,
        completedWeekNumber: reviewWeek ?? null,
        activeProgramId: assignmentRow?.program_id ?? null,
        activeProgramAssignmentId: assignmentRow?.id ?? null,
        subscriptionEndDate: subEnd,
        subscriptionExpiringSoon: subExpiring,
      });
    }

    return metricsMap;
  } catch (error) {
    console.error('Error getting client metrics:', error);
    return new Map();
  }
}


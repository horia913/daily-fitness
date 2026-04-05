/**
 * Client Dashboard Service
 * Handles real-time dashboard data: streak, weekly progress
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface DashboardStats {
  streak: number;
  weeklyProgress: {
    current: number;
    goal: number;
  };
}

/** Matches get_client_dashboard Option C: active program + program-linked sessions only. */
interface ActiveProgramCtx {
  paId: string;
  programId: string;
  ppWeek: number;
}

async function getActiveProgramCtx(
  sb: SupabaseClient,
  clientId: string
): Promise<ActiveProgramCtx | null> {
  const { data: pa, error: paErr } = await sb
    .from('program_assignments')
    .select('id, program_id')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paErr || !pa?.id || !pa.program_id) return null;

  const { data: pp } = await sb
    .from('program_progress')
    .select('current_week_number')
    .eq('program_assignment_id', pa.id)
    .maybeSingle();

  return {
    paId: pa.id,
    programId: pa.program_id,
    ppWeek: pp?.current_week_number ?? 1,
  };
}

function resolveIndexedWeekNumber(
  distinctWeekNumbers: number[],
  currentWeekNumberFromProgress: number
): number | null {
  if (!distinctWeekNumbers.length) return null;
  const idx = Math.max(0, currentWeekNumberFromProgress - 1);
  if (idx >= distinctWeekNumbers.length) return null;
  return distinctWeekNumbers[idx] ?? null;
}

function streakFromUtcDayStrings(datesDesc: string[]): number {
  const uniqueDates = Array.from(new Set(datesDesc)).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  if (uniqueDates.length === 0) return 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

  let streak = 1;
  const expectedDate = new Date(uniqueDates[0] + 'T12:00:00.000Z');
  for (let i = 1; i < uniqueDates.length; i++) {
    expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
    const expectedStr = expectedDate.toISOString().split('T')[0];
    if (uniqueDates[i] === expectedStr) streak++;
    else break;
  }
  return streak;
}

/**
 * Single fetch: program schedule rows + completed program sessions (2 queries max).
 * Aligns with public.get_client_dashboard Option C.
 */
export async function fetchProgramWorkoutCounters(
  sb: SupabaseClient,
  clientId: string
): Promise<DashboardStats> {
  try {
    const ctx = await getActiveProgramCtx(sb, clientId);
    if (!ctx) {
      return { streak: 0, weeklyProgress: { current: 0, goal: 0 } };
    }

    const { data: schedRows, error: schedErr } = await sb
      .from('program_schedule')
      .select('id, week_number')
      .eq('program_id', ctx.programId);

    if (schedErr) {
      console.error('fetchProgramWorkoutCounters program_schedule:', schedErr);
      return { streak: 0, weeklyProgress: { current: 0, goal: 0 } };
    }

    const distinctWeeks = [...new Set((schedRows ?? []).map((r) => r.week_number))].sort(
      (a, b) => a - b
    );
    const resolvedWeek = resolveIndexedWeekNumber(distinctWeeks, ctx.ppWeek);
    if (resolvedWeek == null) {
      return { streak: 0, weeklyProgress: { current: 0, goal: 0 } };
    }

    const slotIds = (schedRows ?? [])
      .filter((r) => r.week_number === resolvedWeek)
      .map((r) => r.id)
      .filter(Boolean);
    const goal = slotIds.length;
    const slotSet = new Set(slotIds);

    const { data: sessions, error: sessErr } = await sb
      .from('workout_sessions')
      .select('completed_at, program_schedule_id')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .eq('program_assignment_id', ctx.paId)
      .not('program_schedule_id', 'is', null);

    if (sessErr) {
      console.error('fetchProgramWorkoutCounters workout_sessions:', sessErr);
      return { streak: 0, weeklyProgress: { current: 0, goal: goal } };
    }

    const sessionList = sessions ?? [];
    const current = sessionList.filter(
      (s) => s.program_schedule_id && slotSet.has(s.program_schedule_id)
    ).length;

    const dayStrings = sessionList.map((s) =>
      new Date(s.completed_at!).toISOString().split('T')[0]
    );
    const streak = streakFromUtcDayStrings(dayStrings);

    return {
      streak,
      weeklyProgress: { current, goal },
    };
  } catch (e) {
    console.error('fetchProgramWorkoutCounters:', e);
    return { streak: 0, weeklyProgress: { current: 0, goal: 0 } };
  }
}

export async function calculateStreak(clientId: string): Promise<number> {
  const { streak } = await fetchProgramWorkoutCounters(supabase, clientId);
  return streak;
}

export async function calculateStreakWithClient(
  sb: SupabaseClient,
  clientId: string
): Promise<number> {
  const { streak } = await fetchProgramWorkoutCounters(sb, clientId);
  return streak;
}

export async function calculateWeeklyProgress(
  clientId: string
): Promise<{ current: number; goal: number }> {
  const { weeklyProgress } = await fetchProgramWorkoutCounters(supabase, clientId);
  return weeklyProgress;
}

export async function calculateWeeklyProgressWithClient(
  sb: SupabaseClient,
  clientId: string
): Promise<{ current: number; goal: number }> {
  const { weeklyProgress } = await fetchProgramWorkoutCounters(sb, clientId);
  return weeklyProgress;
}

/**
 * Get coach's WhatsApp phone number for the client
 */
export async function getCoachWhatsAppPhone(clientId: string): Promise<string | null> {
  try {
    // Try to get coach_id from clients table
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('coach_id')
      .eq('client_id', clientId)
      .maybeSingle();

    if (clientError) {
      return null;
    }

    if (!clientData?.coach_id) {
      return null;
    }

    // Try to get coach's phone from profiles (if phone field exists)
    const { data: coachProfile, error: profileError } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', clientData.coach_id)
      .maybeSingle();

    if (profileError) {
      return null;
    }

    return coachProfile?.phone || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get client's type (online or in_gym)
 */
export async function getClientType(clientId: string): Promise<'online' | 'in_gym' | null> {
  try {
    // Ensure user is authenticated before querying
    const { ensureAuthenticated } = await import('./supabase');
    await ensureAuthenticated();

    const { data, error } = await supabase
      .from('profiles')
      .select('client_type')
      .eq('id', clientId)
      .maybeSingle();

    if (error || !data) {
      console.error('Error fetching client type:', error);
      return null;
    }

    return data.client_type as 'online' | 'in_gym' | null;
  } catch (error) {
    console.error('Error getting client type:', error);
    return null;
  }
}

/**
 * Get all dashboard stats at once
 */
export async function getDashboardStats(clientId: string): Promise<DashboardStats> {
  return fetchProgramWorkoutCounters(supabase, clientId);
}

/**
 * Get today's workout assignment with template details
 * Now supports both program-based workouts (via programStateService) and 
 * legacy workout_assignments with scheduled_date
 */
export interface TodaysWorkout {
  id: string;
  templateId: string;
  name: string;
  exercises: number;
  totalSets: number;
  estimatedDuration: number;
  // Program info (optional)
  isProgram?: boolean;
  programName?: string;
  positionLabel?: string;
}

export async function getTodaysWorkout(clientId: string): Promise<TodaysWorkout | null> {
  try {
    // FIRST: Check for active program workout using programStateService (via programProgressService)
    const { getCurrentWorkoutFromProgress } = await import('./programProgressService');
    const programWorkout = await getCurrentWorkoutFromProgress(supabase, clientId);
    
    if (programWorkout.status === 'active' && programWorkout.template_id) {
      // Fetch template details for the program workout
      const { data: template, error: templateError } = await supabase
        .from('workout_templates')
        .select('id, name, description, estimated_duration')
        .eq('id', programWorkout.template_id)
        .maybeSingle();

      if (templateError || !template) {
        console.error('Error fetching program workout template:', templateError);
      } else {
        // Get exercise count and total sets from blocks
        const { WorkoutBlockService } = await import('@/lib/workoutBlockService');
        const blocks = await WorkoutBlockService.getWorkoutBlocks(template.id);
        const exerciseCount = blocks.reduce(
          (sum, block) => sum + (block.exercises?.length || 0),
          0
        );
        
        const totalSets = blocks.reduce((sum, block) => {
          return sum + (block.exercises?.reduce(
            (blockSum, ex) => blockSum + (ex.sets || 0),
            0
          ) || 0);
        }, 0);

        return {
          id: programWorkout.program_assignment_id!,
          templateId: template.id,
          name: template.name,
          exercises: exerciseCount,
          totalSets: totalSets,
          estimatedDuration: template.estimated_duration || 45,
          isProgram: true,
          programName: programWorkout.program_name,
          positionLabel: programWorkout.position_label,
        };
      }
    }

    // FALLBACK: Check for legacy workout_assignments with scheduled_date
    const today = new Date().toISOString().split('T')[0];

    const { data: workoutAssignment, error: assignmentError } = await supabase
      .from('workout_assignments')
      .select(`
        id,
        workout_template_id,
        scheduled_date,
        status
      `)
      .eq('client_id', clientId)
      .eq('scheduled_date', today)
      .in('status', ['assigned', 'active'])
      .maybeSingle();

    if (assignmentError) {
      console.error('Error fetching workout assignment:', assignmentError);
      return null;
    }

    if (!workoutAssignment?.workout_template_id) {
      return null;
    }

    // Fetch template details
    const { data: template, error: templateError } = await supabase
      .from('workout_templates')
      .select('id, name, description, estimated_duration')
      .eq('id', workoutAssignment.workout_template_id)
      .maybeSingle();

    if (templateError) {
      console.error('Error fetching template:', templateError);
      return null;
    }

    if (!template) {
      console.warn('Template not found or not accessible:', workoutAssignment.workout_template_id);
      return null;
    }

    // Get exercise count and total sets from blocks
    const { WorkoutBlockService } = await import('@/lib/workoutBlockService');
    const blocks = await WorkoutBlockService.getWorkoutBlocks(template.id);
    const exerciseCount = blocks.reduce(
      (sum, block) => sum + (block.exercises?.length || 0),
      0
    );
    
    const totalSets = blocks.reduce((sum, block) => {
      return sum + (block.exercises?.reduce(
        (blockSum, ex) => blockSum + (ex.sets || 0),
        0
      ) || 0);
    }, 0);

    return {
      id: workoutAssignment.id,
      templateId: template.id,
      name: template.name,
      exercises: exerciseCount,
      totalSets: totalSets,
      estimatedDuration: template.estimated_duration || 45,
      isProgram: false,
    };
  } catch (error) {
    console.error('Error getting today\'s workout:', error);
    return null;
  }
}


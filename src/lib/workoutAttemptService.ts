/**
 * Workout Attempt Service
 * Centralized service for managing workout sessions and logs
 * Provides consistent "active attempt" lookup across the app
 */

import { supabase } from './supabase';

export interface WorkoutSession {
  id: string;
  assignment_id: string;
  client_id: string;
  started_at: string;
  completed_at?: string | null;
  total_duration?: number | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  notes?: string | null;
}

export interface WorkoutLog {
  id: string;
  client_id: string;
  workout_assignment_id: string;
  started_at: string;
  completed_at?: string | null;
  total_duration_minutes?: number | null;
  total_sets?: number | null;
  total_reps?: number | null;
  total_weight_kg?: number | null;
  notes?: string | null;
}

export interface ActiveAttempt {
  session: WorkoutSession | null;
  log: WorkoutLog | null;
  status: 'not_started' | 'in_progress' | 'completed';
  hasActiveAttempt: boolean;
}

/**
 * Get active workout attempt for an assignment
 * Returns both session and log (if they exist)
 * After Slice 07 migration: uses workout_logs.workout_session_id for linked queries
 */
export async function getActiveAttempt(
  assignmentId: string,
  clientId: string
): Promise<ActiveAttempt> {
  try {
    // Primary query: get active log with linked session (after Slice 07 migration)
    // This is more efficient as it uses the FK relationship
    const { data: log, error: logError } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('workout_assignment_id', assignmentId)
      .eq('client_id', clientId)
      .is('completed_at', null) // Active log = not completed yet
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (logError) {
      console.error('Error fetching active log:', logError);
    }

    // Get linked session (if log has workout_session_id)
    let session: WorkoutSession | null = null;
    if (log && log.workout_session_id) {
      const { data: linkedSession, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('id', log.workout_session_id)
        .single();

      if (sessionError) {
        console.error('Error fetching linked session:', sessionError);
      } else {
        session = linkedSession;
      }
    }

    // Fallback: if no log found, check for orphaned active session
    // (shouldn't happen after Slice 07, but handles legacy data)
    if (!log) {
      const { data: orphanedSession, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('client_id', clientId)
        .in('status', ['in_progress'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sessionError && orphanedSession) {
        session = orphanedSession;
      }
    }

    // Determine status
    let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (session && session.status === 'in_progress') {
      status = 'in_progress';
    } else if (session && session.status === 'completed') {
      status = 'completed';
    } else if (log && !log.completed_at) {
      // Has a log but no session in progress - consider it in_progress
      status = 'in_progress';
    }

    return {
      session,
      log,
      status,
      hasActiveAttempt: !!session || !!log
    };
  } catch (error) {
    console.error('Error in getActiveAttempt:', error);
    return {
      session: null,
      log: null,
      status: 'not_started',
      hasActiveAttempt: false
    };
  }
}

/**
 * Get most recent completed attempt for an assignment
 * Useful for showing "last workout" data
 */
export async function getLastCompletedAttempt(
  assignmentId: string,
  clientId: string
): Promise<{ session: WorkoutSession | null; log: WorkoutLog | null }> {
  try {
    // Find last completed session
    const { data: session } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Find corresponding completed log
    const { data: log } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('workout_assignment_id', assignmentId)
      .eq('client_id', clientId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return { session, log };
  } catch (error) {
    console.error('Error in getLastCompletedAttempt:', error);
    return { session: null, log: null };
  }
}

/**
 * Check if assignment has any completed attempts
 */
export async function hasCompletedAttempts(
  assignmentId: string,
  clientId: string
): Promise<boolean> {
  try {
    const { count } = await supabase
      .from('workout_logs')
      .select('*', { count: 'exact', head: true })
      .eq('workout_assignment_id', assignmentId)
      .eq('client_id', clientId)
      .not('completed_at', 'is', null);

    return (count || 0) > 0;
  } catch (error) {
    console.error('Error in hasCompletedAttempts:', error);
    return false;
  }
}

/**
 * Get all attempts (completed) for an assignment
 * Useful for progress tracking
 */
export async function getAllAttempts(
  assignmentId: string,
  clientId: string
): Promise<WorkoutLog[]> {
  try {
    const { data: logs, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('workout_assignment_id', assignmentId)
      .eq('client_id', clientId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching all attempts:', error);
      return [];
    }

    return logs || [];
  } catch (error) {
    console.error('Error in getAllAttempts:', error);
    return [];
  }
}

/**
 * Get workout status summary for UI display
 */
export function getWorkoutStatusDisplay(attempt: ActiveAttempt): {
  label: string;
  color: string;
  icon: string;
} {
  switch (attempt.status) {
    case 'in_progress':
      return {
        label: 'In Progress',
        color: 'blue',
        icon: 'play'
      };
    case 'completed':
      return {
        label: 'Completed',
        color: 'green',
        icon: 'check'
      };
    case 'not_started':
    default:
      return {
        label: 'Not Started',
        color: 'gray',
        icon: 'circle'
      };
  }
}


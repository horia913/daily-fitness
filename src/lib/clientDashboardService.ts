/**
 * Client Dashboard Service
 * Handles real-time dashboard data: streak, weekly progress, sessions
 */

import { supabase } from './supabase';

export interface DashboardStats {
  streak: number;
  weeklyProgress: {
    current: number;
    goal: number;
  };
}

/**
 * Calculate client's current workout streak (consecutive days with completed workouts)
 */
export async function calculateStreak(clientId: string): Promise<number> {
  try {
    // Get all completed workout logs, ordered by completion date descending
    const { data: logs, error } = await supabase
      .from('workout_logs')
      .select('completed_at')
      .eq('client_id', clientId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });

    if (error || !logs || logs.length === 0) {
      return 0;
    }

    // Extract unique dates (YYYY-MM-DD)
    const uniqueDates = Array.from(
      new Set(
        logs.map(log => new Date(log.completed_at!).toISOString().split('T')[0])
      )
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (uniqueDates.length === 0) return 0;

    // Check if streak is current (most recent date should be today or yesterday)
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
      return 0; // Streak broken
    }

    // Count consecutive days
    let streak = 1;
    let expectedDate = new Date(uniqueDates[0]);
    
    for (let i = 1; i < uniqueDates.length; i++) {
      expectedDate.setDate(expectedDate.getDate() - 1);
      const expectedDateStr = expectedDate.toISOString().split('T')[0];
      
      if (uniqueDates[i] === expectedDateStr) {
        streak++;
      } else {
        break; // Streak broken
      }
    }

    return streak;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
}

/**
 * Calculate weekly workout progress (current week's completed vs assigned)
 */
export async function calculateWeeklyProgress(clientId: string): Promise<{ current: number; goal: number }> {
  try {
    // Get start and end of current week (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];

    // Count assigned workouts this week
    const { data: assignments, error: assignError } = await supabase
      .from('workout_assignments')
      .select('id')
      .eq('client_id', clientId)
      .gte('scheduled_date', mondayStr)
      .lte('scheduled_date', sundayStr);

    if (assignError) {
      console.error('Error fetching assignments:', assignError);
    }

    const goal = assignments?.length || 0;

    // Count completed workouts this week
    const { data: completedLogs, error: logError } = await supabase
      .from('workout_logs')
      .select('id, completed_at')
      .eq('client_id', clientId)
      .not('completed_at', 'is', null)
      .gte('completed_at', monday.toISOString())
      .lte('completed_at', sunday.toISOString());

    if (logError) {
      console.error('Error fetching completed logs:', logError);
    }

    const current = completedLogs?.length || 0;

    return { current, goal };
  } catch (error) {
    console.error('Error calculating weekly progress:', error);
    return { current: 0, goal: 0 };
  }
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
      console.log('No clients table or coach assignment:', clientError.message);
      return null;
    }

    if (!clientData?.coach_id) {
      console.log('No coach assigned to this client');
      return null;
    }

    // Try to get coach's phone from profiles (if phone field exists)
    const { data: coachProfile, error: profileError } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', clientData.coach_id)
      .maybeSingle();

    if (profileError) {
      console.log('Phone field may not exist in profiles:', profileError.message);
      return null;
    }

    return coachProfile?.phone || null;
  } catch (error) {
    console.log('Coach phone lookup not available:', error);
    return null;
  }
}

/**
 * Get client's type (online or in_gym)
 */
export async function getClientType(clientId: string): Promise<'online' | 'in_gym' | null> {
  try {
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
 * Get client's next upcoming in-gym session (for in_gym clients only)
 */
export async function getNextSession(clientId: string): Promise<{
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
} | null> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('sessions')
      .select('id, scheduled_date, start_time, end_time')
      .eq('client_id', clientId)
      .in('status', ['scheduled', 'confirmed'])
      .gte('scheduled_date', now.split('T')[0])
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching next session:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting next session:', error);
    return null;
  }
}

/**
 * Get all dashboard stats at once
 */
export async function getDashboardStats(clientId: string): Promise<DashboardStats> {
  const [streak, weeklyProgress] = await Promise.all([
    calculateStreak(clientId),
    calculateWeeklyProgress(clientId),
  ]);

  return {
    streak,
    weeklyProgress,
  };
}

/**
 * Get today's workout assignment with template details
 */
export interface TodaysWorkout {
  id: string;
  templateId: string;
  name: string;
  exercises: number;
  totalSets: number;
  estimatedDuration: number;
}

export async function getTodaysWorkout(clientId: string): Promise<TodaysWorkout | null> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Fetch today's workout assignment
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
      // Template not found (may have been deleted or RLS prevents access)
      console.warn('Template not found or not accessible:', workoutAssignment.workout_template_id);
      return null;
    }

    // Get exercise count and total sets from blocks (single query)
    const { WorkoutBlockService } = await import('@/lib/workoutBlockService');
    const blocks = await WorkoutBlockService.getWorkoutBlocks(template.id);
    const exerciseCount = blocks.reduce(
      (sum, block) => sum + (block.exercises?.length || 0),
      0
    );
    
    // Calculate total sets while we already have blocks loaded
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
    };
  } catch (error) {
    console.error('Error getting today\'s workout:', error);
    return null;
  }
}


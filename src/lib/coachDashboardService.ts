/**
 * Coach Dashboard Service
 * Handles coach dashboard data: stats, sessions, clients
 */

import { supabase } from './supabase';

export interface CoachStats {
  totalClients: number;
  activeClients: number;
  totalWorkouts: number;
  totalMealPlans: number;
}

export interface TodaysSession {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  client_id: string;
  client_name: string;
}

/**
 * Get coach dashboard statistics
 */
export async function getCoachStats(coachId: string): Promise<CoachStats> {
  try {
    // Load clients
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('client_id, status')
      .eq('coach_id', coachId);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
    }

    const totalClients = clientsData?.length || 0;
    const activeClients = clientsData?.filter((c) => c.status === 'active').length || 0;

    // Load workout templates count
    const { data: workoutsData, error: workoutsError } = await supabase
      .from('workout_templates')
      .select('id')
      .eq('coach_id', coachId)
      .eq('is_active', true);

    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError);
    }

    // Load meal plans count
    const { data: mealPlansData, error: mealPlansError } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('coach_id', coachId)
      .eq('is_active', true);

    if (mealPlansError) {
      console.error('Error fetching meal plans:', mealPlansError);
    }

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
 * Get today's sessions for coach
 */
export async function getTodaysSessions(coachId: string): Promise<TodaysSession[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = `${today}T00:00:00.000Z`;
    const todayEnd = `${today}T23:59:59.999Z`;

    // Fetch only columns that exist in sessions table
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        scheduled_at,
        duration_minutes,
        status,
        client_id
      `)
      .eq('coach_id', coachId)
      .gte('scheduled_at', todayStart)
      .lte('scheduled_at', todayEnd)
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_at', { ascending: true });

    if (sessionsError) {
      console.error('Error fetching today\'s sessions:', sessionsError);
      return [];
    }

    if (!sessionsData || sessionsData.length === 0) {
      return [];
    }

    // Return raw database fields only - no calculations, no derivations
    return sessionsData.map((s: any) => {
      return {
        id: s.id,
        status: s.status,
        client_id: s.client_id,
        // TODO: scheduled_date is not in database - derived from scheduled_at
        scheduled_date: '',
        // TODO: start_time is not in database - derived from scheduled_at
        start_time: '',
        // TODO: end_time is not in database - derived from scheduled_at + duration_minutes
        end_time: '',
        // TODO: client_name is not in database - sessions table has no FK to profiles
        client_name: '',
      };
    });
  } catch (error) {
    console.error('Error getting today\'s sessions:', error);
    return [];
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


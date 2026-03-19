/**
 * Client Activity Service
 * CRUD operations for extra training/activities (running, cycling, swimming, etc.)
 */

import { supabase } from './supabase';

export const ACTIVITY_TYPES = [
  'running', 'jogging', 'cycling', 'swimming', 'hiking',
  'walking', 'yoga', 'stretching', 'sports', 'martial_arts',
  'dance', 'custom',
] as const;

export type ActivityType = typeof ACTIVITY_TYPES[number];
export type Intensity = 'light' | 'moderate' | 'vigorous';

export interface ClientActivity {
  id: string;
  client_id: string;
  activity_type: ActivityType;
  custom_activity_name?: string | null;
  duration_minutes: number;
  distance_km?: number | null;
  intensity: Intensity;
  notes?: string | null;
  activity_date: string;
  created_at: string;
  updated_at: string;
}

export interface LogActivityInput {
  activity_type: ActivityType;
  custom_activity_name?: string | null;
  duration_minutes: number;
  distance_km?: number | null;
  intensity: Intensity;
  notes?: string | null;
  activity_date?: string;
}

export interface ActivityWeeklySummary {
  totalActivities: number;
  totalDurationMinutes: number;
  mostFrequentType: ActivityType | null;
  byType: Record<string, { count: number; totalMinutes: number }>;
}

export const ACTIVITY_META: Record<ActivityType, { label: string; icon: string; color: string }> = {
  running:      { label: 'Running',      icon: '🏃', color: '#EF4444' },
  jogging:      { label: 'Jogging',      icon: '🏃‍♂️', color: '#F97316' },
  cycling:      { label: 'Cycling',      icon: '🚴', color: '#3B82F6' },
  swimming:     { label: 'Swimming',     icon: '🏊', color: '#06B6D4' },
  hiking:       { label: 'Hiking',       icon: '🥾', color: '#22C55E' },
  walking:      { label: 'Walking',      icon: '🚶', color: '#84CC16' },
  yoga:         { label: 'Yoga',         icon: '🧘', color: '#A855F7' },
  stretching:   { label: 'Stretching',   icon: '🤸', color: '#EC4899' },
  sports:       { label: 'Sports',       icon: '⚽', color: '#F59E0B' },
  martial_arts: { label: 'Martial Arts', icon: '🥋', color: '#DC2626' },
  dance:        { label: 'Dance',        icon: '💃', color: '#D946EF' },
  custom:       { label: 'Custom',       icon: '⭐', color: '#6B7280' },
};

export const INTENSITY_META: Record<Intensity, { label: string; color: string }> = {
  light:    { label: 'Light',    color: '#22C55E' },
  moderate: { label: 'Moderate', color: '#F59E0B' },
  vigorous: { label: 'Vigorous', color: '#EF4444' },
};

// ============================================================================
// CRUD Operations
// ============================================================================

export async function logActivity(
  clientId: string,
  input: LogActivityInput
): Promise<ClientActivity | null> {
  const { data, error } = await supabase
    .from('client_activities')
    .insert({
      client_id: clientId,
      activity_type: input.activity_type,
      custom_activity_name: input.activity_type === 'custom' ? input.custom_activity_name : null,
      duration_minutes: input.duration_minutes,
      distance_km: input.distance_km ?? null,
      intensity: input.intensity,
      notes: input.notes ?? null,
      activity_date: input.activity_date ?? new Date().toISOString().split('T')[0],
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error logging activity:', error);
    return null;
  }
  return data;
}

export async function updateActivity(
  activityId: string,
  input: Partial<LogActivityInput>
): Promise<ClientActivity | null> {
  const updatePayload: Record<string, unknown> = {};
  if (input.activity_type !== undefined) updatePayload.activity_type = input.activity_type;
  if (input.custom_activity_name !== undefined) updatePayload.custom_activity_name = input.custom_activity_name;
  if (input.duration_minutes !== undefined) updatePayload.duration_minutes = input.duration_minutes;
  if (input.distance_km !== undefined) updatePayload.distance_km = input.distance_km;
  if (input.intensity !== undefined) updatePayload.intensity = input.intensity;
  if (input.notes !== undefined) updatePayload.notes = input.notes;
  if (input.activity_date !== undefined) updatePayload.activity_date = input.activity_date;

  const { data, error } = await supabase
    .from('client_activities')
    .update(updatePayload)
    .eq('id', activityId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating activity:', error);
    return null;
  }
  return data;
}

export async function deleteActivity(activityId: string): Promise<boolean> {
  const { error } = await supabase
    .from('client_activities')
    .delete()
    .eq('id', activityId);

  if (error) {
    console.error('Error deleting activity:', error);
    return false;
  }
  return true;
}

export async function getActivitiesByDateRange(
  clientId: string,
  startDate: string,
  endDate: string
): Promise<ClientActivity[]> {
  const { data, error } = await supabase
    .from('client_activities')
    .select('*')
    .eq('client_id', clientId)
    .gte('activity_date', startDate)
    .lte('activity_date', endDate)
    .order('activity_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
  return data ?? [];
}

export async function getWeeklyActivitySummary(
  clientId: string,
  weekStart: string,
  weekEnd: string
): Promise<ActivityWeeklySummary> {
  const activities = await getActivitiesByDateRange(clientId, weekStart, weekEnd);

  const byType: Record<string, { count: number; totalMinutes: number }> = {};
  let totalDuration = 0;

  for (const a of activities) {
    totalDuration += a.duration_minutes;
    if (!byType[a.activity_type]) {
      byType[a.activity_type] = { count: 0, totalMinutes: 0 };
    }
    byType[a.activity_type].count++;
    byType[a.activity_type].totalMinutes += a.duration_minutes;
  }

  let mostFrequentType: ActivityType | null = null;
  let maxCount = 0;
  for (const [type, stats] of Object.entries(byType)) {
    if (stats.count > maxCount) {
      maxCount = stats.count;
      mostFrequentType = type as ActivityType;
    }
  }

  return {
    totalActivities: activities.length,
    totalDurationMinutes: totalDuration,
    mostFrequentType,
    byType,
  };
}

export async function getClientActivitiesForCoach(
  clientId: string,
  limit: number = 20
): Promise<ClientActivity[]> {
  const { data, error } = await supabase
    .from('client_activities')
    .select('*')
    .eq('client_id', clientId)
    .order('activity_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching client activities for coach:', error);
    return [];
  }
  return data ?? [];
}

/**
 * Get current week boundaries (Monday-Sunday)
 */
export function getCurrentWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

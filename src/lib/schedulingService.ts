/**
 * Scheduling Service
 * Centralized service for managing coach sessions and availability
 * Provides consistent interface across client and coach screens
 */

import { supabase } from './supabase';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CoachSession {
  id: string;
  coach_id: string;
  client_id: string;
  title: string;
  description?: string | null;
  scheduled_at: string; // Timestamp with time zone
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CoachAvailability {
  id: string;
  coach_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string; // HH:MM format
  end_time: string;
  is_active: boolean;
  created_at?: string;
}

// ============================================================================
// Coach Sessions (In-Gym)
// ============================================================================

/**
 * Get all sessions for a coach
 * @param coachId - Coach UUID
 * @param startDate - Optional: filter sessions from this date
 * @param endDate - Optional: filter sessions until this date
 */
export async function getCoachSessions(
  coachId: string,
  startDate?: string,
  endDate?: string
): Promise<CoachSession[]> {
  try {
    let query = supabase
      .from('sessions')
      .select('*')
      .eq('coach_id', coachId)
      .order('scheduled_at', { ascending: true });

    if (startDate) {
      query = query.gte('scheduled_at', startDate);
    }
    if (endDate) {
      query = query.lte('scheduled_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching coach sessions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCoachSessions:', error);
    return [];
  }
}

/**
 * Get sessions for a specific client (their upcoming gym sessions)
 * @param clientId - Client UUID
 * @param includeCompleted - Whether to include past completed sessions
 */
export async function getClientSessions(
  clientId: string,
  includeCompleted: boolean = false
): Promise<CoachSession[]> {
  try {
    let query = supabase
      .from('sessions')
      .select('*')
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: true });

    if (!includeCompleted) {
      const now = new Date().toISOString();
      query = query.gte('scheduled_at', now);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching client sessions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getClientSessions:', error);
    return [];
  }
}

/**
 * Create a new session
 */
export async function createSession(
  session: Omit<CoachSession, 'id' | 'created_at' | 'updated_at'>
): Promise<CoachSession | null> {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([session])
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createSession:', error);
    return null;
  }
}

/**
 * Update session status (e.g. mark as completed or cancelled)
 */
export async function updateSessionStatus(
  sessionId: string,
  status: CoachSession['status'],
  notes?: string
): Promise<boolean> {
  try {
    const updateData: Partial<CoachSession> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating session status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateSessionStatus:', error);
    return false;
  }
}

/**
 * Delete/cancel a session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error deleting session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteSession:', error);
    return false;
  }
}

// ============================================================================
// Coach Availability
// ============================================================================

/**
 * Get coach availability schedule
 */
export async function getCoachAvailability(
  coachId: string
): Promise<CoachAvailability[]> {
  try {
    const { data, error } = await supabase
      .from('coach_availability')
      .select('*')
      .eq('coach_id', coachId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching coach availability:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCoachAvailability:', error);
    return [];
  }
}

/**
 * Create or update availability slot
 */
export async function upsertAvailability(
  availability: Omit<CoachAvailability, 'id' | 'created_at'> & { id?: string }
): Promise<CoachAvailability | null> {
  try {
    const { data, error } = await supabase
      .from('coach_availability')
      .upsert([availability])
      .select()
      .single();

    if (error) {
      console.error('Error upserting availability:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in upsertAvailability:', error);
    return null;
  }
}

/**
 * Delete availability slot
 */
export async function deleteAvailability(availabilityId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('coach_availability')
      .delete()
      .eq('id', availabilityId);

    if (error) {
      console.error('Error deleting availability:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteAvailability:', error);
    return false;
  }
}

/**
 * Bulk create sessions
 */
export async function bulkCreateSessions(
  sessions: Array<{
    coach_id: string;
    client_id: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    status?: 'scheduled' | 'confirmed';
    notes?: string;
  }>
): Promise<{ success: boolean; created: number; errors?: any[] }> {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert(sessions)
      .select();

    if (error) {
      console.error('Error bulk creating sessions:', error);
      return { success: false, created: 0, errors: [error] };
    }

    return { success: true, created: data?.length || 0 };
  } catch (error) {
    console.error('Error in bulkCreateSessions:', error);
    return { success: false, created: 0, errors: [error] };
  }
}

/**
 * Bulk update sessions
 */
export async function bulkUpdateSessions(
  sessionIds: string[],
  updates: {
    status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
    scheduled_date?: string;
    start_time?: string;
    end_time?: string;
    notes?: string;
  }
): Promise<{ success: boolean; updated: number; errors?: any[] }> {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .in('id', sessionIds)
      .select();

    if (error) {
      console.error('Error bulk updating sessions:', error);
      return { success: false, updated: 0, errors: [error] };
    }

    return { success: true, updated: data?.length || 0 };
  } catch (error) {
    console.error('Error in bulkUpdateSessions:', error);
    return { success: false, updated: 0, errors: [error] };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

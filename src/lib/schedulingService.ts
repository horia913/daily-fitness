/**
 * Scheduling Service
 * Centralized service for managing coach sessions, availability, and clipcards
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

export interface Clipcard {
  id: string;
  client_id: string;
  coach_id: string;
  clipcard_type_id: string;
  sessions_total: number;
  sessions_used: number;
  sessions_remaining: number;
  start_date: string;
  end_date: string;
  is_active: boolean; // Instead of status enum
  created_at?: string;
  updated_at?: string;
}

export interface ClipcardType {
  id: string;
  coach_id: string;
  name: string;
  sessions_count: number;
  validity_days: number;
  price: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
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

// ============================================================================
// Clipcards (Session Packs & Monthly Credits)
// ============================================================================

/**
 * Get clipcards for a client
 * @param clientId - Client UUID
 * @param activeOnly - If true, only return active (non-expired, non-exhausted) clipcards
 */
export async function getClientClipcards(
  clientId: string,
  activeOnly: boolean = true
): Promise<Clipcard[]> {
  try {
    let query = supabase
      .from('clipcards')
      .select('*')
      .eq('client_id', clientId)
      .order('start_date', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching clipcards:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getClientClipcards:', error);
    return [];
  }
}

/**
 * Get active clipcard for a client (most recent active one)
 */
export async function getActiveClipcardForClient(
  clientId: string
): Promise<Clipcard | null> {
  try {
    const { data, error } = await supabase
      .from('clipcards')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active clipcard:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getActiveClipcardForClient:', error);
    return null;
  }
}

/**
 * Create a new clipcard
 */
export async function createClipcardEntry(
  clipcard: Omit<Clipcard, 'id' | 'sessions_remaining' | 'created_at' | 'updated_at'>
): Promise<Clipcard | null> {
  try {
    // Calculate sessions_remaining
    const sessions_remaining = clipcard.sessions_total - clipcard.sessions_used;

    const { data, error } = await supabase
      .from('clipcards')
      .insert([{ ...clipcard, sessions_remaining }])
      .select()
      .single();

    if (error) {
      console.error('Error creating clipcard:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createClipcardentry:', error);
    return null;
  }
}

/**
 * Use a session from a clipcard (increment sessions_used)
 */
export async function useClipcardSession(clipcardId: string): Promise<boolean> {
  try {
    // Get current clipcard
    const { data: clipcard, error: fetchError } = await supabase
      .from('clipcards')
      .select('*')
      .eq('id', clipcardId)
      .single();

    if (fetchError || !clipcard) {
      console.error('Error fetching clipcard:', fetchError);
      return false;
    }

    // Check if sessions available
    if (clipcard.sessions_remaining <= 0) {
      console.error('No sessions remaining on clipcard');
      return false;
    }

    // Increment sessions_used
    const newSessionsUsed = clipcard.sessions_used + 1;
    const newSessionsRemaining = clipcard.sessions_total - newSessionsUsed;
    const newIsActive = newSessionsRemaining > 0; // Deactivate if no sessions left

    const { error: updateError } = await supabase
      .from('clipcards')
      .update({
        sessions_used: newSessionsUsed,
        sessions_remaining: newSessionsRemaining,
        is_active: newIsActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', clipcardId);

    if (updateError) {
      console.error('Error updating clipcard:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in useClipcardSession:', error);
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

/**
 * Helper: Check if client has active clipcard
 */
export async function hasActiveClipcardcard(clientId: string): Promise<boolean> {
  const clipcard = await getActiveClipcardForClient(clientId);
  return clipcard !== null && clipcard.sessions_remaining > 0;
}

// ============================================================================
// Clipcard Types (Templates)
// ============================================================================

/**
 * Get all clipcard types for a coach
 */
export async function getClipcardTypes(coachId: string): Promise<ClipcardType[]> {
  try {
    const { data, error } = await supabase
      .from('clipcard_types')
      .select('*')
      .eq('coach_id', coachId)
      .eq('is_active', true)
      .order('sessions_count', { ascending: true });

    if (error) {
      console.error('Error fetching clipcard types:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getClipcardTypes:', error);
    return [];
  }
}

/**
 * Create clipcard from type/template
 */
export async function createClipcardFromType(
  clientId: string,
  coachId: string,
  clipcardTypeId: string
): Promise<Clipcard | null> {
  try {
    // Get the type
    const { data: type, error: typeError } = await supabase
      .from('clipcard_types')
      .select('*')
      .eq('id', clipcardTypeId)
      .single();

    if (typeError || !type) {
      console.error('Error fetching clipcard type:', typeError);
      return null;
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + type.validity_days);

    // Create clipcard
    return await createClipcardEntry({
      client_id: clientId,
      coach_id: coachId,
      clipcard_type_id: clipcardTypeId,
      sessions_total: type.sessions_count,
      sessions_used: 0,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      is_active: true
    });
  } catch (error) {
    console.error('Error in createClipcardFromType:', error);
    return null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get sessions for a specific date
 */
export async function getSessionsForDate(
  coachId: string,
  date: string
): Promise<CoachSession[]> {
  return getCoachSessions(coachId, date, date);
}

/**
 * Get today's sessions for a coach
 */
export async function getTodaysSessions(coachId: string): Promise<CoachSession[]> {
  const today = new Date().toISOString().split('T')[0];
  return getSessionsForDate(coachId, today);
}

/**
 * Get upcoming sessions for a client (next 7 days)
 */
export async function getUpcomingClientSessions(
  clientId: string,
  daysAhead: number = 7
): Promise<CoachSession[]> {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const startDate = today.toISOString();
    const endDate = futureDate.toISOString();

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('client_id', clientId)
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)
      .in('status', ['scheduled'])
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching upcoming client sessions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUpcomingClientSessions:', error);
    return [];
  }
}


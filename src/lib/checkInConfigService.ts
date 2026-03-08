/**
 * Check-In Config Service
 * Coach-configurable check-in requirements per client (client_id null = coach default)
 */

import { supabase } from './supabase';

export interface CheckInConfig {
  id: string;
  coach_id: string;
  client_id: string | null;
  frequency_days: number;
  weight_required: boolean;
  body_fat_enabled: boolean;
  photos_enabled: boolean;
  circumferences_enabled: string[];
  notes_to_coach_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_CHECK_IN_CONFIG: Omit<CheckInConfig, 'id' | 'coach_id' | 'client_id'> = {
  frequency_days: 30,
  weight_required: true,
  body_fat_enabled: true,
  photos_enabled: true,
  circumferences_enabled: [],
  notes_to_coach_enabled: true,
};

/**
 * Get check-in config for a client. Uses client-specific config if present,
 * otherwise falls back to coach default (client_id IS NULL).
 */
export async function getClientCheckInConfig(clientId: string): Promise<CheckInConfig | null> {
  try {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('coach_id')
      .eq('client_id', clientId)
      .maybeSingle();

    const coachId = clientRow?.coach_id;
    if (!coachId) return null;

    const { data: configs, error } = await supabase
      .from('check_in_configs')
      .select('*')
      .eq('coach_id', coachId)
      .or(`client_id.eq.${clientId},client_id.is.null`);

    if (error) {
      console.error('Error fetching check-in config:', error);
      return null;
    }

    if (!configs?.length) return null;

    const clientSpecific = configs.find((c) => c.client_id === clientId);
    const config = (clientSpecific ?? configs.find((c) => c.client_id == null)) as CheckInConfig | undefined;
    if (!config) return null;

    return {
      ...config,
      circumferences_enabled: Array.isArray(config.circumferences_enabled) ? config.circumferences_enabled : [],
    };
  } catch (e) {
    console.error('getClientCheckInConfig error:', e);
    return null;
  }
}

/**
 * Get all check-in configs for a coach (for coach UI).
 */
export async function getCoachCheckInConfigs(coachId: string): Promise<CheckInConfig[]> {
  try {
    const { data, error } = await supabase
      .from('check_in_configs')
      .select('*')
      .eq('coach_id', coachId)
      .order('client_id', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching coach check-in configs:', error);
      return [];
    }

    return (data || []).map((row) => ({
      ...row,
      circumferences_enabled: Array.isArray(row.circumferences_enabled) ? row.circumferences_enabled : [],
    })) as CheckInConfig[];
  } catch (e) {
    console.error('getCoachCheckInConfigs error:', e);
    return [];
  }
}

export interface UpsertCheckInConfigInput {
  frequency_days?: number;
  weight_required?: boolean;
  body_fat_enabled?: boolean;
  photos_enabled?: boolean;
  circumferences_enabled?: string[];
  notes_to_coach_enabled?: boolean;
}

/**
 * Create or update check-in config for a coach-client pair.
 * Pass clientId = null for coach default template.
 */
export async function upsertCheckInConfig(
  coachId: string,
  clientId: string | null,
  input: UpsertCheckInConfigInput
): Promise<CheckInConfig | null> {
  try {
    const row = {
      coach_id: coachId,
      client_id: clientId,
      frequency_days: input.frequency_days ?? DEFAULT_CHECK_IN_CONFIG.frequency_days,
      weight_required: input.weight_required ?? DEFAULT_CHECK_IN_CONFIG.weight_required,
      body_fat_enabled: input.body_fat_enabled ?? DEFAULT_CHECK_IN_CONFIG.body_fat_enabled,
      photos_enabled: input.photos_enabled ?? DEFAULT_CHECK_IN_CONFIG.photos_enabled,
      circumferences_enabled: input.circumferences_enabled ?? DEFAULT_CHECK_IN_CONFIG.circumferences_enabled,
      notes_to_coach_enabled: input.notes_to_coach_enabled ?? DEFAULT_CHECK_IN_CONFIG.notes_to_coach_enabled,
      updated_at: new Date().toISOString(),
    };

    if (clientId === null) {
      const { data: existingDefault } = await supabase
        .from('check_in_configs')
        .select('id')
        .eq('coach_id', coachId)
        .is('client_id', null)
        .maybeSingle();

      if (existingDefault?.id) {
        const { data, error } = await supabase
          .from('check_in_configs')
          .update(row)
          .eq('id', existingDefault.id)
          .select()
          .single();
        if (error) {
          console.error('Error updating check-in config (default):', error);
          return null;
        }
        return { ...data, circumferences_enabled: data.circumferences_enabled ?? [] } as CheckInConfig;
      }

      const { data, error } = await supabase
        .from('check_in_configs')
        .insert(row)
        .select()
        .single();
      if (error) {
        console.error('Error inserting check-in config (default):', error);
        return null;
      }
      return { ...data, circumferences_enabled: data.circumferences_enabled ?? [] } as CheckInConfig;
    }

    const { data: existing } = await supabase
      .from('check_in_configs')
      .select('id')
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from('check_in_configs')
        .update(row)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) {
        console.error('Error updating check-in config:', error);
        return null;
      }
      return { ...data, circumferences_enabled: data.circumferences_enabled ?? [] } as CheckInConfig;
    }

    const { data, error } = await supabase
      .from('check_in_configs')
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error('Error inserting check-in config:', error);
      return null;
    }
    return { ...data, circumferences_enabled: data.circumferences_enabled ?? [] } as CheckInConfig;
  } catch (e) {
    console.error('upsertCheckInConfig error:', e);
    return null;
  }
}

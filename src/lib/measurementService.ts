/**
 * Body Measurement Service
 * Handles monthly body measurements for progress tracking and recomp challenges
 */

import { supabase } from './supabase';

// ============================================================================
// Type Definitions
// ============================================================================

export interface BodyMeasurement {
  id: string;
  client_id: string;
  coach_id?: string | null;
  measured_date: string; // DATE (YYYY-MM-DD)
  
  // Core measurements
  weight_kg?: number | null;
  waist_circumference?: number | null; // Right above iliac crest
  
  // Body composition
  body_fat_percentage?: number | null;
  muscle_mass_kg?: number | null;
  visceral_fat_level?: number | null;
  
  // Circumferences
  left_arm_circumference?: number | null;
  right_arm_circumference?: number | null;
  torso_circumference?: number | null;
  hips_circumference?: number | null;
  left_thigh_circumference?: number | null;
  right_thigh_circumference?: number | null;
  left_calf_circumference?: number | null;
  right_calf_circumference?: number | null;
  
  // Context
  measurement_method?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeasurementProgress {
  current: BodyMeasurement;
  previous?: BodyMeasurement | null;
  changes: {
    weight_kg: number;
    waist_cm: number;
    weight_percentage: number;
    waist_percentage: number;
  } | null;
  trend: 'improving' | 'stable' | 'declining' | 'no_data';
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get all measurements for a client
 * @param clientId - Client UUID
 * @param limit - Max number to return (default: all)
 */
export async function getClientMeasurements(
  clientId: string,
  limit?: number
): Promise<BodyMeasurement[]> {
  try {
    let query = supabase
      .from('body_metrics')
      .select('*')
      .eq('client_id', clientId)
      .order('measured_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching measurements:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getClientMeasurements:', error);
    return [];
  }
}

/**
 * Get latest measurement for a client
 */
export async function getLatestMeasurement(
  clientId: string
): Promise<BodyMeasurement | null> {
  try {
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('client_id', clientId)
      .order('measured_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest measurement:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getLatestMeasurement:', error);
    return null;
  }
}

/**
 * Get measurement for specific date
 */
export async function getMeasurementForDate(
  clientId: string,
  date: string
): Promise<BodyMeasurement | null> {
  try {
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('client_id', clientId)
      .eq('measured_date', date)
      .maybeSingle();

    if (error) {
      console.error('Error fetching measurement for date:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getMeasurementForDate:', error);
    return null;
  }
}

/**
 * Get measurements within date range
 */
export async function getMeasurementsInRange(
  clientId: string,
  startDate: string,
  endDate: string
): Promise<BodyMeasurement[]> {
  try {
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('client_id', clientId)
      .gte('measured_date', startDate)
      .lte('measured_date', endDate)
      .order('measured_date', { ascending: false });

    if (error) {
      console.error('Error fetching measurements in range:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMeasurementsInRange:', error);
    return [];
  }
}

/**
 * Create new measurement
 */
export async function createMeasurement(
  measurement: Omit<BodyMeasurement, 'id' | 'created_at' | 'updated_at'>
): Promise<BodyMeasurement | null> {
  try {
    const { data, error } = await supabase
      .from('body_metrics')
      .insert([measurement])
      .select()
      .single();

    if (error) {
      console.error('Error creating measurement:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createMeasurement:', error);
    return null;
  }
}

/**
 * Update existing measurement
 */
export async function updateMeasurement(
  measurementId: string,
  updates: Partial<Omit<BodyMeasurement, 'id' | 'client_id' | 'created_at'>>
): Promise<BodyMeasurement | null> {
  try {
    const { data, error } = await supabase
      .from('body_metrics')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', measurementId)
      .select()
      .single();

    if (error) {
      console.error('Error updating measurement:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateMeasurement:', error);
    return null;
  }
}

/**
 * Delete measurement
 */
export async function deleteMeasurement(measurementId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('body_metrics')
      .delete()
      .eq('id', measurementId);

    if (error) {
      console.error('Error deleting measurement:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteMeasurement:', error);
    return false;
  }
}

// ============================================================================
// Progress Analysis
// ============================================================================

/**
 * Get measurement progress (current vs previous)
 */
export async function getMeasurementProgress(
  clientId: string
): Promise<MeasurementProgress | null> {
  try {
    const measurements = await getClientMeasurements(clientId, 2);

    if (measurements.length === 0) {
      return {
        current: {} as BodyMeasurement,
        previous: null,
        changes: null,
        trend: 'no_data'
      };
    }

    const current = measurements[0];
    const previous = measurements.length > 1 ? measurements[1] : null;

    let changes = null;
    let trend: MeasurementProgress['trend'] = 'no_data';

    if (previous) {
      const weight_change = (current.weight_kg || 0) - (previous.weight_kg || 0);
      const waist_change = (current.waist_circumference || 0) - (previous.waist_circumference || 0);
      
      changes = {
        weight_kg: Math.round(weight_change * 100) / 100,
        waist_cm: Math.round(waist_change * 100) / 100,
        weight_percentage: Math.round((weight_change / (previous.weight_kg || 1)) * 10000) / 100,
        waist_percentage: Math.round((waist_change / (previous.waist_circumference || 1)) * 10000) / 100
      };

      // Determine trend (for recomp: less waist = better, weight depends on goal)
      if (waist_change < -1) {
        trend = 'improving'; // Waist decreasing
      } else if (waist_change > 1) {
        trend = 'declining'; // Waist increasing
      } else {
        trend = 'stable'; // Within 1cm
      }
    }

    return {
      current,
      previous,
      changes,
      trend
    };
  } catch (error) {
    console.error('Error in getMeasurementProgress:', error);
    return null;
  }
}

/**
 * Get measurement trend over time (for charts)
 */
export async function getMeasurementTrend(
  clientId: string,
  months: number = 6
): Promise<{
  dates: string[];
  weight: number[];
  waist: number[];
}> {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = new Date().toISOString().split('T')[0];

    const measurements = await getMeasurementsInRange(clientId, startDateStr, endDateStr);

    // Sort ascending for chart
    measurements.reverse();

    return {
      dates: measurements.map(m => m.measured_date),
      weight: measurements.map(m => m.weight_kg || 0),
      waist: measurements.map(m => m.waist_circumference || 0)
    };
  } catch (error) {
    console.error('Error in getMeasurementTrend:', error);
    return { dates: [], weight: [], waist: [] };
  }
}

// ============================================================================
// Challenge Support Functions
// ============================================================================

/**
 * Get measurements for recomp challenge period
 * @param clientId - Client UUID
 * @param startDate - Challenge start date
 * @param endDate - Challenge end date
 * @returns Start and end measurements with deltas
 */
export async function getChallengeProgress(
  clientId: string,
  startDate: string,
  endDate: string
): Promise<{
  start: BodyMeasurement | null;
  end: BodyMeasurement | null;
  waist_delta: number | null;
  weight_delta: number | null;
  waist_delta_percentage: number | null;
}> {
  try {
    const measurements = await getMeasurementsInRange(clientId, startDate, endDate);

    if (measurements.length === 0) {
      return {
        start: null,
        end: null,
        waist_delta: null,
        weight_delta: null,
        waist_delta_percentage: null
      };
    }

    // Get earliest (start) and latest (end)
    const sorted = measurements.sort((a, b) => 
      new Date(a.measured_date).getTime() - new Date(b.measured_date).getTime()
    );

    const start = sorted[0];
    const end = sorted[sorted.length - 1];

    const waist_delta = (end.waist_circumference || 0) - (start.waist_circumference || 0);
    const weight_delta = (end.weight_kg || 0) - (start.weight_kg || 0);
    const waist_delta_percentage = ((start.waist_circumference || 1) > 0) 
      ? (waist_delta / (start.waist_circumference || 1)) * 100 
      : 0;

    return {
      start,
      end,
      waist_delta: Math.round(waist_delta * 100) / 100,
      weight_delta: Math.round(weight_delta * 100) / 100,
      waist_delta_percentage: Math.round(waist_delta_percentage * 100) / 100
    };
  } catch (error) {
    console.error('Error in getChallengeProgress:', error);
    return {
      start: null,
      end: null,
      waist_delta: null,
      weight_delta: null,
      waist_delta_percentage: null
    };
  }
}

/**
 * Check if client is due for monthly measurement
 * @returns true if last measurement was >28 days ago
 */
export async function isDueForMeasurement(clientId: string): Promise<boolean> {
  try {
    const latest = await getLatestMeasurement(clientId);

    if (!latest) {
      return true; // Never measured
    }

    const lastMeasured = new Date(latest.measured_date);
    const today = new Date();
    const daysSince = Math.floor((today.getTime() - lastMeasured.getTime()) / (1000 * 60 * 60 * 24));

    return daysSince >= 28; // Monthly = every 4 weeks
  } catch (error) {
    console.error('Error in isDueForMeasurement:', error);
    return false;
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateMeasurement(
  measurement: Partial<BodyMeasurement>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // At least one measurement required
  if (!measurement.weight_kg && !measurement.waist_circumference) {
    errors.push('At least weight or waist measurement is required');
  }

  // Reasonable ranges
  if (measurement.weight_kg && (measurement.weight_kg < 30 || measurement.weight_kg > 300)) {
    errors.push('Weight seems unrealistic (30-300 kg expected)');
  }
  if (measurement.waist_circumference && (measurement.waist_circumference < 40 || measurement.waist_circumference > 200)) {
    errors.push('Waist seems unrealistic (40-200 cm expected)');
  }

  // Body fat percentage range
  if (measurement.body_fat_percentage !== null && measurement.body_fat_percentage !== undefined) {
    if (measurement.body_fat_percentage < 3 || measurement.body_fat_percentage > 60) {
      errors.push('Body fat percentage seems unrealistic (3-60% expected)');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}


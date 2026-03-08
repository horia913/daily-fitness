/**
 * Food Log Service
 * Handles individual food log entries for goal-based nutrition tracking
 * 
 * This service manages food_log_entries table and integrates with nutrition_logs
 * for daily macro aggregation. Only works when coach has set nutrition goals.
 */

import { supabase } from './supabase';
import { updateDailyLog, getClientNutritionMode, getClientNutritionGoals } from './nutritionLogService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface FoodLogEntry {
  id: string;
  client_id: string;
  food_id: string;
  log_date: string; // YYYY-MM-DD format
  meal_slot: 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack';
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Populated when fetching with food details
  food?: {
    id: string;
    name: string;
    brand?: string;
    serving_size: number;
    serving_unit: string;
  };
}

export interface AddEntryParams {
  food_id: string;
  log_date: string; // YYYY-MM-DD format
  meal_slot: 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack';
  quantity: number;
  unit: string;
  notes?: string;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Add a food log entry
 * 1. Looks up food from foods table to get per-serving macros
 * 2. Calculates actual macros based on quantity
 * 3. Inserts into food_log_entries
 * 4. Triggers daily log recalculation
 */
export async function addEntry(
  clientId: string,
  entry: AddEntryParams
): Promise<FoodLogEntry> {
  // Step 1: Look up food to get per-serving macros
  const { data: food, error: foodError } = await supabase
    .from('foods')
    .select('id, name, serving_size, serving_unit, calories_per_serving, protein, carbs, fat, fiber')
    .eq('id', entry.food_id)
    .single();

  if (foodError || !food) {
    throw new Error(`Food not found: ${foodError?.message || 'Unknown error'}`);
  }

  // Step 2: Calculate actual macros based on quantity
  // Multiplier = (entry quantity) / (food serving_size)
  const multiplier = entry.quantity / food.serving_size;
  
  const calculatedMacros = {
    calories: Math.round(food.calories_per_serving * multiplier),
    protein_g: Math.round((food.protein * multiplier) * 10) / 10, // Round to 1 decimal
    carbs_g: Math.round((food.carbs * multiplier) * 10) / 10,
    fat_g: Math.round((food.fat * multiplier) * 10) / 10,
    fiber_g: Math.round((food.fiber * multiplier) * 10) / 10,
  };

  // Step 3: Insert into food_log_entries
  const { data: newEntry, error: insertError } = await supabase
    .from('food_log_entries')
    .insert([{
      client_id: clientId,
      food_id: entry.food_id,
      log_date: entry.log_date,
      meal_slot: entry.meal_slot,
      quantity: entry.quantity,
      unit: entry.unit,
      calories: calculatedMacros.calories,
      protein_g: calculatedMacros.protein_g,
      carbs_g: calculatedMacros.carbs_g,
      fat_g: calculatedMacros.fat_g,
      fiber_g: calculatedMacros.fiber_g,
      notes: entry.notes || null,
    }])
    .select()
    .single();

  if (insertError || !newEntry) {
    throw new Error(`Failed to create food log entry: ${insertError?.message || 'Unknown error'}`);
  }

  // Step 4: Trigger daily log recalculation
  await updateDailyLog(clientId, entry.log_date);

  return newEntry as FoodLogEntry;
}

/**
 * Update an entry (quantity change)
 * Recalculates macros based on new quantity and updates daily log
 */
export async function updateEntry(
  entryId: string,
  quantity: number,
  clientId: string,
  logDate: string
): Promise<FoodLogEntry> {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }

  // Get the existing entry to find food_id
  const { data: existingEntry, error: fetchError } = await supabase
    .from('food_log_entries')
    .select('food_id')
    .eq('id', entryId)
    .eq('client_id', clientId)
    .single();

  if (fetchError || !existingEntry) {
    throw new Error(`Entry not found: ${fetchError?.message || 'Unknown error'}`);
  }

  // Look up food to recalculate macros
  const { data: food, error: foodError } = await supabase
    .from('foods')
    .select('serving_size, calories_per_serving, protein, carbs, fat, fiber')
    .eq('id', existingEntry.food_id)
    .single();

  if (foodError || !food) {
    throw new Error(`Food not found: ${foodError?.message || 'Unknown error'}`);
  }

  // Recalculate macros
  const multiplier = quantity / food.serving_size;
  const calculatedMacros = {
    calories: Math.round(food.calories_per_serving * multiplier),
    protein_g: Math.round((food.protein * multiplier) * 10) / 10,
    carbs_g: Math.round((food.carbs * multiplier) * 10) / 10,
    fat_g: Math.round((food.fat * multiplier) * 10) / 10,
    fiber_g: Math.round((food.fiber * multiplier) * 10) / 10,
  };

  // Update entry
  const { data: updatedEntry, error: updateError } = await supabase
    .from('food_log_entries')
    .update({
      quantity,
      calories: calculatedMacros.calories,
      protein_g: calculatedMacros.protein_g,
      carbs_g: calculatedMacros.carbs_g,
      fat_g: calculatedMacros.fat_g,
      fiber_g: calculatedMacros.fiber_g,
    })
    .eq('id', entryId)
    .eq('client_id', clientId)
    .select()
    .single();

  if (updateError || !updatedEntry) {
    throw new Error(`Failed to update entry: ${updateError?.message || 'Unknown error'}`);
  }

  // Recalculate daily log
  await updateDailyLog(clientId, logDate);

  return updatedEntry as FoodLogEntry;
}

/**
 * Delete an entry
 * Deletes entry and recalculates daily log
 */
export async function deleteEntry(
  entryId: string,
  clientId: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from('food_log_entries')
    .delete()
    .eq('id', entryId)
    .eq('client_id', clientId);

  if (error) {
    throw new Error(`Failed to delete entry: ${error.message}`);
  }

  // Recalculate daily log
  await updateDailyLog(clientId, date);
}

/**
 * Get all entries for a day
 * Includes food details, grouped by meal_slot, ordered by created_at
 */
export async function getDayEntries(
  clientId: string,
  date: string
): Promise<FoodLogEntry[]> {
  const { data, error } = await supabase
    .from('food_log_entries')
    .select(`
      *,
      foods (
        id,
        name,
        brand,
        serving_size,
        serving_unit
      )
    `)
    .eq('client_id', clientId)
    .eq('log_date', date)
    .order('meal_slot', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch entries: ${error.message}`);
  }

  // Transform to include food details
  return (data || []).map((entry: any) => ({
    ...entry,
    food: entry.foods ? {
      id: entry.foods.id,
      name: entry.foods.name,
      brand: entry.foods.brand,
      serving_size: entry.foods.serving_size,
      serving_unit: entry.foods.serving_unit,
    } : undefined,
  })) as FoodLogEntry[];
}

/**
 * Get entries for a date range (for history views)
 */
export async function getEntryRange(
  clientId: string,
  startDate: string,
  endDate: string
): Promise<FoodLogEntry[]> {
  const { data, error } = await supabase
    .from('food_log_entries')
    .select(`
      *,
      foods (
        id,
        name,
        brand,
        serving_size,
        serving_unit
      )
    `)
    .eq('client_id', clientId)
    .gte('log_date', startDate)
    .lte('log_date', endDate)
    .order('log_date', { ascending: false })
    .order('meal_slot', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch entries: ${error.message}`);
  }

  // Transform to include food details
  return (data || []).map((entry: any) => ({
    ...entry,
    food: entry.foods ? {
      id: entry.foods.id,
      name: entry.foods.name,
      brand: entry.foods.brand,
      serving_size: entry.foods.serving_size,
      serving_unit: entry.foods.serving_unit,
    } : undefined,
  })) as FoodLogEntry[];
}

/**
 * Quick-add: log same food as a previous entry
 * Copies food_id, quantity, unit from previous entry
 * Creates new entry for specified date
 */
export async function quickAdd(
  previousEntryId: string,
  date: string,
  clientId: string
): Promise<FoodLogEntry> {
  // Get the previous entry
  const { data: previousEntry, error: fetchError } = await supabase
    .from('food_log_entries')
    .select('food_id, quantity, unit, meal_slot')
    .eq('id', previousEntryId)
    .eq('client_id', clientId)
    .single();

  if (fetchError || !previousEntry) {
    throw new Error(`Previous entry not found: ${fetchError?.message || 'Unknown error'}`);
  }

  // Create new entry with same food, quantity, unit
  return addEntry(clientId, {
    food_id: previousEntry.food_id,
    log_date: date,
    meal_slot: previousEntry.meal_slot,
    quantity: previousEntry.quantity,
    unit: previousEntry.unit,
  });
}

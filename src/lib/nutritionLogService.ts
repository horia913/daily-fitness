/**
 * Nutrition Log Service
 * Handles daily nutrition log aggregation from multiple sources
 * 
 * Supports three modes:
 * - meal_plan: Macros from meal plan assignments (photo-logged meals)
 * - goal_based: Macros from food_log_entries (manual logging)
 * - hybrid: Both sources combined
 */

import { supabase } from './supabase';

// ============================================================================
// Type Definitions
// ============================================================================

export interface NutritionLog {
  id: string;
  client_id: string;
  log_date: string; // YYYY-MM-DD format
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  water_ml: number | null;
  notes: string | null;
  log_source: 'meal_plan' | 'goal_based' | 'hybrid';
  created_at: string;
  updated_at: string;
}

export type NutritionMode = 'meal_plan' | 'goal_based' | 'hybrid' | 'none';

// ============================================================================
// Mode Detection
// ============================================================================

/**
 * Determine client's nutrition mode
 * Checks for active meal plan assignment and nutrition goals
 */
export async function getClientNutritionMode(clientId: string): Promise<NutritionMode> {
  const today = new Date().toISOString().split('T')[0];

  // Check for active meal plan assignment
  const { data: assignment } = await supabase
    .from('meal_plan_assignments')
    .select('id')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .limit(1)
    .maybeSingle();

  const hasMealPlan = !!assignment;

  // Check for nutrition goals
  const { data: goals } = await supabase
    .from('goals')
    .select('id')
    .eq('client_id', clientId)
    .eq('pillar', 'nutrition')
    .eq('status', 'active')
    .limit(1);

  const hasGoals = (goals?.length || 0) > 0;

  // Determine mode
  if (hasMealPlan && hasGoals) {
    return 'hybrid';
  } else if (hasMealPlan) {
    return 'meal_plan';
  } else if (hasGoals) {
    return 'goal_based';
  } else {
    return 'none';
  }
}

/**
 * Get client's nutrition goals from goals table
 * Returns null if no goals set (client cannot log)
 */
export async function getClientNutritionGoals(clientId: string): Promise<{
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  water_ml?: number;
} | null> {
  const { data: goals, error } = await supabase
    .from('goals')
    .select('title, target_value, target_unit, pillar')
    .eq('client_id', clientId)
    .eq('pillar', 'nutrition')
    .eq('status', 'active');

  if (error || !goals || goals.length === 0) {
    return null;
  }

  // Map goals by pillar/title to extract values
  const result: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    water_ml?: number;
  } = {};

  for (const goal of goals) {
    const targetValue = goal.target_value ? Number(goal.target_value) : null;
    if (targetValue === null) continue;

    // Match by title or pillar-specific logic
    const titleLower = goal.title.toLowerCase();
    
    if (titleLower.includes('calorie') || titleLower.includes('cal')) {
      result.calories = targetValue;
    } else if (titleLower.includes('protein') || titleLower.includes('prot')) {
      result.protein = targetValue;
    } else if (titleLower.includes('carb') || titleLower.includes('carbohydrate')) {
      result.carbs = targetValue;
    } else if (titleLower.includes('fat')) {
      result.fat = targetValue;
    } else if (titleLower.includes('water') || titleLower.includes('hydration')) {
      // Convert liters to ml if needed
      if (goal.target_unit?.toLowerCase().includes('liter') || goal.target_unit?.toLowerCase().includes('l')) {
        result.water_ml = targetValue * 1000;
      } else {
        result.water_ml = targetValue;
      }
    }
  }

  // Return null if no goals found (empty object means no valid goals)
  return Object.keys(result).length > 0 ? result : null;
}

// ============================================================================
// Daily Log Aggregation
// ============================================================================

/**
 * Update daily nutrition log
 * Handles BOTH data sources (meal plan and food_log_entries)
 * 
 * Modes:
 * - meal_plan: Only meal plan macros (from photo-logged meals)
 * - goal_based: Only food_log_entries macros
 * - hybrid: Both combined (no double counting)
 */
export async function updateDailyLog(clientId: string, date: string): Promise<void> {
  // Step 1: Determine client mode
  const mode = await getClientNutritionMode(clientId);

  let mealPlanMacros = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    mealsLogged: 0,
  };

  let manualLogMacros = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    entriesCount: 0,
  };

  // Step 2: Calculate meal plan macros (if applicable)
  if (mode === 'meal_plan' || mode === 'hybrid') {
    // Get active meal plan assignment
    const today = date;
    const { data: assignment } = await supabase
      .from('meal_plan_assignments')
      .select('meal_plan_id')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .limit(1)
      .maybeSingle();

    if (assignment) {
      // Get meals in plan
      const { data: meals } = await supabase
        .from('meals')
        .select('id')
        .eq('meal_plan_id', assignment.meal_plan_id);

      if (meals && meals.length > 0) {
        const mealIds = meals.map(m => m.id);

        // Get today's meal completions (logged meals) — single source of truth for Fuel
        const { data: completions } = await supabase
          .from('meal_completions')
          .select('meal_id, meal_option_id')
          .eq('client_id', clientId)
          .eq('date', date)
          .in('meal_id', mealIds);

        const completionList = completions || [];

        if (completionList.length > 0) {
          const { data: foodItems } = await supabase
            .from('meal_food_items')
            .select(`
              meal_id,
              meal_option_id,
              quantity,
              unit,
              foods (
                serving_size,
                calories_per_serving,
                protein,
                carbs,
                fat,
                fiber
              )
            `)
            .in('meal_id', completionList.map((c: { meal_id: string }) => c.meal_id));

          if (foodItems) {
            for (const comp of completionList as { meal_id: string; meal_option_id: string | null }[]) {
              const matchingItems = (foodItems as any[]).filter(
                (item) =>
                  item.meal_id === comp.meal_id &&
                  (item.meal_option_id === comp.meal_option_id ||
                    (item.meal_option_id == null && comp.meal_option_id == null))
              );
              for (const item of matchingItems) {
                if (!item.foods) continue;
                const food = item.foods as any;
                const multiplier = item.quantity / (food.serving_size || 1);
                mealPlanMacros.calories += Math.round(food.calories_per_serving * multiplier);
                mealPlanMacros.protein_g += Math.round((food.protein * multiplier) * 10) / 10;
                mealPlanMacros.carbs_g += Math.round((food.carbs * multiplier) * 10) / 10;
                mealPlanMacros.fat_g += Math.round((food.fat * multiplier) * 10) / 10;
                mealPlanMacros.fiber_g += Math.round((food.fiber * multiplier) * 10) / 10;
              }
            }
          }
          mealPlanMacros.mealsLogged = completionList.length;
        }
      }
    }
  }

  // Step 3: Calculate manual log macros (if applicable)
  if (mode === 'goal_based' || mode === 'hybrid') {
    const { data: entries } = await supabase
      .from('food_log_entries')
      .select('calories, protein_g, carbs_g, fat_g, fiber_g')
      .eq('client_id', clientId)
      .eq('log_date', date);

    if (entries) {
      for (const entry of entries) {
        manualLogMacros.calories += entry.calories;
        manualLogMacros.protein_g += entry.protein_g;
        manualLogMacros.carbs_g += entry.carbs_g;
        manualLogMacros.fat_g += entry.fat_g;
        manualLogMacros.fiber_g += entry.fiber_g;
      }
      manualLogMacros.entriesCount = entries.length;
    }
  }

  // Step 4: Combine totals based on mode
  let finalMacros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    log_source: 'meal_plan' | 'goal_based' | 'hybrid';
  };

  if (mode === 'meal_plan') {
    finalMacros = {
      calories: Math.round(mealPlanMacros.calories),
      protein_g: Math.round(mealPlanMacros.protein_g * 10) / 10,
      carbs_g: Math.round(mealPlanMacros.carbs_g * 10) / 10,
      fat_g: Math.round(mealPlanMacros.fat_g * 10) / 10,
      fiber_g: Math.round(mealPlanMacros.fiber_g * 10) / 10,
      log_source: 'meal_plan',
    };
  } else if (mode === 'goal_based') {
    finalMacros = {
      calories: Math.round(manualLogMacros.calories),
      protein_g: Math.round(manualLogMacros.protein_g * 10) / 10,
      carbs_g: Math.round(manualLogMacros.carbs_g * 10) / 10,
      fat_g: Math.round(manualLogMacros.fat_g * 10) / 10,
      fiber_g: Math.round(manualLogMacros.fiber_g * 10) / 10,
      log_source: 'goal_based',
    };
  } else if (mode === 'hybrid') {
    // Combine both sources (no double counting - they're separate)
    finalMacros = {
      calories: Math.round(mealPlanMacros.calories + manualLogMacros.calories),
      protein_g: Math.round((mealPlanMacros.protein_g + manualLogMacros.protein_g) * 10) / 10,
      carbs_g: Math.round((mealPlanMacros.carbs_g + manualLogMacros.carbs_g) * 10) / 10,
      fat_g: Math.round((mealPlanMacros.fat_g + manualLogMacros.fat_g) * 10) / 10,
      fiber_g: Math.round((mealPlanMacros.fiber_g + manualLogMacros.fiber_g) * 10) / 10,
      log_source: 'hybrid',
    };
  } else {
    // No mode - zero out
    finalMacros = {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      log_source: 'meal_plan', // Default fallback
    };
  }

  // Step 5: Upsert nutrition_logs
  const { error: upsertError } = await supabase
    .from('nutrition_logs')
    .upsert({
      client_id: clientId,
      log_date: date,
      calories: finalMacros.calories,
      protein_g: finalMacros.protein_g,
      carbs_g: finalMacros.carbs_g,
      fat_g: finalMacros.fat_g,
      fiber_g: finalMacros.fiber_g,
      log_source: finalMacros.log_source,
    }, {
      onConflict: 'client_id,log_date',
    });

  if (upsertError) {
    console.error('Error updating nutrition log:', upsertError);
    throw new Error(`Failed to update nutrition log: ${upsertError.message}`);
  }
}

/**
 * Get daily nutrition log for a specific date
 */
export async function getDailyLog(
  clientId: string,
  date: string
): Promise<NutritionLog | null> {
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('client_id', clientId)
    .eq('log_date', date)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch nutrition log: ${error.message}`);
  }

  return data as NutritionLog | null;
}

/**
 * Get nutrition logs for a date range
 */
export async function getLogRange(
  clientId: string,
  startDate: string,
  endDate: string
): Promise<NutritionLog[]> {
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('client_id', clientId)
    .gte('log_date', startDate)
    .lte('log_date', endDate)
    .order('log_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch nutrition logs: ${error.message}`);
  }

  return (data || []) as NutritionLog[];
}

// ============================================================================
// Compliance trend (for charts)
// ============================================================================

export interface NutritionComplianceDay {
  date: string;
  compliance: number;
}

/**
 * Get daily nutrition compliance for a date range.
 * Uses nutrition_logs + goals: for each day, compliance % from calorie adherence
 * (within 10% of target = 100%; otherwise continuous scale down to 0).
 * If no calorie goal, days with a log are 100%, others 0.
 */
export async function getNutritionComplianceTrend(
  clientId: string,
  startDate: string,
  endDate: string
): Promise<NutritionComplianceDay[]> {
  const [logs, goals] = await Promise.all([
    getLogRange(clientId, startDate, endDate),
    getClientNutritionGoals(clientId),
  ]);

  const byDate = new Map<string, NutritionLog>();
  for (const log of logs) {
    byDate.set(log.log_date, log);
  }

  const result: NutritionComplianceDay[] = [];
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const log = byDate.get(dateStr);
    const calories = log?.calories ?? 0;

    let compliance = 0;
    const targetCal = goals?.calories ?? 0;

    if (targetCal > 0) {
      if (calories > 0) {
        const ratio = calories / targetCal;
        if (ratio >= 0.9 && ratio <= 1.1) {
          compliance = 100;
        } else {
          compliance = Math.round(
            Math.min(100, Math.max(0, 100 - Math.abs(ratio - 1) * 250))
          );
        }
      }
    } else {
      compliance = calories > 0 ? 100 : 0;
    }

    result.push({ date: dateStr, compliance });
  }

  return result.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

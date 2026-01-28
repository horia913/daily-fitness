/**
 * Client Progression Service
 * Compares previous week's logged workouts to current week's progression rules
 * and calculates progression suggestions for display in the workout executor
 */

import { supabase } from './supabase';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProgressionSuggestion {
  exerciseId: string;
  exerciseName: string;
  message: string;
  suggestedWeightIncrease?: number;
  suggestedWeightIncreaseKg?: number;
  currentWeight?: number;
  previousReps?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
}

interface PreviousWeekData {
  averageReps: number;
  averageWeight: number;
  setsCompleted: number;
  maxReps: number;
  minReps: number;
}

interface CurrentWeekRules {
  targetRepsMin: number;
  targetRepsMax: number;
  targetSets: number;
  targetWeight?: number;
}

interface ProgressionGuideline {
  category: string;
  difficulty: string;
  intensity_increase_week: number;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get previous week's workout data for an exercise
 */
export async function getPreviousWeekWorkoutData(
  assignmentId: string,
  currentWeek: number,
  exerciseId: string
): Promise<PreviousWeekData | null> {
  try {
    const previousWeek = currentWeek - 1;
    if (previousWeek < 1) {
      return null; // No previous week data
    }

    // Get user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    // Note: assignmentId here is program_assignment_id
    // We need to find workout_assignments linked to this program_assignment_id
    // via program_day_assignments, then get workout_logs for those assignments
    
    // First, get all workout_assignment_ids for this program_assignment
    const { data: programDayAssignments } = await supabase
      .from('program_day_assignments')
      .select('workout_assignment_id')
      .eq('program_assignment_id', assignmentId);

    if (!programDayAssignments || programDayAssignments.length === 0) {
      return null;
    }

    const workoutAssignmentIds = programDayAssignments
      .map((pda) => pda.workout_assignment_id)
      .filter((id): id is string => !!id);

    // Get program assignment progress to determine week dates
    const { data: progress } = await supabase
      .from('program_assignment_progress')
      .select('cycle_start_date')
      .eq('assignment_id', assignmentId)
      .eq('client_id', user.id)
      .maybeSingle();

    if (!progress) {
      return null;
    }

    // Calculate date range for previous week
    const cycleStart = new Date(progress.cycle_start_date);
    const previousWeekStart = new Date(cycleStart);
    previousWeekStart.setDate(cycleStart.getDate() + (previousWeek - 1) * 7);
    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekStart.getDate() + 7);

    // Get workout_logs from previous week for these workout assignments
    const { data: workoutLogs, error: logsError } = await supabase
      .from('workout_logs')
      .select('id')
      .in('workout_assignment_id', workoutAssignmentIds)
      .eq('client_id', user.id)
      .gte('started_at', previousWeekStart.toISOString())
      .lt('started_at', previousWeekEnd.toISOString());

    if (logsError || !workoutLogs || workoutLogs.length === 0) {
      return null;
    }

    const workoutLogIds = workoutLogs.map((log) => log.id);

    // Get set logs for previous week
    const { data: setLogs, error: setsError } = await supabase
      .from('workout_set_logs')
      .select('reps, weight')
      .in('workout_log_id', workoutLogIds)
      .eq('exercise_id', exerciseId)
      .eq('client_id', user.id)
      .not('reps', 'is', null)
      .not('weight', 'is', null);

    if (setsError || !setLogs || setLogs.length === 0) {
      return null;
    }

    // Filter by week (simplified - assumes sets are in chronological order)
    // In production, you'd want to join with workout_logs and check dates
    const validSets = setLogs.filter(
      (set) => set.reps !== null && set.weight !== null
    );

    if (validSets.length === 0) {
      return null;
    }

    // Calculate averages
    const totalReps = validSets.reduce(
      (sum, set) => sum + (set.reps as number),
      0
    );
    const totalWeight = validSets.reduce(
      (sum, set) => sum + (set.weight as number),
      0
    );
    const reps = validSets.map((set) => set.reps as number);
    const maxReps = Math.max(...reps);
    const minReps = Math.min(...reps);

    return {
      averageReps: totalReps / validSets.length,
      averageWeight: totalWeight / validSets.length,
      setsCompleted: validSets.length,
      maxReps,
      minReps,
    };
  } catch (error) {
    console.error('Error fetching previous week data:', error);
    return null;
  }
}

/**
 * Get current week's progression rules for an exercise
 */
export async function getCurrentWeekProgressionRules(
  assignmentId: string,
  currentWeek: number,
  exerciseId: string
): Promise<CurrentWeekRules | null> {
  try {
    // Get user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    // Query client_program_progression_rules for current week
    // Note: assignmentId here is program_assignment_id
    const { data: rules, error } = await supabase
      .from('client_program_progression_rules')
      .select('reps, sets, weight_kg')
      .eq('program_assignment_id', assignmentId)
      .eq('week_number', currentWeek)
      .eq('exercise_id', exerciseId)
      .maybeSingle();

    if (error || !rules) {
      return null;
    }

    // Parse reps range
    const repsRange = parseRepsRange(rules.reps);
    if (!repsRange) {
      return null;
    }

    return {
      targetRepsMin: repsRange.min,
      targetRepsMax: repsRange.max,
      targetSets: rules.sets || 0,
      targetWeight: rules.weight_kg || undefined,
    };
  } catch (error) {
    console.error('Error fetching current week rules:', error);
    return null;
  }
}

/**
 * Parse reps range string (e.g., "10-12" or "10") to min/max
 */
export function parseRepsRange(repsString: string | null | undefined): {
  min: number;
  max: number;
} | null {
  if (!repsString || typeof repsString !== 'string') {
    return null;
  }

  const trimmed = repsString.trim();

  // Handle range format "10-12"
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-').map((p) => p.trim());
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const max = parseInt(parts[1], 10);
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        return { min, max };
      }
    }
  }

  // Handle single number "10"
  const single = parseInt(trimmed, 10);
  if (!isNaN(single) && single > 0) {
    return { min: single, max: single };
  }

  return null;
}

/**
 * Get progression guideline for a category and difficulty
 */
async function getProgressionGuidelineForCategory(
  category: string,
  difficulty: string
): Promise<ProgressionGuideline | null> {
  try {
    const { data, error } = await supabase
      .from('progression_guidelines')
      .select('intensity_increase_week')
      .eq('category', category)
      .eq('difficulty', difficulty)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      category,
      difficulty,
      intensity_increase_week: data.intensity_increase_week || 2.5, // Default 2.5%
    };
  } catch (error) {
    console.error('Error fetching progression guideline:', error);
    return null;
  }
}

/**
 * Calculate progression suggestion by comparing previous week to current week rules
 */
export async function calculateProgressionSuggestion(
  previousData: PreviousWeekData,
  currentRules: CurrentWeekRules,
  exerciseId: string,
  exerciseName: string,
  category?: string,
  difficulty?: string
): Promise<ProgressionSuggestion | null> {
  try {
    // Check if previous reps exceeded target range
    const repsOverTarget =
      previousData.maxReps > currentRules.targetRepsMax
        ? previousData.maxReps - currentRules.targetRepsMax
        : 0;

    // If no reps over target, no progression needed
    if (repsOverTarget === 0) {
      return null;
    }

    // Get progression guideline for intensity increase
    let intensityIncrease = 2.5; // Default 2.5%
    if (category && difficulty) {
      const guideline = await getProgressionGuidelineForCategory(
        category,
        difficulty
      );
      if (guideline) {
        intensityIncrease = guideline.intensity_increase_week;
      }
    }

    // Calculate suggested weight increase
    const suggestedWeightIncrease = intensityIncrease;
    const suggestedWeightIncreaseKg =
      previousData.averageWeight * (intensityIncrease / 100);

    // Build message
    const message = `Last week: +${repsOverTarget} reps over target range (${currentRules.targetRepsMin}-${currentRules.targetRepsMax}). Suggested: Add +${intensityIncrease}% weight [${suggestedWeightIncreaseKg.toFixed(1)}] kg`;

    return {
      exerciseId,
      exerciseName,
      message,
      suggestedWeightIncrease,
      suggestedWeightIncreaseKg,
      currentWeight: previousData.averageWeight,
      previousReps: previousData.maxReps,
      targetRepsMin: currentRules.targetRepsMin,
      targetRepsMax: currentRules.targetRepsMax,
    };
  } catch (error) {
    console.error('Error calculating progression suggestion:', error);
    return null;
  }
}

/**
 * Get progression suggestions for all exercises in a workout
 * This is the main function to call from the workout executor
 */
export async function getProgressionSuggestionsForWorkout(
  assignmentId: string,
  currentWeek: number,
  exerciseIds: string[],
  exerciseNames: Map<string, string>,
  category?: string,
  difficulty?: string
): Promise<Map<string, ProgressionSuggestion>> {
  const suggestions = new Map<string, ProgressionSuggestion>();

  // Process exercises in parallel
  const promises = exerciseIds.map(async (exerciseId) => {
    const exerciseName = exerciseNames.get(exerciseId) || 'Exercise';

    // Get previous week data
    const previousData = await getPreviousWeekWorkoutData(
      assignmentId,
      currentWeek,
      exerciseId
    );
    if (!previousData) {
      return null;
    }

    // Get current week rules
    const currentRules = await getCurrentWeekProgressionRules(
      assignmentId,
      currentWeek,
      exerciseId
    );
    if (!currentRules) {
      return null;
    }

    // Calculate suggestion
    const suggestion = await calculateProgressionSuggestion(
      previousData,
      currentRules,
      exerciseId,
      exerciseName,
      category,
      difficulty
    );

    return suggestion ? { exerciseId, suggestion } : null;
  });

  const results = await Promise.all(promises);

  // Build map
  results.forEach((result) => {
    if (result) {
      suggestions.set(result.exerciseId, result.suggestion);
    }
  });

  return suggestions;
}

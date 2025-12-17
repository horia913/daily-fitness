/**
 * Utility functions for 1RM (one-rep max) calculations and suggested weights
 */

/**
 * Calculate estimated 1RM using Epley formula
 * e1RM = weight × (1 + 0.0333 × reps)
 */
export function calculateE1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) {
    return 0
  }
  return weight * (1 + 0.0333 * reps)
}

/**
 * Calculate suggested weight based on load percentage and e1RM
 * @param exercise_id - Exercise ID
 * @param load_percentage - Load percentage (e.g., 70 for 70% of 1RM)
 * @param e1rmMap - Map of exercise_id to e1RM values
 * @returns Suggested weight in kg, or null if e1RM not available
 */
export function calculateSuggestedWeight(
  exercise_id: string,
  load_percentage: number | null | undefined,
  e1rmMap: Record<string, number>
): number | null {
  if (!load_percentage || load_percentage <= 0) {
    return null
  }
  
  const e1rm = e1rmMap[exercise_id]
  if (!e1rm || e1rm <= 0) {
    return null
  }
  
  const suggested = e1rm * (load_percentage / 100)
  // Round to nearest 0.5 kg
  return Math.round(suggested * 2) / 2
}

/**
 * Format suggested weight display string
 * @param load_percentage - Load percentage
 * @param suggestedWeight - Suggested weight in kg, or null
 * @returns Formatted string like "70% Load - Suggested: 70kg" or "70% Load - Suggested: Log first set to calculate"
 */
export function formatSuggestedWeight(
  load_percentage: number | null | undefined,
  suggestedWeight: number | null
): string | null {
  if (!load_percentage || load_percentage <= 0) {
    return null
  }
  
  if (suggestedWeight !== null && suggestedWeight > 0) {
    return `${load_percentage}% Load - Suggested: ${suggestedWeight}kg`
  }
  
  return `${load_percentage}% Load - Suggested: Log first set to calculate`
}

/**
 * Fetch e1RMs for multiple exercises
 * @param exerciseIds - Array of exercise IDs
 * @param supabase - Supabase client
 * @returns Map of exercise_id to e1RM values
 */
export async function fetchE1RMs(
  exerciseIds: string[],
  supabase: any
): Promise<Record<string, number>> {
  if (!exerciseIds || exerciseIds.length === 0) {
    return {}
  }
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {}
    }
    
    const { data, error } = await supabase
      .from('user_exercise_metrics')
      .select('exercise_id, estimated_1rm')
      .eq('user_id', user.id)
      .in('exercise_id', exerciseIds)
    
    if (error) {
      console.error('Error fetching e1RMs:', error)
      return {}
    }
    
    const e1rmMap: Record<string, number> = {}
    if (data) {
      data.forEach((row: { exercise_id: string; estimated_1rm: number }) => {
        e1rmMap[row.exercise_id] = parseFloat(row.estimated_1rm.toString())
      })
    }
    
    return e1rmMap
  } catch (error) {
    console.error('Error in fetchE1RMs:', error)
    return {}
  }
}


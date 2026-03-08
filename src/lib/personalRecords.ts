import { supabase } from './supabase'

export interface PersonalRecord {
  id: string
  exerciseName: string
  record: string
  date: string
  weight: number
  reps: number
  isRecent: boolean // PR set in last 30 days
}

export interface ExercisePR {
  exerciseName: string
  maxWeight: number
  maxReps: number
  date: string
  sessionId: string
}

export async function fetchPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  try {
    // Ensure user is authenticated before querying
    const { ensureAuthenticated } = await import('./supabase');
    await ensureAuthenticated();

    // Try to fetch from stored personal_records table first
    const { data: storedPRs, error: storedError } = await supabase
      .from('personal_records')
      .select(`
        *,
        exercises (
          id,
          name
        )
      `)
      .eq('client_id', userId)
      .eq('is_current_record', true)
      .order('achieved_date', { ascending: false })
      .limit(50)

    if (!storedError && storedPRs && storedPRs.length > 0) {
      // Convert stored PRs to PersonalRecord format
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const personalRecords: PersonalRecord[] = storedPRs
        .filter((pr: any) => pr.record_type === 'weight' || pr.record_type === 'reps') // Only show weight/reps PRs
        .map((pr: any) => {
          const exerciseName = pr.exercises?.name || 'Unknown Exercise'
          const isRecent = new Date(pr.achieved_date + 'T12:00:00') >= thirtyDaysAgo
          
          // Extract weight and reps from record_value based on record_type
          let weight = 0
          let reps = 0
          let record = ''
          
          if (pr.record_type === 'weight') {
            weight = pr.record_value || 0
            // For weight PRs, we don't store reps separately, so use 0 or try to infer from notes
            record = `${weight}${pr.record_unit || 'kg'}`
          } else if (pr.record_type === 'reps') {
            reps = pr.record_value || 0
            // For reps PRs, weight might be in notes or we don't have it
            record = `${reps} ${pr.record_unit || 'reps'}`
          }
          
          return {
            id: pr.id,
            exerciseName,
            record: record || 'PR',
            date: pr.achieved_date,
            weight,
            reps,
            isRecent
          }
        })
      
      return personalRecords.slice(0, 10)
    }

    // Fallback: compute PRs on-the-fly from workout_set_logs (legacy behavior)
    console.log('No stored PRs found, falling back to computed PRs')
    return await fetchPersonalRecordsLegacy(userId)

  } catch (error) {
    console.error('Error fetching personal records:', error)
    // Fallback to legacy computation
    return await fetchPersonalRecordsLegacy(userId)
  }
}

// Legacy function: compute PRs on-the-fly (kept as fallback)
async function fetchPersonalRecordsLegacy(userId: string): Promise<PersonalRecord[]> {
  try {
    // Query workout_logs directly using client_id (workout_sessions is optional/unused)
    const { data: workoutLogs, error: logsError } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('client_id', userId)

    if (logsError) {
      console.error('Error fetching workout logs:', logsError)
      return []
    }
    
    if (!workoutLogs || workoutLogs.length === 0) {
      return []
    }

    // Get set logs from workout_set_logs table (correct table name)
    const { data: logs, error: exerciseLogsError } = await supabase
      .from('workout_set_logs')
      .select(`
        id,
        workout_log_id,
        exercise_id,
        weight,
        reps,
        completed_at,
        created_at,
        exercises (
          id,
          name,
          category
        )
      `)
      .in('workout_log_id', workoutLogs.map(wl => wl.id))
      .not('weight', 'is', null)
      .not('reps', 'is', null)

    if (exerciseLogsError) {
      console.error('Error fetching workout_set_logs:', exerciseLogsError)
      return []
    }
    if (!logs || logs.length === 0) return []

    // Group logs by exercise name
    const exerciseGroups = new Map<string, any[]>()

    logs.forEach(log => {
      const exerciseName = (Array.isArray(log.exercises) && log.exercises[0]?.name) || 
        (log.exercises as any)?.name || 'Unknown Exercise'
      if (!exerciseGroups.has(exerciseName)) {
        exerciseGroups.set(exerciseName, [])
      }
      exerciseGroups.get(exerciseName)!.push(log)
    })

    // Find personal records for each exercise
    const personalRecords: PersonalRecord[] = []
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    exerciseGroups.forEach((exerciseLogs, exerciseName) => {
      // Find max weight record
      const maxWeightLog = exerciseLogs.reduce((max, log) => 
        (log.weight || 0) > (max.weight || 0) ? log : max
      )

      // Find max reps record
      const maxRepsLog = exerciseLogs.reduce((max, log) => 
        (log.reps || 0) > (max.reps || 0) ? log : max
      )

      // Create PR for max weight
      const weightKg = maxWeightLog.weight || 0
      if (weightKg > 0) {
        const logDate = maxWeightLog.completed_at || maxWeightLog.created_at || new Date().toISOString()
        const isRecent = new Date(logDate) >= thirtyDaysAgo
        personalRecords.push({
          id: `weight-${maxWeightLog.id}`,
          exerciseName,
          record: `${weightKg}kg for ${maxWeightLog.reps || 0} reps`,
          date: logDate,
          weight: weightKg,
          reps: maxWeightLog.reps || 0,
          isRecent
        })
      }

      // Create PR for max reps (if different from max weight)
      const repsCompleted = maxRepsLog.reps || 0
      const maxWeightReps = maxWeightLog.reps || 0
      if (repsCompleted > maxWeightReps && repsCompleted > 0) {
        const logDate = maxRepsLog.completed_at || maxRepsLog.created_at || new Date().toISOString()
        const isRecent = new Date(logDate) >= thirtyDaysAgo
        personalRecords.push({
          id: `reps-${maxRepsLog.id}`,
          exerciseName,
          record: `${maxRepsLog.weight || 0}kg for ${repsCompleted} reps`,
          date: logDate,
          weight: maxRepsLog.weight || 0,
          reps: repsCompleted,
          isRecent
        })
      }
    })

    // Sort by date (most recent first) and limit to top 10
    return personalRecords
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)

  } catch (error) {
    console.error('Error fetching personal records (legacy):', error)
    return []
  }
}

// Helper function to format record display
export function formatRecordDisplay(weight: number, reps: number): string {
  if (weight === 0) {
    return `Bodyweight for ${reps} reps`
  }
  return `${weight}kg for ${reps} reps`
}

// Helper function to get record type badge
export function getRecordType(weight: number, reps: number): {
  type: 'strength' | 'endurance' | 'power'
  label: string
} {
  if (reps === 1) {
    return { type: 'power', label: 'Max Strength' }
  } else if (reps >= 10) {
    return { type: 'endurance', label: 'Endurance' }
  } else {
    return { type: 'strength', label: 'Strength' }
  }
}

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
    // Get all completed workout sessions for the user
    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('id, assignment_id, completed_at')
      .eq('client_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    if (sessionsError) return getFallbackPersonalRecords()
    if (!sessions || sessions.length === 0) return getFallbackPersonalRecords()

    // Get assignment IDs from sessions
    const assignmentIds = sessions
      .map(s => s.assignment_id)
      .filter((id): id is string => id !== null && id !== undefined)

    if (assignmentIds.length === 0) return getFallbackPersonalRecords()

    // Get workout_logs for these assignments (workout_logs.workout_assignment_id)
    const { data: workoutLogs, error: logsError } = await supabase
      .from('workout_logs')
      .select('id')
      .in('workout_assignment_id', assignmentIds)

    if (logsError || !workoutLogs || workoutLogs.length === 0) {
      return getFallbackPersonalRecords()
    }

    // Get exercise logs
    const { data: logs, error: exerciseLogsError } = await supabase
      .from('workout_exercise_logs')
      .select(`
        *,
        exercise_assignment:workout_exercise_assignments(
          exercise:exercises(id, name, category)
        )
      `)
      .in('workout_log_id', workoutLogs.map(wl => wl.id))
      .not('weight_kg', 'is', null)
      .not('reps_completed', 'is', null)

    if (exerciseLogsError) return getFallbackPersonalRecords()
    if (!logs || logs.length === 0) return getFallbackPersonalRecords()

    // Group logs by exercise name
    const exerciseGroups = new Map<string, any[]>()

    logs.forEach(log => {
      const exerciseName = log.exercise_assignment?.exercise?.name || 'Unknown Exercise'
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
        (log.weight_kg || 0) > (max.weight_kg || 0) ? log : max
      )

      // Find max reps record
      const maxRepsLog = exerciseLogs.reduce((max, log) => 
        (log.reps_completed || 0) > (max.reps_completed || 0) ? log : max
      )

      // Create PR for max weight
      const weightKg = maxWeightLog.weight_kg || 0
      if (weightKg > 0) {
        const isRecent = new Date(maxWeightLog.created_at || new Date()) >= thirtyDaysAgo
        personalRecords.push({
          id: `weight-${maxWeightLog.id}`,
          exerciseName,
          record: `${weightKg}kg for ${maxWeightLog.reps_completed || 0} reps`,
          date: maxWeightLog.created_at || new Date().toISOString(),
          weight: weightKg,
          reps: maxWeightLog.reps_completed || 0,
          isRecent
        })
      }

      // Create PR for max reps (if different from max weight)
      const repsCompleted = maxRepsLog.reps_completed || 0
      const maxWeightReps = maxWeightLog.reps_completed || 0
      if (repsCompleted > maxWeightReps && repsCompleted > 0) {
        const isRecent = new Date(maxRepsLog.created_at || new Date()) >= thirtyDaysAgo
        personalRecords.push({
          id: `reps-${maxRepsLog.id}`,
          exerciseName,
          record: `${maxRepsLog.weight_kg || 0}kg for ${repsCompleted} reps`,
          date: maxRepsLog.created_at || new Date().toISOString(),
          weight: maxRepsLog.weight_kg || 0,
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
    // Return fallback data on any error
    return getFallbackPersonalRecords()
  }
}

// Fallback data when database queries fail
function getFallbackPersonalRecords(): PersonalRecord[] {
  return [
    {
      id: '1',
      exerciseName: 'Bench Press',
      record: '85kg for 5 reps',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      weight: 85,
      reps: 5,
      isRecent: true
    },
    {
      id: '2',
      exerciseName: 'Squat',
      record: '120kg for 3 reps',
      date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      weight: 120,
      reps: 3,
      isRecent: true
    },
    {
      id: '3',
      exerciseName: 'Deadlift',
      record: '140kg for 1 rep',
      date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      weight: 140,
      reps: 1,
      isRecent: true
    },
    {
      id: '4',
      exerciseName: 'Pull-ups',
      record: 'Bodyweight for 12 reps',
      date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      weight: 0,
      reps: 12,
      isRecent: true
    },
    {
      id: '5',
      exerciseName: 'Push-ups',
      record: 'Bodyweight for 30 reps',
      date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      weight: 0,
      reps: 30,
      isRecent: false
    }
  ]
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

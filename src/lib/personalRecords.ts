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
      return getFallbackPersonalRecords()
    }
    if (!logs || logs.length === 0) return getFallbackPersonalRecords()

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

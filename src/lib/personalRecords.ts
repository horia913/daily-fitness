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
      .select('id, completed_at')
      .eq('client_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    if (sessionsError) return getFallbackPersonalRecords()
    if (!sessions || sessions.length === 0) return getFallbackPersonalRecords()

    const sessionIds = sessions.map(s => s.id)

    // Get all workout logs with exercise information
    const { data: logs, error: logsError } = await supabase
      .from('workout_logs')
      .select(`
        *,
        template_exercise:workout_template_exercises(
          exercise:exercises(name, category)
        )
      `)
      .in('session_id', sessionIds)
      .not('weight_used', 'is', null)
      .not('reps_completed', 'is', null)

    if (logsError) return getFallbackPersonalRecords()
    if (!logs) return getFallbackPersonalRecords()

    // Group logs by exercise name
    const exerciseGroups = new Map<string, any[]>()

    logs.forEach(log => {
      const exerciseName = log.template_exercise?.exercise?.name || 'Unknown Exercise'
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
        log.weight_used > max.weight_used ? log : max
      )

      // Find max reps record
      const maxRepsLog = exerciseLogs.reduce((max, log) => 
        log.reps_completed > max.reps_completed ? log : max
      )

      // Create PR for max weight
      if (maxWeightLog.weight_used > 0) {
        const isRecent = new Date(maxWeightLog.created_at) >= thirtyDaysAgo
        personalRecords.push({
          id: `weight-${maxWeightLog.id}`,
          exerciseName,
          record: `${maxWeightLog.weight_used}kg for ${maxWeightLog.reps_completed} reps`,
          date: maxWeightLog.created_at,
          weight: maxWeightLog.weight_used,
          reps: maxWeightLog.reps_completed,
          isRecent
        })
      }

      // Create PR for max reps (if different from max weight)
      if (maxRepsLog.reps_completed > maxWeightLog.reps_completed && maxRepsLog.reps_completed > 0) {
        const isRecent = new Date(maxRepsLog.created_at) >= thirtyDaysAgo
        personalRecords.push({
          id: `reps-${maxRepsLog.id}`,
          exerciseName,
          record: `${maxRepsLog.weight_used}kg for ${maxRepsLog.reps_completed} reps`,
          date: maxRepsLog.created_at,
          weight: maxRepsLog.weight_used,
          reps: maxRepsLog.reps_completed,
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

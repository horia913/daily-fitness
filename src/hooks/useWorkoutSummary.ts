'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  DynamicSummaryGenerator, 
  WorkoutData, 
  UserProfile, 
  WorkoutComparison 
} from '@/lib/dynamicSummary'
import { supabase } from '@/lib/supabase'

interface WorkoutLog {
  id: string
  session_id: string
  template_exercise_id: string
  set_number: number
  weight_used: number
  reps_completed: number
  rest_taken: number
  rpe: number
  notes: string
  created_at: string
}

interface WorkoutSession {
  id: string
  assignment_id: string
  client_id: string
  started_at: string
  completed_at?: string
  total_duration?: number
  status: 'in_progress' | 'completed' | 'abandoned'
  notes?: string
  assignment?: {
    id: string
    template_id: string
    template?: {
      id: string
      name: string
      description?: string
      estimated_duration: number
      difficulty_level: string
    }
  }
}

export function useWorkoutSummary(userId: string, sessionId?: string, workoutLogId?: string) {
  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [comparison, setComparison] = useState<WorkoutComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load workout data and user profile
  useEffect(() => {
    if (userId) {
      loadWorkoutSummaryData()
    }
  }, [userId, sessionId, workoutLogId])

  const loadWorkoutSummaryData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load user profile
      const profile = await loadUserProfile(userId)
      setUserProfile(profile)

      // Load workout data - try sessionId first, then workoutLogId as fallback
      if (sessionId) {
        const workout = await loadWorkoutData(sessionId)
        setWorkoutData(workout)

        // Load comparison data
        const comparisonData = await loadComparisonData(userId, workout)
        setComparison(comparisonData)
      } else if (workoutLogId) {
        // Fallback: Load from workout_log_id
        const workout = await loadWorkoutDataFromLogId(workoutLogId, userId)
        setWorkoutData(workout)

        // Load comparison data
        const comparisonData = await loadComparisonData(userId, workout)
        setComparison(comparisonData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workout summary')
    } finally {
      setLoading(false)
    }
  }, [userId, sessionId, workoutLogId])

  const loadUserProfile = async (userId: string): Promise<UserProfile> => {
    try {
      // Load user profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      // Load user stats
      const stats = await loadUserStats(userId)

      return {
        id: userId,
        name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'User',
        fitnessLevel: profileData.fitness_level || 'intermediate',
        goals: profileData.goals || [],
        preferences: {
          summaryStyle: 'detailed',
          showProgress: true,
          showRecommendations: true,
          showComparisons: true
        },
        stats
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      // Return default profile
      return {
        id: userId,
        name: 'User',
        fitnessLevel: 'intermediate',
        goals: [],
        preferences: {
          summaryStyle: 'detailed',
          showProgress: true,
          showRecommendations: true,
          showComparisons: true
        },
        stats: {
          totalWorkouts: 0,
          averageWorkoutDuration: 45,
          favoriteExercises: [],
          strengthProgress: 0,
          consistency: 70
        }
      }
    }
  }

  const loadUserStats = async (userId: string) => {
    try {
      // Load workout statistics
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (sessionsError) throw sessionsError

      const totalWorkouts = sessions?.length || 0
      const averageWorkoutDuration = sessions?.length 
        ? sessions.reduce((sum, session) => sum + (session.total_duration || 0), 0) / sessions.length
        : 45

      // Calculate consistency (workouts per week over last 4 weeks)
      const fourWeeksAgo = new Date()
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
      
      const recentSessions = sessions?.filter(session => 
        new Date(session.completed_at || session.started_at) >= fourWeeksAgo
      ) || []

      const consistency = Math.min(100, (recentSessions.length / 4) * 25) // 4 workouts per week = 100%

      return {
        totalWorkouts,
        averageWorkoutDuration: Math.round(averageWorkoutDuration),
        favoriteExercises: [], // Would need to analyze exercise data
        strengthProgress: 0, // Would need to analyze weight progression
        consistency: Math.round(consistency)
      }
    } catch (error) {
      console.error('Error loading user stats:', error)
      return {
        totalWorkouts: 0,
        averageWorkoutDuration: 45,
        favoriteExercises: [],
        strengthProgress: 0,
        consistency: 70
      }
    }
  }

  const loadWorkoutData = async (sessionId: string): Promise<WorkoutData> => {
    try {
      // Load workout session
      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          assignment:workout_assignments(
            *,
            template:workout_templates(*)
          )
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError

      // Load workout logs
      const { data: logs, error: logsError } = await supabase
        .from('workout_logs')
        .select(`
          *,
          exercise:workout_template_exercises(
            *,
            exercise:exercises(*)
          )
        `)
        .eq('session_id', sessionId)

      if (logsError) throw logsError

      // Process workout data
      const exercises = processExerciseData(logs || [])
      const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0)
      const completedSets = exercises.reduce((sum, ex) => sum + ex.completedSets, 0)
      const totalWeight = exercises.reduce((sum, ex) => sum + (ex.weight * ex.completedSets), 0)
      const averageRPE = logs?.length 
        ? logs.reduce((sum, log) => sum + (log.rpe || 5), 0) / logs.length
        : undefined

      return {
        id: session.id,
        name: session.assignment?.template?.name || 'Workout',
        duration: session.total_duration || 45,
        difficulty: session.assignment?.template?.difficulty_level || 'intermediate',
        exercises,
        completedAt: session.completed_at || session.started_at,
        totalSets,
        completedSets,
        totalWeight,
        averageRPE,
        restTime: logs?.reduce((sum, log) => sum + (log.rest_taken || 0), 0) || 0
      }
    } catch (error) {
      console.error('Error loading workout data:', error)
      throw error
    }
  }

  const loadWorkoutDataFromLogId = async (workoutLogId: string, userId: string): Promise<WorkoutData> => {
    try {
      // Load workout_log
      const { data: workoutLog, error: logError } = await supabase
        .from('workout_logs')
        .select(`
          *,
          workout_assignment:workout_assignments(
            *,
            template:workout_templates(*)
          )
        `)
        .eq('id', workoutLogId)
        .eq('client_id', userId)
        .single()

      if (logError) throw logError

      // Load workout_set_logs for this workout_log
      const { data: setLogs, error: setsError } = await supabase
        .from('workout_set_logs')
        .select(`
          *,
          exercise:exercises(*)
        `)
        .eq('workout_log_id', workoutLogId)
        .eq('client_id', userId)

      if (setsError) throw setsError

      // Process set logs into exercise data
      const exerciseMap = new Map<string, any>()
      
      setLogs?.forEach((setLog: any) => {
        const exerciseId = setLog.exercise_id
        if (!exerciseId) return

        if (!exerciseMap.has(exerciseId)) {
          exerciseMap.set(exerciseId, {
            id: exerciseId,
            name: setLog.exercise?.name || 'Unknown Exercise',
            sets: 0,
            completedSets: 0,
            weight: 0,
            reps: [],
            restTime: 0
          })
        }

        const exercise = exerciseMap.get(exerciseId)!
        exercise.sets += 1
        exercise.completedSets += 1
        exercise.weight = Math.max(exercise.weight, setLog.weight || 0)
        exercise.reps.push(setLog.reps || 0)
      })

      const exercises = Array.from(exerciseMap.values())
      const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0)
      const completedSets = exercises.reduce((sum, ex) => sum + ex.completedSets, 0)
      const totalWeight = exercises.reduce((sum, ex) => sum + (ex.weight * ex.completedSets), 0)

      return {
        id: workoutLog.id,
        name: workoutLog.workout_assignment?.name || workoutLog.workout_assignment?.template?.name || 'Workout',
        duration: workoutLog.total_duration_minutes || 45,
        difficulty: workoutLog.workout_assignment?.template?.difficulty_level || 'intermediate',
        exercises,
        completedAt: workoutLog.completed_at || workoutLog.started_at,
        totalSets,
        completedSets,
        totalWeight,
        averageRPE: undefined,
        restTime: 0
      }
    } catch (error) {
      console.error('Error loading workout data from log ID:', error)
      throw error
    }
  }

  const processExerciseData = (logs: any[]): any[] => {
    const exerciseMap = new Map()

    logs.forEach(log => {
      const exerciseId = log.template_exercise_id
      const exercise = log.exercise?.exercise

      if (!exerciseMap.has(exerciseId)) {
        exerciseMap.set(exerciseId, {
          id: exerciseId,
          name: exercise?.name || 'Unknown Exercise',
          category: exercise?.category || 'Strength',
          muscleGroups: exercise?.muscle_groups || [],
          sets: 0,
          completedSets: 0,
          reps: log.reps_completed || 0,
          weight: log.weight_used || 0,
          rpe: log.rpe || 5,
          restTime: log.rest_taken || 0
        })
      }

      const exerciseData = exerciseMap.get(exerciseId)
      exerciseData.sets++
      exerciseData.completedSets++
      exerciseData.reps = Math.max(exerciseData.reps, log.reps_completed || 0)
      exerciseData.weight = Math.max(exerciseData.weight, log.weight_used || 0)
      exerciseData.rpe = Math.max(exerciseData.rpe, log.rpe || 5)
    })

    return Array.from(exerciseMap.values())
  }

  const loadComparisonData = async (userId: string, currentWorkout: WorkoutData): Promise<WorkoutComparison> => {
    try {
      // Load previous workout
      const { data: previousSession, error: previousError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', userId)
        .eq('status', 'completed')
        .lt('completed_at', currentWorkout.completedAt)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()

      let previousWorkout: WorkoutData | undefined
      if (!previousError && previousSession) {
        previousWorkout = await loadWorkoutData(previousSession.id)
      }

      // Load weekly progress
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      
      const { data: weeklySessions, error: weeklyError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', userId)
        .eq('status', 'completed')
        .gte('completed_at', weekStart.toISOString())

      const weeklyProgress = {
        workoutsThisWeek: weeklySessions?.length || 0,
        totalDuration: weeklySessions?.reduce((sum, session) => sum + (session.total_duration || 0), 0) || 0,
        averageRPE: 0 // Would need to calculate from logs
      }

      return {
        previousWorkout,
        personalBest: undefined, // Would need to analyze all workouts
        weeklyProgress
      }
    } catch (error) {
      console.error('Error loading comparison data:', error)
      return {
        weeklyProgress: {
          workoutsThisWeek: 0,
          totalDuration: 0,
          averageRPE: 0
        }
      }
    }
  }

  const refreshSummary = useCallback(() => {
    loadWorkoutSummaryData()
  }, [loadWorkoutSummaryData])

  return {
    workoutData,
    userProfile,
    comparison,
    loading,
    error,
    refreshSummary
  }
}

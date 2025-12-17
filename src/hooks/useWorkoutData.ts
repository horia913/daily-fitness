'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { cache, PrefetchService } from '@/lib/prefetch'

interface WorkoutAssignment {
  id: string
  coach_id: string
  client_id: string
  workout_template_id: string
  scheduled_date: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
  template?: {
    id: string
    name: string
    description: string
    estimated_duration: number
    difficulty_level: string
    category?: {
      name: string
      color: string
    }
  }
  exercise_count?: number
}

export function useWorkoutAssignments(userId: string) {
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) return

    const loadAssignments = async () => {
      setLoading(true)
      setError(null)
      const cacheKey = `workout_assignments_${userId}`

      try {
        // Try to get from cache first
        const cachedData = cache.get<WorkoutAssignment[]>(cacheKey)
        if (cachedData) {
          setAssignments(cachedData)
          setLoading(false)
          
          // Trigger background refresh
          PrefetchService.prefetchWorkoutAssignments(userId)
          return
        }

        // Fetch fresh data
        // First, get the assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('workout_assignments')
          .select('*')
          .eq('client_id', userId)
          .order('scheduled_date', { ascending: true })

        if (assignmentsError) {
          console.error('Error fetching workout assignments:', assignmentsError)
          throw assignmentsError
        }

        // Then, fetch template data for each assignment
        const assignmentsWithTemplates = await Promise.all(
          (assignmentsData || []).map(async (assignment) => {
            const { data: templateData, error: templateError } = await supabase
              .from('workout_templates')
              .select(`
                id, name, description, estimated_duration, difficulty_level,
                category:workout_categories(name, color)
              `)
              .eq('id', assignment.workout_template_id)
              .single()

            if (templateError) {
              // Use fallback data when template fetch fails (RLS issues)
              return {
                ...assignment,
                template: {
                id: assignment.workout_template_id,
                  name: 'Workout',
                  description: 'Your assigned workout',
                  estimated_duration: 30,
                  difficulty_level: 'Beginner',
                  category: null
                }
              }
            }

            return {
              ...assignment,
              template: templateData
            }
          })
        )

        const data = assignmentsWithTemplates

        // If no data returned, set empty array
        if (!data || data.length === 0) {
          setAssignments([])
          setLoading(false)
          return
        }

        // Get exercise count for each template
        const assignmentsWithCounts = await Promise.all(
          (data || []).map(async (assignment) => {
            const templateId = assignment.workout_template_id
            console.log(`Getting exercise count for template ${templateId}`)
            const { count, error } = await supabase
              .from('workout_template_exercises')
              .select('*', { count: 'exact', head: true })
              .eq('template_id', templateId)
            
            if (error) {
              console.error(`Error getting exercise count for template ${templateId}:`, error)
            }
            
            console.log(`Exercise count for template ${templateId}:`, count)
            
            return {
              ...assignment,
              exercise_count: count || 0
            }
          })
        )

        // Cache the data
        cache.set(cacheKey, assignmentsWithCounts, 5 * 60 * 1000) // 5 minutes TTL
        setAssignments(assignmentsWithCounts)
      } catch (err) {
        console.error('Error loading assignments:', err)
        setError(err as Error)
        setAssignments([])
      } finally {
        setLoading(false)
      }
    }

    loadAssignments()
  }, [userId])

  return { assignments, loading, error }
}

export function useTodaysWorkout(userId: string) {
  const { assignments, loading } = useWorkoutAssignments(userId)
  const today = new Date().toISOString().split('T')[0]

  const todaysWorkout = assignments.find(assignment => 
    assignment.scheduled_date === today && 
    (assignment.status === 'assigned' || assignment.status === 'in_progress')
  )

  return { todaysWorkout, loading }
}

export function useUpcomingWorkouts(userId: string, limit: number = 3) {
  const { assignments, loading } = useWorkoutAssignments(userId)
  const today = new Date().toISOString().split('T')[0]

  const upcomingWorkouts = assignments.filter(assignment => 
    assignment.scheduled_date > today && 
    assignment.status === 'assigned'
  ).slice(0, limit)

  return { upcomingWorkouts, loading }
}

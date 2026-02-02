'use client'

import { useState, useEffect } from 'react'
import { supabase, ensureAuthenticated } from '@/lib/supabase'
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
        // Ensure user is authenticated before querying
        await ensureAuthenticated()
        
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
        // OPTIMIZED: Single query with join for templates
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('workout_assignments')
          .select(`
            *,
            template:workout_templates (
              id, name, description, estimated_duration, difficulty_level, category
            )
          `)
          .eq('client_id', userId)
          .order('scheduled_date', { ascending: true })

        if (assignmentsError) {
          console.error('Error fetching workout assignments:', assignmentsError)
          throw assignmentsError
        }

        // If no data returned, set empty array
        if (!assignmentsData || assignmentsData.length === 0) {
          setAssignments([])
          setLoading(false)
          return
        }

        // OPTIMIZED: Get all unique template IDs and batch query exercise counts
        const templateIds = [...new Set(
          assignmentsData
            .map(a => a.workout_template_id)
            .filter(Boolean)
        )]

        // Batch query for exercise counts using workout_blocks (exercises are nested under blocks)
        const exerciseCountMap = new Map<string, number>()
        
        if (templateIds.length > 0) {
          // Get blocks for all templates in one query
          const { data: blocksData, error: blocksError } = await supabase
            .from('workout_blocks')
            .select('template_id, id')
            .in('template_id', templateIds)

          if (!blocksError && blocksData) {
            const blockIds = blocksData.map(b => b.id)
            
            if (blockIds.length > 0) {
              // Get exercise counts from workout_block_exercises in one query
              const { data: exercisesData } = await supabase
                .from('workout_block_exercises')
                .select('block_id')
                .in('block_id', blockIds)

              // Build block to template mapping
              const blockToTemplate = new Map<string, string>()
              blocksData.forEach(b => blockToTemplate.set(b.id, b.template_id))

              // Count exercises per template
              exercisesData?.forEach(ex => {
                const templateId = blockToTemplate.get(ex.block_id)
                if (templateId) {
                  exerciseCountMap.set(templateId, (exerciseCountMap.get(templateId) || 0) + 1)
                }
              })
            }
          }
        }

        // Map assignments with template data and exercise counts
        const assignmentsWithCounts = assignmentsData.map(assignment => {
          // Handle template - use embedded data or fallback
          const templateData = assignment.template
          const template = templateData ? {
            id: templateData.id,
            name: templateData.name || 'Workout',
            description: templateData.description || 'Your assigned workout',
            estimated_duration: templateData.estimated_duration || 30,
            difficulty_level: templateData.difficulty_level || 'Beginner',
            category: templateData.category ? { name: templateData.category, color: '#6B7280' } : null
          } : {
            id: assignment.workout_template_id,
            name: 'Workout',
            description: 'Your assigned workout',
            estimated_duration: 30,
            difficulty_level: 'Beginner',
            category: null
          }

          return {
            ...assignment,
            template,
            exercise_count: exerciseCountMap.get(assignment.workout_template_id) || 0
          }
        })

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

'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  getActiveAttempt, 
  getLastCompletedAttempt,
  hasCompletedAttempts,
  ActiveAttempt,
  WorkoutSession,
  WorkoutLog
} from '@/lib/workoutAttemptService'

/**
 * Hook for managing workout attempts
 * Provides consistent access to active sessions and logs
 */
export function useWorkoutAttempt(assignmentId: string | null, clientId: string | null) {
  const [activeAttempt, setActiveAttempt] = useState<ActiveAttempt | null>(null)
  const [lastCompleted, setLastCompleted] = useState<{ session: WorkoutSession | null; log: WorkoutLog | null } | null>(null)
  const [hasHistory, setHasHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadAttempt = useCallback(async () => {
    if (!assignmentId || !clientId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get active attempt
      const active = await getActiveAttempt(assignmentId, clientId)
      setActiveAttempt(active)

      // Get last completed (if not currently active)
      if (active.status !== 'in_progress') {
        const last = await getLastCompletedAttempt(assignmentId, clientId)
        setLastCompleted(last)
      }

      // Check if has any history
      const history = await hasCompletedAttempts(assignmentId, clientId)
      setHasHistory(history)

    } catch (err) {
      console.error('Error loading workout attempt:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [assignmentId, clientId])

  useEffect(() => {
    loadAttempt()
  }, [loadAttempt])

  const refresh = useCallback(() => {
    loadAttempt()
  }, [loadAttempt])

  return {
    activeAttempt,
    lastCompleted,
    hasHistory,
    loading,
    error,
    refresh
  }
}

/**
 * Hook for checking if a workout is currently in progress
 */
export function useIsWorkoutInProgress(assignmentId: string | null, clientId: string | null) {
  const { activeAttempt, loading } = useWorkoutAttempt(assignmentId, clientId)

  return {
    isInProgress: activeAttempt?.status === 'in_progress',
    hasActiveAttempt: activeAttempt?.hasActiveAttempt || false,
    loading
  }
}


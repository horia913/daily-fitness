'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { UserContext } from '@/lib/timeBasedGreetings'

interface GreetingPreferences {
  greetingStyle: 'casual' | 'motivational' | 'professional'
  showStreak: boolean
  showWeather: boolean
  showMotivation: boolean
  showTimeContext: boolean
  showQuickStats: boolean
  autoRefresh: boolean
  refreshInterval: number // in minutes
}

interface GreetingSettings {
  preferences: GreetingPreferences
  lastUpdated: string
  userId: string
}

const DEFAULT_PREFERENCES: GreetingPreferences = {
  greetingStyle: 'casual',
  showStreak: true,
  showWeather: false,
  showMotivation: true,
  showTimeContext: true,
  showQuickStats: true,
  autoRefresh: true,
  refreshInterval: 30
}

export function useGreetingPreferences(userId: string) {
  const [preferences, setPreferences] = useState<GreetingPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      loadPreferences()
    }
  }, [userId])

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Try to load from localStorage first (for immediate UI updates)
      const cachedPreferences = localStorage.getItem(`greeting_preferences_${userId}`)
      if (cachedPreferences) {
        const parsed = JSON.parse(cachedPreferences)
        setPreferences(parsed)
      }

      // Load from database
      const { data, error: dbError } = await supabase
        .from('user_preferences')
        .select('greeting_preferences')
        .eq('user_id', userId)
        .single()

      if (dbError && dbError.code !== 'PGRST116') {
        throw dbError
      }

      if (data?.greeting_preferences) {
        const dbPreferences = data.greeting_preferences as GreetingPreferences
        setPreferences(dbPreferences)
        
        // Update localStorage
        localStorage.setItem(`greeting_preferences_${userId}`, JSON.stringify(dbPreferences))
      }
    } catch (err) {
      console.error('Error loading greeting preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const savePreferences = useCallback(async (newPreferences: Partial<GreetingPreferences>) => {
    try {
      setSaving(true)
      setError(null)

      const updatedPreferences = { ...preferences, ...newPreferences }
      
      // Update local state immediately
      setPreferences(updatedPreferences)
      
      // Update localStorage immediately
      localStorage.setItem(`greeting_preferences_${userId}`, JSON.stringify(updatedPreferences))

      // Save to database
      const { error: dbError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          greeting_preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        })

      if (dbError) {
        throw dbError
      }
    } catch (err) {
      console.error('Error saving greeting preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
      
      // Revert local state on error
      loadPreferences()
    } finally {
      setSaving(false)
    }
  }, [userId, preferences, loadPreferences])

  const resetPreferences = useCallback(async () => {
    await savePreferences(DEFAULT_PREFERENCES)
  }, [savePreferences])

  const updateGreetingStyle = useCallback((style: 'casual' | 'motivational' | 'professional') => {
    savePreferences({ greetingStyle: style })
  }, [savePreferences])

  const togglePreference = useCallback((key: keyof GreetingPreferences) => {
    savePreferences({ [key]: !preferences[key] })
  }, [preferences, savePreferences])

  const updateRefreshInterval = useCallback((interval: number) => {
    savePreferences({ refreshInterval: interval })
  }, [savePreferences])

  return {
    preferences,
    loading,
    saving,
    error,
    savePreferences,
    resetPreferences,
    updateGreetingStyle,
    togglePreference,
    updateRefreshInterval
  }
}

// Hook for managing greeting context and data
export function useGreetingContext(userId: string) {
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      loadUserContext()
    }
  }, [userId])

  const loadUserContext = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      // Load user preferences
      const { data: preferences, error: prefsError } = await supabase
        .from('user_preferences')
        .select('greeting_preferences')
        .eq('user_id', userId)
        .single()

      // Load streak data
      const { data: streakData, error: streakError } = await supabase
        .from('workout_sessions')
        .select('completed_at')
        .eq('client_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(30)

      // Calculate streak
      let streakDays = 0
      if (streakData && streakData.length > 0) {
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        
        let currentDate = new Date(today)
        streakDays = 0
        
        for (const session of streakData) {
          const sessionDate = new Date(session.completed_at)
          const sessionDateStr = sessionDate.toDateString()
          const currentDateStr = currentDate.toDateString()
          
          if (sessionDateStr === currentDateStr) {
            streakDays++
            currentDate.setDate(currentDate.getDate() - 1)
          } else {
            break
          }
        }
      }

      // Load last workout date
      const { data: lastWorkout, error: lastWorkoutError } = await supabase
        .from('workout_sessions')
        .select('completed_at')
        .eq('client_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()

      const context: UserContext = {
        id: userId,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email?.split('@')[0] || 'User',
        role: profile.role || 'client',
        fitnessLevel: profile.fitness_level || 'intermediate',
        goals: profile.goals || [],
        lastWorkoutDate: lastWorkout?.completed_at,
        streakDays,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        preferences: preferences?.greeting_preferences || DEFAULT_PREFERENCES
      }

      setUserContext(context)
    } catch (err) {
      console.error('Error loading user context:', err)
      setError(err instanceof Error ? err.message : 'Failed to load user context')
      
      // Set default context on error
      setUserContext({
        id: userId,
        name: 'User',
        role: 'client',
        fitnessLevel: 'intermediate',
        goals: [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        preferences: DEFAULT_PREFERENCES
      })
    } finally {
      setLoading(false)
    }
  }, [userId])

  const refreshContext = useCallback(() => {
    loadUserContext()
  }, [loadUserContext])

  return {
    userContext,
    loading,
    error,
    refreshContext
  }
}

// Hook for managing greeting auto-refresh
export function useGreetingAutoRefresh(
  userContext: UserContext | null,
  refreshCallback: () => void
) {
  const [isActive, setIsActive] = useState(false)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!userContext?.preferences?.autoRefresh) {
      setIsActive(false)
      if (intervalId) {
        clearInterval(intervalId)
        setIntervalId(null)
      }
      return
    }

    const interval = userContext.preferences.refreshInterval * 60 * 1000 // Convert minutes to milliseconds
    
    setIsActive(true)
    const id = setInterval(() => {
      refreshCallback()
    }, interval)
    
    setIntervalId(id)

    return () => {
      if (id) {
        clearInterval(id)
        setIntervalId(null)
      }
    }
  }, [userContext?.preferences?.autoRefresh, userContext?.preferences?.refreshInterval, refreshCallback])

  const toggleAutoRefresh = useCallback(() => {
    if (userContext?.preferences) {
      // This would need to be connected to the preferences hook
      // For now, we'll just toggle the local state
      setIsActive(!isActive)
    }
  }, [userContext, isActive])

  return {
    isActive,
    toggleAutoRefresh
  }
}

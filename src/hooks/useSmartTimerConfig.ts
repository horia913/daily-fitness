'use client'

import { useState, useEffect, useCallback } from 'react'
import { SmartTimer, ExerciseMetadata, SetData, UserProfile, SmartTimerConfig } from '@/lib/smartTimer'

interface TimerPreferences {
  restPreference: 'minimal' | 'moderate' | 'extended'
  intensityPreference: 'conservative' | 'balanced' | 'aggressive'
  autoStartTimer: boolean
  showRecommendations: boolean
  enableHeartRateTracking: boolean
  enableRPE: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
}

interface TimerAnalytics {
  averageRestTime: number
  totalRestTime: number
  skippedRests: number
  completedRests: number
  preferredRestDuration: number
  performanceTrend: 'improving' | 'stable' | 'declining'
}

export function useSmartTimerConfig(userId: string) {
  const [preferences, setPreferences] = useState<TimerPreferences>({
    restPreference: 'moderate',
    intensityPreference: 'balanced',
    autoStartTimer: true,
    showRecommendations: true,
    enableHeartRateTracking: false,
    enableRPE: true,
    soundEnabled: true,
    vibrationEnabled: false
  })

  const [analytics, setAnalytics] = useState<TimerAnalytics>({
    averageRestTime: 60,
    totalRestTime: 0,
    skippedRests: 0,
    completedRests: 0,
    preferredRestDuration: 60,
    performanceTrend: 'stable'
  })

  const [userProfile, setUserProfile] = useState<UserProfile>({
    fitness_level: 'intermediate',
    preferences: {
      rest_preference: 'moderate',
      intensity_preference: 'balanced'
    },
    training_goals: []
  })

  // Load user preferences and analytics
  useEffect(() => {
    loadUserData()
  }, [userId])

  const loadUserData = useCallback(async () => {
    try {
      // Load preferences from localStorage or database
      const savedPreferences = localStorage.getItem(`timer_preferences_${userId}`)
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences))
      }

      // Load analytics from localStorage or database
      const savedAnalytics = localStorage.getItem(`timer_analytics_${userId}`)
      if (savedAnalytics) {
        setAnalytics(JSON.parse(savedAnalytics))
      }

      // Load user profile (this would come from your user profile system)
      const savedProfile = localStorage.getItem(`user_profile_${userId}`)
      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile))
      }
    } catch (error) {
      console.error('Error loading timer data:', error)
    }
  }, [userId])

  const savePreferences = useCallback(async (newPreferences: Partial<TimerPreferences>) => {
    const updatedPreferences = { ...preferences, ...newPreferences }
    setPreferences(updatedPreferences)
    
    try {
      localStorage.setItem(`timer_preferences_${userId}`, JSON.stringify(updatedPreferences))
      // Here you would also save to your database
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }, [preferences, userId])

  const updateAnalytics = useCallback(async (restData: {
    restTime: number
    wasCompleted: boolean
    wasSkipped: boolean
    exerciseType: string
    intensity: string
  }) => {
    const newAnalytics = { ...analytics }
    
    if (restData.wasCompleted) {
      newAnalytics.completedRests++
      newAnalytics.totalRestTime += restData.restTime
      newAnalytics.averageRestTime = newAnalytics.totalRestTime / newAnalytics.completedRests
    }
    
    if (restData.wasSkipped) {
      newAnalytics.skippedRests++
    }
    
    // Update preferred rest duration based on user behavior
    if (restData.wasCompleted && restData.restTime > 0) {
      newAnalytics.preferredRestDuration = 
        (newAnalytics.preferredRestDuration + restData.restTime) / 2
    }
    
    setAnalytics(newAnalytics)
    
    try {
      localStorage.setItem(`timer_analytics_${userId}`, JSON.stringify(newAnalytics))
    } catch (error) {
      console.error('Error saving analytics:', error)
    }
  }, [analytics, userId])

  const generateSmartConfig = useCallback((
    exercise: ExerciseMetadata,
    setData: SetData,
    setNumber: number,
    totalSets: number
  ): SmartTimerConfig => {
    const exerciseType = SmartTimer.determineExerciseType(exercise)
    const intensity = SmartTimer.determineIntensityLevel(setData, exercise)
    
    // Use analytics to adjust base rest time
    let baseRestTime = SmartTimer.calculateOptimalRestTime(
      exercise,
      setData,
      userProfile,
      {
        baseRestTime: analytics.preferredRestDuration,
        exerciseType,
        intensity,
        setNumber,
        totalSets,
        previousSetRPE: setData.rpe
      }
    )
    
    // Apply user preferences
    if (preferences.restPreference === 'minimal') {
      baseRestTime *= 0.8
    } else if (preferences.restPreference === 'extended') {
      baseRestTime *= 1.2
    }
    
    return {
      baseRestTime,
      exerciseType,
      intensity,
      setNumber,
      totalSets,
      previousSetRPE: setData.rpe
    }
  }, [userProfile, analytics, preferences])

  const getPersonalizedRecommendations = useCallback((
    exercise: ExerciseMetadata,
    setData: SetData,
    restTimeRemaining: number
  ): string[] => {
    const baseRecommendations = SmartTimer.getRestRecommendations(
      exercise,
      setData,
      userProfile,
      restTimeRemaining
    )
    
    const personalizedRecommendations: string[] = []
    
    // Add personalized recommendations based on analytics
    if (analytics.skippedRests > analytics.completedRests * 0.3) {
      personalizedRecommendations.push('🎯 Consider taking full rest periods for better performance')
    }
    
    if (analytics.performanceTrend === 'declining') {
      personalizedRecommendations.push('📈 Try extending rest periods to improve performance')
    }
    
    if (preferences.enableHeartRateTracking) {
      personalizedRecommendations.push('💓 Monitor your heart rate for optimal recovery')
    }
    
    if (preferences.enableRPE) {
      personalizedRecommendations.push('⚡ Rate your perceived exertion after each set')
    }
    
    return [...baseRecommendations, ...personalizedRecommendations]
  }, [userProfile, analytics, preferences])

  const resetAnalytics = useCallback(() => {
    const resetAnalytics: TimerAnalytics = {
      averageRestTime: 60,
      totalRestTime: 0,
      skippedRests: 0,
      completedRests: 0,
      preferredRestDuration: 60,
      performanceTrend: 'stable'
    }
    
    setAnalytics(resetAnalytics)
    
    try {
      localStorage.setItem(`timer_analytics_${userId}`, JSON.stringify(resetAnalytics))
    } catch (error) {
      console.error('Error resetting analytics:', error)
    }
  }, [userId])

  const exportData = useCallback(() => {
    return {
      preferences,
      analytics,
      userProfile,
      exportDate: new Date().toISOString()
    }
  }, [preferences, analytics, userProfile])

  const importData = useCallback((data: any) => {
    try {
      if (data.preferences) setPreferences(data.preferences)
      if (data.analytics) setAnalytics(data.analytics)
      if (data.userProfile) setUserProfile(data.userProfile)
      
      // Save to localStorage
      if (data.preferences) {
        localStorage.setItem(`timer_preferences_${userId}`, JSON.stringify(data.preferences))
      }
      if (data.analytics) {
        localStorage.setItem(`timer_analytics_${userId}`, JSON.stringify(data.analytics))
      }
      if (data.userProfile) {
        localStorage.setItem(`user_profile_${userId}`, JSON.stringify(data.userProfile))
      }
    } catch (error) {
      console.error('Error importing data:', error)
    }
  }, [userId])

  return {
    preferences,
    analytics,
    userProfile,
    savePreferences,
    updateAnalytics,
    generateSmartConfig,
    getPersonalizedRecommendations,
    resetAnalytics,
    exportData,
    importData
  }
}

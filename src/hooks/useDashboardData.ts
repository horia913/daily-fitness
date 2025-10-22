'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { DatabaseService, Profile, WorkoutSession, Achievement, Session } from '@/lib/database'
import { PrefetchService, cache } from '@/lib/prefetch'

// Client dashboard data hook with pre-fetching
export function useClientDashboardData() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    profile: Profile | null
    todaysWorkout: WorkoutSession | null
    stats: { thisWeek: number; goalCompletion: number }
    achievements: Achievement[]
  }>({
    profile: null,
    todaysWorkout: null,
    stats: { thisWeek: 0, goalCompletion: 0 },
    achievements: []
  })

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)
      const cacheKey = `client_dashboard_${user.id}`
      
      try {
        // Try to get from cache first
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
          setData(cachedData)
          setLoading(false)
          
          // Trigger background refresh for next time
          PrefetchService.backgroundRefresh(user.id, 'client')
          return
        }

        // Fetch fresh data if not in cache
        const [profile, todaysWorkout, stats, achievements] = await Promise.all([
          DatabaseService.getProfile(user.id),
          DatabaseService.getTodaysWorkout(user.id),
          DatabaseService.getWorkoutStats(user.id),
          DatabaseService.getRecentAchievements(user.id)
        ])

        const freshData = {
          profile,
          todaysWorkout,
          stats,
          achievements
        }

        // Cache the data
        cache.set(cacheKey, freshData, 2 * 60 * 1000) // 2 minutes TTL
        setData(freshData)
      } catch (error) {
        console.error('Error fetching client dashboard data:', error)
        // Set default data if database isn't ready
        setData({
          profile: null,
          todaysWorkout: null,
          stats: { thisWeek: 0, goalCompletion: 0 },
          achievements: []
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  return { ...data, loading }
}

// Coach dashboard data hook with pre-fetching
export function useCoachDashboardData() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    profile: Profile | null
    stats: { activeClients: number; workoutsCreated: number }
    todaysSessions: Session[]
    clientProgress: Array<{
      client: Profile
      progress: number
      recentAchievement?: string
    }>
  }>({
    profile: null,
    stats: { activeClients: 0, workoutsCreated: 0 },
    todaysSessions: [],
    clientProgress: []
  })

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)
      const cacheKey = `coach_dashboard_${user.id}`
      
      try {
        // Try to get from cache first
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
          setData(cachedData)
          setLoading(false)
          
          // Trigger background refresh for next time
          PrefetchService.backgroundRefresh(user.id, 'coach')
          return
        }

        // Fetch fresh data if not in cache
        const [profile, stats, todaysSessions, clientProgress] = await Promise.all([
          DatabaseService.getProfile(user.id),
          DatabaseService.getCoachStats(user.id),
          DatabaseService.getTodaysSessions(user.id),
          DatabaseService.getClientProgress(user.id)
        ])

        const freshData = {
          profile,
          stats,
          todaysSessions,
          clientProgress
        }

        // Cache the data
        cache.set(cacheKey, freshData, 2 * 60 * 1000) // 2 minutes TTL
        setData(freshData)
      } catch (error) {
        console.error('Error fetching coach dashboard data:', error)
        // Set default data if database isn't ready
        setData({
          profile: null,
          stats: { activeClients: 0, workoutsCreated: 0 },
          todaysSessions: [],
          clientProgress: []
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  return { ...data, loading }
}

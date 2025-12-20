'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { DatabaseService, Client, Profile } from '@/lib/database'
import { cache, PrefetchService } from '@/lib/prefetch'

interface Exercise {
  id: string
  name: string
  description: string
  category: string
  muscle_groups: string[]
  equipment: string[]
  difficulty: string
  instructions: string[]
  tips: string[]
  video_url?: string
  image_url?: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export function useExerciseLibrary(userId: string) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) return

    const loadExercises = async () => {
      setLoading(true)
      setError(null)
      const cacheKey = `exercise_library_${userId}`

      try {
        // Try to get from cache first
        const cachedData = cache.get<Exercise[]>(cacheKey)
        if (cachedData) {
          setExercises(cachedData)
          setLoading(false)
          
          // Trigger background refresh
          PrefetchService.prefetchExerciseLibrary(userId)
          return
        }

        // Fetch fresh data
        const { data, error } = await supabase
          .from('exercises')
          .select('*')
          .eq('coach_id', userId)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Cache the data
        cache.set(cacheKey, data || [], 10 * 60 * 1000) // 10 minutes TTL
        setExercises(data || [])
      } catch (err) {
        console.error('Error loading exercises:', err)
        setError(err as Error)
        
        // Fallback to localStorage or sample data
        const savedExercises = localStorage.getItem(`exercises_${userId}`)
        if (savedExercises) {
          setExercises(JSON.parse(savedExercises))
        } else {
          // Sample exercises
          const sampleExercises = [
            {
              id: '1',
              name: 'Push-ups',
              description: 'Classic bodyweight exercise for chest and arms',
              category: 'Strength',
              muscle_groups: ['chest', 'shoulders', 'triceps'],
              equipment: ['bodyweight'],
              difficulty: 'beginner',
              instructions: ['Start in plank position', 'Lower body to ground', 'Push back up'],
              tips: ['Keep core tight', 'Maintain straight line'],
              is_public: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
          setExercises(sampleExercises)
        }
      } finally {
        setLoading(false)
      }
    }

    loadExercises()
  }, [userId])

  return { exercises, loading, error }
}

export function useClientList(userId: string) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) return

    const loadClients = async () => {
      setLoading(true)
      setError(null)
      const cacheKey = `client_list_${userId}`

      try {
        // Try to get from cache first
        const cachedData = cache.get<Client[]>(cacheKey)
        if (cachedData) {
          setClients(cachedData)
          setLoading(false)
          
          // Trigger background refresh
          PrefetchService.prefetchClientList(userId)
          return
        }

        // Fetch fresh data
        const clientsData = await DatabaseService.getClients(userId)

        // Cache the data
        cache.set(cacheKey, clientsData, 3 * 60 * 1000) // 3 minutes TTL
        setClients(clientsData)
      } catch (err) {
        console.error('Error loading clients:', err)
        setError(err as Error)
        
        // Fallback to sample data
        const sampleClients = [
          {
            id: '1',
            coach_id: userId,
            client_id: 'client-1',
            status: 'active' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            profile: {
              id: 'client-1',
              email: 'john@example.com',
              role: 'client' as const,
              first_name: 'John',
              last_name: 'Smith',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          }
        ]
        setClients(sampleClients)
      } finally {
        setLoading(false)
      }
    }

    loadClients()
  }, [userId])

  return { clients, loading, error }
}

export function useCoachStats(userId: string) {
  const [stats, setStats] = useState<{
    activeClients: number
    workoutsCreated: number
  }>({ activeClients: 0, workoutsCreated: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) return

    const loadStats = async () => {
      setLoading(true)
      setError(null)
      const cacheKey = `coach_stats_${userId}`

      try {
        // Try to get from cache first
        const cachedData = cache.get<{ activeClients: number; workoutsCreated: number }>(cacheKey)
        if (cachedData) {
          setStats(cachedData)
          setLoading(false)
          return
        }

        // Fetch fresh data
        const statsData = await DatabaseService.getCoachStats(userId)

        // Cache the data
        cache.set(cacheKey, statsData, 5 * 60 * 1000) // 5 minutes TTL
        setStats(statsData)
      } catch (err) {
        console.error('Error loading coach stats:', err)
        setError(err as Error)
        setStats({ activeClients: 0, workoutsCreated: 0 })
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [userId])

  return { stats, loading, error }
}

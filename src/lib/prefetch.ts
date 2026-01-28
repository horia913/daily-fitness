import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { DatabaseService } from './database'
import { isPrefetchDisabled } from './featureFlags'
import { isLiveWorkoutRoute } from './workoutMode'

// Cache interface for storing pre-fetched data
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class PrefetchCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes default TTL

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Get cache stats for debugging
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Global cache instance
export const cache = new PrefetchCache()

// Pre-fetching service
export class PrefetchService {
  // Pre-fetch client dashboard data
  static async prefetchClientDashboard(userId: string): Promise<void> {
    if (isPrefetchDisabled) return
    const cacheKey = `client_dashboard_${userId}`
    
    if (cache.has(cacheKey)) {
      return // Already cached
    }

    try {
      const [profile, todaysWorkout, stats, achievements] = await Promise.all([
        DatabaseService.getProfile(userId),
        DatabaseService.getTodaysWorkout(userId),
        DatabaseService.getWorkoutStats(userId),
        DatabaseService.getRecentAchievements(userId)
      ])

      cache.set(cacheKey, {
        profile,
        todaysWorkout,
        stats,
        achievements
      }, 2 * 60 * 1000) // 2 minutes TTL for dashboard data
    } catch (error) {
      console.error('Error pre-fetching client dashboard:', error)
    }
  }

  // Pre-fetch coach dashboard data
  static async prefetchCoachDashboard(userId: string): Promise<void> {
    if (isPrefetchDisabled) return
    const cacheKey = `coach_dashboard_${userId}`
    
    if (cache.has(cacheKey)) {
      return
    }

    try {
      const [profile, stats, todaysSessions, clientProgress] = await Promise.all([
        DatabaseService.getProfile(userId),
        DatabaseService.getCoachStats(userId),
        DatabaseService.getTodaysSessions(userId),
        DatabaseService.getClientProgress(userId)
      ])

      cache.set(cacheKey, {
        profile,
        stats,
        todaysSessions,
        clientProgress
      }, 2 * 60 * 1000) // 2 minutes TTL
    } catch (error) {
      console.error('Error pre-fetching coach dashboard:', error)
    }
  }

  // Pre-fetch workout assignments with exercise counts
  static async prefetchWorkoutAssignments(userId: string): Promise<void> {
    if (isPrefetchDisabled) return
    const cacheKey = `workout_assignments_${userId}`
    
    if (cache.has(cacheKey)) {
      return
    }

    try {
      // Ensure user is authenticated before querying
      const { ensureAuthenticated } = await import('./supabase');
      await ensureAuthenticated();

      const { data, error } = await supabase
        .from('workout_assignments')
        .select(`
          *,
          template:workout_templates(
            id, name, description, estimated_duration, difficulty_level
          )
        `)
        .eq('client_id', userId)
        .order('scheduled_date', { ascending: true })

      if (error) throw error

      // Pre-fetch exercise counts for all templates using WorkoutBlockService (batched)
      const { WorkoutBlockService } = await import('./workoutBlockService')
      const templateIds = Array.from(
        new Set(
          (data || [])
            .map((assignment: any) => assignment.template?.id || assignment.workout_template_id)
            .filter(Boolean)
        )
      )
      const blocksByTemplate = await WorkoutBlockService.getWorkoutBlocksForTemplates(templateIds)

      const assignmentsWithCounts = (data || []).map((assignment: any) => {
        const templateId = assignment.template?.id || assignment.workout_template_id
        const blocks = templateId ? blocksByTemplate.get(templateId) || [] : []
        const exercise_count = blocks.reduce((total, block) => total + (block.exercises?.length || 0), 0)

        return {
          ...assignment,
          exercise_count
        }
      })

      cache.set(cacheKey, assignmentsWithCounts, 5 * 60 * 1000) // 5 minutes TTL
    } catch (error) {
      console.error('Error pre-fetching workout assignments:', error)
    }
  }

  // Pre-fetch exercise library for coaches
  static async prefetchExerciseLibrary(userId: string): Promise<void> {
    if (isPrefetchDisabled) return
    const cacheKey = `exercise_library_${userId}`
    
    if (cache.has(cacheKey)) {
      return
    }

    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('coach_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      cache.set(cacheKey, data || [], 10 * 60 * 1000) // 10 minutes TTL for exercise library
    } catch (error) {
      console.error('Error pre-fetching exercise library:', error)
    }
  }

  // Pre-fetch food library (shared across users)
  static async prefetchFoodLibrary(): Promise<void> {
    if (isPrefetchDisabled) return
    const cacheKey = 'food_library_global'
    
    if (cache.has(cacheKey)) {
      return
    }

    try {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .order('name')
        .limit(200) // Increased limit for better pre-fetching

      if (error) throw error

      cache.set(cacheKey, data || [], 15 * 60 * 1000) // 15 minutes TTL for food library
    } catch (error) {
      console.error('Error pre-fetching food library:', error)
    }
  }

  // Pre-fetch client list for coaches
  static async prefetchClientList(userId: string): Promise<void> {
    if (isPrefetchDisabled) return
    const cacheKey = `client_list_${userId}`
    
    if (cache.has(cacheKey)) {
      return
    }

    try {
      const clients = await DatabaseService.getClients(userId)
      cache.set(cacheKey, clients, 3 * 60 * 1000) // 3 minutes TTL
    } catch (error) {
      console.error('Error pre-fetching client list:', error)
    }
  }

  // Pre-fetch nutrition data for a specific date
  static async prefetchNutritionData(userId: string, date: string): Promise<void> {
    if (isPrefetchDisabled) return
    // DISABLED: Using new meal plan system instead of meal_logs
    // Skip prefetching for now - new meal plan system handles data loading
    return
  }

  // Smart pre-fetching based on user role and current page
  static async smartPrefetch(userId: string, userRole: 'client' | 'coach', currentPage?: string): Promise<void> {
    if (isPrefetchDisabled) return
    if (isLiveWorkoutRoute(currentPage)) return
    const prefetchPromises: Promise<void>[] = []

    if (userRole === 'client') {
      // Always pre-fetch dashboard data for clients
      prefetchPromises.push(this.prefetchClientDashboard(userId))
      
      // Pre-fetch workout assignments
      prefetchPromises.push(this.prefetchWorkoutAssignments(userId))
      
      // Pre-fetch food library
      prefetchPromises.push(this.prefetchFoodLibrary())
      
      // Pre-fetch today's nutrition data
      const today = new Date().toISOString().split('T')[0]
      prefetchPromises.push(this.prefetchNutritionData(userId, today))
      
      // Pre-fetch tomorrow's nutrition data
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      prefetchPromises.push(this.prefetchNutritionData(userId, tomorrow))
    } else if (userRole === 'coach') {
      // Always pre-fetch dashboard data for coaches
      prefetchPromises.push(this.prefetchCoachDashboard(userId))
      
      // Pre-fetch client list
      prefetchPromises.push(this.prefetchClientList(userId))
      
      // Pre-fetch exercise library
      prefetchPromises.push(this.prefetchExerciseLibrary(userId))
    }

    // Execute all pre-fetch operations in parallel
    await Promise.allSettled(prefetchPromises)
  }

  // Background refresh for critical data
  static async backgroundRefresh(userId: string, userRole: 'client' | 'coach'): Promise<void> {
    if (isPrefetchDisabled) return
    // Refresh dashboard data in background
    if (userRole === 'client') {
      await this.prefetchClientDashboard(userId)
    } else {
      await this.prefetchCoachDashboard(userId)
    }
  }

  // Invalidate cache entries
  static invalidate(pattern: string): void {
    const stats = cache.getStats()
    stats.keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.delete(key)
      }
    })
  }

  // Clear all cache
  static clearCache(): void {
    cache.clear()
  }
}

// Hook for using cached data with fallback
export function useCachedData<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)

      // Try to get from cache first
      const cachedData = cache.get<T>(cacheKey)
      if (cachedData) {
        setData(cachedData)
        setLoading(false)
        return
      }

      // Fetch fresh data
      try {
        const freshData = await fetchFn()
        cache.set(cacheKey, freshData, ttl)
        setData(freshData)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [cacheKey, fetchFn, ttl])

  return { data, loading, error }
}

// Utility function to pre-fetch data on route change
export function prefetchOnRouteChange(userId: string, userRole: 'client' | 'coach', route: string): void {
  if (isPrefetchDisabled) return
  if (isLiveWorkoutRoute(route)) return
  // Use requestIdleCallback for non-blocking pre-fetching
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      PrefetchService.smartPrefetch(userId, userRole, route)
    })
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      PrefetchService.smartPrefetch(userId, userRole, route)
    }, 100)
  }
}

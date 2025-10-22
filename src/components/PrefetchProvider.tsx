'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PrefetchService } from '@/lib/prefetch'
import { usePathname } from 'next/navigation'

interface PrefetchProviderProps {
  children: React.ReactNode
}

export function PrefetchProvider({ children }: PrefetchProviderProps) {
  const { user } = useAuth()
  const pathname = usePathname()
  const prefetchedRoutes = useRef(new Set<string>())

  useEffect(() => {
    if (!user) return

    const userRole = user.user_metadata?.role || 'client'
    const routeKey = `${userRole}_${pathname}`

    // Skip if we've already prefetched this route
    if (prefetchedRoutes.current.has(routeKey)) {
      return
    }

    // Mark this route as prefetched
    prefetchedRoutes.current.add(routeKey)

    // Pre-fetch data based on current route
    const prefetchData = async () => {
      try {
        if (userRole === 'client') {
          await prefetchClientRoutes(user.id, pathname)
        } else if (userRole === 'coach') {
          await prefetchCoachRoutes(user.id, pathname)
        }
      } catch (error) {
        console.error('Error in prefetching:', error)
      }
    }

    // Use requestIdleCallback for non-blocking prefetching
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(prefetchData, { timeout: 2000 })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(prefetchData, 100)
    }
  }, [user, pathname])

  // Pre-fetch data for client routes
  const prefetchClientRoutes = async (userId: string, pathname: string) => {
    const prefetchPromises: Promise<void>[] = []

    // Always prefetch dashboard data
    prefetchPromises.push(PrefetchService.prefetchClientDashboard(userId))

    // Route-specific prefetching
    if (pathname.includes('/client/workouts')) {
      prefetchPromises.push(PrefetchService.prefetchWorkoutAssignments(userId))
    }

    if (pathname.includes('/client/nutrition')) {
      prefetchPromises.push(PrefetchService.prefetchFoodLibrary())
      
      // Pre-fetch today's and tomorrow's nutrition data
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      prefetchPromises.push(PrefetchService.prefetchNutritionData(userId, today))
      prefetchPromises.push(PrefetchService.prefetchNutritionData(userId, tomorrow))
    }

    // Execute all prefetch operations in parallel
    await Promise.allSettled(prefetchPromises)
  }

  // Pre-fetch data for coach routes
  const prefetchCoachRoutes = async (userId: string, pathname: string) => {
    const prefetchPromises: Promise<void>[] = []

    // Always prefetch dashboard data
    prefetchPromises.push(PrefetchService.prefetchCoachDashboard(userId))

    // Route-specific prefetching
    if (pathname.includes('/coach/exercises')) {
      prefetchPromises.push(PrefetchService.prefetchExerciseLibrary(userId))
    }

    if (pathname.includes('/coach/clients')) {
      prefetchPromises.push(PrefetchService.prefetchClientList(userId))
    }

    // Execute all prefetch operations in parallel
    await Promise.allSettled(prefetchPromises)
  }

  return <>{children}</>
}

// Hook for manual prefetching
export function usePrefetch() {
  const { user } = useAuth()

  const prefetchRoute = async (route: string) => {
    if (!user) return

    const userRole = user.user_metadata?.role || 'client'
    
    if (userRole === 'client') {
      await prefetchClientRoutes(user.id, route)
    } else if (userRole === 'coach') {
      await prefetchCoachRoutes(user.id, route)
    }
  }

  const prefetchClientRoutes = async (userId: string, pathname: string) => {
    const prefetchPromises: Promise<void>[] = []

    if (pathname.includes('/client/workouts')) {
      prefetchPromises.push(PrefetchService.prefetchWorkoutAssignments(userId))
    }

    if (pathname.includes('/client/nutrition')) {
      prefetchPromises.push(PrefetchService.prefetchFoodLibrary())
      
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      prefetchPromises.push(PrefetchService.prefetchNutritionData(userId, today))
      prefetchPromises.push(PrefetchService.prefetchNutritionData(userId, tomorrow))
    }

    await Promise.allSettled(prefetchPromises)
  }

  const prefetchCoachRoutes = async (userId: string, pathname: string) => {
    const prefetchPromises: Promise<void>[] = []

    if (pathname.includes('/coach/exercises')) {
      prefetchPromises.push(PrefetchService.prefetchExerciseLibrary(userId))
    }

    if (pathname.includes('/coach/clients')) {
      prefetchPromises.push(PrefetchService.prefetchClientList(userId))
    }

    await Promise.allSettled(prefetchPromises)
  }

  return { prefetchRoute }
}

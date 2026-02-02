/**
 * Server-side caching utilities using Next.js unstable_cache
 * 
 * IMPORTANT: This is server-only caching (NOT CDN caching).
 * - Use for server functions and API routes
 * - User-scoped data should include userId in the cache key
 * - Call revalidateTag() to invalidate when data changes
 * 
 * DO NOT use:
 * - In-memory Map caches (won't work on Vercel multi-instance)
 * - CDN caching (s-maxage) for user-specific data
 */

import { unstable_cache } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ============================================================================
// Cache Configuration
// ============================================================================

export const CACHE_TAGS = {
  CLIENT_SUMMARY: 'client-summary',
  COACH_PICKUP: 'coach-pickup',
  TEMPLATES: 'templates',
  EXERCISES: 'exercises',
  USER_PROFILE: 'user-profile',
} as const

export const CACHE_TTL = {
  /** Client summary - short TTL since it changes with workouts */
  CLIENT_SUMMARY: 60, // 60 seconds
  
  /** Coach pickup - changes when client completes workouts */
  COACH_PICKUP: 30, // 30 seconds
  
  /** Template metadata - rarely changes */
  TEMPLATES: 300, // 5 minutes
  
  /** Exercise library - rarely changes */
  EXERCISES: 600, // 10 minutes
  
  /** User profile - changes on profile updates */
  USER_PROFILE: 300, // 5 minutes
} as const

// ============================================================================
// Cached Server Functions
// ============================================================================

/**
 * Get client workout summary with caching
 * Uses the optimized RPC function
 * 
 * @param userId - Client's user ID (used as cache key)
 * @returns Summary data from get_client_workout_summary RPC
 */
export const getCachedClientSummary = (userId: string) => 
  unstable_cache(
    async () => {
      const supabase = await createSupabaseServerClient()
      const { data, error } = await supabase.rpc('get_client_workout_summary')
      
      if (error) {
        console.error('[getCachedClientSummary] RPC error:', error)
        throw error
      }
      
      return data
    },
    [`client-summary-${userId}`], // Cache key includes userId
    { 
      revalidate: CACHE_TTL.CLIENT_SUMMARY,
      tags: [CACHE_TAGS.CLIENT_SUMMARY, `user-${userId}`]
    }
  )()

/**
 * Get coach pickup workout with caching
 * Uses the optimized RPC function
 * 
 * @param coachId - Coach's user ID
 * @param clientId - Client's user ID being looked up
 * @returns Pickup workout data from get_coach_pickup_workout RPC
 */
export const getCachedCoachPickup = (coachId: string, clientId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createSupabaseServerClient()
      const { data, error } = await supabase.rpc('get_coach_pickup_workout', {
        p_client_id: clientId
      })
      
      if (error) {
        console.error('[getCachedCoachPickup] RPC error:', error)
        throw error
      }
      
      return data
    },
    [`coach-pickup-${coachId}-${clientId}`],
    {
      revalidate: CACHE_TTL.COACH_PICKUP,
      tags: [CACHE_TAGS.COACH_PICKUP, `coach-${coachId}`, `user-${clientId}`]
    }
  )()

/**
 * Get workout template by ID with caching
 * Template data changes rarely, so longer TTL is appropriate
 * 
 * @param templateId - Workout template ID
 * @returns Template data
 */
export const getCachedTemplate = (templateId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createSupabaseServerClient()
      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          id, name, description, estimated_duration, difficulty_level, category,
          workout_blocks (
            id, block_type, block_name, block_order, total_sets
          )
        `)
        .eq('id', templateId)
        .single()
      
      if (error) {
        console.error('[getCachedTemplate] Error:', error)
        throw error
      }
      
      return data
    },
    [`template-${templateId}`],
    {
      revalidate: CACHE_TTL.TEMPLATES,
      tags: [CACHE_TAGS.TEMPLATES, `template-${templateId}`]
    }
  )()

/**
 * Get exercise library for a coach with caching
 * 
 * @param coachId - Coach's user ID
 * @returns List of exercises
 */
export const getCachedExercises = (coachId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createSupabaseServerClient()
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, description, muscle_group, equipment, is_compound')
        .or(`coach_id.eq.${coachId},is_public.eq.true`)
        .order('name')
      
      if (error) {
        console.error('[getCachedExercises] Error:', error)
        throw error
      }
      
      return data
    },
    [`exercises-${coachId}`],
    {
      revalidate: CACHE_TTL.EXERCISES,
      tags: [CACHE_TAGS.EXERCISES, `coach-${coachId}`]
    }
  )()

// ============================================================================
// Cache Invalidation Helpers
// ============================================================================

// Note: revalidateTag must be called from a Server Action or Route Handler
// These are just helper imports to make invalidation easier

export { revalidateTag, revalidatePath } from 'next/cache'

/**
 * Invalidate all caches for a specific user
 * Call this when the user completes a workout, updates profile, etc.
 * 
 * Usage (in a Route Handler or Server Action):
 * ```typescript
 * import { invalidateUserCache } from '@/lib/serverCache'
 * await invalidateUserCache(userId)
 * ```
 */
export async function invalidateUserCache(userId: string) {
  const { revalidateTag } = await import('next/cache')
  revalidateTag(`user-${userId}`)
}

/**
 * Invalidate client summary cache
 * Call this after completing a workout, changing assignments, etc.
 */
export async function invalidateClientSummary(userId: string) {
  const { revalidateTag } = await import('next/cache')
  revalidateTag(CACHE_TAGS.CLIENT_SUMMARY)
  revalidateTag(`user-${userId}`)
}

/**
 * Invalidate template cache
 * Call this after updating a template
 */
export async function invalidateTemplate(templateId: string) {
  const { revalidateTag } = await import('next/cache')
  revalidateTag(CACHE_TAGS.TEMPLATES)
  revalidateTag(`template-${templateId}`)
}

/**
 * Scheduled Jobs for Goal Tracking
 * Handles periodic goal syncing and resets
 * 
 * Note: This requires a cron job runner or scheduled task system.
 * For Next.js, consider using:
 * - Vercel Cron Jobs (vercel.json)
 * - External cron service (cron-job.org, EasyCron)
 * - Or call these functions from a separate Node.js service
 */

import { syncAllClientGoals, resetWeeklyGoals, resetDailyGoals } from './goalSyncService'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Reset weekly consistency goals for all clients
 * Should be called every Sunday at 11:59 PM
 */
export async function runWeeklyGoalReset() {
  console.log('🔄 Running weekly goal reset...')
  
  try {
    // Get all clients
    const { data: clients, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'client')

    if (error) {
      console.error('Error fetching clients:', error)
      return
    }

    if (!clients || clients.length === 0) {
      console.log('No clients found')
      return
    }

    // Reset goals for each client
    for (const client of clients) {
      await resetWeeklyGoals(client.id)
    }

    console.log(`✅ Reset weekly goals for ${clients.length} clients`)
  } catch (error) {
    console.error('Error in weekly goal reset:', error)
  }
}

/**
 * Reset daily goals for all clients
 * Should be called every day at 12:00 AM (midnight)
 */
export async function runDailyGoalReset() {
  console.log('🔄 Running daily goal reset...')
  
  try {
    // Get all clients
    const { data: clients, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'client')

    if (error) {
      console.error('Error fetching clients:', error)
      return
    }

    if (!clients || clients.length === 0) {
      console.log('No clients found')
      return
    }

    // Reset goals for each client
    for (const client of clients) {
      await resetDailyGoals(client.id)
    }

    console.log(`✅ Reset daily goals for ${clients.length} clients`)
  } catch (error) {
    console.error('Error in daily goal reset:', error)
  }
}

/**
 * Sync all goals for all clients
 * Should be called every day at 1:00 AM (recalculate all goals)
 */
export async function runDailyGoalSync() {
  console.log('🔄 Running daily goal sync...')
  
  try {
    // Get all clients
    const { data: clients, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'client')

    if (error) {
      console.error('Error fetching clients:', error)
      return
    }

    if (!clients || clients.length === 0) {
      console.log('No clients found')
      return
    }

    // Sync goals for each client
    let totalSynced = 0
    for (const client of clients) {
      const results = await syncAllClientGoals(client.id)
      totalSynced += results.filter(r => r.updated).length
    }

    console.log(`✅ Synced goals for ${clients.length} clients (${totalSynced} goals updated)`)
  } catch (error) {
    console.error('Error in daily goal sync:', error)
  }
}

/**
 * API route handlers for cron jobs
 * These can be called by external cron services or Vercel Cron
 */

// Example: Create API routes for cron jobs
// File: src/app/api/cron/weekly-reset/route.ts
// File: src/app/api/cron/daily-reset/route.ts
// File: src/app/api/cron/daily-sync/route.ts


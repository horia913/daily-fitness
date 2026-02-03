/**
 * GET /api/client/workouts/summary
 * 
 * Returns comprehensive workout summary for the authenticated client.
 * 
 * OPTIMIZED: Uses single PostgreSQL RPC call (get_client_workout_summary)
 * instead of 20-25 individual queries.
 * 
 * Response includes:
 * - todaysWorkout
 * - currentProgram
 * - weeklyProgress
 * - weeklyStats
 * - workoutHistory
 * - allAssignedWorkouts
 * - completedPrograms
 * - assignmentIdByTemplate
 * - scheduleIdByTemplate
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { PerfCollector } from '@/lib/perfUtils'

// Feature flag to fall back to legacy implementation if RPC not available
const USE_RPC = process.env.DISABLE_SUMMARY_RPC !== 'true'

export async function GET(request: NextRequest) {
  const perf = new PerfCollector('/api/client/workouts/summary')
  
  try {
    // 1. Create authenticated Supabase client
    const supabase = await createSupabaseServerClient()
    
    // 2. Verify authentication
    const { data: { user }, error: authError } = await perf.time('auth', () =>
      supabase.auth.getUser()
    )

    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message || 'Unauthorized' },
        { status: 401 }
      )
    }

    // 3. Call the optimized RPC (auth.uid() is validated inside the function)
    const rpcResult = await perf.time('rpc_get_client_workout_summary', async () =>
      supabase.rpc('get_client_workout_summary')
    )
    const { data, error } = rpcResult
    
    if (error) {
      console.error('[summary] RPC error:', error)
      
      // Check if function doesn't exist (migration not run)
      if (error.code === '42883' || (error.message?.includes('function') && error.message?.includes('does not exist'))) {
        console.error('[summary] RPC function not found. Run migration 20260202_client_summary_rpc.sql')
        return NextResponse.json(
          { 
            error: 'Database function not available',
            details: 'Please run the client summary RPC migration.',
            code: 'RPC_NOT_FOUND'
          },
          { status: 503 }
        )
      }
      
      // Handle authentication errors from RPC
      if (error.message?.includes('Not authenticated')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to fetch workout summary' },
        { status: 500 }
      )
    }
    
    // 4. Log performance summary
    perf.logSummary()
    
    // 5. Return response with Server-Timing headers
    const response = NextResponse.json(data)
    const perfHeaders = perf.getHeaders()
    Object.entries(perfHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
    
  } catch (error: any) {
    console.error('[summary] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

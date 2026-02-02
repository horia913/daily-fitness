/**
 * GET /api/coach/dashboard
 * 
 * Returns comprehensive dashboard data for the authenticated coach.
 * 
 * OPTIMIZED: Uses single PostgreSQL RPC call (get_coach_dashboard)
 * instead of 6+ individual queries.
 * 
 * Response includes:
 * - stats { totalClients, activeClients, totalWorkouts, totalMealPlans }
 * - todaySessions
 * - recentClients
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { PerfCollector } from '@/lib/perfUtils'

export async function GET(request: NextRequest) {
  const perf = new PerfCollector('/api/coach/dashboard')
  
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
    
    // 3. Call the optimized RPC
    const rpcResult = await perf.time('rpc_get_coach_dashboard', async () =>
      supabase.rpc('get_coach_dashboard')
    )
    const { data, error } = rpcResult
    
    if (error) {
      console.error('[coach/dashboard] RPC error:', error)
      
      // Check if function doesn't exist (migration not run)
      if (error.code === '42883' || (error.message?.includes('function') && error.message?.includes('does not exist'))) {
        console.error('[coach/dashboard] RPC function not found. Run migration 20260202_coach_dashboard_rpc.sql')
        return NextResponse.json(
          { 
            error: 'Database function not available',
            details: 'Please run the coach dashboard RPC migration.',
            code: 'RPC_NOT_FOUND'
          },
          { status: 503 }
        )
      }
      
      if (error.message?.includes('Not authenticated')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      if (error.message?.includes('must be coach or admin')) {
        return NextResponse.json(
          { error: 'Forbidden - Only coaches can access this endpoint' },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to fetch dashboard data' },
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
    console.error('[coach/dashboard] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

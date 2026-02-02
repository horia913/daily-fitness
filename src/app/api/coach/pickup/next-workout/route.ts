/**
 * GET /api/coach/pickup/next-workout?clientId=UUID
 * 
 * Fetches the next workout for a client in Pickup Mode (Coach Gym Console).
 * This is NOT calendar-based. Programs are sequence-based (Week → Day).
 * 
 * OPTIMIZED: Uses single PostgreSQL RPC call (get_coach_pickup_workout)
 * instead of 15-20 individual queries.
 * 
 * Returns:
 * - Client info
 * - Program info
 * - Current week/day indices
 * - Workout template with blocks preview
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { PerfCollector } from '@/lib/perfUtils'

export async function GET(request: NextRequest) {
  const perf = new PerfCollector('/api/coach/pickup/next-workout')
  
  try {
    // 1. Get clientId from query params
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required parameter: clientId' },
        { status: 400 }
      )
    }
    
    // 2. Create authenticated Supabase client
    const supabase = await createSupabaseServerClient()
    
    // 3. Verify authentication
    const { data: { user }, error: authError } = await perf.time('auth', () =>
      supabase.auth.getUser()
    )
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // 4. Call the optimized RPC
    // The RPC validates:
    // - auth.uid() is a coach/admin
    // - The client belongs to this coach
    const rpcResult = await perf.time('rpc_get_coach_pickup_workout', async () =>
      supabase.rpc('get_coach_pickup_workout', { p_client_id: clientId })
    )
    const { data, error } = rpcResult
    
    if (error) {
      console.error('[pickup/next-workout] RPC error:', error)
      
      // Check if function doesn't exist (migration not run)
      if (error.code === '42883' || (error.message?.includes('function') && error.message?.includes('does not exist'))) {
        console.error('[pickup/next-workout] RPC function not found. Run migration 20260202_coach_pickup_rpc.sql')
        return NextResponse.json(
          { 
            error: 'Database function not available',
            details: 'Please run the coach pickup RPC migration.',
            code: 'RPC_NOT_FOUND'
          },
          { status: 503 }
        )
      }
      
      // Handle specific errors from RPC
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
      
      if (error.message?.includes('Client not found') || error.message?.includes('does not belong to this coach')) {
        return NextResponse.json(
          { error: 'Client not found or does not belong to this coach' },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to fetch workout' },
        { status: 500 }
      )
    }
    
    // 5. Check for error responses from RPC (returned as data, not thrown)
    if (data?.error) {
      const statusCode = data.error.includes('not configured') ? 422 : 
                        data.error.includes('Invalid progress') ? 422 : 500
      return NextResponse.json(data, { status: statusCode })
    }
    
    // 6. Log performance summary
    perf.logSummary()
    
    // 7. Return response with Server-Timing headers
    const response = NextResponse.json(data)
    const perfHeaders = perf.getHeaders()
    Object.entries(perfHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
    
  } catch (error: any) {
    console.error('[pickup/next-workout] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

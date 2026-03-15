/**
 * GET /api/client/dashboard
 *
 * Returns comprehensive dashboard data for the authenticated client.
 * Single RPC call (get_client_dashboard) — no buildProgramWeekState or other queries.
 * RPC returns profile, streak, weeklyProgress, todaysWorkout, programProgress,
 * todayWellnessLog, checkinStreak, highlights, athleteScore, scoreHistory.
 *
 * The client dashboard page may call supabase.rpc('get_client_dashboard') directly
 * for one round-trip; this API remains for Server-Timing or other server-side callers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { PerfCollector } from '@/lib/perfUtils'

export async function GET(request: NextRequest) {
  const perf = new PerfCollector('/api/client/dashboard')

  try {
    const supabase = await createSupabaseServerClient()

    const { data: { user }, error: authError } = await perf.time('auth', () =>
      supabase.auth.getUser()
    )

    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message || 'Unauthorized' },
        { status: 401 }
      )
    }

    const rpcResult = await perf.time('rpc_get_client_dashboard', () =>
      Promise.resolve(supabase.rpc('get_client_dashboard'))
    )
    const { data, error } = rpcResult

    if (error) {
      console.error('[dashboard] RPC error:', error)
      if (error.code === '42883' || (error.message?.includes('function') && error.message?.includes('does not exist'))) {
        return NextResponse.json(
          { error: 'Database function not available', details: 'Run get_client_dashboard migration.', code: 'RPC_NOT_FOUND' },
          { status: 503 }
        )
      }
      if (error.message?.includes('Not authenticated')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.json(
        { error: error.message || 'Failed to fetch dashboard data' },
        { status: 500 }
      )
    }

    perf.logSummary()
    const response = NextResponse.json(data ?? {})
    Object.entries(perf.getHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  } catch (error: any) {
    console.error('[dashboard] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

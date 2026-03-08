/**
 * GET /api/coach/dashboard
 *
 * Returns dashboard data for the authenticated coach in one response:
 * - briefing: morning briefing (stats, alerts, client summaries)
 * - controlRoom: control room signals (e.g. program compliance)
 *
 * Uses server Supabase client; all data fetched in parallel (no RPC).
 */

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getMorningBriefing } from '@/lib/coachDashboardService'
import { getControlRoomResult } from '@/lib/coach/controlRoomService'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Unauthorized' },
        { status: 401 }
      )
    }

    const [briefing, controlRoom] = await Promise.all([
      getMorningBriefing(user.id, supabase),
      getControlRoomResult(supabase, user.id),
    ])

    console.log('[Dashboard] network calls done')

    return NextResponse.json({ briefing, controlRoom })
  } catch (err: unknown) {
    console.error('[coach/dashboard] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

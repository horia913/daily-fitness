/**
 * GET /api/coach/control-room
 *
 * WARNING: No frontend caller found as of Feb 2026. Coach UI may use
 * controlRoomService directly. If confirmed unused, consider removing.
 *
 * Read-only Control Room API. Returns period, signals (program compliance %),
 * and exclusions. No writes; uses only program_assignments, program_schedule,
 * program_day_completions, program_progress.
 */

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getControlRoomResult } from '@/lib/coach/controlRoomService'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await getControlRoomResult(supabase, user.id)
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('[coach/control-room] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

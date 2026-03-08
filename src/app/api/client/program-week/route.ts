/**
 * GET /api/client/program-week
 *
 * Returns the current unlocked week's day slots with completion status,
 * template names, and week unlock state for the authenticated client.
 *
 * Used by the client dashboard to render swipeable day cards.
 * Single authority for Today: delegates to buildProgramWeekState.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { buildProgramWeekState } from '@/lib/programWeekStateBuilder'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // todayWeekday: 0=Monday .. 6=Sunday (client timezone). Default to server weekday if missing.
    const { searchParams } = new URL(request.url)
    const todayWeekdayParam = searchParams.get('todayWeekday')
    const todayWeekday = todayWeekdayParam !== null
      ? Math.min(6, Math.max(0, parseInt(todayWeekdayParam, 10) || 0))
      : (new Date().getDay() + 6) % 7

    const state = await buildProgramWeekState(supabase, user.id, todayWeekday)

    return NextResponse.json(state)
  } catch (error: any) {
    console.error('[program-week] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

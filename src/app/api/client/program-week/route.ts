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
import { weekdayMon0Sun6InTimezone } from '@/lib/clientZonedCalendar'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const todayWeekdayParam = searchParams.get('todayWeekday')
    let todayWeekday: number
    if (todayWeekdayParam !== null) {
      todayWeekday = Math.min(6, Math.max(0, parseInt(todayWeekdayParam, 10) || 0))
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', user.id)
        .maybeSingle()
      const tz = typeof profile?.timezone === 'string' ? profile.timezone.trim() : ''
      if (!tz) {
        return NextResponse.json(
          {
            error:
              'Cannot resolve client timezone; pass todayWeekday explicitly or set profile.timezone.',
          },
          { status: 400 },
        )
      }
      todayWeekday = weekdayMon0Sun6InTimezone(new Date(), tz)
    }

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

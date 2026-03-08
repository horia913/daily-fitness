/**
 * GET /api/coach/analytics/adherence
 * Query: period=week|month|quarter (default week)
 * Returns raw data for adherence computation in one response.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: authError?.message ?? 'Unauthorized' }, { status: 401 })
    }

    const period = request.nextUrl.searchParams.get('period') ?? 'week'
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const daysAgo = period === 'week' ? 7 : period === 'month' ? 30 : 90
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - daysAgo)
    const sevenDaysAgoStr = startDate.toISOString().split('T')[0]

    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('client_id, status')
      .eq('coach_id', user.id)
      .eq('status', 'active')

    if (clientsError || !clientsData?.length) {
      return NextResponse.json({
        clients: [],
        profiles: [],
        assignments: [],
        logs: [],
        wellness: [],
        todayStr,
        sevenDaysAgoStr,
      })
    }

    const clientIds = clientsData.map((c) => c.client_id)

    const [
      { data: profilesData },
      { data: assignmentsData },
      { data: logsData },
      { data: wellnessData },
    ] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', clientIds),
      supabase.from('workout_assignments').select('id, client_id, scheduled_date, status').in('client_id', clientIds).gte('scheduled_date', sevenDaysAgoStr).lte('scheduled_date', todayStr),
      supabase.from('workout_logs').select('id, client_id, workout_assignment_id, completed_at').in('client_id', clientIds).gte('completed_at', sevenDaysAgoStr + 'T00:00:00').not('completed_at', 'is', null),
      supabase.from('daily_wellness_logs').select('id, client_id, log_date').in('client_id', clientIds).gte('log_date', sevenDaysAgoStr).lte('log_date', todayStr),
    ])

    console.log('[Coach analytics adherence] network calls done')

    return NextResponse.json({
      clients: clientsData,
      profiles: profilesData ?? [],
      assignments: assignmentsData ?? [],
      logs: logsData ?? [],
      wellness: wellnessData ?? [],
      todayStr,
      sevenDaysAgoStr,
    })
  } catch (err: unknown) {
    console.error('[coach/analytics/adherence] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

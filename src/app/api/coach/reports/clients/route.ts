import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getPeriodBounds } from '@/lib/metrics/period'

export async function GET(_req: NextRequest) {
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

    // For now, always use "this_month" period to match the original client logic.
    const period = getPeriodBounds('this_month')

    const { data: clientsRows, error: clientsError } = await supabase
      .from('clients')
      .select('id, client_id, created_at')
      .eq('coach_id', user.id)

    if (clientsError || !clientsRows || clientsRows.length === 0) {
      return NextResponse.json({ clients: [] })
    }

    const clientIds = clientsRows.map((row) => row.client_id)

    const [
      { data: profiles },
      { data: bodyRows },
      { count: totalWorkoutsCount },
      { count: goalsAchievedCount },
      { count: totalGoalsCount },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', clientIds),
      supabase
        .from('body_metrics')
        .select('client_id, weight_kg, body_fat_percentage')
        .in('client_id', clientIds)
        .order('measured_date', { ascending: false }),
      supabase
        .from('workout_logs')
        .select('id', { count: 'exact', head: true })
        .in('client_id', clientIds)
        .not('completed_at', 'is', null)
        .gte('completed_at', period.start)
        .lt('completed_at', period.end),
      supabase
        .from('goals')
        .select('id', { count: 'exact', head: true })
        .in('client_id', clientIds)
        .eq('status', 'completed')
        .not('completed_date', 'is', null)
        .gte('completed_date', period.start.slice(0, 10))
        .lt('completed_date', period.end.slice(0, 10)),
      supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .in('client_id', clientIds)
        .in('status', ['active', 'completed']),
    ])

    const profileMap = new Map<
      string,
      { id: string; first_name?: string | null; last_name?: string | null }
    >((profiles || []).map((p) => [p.id, p]))

    const latestBody: Record<
      string,
      { weight_kg: number | null; body_fat_percentage: number | null }
    > = {}
    ;(bodyRows || []).forEach(
      (row: {
        client_id: string
        weight_kg: number | null
        body_fat_percentage: number | null
      }) => {
        if (!latestBody[row.client_id]) {
          latestBody[row.client_id] = {
            weight_kg: row.weight_kg,
            body_fat_percentage: row.body_fat_percentage,
          }
        }
      }
    )

    const totalWorkouts = totalWorkoutsCount ?? 0
    const workoutsPerClient =
      clientIds.length > 0
        ? Math.round(totalWorkouts / clientIds.length)
        : 0

    const achieved = goalsAchievedCount ?? 0
    const totalGoals = totalGoalsCount ?? 0
    const successRatePercent =
      totalGoals > 0 ? Math.round((achieved / totalGoals) * 100) : 0

    const todayStr = new Date().toISOString().split('T')[0]

    const clients = clientsRows.map(
      (row: { id: string; client_id: string; created_at?: string | null }) => {
        const profile = profileMap.get(row.client_id)
        const firstName = profile?.first_name || ''
        const lastName = profile?.last_name || ''
        const name = `${firstName} ${lastName}`.trim() || 'Client'
        const body = latestBody[row.client_id]

        return {
          id: row.id,
          name,
          avatar: name.slice(0, 2).toUpperCase() || '?',
          program: 'General Fitness',
          startDate: row.created_at?.split('T')[0] ?? '',
          lastActive: todayStr,
          metrics: {
            weight: body?.weight_kg ?? 0,
            bodyFat: body?.body_fat_percentage ?? 0,
            strength: successRatePercent,
            endurance: workoutsPerClient,
            adherence: successRatePercent,
          },
        }
      }
    )

    return NextResponse.json({ clients })
  } catch (err: unknown) {
    console.error('[coach/reports/clients] Unexpected error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}


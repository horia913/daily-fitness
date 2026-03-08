/**
 * GET /api/coach/clients
 *
 * Returns all clients for the authenticated coach with profiles and metrics
 * in one response. Uses server Supabase client; no client-side Supabase calls.
 */

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getClientMetrics } from '@/lib/coachDashboardService'

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

    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('client_id, status, created_at, updated_at, coach_id')
      .eq('coach_id', user.id)

    if (clientsError) {
      console.error('[coach/clients] Error fetching clients:', clientsError)
      return NextResponse.json(
        { error: clientsError.message },
        { status: 500 }
      )
    }

    if (!clientsData?.length) {
      return NextResponse.json({ clients: [], metrics: {} })
    }

    const clientIds = clientsData.map((c) => c.client_id)

    const [{ data: profilesData, error: profilesError }, metricsMap] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url')
        .in('id', clientIds),
      getClientMetrics(clientIds, supabase),
    ])

    if (profilesError) {
      console.error('[coach/clients] Error fetching profiles:', profilesError)
      return NextResponse.json(
        { error: profilesError.message },
        { status: 500 }
      )
    }

    const profilesById = new Map((profilesData ?? []).map((p) => [p.id, p]))

    console.log('[Coach clients] network calls done')

    const clients = clientsData.map((row) => {
      const profile = profilesById.get(row.client_id)
      const name = profile
        ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Client'
        : 'Client'
      const metrics = metricsMap.get(row.client_id)
      return {
        id: row.client_id,
        client_id: row.client_id,
        coach_id: row.coach_id,
        status: row.status,
        name,
        email: profile?.email ?? '',
        avatar: profile?.avatar_url,
        profiles: profile
          ? {
              id: profile.id,
              first_name: profile.first_name ?? undefined,
              last_name: profile.last_name ?? undefined,
              avatar_url: profile.avatar_url ?? undefined,
              email: profile.email ?? undefined,
            }
          : undefined,
        metrics: metrics ?? {
          clientId: row.client_id,
          lastActive: null,
          workoutsThisWeek: 0,
          checkinStreak: 0,
          programStatus: 'noProgram' as const,
          programEndDate: null,
          latestStress: null,
          latestSoreness: null,
          trainedToday: false,
          checkedInToday: false,
        },
      }
    })

    return NextResponse.json({ clients })
  } catch (err: unknown) {
    console.error('[coach/clients] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

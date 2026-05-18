/**
 * GET /api/coach/clients
 *
 * Returns all clients for the authenticated coach with profiles and metrics
 * in one response. Uses server Supabase client; no client-side Supabase calls.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getClientMetrics } from '@/lib/coachDashboardService'
import { fetchCoachAthleteScoreSummariesByClientIds } from '@/lib/coachAthleteScoreSummaries'
import { fetchCoachClientListTrainingPayload } from '@/lib/coachClientListTrainingStatus'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

type CoachClientProfileRow = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  timezone?: string | null
}

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

    const scoreSupabase =
      supabaseServiceKey && supabaseUrl
        ? createClient(supabaseUrl, supabaseServiceKey)
        : supabase

    const [{ data: profilesData, error: profilesError }, metricsMap, athleteScoreMap] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, first_name, last_name, avatar_url')
          .in('id', clientIds),
        getClientMetrics(clientIds, supabase),
        fetchCoachAthleteScoreSummariesByClientIds(scoreSupabase, clientIds),
      ])

    if (profilesError) {
      console.error('[coach/clients] Error fetching profiles:', profilesError)
      return NextResponse.json(
        { error: profilesError.message },
        { status: 500 }
      )
    }

    const profilesById = new Map<string, CoachClientProfileRow>(
      (profilesData ?? []).map((p) => [p.id, p as CoachClientProfileRow]),
    )

    const trainingMap = await fetchCoachClientListTrainingPayload(
      scoreSupabase,
      clientIds,
      profilesById,
    )

    console.log('[Coach clients] network calls done')

    const clients = clientsData.map((row) => {
      const profile = profilesById.get(row.client_id)
      const name = profile
        ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Client'
        : 'Client'
      const metrics = metricsMap.get(row.client_id)
      const training = trainingMap.get(row.client_id)
      return {
        id: row.client_id,
        client_id: row.client_id,
        coach_id: row.coach_id,
        status: row.status,
        name,
        email: profile?.email ?? '',
        avatar: profile?.avatar_url,
        firstName: profile?.first_name ?? null,
        profiles: profile
          ? {
              id: profile.id,
              first_name: profile.first_name ?? undefined,
              last_name: profile.last_name ?? undefined,
              avatar_url: profile.avatar_url ?? undefined,
              email: profile.email ?? undefined,
              timezone: profile.timezone ?? undefined,
            }
          : undefined,
        athleteScore: athleteScoreMap.get(row.client_id) ?? null,
        pauseStatus: training?.pauseStatus ?? 'active',
        hasActiveProgram: training?.hasActiveProgram ?? false,
        activeProgramAssignmentId: training?.activeProgramAssignmentId ?? null,
        trainingStatus: training?.trainingStatus ?? 'no_program',
        priorWeekScheduledCount: training?.priorWeekScheduledCount ?? 0,
        priorWeekCompletedCount: training?.priorWeekCompletedCount ?? 0,
        currentWeekCompletedCount: training?.currentWeekCompletedCount ?? 0,
        currentWeekScheduledPastCount: training?.currentWeekScheduledPastCount ?? 0,
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
          activeProgramName: null,
          programCurrentWeek: null,
          programDurationWeeks: null,
          mealCompliance7dPct: null,
          lastCheckinDate: null,
          weekReviewNeeded: false,
          completedWeekNumber: null,
          activeProgramId: null,
          activeProgramAssignmentId: null,
          subscriptionEndDate: null,
          subscriptionExpiringSoon: false,
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

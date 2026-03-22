/**
 * GET /api/coach/dashboard
 *
 * Returns dashboard data for the authenticated coach in one response:
 * - briefing: morning briefing (stats, alerts, client summaries)
 * - controlRoom: control room signals (e.g. program compliance)
 *
 * Uses single RPC get_coach_dashboard to replace ~26 individual queries.
 */

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_coach_dashboard', {
      p_coach_id: user.id,
    })

    if (rpcError) {
      console.error('[coach/dashboard] RPC error:', rpcError)
      return NextResponse.json(
        { error: rpcError.message ?? 'Failed to load dashboard' },
        { status: 500 }
      )
    }

    const raw = rpcData ?? null
    if (!raw) {
      return NextResponse.json({
        briefing: {
          totalClients: 0,
          activeClients: 0,
          clientsTrainedToday: 0,
          clientsCheckedInToday: 0,
          avgProgramCompliance: 0,
          avgCheckinCompliance: 0,
          alerts: {
            noCheckIn3Days: [],
            highStress: [],
            highSoreness: [],
            lowSleep: [],
            missedWorkouts: [],
            programEnding: [],
            noProgram: [],
            noMealPlan: [],
            overdueCheckIn: [],
            achievementUnlocked: [],
          },
          clientSummaries: [],
        },
        controlRoom: {
          period: { startUtc: '', endUtc: '', label: 'This week' },
          signals: { coachProgramCompliancePct: null },
          exclusions: { excludedClientIds: [], reasons: {} },
        },
        todaysSessions: [],
      })
    }

    const clients = raw.clients ?? []
    const todaysSessions = raw.todaysSessions ?? []
    const totalClients = raw.totalClients ?? 0
    const programCompliance = raw.programCompliance ?? null
    const rpcAlerts = raw.alerts ?? {}

    const trainedTodaySet = new Set(
      clients.filter((c: { trained_today?: boolean }) => c.trained_today).map((c: { client_id: string }) => c.client_id)
    )
    const checkedInTodaySet = new Set(
      clients.filter((c: { checked_in_today?: boolean }) => c.checked_in_today).map((c: { client_id: string }) => c.client_id)
    )

    const clientSummaries = clients.map((c: {
      client_id: string
      first_name?: string
      last_name?: string
      avatar_url?: string
      status?: string
      last_workout_at?: string
      last_checkin_date?: string
      active_program_name?: string
      week_workout_count?: number
      checkin_streak?: number
      trained_today?: boolean
      checked_in_today?: boolean
      has_active_meal_plan?: boolean
    }) => ({
      clientId: c.client_id,
      firstName: c.first_name ?? '',
      lastName: c.last_name ?? '',
      status: c.status ?? 'active',
      avatarUrl: c.avatar_url ?? null,
      trainedToday: c.trained_today ?? false,
      checkedInToday: c.checked_in_today ?? false,
      checkinStreak: c.checkin_streak ?? 0,
      lastWorkoutDate: c.last_workout_at ? c.last_workout_at.split('T')[0] : null,
      lastCheckinDate: c.last_checkin_date ?? null,
      programCompliance: null as number | null,
      latestSleep: null as number | null,
      latestStress: null as number | null,
      latestSoreness: null as number | null,
      athleteScore: null as number | null,
      hasActiveProgram: !!c.active_program_name,
      hasActiveMealPlan: c.has_active_meal_plan ?? false,
    }))

    const briefing = {
      totalClients,
      activeClients: clients.length,
      clientsTrainedToday: trainedTodaySet.size,
      clientsCheckedInToday: checkedInTodaySet.size,
      avgProgramCompliance: programCompliance ?? 0,
      avgCheckinCompliance: 0,
      alerts: {
        noCheckIn3Days: (rpcAlerts.noCheckIn3Days ?? []).map((a: { client_id: string; first_name?: string; last_name?: string; detail?: string }) => ({
          clientId: a.client_id,
          clientName: `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || 'Client',
          detail: a.detail ?? 'No check-in for 3+ days',
          type: 'noCheckIn3Days' as const,
          severity: 'medium' as const,
        })),
        highStress: [],
        highSoreness: [],
        lowSleep: [],
        missedWorkouts: (rpcAlerts.noWorkoutThisWeek ?? []).map((a: { client_id: string; first_name?: string; last_name?: string; detail?: string }) => ({
          clientId: a.client_id,
          clientName: `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || 'Client',
          detail: a.detail ?? 'No workout this week',
          type: 'missedWorkouts' as const,
          severity: 'medium' as const,
        })),
        programEnding: [],
        noProgram: [],
        noMealPlan: [],
        overdueCheckIn: [],
        achievementUnlocked: [],
      },
      clientSummaries: clientSummaries.sort((a: { trainedToday: boolean; checkedInToday: boolean; firstName: string; lastName: string }, b: { trainedToday: boolean; checkedInToday: boolean; firstName: string; lastName: string }) => {
        if (a.trainedToday !== b.trainedToday) return a.trainedToday ? -1 : 1
        if (a.checkedInToday !== b.checkedInToday) return a.checkedInToday ? -1 : 1
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      }),
    }

    const controlRoom = {
      period: { startUtc: '', endUtc: '', label: 'This week' },
      signals: { coachProgramCompliancePct: programCompliance },
      exclusions: { excludedClientIds: [] as string[], reasons: {} as Record<string, string> },
    }

    return NextResponse.json({ briefing, controlRoom, todaysSessions })
  } catch (err: unknown) {
    console.error('[coach/dashboard] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

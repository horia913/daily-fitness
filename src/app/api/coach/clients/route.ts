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
import {
  classifyCoachClientAttention,
  fetchCoachAttentionSignalsBatch,
  type CoachAttentionReason,
  type CoachAttentionLevel,
} from '@/lib/coachAttention'
import { calculateAthleteScore } from '@/lib/athleteScoreService'
import { computeScoreIsStale } from '@/app/coach/clients/coachClientListCardUtils'
import type { CoachAthleteScoreSummary } from '@/types/coachAthleteScore'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** Max stale clients recomputed per list load (bounded write/query cost). */
const STALE_SCORE_RECOMPUTE_CAP = 5

const ONE_HOUR_MS = 60 * 60 * 1000

type CoachClientProfileRow = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  timezone?: string | null
}

async function fetchActiveMealPlanNamesByClient(
  db: SupabaseClient,
  clientIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (clientIds.length === 0) return out

  const { data: assignments, error } = await db
    .from('meal_plan_assignments')
    .select('client_id, meal_plan_id, created_at')
    .in('client_id', clientIds)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[coach/clients] meal_plan_assignments:', error.message)
    return out
  }

  const planIdByClient = new Map<string, string>()
  for (const row of assignments ?? []) {
    if (!planIdByClient.has(row.client_id)) {
      planIdByClient.set(row.client_id, row.meal_plan_id)
    }
  }

  const planIds = [...new Set(planIdByClient.values())]
  if (planIds.length === 0) return out

  const { data: plans, error: plansError } = await db
    .from('meal_plans')
    .select('id, name')
    .in('id', planIds)

  if (plansError) {
    console.error('[coach/clients] meal_plans:', plansError.message)
    return out
  }

  const nameById = new Map((plans ?? []).map((p) => [p.id, p.name as string]))
  for (const [clientId, planId] of planIdByClient) {
    const name = nameById.get(planId)
    if (name) out.set(clientId, name)
  }
  return out
}

function scoreCalculatedBeforeOneHourAgo(calculatedAt: string | undefined): boolean {
  if (!calculatedAt) return false
  return Date.now() - new Date(calculatedAt).getTime() >= ONE_HOUR_MS
}

async function recomputeStaleAthleteScoresForList(
  clients: Array<{
    id: string
    athleteScore: CoachAthleteScoreSummary | null
    scoreIsStale: boolean
    hasActiveProgram: boolean
    pauseStatus: string
  }>,
  supabaseAdmin: SupabaseClient,
): Promise<void> {
  const targets = clients
    .filter(
      (c) =>
        c.scoreIsStale &&
        c.hasActiveProgram &&
        c.pauseStatus !== 'paused' &&
        scoreCalculatedBeforeOneHourAgo(c.athleteScore?.calculated_at),
    )
    .slice(0, STALE_SCORE_RECOMPUTE_CAP)

  for (const client of targets) {
    try {
      const result = await calculateAthleteScore(client.id, supabaseAdmin)
      if ('skipped' in result && result.skipped) {
        console.warn(
          `[coach/clients] athlete score recompute skipped for ${client.id}:`,
          result.reason,
        )
        continue
      }
      client.athleteScore = {
        score: result.score,
        tier: result.tier,
        paused: client.pauseStatus === 'paused',
        calculated_at: result.calculated_at,
      }
      client.scoreIsStale = false
    } catch (err) {
      console.error(
        `[coach/clients] athlete score recompute failed for ${client.id}:`,
        err,
      )
    }
  }
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
          .select('id, email, first_name, last_name, avatar_url, timezone')
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

    const todayYmd = new Date().toISOString().slice(0, 10)
    const activeAssignmentIds = [...new Set(
      [...trainingMap.values()]
        .map((t) => t.activeProgramAssignmentId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    )]

    const nextSessionByClient = new Map<string, string>()
    if (activeAssignmentIds.length > 0) {
      const { data: nextRows, error: nextErr } = await scoreSupabase
        .from('workout_assignments')
        .select('client_id, scheduled_date, assigned_date')
        .in('program_assignment_id', activeAssignmentIds)
        .is('completed_at', null)
        .or(`scheduled_date.gte.${todayYmd},and(scheduled_date.is.null,assigned_date.gte.${todayYmd})`)
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .order('assigned_date', { ascending: true, nullsFirst: false })

      if (nextErr) {
        console.error('[coach/clients] next workout_assignments:', nextErr.message)
      } else {
        for (const row of nextRows ?? []) {
          const clientId = row.client_id as string
          if (nextSessionByClient.has(clientId)) continue
          const nextDate = (row.scheduled_date as string | null) ?? (row.assigned_date as string | null)
          if (nextDate) nextSessionByClient.set(clientId, nextDate.slice(0, 10))
        }
      }
    }

    const [mealPlanNameByClient, attentionSignals, notesRes] = await Promise.all([
      fetchActiveMealPlanNamesByClient(scoreSupabase, clientIds),
      fetchCoachAttentionSignalsBatch(scoreSupabase, clientIds, profilesById),
      scoreSupabase
        .from('coach_client_notes')
        .select('client_id, note')
        .eq('coach_id', user.id)
        .in('client_id', clientIds),
    ])

    const noteByClient = new Map<string, string>()
    for (const row of notesRes.data ?? []) {
      const text = typeof row.note === 'string' ? row.note.trim() : ''
      if (text) noteByClient.set(row.client_id as string, text)
    }

    console.log('[Coach clients] network calls done')

    const clients = clientsData.map((row) => {
      const profile = profilesById.get(row.client_id)
      const name = profile
        ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Client'
        : 'Client'
      const metrics = metricsMap.get(row.client_id)
      const training = trainingMap.get(row.client_id)
      const athleteScore = athleteScoreMap.get(row.client_id) ?? null
      const lastActive = metrics?.lastActive ?? null
      const scoreIsStale = computeScoreIsStale(athleteScore, lastActive)
      const signals = attentionSignals.get(row.client_id)
      const verdict = signals
        ? classifyCoachClientAttention(signals)
        : ({ level: 'on_track' as CoachAttentionLevel, reasons: [] as CoachAttentionReason[] })
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
        athleteScore,
        mealPlanName: mealPlanNameByClient.get(row.client_id) ?? null,
        scoreIsStale,
        nextSessionDate: nextSessionByClient.get(row.client_id) ?? null,
        pauseStatus: training?.pauseStatus ?? 'active',
        hasActiveProgram: training?.hasActiveProgram ?? false,
        activeProgramAssignmentId: training?.activeProgramAssignmentId ?? null,
        trainingStatus: training?.trainingStatus ?? 'no_program',
        priorWeekScheduledCount: training?.priorWeekScheduledCount ?? 0,
        priorWeekCompletedCount: training?.priorWeekCompletedCount ?? 0,
        currentWeekCompletedCount: training?.currentWeekCompletedCount ?? 0,
        currentWeekScheduledPastCount: training?.currentWeekScheduledPastCount ?? 0,
        attention: {
          level: verdict.level,
          reasons: verdict.reasons,
        },
        standingNote: noteByClient.get(row.client_id) ?? null,        metrics: metrics ?? {
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

    for (const client of clients) {
      // List card must never show legacy persisted score when no active assignment.
      if (!client.hasActiveProgram) {
        client.athleteScore = null
      }
    }

    if (supabaseServiceKey && supabaseUrl) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      await recomputeStaleAthleteScoresForList(clients, supabaseAdmin)
    }

    return NextResponse.json({ clients })
  } catch (err: unknown) {
    console.error('[coach/clients] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

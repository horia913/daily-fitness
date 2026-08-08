/**
 * GET /api/coach/analytics/overview
 * Query: period=7d|30d|90d|1y (default 30d)
 * Returns analytics overview payload in one response (server-side batched).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getPeriodBounds } from '@/lib/metrics/period'
import { resolveInstanceWeeksForAssignments } from '@/lib/programInstanceResolver'

function getPeriodForParam(period: string) {
  const now = new Date()
  if (period === '7d') return getPeriodBounds('last_7_days', now)
  if (period === '30d') return getPeriodBounds('this_month', now)
  if (period === '90d') {
    const end = new Date(now)
    end.setUTCHours(23, 59, 59, 999)
    const start = new Date(end)
    start.setUTCDate(start.getUTCDate() - 90)
    start.setUTCHours(0, 0, 0, 0)
    return { start: start.toISOString(), end: end.toISOString(), weeksInPeriod: 90 / 7 }
  }
  if (period === '1y') {
    const end = new Date(now)
    const start = new Date(end)
    start.setUTCFullYear(start.getUTCFullYear() - 1)
    return { start: start.toISOString(), end: end.toISOString(), weeksInPeriod: 52 }
  }
  return getPeriodBounds('this_month', now)
}

function shiftPeriodBack(period: { start: string; end: string; weeksInPeriod: number }) {
  const endMs = new Date(period.start).getTime()
  const len = new Date(period.end).getTime() - endMs
  const prevEnd = new Date(endMs)
  const prevStart = new Date(endMs - len)
  return {
    start: prevStart.toISOString(),
    end: prevEnd.toISOString(),
    weeksInPeriod: period.weeksInPeriod,
  }
}

function emptyPayload() {
  return {
    totalClients: 0,
    activeClients: 0,
    newClientsThisPeriod: 0,
    clientRetentionRate: 0,
    overallComplianceRate: 0,
    compliancePeriodDelta: 0,
    avgSessionTime: 0,
    sessionsPerWeek: 0,
    goalsAchieved: 0,
    totalGoals: 0,
    successRate: 0,
    totalWorkouts: 0,
    totalMeals: 0,
    totalHabits: 0,
    personalBests: 0,
    mealsPerWeek: 0,
    prSuccessRate: 0,
    activeProgramCount: 0,
    clientGrowthTrend: 'stable' as const,
    complianceTrend: 'stable' as const,
    engagementTrend: 'stable' as const,
    clientGrowthData: [] as { period: string; newClients: number; churnedClients: number; netGrowth: number }[],
    clientGrowthChartSeries: [] as { label: string; count: number }[],
    clientGrowthQuarterNet: 0,
    clientGrowthShowEmpty: true,
    complianceBreakdown: [] as Array<{
      category: string
      percentage: number
      icon: string
      tracked: boolean
    }>,
    programEffectiveness: [] as Array<{
      programName: string
      programType: string
      successRate: number
      avgProgress: number
      clientCount: number
      weekStatus: string
      color: string
    }>,
    insights: [] as unknown[],
    topClients: [] as Array<{ id: string; name: string; avatar_url?: string | null; compliance: number }>,
    bottomClients: [] as Array<{ id: string; name: string; avatar_url?: string | null; compliance: number }>,
  }
}

function workoutAvgCompliance(
  clientIds: string[],
  workoutLogs: { client_id: string }[],
  assignments: { client_id: string; scheduled_date?: string; assigned_date?: string }[],
  periodStart: string,
  periodEnd: string
) {
  const completedByClient: Record<string, number> = {}
  clientIds.forEach((id) => (completedByClient[id] = 0))
  workoutLogs.forEach((r) => {
    completedByClient[r.client_id] = (completedByClient[r.client_id] || 0) + 1
  })
  const assignedByClient: Record<string, number> = {}
  clientIds.forEach((id) => (assignedByClient[id] = 0))
  assignments.forEach((r) => {
    const d = (r.scheduled_date || r.assigned_date) ?? ''
    if (d >= periodStart && d < periodEnd) assignedByClient[r.client_id] = (assignedByClient[r.client_id] || 0) + 1
  })
  const scores = clientIds.map((cid) => {
    const assigned = assignedByClient[cid] || 0
    const completed = completedByClient[cid] || 0
    return assigned > 0 ? Math.round((completed / assigned) * 100) : 0
  })
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: authError?.message ?? 'Unauthorized' }, { status: 401 })
    }

    const periodParam = request.nextUrl.searchParams.get('period') ?? '30d'
    const period = getPeriodForParam(periodParam)
    const periodStart = period.start.slice(0, 10)
    const periodEnd = period.end.slice(0, 10)
    const prevPeriod = shiftPeriodBack(period)
    const prevStart = prevPeriod.start.slice(0, 10)
    const prevEnd = prevPeriod.end.slice(0, 10)

    const { data: clientsRows, error: clientsError } = await supabase
      .from('clients')
      .select('id, client_id, status, created_at')
      .eq('coach_id', user.id)

    if (clientsError || !clientsRows?.length) {
      return NextResponse.json(emptyPayload())
    }

    const clientIds = clientsRows.map((r) => r.client_id)

    const [
      { data: profiles },
      { data: workoutLogs },
      { data: assignments },
      { data: goalsActive },
      { data: goalsCompleted },
      { count: newClientsCount },
      { data: mealRows },
      { data: habitLogRows },
      { data: prData },
      { data: workoutDurations },
      { data: mealPlanAssign },
      { data: habitAssignRows },
      { data: workoutLogsPrev },
      { data: programAssignRows },
    ] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', clientIds),
      supabase
        .from('workout_logs')
        .select('client_id')
        .in('client_id', clientIds)
        .not('completed_at', 'is', null)
        .gte('completed_at', period.start)
        .lt('completed_at', period.end),
      supabase
        .from('workout_assignments')
        .select('client_id, scheduled_date, assigned_date')
        .in('client_id', clientIds),
      supabase.from('goals').select('id').in('client_id', clientIds).in('status', ['active', 'completed']),
      supabase
        .from('goals')
        .select('id')
        .in('client_id', clientIds)
        .eq('status', 'completed')
        .not('completed_date', 'is', null)
        .gte('completed_date', periodStart)
        .lt('completed_date', periodEnd),
      supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', user.id)
        .gte('created_at', period.start)
        .lt('created_at', period.end),
      supabase
        .from('meal_completions')
        .select('client_id, completed_at')
        .in('client_id', clientIds)
        .gte('completed_at', period.start)
        .lt('completed_at', period.end),
      supabase
        .from('habit_logs')
        .select('client_id, log_date')
        .in('client_id', clientIds)
        .gte('log_date', periodStart)
        .lt('log_date', periodEnd),
      supabase
        .from('personal_records')
        .select('id')
        .in('client_id', clientIds)
        .gte('achieved_at', period.start)
        .lt('achieved_at', period.end),
      supabase
        .from('workout_logs')
        .select('total_duration_minutes')
        .in('client_id', clientIds)
        .not('completed_at', 'is', null)
        .not('total_duration_minutes', 'is', null)
        .gte('completed_at', period.start)
        .lt('completed_at', period.end),
      supabase
        .from('meal_plan_assignments')
        .select('client_id')
        .in('client_id', clientIds)
        .eq('is_active', true),
      supabase.from('habits').select('client_id').in('client_id', clientIds).eq('is_active', true),
      supabase
        .from('workout_logs')
        .select('client_id')
        .in('client_id', clientIds)
        .not('completed_at', 'is', null)
        .gte('completed_at', prevPeriod.start)
        .lt('completed_at', prevPeriod.end),
      supabase
        .from('program_assignments')
        .select(
          'id, client_id, program_id, name, start_date, status, pause_status, paused_at, pause_accumulated_days, timezone_snapshot, updated_at'
        )
        .in('client_id', clientIds)
        .eq('status', 'active')
        .order('updated_at', { ascending: false }),
    ])

    const wl = (workoutLogs || []) as { client_id: string }[]
    const asg = (assignments || []) as {
      client_id: string
      scheduled_date?: string
      assigned_date?: string
    }[]
    const avgCompliance = workoutAvgCompliance(clientIds, wl, asg, periodStart, periodEnd)
    const prevAvg = workoutAvgCompliance(
      clientIds,
      (workoutLogsPrev || []) as { client_id: string }[],
      asg,
      prevStart,
      prevEnd
    )
    const compliancePeriodDelta = Math.round((avgCompliance - prevAvg) * 10) / 10

    const totalWorkouts = wl.length
    const totalMeals = mealRows?.length ?? 0
    const totalHabits = habitLogRows?.length ?? 0
    const personalBests = prData?.length ?? 0
    const goalsTotal = goalsActive?.length ?? 0
    const goalsAchievedCount = goalsCompleted?.length ?? 0
    const successRatePercent = goalsTotal > 0 ? Math.round((goalsAchievedCount / goalsTotal) * 100) : 0
    const avgSessionTime = workoutDurations?.length
      ? Math.round(
          (workoutDurations as { total_duration_minutes: number }[]).reduce(
            (s, r) => s + (r.total_duration_minutes ?? 0),
            0
          ) / workoutDurations.length
        )
      : 0
    const sessionsPerWeek =
      period.weeksInPeriod > 0 ? Math.round((totalWorkouts / period.weeksInPeriod) * 10) / 10 : 0
    const newClientsThisPeriod = newClientsCount ?? 0

    const daysInPeriod = Math.max(
      1,
      Math.ceil((new Date(period.end).getTime() - new Date(period.start).getTime()) / (24 * 60 * 60 * 1000))
    )
    const mealsPerWeekRaw = (totalMeals / daysInPeriod) * 7
    const mealsPerWeek = Number.isFinite(mealsPerWeekRaw) ? Math.round(mealsPerWeekRaw * 10) / 10 : 0

    const nutritionClientSet = new Set((mealPlanAssign || []).map((r: { client_id: string }) => r.client_id))
    const habitClientSet = new Set((habitAssignRows || []).map((r: { client_id: string }) => r.client_id))

    const mealByClientDay = new Map<string, Set<string>>()
    for (const row of mealRows || []) {
      const r = row as { client_id: string; completed_at: string }
      const day = new Date(r.completed_at).toISOString().slice(0, 10)
      if (!mealByClientDay.has(r.client_id)) mealByClientDay.set(r.client_id, new Set())
      mealByClientDay.get(r.client_id)!.add(day)
    }
    const habitByClientDay = new Map<string, Set<string>>()
    for (const row of habitLogRows || []) {
      const r = row as { client_id: string; log_date: string }
      if (!habitByClientDay.has(r.client_id)) habitByClientDay.set(r.client_id, new Set())
      habitByClientDay.get(r.client_id)!.add(r.log_date)
    }

    let nutritionPctAgg = 0
    let nutritionN = 0
    for (const cid of nutritionClientSet) {
      const days = mealByClientDay.get(cid)?.size ?? 0
      nutritionPctAgg += Math.min(100, Math.round((days / daysInPeriod) * 100))
      nutritionN += 1
    }
    const nutritionAvg = nutritionN > 0 ? Math.round(nutritionPctAgg / nutritionN) : 0

    let habitPctAgg = 0
    let habitN = 0
    for (const cid of habitClientSet) {
      const days = habitByClientDay.get(cid)?.size ?? 0
      habitPctAgg += Math.min(100, Math.round((days / daysInPeriod) * 100))
      habitN += 1
    }
    const habitAvg = habitN > 0 ? Math.round(habitPctAgg / habitN) : 0

    const rosterHasNutrition = nutritionClientSet.size > 0
    const rosterHasHabits = habitClientSet.size > 0

    const completedByClient: Record<string, number> = {}
    clientIds.forEach((id) => (completedByClient[id] = 0))
    wl.forEach((r) => {
      completedByClient[r.client_id] = (completedByClient[r.client_id] || 0) + 1
    })
    const assignedByClient: Record<string, number> = {}
    clientIds.forEach((id) => (assignedByClient[id] = 0))
    asg.forEach((r) => {
      const d = (r.scheduled_date || r.assigned_date) ?? ''
      if (d >= periodStart && d < periodEnd) assignedByClient[r.client_id] = (assignedByClient[r.client_id] || 0) + 1
    })

    const profileMap = new Map(
      (profiles || []).map((p: { id: string; first_name?: string; last_name?: string; avatar_url?: string }) => [
        p.id,
        p,
      ])
    )
    const clientsWithProfiles = clientsRows.map(
      (client: { id: string; client_id: string; status: string; created_at?: string }) => ({
        ...client,
        profile: profileMap.get(client.client_id),
      })
    )
    const totalClients = clientsWithProfiles.length
    const activeClients = clientsWithProfiles.filter((c) => c.status === 'active').length

    const clientComplianceData = clientsWithProfiles.map((client) => {
      const completed = completedByClient[client.client_id] || 0
      const assigned = assignedByClient[client.client_id] || 0
      const compliance = assigned > 0 ? Math.round((completed / assigned) * 100) : 0
      const firstName = client.profile?.first_name || 'Unknown'
      const lastName = client.profile?.last_name || ''
      const fullName = `${firstName} ${lastName}`.trim() || 'Unknown'
      return {
        id: client.id,
        name: fullName,
        avatar_url: client.profile?.avatar_url,
        compliance,
      }
    })

    const sortedByCompliance = [...clientComplianceData].sort((a, b) => b.compliance - a.compliance)
    const topClients = sortedByCompliance.slice(0, 3)
    const bottomClients = sortedByCompliance.slice(-3).reverse()

    /** 90d cumulative client count chart (weekly-ish buckets) */
    const end90 = new Date()
    end90.setUTCHours(23, 59, 59, 999)
    const start90 = new Date(end90)
    start90.setUTCDate(start90.getUTCDate() - 90)
    start90.setUTCHours(0, 0, 0, 0)
    const buckets = 13
    const clientGrowthChartSeries: { label: string; count: number }[] = []
    for (let i = 1; i <= buckets; i++) {
      const t = new Date(start90.getTime() + (i / buckets) * (end90.getTime() - start90.getTime()))
      const cap = clientsRows.filter(
        (c: { created_at?: string }) => c.created_at && new Date(c.created_at).getTime() <= t.getTime()
      ).length
      clientGrowthChartSeries.push({ label: `w${i}`, count: cap })
    }
    const g0 = clientGrowthChartSeries[0]?.count ?? 0
    const g1 = clientGrowthChartSeries[buckets - 1]?.count ?? 0
    const clientGrowthQuarterNet = g1 - g0

    const earliestMs = Math.min(
      ...clientsRows.map((c: { created_at?: string }) =>
        c.created_at ? new Date(c.created_at).getTime() : Date.now()
      )
    )
    const daysSinceFirst = (Date.now() - earliestMs) / (24 * 60 * 60 * 1000)
    const clientGrowthShowEmpty = totalClients === 0 || daysSinceFirst < 14

    const progRows = (programAssignRows || []) as Array<{
      id: string
      client_id: string
      program_id: string
      name: string | null
      start_date: string | null
      pause_status: string | null
      paused_at: string | null
      pause_accumulated_days: number | null
      timezone_snapshot: string | null
      updated_at?: string
    }>
    const firstAssignByClient = new Map<string, (typeof progRows)[0]>()
    for (const row of progRows) {
      if (!firstAssignByClient.has(row.client_id)) firstAssignByClient.set(row.client_id, row)
    }
    const uniqueAssigns = [...firstAssignByClient.values()]
    const programIds = [...new Set(uniqueAssigns.map((r) => r.program_id).filter(Boolean))]
    const { data: wpRows } = programIds.length
      ? await supabase.from('workout_programs').select('id, name').in('id', programIds)
      : { data: [] as { id: string; name: string }[] }
    const wpName = new Map((wpRows || []).map((p: { id: string; name: string }) => [p.id, p.name]))

    type ProgramAgg = {
      program_id: string
      programName: string
      clients: typeof uniqueAssigns
      pcts: number[]
      weekLabels: string[]
    }
    // Canonical Week X of N (N = sum of instance phases, X = resolver in the
    // client's timezone, clamped to N). Replaces the old UTC computation and the
    // hardcoded duration fallback of 12.
    const weekByAssign = await resolveInstanceWeeksForAssignments(
      supabase,
      uniqueAssigns.map((r) => r.id),
    )

    const byProg = new Map<string, ProgramAgg>()
    for (const row of uniqueAssigns) {
      const pid = row.program_id
      if (!byProg.has(pid)) {
        const pname = row.name?.trim() || wpName.get(pid) || 'Program'
        byProg.set(pid, { program_id: pid, programName: pname, clients: [], pcts: [], weekLabels: [] })
      }
      const g = byProg.get(pid)!
      g.clients.push(row)
      const wk = weekByAssign.get(row.id)
      const week = wk?.currentWeek ?? 1
      const dw = wk?.totalWeeks ?? 0
      const pct = dw > 0 ? Math.min(100, Math.round((week / dw) * 100)) : 0
      g.pcts.push(pct)
      g.weekLabels.push(dw > 0 ? `W${week}/${dw}` : `W${week}`)
    }

    const inferType = (name: string) => {
      const n = name.toLowerCase()
      if (n.includes('hyper')) return 'Hypertrophy'
      if (n.includes('strength')) return 'Strength'
      return 'Program'
    }

    const programEffectiveness = [...byProg.values()]
      .map((g) => {
        const avgProgress = g.pcts.length ? Math.round(g.pcts.reduce((a, b) => a + b, 0) / g.pcts.length) : 0
        const programType = inferType(g.programName)
        return {
          programName: g.programName,
          programType,
          successRate: avgProgress,
          avgProgress,
          clientCount: g.clients.length,
          weekStatus: g.weekLabels[0] ?? '—',
          color: 'bg-[color:var(--fc-accent)]',
        }
      })
      .sort((a, b) => b.clientCount - a.clientCount)
      .slice(0, 5)

    const activeProgramCount = uniqueAssigns.length

    const complianceBreakdown = [
      {
        category: 'Workouts',
        percentage: avgCompliance,
        icon: 'Dumbbell',
        tracked: true,
      },
      {
        category: 'Nutrition',
        percentage: nutritionAvg,
        icon: 'Apple',
        tracked: rosterHasNutrition,
      },
      {
        category: 'Habits',
        percentage: habitAvg,
        icon: 'Heart',
        tracked: rosterHasHabits,
      },
      {
        category: 'Goals',
        percentage: successRatePercent,
        icon: 'Target',
        tracked: true,
      },
    ]

    const prSuccessRate = successRatePercent

    const payload = {
      totalClients,
      activeClients,
      newClientsThisPeriod,
      clientRetentionRate: totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0,
      overallComplianceRate: avgCompliance,
      compliancePeriodDelta,
      avgSessionTime,
      sessionsPerWeek,
      goalsAchieved: goalsAchievedCount,
      totalGoals: goalsTotal,
      successRate: successRatePercent,
      totalWorkouts,
      totalMeals,
      totalHabits,
      personalBests,
      mealsPerWeek,
      prSuccessRate,
      activeProgramCount,
      clientGrowthTrend: (newClientsThisPeriod > 0 ? 'up' : 'stable') as 'up' | 'down' | 'stable',
      complianceTrend: (compliancePeriodDelta > 0 ? 'up' : compliancePeriodDelta < 0 ? 'down' : 'stable') as
        | 'up'
        | 'down'
        | 'stable',
      engagementTrend: (sessionsPerWeek > 0 ? 'up' : 'stable') as 'up' | 'down' | 'stable',
      clientGrowthData: [] as { period: string; newClients: number; churnedClients: number; netGrowth: number }[],
      clientGrowthChartSeries,
      clientGrowthQuarterNet,
      clientGrowthShowEmpty,
      complianceBreakdown,
      programEffectiveness,
      insights: [] as unknown[],
      topClients,
      bottomClients,
    }

    return NextResponse.json(payload)
  } catch (err: unknown) {
    console.error('[coach/analytics/overview] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

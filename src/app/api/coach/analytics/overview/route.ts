/**
 * GET /api/coach/analytics/overview
 * Query: period=7d|30d|90d|1y (default 30d)
 * Returns analytics overview payload in one response (server-side batched).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getPeriodBounds } from '@/lib/metrics/period'

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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: authError?.message ?? 'Unauthorized' }, { status: 401 })
    }

    const periodParam = request.nextUrl.searchParams.get('period') ?? '30d'
    const period = getPeriodForParam(periodParam)
    const periodStart = period.start.slice(0, 10)
    const periodEnd = period.end.slice(0, 10)

    const { data: clientsRows, error: clientsError } = await supabase
      .from('clients')
      .select('id, client_id, status, created_at')
      .eq('coach_id', user.id)

    if (clientsError || !clientsRows?.length) {
      const empty = {
        totalClients: 0,
        activeClients: 0,
        newClientsThisPeriod: 0,
        clientRetentionRate: 0,
        overallComplianceRate: 0,
        avgSessionTime: 0,
        sessionsPerWeek: 0,
        goalsAchieved: 0,
        totalGoals: 0,
        successRate: 0,
        totalWorkouts: 0,
        totalMeals: 0,
        totalHabits: 0,
        personalBests: 0,
        clientGrowthTrend: 'stable' as const,
        complianceTrend: 'stable' as const,
        engagementTrend: 'stable' as const,
        clientGrowthData: [],
        complianceBreakdown: [],
        programEffectiveness: [],
        insights: [],
        topClients: [],
        bottomClients: [],
      }
      return NextResponse.json(empty)
    }

    const clientIds = clientsRows.map((r) => r.client_id)

    const [
      { data: profiles },
      { data: workoutLogs },
      { data: assignments },
      { data: goalsActive },
      { data: goalsCompleted },
      { count: newClientsCount },
      { data: mealData },
      { data: habitData },
      { data: prData },
      { data: workoutDurations },
    ] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', clientIds),
      supabase.from('workout_logs').select('client_id').in('client_id', clientIds).not('completed_at', 'is', null).gte('completed_at', period.start).lt('completed_at', period.end),
      supabase.from('workout_assignments').select('client_id, scheduled_date, assigned_date').in('client_id', clientIds),
      supabase.from('goals').select('id').in('client_id', clientIds).in('status', ['active', 'completed']),
      supabase.from('goals').select('id').in('client_id', clientIds).eq('status', 'completed').not('completed_date', 'is', null).gte('completed_date', periodStart).lt('completed_date', periodEnd),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('coach_id', user.id).gte('created_at', period.start).lt('created_at', period.end),
      supabase.from('meal_completions').select('id').in('client_id', clientIds).gte('completed_at', period.start).lt('completed_at', period.end),
      supabase.from('habit_logs').select('id').in('client_id', clientIds).gte('logged_at', period.start).lt('logged_at', period.end),
      supabase.from('personal_records').select('id').in('client_id', clientIds).gte('achieved_at', period.start).lt('achieved_at', period.end),
      supabase.from('workout_logs').select('total_duration_minutes').in('client_id', clientIds).not('completed_at', 'is', null).not('total_duration_minutes', 'is', null).gte('completed_at', period.start).lt('completed_at', period.end),
    ])

    const totalWorkouts = workoutLogs?.length ?? 0
    const totalMeals = mealData?.length ?? 0
    const totalHabits = habitData?.length ?? 0
    const personalBests = prData?.length ?? 0
    const goalsTotal = goalsActive?.length ?? 0
    const goalsAchievedCount = goalsCompleted?.length ?? 0
    const successRatePercent = goalsTotal > 0 ? Math.round((goalsAchievedCount / goalsTotal) * 100) : 0
    const avgSessionTime = workoutDurations?.length ? Math.round((workoutDurations as { total_duration_minutes: number }[]).reduce((s, r) => s + (r.total_duration_minutes ?? 0), 0) / workoutDurations.length) : 0
    const sessionsPerWeek = period.weeksInPeriod > 0 ? Math.round((totalWorkouts / period.weeksInPeriod) * 10) / 10 : 0
    const newClientsThisPeriod = newClientsCount ?? 0

    const completedByClient: Record<string, number> = {}
    clientIds.forEach((id) => (completedByClient[id] = 0))
    ;(workoutLogs || []).forEach((r: { client_id: string }) => {
      completedByClient[r.client_id] = (completedByClient[r.client_id] || 0) + 1
    })
    const assignedByClient: Record<string, number> = {}
    clientIds.forEach((id) => (assignedByClient[id] = 0))
    ;(assignments || []).forEach((r: { client_id: string; scheduled_date?: string; assigned_date?: string }) => {
      const d = (r.scheduled_date || r.assigned_date) ?? ''
      if (d >= periodStart && d < periodEnd) assignedByClient[r.client_id] = (assignedByClient[r.client_id] || 0) + 1
    })

    const profileMap = new Map((profiles || []).map((p: { id: string; first_name?: string; last_name?: string; avatar_url?: string }) => [p.id, p]))
    const clientsWithProfiles = clientsRows.map((client: { id: string; client_id: string; status: string; created_at?: string }) => ({
      ...client,
      profile: profileMap.get(client.client_id),
    }))
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
    const topClients = sortedByCompliance.slice(0, 5)
    const bottomClients = sortedByCompliance.slice(-5).reverse()
    const avgCompliance = clientComplianceData.length > 0 ? Math.round(clientComplianceData.reduce((sum, c) => sum + c.compliance, 0) / clientComplianceData.length) : 0

    const payload = {
      totalClients,
      activeClients,
      newClientsThisPeriod,
      clientRetentionRate: totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0,
      overallComplianceRate: avgCompliance,
      avgSessionTime,
      sessionsPerWeek,
      goalsAchieved: goalsAchievedCount,
      totalGoals: goalsTotal,
      successRate: successRatePercent,
      totalWorkouts,
      totalMeals,
      totalHabits,
      personalBests,
      clientGrowthTrend: (newClientsThisPeriod > 0 ? 'up' : 'stable') as 'up' | 'down' | 'stable',
      complianceTrend: 'stable' as const,
      engagementTrend: (sessionsPerWeek > 0 ? 'up' : 'stable') as 'up' | 'down' | 'stable',
      clientGrowthData: [],
      complianceBreakdown: [
        { category: 'Workouts', percentage: avgCompliance, color: 'bg-[color:var(--fc-domain-workouts)]', icon: 'Dumbbell' },
        { category: 'Nutrition', percentage: 0, color: 'bg-[color:var(--fc-domain-meals)]', icon: 'Apple' },
        { category: 'Habits', percentage: 0, color: 'bg-[color:var(--fc-domain-habits)]', icon: 'Heart' },
        { category: 'Goals', percentage: successRatePercent, color: 'bg-[color:var(--fc-status-warning)]', icon: 'Target' },
      ],
      programEffectiveness: [],
      insights: [],
      topClients,
      bottomClients,
    }

    console.log('[Coach analytics overview] network calls done')
    return NextResponse.json(payload)
  } catch (err: unknown) {
    console.error('[coach/analytics/overview] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

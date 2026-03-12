import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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

    // Load coach's clients
    const { data: clientsRows, error: clientsError } = await supabase
      .from('clients')
      .select('id, client_id, status')
      .eq('coach_id', user.id)

    if (clientsError || !clientsRows || clientsRows.length === 0) {
      const emptyWorkoutStats = {
        totalSessions: 0,
        completedSessions: 0,
        thisWeek: 0,
        thisMonth: 0,
        averageCompletionRate: 0,
      }
      const emptyWellness = {
        checkedInToday: 0,
        totalClients: 0,
        averageEnergy: 0,
        highStressCount: 0,
        highStressClients: [] as any[],
        inactiveClients: [] as any[],
      }
      return NextResponse.json({
        clientProgress: [],
        workoutStats: emptyWorkoutStats,
        wellnessOverview: emptyWellness,
      })
    }

    const clientIds = clientsRows.map((c) => c.client_id)

    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      { data: profiles },
      { data: wellnessLogs },
      { data: workoutLogs },
      { data: assignments },
      { data: programs },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', clientIds),
      supabase
        .from('daily_wellness_logs')
        .select('client_id, log_date, energy_level, stress_level')
        .in('client_id', clientIds),
      supabase
        .from('workout_logs')
        .select('client_id, completed_at')
        .in('client_id', clientIds)
        .not('completed_at', 'is', null),
      supabase
        .from('workout_assignments')
        .select('client_id')
        .in('client_id', clientIds),
      supabase
        .from('program_assignments')
        .select('client_id, total_days, duration_weeks, status')
        .in('client_id', clientIds)
        .eq('status', 'active'),
    ])

    const profileMap = new Map<
      string,
      { id: string; first_name?: string | null; last_name?: string | null }
    >((profiles || []).map((p) => [p.id, p]))

    const wellnessByClient: Record<string, any[]> = {}
    ;(wellnessLogs || []).forEach((row: any) => {
      if (!wellnessByClient[row.client_id]) wellnessByClient[row.client_id] = []
      wellnessByClient[row.client_id].push(row)
    })

    const workoutsByClient: Record<string, any[]> = {}
    ;(workoutLogs || []).forEach((row: any) => {
      if (!workoutsByClient[row.client_id]) workoutsByClient[row.client_id] = []
      workoutsByClient[row.client_id].push(row)
    })

    const assignmentsByClient: Record<string, number> = {}
    ;(assignments || []).forEach((row: any) => {
      const id = row.client_id
      assignmentsByClient[id] = (assignmentsByClient[id] || 0) + 1
    })

    const programByClient: Record<
      string,
      { total_days: number | null; duration_weeks: number | null }
    > = {}
    ;(programs || []).forEach(
      (row: { client_id: string; total_days: number | null; duration_weeks: number | null }) => {
        if (!programByClient[row.client_id]) {
          programByClient[row.client_id] = {
            total_days: row.total_days,
            duration_weeks: row.duration_weeks,
          }
        }
      }
    )

    const checkedInToday: string[] = []
    const energyValues: number[] = []
    const highStressClients: Array<{ id: string; name: string; stress: number }> = []
    const inactiveClients: Array<{ id: string; name: string; daysSince: number }> = []

    const clientProgress: Array<{
      id: string
      name: string
      totalWorkouts: number
      thisWeek: number
      thisMonth: number
      streak: number
      completionRate: number
      lastWorkout: string
      adherence: number
    }> = []

    for (const client of clientsRows) {
      const clientId = client.client_id
      const profile = profileMap.get(clientId)
      if (!profile) continue
      const clientName =
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown'

      const clientWellness = wellnessByClient[clientId] || []
      const todaysLog = clientWellness.find((row) => row.log_date === today)
      if (todaysLog) {
        checkedInToday.push(clientId)
        if (todaysLog.energy_level != null) {
          energyValues.push(todaysLog.energy_level)
        }
        if (todaysLog.stress_level != null && todaysLog.stress_level > 7) {
          highStressClients.push({
            id: clientId,
            name: clientName,
            stress: todaysLog.stress_level,
          })
        }
      }

      if (clientWellness.length > 0) {
        const latest = clientWellness
          .map((row) => row.log_date as string)
          .sort()
          .pop()
        if (latest) {
          const lastDate = new Date(latest + 'T12:00:00')
          const todayDate = new Date(today + 'T12:00:00')
          const daysSince = Math.floor(
            (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          if (daysSince >= 3) {
            inactiveClients.push({ id: clientId, name: clientName, daysSince })
          }
        }
      } else {
        inactiveClients.push({ id: clientId, name: clientName, daysSince: 999 })
      }

      const completedWorkouts = (workoutsByClient[clientId] || []).filter(
        (row) => row.completed_at
      )
      completedWorkouts.sort((a, b) =>
        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      )

      const thisWeekWorkouts = completedWorkouts.filter(
        (row) => new Date(row.completed_at) >= weekStart
      )
      const thisMonthWorkouts = completedWorkouts.filter(
        (row) => new Date(row.completed_at) >= monthStart
      )

      const uniqueDates = Array.from(
        new Set(
          completedWorkouts.map((row) =>
            new Date(row.completed_at).toISOString().split('T')[0]
          )
        )
      ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

      let streak = 0
      if (uniqueDates.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0]
        const yesterdayStr = new Date(Date.now() - 86400000)
          .toISOString()
          .split('T')[0]
        if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
          streak = 1
          let expected = new Date(uniqueDates[0])
          for (let i = 1; i < uniqueDates.length; i++) {
            expected.setDate(expected.getDate() - 1)
            const expectedStr = expected.toISOString().split('T')[0]
            if (uniqueDates[i] === expectedStr) {
              streak++
            } else {
              break
            }
          }
        }
      }

      const assignedCount = assignmentsByClient[clientId] || 0
      const completionRate =
        assignedCount > 0
          ? Math.round((completedWorkouts.length / assignedCount) * 100)
          : 0

      let adherence = 0
      const program = programByClient[clientId]
      if (
        program &&
        program.total_days != null &&
        program.total_days > 0 &&
        program.duration_weeks != null &&
        program.duration_weeks > 0
      ) {
        const weeklyGoal = program.total_days / program.duration_weeks
        const expectedThisMonth = weeklyGoal * 4
        adherence =
          expectedThisMonth > 0
            ? Math.min(
                100,
                Math.round((thisMonthWorkouts.length / expectedThisMonth) * 100)
              )
            : 0
      }

      const lastWorkout = completedWorkouts[0]?.completed_at || ''

      clientProgress.push({
        id: clientId,
        name: clientName,
        totalWorkouts: completedWorkouts.length,
        thisWeek: thisWeekWorkouts.length,
        thisMonth: thisMonthWorkouts.length,
        streak,
        completionRate,
        lastWorkout,
        adherence,
      })
    }

    const averageEnergy =
      energyValues.length > 0
        ? Math.round(
            (energyValues.reduce((sum, val) => sum + val, 0) / energyValues.length) * 10
          ) / 10
        : null

    const wellnessOverview = {
      checkedInToday: checkedInToday.length,
      totalClients: clientsRows.length,
      averageEnergy, // null when no data (do not show 0 for missing legacy energy_level)
      highStressCount: highStressClients.length,
      highStressClients,
      inactiveClients: inactiveClients.slice(0, 10),
    }

    const totalSessions = clientProgress.reduce(
      (sum, c) => sum + c.totalWorkouts,
      0
    )
    const thisWeekTotal = clientProgress.reduce(
      (sum, c) => sum + c.thisWeek,
      0
    )
    const thisMonthTotal = clientProgress.reduce(
      (sum, c) => sum + c.thisMonth,
      0
    )
    const avgCompletionRate =
      clientProgress.length > 0
        ? Math.round(
            clientProgress.reduce((sum, c) => sum + c.completionRate, 0) /
              clientProgress.length
          )
        : 0

    const workoutStats = {
      totalSessions,
      completedSessions: totalSessions,
      thisWeek: thisWeekTotal,
      thisMonth: thisMonthTotal,
      averageCompletionRate: avgCompletionRate,
    }

    return NextResponse.json({
      clientProgress,
      workoutStats,
      wellnessOverview,
    })
  } catch (err: unknown) {
    console.error('[coach/progress/overview] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}


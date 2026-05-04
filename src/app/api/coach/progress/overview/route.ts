import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { computeCurrentProgramWeekForAssignment } from '@/lib/programWeekCalendar'
import { dbToUiScale } from '@/lib/wellnessService'

const DEFAULT_CLIENT_TZ = 'Europe/Bucharest'

type ActiveProgramAssignment = {
  id: string
  client_id: string
  program_id: string
  start_date: string | null
  duration_weeks: number | null
  pause_accumulated_days: number | null
  pause_status: string | null
  paused_at: string | null
  timezone_snapshot: string | null
}

type Period = 'week' | 'month'

/**
 * Returns ISO timestamp at the start of the given period (Mon 00:00 local for "week",
 * 1st of current month at 00:00 local for "month") in coach-local time.
 *
 * Note: "local" here is the server's local time. We don't have the coach's tz reliably
 * from the request, so we use the server tz. This matches existing behaviour.
 */
function periodStart(period: Period, now: Date): Date {
  if (period === 'week') {
    const d = new Date(now)
    const dow = d.getDay() // 0 = Sun
    const diffToMonday = (dow + 6) % 7 // Mon -> 0, Tue -> 1 ... Sun -> 6
    d.setDate(d.getDate() - diffToMonday)
    d.setHours(0, 0, 0, 0)
    return d
  }
  const d = new Date(now.getFullYear(), now.getMonth(), 1)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Mon 00:00 local of current week. */
function currentMondayStart(now: Date): Date {
  return periodStart('week', now)
}

export async function GET(req: NextRequest) {
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

    const url = new URL(req.url)
    const periodParam = (url.searchParams.get('period') || 'month').toLowerCase()
    const period: Period = periodParam === 'week' ? 'week' : 'month'

    // Load coach's clients
    const { data: clientsRows, error: clientsError } = await supabase
      .from('clients')
      .select('id, client_id, status')
      .eq('coach_id', user.id)

    if (clientsError || !clientsRows || clientsRows.length === 0) {
      return NextResponse.json({
        period,
        totals: {
          activeClients: 0,
          completedWorkouts: 0,
          avgAdherence: 0,
          checkinsThisWeek: 0,
        },
        actionQueue: {
          needAttention: [],
          inactiveCheckIns: [],
          flagged: [],
        },
        wellness: {
          checkedInToday: 0,
          totalClients: 0,
          averageEnergy: null,
        },
        clientProgress: [],
      })
    }

    const clientIds = clientsRows.map((c) => c.client_id)

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const periodStartDate = periodStart(period, now)
    const mondayStartDate = currentMondayStart(now)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      { data: profiles },
      { data: wellnessLogs },
      { data: workoutLogs },
      { data: programAssignmentsRows },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, first_name, last_name, timezone, avatar_url')
        .in('id', clientIds),
      supabase
        .from('daily_wellness_logs')
        .select('client_id, log_date, energy_level, stress_level, created_at')
        .in('client_id', clientIds),
      supabase
        .from('workout_logs')
        .select('client_id, completed_at')
        .in('client_id', clientIds)
        .not('completed_at', 'is', null),
      supabase
        .from('program_assignments')
        .select(
          'id, client_id, program_id, start_date, duration_weeks, pause_accumulated_days, pause_status, paused_at, timezone_snapshot, status, updated_at'
        )
        .in('client_id', clientIds)
        .eq('status', 'active')
        .order('updated_at', { ascending: false }),
    ])

    type ProfileRow = {
      id: string
      first_name?: string | null
      last_name?: string | null
      timezone?: string | null
      avatar_url?: string | null
    }
    const profileMap = new Map<string, ProfileRow>(
      (profiles || []).map((p) => [p.id, p as ProfileRow])
    )

    type WellnessRow = {
      client_id: string
      log_date: string
      energy_level: number | null
      stress_level: number | null
      created_at: string | null
    }
    const wellnessByClient: Record<string, WellnessRow[]> = {}
    ;(wellnessLogs || []).forEach((row) => {
      const r = row as WellnessRow
      if (!wellnessByClient[r.client_id]) wellnessByClient[r.client_id] = []
      wellnessByClient[r.client_id].push(r)
    })

    type WorkoutRow = { client_id: string; completed_at: string }
    const workoutsByClient: Record<string, WorkoutRow[]> = {}
    ;(workoutLogs || []).forEach((row) => {
      const r = row as WorkoutRow
      if (!workoutsByClient[r.client_id]) workoutsByClient[r.client_id] = []
      workoutsByClient[r.client_id].push(r)
    })

    /** One active assignment per client (most recently updated). */
    const assignmentByClientId = new Map<string, ActiveProgramAssignment>()
    for (const row of programAssignmentsRows || []) {
      const cid = (row as ActiveProgramAssignment).client_id
      if (!assignmentByClientId.has(cid)) {
        assignmentByClientId.set(cid, row as ActiveProgramAssignment)
      }
    }

    type WeekTarget = {
      clientId: string
      assignmentId: string
      programId: string
      weekNum: number
    }
    const weekTargets: WeekTarget[] = []
    for (const [clientId, pa] of assignmentByClientId) {
      const prof = profileMap.get(clientId)
      const tzFallback =
        prof?.timezone && String(prof.timezone).trim().length > 0
          ? String(prof.timezone).trim()
          : DEFAULT_CLIENT_TZ
      const { week: weekNum } = computeCurrentProgramWeekForAssignment(
        {
          start_date: pa.start_date ?? null,
          duration_weeks: pa.duration_weeks ?? null,
          pause_accumulated_days: pa.pause_accumulated_days ?? 0,
          pause_status: pa.pause_status ?? null,
          paused_at: pa.paused_at ?? null,
          timezone_snapshot: pa.timezone_snapshot ?? null,
        },
        tzFallback
      )
      weekTargets.push({
        clientId,
        assignmentId: pa.id,
        programId: pa.program_id,
        weekNum,
      })
    }

    const uniqueProgramIds = [...new Set(weekTargets.map((t) => t.programId))]
    const assignmentIds = weekTargets.map((t) => t.assignmentId)

    let scheduleRows: Array<{
      id: string
      program_id: string
      week_number: number
      is_optional?: boolean | null
    }> = []
    let completionRows: Array<{
      program_assignment_id: string
      program_schedule_id: string
      notes?: string | null
    }> = []

    if (uniqueProgramIds.length > 0 && assignmentIds.length > 0) {
      const [schedRes, compRes] = await Promise.all([
        supabase
          .from('program_schedule')
          .select('id, program_id, week_number, is_optional, day_of_week')
          .in('program_id', uniqueProgramIds),
        supabase
          .from('program_day_completions')
          .select('program_assignment_id, program_schedule_id, notes')
          .in('program_assignment_id', assignmentIds),
      ])
      scheduleRows = (schedRes.data ?? []) as typeof scheduleRows
      completionRows = (compRes.data ?? []) as typeof completionRows
    }

    /**
     * CANONICAL adherence: program-week required slots vs program_day_completions.
     * Mirrors /coach/clients/[id]/progress (OptimizedAdherenceTracking) and
     * /api/coach/analytics/adherence.
     *
     * Clamp the effective week to the maximum authored week so an over-running
     * assignment (e.g. duration_weeks = null) doesn't return 0 required slots.
     */
    const maxWeekByProgram = new Map<string, number>()
    for (const s of scheduleRows) {
      const cur = maxWeekByProgram.get(s.program_id) ?? 0
      if (s.week_number > cur) maxWeekByProgram.set(s.program_id, s.week_number)
    }

    const adherenceByClientId = new Map<string, number>()
    for (const t of weekTargets) {
      const maxAuthored = maxWeekByProgram.get(t.programId) ?? t.weekNum
      const effectiveWeek = Math.min(t.weekNum, maxAuthored)
      const requiredScheduleIds = new Set(
        scheduleRows
          .filter(
            (s) =>
              s.program_id === t.programId &&
              s.week_number === effectiveWeek &&
              !s.is_optional
          )
          .map((s) => s.id)
      )
      const assigned = requiredScheduleIds.size
      const completedForWeek = completionRows.filter(
        (c) =>
          c.program_assignment_id === t.assignmentId &&
          requiredScheduleIds.has(c.program_schedule_id) &&
          !String(c.notes ?? '').startsWith('Skipped by coach')
      )
      const completedRequired = completedForWeek.length
      const completed = Math.min(assigned, completedRequired)
      const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0
      adherenceByClientId.set(t.clientId, pct)
    }

    type ClientRecord = {
      id: string
      name: string
      avatarUrl: string | null
      adherence: number
      lastActiveAt: string | null
      lastWellnessDate: string | null // YYYY-MM-DD or null
      mostRecentWellness: WellnessRow | null
      hasActiveProgram: boolean
    }
    const clientRecords: ClientRecord[] = []

    let checkedInTodayCount = 0
    let checkinsThisWeekCount = 0
    let completedWorkoutsInPeriod = 0
    const energyValuesToday: number[] = []

    for (const client of clientsRows) {
      const clientId = client.client_id
      const profile = profileMap.get(clientId)
      if (!profile) continue
      const clientName =
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
        'Unknown'

      const wellness = wellnessByClient[clientId] || []
      const sortedWellness = [...wellness].sort((a, b) =>
        a.log_date < b.log_date ? 1 : a.log_date > b.log_date ? -1 : 0
      )
      const mostRecentWellness = sortedWellness[0] ?? null
      const todaysLog = sortedWellness.find((w) => w.log_date === today) ?? null

      if (todaysLog) {
        checkedInTodayCount++
        if (todaysLog.energy_level != null) {
          energyValuesToday.push(todaysLog.energy_level)
        }
      }

      // Weekly check-in count: log_date >= this Monday.
      for (const w of sortedWellness) {
        const d = new Date(w.log_date + 'T00:00:00')
        if (d >= mondayStartDate) checkinsThisWeekCount++
      }

      // Period-bounded completed workouts
      const wls = workoutsByClient[clientId] || []
      const completedInPeriod = wls.filter((row) => {
        const t = new Date(row.completed_at).getTime()
        return Number.isFinite(t) && t >= periodStartDate.getTime()
      })
      completedWorkoutsInPeriod += completedInPeriod.length

      const latestWorkoutAt = wls.reduce<string | null>((acc, row) => {
        if (!row.completed_at) return acc
        if (!acc) return row.completed_at
        return new Date(row.completed_at) > new Date(acc) ? row.completed_at : acc
      }, null)

      const lastWellnessDate = mostRecentWellness?.log_date ?? null
      // Use most recent of latest workout or most recent wellness log
      let lastActiveAt: string | null = latestWorkoutAt
      if (lastWellnessDate) {
        const wellnessIso = new Date(lastWellnessDate + 'T12:00:00').toISOString()
        if (!lastActiveAt || new Date(wellnessIso) > new Date(lastActiveAt)) {
          lastActiveAt = wellnessIso
        }
      }

      const adherence = adherenceByClientId.get(clientId) ?? 0
      const hasActiveProgram = assignmentByClientId.has(clientId)

      clientRecords.push({
        id: clientId,
        name: clientName,
        avatarUrl: profile.avatar_url ?? null,
        adherence,
        lastActiveAt,
        lastWellnessDate,
        mostRecentWellness,
        hasActiveProgram,
      })
    }

    // ---- Action Queue ------------------------------------------------------
    const NEED_ATTENTION_THRESHOLD = 60

    /** Need Attention: only clients with an active program; canonical adherence < 60%. */
    const needAttention = clientRecords
      .filter((c) => c.hasActiveProgram && c.adherence < NEED_ATTENTION_THRESHOLD)
      .sort((a, b) => a.adherence - b.adherence)
      .map((c) => ({
        id: c.id,
        name: c.name,
        avatarUrl: c.avatarUrl,
        adherence: c.adherence,
        lastActiveAt: c.lastActiveAt,
      }))

    /** Inactive Check-ins: no daily_wellness_logs in last 7 days. */
    const inactiveCheckIns = clientRecords
      .filter((c) => {
        if (!c.lastWellnessDate) return true
        const d = new Date(c.lastWellnessDate + 'T12:00:00')
        return d < sevenDaysAgo
      })
      .map((c) => {
        let daysSince: number | null = null
        if (c.lastWellnessDate) {
          const d = new Date(c.lastWellnessDate + 'T12:00:00')
          const todayDate = new Date(today + 'T12:00:00')
          daysSince = Math.max(
            0,
            Math.floor(
              (todayDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
            )
          )
        }
        return {
          id: c.id,
          name: c.name,
          avatarUrl: c.avatarUrl,
          daysSince, // null = never
          lastWellnessDate: c.lastWellnessDate,
        }
      })
      .sort((a, b) => {
        // Never first, then largest gap first
        const av = a.daysSince ?? Number.POSITIVE_INFINITY
        const bv = b.daysSince ?? Number.POSITIVE_INFINITY
        return bv - av
      })

    /**
     * Flagged: most recent daily_wellness_logs row shows stress_level
     * (UI scale 1-5) >= 4 AND is recent (within the last 14 days).
     * Stress is stored on a 1-10 DB scale and mapped to 1-5 via dbToUiScale.
     */
    type FlaggedEntry = {
      id: string
      name: string
      avatarUrl: string | null
      signal: string
      logDate: string
      daysSince: number
      stressUi: number | null
    }
    const flagged: FlaggedEntry[] = []
    for (const c of clientRecords) {
      const log = c.mostRecentWellness
      if (!log) continue
      const stressUi = log.stress_level != null ? dbToUiScale(log.stress_level) : null
      const isHighStress = stressUi != null && stressUi >= 4
      if (!isHighStress) continue

      const todayDate = new Date(today + 'T12:00:00')
      const logDay = new Date(log.log_date + 'T12:00:00')
      const daysSince = Math.max(
        0,
        Math.floor(
          (todayDate.getTime() - logDay.getTime()) / (1000 * 60 * 60 * 24)
        )
      )
      // Recency cap: stale stress signals stay in "Inactive Check-ins", not here.
      if (daysSince > 14) continue

      const signals: string[] = []
      if (isHighStress && stressUi != null) signals.push(`Stress ${stressUi}/5`)
      const whenLabel =
        daysSince === 0
          ? 'today'
          : daysSince === 1
            ? '1 day ago'
            : `${daysSince} days ago`

      flagged.push({
        id: c.id,
        name: c.name,
        avatarUrl: c.avatarUrl,
        signal: `${signals.join(' · ')}, ${whenLabel}`,
        logDate: log.log_date,
        daysSince,
        stressUi,
      })
    }
    flagged.sort((a, b) => a.daysSince - b.daysSince)

    // ---- Totals ------------------------------------------------------------
    const activeClients = clientRecords.length
    const adherenceVals = clientRecords
      .filter((c) => c.hasActiveProgram)
      .map((c) => c.adherence)
    const avgAdherence =
      adherenceVals.length > 0
        ? Math.round(
            adherenceVals.reduce((s, v) => s + v, 0) / adherenceVals.length
          )
        : 0

    // ---- Wellness summary --------------------------------------------------
    const averageEnergy =
      energyValuesToday.length > 0
        ? Math.round(
            (energyValuesToday.reduce((s, v) => s + v, 0) /
              energyValuesToday.length) *
              10
          ) / 10
        : null

    return NextResponse.json({
      period,
      totals: {
        activeClients,
        completedWorkouts: completedWorkoutsInPeriod,
        avgAdherence,
        checkinsThisWeek: checkinsThisWeekCount,
      },
      actionQueue: {
        needAttention,
        inactiveCheckIns,
        flagged,
      },
      wellness: {
        checkedInToday: checkedInTodayCount,
        totalClients: clientsRows.length,
        averageEnergy,
      },
      // Kept for any downstream readers; the page itself derives KPIs from `totals`.
      clientProgress: clientRecords.map((c) => ({
        id: c.id,
        name: c.name,
        adherence: c.adherence,
        lastActiveAt: c.lastActiveAt,
      })),
    })
  } catch (err: unknown) {
    console.error('[coach/progress/overview] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

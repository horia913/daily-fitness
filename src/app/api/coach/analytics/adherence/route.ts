/**
 * GET /api/coach/analytics/adherence
 * Query: period=week|month|quarter (default week)
 * Returns raw data for adherence computation in one response.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { computeCurrentProgramWeekForAssignment } from '@/lib/programWeekCalendar'
import {
  addCalendarDaysYmd,
  mondayYmdOfZonedWeekContaining,
  zonedCalendarDateString,
  zonedYmdFromIsoTimestamp,
} from '@/lib/clientZonedCalendar'
import {
  computeHabitsWeekFromTemplates,
  parseHabitsJoinedRows,
  type HabitLogRowLite,
} from '@/lib/coachHabitsAdherence'
import type { WellnessLogDay } from '@/lib/habitAutoTracking'

type MealPlanAssignmentRow = {
  id: string
  client_id: string
  meal_plan_id: string
  start_date: string
  end_date: string | null
  is_active: boolean | null
}

type MealRow = { id: string; meal_plan_id: string }

type MealCompletionRow = {
  client_id: string
  meal_id: string
  completed_at: string
  date: string | null
}

type NutritionDayStripCell = {
  day_of_week: number
  has_slot: boolean
  done: boolean
  completed: number
  expected: number
}

type HabitDayStripCell = NutritionDayStripCell

function pickActiveMealPlanAssignment(
  rows: MealPlanAssignmentRow[],
  clientId: string,
  dayYmd: string
): MealPlanAssignmentRow | null {
  const matches = rows.filter(
    (a) =>
      a.client_id === clientId &&
      a.is_active === true &&
      a.start_date <= dayYmd &&
      (a.end_date == null || a.end_date >= dayYmd)
  )
  if (matches.length === 0) return null
  matches.sort((a, b) => b.start_date.localeCompare(a.start_date))
  return matches[0] ?? null
}

function completionLogYmd(row: MealCompletionRow, clientTz: string): string {
  if (row.date && /^\d{4}-\d{2}-\d{2}$/.test(row.date)) return row.date
  return zonedYmdFromIsoTimestamp(row.completed_at, clientTz)
}

function computeNutritionWeek(
  clientId: string,
  weekStartMonYmd: string,
  clientTz: string,
  mpAssignments: MealPlanAssignmentRow[],
  mealsByPlanId: Map<string, Set<string>>,
  completions: MealCompletionRow[]
): {
  nutrition_adherence: number
  nutrition_assigned_required: number
  nutrition_completed_required: number
  nutrition_day_strip: NutritionDayStripCell[]
  /** null when no expected meals in the week */
  nutrition_week_score: number | null
} {
  let sumExpected = 0
  let sumCompletedCapped = 0
  const strip: NutritionDayStripCell[] = []

  for (let dow = 0; dow < 7; dow++) {
    const ymd = addCalendarDaysYmd(weekStartMonYmd, dow)
    const assignment = pickActiveMealPlanAssignment(mpAssignments, clientId, ymd)
    const mealIds = assignment ? mealsByPlanId.get(assignment.meal_plan_id) : null
    const expected = mealIds?.size ?? 0
    let completed = 0
    if (assignment && mealIds && mealIds.size > 0) {
      for (const c of completions) {
        if (c.client_id !== clientId) continue
        if (!mealIds.has(c.meal_id)) continue
        if (completionLogYmd(c, clientTz) !== ymd) continue
        completed += 1
      }
    }
    const has_slot = expected > 0
    const capped = Math.min(completed, expected)
    const done = has_slot && completed >= expected
    sumExpected += expected
    sumCompletedCapped += capped
    strip.push({
      day_of_week: dow,
      has_slot,
      done,
      completed,
      expected,
    })
  }

  const nutrition_week_score =
    sumExpected > 0 ? Math.round((sumCompletedCapped / sumExpected) * 100) : null
  const nutrition_adherence = nutrition_week_score ?? 0

  return {
    nutrition_adherence,
    nutrition_assigned_required: sumExpected,
    nutrition_completed_required: sumCompletedCapped,
    nutrition_day_strip: strip,
    nutrition_week_score,
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: authError?.message ?? 'Unauthorized' }, { status: 401 })
    }

    const period = request.nextUrl.searchParams.get('period') ?? 'week'
    const trendWeeksRaw = Number(request.nextUrl.searchParams.get('trend_weeks') ?? '8')
    const trendWeeks = Math.min(12, Math.max(1, Number.isFinite(trendWeeksRaw) ? trendWeeksRaw : 8))
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const daysAgo = period === 'week' ? 7 : period === 'month' ? 30 : 90
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - daysAgo)
    const sevenDaysAgoStr = startDate.toISOString().split('T')[0]
    const trendStartDate = new Date(now)
    trendStartDate.setDate(trendStartDate.getDate() - trendWeeks * 7)
    const trendStartStr = trendStartDate.toISOString().split('T')[0]

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
        nutritionTrackedIds: [],
        habitTrackedIds: [],
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
      { data: programAssignmentsRows },
      { data: nutritionAssignmentsData },
      { data: nutritionGoalsData },
      { data: habitsJoinedData },
      { data: mealPlanAssignmentsFull },
    ] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, avatar_url, timezone').in('id', clientIds),
      supabase.from('workout_assignments').select('id, client_id, scheduled_date, status').in('client_id', clientIds).gte('scheduled_date', sevenDaysAgoStr).lte('scheduled_date', todayStr),
      supabase.from('workout_logs').select('id, client_id, workout_assignment_id, completed_at').in('client_id', clientIds).gte('completed_at', trendStartStr + 'T00:00:00').not('completed_at', 'is', null),
      supabase
        .from('daily_wellness_logs')
        .select(
          'id, client_id, log_date, sleep_hours, sleep_quality, stress_level, soreness_level, energy_level, steps'
        )
        .in('client_id', clientIds)
        .gte('log_date', trendStartStr)
        .lte('log_date', todayStr),
      supabase
        .from('program_assignments')
        .select(
          'id, client_id, program_id, start_date, duration_weeks, pause_accumulated_days, pause_status, paused_at, timezone_snapshot, status, updated_at'
        )
        .in('client_id', clientIds)
        .eq('status', 'active')
        .order('updated_at', { ascending: false }),
      supabase
        .from('meal_plan_assignments')
        .select('client_id')
        .in('client_id', clientIds)
        .eq('is_active', true),
      supabase
        .from('goals')
        .select('client_id')
        .in('client_id', clientIds)
        .eq('pillar', 'nutrition')
        .eq('status', 'active'),
      supabase
        .from('habits')
        .select(
          `
          id,
          client_id,
          template_id,
          target,
          is_active,
          created_at,
          habit_templates (
            id,
            slug,
            name,
            description,
            category,
            source_type,
            source_config,
            default_target,
            user_configurable_keys,
            icon,
            color,
            sort_order,
            is_active
          )
        `
        )
        .in('client_id', clientIds)
        .eq('is_active', true),
      supabase
        .from('meal_plan_assignments')
        .select('id, client_id, meal_plan_id, start_date, end_date, is_active')
        .in('client_id', clientIds)
        .eq('is_active', true),
    ])

    const mpAssignments = (mealPlanAssignmentsFull ?? []) as MealPlanAssignmentRow[]
    const planIds = [...new Set(mpAssignments.map((a) => a.meal_plan_id).filter(Boolean))]

    let mealsForPlans: MealRow[] = []
    let mealCompletionsTrend: MealCompletionRow[] = []

    if (planIds.length > 0) {
      const [mealsRes, compRes] = await Promise.all([
        supabase.from('meals').select('id, meal_plan_id').in('meal_plan_id', planIds),
        supabase
          .from('meal_completions')
          .select('client_id, meal_id, completed_at, date')
          .in('client_id', clientIds)
          .gte('completed_at', `${trendStartStr}T00:00:00.000Z`),
      ])
      mealsForPlans = (mealsRes.data ?? []) as MealRow[]
      mealCompletionsTrend = (compRes.data ?? []) as MealCompletionRow[]
    }

    const profileTzMap = new Map<string, string>()
    ;(profilesData ?? []).forEach((p: any) => {
      if (p?.id) profileTzMap.set(p.id, p.timezone || 'Europe/Bucharest')
    })

    let habitLogMaxYmd = todayStr
    for (const cid of clientIds) {
      const tz = profileTzMap.get(cid) || 'Europe/Bucharest'
      const y = zonedCalendarDateString(now, tz)
      if (y > habitLogMaxYmd) habitLogMaxYmd = y
    }

    const habitsParsed = parseHabitsJoinedRows(habitsJoinedData ?? [])
    const habitIdsAll = [...new Set(habitsParsed.map((h) => h.id))]

    let habitLogsTrend: HabitLogRowLite[] = []
    if (habitIdsAll.length > 0) {
      const { data: hl } = await supabase
        .from('habit_logs')
        .select('habit_id, client_id, log_date')
        .in('habit_id', habitIdsAll)
        .in('client_id', clientIds)
        .gte('log_date', trendStartStr)
        .lte('log_date', habitLogMaxYmd)
      habitLogsTrend = (hl ?? []) as HabitLogRowLite[]
    }

    const wellnessRowsByClient = new Map<string, WellnessLogDay[]>()
    for (const row of wellnessData ?? []) {
      const cid = (row as { client_id?: string }).client_id
      if (!cid) continue
      const list = wellnessRowsByClient.get(cid) ?? []
      list.push(row as WellnessLogDay)
      wellnessRowsByClient.set(cid, list)
    }

    const workoutLogsByClient = new Map<string, { completed_at: string | null }[]>()
    for (const row of logsData ?? []) {
      const cid = (row as { client_id?: string }).client_id
      if (!cid) continue
      const list = workoutLogsByClient.get(cid) ?? []
      list.push({ completed_at: (row as { completed_at?: string | null }).completed_at ?? null })
      workoutLogsByClient.set(cid, list)
    }

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

    const assignmentByClientId = new Map<string, ActiveProgramAssignment>()
    for (const row of programAssignmentsRows || []) {
      const cid = row.client_id as string
      if (!assignmentByClientId.has(cid)) {
        assignmentByClientId.set(cid, row as ActiveProgramAssignment)
      }
    }

    type WeekTarget = {
      client_id: string
      assignment_id: string
      program_id: string
      week_number: number
    }
    const weekTargets: WeekTarget[] = []
    for (const [clientId, pa] of assignmentByClientId) {
      const tz = profileTzMap.get(clientId) || 'Europe/Bucharest'
      const { week } = computeCurrentProgramWeekForAssignment(
        {
          start_date: pa.start_date ?? null,
          duration_weeks: pa.duration_weeks ?? null,
          pause_accumulated_days: pa.pause_accumulated_days ?? 0,
          pause_status: pa.pause_status ?? null,
          paused_at: pa.paused_at ?? null,
          timezone_snapshot: pa.timezone_snapshot ?? null,
        },
        tz
      )
      weekTargets.push({
        client_id: clientId,
        assignment_id: pa.id,
        program_id: pa.program_id,
        week_number: week,
      })
    }

    const uniqueProgramIds = [...new Set(weekTargets.map((t) => t.program_id))]
    const assignmentIds = weekTargets.map((t) => t.assignment_id)

    let scheduleRows: Array<{
      id: string
      program_id: string
      week_number: number
      day_of_week?: number | null
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
          .select('id, program_id, week_number, day_of_week, is_optional')
          .in('program_id', uniqueProgramIds),
        supabase
          .from('program_day_completions')
          .select('program_assignment_id, program_schedule_id, notes')
          .in('program_assignment_id', assignmentIds),
      ])
      scheduleRows = (schedRes.data ?? []) as typeof scheduleRows
      completionRows = (compRes.data ?? []) as typeof completionRows
    }

    const maxWeekByProgram = new Map<string, number>()
    for (const row of scheduleRows) {
      const current = maxWeekByProgram.get(row.program_id) ?? 0
      if (row.week_number > current) {
        maxWeekByProgram.set(row.program_id, row.week_number)
      }
    }

    const mealsByPlanId = new Map<string, Set<string>>()
    for (const m of mealsForPlans) {
      if (!m.meal_plan_id) continue
      const set = mealsByPlanId.get(m.meal_plan_id) ?? new Set<string>()
      set.add(m.id)
      mealsByPlanId.set(m.meal_plan_id, set)
    }

    type WeekAdherenceRow = {
      client_id: string
      assignment_id: string
      program_id: string
      week_number: number
      assigned_required: number
      completed_required: number
      workout_adherence: number
      day_strip: { day_of_week: number; has_slot: boolean; done: boolean }[]
      nutrition_adherence?: number
      nutrition_assigned_required?: number
      nutrition_completed_required?: number
      nutrition_day_strip?: NutritionDayStripCell[]
      habit_adherence?: number
      habit_assigned_required?: number
      habit_completed_required?: number
      habit_day_strip?: HabitDayStripCell[]
      habit_week_score?: number | null
    }

    const weekAdherence: WeekAdherenceRow[] = weekTargets.map((target) => {
      const maxWeek = maxWeekByProgram.get(target.program_id) ?? target.week_number
      const effectiveWeek =
        maxWeek > 0 ? Math.min(target.week_number, maxWeek) : target.week_number
      const requiredSlots = scheduleRows.filter(
        (s) =>
          s.program_id === target.program_id &&
          s.week_number === effectiveWeek &&
          !s.is_optional
      )
      const requiredIds = new Set(requiredSlots.map((s) => s.id))
      const completedForWeek = completionRows.filter(
        (c) =>
          c.program_assignment_id === target.assignment_id &&
          requiredIds.has(c.program_schedule_id) &&
          !String(c.notes || '').startsWith('Skipped by coach')
      )
      const completedIds = new Set(completedForWeek.map((c) => c.program_schedule_id))
      const assignedRequired = requiredSlots.length
      const completedRequired = completedForWeek.length
      const workoutAdherence =
        assignedRequired > 0
          ? Math.round((Math.min(assignedRequired, completedRequired) / assignedRequired) * 100)
          : 0

      const dayStrip = Array.from({ length: 7 }, (_, day) => {
        const daySlots = requiredSlots.filter(
          (s) =>
            (typeof s.day_of_week === 'number' && s.day_of_week >= 0 && s.day_of_week <= 6
              ? s.day_of_week
              : 0) === day
        )
        const has_slot = daySlots.length > 0
        const done = has_slot && daySlots.every((slot) => completedIds.has(slot.id))
        return { day_of_week: day, has_slot, done }
      })

      return {
        client_id: target.client_id,
        assignment_id: target.assignment_id,
        program_id: target.program_id,
        week_number: effectiveWeek,
        assigned_required: assignedRequired,
        completed_required: Math.min(assignedRequired, completedRequired),
        workout_adherence: workoutAdherence,
        day_strip: dayStrip,
      }
    })

    const emptyDayStrip = Array.from({ length: 7 }, (_, day) => ({
      day_of_week: day,
      has_slot: false,
      done: false,
    }))

    for (const cid of clientIds) {
      const clientTz = profileTzMap.get(cid) || 'Europe/Bucharest'
      const currentMonYmd = mondayYmdOfZonedWeekContaining(now, clientTz)
      const nutritionBlock = computeNutritionWeek(
        cid,
        currentMonYmd,
        clientTz,
        mpAssignments,
        mealsByPlanId,
        mealCompletionsTrend
      )
      const habitsBlock = computeHabitsWeekFromTemplates(
        cid,
        currentMonYmd,
        clientTz,
        habitsParsed,
        habitLogsTrend,
        wellnessRowsByClient.get(cid) ?? [],
        workoutLogsByClient.get(cid) ?? []
      )
      const row = weekAdherence.find((w) => w.client_id === cid)
      if (row) {
        Object.assign(row, {
          nutrition_adherence: nutritionBlock.nutrition_adherence,
          nutrition_assigned_required: nutritionBlock.nutrition_assigned_required,
          nutrition_completed_required: nutritionBlock.nutrition_completed_required,
          nutrition_day_strip: nutritionBlock.nutrition_day_strip,
          habit_adherence: habitsBlock.habit_adherence,
          habit_assigned_required: habitsBlock.habit_assigned_required,
          habit_completed_required: habitsBlock.habit_completed_required,
          habit_day_strip: habitsBlock.habit_day_strip,
          habit_week_score: habitsBlock.habit_week_score,
        })
      } else {
        weekAdherence.push({
          client_id: cid,
          assignment_id: '',
          program_id: '',
          week_number: 0,
          assigned_required: 0,
          completed_required: 0,
          workout_adherence: 0,
          day_strip: emptyDayStrip,
          nutrition_adherence: nutritionBlock.nutrition_adherence,
          nutrition_assigned_required: nutritionBlock.nutrition_assigned_required,
          nutrition_completed_required: nutritionBlock.nutrition_completed_required,
          nutrition_day_strip: nutritionBlock.nutrition_day_strip,
          habit_adherence: habitsBlock.habit_adherence,
          habit_assigned_required: habitsBlock.habit_assigned_required,
          habit_completed_required: habitsBlock.habit_completed_required,
          habit_day_strip: habitsBlock.habit_day_strip,
          habit_week_score: habitsBlock.habit_week_score,
        })
      }
    }

    const completionByAssignment = new Map<string, Array<{ program_schedule_id: string; notes?: string | null }>>()
    for (const row of completionRows) {
      const list = completionByAssignment.get(row.program_assignment_id) ?? []
      list.push({ program_schedule_id: row.program_schedule_id, notes: row.notes })
      completionByAssignment.set(row.program_assignment_id, list)
    }

    const wellnessDatesByClient = new Map<string, Set<string>>()
    for (const row of wellnessData ?? []) {
      if (!row?.client_id || !row?.log_date) continue
      const set = wellnessDatesByClient.get(row.client_id) ?? new Set<string>()
      set.add(row.log_date)
      wellnessDatesByClient.set(row.client_id, set)
    }

    const historicalAdherence: Record<
      string,
      Array<{
        week_start: string
        workout: number
        checkins: number
        nutrition: number | null
        habits: number | null
      }>
    > = {}

    for (const clientId of clientIds) {
      const tz = profileTzMap.get(clientId) || 'Europe/Bucharest'
      const assignment = assignmentByClientId.get(clientId)
      const currentMon = mondayYmdOfZonedWeekContaining(now, tz)
      const weekStarts = Array.from({ length: trendWeeks }, (_, i) =>
        addCalendarDaysYmd(currentMon, -7 * (trendWeeks - 1 - i))
      )
      const clientWellnessDates = wellnessDatesByClient.get(clientId) ?? new Set<string>()
      const rows: Array<{
        week_start: string
        workout: number
        checkins: number
        nutrition: number | null
        habits: number | null
      }> = []

      for (const weekStart of weekStarts) {
        const weekEnd = addCalendarDaysYmd(weekStart, 6)

        let workout = 0
        if (
          assignment &&
          (!assignment.start_date || weekEnd >= assignment.start_date.slice(0, 10))
        ) {
          const { week } = computeCurrentProgramWeekForAssignment(
            {
              start_date: assignment.start_date ?? null,
              duration_weeks: assignment.duration_weeks ?? null,
              pause_accumulated_days: assignment.pause_accumulated_days ?? 0,
              pause_status: assignment.pause_status ?? null,
              paused_at: assignment.paused_at ?? null,
              timezone_snapshot: assignment.timezone_snapshot ?? null,
            },
            tz,
            weekEnd
          )
          const maxWeek = maxWeekByProgram.get(assignment.program_id) ?? week
          const effectiveWeek = maxWeek > 0 ? Math.min(week, maxWeek) : week
          const requiredSlots = scheduleRows.filter(
            (s) =>
              s.program_id === assignment.program_id &&
              s.week_number === effectiveWeek &&
              !s.is_optional
          )
          const requiredIds = new Set(requiredSlots.map((s) => s.id))
          const completions = (completionByAssignment.get(assignment.id) ?? []).filter(
            (c) =>
              requiredIds.has(c.program_schedule_id) &&
              !String(c.notes || '').startsWith('Skipped by coach')
          )
          workout =
            requiredSlots.length > 0
              ? Math.round((Math.min(requiredSlots.length, completions.length) / requiredSlots.length) * 100)
              : 0
        }

        let checkinsDays = 0
        for (let d = 0; d < 7; d++) {
          const ymd = addCalendarDaysYmd(weekStart, d)
          if (clientWellnessDates.has(ymd)) checkinsDays += 1
        }
        const checkins = Math.round((checkinsDays / 7) * 100)

        const nutWeek = computeNutritionWeek(
          clientId,
          weekStart,
          tz,
          mpAssignments,
          mealsByPlanId,
          mealCompletionsTrend
        )

        const habitWeek = computeHabitsWeekFromTemplates(
          clientId,
          weekStart,
          tz,
          habitsParsed,
          habitLogsTrend,
          wellnessRowsByClient.get(clientId) ?? [],
          workoutLogsByClient.get(clientId) ?? []
        )

        rows.push({
          week_start: weekStart,
          workout,
          checkins,
          nutrition: nutWeek.nutrition_week_score,
          habits: habitWeek.habit_week_score,
        })
      }

      historicalAdherence[clientId] = rows
    }

    console.log('[Coach analytics adherence] network calls done')

    return NextResponse.json({
      clients: clientsData,
      profiles: profilesData ?? [],
      assignments: assignmentsData ?? [],
      logs: logsData ?? [],
      wellness: wellnessData ?? [],
      nutritionTrackedIds: [
        ...new Set([
          ...(nutritionAssignmentsData ?? []).map((row: any) => row.client_id).filter(Boolean),
          ...(nutritionGoalsData ?? []).map((row: any) => row.client_id).filter(Boolean),
        ]),
      ],
      habitTrackedIds: [...new Set(habitsParsed.map((h) => h.client_id).filter(Boolean))],
      historicalAdherence,
      trendWeeks,
      weekAdherence,
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

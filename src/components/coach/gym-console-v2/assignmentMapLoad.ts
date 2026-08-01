'use client'

/**
 * Load assignment map data for gym-console-v2 (Piece 3A).
 * Full PDA schedule + completions + next-due + instance phases — not the current-week-only RPC.
 * Next-due + day status: weekWindows foundation (same as Train). Does not call SQL
 * get_next_incomplete_program_slot / getNextSlot.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getActiveProgramAssignment } from '@/lib/programStateService'
import { loadInstancePhases } from '@/lib/programInstance/instanceCanvasLoad'
import { instanceTotalWeeks } from '@/lib/programInstanceResolver'
import {
  normalizeClientTimezone,
  zonedCalendarDateString,
} from '@/lib/clientZonedCalendar'
import {
  getEffectiveToday,
  getNextDue,
  getProgramWeekWindows,
  getWorkoutStatus,
  type PauseState,
  type ProgramWeekWindow,
  type WorkoutRef,
  type WorkoutStatus,
} from '@/lib/progression/weekWindows'
import type { TrainingBlock } from '@/types/trainingBlock'

export type AssignmentMapSlot = {
  id: string
  week_number: number
  program_day: number
  template_id: string | null
  program_instance_workout_id: string | null
  template_name: string | null
  is_optional: boolean
}

export type AssignmentMapData = {
  assignmentId: string
  programId: string
  slots: AssignmentMapSlot[]
  completedPdaIds: Set<string>
  nextDuePdaId: string | null
  nextDueWeek: number | null
  nextDueProgramDay: number | null
  blocks: TrainingBlock[]
  /** Foundation inputs (calendar week status / next-due). */
  startDate: string | null
  totalWeeks: number
  timeZone: string
  pauses: PauseState
  windows: ProgramWeekWindow[]
  effectiveToday: string
}

function mapPhaseToBlock(
  phase: {
    id: string
    name: string
    duration_weeks: number
    phase_order: number
    phase_label: string | null
    notes: string | null
  },
  programId: string,
): TrainingBlock {
  return {
    id: phase.id,
    program_id: programId,
    name: phase.name,
    duration_weeks: phase.duration_weeks,
    block_order: phase.phase_order,
    phase_label: phase.phase_label,
    notes: phase.notes,
  }
}

export async function resolveAssignmentId(
  supabase: SupabaseClient,
  opts: { clientId?: string | null; assignmentId?: string | null },
): Promise<{ assignmentId: string; programId: string } | null> {
  if (opts.assignmentId?.trim()) {
    const { data, error } = await supabase
      .from('program_assignments')
      .select('id, program_id, status')
      .eq('id', opts.assignmentId.trim())
      .maybeSingle()
    if (error || !data?.id || !data.program_id) return null
    return { assignmentId: data.id, programId: data.program_id }
  }
  if (opts.clientId?.trim()) {
    const active = await getActiveProgramAssignment(supabase, opts.clientId.trim())
    if (!active?.id || !active.program_id) return null
    return { assignmentId: active.id, programId: active.program_id }
  }
  return null
}

async function resolveClientTimezone(
  supabase: SupabaseClient,
  timezoneSnapshot: string | null | undefined,
  clientId: string | null | undefined,
): Promise<string> {
  const snap = typeof timezoneSnapshot === 'string' ? timezoneSnapshot.trim() : ''
  if (snap) return normalizeClientTimezone(snap)
  if (clientId) {
    const { data } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', clientId)
      .maybeSingle()
    const prof =
      data && typeof (data as { timezone?: string | null }).timezone === 'string'
        ? (data as { timezone: string }).timezone.trim()
        : ''
    if (prof) return normalizeClientTimezone(prof)
  }
  return 'UTC'
}

export async function loadAssignmentMapData(
  supabase: SupabaseClient,
  opts: { clientId?: string | null; assignmentId?: string | null },
): Promise<AssignmentMapData | null> {
  const resolved = await resolveAssignmentId(supabase, opts)
  if (!resolved) return null

  const { assignmentId, programId } = resolved

  const [assignmentRes, pdaRes, completionsRes, phases] = await Promise.all([
    supabase
      .from('program_assignments')
      .select(
        'id, program_id, client_id, start_date, pause_accumulated_days, pause_status, paused_at, timezone_snapshot',
      )
      .eq('id', assignmentId)
      .maybeSingle(),
    supabase
      .from('program_day_assignments')
      .select(
        'id, week_number, program_day, workout_template_id, program_instance_workout_id, name, is_optional, day_type',
      )
      .eq('program_assignment_id', assignmentId)
      .order('week_number', { ascending: true })
      .order('program_day', { ascending: true }),
    supabase
      .from('program_day_completions')
      .select('program_day_assignment_id, notes')
      .eq('program_assignment_id', assignmentId),
    loadInstancePhases(supabase, assignmentId),
  ])

  if (assignmentRes.error) {
    console.error('[loadAssignmentMapData] assignment:', assignmentRes.error.message)
    throw assignmentRes.error
  }
  if (pdaRes.error) {
    console.error('[loadAssignmentMapData] PDA:', pdaRes.error.message)
    throw pdaRes.error
  }
  if (completionsRes.error) {
    console.error('[loadAssignmentMapData] completions:', completionsRes.error.message)
    throw completionsRes.error
  }

  const assignment = assignmentRes.data
  if (!assignment) return null

  const completedPdaIds = new Set<string>()
  for (const row of completionsRes.data ?? []) {
    const notes = row.notes ?? ''
    if (notes.startsWith('Skipped by coach')) continue
    if (row.program_day_assignment_id) completedPdaIds.add(row.program_day_assignment_id)
  }

  const nameByInstanceId = new Map<string, string>()
  const instanceIds = [
    ...new Set(
      (pdaRes.data ?? [])
        .map((r) => r.program_instance_workout_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  if (instanceIds.length > 0) {
    const { data: workouts } = await supabase
      .from('program_instance_workouts')
      .select('id, name')
      .in('id', instanceIds)
    for (const w of workouts ?? []) {
      if (w?.id && w?.name) nameByInstanceId.set(w.id, w.name)
    }
  }

  const slots: AssignmentMapSlot[] = (pdaRes.data ?? [])
    .filter((row) => row.day_type !== 'rest')
    .map((row) => {
      const instanceId = row.program_instance_workout_id ?? null
      const masterId = row.workout_template_id ?? null
      return {
        id: row.id,
        week_number: Number(row.week_number) || 1,
        program_day: Number(row.program_day) || 1,
        template_id: masterId,
        program_instance_workout_id: instanceId,
        template_name:
          (instanceId ? nameByInstanceId.get(instanceId) : null) ??
          (typeof row.name === 'string' ? row.name : null),
        is_optional: Boolean(row.is_optional),
      }
    })

  const blocks = phases.map((p) => mapPhaseToBlock(p, programId))
  const totalWeeks = instanceTotalWeeks(
    phases.map((p) => ({ duration_weeks: p.duration_weeks })),
  )

  const startRaw =
    typeof assignment.start_date === 'string' ? assignment.start_date.trim() : ''
  const startDate = startRaw.length >= 10 ? startRaw.slice(0, 10) : startRaw || null

  const pauses: PauseState = {
    accumulatedDays: Math.max(0, Number(assignment.pause_accumulated_days) || 0),
    pauseStatus: assignment.pause_status ?? 'active',
    pausedAt: assignment.paused_at ?? null,
  }

  const timeZone = await resolveClientTimezone(
    supabase,
    assignment.timezone_snapshot,
    assignment.client_id,
  )

  const todayYmd = zonedCalendarDateString(new Date(), timeZone)
  const effectiveToday = getEffectiveToday(todayYmd, timeZone, pauses)
  const windows =
    startDate && totalWeeks > 0
      ? getProgramWeekWindows(startDate, totalWeeks, timeZone, pauses)
      : []

  let nextDuePdaId: string | null = null
  let nextDueWeek: number | null = null
  let nextDueProgramDay: number | null = null

  if (startDate && windows.length > 0) {
    const workoutRefs: WorkoutRef[] = slots
      .filter((s) => Boolean(s.template_id || s.program_instance_workout_id))
      .map((s) => ({
        id: s.id,
        weekNumber: s.week_number,
        programDay: s.program_day,
        isDone: completedPdaIds.has(s.id),
      }))
    const due = getNextDue(workoutRefs, windows, startDate, effectiveToday)
    if (due?.id) {
      nextDuePdaId = due.id
      nextDueWeek = due.weekNumber
      nextDueProgramDay = due.programDay
    }
  }

  return {
    assignmentId,
    programId,
    slots,
    completedPdaIds,
    nextDuePdaId,
    nextDueWeek,
    nextDueProgramDay,
    blocks,
    startDate,
    totalWeeks,
    timeZone,
    pauses,
    windows,
    effectiveToday,
  }
}

export type AssignmentDayStatus = 'rest' | 'done' | 'missed' | 'upcoming' | 'nextDue'

function mapFoundationToAssignmentStatus(status: WorkoutStatus): AssignmentDayStatus {
  switch (status) {
    case 'completed':
      return 'done'
    case 'missed':
      return 'missed'
    case 'due-today':
    case 'upcoming':
    case 'out-of-scope':
      // Pre-start: neutral (no Missed). Matches Train — no new gym UI state.
      return 'upcoming'
    default:
      return 'upcoming'
  }
}

/**
 * Day status from weekWindows foundation + next-due highlight.
 * `nextDue` wins over due-today/upcoming for the highlighted "Next" card.
 */
export function getAssignmentDayStatus(opts: {
  hasWorkout: boolean
  isCompleted: boolean
  scheduleId: string | null
  weekNumber: number
  programDay: number
  nextDuePdaId: string | null
  windows: ProgramWeekWindow[]
  startDate: string | null
  effectiveToday: string
}): AssignmentDayStatus {
  if (!opts.hasWorkout) return 'rest'
  if (opts.isCompleted) return 'done'
  if (opts.scheduleId && opts.nextDuePdaId && opts.scheduleId === opts.nextDuePdaId) {
    return 'nextDue'
  }
  if (opts.startDate && opts.windows.length > 0) {
    const foundation = getWorkoutStatus(
      {
        weekNumber: opts.weekNumber,
        programDay: opts.programDay,
        isDone: opts.isCompleted,
      },
      opts.windows,
      opts.startDate,
      opts.effectiveToday,
    )
    return mapFoundationToAssignmentStatus(foundation)
  }
  return 'upcoming'
}

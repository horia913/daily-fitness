/**
 * Load foundation next-due for an assignment and map to display DTOs.
 * Home / Train share this so which-slot + core fields never diverge.
 *
 * Flow: PDAs + completions + phases → resolveNextDue → canonical slot → adapters.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeClientTimezone } from '@/lib/clientZonedCalendar'
import { loadInstancePhases } from '@/lib/programInstance/instanceCanvasLoad'
import { instanceTotalWeeks, isCoachSkipNote } from '@/lib/programInstanceResolver'
import { resolveNextDue } from '@/lib/progression/resolveNextDue'
import type { PauseState, WorkoutRef } from '@/lib/progression/weekWindows'

export type FoundationNextDueAssignment = {
  id: string
  client_id: string
  start_date: string | null
  pause_accumulated_days?: number | null
  pause_status?: string | null
  paused_at?: string | null
  timezone_snapshot?: string | null
}

/** Canonical next-due slot — one source for home / Train field values. */
export type FoundationNextDueSlot = {
  hasWorkout: true
  scheduleId: string
  /** Prefer master template id for start links; falls back to instance workout id. */
  templateId: string | null
  masterTemplateId: string | null
  instanceWorkoutId: string | null
  name: string
  weekNumber: number
  programDay: number
  estimatedDuration: number | null
  totalSets: number | null
  weekLabel: string
  dayLabel: string
  message: string
}

export type FoundationNextDueResult =
  | { hasWorkout: false; message: string }
  | FoundationNextDueSlot

const NO_WORKOUT: FoundationNextDueResult = {
  hasWorkout: false,
  message: 'No active workout assigned. Contact your coach to get started!',
}

/**
 * Load assignment schedule/completions and resolve foundation next-due.
 * Optional totalWeeks avoids a second phases fetch when the caller already has it.
 */
export async function loadFoundationNextDueForAssignment(
  supabase: SupabaseClient,
  assignment: FoundationNextDueAssignment,
  options?: { totalWeeks?: number },
): Promise<FoundationNextDueResult> {
  const phasesPromise =
    options?.totalWeeks != null && options.totalWeeks > 0
      ? Promise.resolve(null)
      : loadInstancePhases(supabase, assignment.id)

  const [phases, pdaRes, completionsRes, profileRes] = await Promise.all([
    phasesPromise,
    supabase
      .from('program_day_assignments')
      .select(
        'id, week_number, program_day, workout_template_id, program_instance_workout_id, name, day_type, is_optional',
      )
      .eq('program_assignment_id', assignment.id)
      .order('week_number', { ascending: true })
      .order('program_day', { ascending: true }),
    supabase
      .from('program_day_completions')
      .select('program_day_assignment_id, notes')
      .eq('program_assignment_id', assignment.id),
    supabase
      .from('profiles')
      .select('timezone')
      .eq('id', assignment.client_id)
      .maybeSingle(),
  ])

  if (pdaRes.error) {
    console.error('[loadFoundationNextDue] PDA:', pdaRes.error.message)
    return NO_WORKOUT
  }
  if (completionsRes.error) {
    console.error('[loadFoundationNextDue] completions:', completionsRes.error.message)
    return NO_WORKOUT
  }

  const totalWeeks =
    options?.totalWeeks != null && options.totalWeeks > 0
      ? options.totalWeeks
      : instanceTotalWeeks(
          (phases ?? []).map((p) => ({ duration_weeks: p.duration_weeks })),
        )

  const completedIds = new Set<string>()
  for (const row of completionsRes.data ?? []) {
    if (isCoachSkipNote(row.notes)) continue
    if (row.program_day_assignment_id) completedIds.add(row.program_day_assignment_id)
  }

  const slots = (pdaRes.data ?? []).filter((row) => row.day_type !== 'rest')

  const snap = assignment.timezone_snapshot?.trim() || ''
  const prof =
    profileRes.data && typeof (profileRes.data as { timezone?: string }).timezone === 'string'
      ? (profileRes.data as { timezone: string }).timezone.trim()
      : ''
  const timeZone = normalizeClientTimezone(snap || prof || 'UTC')

  const pauses: PauseState = {
    accumulatedDays: Math.max(0, Number(assignment.pause_accumulated_days) || 0),
    pauseStatus: assignment.pause_status ?? 'active',
    pausedAt: assignment.paused_at ?? null,
  }

  const workouts: WorkoutRef[] = slots
    .filter((s) => Boolean(s.workout_template_id || s.program_instance_workout_id))
    .map((s) => ({
      id: s.id,
      weekNumber: Number(s.week_number) || 1,
      programDay: Number(s.program_day) || 1,
      isDone: completedIds.has(s.id),
    }))

  const { nextDue } = resolveNextDue({
    startDate: assignment.start_date,
    totalWeeks,
    timeZone,
    pauses,
    workouts,
  })

  if (!nextDue?.id) return NO_WORKOUT

  const slot = slots.find((s) => s.id === nextDue.id)
  if (!slot) return NO_WORKOUT

  const masterTemplateId = slot.workout_template_id
    ? String(slot.workout_template_id)
    : null
  const instanceWorkoutId = slot.program_instance_workout_id
    ? String(slot.program_instance_workout_id)
    : null
  const templateId = masterTemplateId || instanceWorkoutId

  let name =
    typeof slot.name === 'string' && slot.name.trim() ? slot.name.trim() : 'Workout'
  let estimatedDuration: number | null = 45
  let totalSets: number | null = 0

  if (instanceWorkoutId) {
    const { data: iw } = await supabase
      .from('program_instance_workouts')
      .select('name, estimated_duration')
      .eq('id', instanceWorkoutId)
      .maybeSingle()
    if (iw?.name) name = iw.name
    if (iw?.estimated_duration != null) estimatedDuration = Number(iw.estimated_duration) || 45
    const { count } = await supabase
      .from('program_instance_set_entries')
      .select('id', { count: 'exact', head: true })
      .eq('program_instance_workout_id', instanceWorkoutId)
    totalSets = count ?? 0
  } else if (masterTemplateId) {
    const { data: wt } = await supabase
      .from('workout_templates')
      .select('name, estimated_duration')
      .eq('id', masterTemplateId)
      .maybeSingle()
    if (wt?.name) name = wt.name
    if (wt?.estimated_duration != null) estimatedDuration = Number(wt.estimated_duration) || 45
    const { count } = await supabase
      .from('workout_set_entries')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', masterTemplateId)
    totalSets = count ?? 0
  }

  const weekNumber = nextDue.weekNumber
  const programDay = nextDue.programDay

  return {
    hasWorkout: true,
    scheduleId: slot.id,
    templateId,
    masterTemplateId,
    instanceWorkoutId,
    name,
    weekNumber,
    programDay,
    estimatedDuration,
    totalSets,
    weekLabel: `Week ${weekNumber}`,
    dayLabel: `Day ${programDay}`,
    message: `Week ${weekNumber} • Day ${programDay} ready!`,
  }
}

/** Home dashboard `todaysWorkout` field names (`name`, `dayNumber`). */
export function mapFoundationNextDueToHomeTodaysWorkout(
  next: FoundationNextDueResult,
): {
  hasWorkout: boolean
  type?: 'program' | 'assignment'
  name?: string
  weekNumber?: number
  dayNumber?: number
  templateId?: string
  scheduleId?: string
  estimatedDuration?: number | null
  totalSets?: number | null
} {
  if (!next.hasWorkout) return { hasWorkout: false }
  return {
    hasWorkout: true,
    type: 'program',
    templateId: next.templateId ?? undefined,
    scheduleId: next.scheduleId,
    name: next.name,
    weekNumber: next.weekNumber,
    dayNumber: next.programDay,
    totalSets: next.totalSets,
    estimatedDuration: next.estimatedDuration,
  }
}

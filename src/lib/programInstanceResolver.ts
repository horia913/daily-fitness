/**
 * Program Spine Rebuild — STEP 2: canonical "Week X of N" + adherence resolver.
 *
 * This is the SINGLE canonical source for:
 *   - N (total weeks)  = SUM of the instance's OWN phase durations
 *                        (program_instance_phases.duration_weeks).
 *   - X (current week) = calendar-elapsed weeks since effective start,
 *                        pause-adjusted, in the client's timezone, clamped to N.
 *   - adherence(week)  = required instance schedule slots vs instance-keyed
 *                        completions (program_day_assignment_id).
 *
 * HARD RULES (locked design):
 *   - N is ALWAYS the sum of instance phase durations. Never
 *     program_assignments.duration_weeks, never workout_programs.duration_weeks,
 *     never MAX(program_schedule.week_number), never a distinct-week count.
 *   - Adherence/completions are instance-keyed (program_day_assignment_id),
 *     never master program_schedule_id.
 *
 * The calendar/pause math is NOT reimplemented here — it reuses
 * computeCurrentProgramWeek from programWeekCalendar.ts so that this resolver
 * and the SQL function get_program_instance_week stay in lock-step.
 *
 * STATUS: pure addition. Nothing in the app calls this yet — readers are
 * re-pointed in step 6.
 */

import {
  computeCurrentProgramWeek,
  normalizeClientTimezone,
  zonedCalendarDateString,
  type AssignmentWeekFields,
} from '@/lib/programWeekCalendar'
import type { SupabaseClient } from '@supabase/supabase-js'

/** A single instance phase — only the duration matters for N. */
export interface InstancePhase {
  duration_weeks: number | null | undefined
}

/**
 * Assignment fields needed to resolve the week. Extends the existing
 * AssignmentWeekFields (start_date / pause_* / timezone_snapshot) with status,
 * which is needed for isComplete. `duration_weeks` from the base type is
 * intentionally IGNORED — N comes only from instance phases.
 */
export type InstanceWeekAssignment = AssignmentWeekFields & {
  status?: string | null
}

export interface InstanceProgramWeekResult {
  /** X, clamped to [1, N] when N > 0. */
  currentWeek: number
  /** N = sum of instance phase durations. */
  totalWeeks: number
  /** true when the raw calendar week exceeded N (i.e. X was clamped down). */
  clamped: boolean
  /** status === 'completed' OR (currentWeek >= N AND week-N required slots done). */
  isComplete: boolean
}

export interface InstanceAdherence {
  required: number
  completed: number
}

/** Minimal instance schedule slot shape used for adherence. */
export interface InstanceScheduleSlot {
  id: string
  week_number: number | null
  is_optional: boolean | null
}

/** Minimal instance completion shape used for adherence. */
export interface InstanceCompletionRow {
  program_day_assignment_id: string | null
  /** Coach-skip signal: notes starting with 'Skipped by coach' exclude the slot. */
  notes?: string | null
}

/**
 * COACH-SKIP RULE (locked): a coach-skipped day is NOT a miss — it is removed
 * from the adherence denominator entirely. The signal is a completion row whose
 * notes begin with 'Skipped by coach'. Applied identically in TS and SQL.
 */
export function isCoachSkipNote(notes: string | null | undefined): boolean {
  return !!notes && notes.startsWith('Skipped by coach')
}

/**
 * N — the instance's total weeks. The ONLY definition of N.
 * COALESCE(SUM(duration_weeks), 0) over the instance's own phases.
 */
export function instanceTotalWeeks(instancePhases: InstancePhase[]): number {
  return (instancePhases ?? []).reduce((sum, p) => {
    const w = Number(p?.duration_weeks)
    return sum + (Number.isFinite(w) && w > 0 ? Math.floor(w) : 0)
  }, 0)
}

/**
 * Pure adherence computation (no I/O) — testable directly.
 *   required  = non-optional instance slots for `week`, MINUS coach-skipped slots.
 *   completed = distinct required slot ids that have a non-skip instance-keyed
 *               completion.
 * Coach-skipped slots are excluded from the denominator entirely (not misses).
 */
export function computeInstanceAdherenceForWeek(
  slots: InstanceScheduleSlot[],
  completions: InstanceCompletionRow[],
  week: number,
): InstanceAdherence {
  const weekSlotIds = new Set(
    (slots ?? [])
      .filter((s) => s.week_number === week && !s.is_optional)
      .map((s) => s.id),
  )
  if (weekSlotIds.size === 0) return { required: 0, completed: 0 }

  // Slots coach-skipped this week are removed from the denominator.
  const skippedIds = new Set<string>()
  for (const c of completions ?? []) {
    const id = c.program_day_assignment_id
    if (id && weekSlotIds.has(id) && isCoachSkipNote(c.notes)) skippedIds.add(id)
  }

  let required = 0
  for (const id of weekSlotIds) if (!skippedIds.has(id)) required++

  const completedIds = new Set<string>()
  for (const c of completions ?? []) {
    const id = c.program_day_assignment_id
    if (!id || !weekSlotIds.has(id)) continue
    if (isCoachSkipNote(c.notes)) continue
    if (skippedIds.has(id)) continue
    completedIds.add(id)
  }
  return { required, completed: completedIds.size }
}

/**
 * The canonical resolver. Mirrors the SQL get_program_instance_week exactly for
 * { currentWeek, totalWeeks, clamped }, and adds isComplete (TS-only).
 *
 * @param finalWeekAdherence optional adherence for week N; required to evaluate
 *        the "all week-N required slots completed" half of isComplete. When
 *        omitted, isComplete falls back to status === 'completed' only.
 */
export function resolveInstanceProgramWeek(
  assignment: InstanceWeekAssignment,
  instancePhases: InstancePhase[],
  clientTz: string,
  targetYmd?: string,
  finalWeekAdherence?: InstanceAdherence,
): InstanceProgramWeekResult {
  const tz =
    normalizeClientTimezone(assignment.timezone_snapshot) ||
    normalizeClientTimezone(clientTz) ||
    'UTC'
  const target = targetYmd ?? zonedCalendarDateString(new Date(), tz)

  const totalWeeks = instanceTotalWeeks(instancePhases)

  const raw = computeCurrentProgramWeek({
    assignmentStartDate: assignment.start_date,
    pauseAccumulatedDays: assignment.pause_accumulated_days,
    pauseStatus: assignment.pause_status,
    pausedAt: assignment.paused_at,
    targetYmd: target,
    clientTimezone: tz,
  })

  const floored = Math.max(1, raw)
  const hasCap = totalWeeks > 0
  const clamped = hasCap && floored > totalWeeks
  const currentWeek = hasCap ? Math.min(floored, totalWeeks) : floored

  let isComplete = (assignment.status ?? '') === 'completed'
  if (!isComplete && hasCap && currentWeek >= totalWeeks && finalWeekAdherence) {
    isComplete =
      finalWeekAdherence.required > 0 &&
      finalWeekAdherence.completed >= finalWeekAdherence.required
  }

  return { currentWeek, totalWeeks, clamped, isComplete }
}

/**
 * DB-backed adherence for a given instance week. Instance-keyed throughout:
 *   required  = program_day_assignments (assignment, week, NOT is_optional),
 *               MINUS coach-skipped slots.
 *   completed = program_day_completions joined via program_day_assignment_id,
 *               excluding coach-skip rows.
 */
export async function instanceAdherenceForWeek(
  supabase: SupabaseClient,
  assignmentId: string,
  week: number,
): Promise<InstanceAdherence> {
  const { data: slots, error: slotsErr } = await supabase
    .from('program_day_assignments')
    .select('id, week_number, is_optional')
    .eq('program_assignment_id', assignmentId)
    .eq('week_number', week)
  if (slotsErr) throw slotsErr

  const requiredSlots = (slots ?? []).filter((s) => !s.is_optional)
  if (requiredSlots.length === 0) return { required: 0, completed: 0 }

  const requiredIds = requiredSlots.map((s) => s.id as string)
  const { data: comps, error: compErr } = await supabase
    .from('program_day_completions')
    .select('program_day_assignment_id, notes')
    .eq('program_assignment_id', assignmentId)
    .in('program_day_assignment_id', requiredIds)
  if (compErr) throw compErr

  return computeInstanceAdherenceForWeek(
    requiredSlots.map((s) => ({
      id: s.id as string,
      week_number: week,
      is_optional: s.is_optional as boolean | null,
    })),
    (comps ?? []) as InstanceCompletionRow[],
    week,
  )
}

// ============================================================================
// DB-backed week resolution (canonical readers call these in step 6)
// ============================================================================

/** Assignment fields + instance phases needed to resolve the week, loaded once. */
export interface InstanceWeekInputs {
  assignment: InstanceWeekAssignment
  phases: InstancePhase[]
  clientTz: string
}

interface AssignmentWeekRow {
  id: string
  client_id: string | null
  start_date: string | null
  pause_accumulated_days: number | null
  pause_status: string | null
  paused_at: string | null
  timezone_snapshot: string | null
  status: string | null
}

const ASSIGNMENT_WEEK_COLUMNS =
  'id, client_id, start_date, pause_accumulated_days, pause_status, paused_at, timezone_snapshot, status'

function toAssignment(row: AssignmentWeekRow): InstanceWeekAssignment {
  return {
    start_date: row.start_date,
    pause_accumulated_days: row.pause_accumulated_days,
    pause_status: row.pause_status,
    paused_at: row.paused_at,
    timezone_snapshot: row.timezone_snapshot,
    status: row.status,
  }
}

/**
 * Load the inputs for a single assignment so a caller can run
 * resolveInstanceProgramWeek (optionally for multiple target dates). Returns
 * null when the assignment does not exist.
 */
export async function loadInstanceWeekInputs(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<InstanceWeekInputs | null> {
  const { data: row, error } = await supabase
    .from('program_assignments')
    .select(ASSIGNMENT_WEEK_COLUMNS)
    .eq('id', assignmentId)
    .maybeSingle()
  if (error) throw error
  if (!row) return null
  const a = row as AssignmentWeekRow

  const { data: phaseRows, error: phErr } = await supabase
    .from('program_instance_phases')
    .select('duration_weeks')
    .eq('program_assignment_id', assignmentId)
  if (phErr) throw phErr

  let clientTz = a.timezone_snapshot || ''
  if (!clientTz && a.client_id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', a.client_id)
      .maybeSingle()
    clientTz = (prof?.timezone as string) || 'UTC'
  }
  clientTz = clientTz || 'UTC'

  return {
    assignment: toAssignment(a),
    phases: (phaseRows ?? []) as InstancePhase[],
    clientTz,
  }
}

/**
 * Canonical Week X of N for a single assignment. N = sum of instance phases,
 * X = calendar/pause math in the client's timezone clamped to N. Returns null
 * for an unknown assignment.
 */
export async function resolveInstanceWeekForAssignment(
  supabase: SupabaseClient,
  assignmentId: string,
  targetYmd?: string,
): Promise<InstanceProgramWeekResult | null> {
  const inputs = await loadInstanceWeekInputs(supabase, assignmentId)
  if (!inputs) return null
  return resolveInstanceProgramWeek(inputs.assignment, inputs.phases, inputs.clientTz, targetYmd)
}

/**
 * Batched canonical Week X of N for many assignments (coach dashboards,
 * analytics). One query for assignments, one for phases, one for missing tz.
 */
export async function resolveInstanceWeeksForAssignments(
  supabase: SupabaseClient,
  assignmentIds: string[],
): Promise<Map<string, InstanceProgramWeekResult>> {
  const out = new Map<string, InstanceProgramWeekResult>()
  const uniq = [...new Set((assignmentIds ?? []).filter(Boolean))]
  if (uniq.length === 0) return out

  const { data: assignments, error: aErr } = await supabase
    .from('program_assignments')
    .select(ASSIGNMENT_WEEK_COLUMNS)
    .in('id', uniq)
  if (aErr) throw aErr

  const { data: phases, error: phErr } = await supabase
    .from('program_instance_phases')
    .select('program_assignment_id, duration_weeks')
    .in('program_assignment_id', uniq)
  if (phErr) throw phErr

  const phasesByAssignment = new Map<string, InstancePhase[]>()
  for (const p of phases ?? []) {
    const key = (p as { program_assignment_id: string }).program_assignment_id
    const arr = phasesByAssignment.get(key) ?? []
    arr.push({ duration_weeks: (p as { duration_weeks: number | null }).duration_weeks })
    phasesByAssignment.set(key, arr)
  }

  const rows = (assignments ?? []) as AssignmentWeekRow[]
  const needTzClientIds = rows
    .filter((a) => !a.timezone_snapshot && a.client_id)
    .map((a) => a.client_id as string)
  const tzByClient = new Map<string, string>()
  if (needTzClientIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, timezone')
      .in('id', [...new Set(needTzClientIds)])
    for (const pr of profs ?? []) {
      tzByClient.set(
        (pr as { id: string }).id,
        ((pr as { timezone: string | null }).timezone as string) || 'UTC',
      )
    }
  }

  for (const a of rows) {
    const tz = a.timezone_snapshot || (a.client_id ? tzByClient.get(a.client_id) : '') || 'UTC'
    out.set(
      a.id,
      resolveInstanceProgramWeek(toAssignment(a), phasesByAssignment.get(a.id) ?? [], tz),
    )
  }
  return out
}

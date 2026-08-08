/**
 * Program State Service (Canonical Resolver)
 * 
 * SINGLE SOURCE OF TRUTH for all program state reads.
 * 
 * This service reads from:
 *   - program_assignments (active assignment)
 *   - program_day_assignments (per-client canonical schedule snapshot, including is_optional)
 *   - workout_logs (completion — program_day_assignment_id + program_assignment_id)
 * 
 * All other services and components MUST use this service for program state.
 * Do NOT read from program_assignment_progress or program_workout_completions directly.
 * Schedule reads use program_day_assignments (not program_day_assignments.is_completed).
 * 
 * All week/day numbers are 1-based.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  computeCurrentProgramWeekForAssignment,
  type AssignmentWeekFields,
  normalizeClientTimezone,
} from '@/lib/programWeekCalendar'
import { isCoachSkipNote } from '@/lib/programInstanceResolver'

/**
 * SLOT `id` — instance-keyed (Step 12 Part 2)
 * ---------------------------------------------------------------------------
 * `ProgramScheduleSlot.id` is `program_day_assignments.id` (the per-client instance row).
 * All start/complete/dedup paths key on this id via `program_day_assignment_id`.
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProgramAssignment {
  id: string
  program_id: string
  client_id: string
  name: string | null
  status: string
  start_date: string | null
  total_days: number | null
  created_at: string
  /** B.1 — coach pause (CHECK: active | paused) */
  pause_status?: 'active' | 'paused'
  paused_at?: string | null
  pause_accumulated_days?: number | null
  timezone_snapshot?: string | null
  pause_reason?: string | null
}

/** Per-client snapshot row from program_day_assignments (canonical schedule reads). */
export interface AssignmentScheduleSlot {
  id: string
  program_assignment_id: string
  day_number: number
  program_day: number
  week_number: number
  /** @deprecated transitional; instance editor uses program_instance_workout_id. */
  workout_template_id: string | null
  program_instance_workout_id: string | null
  name: string
  day_type: string
  /** Per-client optional day (materialized from master / coach edits). */
  is_optional?: boolean
}

export interface ProgramScheduleSlot {
  /** program_day_assignments.id — canonical instance schedule key */
  id: string
  /** Same as `id` on assignment slots; null for master program_schedule reads (getProgramSlots). */
  program_day_assignment_id: string | null
  program_id: string
  week_number: number      // 1-based week number
  day_number: number       // 1-based day number (1..7)
  day_of_week: number      // Legacy 0-based (kept for compat)
  template_id: string
  is_optional?: boolean    // Optional day (e.g. mobility) — does not block progression
  /** Instance workout canvas id when program uses per-client instance workouts. */
  program_instance_workout_id?: string | null
}

export interface CompletedSlot {
  id: string               // program_day_completions.id (first completion per instance slot)
  program_assignment_id: string
  /** Canonical instance completion key (program_day_completions.program_day_assignment_id). */
  program_day_assignment_id: string
  completed_at: string
  completed_by: string
  notes: string | null
  // Joined from program_day_assignments (instance schedule):
  week_number: number
  day_number: number
  template_id: string
}

export interface ProgramState {
  assignment: ProgramAssignment | null
  slots: ProgramScheduleSlot[]
  completedSlots: CompletedSlot[]
  nextSlot: ProgramScheduleSlot | null
  completedCount: number
  totalSlots: number
  isCompleted: boolean
  currentWeekNumber: number      // 1-based, from nextSlot (or last slot if complete)
  currentDayNumber: number       // 1-based, from nextSlot (or last slot if complete)
  // Human-readable labels
  weekLabel: string              // e.g., "Week 1"
  dayLabel: string               // e.g., "Day 2"
  positionLabel: string          // e.g., "Week 1 • Day 2"
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get the one active program assignment for a client (or null).
 * Enforced: only 1 active per client via partial unique index.
 */
export async function getActiveProgramAssignment(
  supabase: SupabaseClient,
  clientId: string
): Promise<ProgramAssignment | null> {
  const { data, error } = await supabase
    .from('program_assignments')
    .select('id, program_id, client_id, name, status, start_date, total_days, created_at, pause_status, paused_at, pause_accumulated_days, timezone_snapshot, pause_reason')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[programStateService] Error fetching active assignment:', error)
    return null
  }

  return data
}

/**
 * Get the most recently completed program assignment for a client (or null).
 * Used when no active program exists, to show "Program Completed" state on dashboard.
 */
export async function getRecentlyCompletedProgramAssignment(
  supabase: SupabaseClient,
  clientId: string
): Promise<ProgramAssignment | null> {
  const { data, error } = await supabase
    .from('program_assignments')
    .select('id, program_id, client_id, name, status, start_date, total_days, created_at, pause_status, paused_at, pause_accumulated_days, timezone_snapshot, pause_reason')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[programStateService] Error fetching completed assignment:', error)
    return null
  }

  return data
}

/**
 * Get all schedule slots for a program, ordered by (week_number ASC, day_number ASC).
 * Uses day_number (1-based) as the canonical ordering column.
 * Falls back to day_of_week + 1 if day_number is not yet populated.
 * Gracefully degrades if is_optional column does not exist (migration not yet applied).
 */
export async function getProgramSlots(
  supabase: SupabaseClient,
  programId: string
): Promise<ProgramScheduleSlot[]> {
  const baseSelect = 'id, program_id, week_number, day_number, day_of_week, template_id'
  let { data, error } = await supabase
    .from('program_schedule')
    .select(`${baseSelect}, is_optional`)
    .eq('program_id', programId)
    .order('week_number', { ascending: true })
    .order('day_number', { ascending: true })

  // If is_optional column does not exist (migration not applied), retry without it
  if (error?.code === '42703') {
    const fallback = await supabase
      .from('program_schedule')
      .select(baseSelect)
      .eq('program_id', programId)
      .order('week_number', { ascending: true })
      .order('day_number', { ascending: true })
    if (fallback.error) {
      console.error('[programStateService] Error fetching program slots:', fallback.error)
      return []
    }
    data = (fallback.data ?? []).map((row: any) => ({ ...row, is_optional: false })) as typeof data
    error = null
  }

  if (error) {
    console.error('[programStateService] Error fetching program slots:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Ensure day_number is populated (fallback for pre-migration data)
  return data.map(row => ({
    ...row,
    program_day_assignment_id: null,
    day_number: row.day_number ?? (row.day_of_week + 1),
  }))
}

/**
 * Per-client schedule snapshot from program_day_assignments.
 * week_number is derived: ceil(day_number / 7) (same as floor((day_number-1)/7)+1 for day_number >= 1).
 */
export async function getAssignmentSchedule(
  supabase: SupabaseClient,
  assignmentId: string
): Promise<AssignmentScheduleSlot[]> {
  const { data, error } = await supabase
    .from('program_day_assignments')
    .select(
      'id, program_assignment_id, day_number, program_day, week_number, workout_template_id, program_instance_workout_id, name, day_type, is_optional'
    )
    .eq('program_assignment_id', assignmentId)
    .order('day_number', { ascending: true })

  if (error) {
    console.error('[programStateService] getAssignmentSchedule:', error)
    return []
  }

  if (!data?.length) {
    console.log('[assignment-schedule] 0 slots loaded for assignment', assignmentId)
    return []
  }

  const rows: AssignmentScheduleSlot[] = data.map((row: any) => {
    const dayNum = Number(row.day_number) || 1
    const weekFromDb = Number(row.week_number)
    const weekNum =
      Number.isFinite(weekFromDb) && weekFromDb >= 1
        ? weekFromDb
        : Math.max(1, Math.ceil(dayNum / 7))
    const programDayRaw = row.program_day
    const programDay =
      typeof programDayRaw === 'number' && programDayRaw >= 1 && programDayRaw <= 7
        ? programDayRaw
        : Math.max(1, Math.min(7, dayNum - (weekNum - 1) * 7))

    return {
      id: row.id,
      program_assignment_id: row.program_assignment_id,
      day_number: dayNum,
      program_day: programDay,
      week_number: weekNum,
      workout_template_id: row.workout_template_id ?? null,
      program_instance_workout_id: row.program_instance_workout_id ?? null,
      name: typeof row.name === 'string' ? row.name : '',
      day_type: typeof row.day_type === 'string' ? row.day_type : 'workout',
      is_optional: Boolean(row.is_optional),
    }
  })

  console.log('[assignment-schedule]', rows.length, 'slots loaded for assignment', assignmentId)
  return rows
}

/**
 * Canonical assignment-scoped slots from program_day_assignments only.
 * `slot.id` = instance row id (program_day_assignments.id).
 */
export async function getProgramScheduleSlotsForAssignment(
  supabase: SupabaseClient,
  programId: string,
  assignmentId: string
): Promise<ProgramScheduleSlot[]> {
  const snapshots = await getAssignmentSchedule(supabase, assignmentId)

  if (snapshots.length === 0) {
    console.warn(
      '[assignment-schedule] No program_day_assignments for assignment',
      assignmentId,
      '— returning no slots'
    )
    return []
  }

  return snapshots.map((snap) => programDayAssignmentToScheduleSlot(snap, programId))
}

/** Map one program_day_assignments row → ProgramScheduleSlot (instance-keyed). */
export function programDayAssignmentToScheduleSlot(
  snap: {
    id: string
    week_number?: number | null
    day_number?: number | null
    program_day?: number | null
    workout_template_id?: string | null
    program_instance_workout_id?: string | null
    is_optional?: boolean | null
  },
  programId: string,
): ProgramScheduleSlot {
  const dayNum = Number(snap.day_number) || 1
  const weekFromDb = Number(snap.week_number)
  const weekNum =
    Number.isFinite(weekFromDb) && weekFromDb >= 1
      ? weekFromDb
      : Math.max(1, Math.ceil(dayNum / 7))
  const programDayRaw = snap.program_day
  const programDay =
    typeof programDayRaw === 'number' && programDayRaw >= 1 && programDayRaw <= 7
      ? programDayRaw
      : Math.max(1, Math.min(7, dayNum - (weekNum - 1) * 7))

  const templateId =
    (snap.workout_template_id && snap.workout_template_id.length > 0
      ? snap.workout_template_id
      : snap.program_instance_workout_id) ?? ''
  const dayOfWeek = Math.max(0, Math.min(6, programDay - 1))

  return {
    id: snap.id,
    program_day_assignment_id: snap.id,
    program_id: programId,
    week_number: weekNum,
    day_number: programDay,
    day_of_week: dayOfWeek,
    template_id: templateId,
    is_optional: snap.is_optional ?? false,
    program_instance_workout_id: snap.program_instance_workout_id ?? null,
  }
}

/**
 * Completed program slots from the INSTANCE ledger
 * (program_day_completions.program_day_assignment_id), joined to
 * program_day_assignments for week/day/template. No master program_schedule join.
 *
 * Coach-skip rows (notes LIKE 'Skipped by coach%') ARE returned (with notes) so
 * navigation can treat a skipped day as "dealt with"; ratio/adherence callers
 * must exclude them via isCoachSkipNote.
 */
export async function getCompletedSlots(
  supabase: SupabaseClient,
  programAssignmentId: string
): Promise<CompletedSlot[]> {
  const { data: comps, error } = await supabase
    .from('program_day_completions')
    .select('id, program_day_assignment_id, completed_at, completed_by, notes')
    .eq('program_assignment_id', programAssignmentId)
    .not('program_day_assignment_id', 'is', null)
    .order('completed_at', { ascending: true })

  if (error) {
    console.error('[programStateService] getCompletedSlots (program_day_completions):', error)
    return []
  }

  if (!comps?.length) return []

  const firstByInstance = new Map<
    string,
    { id: string; completed_at: string; completed_by: string | null; notes: string | null }
  >()
  for (const row of comps as {
    id: string
    program_day_assignment_id: string
    completed_at: string
    completed_by: string | null
    notes: string | null
  }[]) {
    const pid = row.program_day_assignment_id
    if (!pid || firstByInstance.has(pid)) continue
    firstByInstance.set(pid, {
      id: row.id,
      completed_at: row.completed_at,
      completed_by: row.completed_by,
      notes: row.notes,
    })
  }

  const instanceIds = [...firstByInstance.keys()]
  if (instanceIds.length === 0) return []

  const { data: pdaRows, error: pdaErr } = await supabase
    .from('program_day_assignments')
    .select('id, day_number, program_day, workout_template_id, program_instance_workout_id')
    .in('id', instanceIds)

  if (pdaErr) {
    console.error('[programStateService] getCompletedSlots program_day_assignments:', pdaErr)
    return []
  }

  const pdaById = new Map((pdaRows ?? []).map((r: any) => [r.id, r]))

  return instanceIds.map((pid) => {
    const meta = firstByInstance.get(pid)!
    const pda = pdaById.get(pid) as any
    const dayNum = Number(pda?.day_number) || 1
    const weekNum = Math.max(1, Math.ceil(dayNum / 7))
    return {
      id: meta.id,
      program_assignment_id: programAssignmentId,
      program_day_assignment_id: pid,
      completed_at: meta.completed_at,
      completed_by: meta.completed_by ?? '',
      notes: meta.notes ?? null,
      week_number: weekNum,
      day_number: typeof pda?.program_day === 'number' && pda.program_day >= 1 ? pda.program_day : dayNum,
      template_id: pda?.workout_template_id ?? '',
    }
  })
}

/**
 * Compute the next uncompleted slot.
 * = first slot in order (week_number ASC, day_number ASC) whose program_day_assignment_id
 *   is NOT in the completion ledger.
 * Returns null if all slots are completed.
 */
export async function getNextSlot(
  supabase: SupabaseClient,
  programAssignmentId: string,
  programId?: string
): Promise<ProgramScheduleSlot | null> {
  // If programId not provided, look it up
  let resolvedProgramId = programId
  if (!resolvedProgramId) {
    const { data: assignment } = await supabase
      .from('program_assignments')
      .select('program_id')
      .eq('id', programAssignmentId)
      .single()
    
    if (!assignment) return null
    resolvedProgramId = assignment.program_id
  }

  if (!resolvedProgramId) return null

  // Get all slots and completed slot IDs in parallel
  const [slots, completedSlots] = await Promise.all([
    getProgramScheduleSlotsForAssignment(supabase, resolvedProgramId, programAssignmentId),
    getCompletedSlots(supabase, programAssignmentId),
  ])

  const completedKeys = new Set(
    completedSlots.map((c) => c.program_day_assignment_id).filter((id): id is string => !!id),
  )

  return (
    slots.find(
      (slot) => slot.program_day_assignment_id != null && !completedKeys.has(slot.program_day_assignment_id),
    ) ?? null
  )
}

/**
 * Full state bundle for any screen.
 * Single call to get everything about a client's active program.
 */
export async function getProgramState(
  supabase: SupabaseClient,
  clientId: string
): Promise<ProgramState> {
  const emptyState: ProgramState = {
    assignment: null,
    slots: [],
    completedSlots: [],
    nextSlot: null,
    completedCount: 0,
    totalSlots: 0,
    isCompleted: false,
    currentWeekNumber: 1,
    currentDayNumber: 1,
    weekLabel: 'Week 1',
    dayLabel: 'Day 1',
    positionLabel: 'Week 1 • Day 1',
  }

  // 1. Get active assignment
  const assignment = await getActiveProgramAssignment(supabase, clientId)
  if (!assignment) {
    return emptyState
  }

  // 2. Get slots and completions in parallel
  const [slots, completedSlots] = await Promise.all([
    getProgramScheduleSlotsForAssignment(supabase, assignment.program_id, assignment.id),
    getCompletedSlots(supabase, assignment.id),
  ])

  if (slots.length === 0) {
    return {
      ...emptyState,
      assignment,
    }
  }

  // 3. Compute next slot (instance-keyed; coach-skips count as dealt-with)
  const completedKeys = new Set(
    completedSlots.map(c => c.program_day_assignment_id).filter((id): id is string => !!id),
  )
  const nextSlot =
    slots.find(
      slot => slot.program_day_assignment_id != null && !completedKeys.has(slot.program_day_assignment_id),
    ) ?? null

  // completedCount counts real completions only (coach-skip is not a completion).
  const completedCount = completedSlots.filter(c => !isCoachSkipNote(c.notes)).length
  const totalSlots = slots.length
  const isCompleted = nextSlot === null && completedSlots.length > 0

  // 4. Derive current position from nextSlot (or last slot if completed)
  const referenceSlot = nextSlot ?? slots[slots.length - 1]
  const currentWeekNumber = referenceSlot.week_number
  const currentDayNumber = referenceSlot.day_number

  // 5. Compute day position within the week for label
  const slotsInWeek = slots.filter(s => s.week_number === currentWeekNumber)
  const dayPosition =
    slotsInWeek.findIndex(s => s.id === referenceSlot.id) + 1

  const weekLabel = `Week ${currentWeekNumber}`
  const dayLabel = `Day ${dayPosition || currentDayNumber}`
  const positionLabel = `${weekLabel} • ${dayLabel}`

  return {
    assignment,
    slots,
    completedSlots,
    nextSlot,
    completedCount,
    totalSlots,
    isCompleted,
    currentWeekNumber,
    currentDayNumber,
    weekLabel,
    dayLabel,
    positionLabel,
  }
}

// ============================================================================
// TODAY SLOT HELPER
// Pure function — no DB calls. Matches slot by day_of_week (0=Mon..6=Sun).
// Does not filter by completion. Returns null for Rest day.
// ============================================================================

/**
 * Get the slot in unlocked week that matches todayWeekday (0=Monday .. 6=Sunday).
 * `todayWeekday` MUST come from the same timezone-aware chain as train/program-week callers
 * (trainPageDataMapper.resolveTrainPageTodayWeekday, GET /api/client/program-week, coach weekly volume via
 * volumeAnalytics.getWeeklyVolume / clientTimezoneForCharts), not from naive server Date.
 * If multiple slots match (should not happen in well-formed schedule), returns first by day_number order.
 */
export function getTodaySlot(
  slots: ProgramScheduleSlot[],
  unlockedWeekMax: number,
  todayWeekday: number
): ProgramScheduleSlot | null {
  const unlockedSlots = slots.filter(s => s.week_number === unlockedWeekMax)
  return unlockedSlots.find(s => s.day_of_week === todayWeekday) ?? null
}

// ============================================================================
// OVERDUE SLOTS HELPER
// Pure function — no DB calls, no writes. Read-only projection over unlocked week.
// ============================================================================

/**
 * Get uncompleted slots in unlocked week that are "before" today (overdue).
 * - If todaySlot exists: overdue = uncompleted slots where day_number < todaySlot.day_number
 * - If todaySlot null (rest day): overdue = uncompleted slots where day_of_week < todayWeekday
 * Returns at most maxCount (default 2), ordered earliest first.
 */
export function getOverdueSlots(
  slots: ProgramScheduleSlot[],
  completedSlots: CompletedSlot[],
  unlockedWeekMax: number,
  todaySlot: ProgramScheduleSlot | null,
  todayWeekday: number,
  maxCount: number = 2
): ProgramScheduleSlot[] {
  const unlockedSlots = slots.filter(s => s.week_number === unlockedWeekMax)
  const completedKeys = new Set(
    completedSlots.map(c => c.program_day_assignment_id).filter((id): id is string => !!id),
  )
  const uncompleted = unlockedSlots.filter(
    s => s.program_day_assignment_id != null && !completedKeys.has(s.program_day_assignment_id)
  )

  let overdue: ProgramScheduleSlot[]

  if (todaySlot) {
    overdue = uncompleted.filter(s => s.day_number < todaySlot.day_number)
    overdue.sort((a, b) => a.day_number - b.day_number)
  } else {
    overdue = uncompleted.filter(s => s.day_of_week < todayWeekday)
    overdue.sort((a, b) => a.day_of_week - b.day_of_week)
  }

  return overdue.slice(0, maxCount)
}

// ============================================================================
// WEEK LOCK HELPERS
// Pure functions — no DB calls. Reused by start and complete server paths.
// ============================================================================

/**
 * Compute the max unlocked week number.
 *
 * Calendar mode (authoritative): unlock/current week is derived from
 * assignment start date and pause offsets in the client's timezone.
 * Completion no longer gates unlock.
 */
export function computeUnlockedWeekMax(
  slots: ProgramScheduleSlot[],
  _completedSlots: CompletedSlot[],
  assignment?: Partial<AssignmentWeekFields> & {
    /** N from resolver (instance phases) — caps calendar week X. */
    totalWeeksCap?: number | null
  },
  clientTimezone?: string
): number {
  if (slots.length === 0) return 1

  const capFromSlots = Math.max(...slots.map((s) => s.week_number))
  const capRaw = assignment?.totalWeeksCap
  const totalWeeksCap =
    typeof capRaw === 'number' && Number.isFinite(capRaw) && capRaw > 0
      ? Math.floor(capRaw)
      : capFromSlots
  const tz = normalizeClientTimezone(clientTimezone || assignment?.timezone_snapshot || 'UTC')
  const effectiveAssignment: AssignmentWeekFields = {
    start_date: assignment?.start_date ?? null,
    pause_accumulated_days: assignment?.pause_accumulated_days ?? 0,
    pause_status: assignment?.pause_status ?? 'active',
    paused_at: assignment?.paused_at ?? null,
    timezone_snapshot: assignment?.timezone_snapshot ?? tz,
  }

  const { week } = computeCurrentProgramWeekForAssignment(effectiveAssignment, tz, {
    totalWeeksCap,
  })
  return week
}

/**
 * Assert that a target week is unlocked (i.e. <= unlockedWeekMax).
 * Throws a structured error if the week is locked.
 *
 * @throws {{ code: 'WEEK_LOCKED', message: string, unlockedWeekMax: number }}
 */
export function assertWeekUnlocked(
  targetWeekNumber: number,
  slots: ProgramScheduleSlot[],
  completedSlots: CompletedSlot[],
  assignment?: Partial<AssignmentWeekFields> & {
    totalWeeksCap?: number | null
  },
  clientTimezone?: string
): void {
  const unlockedWeekMax = computeUnlockedWeekMax(slots, completedSlots, assignment, clientTimezone)

  if (targetWeekNumber > unlockedWeekMax) {
    const err: any = new Error(
      `Cannot access Week ${targetWeekNumber}. Complete all workouts in Week ${unlockedWeekMax} first.`
    )
    err.code = 'WEEK_LOCKED'
    err.unlockedWeekMax = unlockedWeekMax
    throw err
  }
}

// ============================================================================
// CLIENT TIMEZONE + PROGRAM LENGTH (pause / calendar helpers)
// ============================================================================

/**
 * Client IANA timezone for calendar-day math (`profiles.timezone`, else UTC).
 * Used by coach pause/resume and B.2 sanity tooling.
 */
export async function getClientIanaTimezone(
  supabase: SupabaseClient,
  clientId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', clientId)
    .maybeSingle()

  if (error) {
    console.error('[programStateService] getClientIanaTimezone:', error)
  }

  const raw = data?.timezone
  const t = typeof raw === 'string' ? raw.trim() : ''
  return t.length > 0 ? t : 'UTC'
}

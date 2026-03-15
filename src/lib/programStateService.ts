/**
 * Program State Service (Canonical Resolver)
 * 
 * SINGLE SOURCE OF TRUTH for all program state reads.
 * 
 * This service reads from:
 *   - program_assignments (active assignment)
 *   - program_schedule (ordered slots with day_number)
 *   - program_day_completions (the ledger — keyed by program_schedule_id)
 *   - program_progress (cache — derived from ledger)
 * 
 * All other services and components MUST use this service for program state.
 * Do NOT read from program_assignment_progress, program_day_assignments.is_completed,
 * or program_workout_completions directly.
 * 
 * All week/day numbers are 1-based.
 */

import { SupabaseClient } from '@supabase/supabase-js'

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
  duration_weeks: number | null
  total_days: number | null
  created_at: string
}

export interface ProgramScheduleSlot {
  id: string               // program_schedule.id
  program_id: string
  week_number: number      // 1-based week number
  day_number: number       // 1-based day number (1..7)
  day_of_week: number      // Legacy 0-based (kept for compat)
  template_id: string
  is_optional?: boolean    // Optional day (e.g. mobility) — does not block progression
}

export interface CompletedSlot {
  id: string               // program_day_completions.id
  program_assignment_id: string
  program_schedule_id: string
  completed_at: string
  completed_by: string
  notes: string | null
  // Joined from program_schedule:
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
    .select('id, program_id, client_id, name, status, start_date, duration_weeks, total_days, created_at')
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
    .select('id, program_id, client_id, name, status, start_date, duration_weeks, total_days, created_at')
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
    day_number: row.day_number ?? (row.day_of_week + 1),
  }))
}

/**
 * Get completed slots from the ledger (program_day_completions).
 * Joins program_schedule to include week_number, day_number, template_id.
 */
export async function getCompletedSlots(
  supabase: SupabaseClient,
  programAssignmentId: string
): Promise<CompletedSlot[]> {
  const { data, error } = await supabase
    .from('program_day_completions')
    .select(`
      id,
      program_assignment_id,
      program_schedule_id,
      completed_at,
      completed_by,
      notes,
      program_schedule!inner (
        week_number,
        day_number,
        day_of_week,
        template_id
      )
    `)
    .eq('program_assignment_id', programAssignmentId)
    .order('completed_at', { ascending: true })

  if (error) {
    console.error('[programStateService] Error fetching completed slots:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Flatten joined data
  return data.map((row: any) => ({
    id: row.id,
    program_assignment_id: row.program_assignment_id,
    program_schedule_id: row.program_schedule_id,
    completed_at: row.completed_at,
    completed_by: row.completed_by,
    notes: row.notes,
    week_number: row.program_schedule?.week_number,
    day_number: row.program_schedule?.day_number ?? (row.program_schedule?.day_of_week + 1),
    template_id: row.program_schedule?.template_id,
  }))
}

/**
 * Compute the next uncompleted slot.
 * = first slot in order (week_number ASC, day_number ASC) whose program_schedule.id
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
    getProgramSlots(supabase, resolvedProgramId),
    getCompletedSlots(supabase, programAssignmentId),
  ])

  const completedScheduleIds = new Set(completedSlots.map(c => c.program_schedule_id))

  // Find first uncompleted slot
  return slots.find(slot => !completedScheduleIds.has(slot.id)) ?? null
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
    getProgramSlots(supabase, assignment.program_id),
    getCompletedSlots(supabase, assignment.id),
  ])

  if (slots.length === 0) {
    return {
      ...emptyState,
      assignment,
    }
  }

  // 3. Compute next slot
  const completedScheduleIds = new Set(completedSlots.map(c => c.program_schedule_id))
  const nextSlot = slots.find(slot => !completedScheduleIds.has(slot.id)) ?? null

  const completedCount = completedSlots.length
  const totalSlots = slots.length
  const isCompleted = nextSlot === null && completedCount > 0

  // 4. Derive current position from nextSlot (or last slot if completed)
  const referenceSlot = nextSlot ?? slots[slots.length - 1]
  const currentWeekNumber = referenceSlot.week_number
  const currentDayNumber = referenceSlot.day_number

  // 5. Compute day position within the week for label
  const slotsInWeek = slots.filter(s => s.week_number === currentWeekNumber)
  const dayPosition = slotsInWeek.findIndex(s => s.id === referenceSlot.id) + 1

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
// HELPER: Ensure program_progress row is in sync with ledger
// Called after completing a workout to update the cache.
// ============================================================================

/**
 * Update program_progress cache row to reflect the current ledger state.
 * This is called by the completion pipeline, NOT by read paths.
 * 
 * @param supabaseAdmin - Admin client (bypasses RLS) since this may be called from API routes
 * @param programAssignmentId - The assignment to update
 * @param nextSlot - The next uncompleted slot (null if program is done)
 * @param lastSlot - The last slot in the program (fallback for completed programs)
 */
export async function updateProgressCache(
  supabaseAdmin: SupabaseClient,
  programAssignmentId: string,
  nextSlot: ProgramScheduleSlot | null,
  lastSlot: ProgramScheduleSlot
): Promise<void> {
  const isCompleted = nextSlot === null
  const referenceSlot = nextSlot ?? lastSlot

  const { error } = await supabaseAdmin
    .from('program_progress')
    .upsert({
      program_assignment_id: programAssignmentId,
      current_week_number: referenceSlot.week_number,
      current_day_number: referenceSlot.day_number,
      is_completed: isCompleted,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'program_assignment_id',
    })

  if (error) {
    console.error('[programStateService] Error updating progress cache:', error)
    // Non-fatal: the ledger is the source of truth, progress is just a cache
  }
}

// ============================================================================
// TODAY SLOT HELPER
// Pure function — no DB calls. Matches slot by day_of_week (0=Mon..6=Sun).
// Does not filter by completion. Returns null for Rest day.
// ============================================================================

/**
 * Get the slot in unlocked week that matches todayWeekday.
 * todayWeekday = (new Date().getDay() + 6) % 7  (0=Monday .. 6=Sunday)
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
  const completedScheduleIds = new Set(completedSlots.map(c => c.program_schedule_id))
  const uncompleted = unlockedSlots.filter(s => !completedScheduleIds.has(s.id))

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
 * - Week 1 is always unlocked.
 * - Week W+1 is unlocked only if ALL slots in week W (and all prior) are complete.
 * - The returned value is the lowest week that still has incomplete slots,
 *   i.e. the "current unlocked week" the client should be working on.
 * - If every slot is complete, returns the last week number.
 */
export function computeUnlockedWeekMax(
  slots: ProgramScheduleSlot[],
  completedSlots: CompletedSlot[]
): number {
  if (slots.length === 0) return 1

  // Distinct week numbers in ascending order
  const weekNumbers = [...new Set(slots.map(s => s.week_number))].sort((a, b) => a - b)

  const completedScheduleIds = new Set(completedSlots.map(c => c.program_schedule_id))

  for (const weekNum of weekNumbers) {
    const slotsInWeek = slots.filter(s => s.week_number === weekNum)
    const requiredSlots = slotsInWeek.filter(s => !s.is_optional)
    const allComplete =
      requiredSlots.length === 0 ||
      requiredSlots.every(s => completedScheduleIds.has(s.id))

    if (!allComplete) {
      // This week has incomplete slots — it is the current unlocked week
      return weekNum
    }
  }

  // All weeks fully complete — return the last week number
  return weekNumbers[weekNumbers.length - 1]
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
  completedSlots: CompletedSlot[]
): void {
  const unlockedWeekMax = computeUnlockedWeekMax(slots, completedSlots)

  if (targetWeekNumber > unlockedWeekMax) {
    const err: any = new Error(
      `Cannot access Week ${targetWeekNumber}. Complete all workouts in Week ${unlockedWeekMax} first.`
    )
    err.code = 'WEEK_LOCKED'
    err.unlockedWeekMax = unlockedWeekMax
    throw err
  }
}

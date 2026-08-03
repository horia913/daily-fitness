/**
 * Program Week State Builder
 *
 * Builds `ProgramWeekState` from programStateService (slots, assignment, completions).
 * Consumed by GET `/api/client/program-week` via `buildProgramWeekState`.
 * Current week (display / unlock / this-week slots) uses foundation Mon–Sun
 * getCurrentProgramWeek — not elapsed÷7 resolver — so roadmap row marker matches day cells.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeClientTimezone,
  zonedCalendarDateString,
} from '@/lib/clientZonedCalendar'
import {
  getCurrentProgramWeek,
  getEffectiveToday,
  getProgramWeekWindows,
  type PauseState,
} from '@/lib/progression/weekWindows'
import {
  getProgramState,
  getRecentlyCompletedProgramAssignment,
  computeUnlockedWeekMax,
  getTodaySlot,
  getOverdueSlots,
} from './programStateService'
import type { ProgramScheduleSlot } from './programStateService'
import { resolveInstanceWeekForAssignment } from './programInstanceResolver'

export interface ProgramWeekDayCard {
  /** program_day_assignments.id — instance schedule key for start/complete payloads */
  scheduleId: string | null
  dayNumber: number
  dayLabel: string
  dayOfWeek: number // 0=Monday, 6=Sunday
  /** Program week (1-based); required for weekWindows status / next-due. */
  weekNumber?: number
  templateId: string
  /** program_instance_workouts.id — preferred for lazy canvas load on Train. */
  instanceWorkoutId?: string | null
  workoutName: string
  estimatedDuration: number
  isCompleted: boolean
  isOptional?: boolean
}

export interface OverdueSlotCard {
  scheduleId: string | null
  dayNumber: number
  dayOfWeek: number
  dayLabel: string
  templateId: string
  workoutId: string
  workoutName: string
  estimatedDuration: number
  isCompleted: boolean
  isOptional?: boolean
}

export interface ProgramWeekState {
  hasProgram: boolean
  programName: string | null
  programId: string | null
  programAssignmentId: string | null
  currentUnlockedWeek: number
  totalWeeks: number
  unlockedWeekMax: number
  isCompleted: boolean
  days: ProgramWeekDayCard[]
  todaySlot: ProgramWeekDayCard | null
  isRestDay: boolean
  overdueSlots: OverdueSlotCard[]
  completedCount: number
  totalSlots: number
  currentWeekNumber: number
  /** Foundation Mon–Sun current week X (display / phase / roadmap row context). */
  displayWeekNumber: number
  progressionMode: 'auto' | 'coach_managed'
  isWeekCompleteAwaitingReview: boolean
  coachFeedback: { notes: string; reviewedAt: string } | null
  /** B.1 coach pause — mirrors program_assignments.pause_status */
  pauseStatus: 'active' | 'paused'
  pauseReason: string | null
  /** Assignment start_date (YYYY-MM-DD) for weekWindows foundation. */
  assignmentStartDate: string | null
  pauseAccumulatedDays: number
  pausedAt: string | null
  /** Client IANA timezone used for Mon–Sun / effective-today. */
  clientTimezone: string | null
  /**
   * Earliest in-scope incomplete with date >= effective-today (weekWindows getNextDue).
   * Null when none remain today-or-future.
   */
  nextDue: ProgramWeekDayCard | null
}

/**
 * Build program week state: days, todaySlot, isRestDay.
 * Single authority for Today resolution. Both program-week and dashboard routes call this.
 */
export async function buildProgramWeekState(
  supabase: SupabaseClient,
  clientId: string,
  todayWeekday: number
): Promise<ProgramWeekState> {
  const empty: ProgramWeekState = {
    hasProgram: false,
    programName: null,
    programId: null,
    programAssignmentId: null,
    currentUnlockedWeek: 0,
    totalWeeks: 0,
    unlockedWeekMax: 0,
    isCompleted: false,
    days: [],
    todaySlot: null,
    isRestDay: false,
    overdueSlots: [],
    completedCount: 0,
    totalSlots: 0,
    currentWeekNumber: 1,
    displayWeekNumber: 1,
    progressionMode: 'auto',
    isWeekCompleteAwaitingReview: false,
    coachFeedback: null,
    pauseStatus: 'active',
    pauseReason: null,
    assignmentStartDate: null,
    pauseAccumulatedDays: 0,
    pausedAt: null,
    clientTimezone: null,
    nextDue: null,
  }

  const state = await getProgramState(supabase, clientId)

  if (!state.assignment) {
    // No active program — check for recently completed (Fix D: show congratulations, not "No program")
    const completedAssignment = await getRecentlyCompletedProgramAssignment(supabase, clientId)
    if (completedAssignment) {
      const weekRes = await resolveInstanceWeekForAssignment(supabase, completedAssignment.id)
      const totalWeeks = weekRes?.totalWeeks && weekRes.totalWeeks > 0 ? weekRes.totalWeeks : 1
      const totalSlots = completedAssignment.total_days ?? 0
      let programName = completedAssignment.name
      if (!programName && completedAssignment.program_id) {
        const { data: program } = await supabase.from('workout_programs').select('name').eq('id', completedAssignment.program_id).maybeSingle()
        programName = program?.name ?? 'Training Program'
      } else if (!programName) {
        programName = 'Training Program'
      }
      return {
        hasProgram: true,
        programName,
        programId: completedAssignment.program_id || null,
        programAssignmentId: completedAssignment.id,
        currentUnlockedWeek: totalWeeks,
        totalWeeks,
        unlockedWeekMax: totalWeeks,
        isCompleted: true,
        days: [],
        todaySlot: null,
        isRestDay: false,
        overdueSlots: [],
        completedCount: totalSlots,
        totalSlots,
        currentWeekNumber: totalWeeks,
        displayWeekNumber: weekRes?.currentWeek ?? totalWeeks,
        progressionMode: completedAssignment.progression_mode ?? 'auto',
        isWeekCompleteAwaitingReview: false,
        coachFeedback: null,
        pauseStatus: 'active',
        pauseReason: null,
        assignmentStartDate: completedAssignment.start_date ?? null,
        pauseAccumulatedDays: completedAssignment.pause_accumulated_days ?? 0,
        pausedAt: completedAssignment.paused_at ?? null,
        clientTimezone: completedAssignment.timezone_snapshot ?? null,
        nextDue: null,
      }
    }
    return empty
  }

  // N from resolver (instance phases); X from foundation Mon–Sun windows.
  const weekNumbers = [...new Set(state.slots.map(s => s.week_number))].sort((a, b) => a - b)
  const resolved = await resolveInstanceWeekForAssignment(supabase, state.assignment.id)
  const totalWeeks =
    resolved?.totalWeeks && resolved.totalWeeks > 0 ? resolved.totalWeeks : weekNumbers.length

  const assignmentStartDate =
    typeof state.assignment.start_date === 'string' && state.assignment.start_date.trim()
      ? state.assignment.start_date.trim().slice(0, 10)
      : null
  const pauseAccumulatedDays = Math.max(
    0,
    Number(state.assignment.pause_accumulated_days) || 0,
  )
  const pausedAt = state.assignment.paused_at ?? null
  const pauseStatusRaw = state.assignment.pause_status ?? 'active'
  const pauses: PauseState = {
    accumulatedDays: pauseAccumulatedDays,
    pauseStatus: pauseStatusRaw === 'paused' ? 'paused' : 'active',
    pausedAt,
  }
  const tz =
    normalizeClientTimezone(state.assignment.timezone_snapshot) || 'UTC'

  let foundationCurrentWeek: number | null = null
  if (assignmentStartDate && totalWeeks > 0) {
    const windows = getProgramWeekWindows(
      assignmentStartDate,
      totalWeeks,
      tz,
      pauses,
    )
    const wallToday = zonedCalendarDateString(new Date(), tz)
    const effectiveTodayYmd = getEffectiveToday(wallToday, tz, pauses)
    const hit = getCurrentProgramWeek(windows, effectiveTodayYmd)
    if (hit) {
      foundationCurrentWeek = hit.weekNumber
    } else if (windows.length > 0) {
      if (effectiveTodayYmd < windows[0].mondayStart) {
        foundationCurrentWeek = 1
      } else {
        foundationCurrentWeek = windows[windows.length - 1].weekNumber
      }
    }
  }

  const unlockedWeekMax =
    foundationCurrentWeek != null && foundationCurrentWeek >= 1
      ? foundationCurrentWeek
      : resolved?.currentWeek ??
        computeUnlockedWeekMax(state.slots, state.completedSlots, {
          start_date: state.assignment?.start_date ?? null,
          pause_accumulated_days: state.assignment?.pause_accumulated_days ?? 0,
          pause_status: state.assignment?.pause_status ?? null,
          paused_at: state.assignment?.paused_at ?? null,
          timezone_snapshot: state.assignment?.timezone_snapshot ?? null,
          progression_mode: state.assignment?.progression_mode,
          coach_unlocked_week: state.assignment?.coach_unlocked_week ?? null,
          totalWeeksCap: resolved?.totalWeeks ?? null,
        })
  const displayWeekNumber = unlockedWeekMax

  const todaySlotRaw = getTodaySlot(state.slots, unlockedWeekMax, todayWeekday)
  const isRestDay = todaySlotRaw === null

  const currentWeekSlots = state.slots.filter(s => s.week_number === unlockedWeekMax)
  const completedKeys = new Set(
    state.completedSlots.map(c => c.program_day_assignment_id).filter((id): id is string => !!id),
  )
  const slotKey = (slot: ProgramScheduleSlot): string | null => slot.program_day_assignment_id ?? null

  const templateIds = [...new Set(currentWeekSlots.map(s => s.template_id).filter(Boolean))]
  let templateMap = new Map<string, { name: string; estimated_duration: number }>()

  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from('workout_templates')
      .select('id, name, estimated_duration')
      .in('id', templateIds)

    if (templates) {
      templateMap = new Map(
        templates.map(t => [t.id, { name: t.name, estimated_duration: t.estimated_duration || 0 }])
      )
    }
  }

  const toDayCard = (slot: ProgramScheduleSlot): ProgramWeekDayCard => {
    const template = templateMap.get(slot.template_id)
    return {
      scheduleId: slot.id ?? null,
      dayNumber: slot.day_number,
      dayLabel: `Day ${slot.day_number}`,
      dayOfWeek: slot.day_of_week,
      weekNumber: slot.week_number,
      templateId: slot.template_id,
      instanceWorkoutId: slot.program_instance_workout_id ?? null,
      workoutName: template?.name || 'Workout',
      estimatedDuration: template?.estimated_duration || 0,
      isCompleted: slotKey(slot) != null && completedKeys.has(slotKey(slot)!),
      isOptional: slot.is_optional ?? false,
    }
  }

  const days = currentWeekSlots.map(toDayCard)
  const todaySlot = todaySlotRaw ? toDayCard(todaySlotRaw) : null

  const overdueRaw = getOverdueSlots(
    state.slots,
    state.completedSlots,
    unlockedWeekMax,
    todaySlotRaw,
    todayWeekday,
    2
  )
  const overdueSlots: OverdueSlotCard[] = overdueRaw.map(slot => {
    const template = templateMap.get(slot.template_id)
    return {
      scheduleId: slot.id ?? null,
      dayNumber: slot.day_number,
      dayOfWeek: slot.day_of_week,
      dayLabel: `Day ${slot.day_number}`,
      templateId: slot.template_id,
      workoutId: slot.template_id,
      workoutName: template?.name || 'Workout',
      estimatedDuration: template?.estimated_duration || 0,
      isCompleted: slotKey(slot) != null && completedKeys.has(slotKey(slot)!),
      isOptional: slot.is_optional ?? false,
    }
  })

  let programName = state.assignment.name
  if (!programName && state.assignment.program_id) {
    const { data: program } = await supabase.from('workout_programs').select('name').eq('id', state.assignment.program_id).maybeSingle()
    programName = program?.name ?? 'Training Program'
  } else if (!programName) {
    programName = 'Training Program'
  }

  const progressionMode = (state.assignment.progression_mode === 'coach_managed' ? 'coach_managed' : 'auto') as 'auto' | 'coach_managed'

  // In coach_managed mode, check if all required slots in the current week are done
  const requiredCurrentWeekSlots = currentWeekSlots.filter(s => !s.is_optional)
  const allRequiredCurrentWeekComplete = requiredCurrentWeekSlots.length > 0 &&
    requiredCurrentWeekSlots.every(s => slotKey(s) != null && completedKeys.has(slotKey(s)!))
  const isWeekCompleteAwaitingReview =
    progressionMode === 'coach_managed' && allRequiredCurrentWeekComplete && !state.isCompleted

  // Fetch latest coach review notes for the current week
  let coachFeedback: { notes: string; reviewedAt: string } | null = null
  if (progressionMode === 'coach_managed' && state.assignment.id) {
    const { data: review } = await supabase
      .from('coach_week_reviews')
      .select('coach_notes, reviewed_at')
      .eq('program_assignment_id', state.assignment.id)
      .eq('week_number', unlockedWeekMax)
      .order('reviewed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (review?.coach_notes) {
      coachFeedback = { notes: review.coach_notes, reviewedAt: review.reviewed_at }
    }
  }

  const pauseStatus: 'active' | 'paused' =
    state.assignment.pause_status === 'paused' ? 'paused' : 'active'

  return {
    hasProgram: true,
    programName,
    programId: state.assignment.program_id || null,
    programAssignmentId: state.assignment.id,
    currentUnlockedWeek: unlockedWeekMax,
    totalWeeks,
    unlockedWeekMax,
    isCompleted: state.isCompleted,
    days,
    todaySlot,
    isRestDay,
    overdueSlots,
    completedCount: state.completedCount,
    totalSlots: state.totalSlots,
    currentWeekNumber: unlockedWeekMax,
    displayWeekNumber,
    progressionMode,
    isWeekCompleteAwaitingReview,
    coachFeedback,
    pauseStatus,
    pauseReason: state.assignment.pause_reason ?? null,
    assignmentStartDate: state.assignment.start_date ?? null,
    pauseAccumulatedDays: state.assignment.pause_accumulated_days ?? 0,
    pausedAt: state.assignment.paused_at ?? null,
    clientTimezone: state.assignment.timezone_snapshot ?? null,
    nextDue: null,
  }
}

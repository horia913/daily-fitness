/**
 * Maps get_train_page_data RPC response to ProgramWeekState.
 * Uses programStateService helpers for unlocked week, today slot, and overdue.
 * Schedule rows come from program_day_assignments (canonical), not RPC schedule.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProgramWeekState, ProgramWeekDayCard, OverdueSlotCard } from '@/lib/programWeekStateBuilder'
import {
  computeUnlockedWeekMax,
  getTodaySlot,
  getOverdueSlots,
  getProgramScheduleSlotsForAssignment,
  getCompletedSlots,
  type ProgramScheduleSlot,
} from './programStateService'

export interface TrainPageRpcScheduleRow {
  id: string
  week_number: number
  day_number: number
  day_of_week: number
  template_id: string
  is_optional: boolean
  template_name: string | null
  estimated_duration?: number
  exercise_count?: number
}

export interface TrainPageRpcCompletionRow {
  program_schedule_id: string
  completed_at: string
}

export interface TrainPageRpcExtraWorkoutRow {
  id: string
  template_id: string | null
  status: string
  template_name: string | null
  estimated_duration?: number
  exercise_count?: number
}

export interface TrainPageRpcResponse {
  hasProgram: boolean
  programName?: string | null
  programId?: string | null
  assignmentId?: string | null
  /** Assignment created_at — used to compute current program week start for "completed this week" filter */
  assignmentStartDate?: string | null
  durationWeeks?: number | null
  progressionMode?: string | null
  coachUnlockedWeek?: number | null
  /** Latest coach review notes for the current week (coach_managed mode) */
  coachReviewNotes?: string | null
  coachReviewDate?: string | null
  /** When RPC includes B.1 pause fields (camelCase or snake_case) */
  pauseStatus?: string | null
  pauseReason?: string | null
  pause_status?: string | null
  pause_reason?: string | null
  schedule?: TrainPageRpcScheduleRow[] | null
  completions?: TrainPageRpcCompletionRow[] | null
  extraWorkouts?: TrainPageRpcExtraWorkoutRow[] | null
}

const emptyState: ProgramWeekState = {
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
  progressionMode: 'auto',
  isWeekCompleteAwaitingReview: false,
  coachFeedback: null,
  pauseStatus: 'active',
  pauseReason: null,
}

/**
 * Start of the given program week (Monday 00:00) in local time.
 * assignmentStartDate = program_assignments.created_at (ISO string).
 * weekNumber = 1-based program week.
 */
function getWeekStartDate(assignmentStartDate: string, weekNumber: number): Date {
  const start = new Date(assignmentStartDate)
  const dayOfWeek = start.getDay() // 0 = Sunday, 1 = Monday, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  start.setDate(start.getDate() + mondayOffset)
  start.setDate(start.getDate() + (weekNumber - 1) * 7)
  start.setHours(0, 0, 0, 0)
  return start
}

/**
 * Build ProgramWeekState from get_train_page_data RPC response.
 * When hasProgram is false, returns empty state (extraWorkouts are returned separately).
 */
export async function rpcResponseToProgramWeekState(
  supabase: SupabaseClient,
  data: TrainPageRpcResponse,
  todayWeekday: number
): Promise<ProgramWeekState> {
  if (!data.hasProgram || !data.assignmentId || !data.programId) {
    return emptyState
  }

  const programId = data.programId
  const assignmentId = data.assignmentId

  const [slots, completedSlots] = await Promise.all([
    getProgramScheduleSlotsForAssignment(supabase, programId, assignmentId),
    getCompletedSlots(supabase, assignmentId),
  ])

  if (slots.length === 0) {
    return emptyState
  }

  const templateIds = [...new Set(slots.map((s) => s.template_id).filter(Boolean))]
  const templateMap = new Map<string, { name: string; estimated_duration: number }>()
  if (templateIds.length > 0) {
    const { data: tmplRows } = await supabase
      .from('workout_templates')
      .select('id, name, estimated_duration')
      .in('id', templateIds)
    for (const row of tmplRows ?? []) {
      const r = row as { id: string; name: string | null; estimated_duration: number | null }
      templateMap.set(r.id, {
        name: r.name ?? 'Workout',
        estimated_duration: r.estimated_duration ?? 0,
      })
    }
  }

  const assignmentForUnlock = {
    progression_mode: data.progressionMode ?? 'auto',
    coach_unlocked_week: data.coachUnlockedWeek ?? null,
  }
  const unlockedWeekMax = computeUnlockedWeekMax(slots, completedSlots, assignmentForUnlock)
  const todaySlotRaw = getTodaySlot(slots, unlockedWeekMax, todayWeekday)
  const isRestDay = todaySlotRaw === null

  const weekNumbers = [...new Set(slots.map((s) => s.week_number))].sort((a, b) => a - b)
  const totalWeeks = weekNumbers.length
  const currentWeekSlots = slots.filter((s) => s.week_number === unlockedWeekMax)

  // All-time: for nextSlot, isCompleted, completedCount (week unlock uses all completions)
  const completedScheduleIdsAllTime = new Set(completedSlots.map((c) => c.program_schedule_id))

  // In coach_managed mode, the client can stay on a week indefinitely — date-window
  // filtering would hide completions that happened after the calculated window expired.
  // Use all-time completions since each program_schedule_id is unique per week.
  const progressionModeRaw = data.progressionMode ?? 'auto'
  let completedScheduleIdsCurrentWeek: Set<string>
  if (progressionModeRaw === 'coach_managed') {
    completedScheduleIdsCurrentWeek = completedScheduleIdsAllTime
  } else {
    const assignmentStartDate = data.assignmentStartDate ?? null
    if (assignmentStartDate) {
      const currentWeekStart = getWeekStartDate(assignmentStartDate, unlockedWeekMax)
      const currentWeekEnd = new Date(currentWeekStart)
      currentWeekEnd.setDate(currentWeekEnd.getDate() + 7)
      completedScheduleIdsCurrentWeek = new Set(
        completedSlots
          .filter((c) => {
            const completedAt = new Date(c.completed_at)
            return completedAt >= currentWeekStart && completedAt < currentWeekEnd
          })
          .map((c) => c.program_schedule_id)
      )
    } else {
      completedScheduleIdsCurrentWeek = completedScheduleIdsAllTime
    }
  }

  const completedScheduleIds = completedScheduleIdsCurrentWeek

  const toDayCard = (slot: ProgramScheduleSlot): ProgramWeekDayCard => {
    const template = templateMap.get(slot.template_id)
    return {
      scheduleId: slot.id,
      dayNumber: slot.day_number,
      dayLabel: `Day ${slot.day_number}`,
      dayOfWeek: slot.day_of_week,
      templateId: slot.template_id,
      workoutName: template?.name ?? 'Workout',
      estimatedDuration: template?.estimated_duration ?? 0,
      isCompleted: completedScheduleIds.has(slot.id),
      isOptional: slot.is_optional ?? false,
    }
  }

  const days = currentWeekSlots.map(toDayCard)
  const todaySlot = todaySlotRaw ? toDayCard(todaySlotRaw) : null

  const overdueRaw = getOverdueSlots(
    slots,
    completedSlots,
    unlockedWeekMax,
    todaySlotRaw,
    todayWeekday,
    2
  )
  const overdueSlots: OverdueSlotCard[] = overdueRaw.map((slot) => {
    const template = templateMap.get(slot.template_id)
    return {
      scheduleId: slot.id,
      dayNumber: slot.day_number,
      dayOfWeek: slot.day_of_week,
      dayLabel: `Day ${slot.day_number}`,
      templateId: slot.template_id,
      workoutId: slot.template_id,
      workoutName: template?.name ?? 'Workout',
      estimatedDuration: template?.estimated_duration ?? 0,
      isCompleted: completedScheduleIds.has(slot.id),
      isOptional: slot.is_optional ?? false,
    }
  })

  const totalSlots = slots.length
  const completedCount = completedSlots.length
  const nextSlot = slots.find((s) => !completedScheduleIdsAllTime.has(s.id)) ?? null
  const isCompleted = nextSlot === null && completedCount > 0

  const progressionMode = (data.progressionMode === 'coach_managed' ? 'coach_managed' : 'auto') as 'auto' | 'coach_managed'

  // In coach_managed mode, check if all required slots in the current week are done
  const requiredCurrentWeekSlots = currentWeekSlots.filter(s => !s.is_optional)
  const allRequiredCurrentWeekComplete = requiredCurrentWeekSlots.length > 0 &&
    requiredCurrentWeekSlots.every(s => completedScheduleIdsAllTime.has(s.id))
  const isWeekCompleteAwaitingReview =
    progressionMode === 'coach_managed' && allRequiredCurrentWeekComplete && !isCompleted

  const coachFeedback = data.coachReviewNotes
    ? { notes: data.coachReviewNotes, reviewedAt: data.coachReviewDate ?? '' }
    : null

  const rawPause =
    data.pauseStatus ?? data.pause_status ?? 'active'
  const pauseStatus: 'active' | 'paused' =
    rawPause === 'paused' ? 'paused' : 'active'
  const pauseReason =
    data.pauseReason ?? data.pause_reason ?? null

  return {
    hasProgram: true,
    programName: data.programName ?? 'Training Program',
    programId,
    programAssignmentId: assignmentId,
    currentUnlockedWeek: unlockedWeekMax,
    totalWeeks,
    unlockedWeekMax,
    isCompleted: Boolean(isCompleted),
    days,
    todaySlot,
    isRestDay,
    overdueSlots,
    completedCount,
    totalSlots,
    currentWeekNumber: unlockedWeekMax,
    progressionMode,
    isWeekCompleteAwaitingReview,
    coachFeedback,
    pauseStatus,
    pauseReason,
  }
}

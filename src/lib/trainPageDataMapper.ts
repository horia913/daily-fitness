/**
 * Maps get_train_page_data RPC response to ProgramWeekState.
 * Uses programStateService helpers for unlocked week, today slot, and overdue.
 */

import type { ProgramWeekState, ProgramWeekDayCard, OverdueSlotCard } from '@/lib/programWeekStateBuilder'
import {
  computeUnlockedWeekMax,
  getTodaySlot,
  getOverdueSlots,
  type ProgramScheduleSlot,
  type CompletedSlot,
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
export function rpcResponseToProgramWeekState(
  data: TrainPageRpcResponse,
  todayWeekday: number
): ProgramWeekState {
  if (!data.hasProgram || !data.schedule || !data.assignmentId || !data.programId) {
    return emptyState
  }

  const programId = data.programId
  const assignmentId = data.assignmentId
  const schedule = Array.isArray(data.schedule) ? data.schedule : []
  const completions = Array.isArray(data.completions) ? data.completions : []

  const slots: ProgramScheduleSlot[] = schedule.map((s) => ({
    id: s.id,
    program_id: programId,
    week_number: s.week_number,
    day_number: s.day_number,
    day_of_week: s.day_of_week,
    template_id: s.template_id,
    is_optional: s.is_optional,
  }))

  const completedSlots: CompletedSlot[] = completions.map((c) => ({
    id: '',
    program_assignment_id: assignmentId,
    program_schedule_id: c.program_schedule_id,
    completed_at: c.completed_at,
    completed_by: '',
    notes: null,
    week_number: 0,
    day_number: 0,
    template_id: '',
  }))

  const unlockedWeekMax = computeUnlockedWeekMax(slots, completedSlots)
  const todaySlotRaw = getTodaySlot(slots, unlockedWeekMax, todayWeekday)
  const isRestDay = todaySlotRaw === null

  const weekNumbers = [...new Set(slots.map((s) => s.week_number))].sort((a, b) => a - b)
  const totalWeeks = weekNumbers.length
  const currentWeekSlots = slots.filter((s) => s.week_number === unlockedWeekMax)

  // All-time: for nextSlot, isCompleted, completedCount (week unlock uses all completions)
  const completedScheduleIdsAllTime = new Set(completedSlots.map((c) => c.program_schedule_id))

  // Current program week only: day card shows completed only if completed this week (calendar)
  const assignmentStartDate = data.assignmentStartDate ?? null
  let completedScheduleIdsCurrentWeek: Set<string>
  if (assignmentStartDate) {
    const currentWeekStart = getWeekStartDate(assignmentStartDate, unlockedWeekMax)
    const currentWeekEnd = new Date(currentWeekStart)
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 7)
    completedScheduleIdsCurrentWeek = new Set(
      completions
        .filter((c) => {
          const completedAt = new Date(c.completed_at)
          return completedAt >= currentWeekStart && completedAt < currentWeekEnd
        })
        .map((c) => c.program_schedule_id)
    )
  } else {
    completedScheduleIdsCurrentWeek = completedScheduleIdsAllTime
  }

  const completedScheduleIds = completedScheduleIdsCurrentWeek

  const templateMap = new Map<string, { name: string; estimated_duration: number }>()
  for (const s of schedule) {
    if (s.template_id) {
      templateMap.set(s.template_id, {
        name: s.template_name ?? 'Workout',
        estimated_duration: s.estimated_duration ?? 0,
      })
    }
  }

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
  }
}

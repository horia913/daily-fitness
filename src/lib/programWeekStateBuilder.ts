/**
 * Program Week State Builder
 *
 * SINGLE AUTHORITY for program-week data (days, todaySlot, isRestDay, overdueSlots).
 * Both /api/client/program-week and /api/client/dashboard MUST use this function.
 * Neither route may call programStateService directly for Today resolution.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getProgramState,
  getRecentlyCompletedProgramAssignment,
  computeUnlockedWeekMax,
  getTodaySlot,
  getOverdueSlots,
} from './programStateService'
import type { ProgramScheduleSlot } from './programStateService'

export interface ProgramWeekDayCard {
  scheduleId: string
  dayNumber: number
  dayLabel: string
  dayOfWeek: number // 0=Monday, 6=Sunday
  templateId: string
  workoutName: string
  estimatedDuration: number
  isCompleted: boolean
}

export interface OverdueSlotCard {
  scheduleId: string
  dayNumber: number
  dayOfWeek: number
  dayLabel: string
  templateId: string
  workoutId: string
  workoutName: string
  estimatedDuration: number
  isCompleted: boolean
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
  /** For dashboard program progress: completed slots count */
  completedCount: number
  /** For dashboard program progress: total schedule slots */
  totalSlots: number
  /** For dashboard program progress: current week number (1-based) */
  currentWeekNumber: number
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
  }

  const state = await getProgramState(supabase, clientId)

  if (!state.assignment) {
    // No active program — check for recently completed (Fix D: show congratulations, not "No program")
    const completedAssignment = await getRecentlyCompletedProgramAssignment(supabase, clientId)
    if (completedAssignment) {
      const totalWeeks = completedAssignment.duration_weeks ?? 1
      const totalSlots = completedAssignment.total_days ?? 0
      let programName = completedAssignment.name
      if (!programName && completedAssignment.program_id) {
        const { data: program } = await supabase.from('programs').select('name').eq('id', completedAssignment.program_id).maybeSingle()
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
      }
    }
    return empty
  }

  const unlockedWeekMax = computeUnlockedWeekMax(state.slots, state.completedSlots)
  const todaySlotRaw = getTodaySlot(state.slots, unlockedWeekMax, todayWeekday)
  const isRestDay = todaySlotRaw === null

  const weekNumbers = [...new Set(state.slots.map(s => s.week_number))].sort((a, b) => a - b)
  const totalWeeks = weekNumbers.length
  const currentWeekSlots = state.slots.filter(s => s.week_number === unlockedWeekMax)
  const completedScheduleIds = new Set(state.completedSlots.map(c => c.program_schedule_id))

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
      scheduleId: slot.id,
      dayNumber: slot.day_number,
      dayLabel: `Day ${slot.day_number}`,
      dayOfWeek: slot.day_of_week,
      templateId: slot.template_id,
      workoutName: template?.name || 'Workout',
      estimatedDuration: template?.estimated_duration || 0,
      isCompleted: completedScheduleIds.has(slot.id),
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
      scheduleId: slot.id,
      dayNumber: slot.day_number,
      dayOfWeek: slot.day_of_week,
      dayLabel: `Day ${slot.day_number}`,
      templateId: slot.template_id,
      workoutId: slot.template_id,
      workoutName: template?.name || 'Workout',
      estimatedDuration: template?.estimated_duration || 0,
      isCompleted: completedScheduleIds.has(slot.id),
    }
  })

  let programName = state.assignment.name
  if (!programName && state.assignment.program_id) {
    const { data: program } = await supabase.from('programs').select('name').eq('id', state.assignment.program_id).maybeSingle()
    programName = program?.name ?? 'Training Program'
  } else if (!programName) {
    programName = 'Training Program'
  }

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
    currentWeekNumber: state.currentWeekNumber,
  }
}

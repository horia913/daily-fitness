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
import { computeCurrentProgramWeekForAssignment } from '@/lib/programWeekCalendar'
import { isCoachSkipNote } from '@/lib/programInstanceResolver'
import {
  addCalendarDaysYmd,
  mondayYmdOfZonedWeekContaining,
  weekdayMon0Sun6InTimezone,
  zonedDayInclusiveUtcBounds,
} from '@/lib/clientZonedCalendar'
import { resolveNextDue } from '@/lib/progression/resolveNextDue'
import type { PauseState, WorkoutRef } from '@/lib/progression/weekWindows'

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
  program_day_assignment_id: string
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
  /** Assignment start date (server now returns start_date fallback, not created_at). */
  assignmentStartDate?: string | null
  currentProgramWeek?: number | null
  currentProgramWeekClamped?: boolean
  durationWeeks?: number | null
  progressionMode?: string | null
  coachUnlockedWeek?: number | null
  /** Latest coach review notes for the current week (coach_managed mode) */
  coachReviewNotes?: string | null
  coachReviewDate?: string | null
  /** When RPC includes B.1 pause fields (camelCase or snake_case) */
  pauseStatus?: string | null
  pauseAccumulatedDays?: number | null
  pausedAt?: string | null
  timezoneSnapshot?: string | null
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

/** Priority: RPC timezone_snapshot → profile timezone → UTC + warn (calendar boundaries). */
function resolveEffectiveTimezone(
  data: TrainPageRpcResponse,
  profileTimezone: string | null | undefined
): string {
  const snap = data.timezoneSnapshot?.trim()
  if (snap) return snap
  const prof = profileTimezone?.trim()
  if (prof) return prof
  console.warn(
    '[trainPageDataMapper] No timezone_snapshot or profile.timezone; using UTC for calendar boundaries',
  )
  return 'UTC'
}

/** For `get_train_page_data.p_today_weekday` before RPC returns (profile-only). */
export function computeTrainRpcWeekday(profileTimezone: string | null | undefined): number {
  const tz = profileTimezone?.trim()
  if (!tz) {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    return weekdayMon0Sun6InTimezone(new Date(), device)
  }
  return weekdayMon0Sun6InTimezone(new Date(), tz)
}

/** Monday = 0 … Sunday = 6 in client-coalesced timezone (snapshot → profile → browser + warn). */
export function resolveTrainPageTodayWeekday(
  data: TrainPageRpcResponse | null,
  profileTimezone: string | null | undefined
): number {
  if (!data?.hasProgram) {
    return computeTrainRpcWeekday(profileTimezone)
  }
  const snap = data.timezoneSnapshot?.trim()
  const prof = profileTimezone?.trim()
  const tz = snap || prof || null
  if (!tz) {
    console.warn(
      '[trainPageDataMapper] No timezone for today strip; using device timezone for weekday',
    )
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    return weekdayMon0Sun6InTimezone(new Date(), device)
  }
  return weekdayMon0Sun6InTimezone(new Date(), tz)
}

/** UTC inclusive bounds for Mon–Sun program week `derivedWeek` in `tz` (matches summary-route style week math). */
function zonedUtcBoundsForProgramWeek(
  assignmentStartDate: string,
  derivedWeek: number,
  tz: string
): { startIso: string; endIso: string } {
  const startYmd = assignmentStartDate.slice(0, 10)
  const monContaining = mondayYmdOfZonedWeekContaining(
    new Date(`${startYmd}T12:00:00.000Z`),
    tz
  )
  const weekStartYmd = addCalendarDaysYmd(monContaining, (derivedWeek - 1) * 7)
  const weekEndYmd = addCalendarDaysYmd(weekStartYmd, 6)
  const { startIso } = zonedDayInclusiveUtcBounds(weekStartYmd, tz)
  const { endIso } = zonedDayInclusiveUtcBounds(weekEndYmd, tz)
  return { startIso, endIso }
}

/**
 * Build ProgramWeekState from get_train_page_data RPC response.
 * When hasProgram is false, returns empty state (extraWorkouts are returned separately).
 * `todayWeekday` is always resolved here (timezone_snapshot → profile → device + warn) so the week strip matches unlock math.
 */
export async function rpcResponseToProgramWeekState(
  supabase: SupabaseClient,
  data: TrainPageRpcResponse,
  profileTimezone?: string | null
): Promise<{ programWeek: ProgramWeekState; todayWeekday: number }> {
  const todayWeekday = resolveTrainPageTodayWeekday(data, profileTimezone ?? null)

  if (!data.hasProgram || !data.assignmentId || !data.programId) {
    return { programWeek: emptyState, todayWeekday }
  }

  const programId = data.programId
  const assignmentId = data.assignmentId

  const [slots, completedSlots] = await Promise.all([
    getProgramScheduleSlotsForAssignment(supabase, programId, assignmentId),
    getCompletedSlots(supabase, assignmentId),
  ])

  if (slots.length === 0) {
    return { programWeek: emptyState, todayWeekday }
  }

  const tz = resolveEffectiveTimezone(data, profileTimezone ?? null)

  const rpcSlotMeta = new Map<string, { name: string; estimated_duration: number }>()
  for (const row of data.schedule ?? []) {
    if (!row.template_id) continue
    rpcSlotMeta.set(row.template_id, {
      name: row.template_name?.trim() || 'Workout',
      estimated_duration: row.estimated_duration ?? 0,
    })
  }

  const masterTemplateIds = [
    ...new Set(
      slots
        .filter((s) => s.template_id && !s.program_instance_workout_id)
        .map((s) => s.template_id),
    ),
  ]
  const instanceWorkoutIds = [
    ...new Set(
      slots
        .map((s) => s.program_instance_workout_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  const contentMetaMap = new Map<string, { name: string; estimated_duration: number }>()
  for (const [id, meta] of rpcSlotMeta) {
    contentMetaMap.set(id, meta)
  }

  const missingMasterIds = masterTemplateIds.filter((id) => !contentMetaMap.has(id))
  if (missingMasterIds.length > 0) {
    const { data: tmplRows } = await supabase
      .from('workout_templates')
      .select('id, name, estimated_duration')
      .in('id', missingMasterIds)
    for (const row of tmplRows ?? []) {
      const r = row as { id: string; name: string | null; estimated_duration: number | null }
      contentMetaMap.set(r.id, {
        name: r.name ?? 'Workout',
        estimated_duration: r.estimated_duration ?? 0,
      })
    }
  }

  const missingInstanceIds = instanceWorkoutIds.filter((id) => !contentMetaMap.has(id))
  if (missingInstanceIds.length > 0) {
    const { data: instanceRows } = await supabase
      .from('program_instance_workouts')
      .select('id, name, estimated_duration')
      .in('id', missingInstanceIds)
    for (const row of instanceRows ?? []) {
      const r = row as { id: string; name: string | null; estimated_duration: number | null }
      contentMetaMap.set(r.id, {
        name: r.name ?? 'Workout',
        estimated_duration: r.estimated_duration ?? 0,
      })
    }
  }

  const resolveSlotMeta = (slot: ProgramScheduleSlot) =>
    contentMetaMap.get(slot.template_id) ?? { name: 'Workout', estimated_duration: 0 }

  const totalWeeksCap =
    typeof data.durationWeeks === 'number' && data.durationWeeks > 0
      ? data.durationWeeks
      : null
  const assignmentForUnlock = {
    progression_mode: data.progressionMode ?? 'auto',
    start_date: data.assignmentStartDate ?? null,
    pause_accumulated_days:
      data.pauseAccumulatedDays ?? 0,
    pause_status: data.pauseStatus ?? data.pause_status ?? 'active',
    paused_at: data.pausedAt ?? null,
    timezone_snapshot: tz,
    totalWeeksCap,
  }
  const unlockedWeekMax =
    (typeof data.currentProgramWeek === 'number' && data.currentProgramWeek >= 1)
      ? data.currentProgramWeek
      : computeUnlockedWeekMax(slots, completedSlots, assignmentForUnlock, tz)
  const todaySlotRaw = getTodaySlot(slots, unlockedWeekMax, todayWeekday)
  const isRestDay = todaySlotRaw === null

  // N (total weeks) is canonical: SUM(instance phases) from the resolver,
  // surfaced via the RPC durationWeeks. Distinct slot weeks are only a fallback.
  const weekNumbers = [...new Set(slots.map((s) => s.week_number))].sort((a, b) => a - b)
  const totalWeeks =
    typeof data.durationWeeks === 'number' && data.durationWeeks > 0
      ? data.durationWeeks
      : weekNumbers.length
  const currentWeekSlots = slots.filter((s) => s.week_number === unlockedWeekMax)

  // All-time: for nextSlot, isCompleted, completedCount (week unlock uses all completions).
  // Instance-keyed (program_day_assignment_id), no master program_schedule join.
  const slotKey = (slot: ProgramScheduleSlot): string | null => slot.program_day_assignment_id ?? null
  const completedKeysAllTime = new Set(
    completedSlots.map((c) => c.program_day_assignment_id).filter((id): id is string => !!id),
  )

  // In coach_managed mode, the client can stay on a week indefinitely — date-window
  // filtering would hide completions that happened after the calculated window expired.
  // Use all-time completions since each instance slot is unique per week.
  const progressionModeRaw = data.progressionMode ?? 'auto'
  let completedKeysCurrentWeek: Set<string>
  const derivedWeek = computeCurrentProgramWeekForAssignment(
    {
      start_date: data.assignmentStartDate ?? null,
      pause_accumulated_days: data.pauseAccumulatedDays ?? 0,
      pause_status: data.pauseStatus ?? data.pause_status ?? null,
      paused_at: data.pausedAt ?? null,
      timezone_snapshot: tz,
    },
    tz,
    { totalWeeksCap },
  ).week
  if (progressionModeRaw === 'coach_managed') {
    completedKeysCurrentWeek = completedKeysAllTime
  } else if (data.assignmentStartDate) {
    const { startIso, endIso } = zonedUtcBoundsForProgramWeek(
      data.assignmentStartDate,
      derivedWeek,
      tz
    )
    completedKeysCurrentWeek = new Set(
      completedSlots
        .filter((c) => c.completed_at >= startIso && c.completed_at <= endIso)
        .map((c) => c.program_day_assignment_id)
        .filter((id): id is string => !!id)
    )
  } else {
    completedKeysCurrentWeek = completedKeysAllTime
  }

  const completedKeys = completedKeysCurrentWeek

  const toDayCard = (slot: ProgramScheduleSlot): ProgramWeekDayCard => {
    const meta = resolveSlotMeta(slot)
    return {
      scheduleId: slot.id ?? null,
      dayNumber: slot.day_number,
      dayLabel: `Day ${slot.day_number}`,
      dayOfWeek: slot.day_of_week,
      weekNumber: slot.week_number,
      templateId: slot.template_id,
      instanceWorkoutId: slot.program_instance_workout_id ?? null,
      workoutName: meta.name,
      estimatedDuration: meta.estimated_duration,
      isCompleted: slotKey(slot) != null && completedKeys.has(slotKey(slot)!),
      isOptional: slot.is_optional ?? false,
    }
  }

  /** All-time done flag for next-due (not current-week completion window). */
  const toDayCardAllTimeDone = (slot: ProgramScheduleSlot): ProgramWeekDayCard => {
    const meta = resolveSlotMeta(slot)
    return {
      scheduleId: slot.id ?? null,
      dayNumber: slot.day_number,
      dayLabel: `Day ${slot.day_number}`,
      dayOfWeek: slot.day_of_week,
      weekNumber: slot.week_number,
      templateId: slot.template_id,
      instanceWorkoutId: slot.program_instance_workout_id ?? null,
      workoutName: meta.name,
      estimatedDuration: meta.estimated_duration,
      isCompleted: slotKey(slot) != null && completedKeysAllTime.has(slotKey(slot)!),
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
    const meta = resolveSlotMeta(slot)
    return {
      scheduleId: slot.id ?? null,
      dayNumber: slot.day_number,
      dayOfWeek: slot.day_of_week,
      dayLabel: `Day ${slot.day_number}`,
      templateId: slot.template_id,
      workoutId: slot.template_id,
      workoutName: meta.name,
      estimatedDuration: meta.estimated_duration,
      isCompleted: slotKey(slot) != null && completedKeys.has(slotKey(slot)!),
      isOptional: slot.is_optional ?? false,
    }
  })

  const totalSlots = slots.length
  const completedCount = completedSlots.filter((c) => !isCoachSkipNote(c.notes)).length
  const nextSlot =
    slots.find((s) => slotKey(s) != null && !completedKeysAllTime.has(slotKey(s)!)) ?? null
  const isCompleted = nextSlot === null && completedSlots.length > 0

  const progressionMode = (data.progressionMode === 'coach_managed' ? 'coach_managed' : 'auto') as 'auto' | 'coach_managed'

  // In coach_managed mode, check if all required slots in the current week are done
  const requiredCurrentWeekSlots = currentWeekSlots.filter(s => !s.is_optional)
  const allRequiredCurrentWeekComplete = requiredCurrentWeekSlots.length > 0 &&
    requiredCurrentWeekSlots.every(
      (s) => slotKey(s) != null && completedKeysAllTime.has(slotKey(s)!),
    )
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

  const assignmentStartDate =
    typeof data.assignmentStartDate === 'string' && data.assignmentStartDate.trim()
      ? data.assignmentStartDate.trim().slice(0, 10)
      : null
  const pauseAccumulatedDays = Math.max(0, Number(data.pauseAccumulatedDays) || 0)
  const pausedAt = data.pausedAt ?? null

  let nextDue: ProgramWeekDayCard | null = null
  if (assignmentStartDate && totalWeeks > 0) {
    const pauses: PauseState = {
      accumulatedDays: pauseAccumulatedDays,
      pauseStatus,
      pausedAt,
    }
    const workoutRefs: WorkoutRef[] = slots
      .filter((s) => Boolean(s.template_id || s.program_instance_workout_id))
      .map((s) => ({
        id: s.id ?? undefined,
        weekNumber: s.week_number,
        programDay: s.day_number,
        isDone: slotKey(s) != null && completedKeysAllTime.has(slotKey(s)!),
      }))
    const { nextDue: due } = resolveNextDue({
      startDate: assignmentStartDate,
      totalWeeks,
      timeZone: tz,
      pauses,
      workouts: workoutRefs,
    })
    if (due?.id) {
      const slot = slots.find((s) => s.id === due.id)
      if (slot) nextDue = toDayCardAllTimeDone(slot)
    }
  }

  return {
    programWeek: {
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
      displayWeekNumber:
        typeof data.currentProgramWeek === 'number' && data.currentProgramWeek >= 1
          ? data.currentProgramWeek
          : unlockedWeekMax,
      progressionMode,
      isWeekCompleteAwaitingReview,
      coachFeedback,
      pauseStatus,
      pauseReason,
      assignmentStartDate,
      pauseAccumulatedDays,
      pausedAt,
      clientTimezone: tz,
      nextDue,
    },
    todayWeekday,
  }
}

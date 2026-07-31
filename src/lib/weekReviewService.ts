/**
 * Week Review Service
 *
 * Provides prescribed-vs-actual comparison data for the coach week review modal.
 * Prescribed values are assembled from program instance workouts (not cppr).
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { getAssignmentSchedule } from '@/lib/programStateService'
import { loadWorkoutBlocksByContentId } from '@/lib/loadWorkoutBlocksByContentId'
import type { WorkoutSetEntry } from '@/types/workoutSetEntries'

// ============================================================================
// Interfaces
// ============================================================================

export type ExerciseComparisonStatus = 'on_target' | 'exceeded' | 'under' | 'no_data'

export interface PrescribedData {
  sets: number | null
  reps: string | null
  weightKg: number | null
  rir: number | null
}

export interface ActualData {
  setsCompleted: number
  avgWeight: number
  totalReps: number
  avgReps: number
}

export interface ExerciseComparison {
  exerciseId: string
  exerciseName: string
  blockType: string | null
  prescribed: PrescribedData
  actual: ActualData
  status: ExerciseComparisonStatus
}

export interface DayReview {
  scheduleId: string
  dayLabel: string
  workoutName: string
  exercises: ExerciseComparison[]
}

export interface WeekReviewSummary {
  totalVolume: number
  previousWeekVolume: number | null
  exercisesOnTarget: number
  exercisesExceeded: number
  exercisesUnder: number
  totalExercises: number
}

export interface WeekReviewData {
  weekNumber: number
  completedDays: number
  totalRequiredDays: number
  days: DayReview[]
  summary: WeekReviewSummary
}

type SlotPrescribedMap = Map<
  string,
  { prescribed: PrescribedData; blockType: string | null }
>

// ============================================================================
// Instance prescribed assembly
// ============================================================================

function prescribedFromBlockExercise(
  block: WorkoutSetEntry,
  ex: NonNullable<WorkoutSetEntry['exercises']>[number],
): PrescribedData {
  return {
    sets: ex.sets ?? block.total_sets ?? null,
    reps: ex.reps != null ? String(ex.reps) : null,
    weightKg: ex.weight_kg != null ? Number(ex.weight_kg) : null,
    rir: ex.rir ?? null,
  }
}

function prescribedMapFromBlocks(blocks: WorkoutSetEntry[]): SlotPrescribedMap {
  const result: SlotPrescribedMap = new Map()
  const ordered = [...blocks].sort((a, b) => (a.set_order ?? 0) - (b.set_order ?? 0))
  for (const block of ordered) {
    const blockType = block.set_type ?? null
    for (const ex of block.exercises ?? []) {
      if (!ex.exercise_id || result.has(ex.exercise_id)) continue
      result.set(ex.exercise_id, {
        prescribed: prescribedFromBlockExercise(block, ex),
        blockType,
      })
    }
  }
  return result
}

async function loadInstanceWorkoutNames(
  supabase: SupabaseClient,
  instanceWorkoutIds: string[],
): Promise<Map<string, string>> {
  if (instanceWorkoutIds.length === 0) return new Map()
  const { data } = await supabase
    .from('program_instance_workouts')
    .select('id, name')
    .in('id', instanceWorkoutIds)
  return new Map((data ?? []).map((row) => [row.id, row.name]))
}

/** Per program_day_assignment id → prescribed exercises for that slot's instance workout. */
async function getInstancePrescribedBySlotForWeek(
  supabase: SupabaseClient,
  programAssignmentId: string,
  weekNumber: number,
): Promise<Map<string, SlotPrescribedMap>> {
  const schedule = await getAssignmentSchedule(supabase, programAssignmentId)
  const weekSlots = schedule.filter((s) => s.week_number === weekNumber)
  const blocksCache = new Map<string, WorkoutSetEntry[]>()
  const bySlot = new Map<string, SlotPrescribedMap>()

  await Promise.all(
    weekSlots.map(async (slot) => {
      const instanceWorkoutId = slot.program_instance_workout_id
      if (!instanceWorkoutId || slot.day_type === 'rest') {
        bySlot.set(slot.id, new Map())
        return
      }
      if (!blocksCache.has(instanceWorkoutId)) {
        const blocks = await loadWorkoutBlocksByContentId(supabase, instanceWorkoutId, {
          preferInstance: true,
        })
        blocksCache.set(instanceWorkoutId, blocks)
      }
      bySlot.set(slot.id, prescribedMapFromBlocks(blocksCache.get(instanceWorkoutId) ?? []))
    }),
  )

  return bySlot
}

// ============================================================================
// Actual data loader
// ============================================================================

interface RawSetLog {
  exercise_id: string | null
  weight: number | null
  reps: number | null
  block_type: string | null
}

async function getActualForDayAssignment(
  supabase: SupabaseClient,
  programAssignmentId: string,
  dayAssignmentId: string,
): Promise<Map<string, { sets: RawSetLog[] }>> {
  return getActualForWeek(supabase, programAssignmentId, [dayAssignmentId])
}

async function getActualForWeek(
  supabase: SupabaseClient,
  programAssignmentId: string,
  dayAssignmentIds: string[],
): Promise<Map<string, { sets: RawSetLog[] }>> {
  if (dayAssignmentIds.length === 0) return new Map()

  const { data: logs } = await supabase
    .from('workout_logs')
    .select('id')
    .eq('program_assignment_id', programAssignmentId)
    .in('program_day_assignment_id', dayAssignmentIds)
    .not('completed_at', 'is', null)

  if (!logs || logs.length === 0) return new Map()

  const logIds = logs.map((l) => l.id)

  const { data: setLogs } = await supabase
    .from('workout_set_logs')
    .select('exercise_id, weight, reps, block_type')
    .in('workout_log_id', logIds)

  const byExercise = new Map<string, { sets: RawSetLog[] }>()
  if (setLogs) {
    for (const s of setLogs) {
      if (!s.exercise_id) continue
      const entry = byExercise.get(s.exercise_id) ?? { sets: [] }
      entry.sets.push(s)
      byExercise.set(s.exercise_id, entry)
    }
  }

  return byExercise
}

// ============================================================================
// Comparison logic
// ============================================================================

function computeActualData(sets: RawSetLog[]): ActualData {
  const setsCompleted = sets.length
  const weights = sets.filter((s) => s.weight != null).map((s) => Number(s.weight))
  const reps = sets.filter((s) => s.reps != null).map((s) => s.reps!)

  return {
    setsCompleted,
    avgWeight:
      weights.length > 0
        ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10
        : 0,
    totalReps: reps.reduce((a, b) => a + b, 0),
    avgReps:
      reps.length > 0
        ? Math.round((reps.reduce((a, b) => a + b, 0) / reps.length) * 10) / 10
        : 0,
  }
}

function compareStatus(prescribed: PrescribedData, actual: ActualData): ExerciseComparisonStatus {
  if (actual.setsCompleted === 0) return 'no_data'

  if (prescribed.weightKg != null && prescribed.weightKg > 0 && actual.avgWeight > 0) {
    const ratio = actual.avgWeight / prescribed.weightKg
    if (ratio > 1.05) return 'exceeded'
    if (ratio < 0.95) return 'under'
    return 'on_target'
  }

  const prescribedReps = parseRepTarget(prescribed.reps)
  if (prescribedReps != null && prescribedReps > 0 && actual.avgReps > 0) {
    const ratio = actual.avgReps / prescribedReps
    if (ratio > 1.05) return 'exceeded'
    if (ratio < 0.95) return 'under'
    return 'on_target'
  }

  return 'on_target'
}

function parseRepTarget(reps: string | null): number | null {
  if (!reps) return null
  const match = reps.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

function buildDayExercises(
  prescribed: SlotPrescribedMap,
  actual: Map<string, { sets: RawSetLog[] }>,
  exerciseNames: Map<string, string>,
): ExerciseComparison[] {
  const exercises: ExerciseComparison[] = []

  for (const [exId, prescribedEntry] of prescribed.entries()) {
    const actualSets = actual.get(exId)
    const actualData = actualSets
      ? computeActualData(actualSets.sets)
      : { setsCompleted: 0, avgWeight: 0, totalReps: 0, avgReps: 0 }
    exercises.push({
      exerciseId: exId,
      exerciseName: exerciseNames.get(exId) ?? 'Unknown Exercise',
      blockType: prescribedEntry.blockType,
      prescribed: prescribedEntry.prescribed,
      actual: actualData,
      status: compareStatus(prescribedEntry.prescribed, actualData),
    })
  }

  for (const [exId, actualEntry] of actual.entries()) {
    if (!prescribed.has(exId)) {
      const actualData = computeActualData(actualEntry.sets)
      exercises.push({
        exerciseId: exId,
        exerciseName: exerciseNames.get(exId) ?? 'Unknown Exercise',
        blockType: null,
        prescribed: { sets: null, reps: null, weightKg: null, rir: null },
        actual: actualData,
        status: 'no_data',
      })
    }
  }

  return exercises
}

// ============================================================================
// Main: getWeekReview
// ============================================================================

export async function getWeekReview(
  supabase: SupabaseClient,
  programAssignmentId: string,
  _programId: string,
  weekNumber: number,
): Promise<WeekReviewData> {
  const schedule = await getAssignmentSchedule(supabase, programAssignmentId)
  const weekSlots = schedule.filter((s) => s.week_number === weekNumber)
  const requiredSlots = weekSlots.filter((s) => !s.is_optional)
  const dayAssignmentIds = weekSlots.map((s) => s.id)

  const { data: completions } = await supabase
    .from('program_day_completions')
    .select('program_day_assignment_id')
    .eq('program_assignment_id', programAssignmentId)
    .in('program_day_assignment_id', dayAssignmentIds)

  const completedIds = new Set((completions ?? []).map((c) => c.program_day_assignment_id))

  const [prescribedBySlot, instanceNames, actualBySlot] = await Promise.all([
    getInstancePrescribedBySlotForWeek(supabase, programAssignmentId, weekNumber),
    loadInstanceWorkoutNames(
      supabase,
      [
        ...new Set(
          weekSlots
            .map((s) => s.program_instance_workout_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ],
    ),
    Promise.all(
      weekSlots.map(async (slot) => ({
        slotId: slot.id,
        actual: await getActualForDayAssignment(supabase, programAssignmentId, slot.id),
      })),
    ),
  ])

  const actualMap = new Map(actualBySlot.map((row) => [row.slotId, row.actual]))

  const allExerciseIds = new Set<string>()
  for (const slotMap of prescribedBySlot.values()) {
    for (const exId of slotMap.keys()) allExerciseIds.add(exId)
  }
  for (const actual of actualMap.values()) {
    for (const exId of actual.keys()) allExerciseIds.add(exId)
  }

  let exerciseNames = new Map<string, string>()
  if (allExerciseIds.size > 0) {
    const { data: exercises } = await supabase
      .from('exercises')
      .select('id, name')
      .in('id', [...allExerciseIds])
    if (exercises) {
      exerciseNames = new Map(exercises.map((e) => [e.id, e.name]))
    }
  }

  const days: DayReview[] = weekSlots.map((slot) => {
    const isCompleted = completedIds.has(slot.id)
    const prescribed = prescribedBySlot.get(slot.id) ?? new Map()
    const actual = actualMap.get(slot.id) ?? new Map()

    const instanceWorkoutId = slot.program_instance_workout_id
    const workoutName =
      (instanceWorkoutId ? instanceNames.get(instanceWorkoutId) : null) ||
      slot.name?.trim() ||
      (slot.day_type === 'rest' ? 'Rest day' : 'Workout')

    return {
      scheduleId: slot.id,
      dayLabel: `Day ${slot.day_number}${isCompleted ? '' : ' (incomplete)'}`,
      workoutName,
      exercises: buildDayExercises(prescribed, actual, exerciseNames),
    }
  })

  let totalVolume = 0
  let exercisesOnTarget = 0
  let exercisesExceeded = 0
  let exercisesUnder = 0
  let totalExercises = 0

  for (const day of days) {
    for (const ex of day.exercises) {
      totalExercises++
      totalVolume += ex.actual.avgWeight * ex.actual.totalReps
      if (ex.status === 'on_target') exercisesOnTarget++
      if (ex.status === 'exceeded') exercisesExceeded++
      if (ex.status === 'under') exercisesUnder++
    }
  }

  let previousWeekVolume: number | null = null
  if (weekNumber > 1) {
    const prevDayAssignmentIds = schedule
      .filter((s) => s.week_number === weekNumber - 1)
      .map((s) => s.id)

    if (prevDayAssignmentIds.length > 0) {
      const prevActual = await getActualForWeek(supabase, programAssignmentId, prevDayAssignmentIds)
      let vol = 0
      for (const entry of prevActual.values()) {
        const d = computeActualData(entry.sets)
        vol += d.avgWeight * d.totalReps
      }
      if (vol > 0) previousWeekVolume = Math.round(vol)
    }
  }

  return {
    weekNumber,
    completedDays: completedIds.size,
    totalRequiredDays: requiredSlots.length,
    days,
    summary: {
      totalVolume: Math.round(totalVolume),
      previousWeekVolume,
      exercisesOnTarget,
      exercisesExceeded,
      exercisesUnder,
      totalExercises,
    },
  }
}

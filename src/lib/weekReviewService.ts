/**
 * Week Review Service
 *
 * Provides prescribed-vs-actual comparison data and auto-suggest adjustments
 * for the coach week review modal.
 */

import { SupabaseClient } from '@supabase/supabase-js'

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

export interface SuggestedAdjustment {
  ruleId: string | null
  exerciseId: string
  exerciseName: string
  currentWeightKg: number | null
  suggestedWeightKg: number | null
  currentReps: string | null
  suggestedReps: string | null
  currentSets: number | null
  suggestedSets: number | null
  reason: string
}

// ============================================================================
// Prescribed data loader
// ============================================================================

async function getPrescribedForWeek(
  supabase: SupabaseClient,
  programAssignmentId: string,
  programId: string,
  weekNumber: number,
): Promise<Map<string, { ruleId: string | null; prescribed: PrescribedData; blockType: string | null }>> {
  const result = new Map<string, { ruleId: string | null; prescribed: PrescribedData; blockType: string | null }>()

  // Client-specific rules first (override)
  const { data: clientRules } = await supabase
    .from('client_program_progression_rules')
    .select('id, exercise_id, sets, reps, weight_kg, rir, block_type')
    .eq('program_assignment_id', programAssignmentId)
    .eq('week_number', weekNumber)

  if (clientRules) {
    for (const r of clientRules) {
      if (r.exercise_id) {
        result.set(r.exercise_id, {
          ruleId: r.id,
          prescribed: { sets: r.sets, reps: r.reps, weightKg: r.weight_kg != null ? Number(r.weight_kg) : null, rir: r.rir },
          blockType: r.block_type,
        })
      }
    }
  }

  // Fill gaps with master program rules
  const { data: masterRules } = await supabase
    .from('program_progression_rules')
    .select('id, exercise_id, sets, reps, weight_kg, rir, block_type')
    .eq('program_id', programId)
    .eq('week_number', weekNumber)

  if (masterRules) {
    for (const r of masterRules) {
      if (r.exercise_id && !result.has(r.exercise_id)) {
        result.set(r.exercise_id, {
          ruleId: null,
          prescribed: { sets: r.sets, reps: r.reps, weightKg: r.weight_kg != null ? Number(r.weight_kg) : null, rir: r.rir },
          blockType: r.block_type,
        })
      }
    }
  }

  return result
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

async function getActualForWeek(
  supabase: SupabaseClient,
  programAssignmentId: string,
  scheduleIds: string[],
): Promise<Map<string, { sets: RawSetLog[] }>> {
  if (scheduleIds.length === 0) return new Map()

  const { data: logs } = await supabase
    .from('workout_logs')
    .select('id')
    .eq('program_assignment_id', programAssignmentId)
    .in('program_schedule_id', scheduleIds)
    .not('completed_at', 'is', null)

  if (!logs || logs.length === 0) return new Map()

  const logIds = logs.map(l => l.id)

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
  const weights = sets.filter(s => s.weight != null).map(s => Number(s.weight))
  const reps = sets.filter(s => s.reps != null).map(s => s.reps!)

  return {
    setsCompleted,
    avgWeight: weights.length > 0 ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10 : 0,
    totalReps: reps.reduce((a, b) => a + b, 0),
    avgReps: reps.length > 0 ? Math.round((reps.reduce((a, b) => a + b, 0) / reps.length) * 10) / 10 : 0,
  }
}

function compareStatus(prescribed: PrescribedData, actual: ActualData): ExerciseComparisonStatus {
  if (actual.setsCompleted === 0) return 'no_data'

  // Weight-based comparison when both are available
  if (prescribed.weightKg != null && prescribed.weightKg > 0 && actual.avgWeight > 0) {
    const ratio = actual.avgWeight / prescribed.weightKg
    if (ratio > 1.05) return 'exceeded'
    if (ratio < 0.95) return 'under'
    return 'on_target'
  }

  // Rep-based comparison
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

// ============================================================================
// Main: getWeekReview
// ============================================================================

export async function getWeekReview(
  supabase: SupabaseClient,
  programAssignmentId: string,
  programId: string,
  weekNumber: number,
): Promise<WeekReviewData> {
  // Get schedule slots for this week
  const { data: scheduleSlots } = await supabase
    .from('program_schedule')
    .select('id, week_number, day_number, day_of_week, template_id, is_optional')
    .eq('program_id', programId)
    .eq('week_number', weekNumber)
    .order('day_number', { ascending: true })

  const slots = scheduleSlots ?? []
  const requiredSlots = slots.filter(s => !s.is_optional)
  const scheduleIds = slots.map(s => s.id)

  // Get completions for this week
  const { data: completions } = await supabase
    .from('program_day_completions')
    .select('program_schedule_id')
    .eq('program_assignment_id', programAssignmentId)
    .in('program_schedule_id', scheduleIds)

  const completedIds = new Set((completions ?? []).map(c => c.program_schedule_id))

  // Load prescribed and actual data
  const [prescribed, actual] = await Promise.all([
    getPrescribedForWeek(supabase, programAssignmentId, programId, weekNumber),
    getActualForWeek(supabase, programAssignmentId, scheduleIds),
  ])

  // Get exercise names
  const allExerciseIds = new Set<string>([...prescribed.keys(), ...actual.keys()])
  let exerciseNames = new Map<string, string>()
  if (allExerciseIds.size > 0) {
    const { data: exercises } = await supabase
      .from('exercises')
      .select('id, name')
      .in('id', [...allExerciseIds])
    if (exercises) {
      exerciseNames = new Map(exercises.map(e => [e.id, e.name]))
    }
  }

  // Get template names for each slot
  const templateIds = [...new Set(slots.map(s => s.template_id).filter(Boolean))]
  let templateNames = new Map<string, string>()
  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from('workout_templates')
      .select('id, name')
      .in('id', templateIds)
    if (templates) {
      templateNames = new Map(templates.map(t => [t.id, t.name]))
    }
  }

  // Build per-day review
  const days: DayReview[] = slots.map(slot => {
    const isCompleted = completedIds.has(slot.id)
    const exercises: ExerciseComparison[] = []

    for (const [exId, prescribedEntry] of prescribed.entries()) {
      const actualSets = actual.get(exId)
      const actualData = actualSets ? computeActualData(actualSets.sets) : { setsCompleted: 0, avgWeight: 0, totalReps: 0, avgReps: 0 }
      const status = compareStatus(prescribedEntry.prescribed, actualData)

      exercises.push({
        exerciseId: exId,
        exerciseName: exerciseNames.get(exId) ?? 'Unknown Exercise',
        blockType: prescribedEntry.blockType,
        prescribed: prescribedEntry.prescribed,
        actual: actualData,
        status,
      })
    }

    // Add exercises that appear in actual but not prescribed
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

    return {
      scheduleId: slot.id,
      dayLabel: `Day ${slot.day_number}${isCompleted ? '' : ' (incomplete)'}`,
      workoutName: templateNames.get(slot.template_id) ?? 'Workout',
      exercises,
    }
  })

  // Summary
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

  // Previous week volume (optional)
  let previousWeekVolume: number | null = null
  if (weekNumber > 1) {
    const prevScheduleIds = (await supabase
      .from('program_schedule')
      .select('id')
      .eq('program_id', programId)
      .eq('week_number', weekNumber - 1)
    ).data?.map(s => s.id) ?? []

    if (prevScheduleIds.length > 0) {
      const prevActual = await getActualForWeek(supabase, programAssignmentId, prevScheduleIds)
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

// ============================================================================
// Auto-suggest adjustments for next week
// ============================================================================

export async function suggestAdjustments(
  supabase: SupabaseClient,
  programAssignmentId: string,
  programId: string,
  currentWeek: number,
  reviewData: WeekReviewData,
): Promise<SuggestedAdjustment[]> {
  const nextWeek = currentWeek + 1

  // Get existing rules for next week (client-specific or master)
  const nextWeekRules = await getPrescribedForWeek(supabase, programAssignmentId, programId, nextWeek)

  const suggestions: SuggestedAdjustment[] = []

  for (const day of reviewData.days) {
    for (const ex of day.exercises) {
      const nextRule = nextWeekRules.get(ex.exerciseId)
      const currentWeight = ex.prescribed.weightKg
      const currentReps = ex.prescribed.reps
      const currentSets = ex.prescribed.sets

      let suggestedWeightKg = nextRule?.prescribed.weightKg ?? currentWeight
      let suggestedReps = nextRule?.prescribed.reps ?? currentReps
      let suggestedSets = nextRule?.prescribed.sets ?? currentSets
      let reason = ''

      if (ex.status === 'exceeded') {
        if (currentWeight != null && currentWeight > 0) {
          const increment = currentWeight >= 100 ? Math.round(currentWeight * 0.05 * 2) / 2 : 2.5
          suggestedWeightKg = Math.round((currentWeight + increment) * 2) / 2
          reason = `Exceeded target — suggest +${increment} kg`
        } else {
          reason = 'Exceeded target — consider increasing load'
        }
      } else if (ex.status === 'on_target') {
        reason = 'On target — maintain or progress slightly'
      } else if (ex.status === 'under') {
        if (currentWeight != null && currentWeight > 0) {
          suggestedWeightKg = currentWeight
          reason = 'Under target — hold weight, focus on completing prescribed reps'
        } else {
          reason = 'Under target — keep same parameters'
        }
      } else {
        reason = 'No data available'
      }

      suggestions.push({
        ruleId: nextRule?.ruleId ?? null,
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        currentWeightKg: currentWeight,
        suggestedWeightKg,
        currentReps,
        suggestedReps,
        currentSets,
        suggestedSets,
        reason,
      })
    }
  }

  return suggestions
}

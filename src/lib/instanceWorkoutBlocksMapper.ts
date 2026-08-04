/**
 * Map program instance workout canvas (get_instance_workout_canvas) to legacy
 * WorkoutSetEntry[] for the workout start page and train preview.
 */

import type { WorkoutSetEntry } from '@/types/workoutSetEntries'
import type { CanvasGroup, CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import { adaptBlockRowToLegacy } from '@/lib/groupModel/adaptBlockRow'
import { deriveSetType } from '@/lib/groupModel/deriveSetType'

function canvasGroupToSetEntry(group: CanvasGroup, templateId: string): WorkoutSetEntry {
  const slotsLite = group.slots.map((s) => ({
    measurement: s.measurement,
    technique: s.technique,
  }))
  const setType = deriveSetType(
    { rounds_driver: group.rounds_driver, total_sets: group.total_sets ?? null },
    slotsLite,
  )

  const blockRow: Record<string, unknown> = {
    id: group.id,
    template_id: templateId,
    set_order: group.set_order,
    set_type: setType,
    rounds_driver: group.rounds_driver,
    total_sets: group.total_sets,
    rest_seconds: group.rest_seconds,
    duration_seconds: group.duration_seconds,
    interval_seconds: group.interval_seconds,
    time_cap_seconds: group.time_cap_seconds,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const slotRows = group.slots.map((slot) => {
    // firstRx remains the exercise-level scalar fallback; full prescriptions[]
    // is carried through for per-set row targets on the execution screen.
    const firstRx = slot.prescriptions?.[0]
    return {
      id: slot.id,
      set_entry_id: group.id,
      exercise_id: slot.exercise_id,
      exercise_order: slot.exercise_order,
      measurement: slot.measurement,
      technique: slot.technique,
      sets: group.total_sets,
      reps: firstRx?.reps ?? undefined,
      weight_kg: firstRx?.weight_kg ?? undefined,
      load_percentage: firstRx?.load_percentage ?? undefined,
      // Legacy WorkoutSetEntryExercise still exposes prescribed effort as `rir`
      // until Phase 2 client rename; canvas Prescription field is `rpe`.
      rir: firstRx?.rpe ?? undefined,
      tempo: firstRx?.tempo ?? undefined,
      rest_seconds: slot.rest_seconds,
      notes: slot.notes,
      work_seconds: firstRx?.work_seconds ?? undefined,
      distance_meters: firstRx?.distance_meters ?? undefined,
      target_time_seconds: slot.target_time_seconds,
      target_pace_seconds_per_km: slot.target_pace_seconds_per_km,
      target_speed_pct: slot.target_speed_pct,
      hr_zone: slot.hr_zone,
      target_hr_pct: slot.target_hr_pct,
      drop_percentage: slot.drop_percentage,
      max_drops: slot.max_drops,
      reps_per_cluster: slot.reps_per_cluster,
      clusters_per_set: slot.clusters_per_set,
      intra_cluster_rest_seconds: slot.intra_cluster_rest_seconds,
      rest_pause_seconds: slot.rest_pause_seconds,
      max_rest_pauses: slot.max_rest_pauses,
      exercise: slot.exercise,
      prescriptions: slot.prescriptions,
    }
  })

  return adaptBlockRowToLegacy(blockRow, slotRows)
}

export function mapInstanceCanvasToSetEntries(canvas: CanvasWorkout): WorkoutSetEntry[] {
  return [...canvas.groups]
    .sort((a, b) => a.set_order - b.set_order)
    .map((g) => canvasGroupToSetEntry(g, canvas.id))
}

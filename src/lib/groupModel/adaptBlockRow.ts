import type { WorkoutSetEntry } from '@/types/workoutSetEntries'
import { toLegacyBlockShape } from './toLegacyBlockShape'
import type { GroupModelEntry, GroupModelSlot, RoundsDriver } from './types'

function inferRoundsDriver(setType: string | undefined, stored: unknown): RoundsDriver {
  if (stored === 'fixed' || stored === 'amrap' || stored === 'interval' || stored === 'for_time') {
    return stored
  }
  if (setType === 'amrap') return 'amrap'
  if (setType === 'emom') return 'interval'
  if (setType === 'for_time') return 'for_time'
  return 'fixed'
}

function rowToSlot(row: Record<string, unknown>): GroupModelSlot {
  return {
    id: String(row.id),
    set_entry_id: String(row.set_entry_id),
    exercise_id: String(row.exercise_id),
    exercise_order: Number(row.exercise_order) || 1,
    measurement: (row.measurement as GroupModelSlot['measurement']) ?? 'reps',
    technique: (row.technique as GroupModelSlot['technique']) ?? 'none',
    sets: row.sets as number | null | undefined,
    reps: row.reps as string | null | undefined,
    weight_kg: row.weight_kg as number | null | undefined,
    load_percentage: row.load_percentage as number | null | undefined,
    rpe: row.rpe as number | null | undefined,
    tempo: row.tempo as string | null | undefined,
    rest_seconds: row.rest_seconds as number | null | undefined,
    notes: row.notes as string | null | undefined,
    work_seconds: row.work_seconds as number | null | undefined,
    distance_meters: row.distance_meters as number | null | undefined,
    target_time_seconds: row.target_time_seconds as number | null | undefined,
    target_pace_seconds_per_km: row.target_pace_seconds_per_km as number | null | undefined,
    target_speed_pct: row.target_speed_pct as number | null | undefined,
    hr_zone: row.hr_zone as number | null | undefined,
    target_hr_pct: row.target_hr_pct as number | null | undefined,
    drop_percentage: row.drop_percentage as number | null | undefined,
    max_drops: row.max_drops as number | null | undefined,
    reps_per_cluster: row.reps_per_cluster as number | null | undefined,
    clusters_per_set: row.clusters_per_set as number | null | undefined,
    intra_cluster_rest_seconds: row.intra_cluster_rest_seconds as number | null | undefined,
    rest_pause_seconds: row.rest_pause_seconds as number | null | undefined,
    max_rest_pauses: row.max_rest_pauses as number | null | undefined,
    exercise_letter: row.exercise_letter as string | null | undefined,
    exercise: (row.exercise as Record<string, unknown>) ?? null,
    prescriptions: Array.isArray(row.prescriptions) ? (row.prescriptions as GroupModelSlot['prescriptions']) : undefined,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  }
}

function rowToGroup(block: Record<string, unknown>): GroupModelEntry {
  return {
    id: String(block.id),
    template_id: String(block.template_id),
    set_order: Number(block.set_order) || 0,
    set_name: block.set_name as string | null | undefined,
    set_notes: block.set_notes as string | null | undefined,
    rounds_driver: inferRoundsDriver(block.set_type as string, block.rounds_driver),
    interval_seconds: block.interval_seconds as number | null | undefined,
    time_cap_seconds: block.time_cap_seconds as number | null | undefined,
    total_sets: block.total_sets as number | null | undefined,
    rest_seconds: block.rest_seconds as number | null | undefined,
    duration_seconds: block.duration_seconds as number | null | undefined,
    set_type: block.set_type as GroupModelEntry['set_type'],
    reps_per_set: block.reps_per_set as string | null | undefined,
    created_at: String(block.created_at ?? new Date().toISOString()),
    updated_at: String(block.updated_at ?? new Date().toISOString()),
  }
}

/** Adapt raw parent row + slot rows → legacy WorkoutSetEntry (ignores satellite arrays). */
export function adaptBlockRowToLegacy(
  blockRow: Record<string, unknown>,
  slotRows: Record<string, unknown>[],
): WorkoutSetEntry {
  const legacy = toLegacyBlockShape(rowToGroup(blockRow), slotRows.map(rowToSlot))
  const exerciseById = new Map(
    slotRows.map((r) => [String(r.exercise_id), r.exercise]),
  )
  if (legacy.exercises) {
    legacy.exercises = legacy.exercises.map((ex) => ({
      ...ex,
      exercise: (exerciseById.get(ex.exercise_id) as any) ?? ex.exercise ?? null,
    }))
  }
  return legacy
}

/** Adapt RPC/jsonb block (exercises = wsee rows; satellite keys ignored). */
export function adaptRpcBlockToLegacy(block: Record<string, unknown>): WorkoutSetEntry {
  const slotRows = Array.isArray(block.exercises)
    ? (block.exercises as Record<string, unknown>[])
    : []
  return adaptBlockRowToLegacy(block, slotRows)
}

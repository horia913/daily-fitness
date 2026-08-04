import type {
  WorkoutClusterSet,
  WorkoutDropSet,
  WorkoutEnduranceSet,
  WorkoutRestPauseSet,
  WorkoutSetEntryExercise,
  WorkoutSpeedSet,
  WorkoutTimeProtocol,
} from '@/types/workoutSetEntries'
import { deriveSetType } from './deriveSetType'
import type { GroupModelEntry, GroupModelSlot, LegacyBlock } from './types'

function exerciseLetter(slotCount: number, order: number): string | undefined {
  if (slotCount < 2) return undefined
  return String.fromCharCode(64 + order)
}

function syntheticId(prefix: string, setEntryId: string, order: number): string {
  return `${prefix}-${setEntryId}-${order}`
}

function mapSlotToExercise(
  slot: GroupModelSlot,
  group: GroupModelEntry,
  setType: ReturnType<typeof deriveSetType>,
  slotCount: number,
): WorkoutSetEntryExercise {
  const letter = slot.exercise_letter ?? exerciseLetter(slotCount, slot.exercise_order)
  const base: WorkoutSetEntryExercise = {
    id: slot.id,
    set_entry_id: slot.set_entry_id,
    exercise_id: slot.exercise_id,
    exercise_order: slot.exercise_order,
    exercise_letter: letter,
    sets: slot.sets ?? group.total_sets ?? undefined,
    reps: slot.reps ?? group.reps_per_set ?? undefined,
    weight_kg: slot.weight_kg ?? undefined,
    load_percentage: slot.load_percentage ?? undefined,
    rir: slot.rpe ?? undefined,
    tempo: slot.tempo ?? undefined,
    rest_seconds: slot.rest_seconds ?? undefined,
    notes: slot.notes ?? undefined,
    prescriptions: slot.prescriptions?.length ? slot.prescriptions : undefined,
    exercise: (slot.exercise as any) ?? undefined,
    created_at: slot.created_at ?? group.created_at,
    updated_at: slot.updated_at ?? group.updated_at,
    drop_sets: [],
    cluster_sets: [],
    rest_pause_sets: [],
    time_protocols: [],
    speed_sets: [],
    endurance_sets: [],
  }

  if (slot.technique === 'drop_set') {
    const drop: WorkoutDropSet = {
      id: syntheticId('drop', group.id, slot.exercise_order),
      set_entry_id: group.id,
      exercise_id: slot.exercise_id,
      exercise_order: slot.exercise_order,
      drop_order: 1,
      weight_kg: slot.weight_kg ?? undefined,
      reps: slot.reps ?? group.reps_per_set ?? undefined,
      drop_percentage: slot.drop_percentage ?? undefined,
      created_at: group.created_at,
    }
    base.drop_sets = [drop]
  }

  if (slot.technique === 'cluster') {
    const cluster: WorkoutClusterSet = {
      id: syntheticId('cluster', group.id, slot.exercise_order),
      set_entry_id: group.id,
      exercise_id: slot.exercise_id,
      exercise_order: slot.exercise_order,
      reps_per_cluster: slot.reps_per_cluster ?? 10,
      clusters_per_set: slot.clusters_per_set ?? 3,
      intra_cluster_rest: slot.intra_cluster_rest_seconds ?? 15,
      inter_set_rest: group.rest_seconds ?? 120,
      created_at: group.created_at,
    }
    base.cluster_sets = [cluster]
  }

  if (slot.technique === 'rest_pause') {
    const rp: WorkoutRestPauseSet = {
      id: syntheticId('rp', group.id, slot.exercise_order),
      set_entry_id: group.id,
      exercise_id: slot.exercise_id,
      exercise_order: slot.exercise_order,
      weight_kg: slot.weight_kg ?? undefined,
      rest_pause_duration: slot.rest_pause_seconds ?? 15,
      max_rest_pauses: slot.max_rest_pauses ?? 3,
      created_at: group.created_at,
    }
    base.rest_pause_sets = [rp]
  }

  if (setType === 'amrap' && group.rounds_driver === 'amrap') {
    const tp: WorkoutTimeProtocol = {
      id: syntheticId('tp', group.id, slot.exercise_order),
      set_entry_id: group.id,
      exercise_id: slot.exercise_id,
      exercise_order: slot.exercise_order,
      protocol_type: 'amrap',
      total_duration_minutes: group.duration_seconds
        ? Math.round(group.duration_seconds / 60)
        : undefined,
      target_reps: slot.reps ? parseInt(String(slot.reps), 10) || undefined : undefined,
      weight_kg: slot.weight_kg ?? null,
      load_percentage: slot.load_percentage ?? null,
      created_at: group.created_at,
    }
    base.time_protocols = [tp]
  }

  if (setType === 'emom' && group.rounds_driver === 'interval') {
    const isReps = slot.measurement === 'reps'
    const tp: WorkoutTimeProtocol = {
      id: syntheticId('tp', group.id, slot.exercise_order),
      set_entry_id: group.id,
      exercise_id: slot.exercise_id,
      exercise_order: slot.exercise_order,
      protocol_type: 'emom',
      total_duration_minutes: group.duration_seconds
        ? Math.round(group.duration_seconds / 60)
        : undefined,
      emom_mode: isReps ? 'target_reps' : 'time_based',
      reps_per_round: isReps && slot.reps ? parseInt(String(slot.reps), 10) || undefined : undefined,
      work_seconds: !isReps ? (slot.work_seconds ?? undefined) : undefined,
      weight_kg: slot.weight_kg ?? null,
      load_percentage: slot.load_percentage ?? null,
      created_at: group.created_at,
    }
    base.time_protocols = [tp]
  }

  if (setType === 'for_time' && group.rounds_driver === 'for_time') {
    const tp: WorkoutTimeProtocol = {
      id: syntheticId('tp', group.id, slot.exercise_order),
      set_entry_id: group.id,
      exercise_id: slot.exercise_id,
      exercise_order: slot.exercise_order,
      protocol_type: 'for_time',
      target_reps: slot.reps ? parseInt(String(slot.reps), 10) || undefined : undefined,
      time_cap_minutes: group.time_cap_seconds
        ? Math.round(group.time_cap_seconds / 60)
        : undefined,
      weight_kg: slot.weight_kg ?? null,
      load_percentage: slot.load_percentage ?? null,
      created_at: group.created_at,
    }
    base.time_protocols = [tp]
  }

  if (setType === 'tabata' && slot.measurement === 'time') {
    const tp: WorkoutTimeProtocol = {
      id: syntheticId('tp', group.id, slot.exercise_order),
      set_entry_id: group.id,
      exercise_id: slot.exercise_id,
      exercise_order: slot.exercise_order,
      protocol_type: 'tabata',
      work_seconds: slot.work_seconds ?? 20,
      rest_seconds: slot.rest_seconds ?? 10,
      rounds: group.total_sets ?? 8,
      rest_after_set: group.rest_seconds ?? undefined,
      set: 1,
      created_at: group.created_at,
    }
    base.time_protocols = [tp]
  }

  if (setType === 'timed_set' && slot.measurement === 'time') {
    base.reps = undefined
  }

  if (setType === 'speed_work' && slot.measurement === 'distance') {
    const speed: WorkoutSpeedSet = {
      id: syntheticId('speed', group.id, slot.exercise_order),
      set_entry_id: group.id,
      exercise_id: slot.exercise_id,
      exercise_order: slot.exercise_order,
      intervals: group.total_sets ?? 1,
      distance_meters: slot.distance_meters ?? 0,
      rest_seconds: group.rest_seconds ?? 120,
      load_pct_bw: slot.load_percentage ?? null,
      target_speed_pct: slot.target_speed_pct ?? null,
      target_hr_pct: slot.target_hr_pct ?? null,
      notes: slot.notes ?? null,
      created_at: group.created_at,
    }
    base.speed_sets = [speed]
  }

  if (setType === 'endurance' && slot.measurement === 'distance') {
    const end: WorkoutEnduranceSet = {
      id: syntheticId('end', group.id, slot.exercise_order),
      set_entry_id: group.id,
      exercise_id: slot.exercise_id,
      exercise_order: slot.exercise_order,
      target_distance_meters: slot.distance_meters ?? 0,
      target_time_seconds: slot.target_time_seconds ?? null,
      target_pace_seconds_per_km: slot.target_pace_seconds_per_km ?? null,
      hr_zone: slot.hr_zone ?? null,
      target_hr_pct: slot.target_hr_pct ?? null,
      notes: slot.notes ?? null,
      created_at: group.created_at,
    }
    base.endurance_sets = [end]
  }

  return base
}

/**
 * Synthesize legacy WorkoutSetEntry shape from Group-model columns only.
 * Satellite arrays on the input are ignored.
 */
export function toLegacyBlockShape(
  group: GroupModelEntry,
  slots: GroupModelSlot[],
): LegacyBlock {
  const ordered = [...slots].sort((a, b) => a.exercise_order - b.exercise_order)
  const setType = deriveSetType(group, ordered)

  const exercises = ordered.map((slot) =>
    mapSlotToExercise(slot, group, setType, ordered.length),
  )

  const time_protocols = exercises.flatMap((ex) => ex.time_protocols ?? [])
  const drop_sets = exercises.flatMap((ex) => ex.drop_sets ?? [])
  const cluster_sets = exercises.flatMap((ex) => ex.cluster_sets ?? [])
  const rest_pause_sets = exercises.flatMap((ex) => ex.rest_pause_sets ?? [])
  const speed_sets = exercises.flatMap((ex) => ex.speed_sets ?? [])
  const endurance_sets = exercises.flatMap((ex) => ex.endurance_sets ?? [])

  return {
    id: group.id,
    template_id: group.template_id,
    set_type: setType,
    set_order: group.set_order,
    set_name: group.set_name ?? undefined,
    set_notes: group.set_notes ?? undefined,
    total_sets: group.total_sets ?? undefined,
    reps_per_set: group.reps_per_set ?? undefined,
    rest_seconds: group.rest_seconds ?? undefined,
    duration_seconds: group.duration_seconds ?? undefined,
    exercises,
    drop_sets: drop_sets.length ? drop_sets : undefined,
    cluster_sets: cluster_sets.length ? cluster_sets : undefined,
    rest_pause_sets: rest_pause_sets.length ? rest_pause_sets : undefined,
    time_protocols: time_protocols.length ? time_protocols : undefined,
    speed_sets: speed_sets.length ? speed_sets : undefined,
    endurance_sets: endurance_sets.length ? endurance_sets : undefined,
    created_at: group.created_at,
    updated_at: group.updated_at,
  }
}

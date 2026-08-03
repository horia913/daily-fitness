import { deriveSetType } from './deriveSetType'
import {
  addSetToGroup,
  clearMeasurementValues,
  derivedLegacyFromPrescriptions,
  derivedRepsPerSet,
  emptyPrescription,
  exerciseLetter,
  removeSetFromGroup,
  syncPrescriptionsForGroup,
} from './prescriptions'
import type { CanvasExercise, CanvasGroup, CanvasWorkout } from './canvasTypes'
import {
  createDefaultExercise,
  createSoloGroup,
  DEFAULT_REST_SECONDS,
  defaultPropertiesForMeasurement,
} from './canvasTypes'
import type { Measurement, Prescription, RoundsDriver, SlotProperty, Technique } from './types'

export type CanvasAction =
  | { type: 'ADD_EXERCISE'; exerciseId: string; exercise: CanvasExercise['exercise'] }
  | { type: 'ADD_EXERCISE_TO_GROUP'; groupId: string; exerciseId: string; exercise: CanvasExercise['exercise'] }
  | { type: 'GROUP_SELECTED'; groupIds: string[] }
  | { type: 'UNGROUP'; groupId: string }
  | { type: 'REMOVE_FROM_GROUP'; groupId: string; slotId: string }
  | { type: 'DELETE_SLOT'; groupId: string; slotId: string }
  | { type: 'DUPLICATE_SLOT'; groupId: string; slotId: string }
  | { type: 'ADD_SET'; groupId: string }
  | { type: 'REMOVE_SET'; groupId: string; setNumber: number }
  | { type: 'UPDATE_GROUP_META'; groupId: string; patch: Partial<Pick<CanvasGroup, 'rounds_driver' | 'total_sets' | 'rest_seconds' | 'duration_seconds' | 'interval_seconds' | 'time_cap_seconds'>> }
  | { type: 'UPDATE_SLOT'; groupId: string; slotId: string; patch: Partial<CanvasExercise> }
  | { type: 'UPDATE_PRESCRIPTION'; groupId: string; slotId: string; setNumber: number; patch: Partial<CanvasExercise['prescriptions'][0]> }
  | { type: 'SET_MEASUREMENT'; groupId: string; slotId: string; measurement: Measurement; confirmed?: boolean }
  | { type: 'ADD_PROPERTY'; groupId: string; slotId: string; property: SlotProperty }
  | { type: 'REMOVE_PROPERTY'; groupId: string; slotId: string; property: SlotProperty; confirmed?: boolean }
  | { type: 'REORDER_GROUPS'; fromIndex: number; toIndex: number }
  | { type: 'REORDER_SLOTS'; groupId: string; fromIndex: number; toIndex: number }
  | { type: 'SET_NAME'; name: string }

export type CanvasActionResult =
  | { ok: true; workout: CanvasWorkout; message?: string }
  | { ok: false; error: string; needsConfirm?: boolean }

function reindexGroups(groups: CanvasGroup[]): CanvasGroup[] {
  return groups.map((g, i) => ({ ...g, set_order: i + 1 }))
}

function reindexSlots(slots: CanvasExercise[]): CanvasExercise[] {
  return slots.map((s, i) => ({ ...s, exercise_order: i + 1 }))
}

function groupMetaFromSource(source: CanvasGroup): Pick<
  CanvasGroup,
  'total_sets' | 'rest_seconds' | 'rounds_driver' | 'duration_seconds' | 'interval_seconds' | 'time_cap_seconds'
> {
  return {
    total_sets: source.total_sets,
    rest_seconds: source.rest_seconds,
    rounds_driver: source.rounds_driver,
    duration_seconds: source.duration_seconds,
    interval_seconds: source.interval_seconds,
    time_cap_seconds: source.time_cap_seconds,
  }
}

function soloFromGroupMember(slot: CanvasExercise, setOrder: number, source: CanvasGroup): CanvasGroup {
  const [synced] = syncPrescriptionsForGroup(
    [{ ...slot, exercise_order: 1 }],
    source.total_sets,
    source.rounds_driver,
  )
  return {
    ...createSoloGroup(synced, setOrder),
    ...groupMetaFromSource(source),
  }
}

function findGroup(workout: CanvasWorkout, groupId: string): CanvasGroup | undefined {
  return workout.groups.find((g) => g.id === groupId)
}

function mapGroup(
  workout: CanvasWorkout,
  groupId: string,
  fn: (group: CanvasGroup) => CanvasGroup,
): CanvasWorkout {
  return {
    ...workout,
    groups: workout.groups.map((g) => (g.id === groupId ? fn(g) : g)),
  }
}

function hasMeasurementValues(slot: CanvasExercise): boolean {
  return slot.prescriptions.some(
    (p) => p.reps || p.work_seconds || p.distance_meters,
  )
}

function techniqueFromProperty(property: SlotProperty): Technique {
  if (property === 'drop_set') return 'drop_set'
  if (property === 'cluster') return 'cluster'
  if (property === 'rest_pause') return 'rest_pause'
  return 'none'
}

function techniqueConfigPatch(technique: Technique): Partial<CanvasExercise> {
  switch (technique) {
    case 'drop_set':
      return {
        drop_percentage: 20,
        max_drops: 2,
        reps_per_cluster: null,
        clusters_per_set: null,
        intra_cluster_rest_seconds: null,
        rest_pause_seconds: null,
        max_rest_pauses: null,
      }
    case 'cluster':
      return {
        drop_percentage: null,
        max_drops: null,
        reps_per_cluster: 10,
        clusters_per_set: 3,
        intra_cluster_rest_seconds: 15,
        rest_pause_seconds: null,
        max_rest_pauses: null,
      }
    case 'rest_pause':
      return {
        drop_percentage: null,
        max_drops: null,
        reps_per_cluster: null,
        clusters_per_set: null,
        intra_cluster_rest_seconds: null,
        rest_pause_seconds: 15,
        max_rest_pauses: 3,
      }
    default:
      return {
        drop_percentage: null,
        max_drops: null,
        reps_per_cluster: null,
        clusters_per_set: null,
        intra_cluster_rest_seconds: null,
        rest_pause_seconds: null,
        max_rest_pauses: null,
      }
  }
}

export function applyCanvasAction(workout: CanvasWorkout, action: CanvasAction): CanvasActionResult {
  switch (action.type) {
    case 'SET_NAME':
      return { ok: true, workout: { ...workout, name: action.name } }

    case 'ADD_EXERCISE': {
      const exercise = createDefaultExercise(action.exerciseId, action.exercise, 1)
      const group = createSoloGroup(exercise, workout.groups.length + 1)
      return { ok: true, workout: { ...workout, groups: [...workout.groups, group] } }
    }

    case 'ADD_EXERCISE_TO_GROUP': {
      const group = findGroup(workout, action.groupId)
      if (!group) return { ok: false, error: 'Group not found.' }
      if (group.slots.some((s) => s.exercise_id === action.exerciseId)) {
        return { ok: false, error: 'That exercise is already in this group.' }
      }
      const exercise = createDefaultExercise(
        action.exerciseId,
        action.exercise,
        group.slots.length + 1,
      )
      const synced = syncPrescriptionsForGroup(
        [...group.slots, exercise],
        group.total_sets,
        group.rounds_driver,
      )
      return {
        ok: true,
        workout: mapGroup(workout, action.groupId, (g) => ({ ...g, slots: synced })),
      }
    }

    case 'GROUP_SELECTED': {
      const groupIds = new Set(action.groupIds)
      if (groupIds.size < 2) return { ok: false, error: 'Select at least 2 groups to merge.' }
      const selectedGroups = workout.groups
        .filter((g) => groupIds.has(g.id))
        .sort((a, b) => a.set_order - b.set_order)
      if (selectedGroups.length < 2) return { ok: false, error: 'Selected groups not found.' }

      const seenExercises = new Map<string, string>()
      for (const group of selectedGroups) {
        for (const slot of group.slots) {
          if (seenExercises.has(slot.exercise_id)) {
            const name = slot.exercise?.name ?? seenExercises.get(slot.exercise_id) ?? 'This exercise'
            return {
              ok: false,
              error: `"${name}" is in more than one selected group. Remove the duplicate before merging.`,
            }
          }
          seenExercises.set(slot.exercise_id, slot.exercise?.name ?? 'Exercise')
        }
      }

      const metaSource = selectedGroups.find((g) => g.slots.length > 1) ?? selectedGroups[0]
      const mergedSlots = reindexSlots(
        selectedGroups.flatMap((g) =>
          [...g.slots].sort((a, b) => a.exercise_order - b.exercise_order),
        ),
      )
      const synced = syncPrescriptionsForGroup(
        mergedSlots,
        metaSource.total_sets,
        metaSource.rounds_driver,
      )
      const merged: CanvasGroup = {
        ...metaSource,
        id: metaSource.id,
        slots: synced,
      }
      const removeIds = new Set(selectedGroups.map((g) => g.id))
      const remaining = workout.groups.filter((g) => !removeIds.has(g.id))
      const insertAt = Math.min(...selectedGroups.map((g) => g.set_order)) - 1
      const next = [...remaining]
      next.splice(insertAt, 0, merged)
      return { ok: true, workout: { ...workout, groups: reindexGroups(next) } }
    }

    case 'UNGROUP': {
      const group = findGroup(workout, action.groupId)
      if (!group || group.slots.length < 2) return { ok: false, error: 'Nothing to ungroup.' }
      const idx = workout.groups.findIndex((g) => g.id === action.groupId)
      const soloGroups = group.slots.map((slot, i) =>
        soloFromGroupMember(slot, idx + i + 1, group),
      )
      const next = [...workout.groups]
      next.splice(idx, 1, ...soloGroups)
      return { ok: true, workout: { ...workout, groups: reindexGroups(next) } }
    }

    case 'REMOVE_FROM_GROUP': {
      const group = findGroup(workout, action.groupId)
      if (!group || group.slots.length < 2) {
        return { ok: false, error: 'Exercise is not in a multi-exercise group.' }
      }
      const slot = group.slots.find((s) => s.id === action.slotId)
      if (!slot) return { ok: false, error: 'Exercise not found.' }
      const idx = workout.groups.findIndex((g) => g.id === action.groupId)
      const remaining = group.slots.filter((s) => s.id !== action.slotId)
      const removedSolo = soloFromGroupMember(slot, idx + 2, group)
      const next = [...workout.groups]
      if (remaining.length === 1) {
        const collapsed = soloFromGroupMember(remaining[0], idx + 1, group)
        next.splice(idx, 1, collapsed, removedSolo)
      } else {
        const updated = { ...group, slots: reindexSlots(remaining) }
        next.splice(idx, 1, updated, removedSolo)
      }
      return { ok: true, workout: { ...workout, groups: reindexGroups(next) } }
    }

    case 'DELETE_SLOT': {
      const group = findGroup(workout, action.groupId)
      if (!group) return { ok: false, error: 'Group not found.' }
      if (group.slots.length === 1) {
        const next = workout.groups.filter((g) => g.id !== action.groupId)
        return { ok: true, workout: { ...workout, groups: reindexGroups(next) } }
      }
      const slots = reindexSlots(group.slots.filter((s) => s.id !== action.slotId))
      return {
        ok: true,
        workout: mapGroup(workout, action.groupId, (g) => ({ ...g, slots })),
      }
    }

    case 'DUPLICATE_SLOT': {
      const group = findGroup(workout, action.groupId)
      if (!group) return { ok: false, error: 'Group not found.' }
      const source = group.slots.find((s) => s.id === action.slotId)
      if (!source) return { ok: false, error: 'Exercise not found.' }
      if (group.slots.some((s) => s.exercise_id === source.exercise_id)) {
        return { ok: false, error: 'That exercise is already in this group.' }
      }
      return { ok: false, error: 'Duplicate exercise within one group is not allowed.' }
    }

    case 'ADD_SET': {
      const group = findGroup(workout, action.groupId)
      if (!group) return { ok: false, error: 'Group not found.' }
      const { slots, totalSets } = addSetToGroup(group.slots, group.total_sets, group.rounds_driver)
      return {
        ok: true,
        workout: mapGroup(workout, action.groupId, (g) => ({ ...g, slots, total_sets: totalSets })),
      }
    }

    case 'REMOVE_SET': {
      const group = findGroup(workout, action.groupId)
      if (!group) return { ok: false, error: 'Group not found.' }
      const { slots, totalSets } = removeSetFromGroup(
        group.slots,
        group.total_sets,
        group.rounds_driver,
      )
      return {
        ok: true,
        workout: mapGroup(workout, action.groupId, (g) => ({ ...g, slots, total_sets: totalSets })),
      }
    }

    case 'UPDATE_GROUP_META': {
      const group = findGroup(workout, action.groupId)
      if (!group) return { ok: false, error: 'Group not found.' }
      const patch = action.patch
      let next: CanvasGroup = { ...group, ...patch }
      if (patch.rounds_driver || patch.total_sets != null) {
        const driver = (patch.rounds_driver ?? group.rounds_driver) as RoundsDriver
        const total = patch.total_sets ?? group.total_sets
        next.slots = syncPrescriptionsForGroup(group.slots, total, driver)
        next.total_sets = total
        next.rounds_driver = driver
      }
      return { ok: true, workout: mapGroup(workout, action.groupId, () => next) }
    }

    case 'UPDATE_SLOT':
      return {
        ok: true,
        workout: mapGroup(workout, action.groupId, (g) => ({
          ...g,
          slots: g.slots.map((s) => (s.id === action.slotId ? { ...s, ...action.patch } : s)),
        })),
      }

    case 'UPDATE_PRESCRIPTION':
      return {
        ok: true,
        workout: mapGroup(workout, action.groupId, (g) => ({
          ...g,
          slots: g.slots.map((s) => {
            if (s.id !== action.slotId) return s
            return {
              ...s,
              prescriptions: s.prescriptions.map((p) =>
                p.set_number === action.setNumber ? { ...p, ...action.patch } : p,
              ),
            }
          }),
        })),
      }

    case 'SET_MEASUREMENT': {
      const group = findGroup(workout, action.groupId)
      const slot = group?.slots.find((s) => s.id === action.slotId)
      if (!group || !slot) return { ok: false, error: 'Exercise not found.' }
      if (slot.measurement === action.measurement) return { ok: true, workout }
      if (hasMeasurementValues(slot) && !action.confirmed) {
        return { ok: false, error: 'Switching measurement will clear existing values.', needsConfirm: true }
      }
      const prescriptions = clearMeasurementValues(slot.prescriptions).map((p) =>
        action.measurement === 'reps' ? { ...p, reps: p.reps ?? null } : p,
      )
      return {
        ok: true,
        workout: mapGroup(workout, action.groupId, (g) => ({
          ...g,
          slots: g.slots.map((s) =>
            s.id === action.slotId
              ? {
                  ...s,
                  measurement: action.measurement,
                  prescriptions,
                  enabledProperties: s.enabledProperties,
                }
              : s,
          ),
        })),
      }
    }

    case 'ADD_PROPERTY': {
      const prop = action.property
      return {
        ok: true,
        workout: mapGroup(workout, action.groupId, (g) => ({
          ...g,
          slots: g.slots.map((s) => {
            if (s.id !== action.slotId) return s
            if (s.enabledProperties.includes(prop)) return s
            const technique = ['drop_set', 'cluster', 'rest_pause'].includes(prop)
              ? techniqueFromProperty(prop)
              : s.technique
            const enabledProperties = technique !== 'none'
              ? [...s.enabledProperties.filter((p) => !['drop_set', 'cluster', 'rest_pause'].includes(p)), prop]
              : [...s.enabledProperties, prop]
            const configPatch = ['drop_set', 'cluster', 'rest_pause'].includes(prop)
              ? techniqueConfigPatch(technique)
              : prop === 'rest_after_exercise' && s.rest_seconds == null
                ? { rest_seconds: DEFAULT_REST_SECONDS }
                : {}
            return { ...s, enabledProperties, technique, ...configPatch }
          }),
        })),
      }
    }

    case 'REMOVE_PROPERTY': {
      const group = findGroup(workout, action.groupId)
      const slot = group?.slots.find((s) => s.id === action.slotId)
      if (!group || !slot) return { ok: false, error: 'Exercise not found.' }
      if (!action.confirmed && ['load', 'rir', 'tempo', 'rest_after_exercise'].includes(action.property)) {
        return { ok: false, error: 'Remove this property and clear its values?', needsConfirm: true }
      }
      return {
        ok: true,
        workout: mapGroup(workout, action.groupId, (g) => ({
          ...g,
          slots: g.slots.map((s) => {
            if (s.id !== action.slotId) return s
            const enabledProperties = s.enabledProperties.filter((p) => p !== action.property)
            let next = { ...s, enabledProperties }
            if (action.property === 'load') {
              next.prescriptions = s.prescriptions.map((p) => ({
                ...p,
                weight_kg: null,
                load_percentage: null,
              }))
            }
            if (action.property === 'rir') {
              next.prescriptions = s.prescriptions.map((p) => ({ ...p, rir: null }))
            }
            if (action.property === 'tempo') {
              next.prescriptions = s.prescriptions.map((p) => ({ ...p, tempo: null }))
            }
            if (action.property === 'rest_after_exercise') {
              next.rest_seconds = null
            }
            if (['drop_set', 'cluster', 'rest_pause'].includes(action.property)) {
              next = { ...next, technique: 'none', ...techniqueConfigPatch('none') }
            }
            return next
          }),
        })),
      }
    }

    case 'REORDER_GROUPS': {
      const groups = [...workout.groups]
      const [moved] = groups.splice(action.fromIndex, 1)
      if (!moved) return { ok: false, error: 'Invalid reorder.' }
      groups.splice(action.toIndex, 0, moved)
      return { ok: true, workout: { ...workout, groups: reindexGroups(groups) } }
    }

    case 'REORDER_SLOTS': {
      const group = findGroup(workout, action.groupId)
      if (!group) return { ok: false, error: 'Group not found.' }
      const slots = [...group.slots]
      const [moved] = slots.splice(action.fromIndex, 1)
      if (!moved) return { ok: false, error: 'Invalid reorder.' }
      slots.splice(action.toIndex, 0, moved)
      return {
        ok: true,
        workout: mapGroup(workout, action.groupId, (g) => ({ ...g, slots: reindexSlots(slots) })),
      }
    }

    default:
      return { ok: false, error: 'Unknown action.' }
  }
}

export function canvasGroupToWritePayload(group: CanvasGroup) {
  const slotCount = group.slots.length
  const set_type = deriveSetType(
    {
      rounds_driver: group.rounds_driver,
      total_sets: group.total_sets,
    },
    group.slots.map((s) => ({ measurement: s.measurement, technique: s.technique })),
  )
  const firstSlotPrescriptions = group.slots[0]?.prescriptions ?? []
  const reps_per_set = derivedRepsPerSet(firstSlotPrescriptions)

  const slots = group.slots.map((slot, i) => {
    const legacy = derivedLegacyFromPrescriptions(slot.prescriptions)
    return {
      clientSlotId: slot.id,
      exercise_id: slot.exercise_id,
      exercise_order: i + 1,
      measurement: slot.measurement,
      technique: slot.technique,
      sets: group.total_sets,
      exercise_letter: exerciseLetter(slotCount, i + 1),
      rest_seconds: slot.rest_seconds ?? null,
      notes: slot.notes ?? null,
      target_time_seconds: slot.target_time_seconds ?? null,
      target_pace_seconds_per_km: slot.target_pace_seconds_per_km ?? null,
      target_speed_pct: slot.target_speed_pct ?? null,
      hr_zone: slot.hr_zone ?? null,
      target_hr_pct: slot.target_hr_pct ?? null,
      drop_percentage: slot.drop_percentage ?? null,
      max_drops: slot.max_drops ?? null,
      reps_per_cluster: slot.reps_per_cluster ?? null,
      clusters_per_set: slot.clusters_per_set ?? null,
      intra_cluster_rest_seconds: slot.intra_cluster_rest_seconds ?? null,
      rest_pause_seconds: slot.rest_pause_seconds ?? null,
      max_rest_pauses: slot.max_rest_pauses ?? null,
      ...legacy,
      prescriptions: slot.prescriptions,
    }
  })

  return {
    set_type,
    set_order: group.set_order,
    rounds_driver: group.rounds_driver,
    total_sets: group.total_sets,
    rest_seconds: group.rest_seconds ?? null,
    duration_seconds: group.duration_seconds ?? null,
    interval_seconds: group.interval_seconds ?? null,
    time_cap_seconds: group.time_cap_seconds ?? null,
    reps_per_set,
    slots,
  }
}

export function inferPropertiesFromSlot(row: Record<string, unknown>, technique: Technique): SlotProperty[] {
  const props: SlotProperty[] = defaultPropertiesForMeasurement((row.measurement as Measurement) ?? 'reps')
  if (row.load_percentage != null || row.weight_kg != null) {
    if (!props.includes('load')) props.push('load')
  }
  if (row.rir != null && !props.includes('rir')) props.push('rir')
  if (row.tempo && !props.includes('tempo')) props.push('tempo')
  if (row.rest_seconds != null && !props.includes('rest_after_exercise')) props.push('rest_after_exercise')
  if (technique === 'drop_set' && !props.includes('drop_set')) props.push('drop_set')
  if (technique === 'cluster' && !props.includes('cluster')) props.push('cluster')
  if (technique === 'rest_pause' && !props.includes('rest_pause')) props.push('rest_pause')
  return props
}

export function emptyCanvasExerciseFallback(): Prescription[] {
  return [1, 2, 3].map((n) => emptyPrescription(n))
}

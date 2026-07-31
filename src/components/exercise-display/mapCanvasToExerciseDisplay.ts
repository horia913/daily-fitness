import {
  formatGroupMetaLabel,
  groupLetter,
  slotLetter,
} from '@/components/workout-canvas/formatSummary'
import { deriveSetType } from '@/lib/groupModel/deriveSetType'
import type { CanvasExercise, CanvasGroup } from '@/lib/groupModel/canvasTypes'
import { buildPrescriptionSegments } from './buildSegments'
import type {
  CanvasDisplayInput,
  ExerciseDisplayProps,
  ExerciseGroupDisplayProps,
} from './types'

export interface MapCanvasOptions {
  compact?: boolean
  size?: ExerciseDisplayProps['size']
}

function mapSlotToExerciseDisplay(
  input: CanvasDisplayInput,
  options?: MapCanvasOptions,
): ExerciseDisplayProps {
  const { group, groupIndex, slot, slotIndex } = input
  const badge = slotLetter(groupIndex, slotIndex, group.slots.length)

  return {
    badge,
    groupIndex,
    name: slot.exercise?.name?.trim() || 'Exercise',
    size: options?.size,
    compact: options?.compact,
    segments: buildPrescriptionSegments(slot, group, { compact: options?.compact }),
    exerciseId: slot.exercise_id?.trim() || null,
  }
}

/** Map one canvas slot + parent group → ExerciseDisplay props. */
export function mapCanvasEntryToExerciseDisplay(
  slot: CanvasExercise,
  group: CanvasGroup,
  groupIndex: number,
  slotIndex: number,
  options?: MapCanvasOptions,
): ExerciseDisplayProps {
  return mapSlotToExerciseDisplay({ group, groupIndex, slot, slotIndex }, options)
}

/** Map a full canvas group → ExerciseGroupDisplay props (or single-exercise shape). */
export function mapCanvasGroupToExerciseGroupDisplay(
  group: CanvasGroup,
  groupIndex: number,
  options?: MapCanvasOptions,
): ExerciseGroupDisplayProps {
  const validSlots = group.slots
    .map((slot, slotIndex) => ({ slot, slotIndex }))
    .filter(({ slot }) => Boolean(slot.exercise_id?.trim()))

  const isMulti = validSlots.length > 1
  const letter = groupLetter(groupIndex)

  const exercises = validSlots.map(({ slot, slotIndex }) =>
    mapSlotToExerciseDisplay({ group, groupIndex, slot, slotIndex }, options),
  )

  const metaLine = isMulti ? formatGroupMetaLabel(group) : undefined

  return {
    groupIndex,
    letter,
    metaLine,
    exercises,
    size: options?.size,
    compact: options?.compact,
  }
}

/**
 * Per-protocol segment mapping reference (canvas / group model).
 * Set type from deriveSetType(group, slots); segments from buildPrescriptionSegments.
 */
export const CANVAS_PROTOCOL_SEGMENT_MAP = {
  straight_set: 'sets×reps · load · RIR · tempo · rest',
  superset: 'group meta: set type · rounds · rest; each slot: sets×reps · load · RIR · tempo · rest',
  giant_set: 'same as superset with A1/A2/A3 sub-badges',
  drop_set: 'sets×reps · load · RIR · tempo · rest · drop chain from prescription rows / drop%',
  cluster_set: 'sets×reps · load · RIR · tempo · rest · clusters×reps_per_cluster · intra-cluster rest',
  rest_pause: 'sets×reps · load · RIR · tempo · rest · + up to N rest-pause × Ns',
  pre_exhaustion: 'mapped as multi-slot superset (deriveSetType → superset)',
  amrap: 'compact reps values · load · RIR · tempo · AMRAP N min (group duration)',
  emom: 'reps values (no set prefix) · load · RIR · tempo · every Ns · N min',
  tabata: 'work_seconds values · group meta tabata; all slots measurement=time',
  for_time: 'sets×reps · load · RIR · tempo · rest · cap m:ss',
  timed_set: 'sets×work_seconds · tempo · rest',
  speed_work: 'distance/time targets via target_pace / target_speed_pct extras',
  endurance: 'distance_meters per set row · HR / pace extras when present',
} as const satisfies Record<string, string>

export function describeCanvasGroupProtocol(group: CanvasGroup): string {
  const setType = deriveSetType(
    { rounds_driver: group.rounds_driver, total_sets: group.total_sets },
    group.slots.map((s) => ({ measurement: s.measurement, technique: s.technique })),
  )
  return CANVAS_PROTOCOL_SEGMENT_MAP[setType as keyof typeof CANVAS_PROTOCOL_SEGMENT_MAP] ?? setType
}

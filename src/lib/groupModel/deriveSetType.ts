import type { SetType } from '@/types/workoutSetEntries'
import type { GroupModelEntry, GroupModelSlot } from './types'

type GroupLike = Pick<
  GroupModelEntry,
  'rounds_driver' | 'total_sets'
>

type SlotLike = Pick<GroupModelSlot, 'measurement' | 'technique'>

/**
 * Derive legacy set_type from Group-model parent + slots.
 * Never emits pre_exhaustion (maps to superset). Mixed content approximates by slot count.
 */
export function deriveSetType(group: GroupLike, slots: SlotLike[]): SetType {
  if (slots.length === 1) {
    const slot = slots[0]
    if (slot.technique === 'drop_set') return 'drop_set'
    if (slot.technique === 'cluster') return 'cluster_set'
    if (slot.technique === 'rest_pause') return 'rest_pause'
  }

  if (group.rounds_driver === 'amrap') return 'amrap'
  if (group.rounds_driver === 'interval') return 'emom'
  if (group.rounds_driver === 'for_time') return 'for_time'

  if (slots.length === 1) {
    const m = slots[0].measurement
    if (m === 'time') return 'timed_set'
    if (m === 'distance') {
      const intervals = group.total_sets ?? 1
      return intervals > 1 ? 'speed_work' : 'endurance'
    }
    return 'straight_set'
  }

  if (slots.length >= 2) {
    if (slots.every((s) => s.measurement === 'time')) return 'tabata'
    if (slots.length === 2) return 'superset'
    return 'giant_set'
  }

  return 'straight_set'
}

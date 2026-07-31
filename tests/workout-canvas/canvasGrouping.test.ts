import { applyCanvasAction } from '@/lib/groupModel/canvasActions'
import type { CanvasGroup } from '@/lib/groupModel/canvasTypes'
import { createEmptyCanvasWorkout, createDefaultExercise, createSoloGroup } from '@/lib/groupModel/canvasTypes'

const EX_A = '11111111-1111-1111-1111-111111111111'
const EX_B = '22222222-2222-2222-2222-222222222222'
const EX_C = '33333333-3333-3333-3333-333333333333'

function solo(name: string, id: string, order: number) {
  return createSoloGroup(createDefaultExercise(id, { id, name }, 1), order)
}

function mergeGroups(w: ReturnType<typeof createEmptyCanvasWorkout>, groupIds: string[]) {
  return applyCanvasAction(w, { type: 'GROUP_SELECTED', groupIds })
}

describe('group-level merge (GROUP_SELECTED)', () => {
  it('merges two solo groups', () => {
    const w = createEmptyCanvasWorkout({
      groups: [solo('Squat', EX_A, 1), solo('Bench', EX_B, 2)],
    })
    const result = mergeGroups(w, w.groups.map((g) => g.id))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.workout.groups).toHaveLength(1)
      expect(result.workout.groups[0].slots).toHaveLength(2)
      expect(result.workout.groups[0].rounds_driver).toBe('fixed')
    }
  })

  it('solo + superset merge inherits superset meta and syncs prescription rows', () => {
    const superset: CanvasGroup = {
      ...solo('A', EX_A, 1),
      total_sets: 4,
      rest_seconds: 90,
      rounds_driver: 'fixed',
      slots: [
        {
          ...createDefaultExercise(EX_A, { id: EX_A, name: 'A' }, 1),
          prescriptions: [
            { set_number: 1, reps: '5' },
            { set_number: 2, reps: '5' },
            { set_number: 3, reps: '5' },
            { set_number: 4, reps: '5' },
          ],
        },
        {
          ...createDefaultExercise(EX_B, { id: EX_B, name: 'B' }, 2),
          prescriptions: [
            { set_number: 1, reps: '8' },
            { set_number: 2, reps: '8' },
            { set_number: 3, reps: '8' },
            { set_number: 4, reps: '8' },
          ],
        },
      ],
    }
    const loose = solo('C', EX_C, 2)
    loose.slots[0].prescriptions = [{ set_number: 1, reps: '10' }, { set_number: 2, reps: '10' }]
    const w = createEmptyCanvasWorkout({ groups: [superset, loose] })

    const result = mergeGroups(w, [superset.id, loose.id])
    expect(result.ok).toBe(true)
    if (result.ok) {
      const merged = result.workout.groups[0]
      expect(merged.total_sets).toBe(4)
      expect(merged.rest_seconds).toBe(90)
      expect(merged.slots).toHaveLength(3)
      merged.slots.forEach((slot) => {
        expect(slot.prescriptions).toHaveLength(4)
      })
    }
  })

  it('blocks merge when the same exercise appears in two selected groups', () => {
    const w = createEmptyCanvasWorkout({
      groups: [solo('Squat', EX_A, 1), solo('Squat dup', EX_A, 2)],
    })
    const result = mergeGroups(w, w.groups.map((g) => g.id))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Squat')
    }
  })
})

describe('ungroup round-trip', () => {
  it('group → ungroup → regroup yields identical slot structure', () => {
    let w = createEmptyCanvasWorkout({
      groups: [solo('A', EX_A, 1), solo('B', EX_B, 2)],
    })
    const merged = mergeGroups(w, w.groups.map((g) => g.id))
    expect(merged.ok).toBe(true)
    w = merged.ok ? merged.workout : w
    const beforeUngroup = w.groups[0]

    const ungrouped = applyCanvasAction(w, { type: 'UNGROUP', groupId: w.groups[0].id })
    expect(ungrouped.ok).toBe(true)
    w = ungrouped.ok ? ungrouped.workout : w
    expect(w.groups).toHaveLength(2)
    w.groups.forEach((g) => {
      expect(g.slots).toHaveLength(1)
      expect(g.total_sets).toBe(beforeUngroup.total_sets)
    })

    const regroup = mergeGroups(w, w.groups.map((g) => g.id))
    expect(regroup.ok).toBe(true)
    if (regroup.ok) {
      expect(regroup.workout.groups[0].slots.map((s) => s.exercise_id)).toEqual(
        beforeUngroup.slots.map((s) => s.exercise_id),
      )
      expect(regroup.workout.groups[0].slots).toHaveLength(2)
    }
  })
})

describe('remove from group', () => {
  it('places removed member after group and keeps two members re-lettered', () => {
    let w = createEmptyCanvasWorkout({
      groups: [solo('A', EX_A, 1), solo('B', EX_B, 2), solo('C', EX_C, 3)],
    })
    const merged = mergeGroups(w, [w.groups[0].id, w.groups[1].id, w.groups[2].id])
    w = merged.ok ? merged.workout! : w
    const groupId = w.groups[0].id
    const removeId = w.groups[0].slots[1].id

    const removed = applyCanvasAction(w, {
      type: 'REMOVE_FROM_GROUP',
      groupId,
      slotId: removeId,
    })
    expect(removed.ok).toBe(true)
    if (removed.ok) {
      expect(removed.workout.groups).toHaveLength(2)
      expect(removed.workout.groups[0].slots).toHaveLength(2)
      expect(removed.workout.groups[1].slots).toHaveLength(1)
      expect(removed.workout.groups[1].slots[0].exercise_id).toBe(EX_B)
    }
  })

  it('auto-collapses when only one member remains', () => {
    let w = createEmptyCanvasWorkout({
      groups: [solo('A', EX_A, 1), solo('B', EX_B, 2)],
    })
    const merged = mergeGroups(w, w.groups.map((g) => g.id))
    w = merged.ok ? merged.workout! : w
    const groupId = w.groups[0].id
    const removeId = w.groups[0].slots[0].id

    const removed = applyCanvasAction(w, {
      type: 'REMOVE_FROM_GROUP',
      groupId,
      slotId: removeId,
    })
    expect(removed.ok).toBe(true)
    if (removed.ok) {
      expect(removed.workout.groups).toHaveLength(2)
      expect(removed.workout.groups[0].slots).toHaveLength(1)
      expect(removed.workout.groups[1].slots).toHaveLength(1)
    }
  })
})

describe('selection bar counts groups', () => {
  it('requires at least two group ids to merge', () => {
    const w = createEmptyCanvasWorkout({ groups: [solo('A', EX_A, 1)] })
    const one = applyCanvasAction(w, { type: 'GROUP_SELECTED', groupIds: [w.groups[0].id] })
    expect(one.ok).toBe(false)
  })
})

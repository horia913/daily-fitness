import { applyCanvasAction } from '@/lib/groupModel/canvasActions'
import { createEmptyCanvasWorkout, createDefaultExercise, createSoloGroup } from '@/lib/groupModel/canvasTypes'

const EX_A = '11111111-1111-1111-1111-111111111111'
const EX_B = '22222222-2222-2222-2222-222222222222'

function workoutWithTwoSoloGroups() {
  const g1 = createSoloGroup(createDefaultExercise(EX_A, { id: EX_A, name: 'Squat' }, 1), 1)
  const g2 = createSoloGroup(createDefaultExercise(EX_B, { id: EX_B, name: 'Bench' }, 1), 2)
  return createEmptyCanvasWorkout({ groups: [g1, g2] })
}

describe('canvas actions', () => {
  it('groups selected exercises', () => {
    const w = workoutWithTwoSoloGroups()
    const result = applyCanvasAction(w, { type: 'GROUP_SELECTED', groupIds: w.groups.map((g) => g.id) })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.workout.groups).toHaveLength(1)
      expect(result.workout.groups[0].slots).toHaveLength(2)
    }
  })

  it('blocks duplicate exercise in group', () => {
    const w = workoutWithTwoSoloGroups()
    const groupId = w.groups[0].id
    const slotId = w.groups[0].slots[0].id
    const dup = applyCanvasAction(w, { type: 'DUPLICATE_SLOT', groupId, slotId })
    expect(dup.ok).toBe(false)
  })

  it('adds a set under fixed driver', () => {
    const w = workoutWithTwoSoloGroups()
    const groupId = w.groups[0].id
    const before = w.groups[0].total_sets
    const result = applyCanvasAction(w, { type: 'ADD_SET', groupId })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.workout.groups[0].total_sets).toBe(before + 1)
      expect(result.workout.groups[0].slots[0].prescriptions.length).toBe(before + 1)
    }
  })

  it('adds load property', () => {
    const w = workoutWithTwoSoloGroups()
    const groupId = w.groups[0].id
    const slotId = w.groups[0].slots[0].id
    const stripped = applyCanvasAction(w, {
      type: 'UPDATE_SLOT',
      groupId,
      slotId,
      patch: { enabledProperties: [] },
    })
    expect(stripped.ok).toBe(true)
    const result = applyCanvasAction(stripped.ok ? stripped.workout : w, {
      type: 'ADD_PROPERTY',
      groupId,
      slotId,
      property: 'rir',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.workout.groups[0].slots[0].enabledProperties).toContain('rir')
    }
  })

  it('seeds technique defaults when adding drop set', () => {
    const w = workoutWithTwoSoloGroups()
    const groupId = w.groups[0].id
    const slotId = w.groups[0].slots[0].id
    const result = applyCanvasAction(w, {
      type: 'ADD_PROPERTY',
      groupId,
      slotId,
      property: 'drop_set',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const slot = result.workout.groups[0].slots[0]
      expect(slot.technique).toBe('drop_set')
      expect(slot.drop_percentage).toBe(20)
      expect(slot.max_drops).toBe(2)
    }
  })

  it('writes technique config on save payload', () => {
    const w = workoutWithTwoSoloGroups()
    const groupId = w.groups[0].id
    const slotId = w.groups[0].slots[0].id
    const added = applyCanvasAction(w, {
      type: 'ADD_PROPERTY',
      groupId,
      slotId,
      property: 'cluster',
    })
    expect(added.ok).toBe(true)
    if (!added.ok) return
    const updated = applyCanvasAction(added.workout, {
      type: 'UPDATE_SLOT',
      groupId,
      slotId,
      patch: { reps_per_cluster: 8, clusters_per_set: 4 },
    })
    expect(updated.ok).toBe(true)
    if (!updated.ok) return
    const { canvasGroupToWritePayload } = require('@/lib/groupModel/canvasActions')
    const payload = canvasGroupToWritePayload(updated.workout.groups[0])
    expect(payload.slots[0]).toMatchObject({
      technique: 'cluster',
      reps_per_cluster: 8,
      clusters_per_set: 4,
      intra_cluster_rest_seconds: 15,
    })
  })

  it('clears technique config when removing a technique property', () => {
    const w = workoutWithTwoSoloGroups()
    const groupId = w.groups[0].id
    const slotId = w.groups[0].slots[0].id
    const added = applyCanvasAction(w, {
      type: 'ADD_PROPERTY',
      groupId,
      slotId,
      property: 'rest_pause',
    })
    expect(added.ok).toBe(true)
    if (!added.ok) return
    const removed = applyCanvasAction(added.workout, {
      type: 'REMOVE_PROPERTY',
      groupId,
      slotId,
      property: 'rest_pause',
      confirmed: true,
    })
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    const slot = removed.workout.groups[0].slots[0]
    expect(slot.technique).toBe('none')
    expect(slot.rest_pause_seconds).toBeNull()
    expect(slot.max_rest_pauses).toBeNull()
  })
})

describe('canvasGroupToWritePayload derived legacy', () => {
  it('writes first-set reps to parent reps_per_set', () => {
    const w = workoutWithTwoSoloGroups()
    w.groups[0].slots[0].prescriptions = [
      { set_number: 1, reps: '5' },
      { set_number: 2, reps: '3' },
    ]
    const { canvasGroupToWritePayload } = require('@/lib/groupModel/canvasActions')
    const payload = canvasGroupToWritePayload(w.groups[0])
    expect(payload.reps_per_set).toBe('5')
    expect(payload.slots[0].reps).toBe('5')
  })
})

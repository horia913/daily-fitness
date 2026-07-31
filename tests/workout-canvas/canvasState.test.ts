import { applyCanvasAction } from '@/lib/groupModel/canvasActions'
import { createEmptyCanvasWorkout, createDefaultExercise, createSoloGroup } from '@/lib/groupModel/canvasTypes'

const EX_A = '11111111-1111-1111-1111-111111111111'
const EX_B = '22222222-2222-2222-2222-222222222222'
const EX_C = '33333333-3333-3333-3333-333333333333'

function workoutWithOneExercise() {
  const g = createSoloGroup(createDefaultExercise(EX_A, { id: EX_A, name: 'Squat' }, 1), 1)
  return createEmptyCanvasWorkout({ groups: [g] })
}

describe('canvas session state', () => {
  it('keeps empty enabled property column after add (no value entered)', () => {
    const w = workoutWithOneExercise()
    const groupId = w.groups[0].id
    const slotId = w.groups[0].slots[0].id
    const stripped = applyCanvasAction(w, {
      type: 'UPDATE_SLOT',
      groupId,
      slotId,
      patch: { enabledProperties: ['load'] },
    })
    expect(stripped.ok).toBe(true)
    const withRir = applyCanvasAction(stripped.ok ? stripped.workout : w, {
      type: 'ADD_PROPERTY',
      groupId,
      slotId,
      property: 'rir',
    })
    expect(withRir.ok).toBe(true)
    if (withRir.ok) {
      expect(withRir.workout.groups[0].slots[0].enabledProperties).toContain('rir')
      expect(withRir.workout.groups[0].slots[0].prescriptions[0].rir ?? null).toBeNull()
    }
  })

  it('delete then add during save window keeps both mutations in local state', () => {
    let w = workoutWithOneExercise()
    const groupId = w.groups[0].id
    const slotA = w.groups[0].slots[0].id

    const deleted = applyCanvasAction(w, { type: 'DELETE_SLOT', groupId, slotId: slotA })
    expect(deleted.ok).toBe(true)
    w = deleted.ok ? deleted.workout : w
    expect(w.groups).toHaveLength(0)

    const added = applyCanvasAction(w, {
      type: 'ADD_EXERCISE',
      exerciseId: EX_C,
      exercise: { id: EX_C, name: 'Curl' },
    })
    expect(added.ok).toBe(true)
    if (added.ok) {
      expect(added.workout.groups).toHaveLength(1)
      expect(added.workout.groups[0].slots[0].exercise_id).toBe(EX_C)
    }
  })

  it('does not clobber newer local edits when simulating stale save completion', () => {
    const w = workoutWithOneExercise()
    const snapshotAtSaveStart = JSON.parse(JSON.stringify(w)) as typeof w
    const groupId = w.groups[0].id
    const slotId = w.groups[0].slots[0].id

    const newer = applyCanvasAction(w, {
      type: 'ADD_PROPERTY',
      groupId,
      slotId,
      property: 'tempo',
    })
    expect(newer.ok).toBe(true)

    const staleReloadWouldBe = snapshotAtSaveStart
    const localStillHasTempo = newer.ok
      ? newer.workout.groups[0].slots[0].enabledProperties.includes('tempo')
      : false
    const staleWouldLackTempo =
      !staleReloadWouldBe.groups[0].slots[0].enabledProperties.includes('tempo')

    expect(localStillHasTempo).toBe(true)
    expect(staleWouldLackTempo).toBe(true)
    if (newer.ok) {
      expect(newer.workout.groups[0].slots[0].enabledProperties).not.toEqual(
        staleReloadWouldBe.groups[0].slots[0].enabledProperties,
      )
    }
  })

  it('remove from group and regroup preserves exercises', () => {
    let w = createEmptyCanvasWorkout({
      groups: [
        createSoloGroup(createDefaultExercise(EX_A, { id: EX_A, name: 'A' }, 1), 1),
        createSoloGroup(createDefaultExercise(EX_B, { id: EX_B, name: 'B' }, 1), 2),
      ],
    })
    const grouped = applyCanvasAction(w, {
      type: 'GROUP_SELECTED',
      groupIds: w.groups.map((g) => g.id),
    })
    expect(grouped.ok).toBe(true)
    w = grouped.ok ? grouped.workout : w
    expect(w.groups[0].slots).toHaveLength(2)

    const ungrouped = applyCanvasAction(w, { type: 'UNGROUP', groupId: w.groups[0].id })
    expect(ungrouped.ok).toBe(true)
    w = ungrouped.ok ? ungrouped.workout : w
    expect(w.groups).toHaveLength(2)

    const regroup = applyCanvasAction(w, {
      type: 'GROUP_SELECTED',
      groupIds: w.groups.map((g) => g.id),
    })
    expect(regroup.ok).toBe(true)
    if (regroup.ok) {
      expect(regroup.workout.groups).toHaveLength(1)
      expect(regroup.workout.groups[0].slots).toHaveLength(2)
    }
  })
})

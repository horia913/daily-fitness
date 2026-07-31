import {
  buildCanvasGroupsRpcPayload,
  saveWorkoutFromCanvas,
} from '@/lib/groupModel/canvasSave'
import { createDefaultExercise, createEmptyCanvasWorkout, createSoloGroup } from '@/lib/groupModel/canvasTypes'

const TEMPLATE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const ENTRY_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const SLOT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const COACH_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const EXERCISE_ID = '11111111-1111-1111-1111-111111111111'

function buildWorkout() {
  const slot = createDefaultExercise(EXERCISE_ID, { id: EXERCISE_ID, name: 'Curl' }, 1)
  slot.id = SLOT_ID
  slot.technique = 'drop_set'
  slot.drop_percentage = 25
  slot.max_drops = 2
  slot.enabledProperties = [...slot.enabledProperties, 'drop_set']
  const group = createSoloGroup(slot, 1)
  group.id = ENTRY_ID
  return createEmptyCanvasWorkout({
    id: TEMPLATE_ID,
    name: 'Hammer test',
    groups: [{ ...group, id: ENTRY_ID }],
  })
}

describe('buildCanvasGroupsRpcPayload', () => {
  it('serializes group → slots → prescriptions with canvas UUIDs and ordering', () => {
    const workout = buildWorkout()
    const groups = buildCanvasGroupsRpcPayload(workout)

    expect(groups).toHaveLength(1)
    expect(groups[0].id).toBe(ENTRY_ID)
    expect(groups[0].set_order).toBe(1)
    expect(groups[0].is_optional).toBe(false)
    expect(Array.isArray(groups[0].slots)).toBe(true)

    const slots = groups[0].slots as Record<string, unknown>[]
    expect(slots).toHaveLength(1)
    expect(slots[0].id).toBe(SLOT_ID)
    expect(slots[0].set_entry_id).toBe(ENTRY_ID)
    expect(slots[0].exercise_id).toBe(EXERCISE_ID)
    expect(slots[0].technique).toBe('drop_set')
    expect(slots[0].is_optional).toBe(false)
    expect(slots[0].drop_percentage).toBe(25)

    const rx = slots[0].prescriptions as Record<string, unknown>[]
    expect(rx.length).toBeGreaterThan(0)
    expect(rx[0].slot_id).toBe(SLOT_ID)
    expect(rx[0].set_number).toBe(1)
  })
})

describe('saveWorkoutFromCanvas RPC path', () => {
  it('calls save_workout_canvas once with shaped payload — no per-table deletes', async () => {
    const rpc = jest.fn(async () => ({ error: null }))
    const upsert = jest.fn(async () => ({ error: null }))
    const from = jest.fn((table: string) => {
      if (table === 'workout_templates') {
        return { upsert }
      }
      return {
        select: jest.fn(),
        delete: jest.fn(),
        insert: jest.fn(),
      }
    })

    const workout = buildWorkout()
    const result = await saveWorkoutFromCanvas({
      supabase: { from, rpc } as never,
      userId: COACH_ID,
      workout,
    })

    expect(result.success).toBe(true)
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: TEMPLATE_ID,
        coach_id: COACH_ID,
        kind: 'library',
      }),
      { onConflict: 'id' },
    )
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('save_workout_canvas', {
      p_workout_id: TEMPLATE_ID,
      p_groups: buildCanvasGroupsRpcPayload(workout),
    })
    expect(from).not.toHaveBeenCalledWith('workout_set_entry_exercises')
    expect(from).not.toHaveBeenCalledWith('workout_set_prescriptions')
    expect(from).not.toHaveBeenCalledWith('workout_set_entries')
  })

  it('upserts template row (idempotent on retry) then calls RPC once', async () => {
    const rpc = jest.fn(async () => ({ error: null }))
    let upserted = false
    const from = jest.fn((table: string) => {
      if (table === 'workout_templates') {
        return {
          upsert: jest.fn(async () => {
            upserted = true
            return { error: null }
          }),
        }
      }
      return {}
    })

    const workout = buildWorkout()
    const result = await saveWorkoutFromCanvas({
      supabase: { from, rpc } as never,
      userId: COACH_ID,
      workout,
      isNew: true,
    })

    expect(result.success).toBe(true)
    expect(upserted).toBe(true)
    expect(rpc).toHaveBeenCalledTimes(1)
  })
})

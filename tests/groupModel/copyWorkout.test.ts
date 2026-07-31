import { copyWorkout } from '@/lib/groupModel/copyWorkout'

const SOURCE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const NEW_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const ENTRY_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const SLOT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const COACH_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'

function mockSupabase(sourceRow: Record<string, unknown>, entries: unknown[], slots: unknown[], rx: unknown[]) {
  let insertTemplatePayload: Record<string, unknown> | null = null
  type SupabaseChain = {
    select: jest.Mock
    eq: jest.Mock
    in: jest.Mock
    order: jest.Mock
    single: jest.Mock
    maybeSingle: jest.Mock
    insert: jest.Mock
    delete: jest.Mock
  }
  const from = jest.fn((table: string) => {
    const chain: Record<string, jest.Mock> = {}
    const api: SupabaseChain = {
      select: jest.fn(() => api),
      eq: jest.fn(() => api),
      in: jest.fn(() => api),
      order: jest.fn(() => api),
      single: jest.fn(async () => {
        if (table === 'workout_templates') {
          return { data: sourceRow, error: null }
        }
        return { data: null, error: null }
      }),
      maybeSingle: jest.fn(async () => ({ data: sourceRow, error: null })),
      insert: jest.fn((rows: unknown) => {
        if (table === 'workout_templates') {
          insertTemplatePayload = Array.isArray(rows) ? rows[0] : rows
          return { select: jest.fn(() => ({ single: jest.fn(async () => ({ data: { id: NEW_ID }, error: null })) })) }
        }
        return Promise.resolve({ error: null })
      }),
      delete: jest.fn(() => api),
    }
    if (table === 'workout_set_entries') {
      api.eq = jest.fn(() => ({
        order: jest.fn(async () => ({ data: entries, error: null })),
      }))
    }
    if (table === 'workout_set_entry_exercises') {
      api.in = jest.fn(() => ({
        order: jest.fn(async () => ({ data: slots, error: null })),
      }))
    }
    if (table === 'workout_set_prescriptions') {
      api.in = jest.fn(() => ({
        order: jest.fn(async () => ({ data: rx, error: null })),
      }))
    }
    return api
  })
  return { supabase: { from }, insertTemplatePayload: () => insertTemplatePayload }
}

describe('copyWorkout', () => {
  it('creates a new workout with kind and source_workout_id', async () => {
    const { supabase, insertTemplatePayload } = mockSupabase(
      {
        id: SOURCE_ID,
        name: 'Leg day',
        description: 'd',
        category: 'strength',
        difficulty_level: 'intermediate',
        estimated_duration: 45,
      },
      [
        {
          id: ENTRY_ID,
          template_id: SOURCE_ID,
          set_order: 1,
          set_type: 'straight_set',
          total_sets: 3,
          rounds_driver: 'fixed',
        },
      ],
      [
        {
          id: SLOT_ID,
          set_entry_id: ENTRY_ID,
          exercise_id: '11111111-1111-1111-1111-111111111111',
          exercise_order: 1,
          measurement: 'reps',
          technique: 'none',
        },
      ],
      [{ id: 'rx1', slot_id: SLOT_ID, set_number: 1, reps: '5', weight_kg: 80 }],
    )

    const newId = await copyWorkout(supabase as any, SOURCE_ID, {
      kind: 'program_day',
      coachId: COACH_ID,
      name: 'Leg day copy',
    })

    expect(newId).toBe(NEW_ID)
    expect(insertTemplatePayload()).toMatchObject({
      kind: 'program_day',
      source_workout_id: SOURCE_ID,
      name: 'Leg day copy',
      coach_id: COACH_ID,
    })
  })
})

import { deriveSetType } from '@/lib/groupModel/deriveSetType'
import { formExerciseToGroupModel } from '@/lib/groupModel/formToGroupModel'
import { toLegacyBlockShape } from '@/lib/groupModel/toLegacyBlockShape'
import { adaptRpcBlockToLegacy } from '@/lib/groupModel/adaptBlockRow'
import type { GroupModelEntry, GroupModelSlot } from '@/lib/groupModel/types'

const EX_A = '11111111-1111-1111-1111-111111111111'
const EX_B = '22222222-2222-2222-2222-222222222222'
const EX_C = '33333333-3333-3333-3333-333333333333'
const BLOCK_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TMPL_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

function payloadToLegacy(
  payload: ReturnType<typeof formExerciseToGroupModel>,
  setOrder = 1,
): ReturnType<typeof toLegacyBlockShape> {
  const group: GroupModelEntry = {
    id: BLOCK_ID,
    template_id: TMPL_ID,
    set_order: setOrder,
    rounds_driver: payload.rounds_driver,
    interval_seconds: payload.interval_seconds,
    time_cap_seconds: payload.time_cap_seconds,
    total_sets: payload.total_sets,
    rest_seconds: payload.rest_seconds,
    duration_seconds: payload.duration_seconds,
    set_type: payload.set_type,
    reps_per_set: payload.reps_per_set,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
  const slots: GroupModelSlot[] = payload.slots.map((s, i) => ({
    id: `slot-${i}`,
    set_entry_id: BLOCK_ID,
    ...s,
  }))
  return toLegacyBlockShape(group, slots)
}

describe('deriveSetType', () => {
  it('maps technique and driver rules', () => {
    expect(
      deriveSetType({ rounds_driver: 'fixed', total_sets: 3 }, [
        { measurement: 'reps', technique: 'drop_set' },
      ]),
    ).toBe('drop_set')
    expect(
      deriveSetType({ rounds_driver: 'amrap', total_sets: 1 }, [
        { measurement: 'reps', technique: 'none' },
      ]),
    ).toBe('amrap')
    expect(
      deriveSetType({ rounds_driver: 'interval', total_sets: 1 }, [
        { measurement: 'reps', technique: 'none' },
      ]),
    ).toBe('emom')
    expect(
      deriveSetType({ rounds_driver: 'fixed', total_sets: 2 }, [
        { measurement: 'reps', technique: 'none' },
        { measurement: 'reps', technique: 'none' },
      ]),
    ).toBe('superset')
    expect(
      deriveSetType({ rounds_driver: 'fixed', total_sets: 1 }, [
        { measurement: 'reps', technique: 'none' },
        { measurement: 'reps', technique: 'none' },
        { measurement: 'reps', technique: 'none' },
      ]),
    ).toBe('giant_set')
  })
})

describe('group model round-trip', () => {
  it('straight_set', () => {
    const payload = formExerciseToGroupModel(
      { exercise_id: EX_A, sets: '3', reps: '10', weight_kg: '60' },
      'straight_set',
    )
    expect(payload.set_type).toBe('straight_set')
    const legacy = payloadToLegacy(payload)
    expect(legacy.set_type).toBe('straight_set')
    expect(legacy.exercises?.[0]?.reps).toBe('10')
    expect(legacy.reps_per_set).toBe('10')
  })

  it('superset', () => {
    const payload = formExerciseToGroupModel(
      {
        exercise_id: EX_A,
        superset_exercise_id: EX_B,
        sets: '3',
        reps: '12',
        superset_reps: '10',
      },
      'superset',
    )
    expect(payload.set_type).toBe('superset')
    const legacy = payloadToLegacy(payload)
    expect(legacy.exercises).toHaveLength(2)
    expect(legacy.exercises?.[0]?.exercise_letter).toBe('A')
    expect(legacy.exercises?.[1]?.exercise_letter).toBe('B')
  })

  it('giant_set', () => {
    const payload = formExerciseToGroupModel(
      {
        sets: '4',
        giant_set_exercises: [
          { exercise_id: EX_A, reps: '10' },
          { exercise_id: EX_B, reps: '12' },
          { exercise_id: EX_C, reps: '15' },
        ],
      },
      'giant_set',
    )
    expect(payload.set_type).toBe('giant_set')
    const legacy = payloadToLegacy(payload)
    expect(legacy.set_type).toBe('giant_set')
    expect(legacy.exercises).toHaveLength(3)
  })

  it('pre_exhaustion derives as superset', () => {
    const payload = formExerciseToGroupModel(
      {
        exercise_id: EX_A,
        compound_exercise_id: EX_B,
        isolation_reps: '15',
        compound_reps: '8',
        sets: '3',
      },
      'pre_exhaustion',
    )
    expect(payload.set_type).toBe('superset')
    const legacy = payloadToLegacy(payload)
    expect(legacy.set_type).toBe('superset')
  })

  it('drop_set synthesizes drop_sets row', () => {
    const payload = formExerciseToGroupModel(
      {
        exercise_id: EX_A,
        sets: '3',
        drop_set_reps: '8-10',
        drop_percentage: '25',
        weight_kg: '80',
      },
      'drop_set',
    )
    const legacy = payloadToLegacy(payload)
    expect(legacy.set_type).toBe('drop_set')
    expect(legacy.exercises?.[0]?.drop_sets?.[0]?.drop_order).toBe(1)
    expect(legacy.exercises?.[0]?.drop_sets?.[0]?.drop_percentage).toBe(25)
  })

  it('cluster_set', () => {
    const payload = formExerciseToGroupModel(
      {
        exercise_id: EX_A,
        cluster_reps: '5',
        clusters_per_set: '4',
        intra_cluster_rest: '20',
        rest_seconds: '90',
      },
      'cluster_set',
    )
    const legacy = payloadToLegacy(payload)
    expect(legacy.exercises?.[0]?.cluster_sets?.[0]?.reps_per_cluster).toBe(5)
    expect(legacy.exercises?.[0]?.cluster_sets?.[0]?.intra_cluster_rest).toBe(20)
  })

  it('rest_pause', () => {
    const payload = formExerciseToGroupModel(
      {
        exercise_id: EX_A,
        rest_pause_duration: '20',
        max_rest_pauses: '4',
      },
      'rest_pause',
    )
    const legacy = payloadToLegacy(payload)
    expect(legacy.exercises?.[0]?.rest_pause_sets?.[0]?.rest_pause_duration).toBe(20)
    expect(legacy.exercises?.[0]?.rest_pause_sets?.[0]?.max_rest_pauses).toBe(4)
  })

  it('amrap', () => {
    const payload = formExerciseToGroupModel(
      { exercise_id: EX_A, amrap_duration: '12', target_reps: '50' },
      'amrap',
    )
    const legacy = payloadToLegacy(payload)
    expect(legacy.set_type).toBe('amrap')
    expect(legacy.duration_seconds).toBe(720)
    expect(legacy.exercises?.[0]?.time_protocols?.[0]?.protocol_type).toBe('amrap')
    expect(legacy.exercises?.[0]?.time_protocols?.[0]?.total_duration_minutes).toBe(12)
  })

  it('emom reps mode uses target_reps for executor', () => {
    const payload = formExerciseToGroupModel(
      { exercise_id: EX_A, emom_duration: '10', emom_mode: 'target_reps', emom_reps: '15' },
      'emom',
    )
    const legacy = payloadToLegacy(payload)
    expect(legacy.set_type).toBe('emom')
    const tp = legacy.exercises?.[0]?.time_protocols?.[0]
    expect(tp?.emom_mode).toBe('target_reps')
    expect(tp?.reps_per_round).toBe(15)
  })

  it('emom time mode uses time_based for executor', () => {
    const payload = formExerciseToGroupModel(
      { exercise_id: EX_A, emom_duration: '8', emom_mode: 'time_based', work_seconds: '40' },
      'emom',
    )
    const legacy = payloadToLegacy(payload)
    const tp = legacy.exercises?.[0]?.time_protocols?.[0]
    expect(tp?.emom_mode).toBe('time_based')
    expect(tp?.work_seconds).toBe(40)
  })

  it('for_time', () => {
    const payload = formExerciseToGroupModel(
      { exercise_id: EX_A, time_cap: '15', target_reps: '100' },
      'for_time',
    )
    const legacy = payloadToLegacy(payload)
    expect(legacy.set_type).toBe('for_time')
    expect(legacy.exercises?.[0]?.time_protocols?.[0]?.time_cap_minutes).toBe(15)
    expect(legacy.exercises?.[0]?.time_protocols?.[0]?.target_reps).toBe(100)
  })

  it('tabata', () => {
    const payload = formExerciseToGroupModel(
      {
        rounds: '6',
        work_seconds: '30',
        rest_after_set: '60',
        tabata_sets: [
          {
            exercises: [
              { exercise_id: EX_A, work_seconds: '30', rest_after: '10' },
              { exercise_id: EX_B, work_seconds: '30', rest_after: '10' },
            ],
          },
        ],
      },
      'tabata',
    )
    const legacy = payloadToLegacy(payload)
    expect(legacy.set_type).toBe('tabata')
    expect(legacy.exercises).toHaveLength(2)
    expect(legacy.exercises?.[0]?.time_protocols?.[0]?.work_seconds).toBe(30)
    expect(legacy.exercises?.[0]?.time_protocols?.[0]?.rounds).toBe(6)
  })

  it('timed_set', () => {
    const payload = formExerciseToGroupModel(
      { exercise_id: EX_A, sets: '3', work_seconds: '45' },
      'timed_set',
    )
    const legacy = payloadToLegacy(payload)
    expect(legacy.set_type).toBe('timed_set')
    expect(legacy.exercises?.[0]?.reps).toBeUndefined()
  })

  it('speed_work', () => {
    const payload = formExerciseToGroupModel(
      {
        exercise_id: EX_A,
        speed_intervals: '5',
        speed_distance_meters: '400',
        speed_rest_seconds: '90',
        speed_max_speed_percent: '95',
      },
      'speed_work',
    )
    const legacy = payloadToLegacy(payload)
    expect(legacy.set_type).toBe('speed_work')
    expect(legacy.exercises?.[0]?.speed_sets?.[0]?.intervals).toBe(5)
    expect(legacy.exercises?.[0]?.speed_sets?.[0]?.distance_meters).toBe(400)
  })

  it('endurance', () => {
    const payload = formExerciseToGroupModel(
      {
        exercise_id: EX_A,
        endurance_distance_km: '5',
        endurance_target_time_seconds: '1800',
        endurance_hr_zone: '3',
      },
      'endurance',
    )
    const legacy = payloadToLegacy(payload)
    expect(legacy.set_type).toBe('endurance')
    expect(legacy.exercises?.[0]?.endurance_sets?.[0]?.target_distance_meters).toBe(5000)
    expect(legacy.exercises?.[0]?.endurance_sets?.[0]?.hr_zone).toBe(3)
  })
})

describe('adaptRpcBlockToLegacy', () => {
  it('ignores satellite arrays and uses group columns', () => {
    const legacy = adaptRpcBlockToLegacy({
      id: BLOCK_ID,
      template_id: TMPL_ID,
      set_order: 1,
      set_type: 'drop_set',
      rounds_driver: 'fixed',
      total_sets: 3,
      reps_per_set: '10',
      rest_seconds: 90,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      exercises: [
        {
          id: 'wsee-1',
          set_entry_id: BLOCK_ID,
          exercise_id: EX_A,
          exercise_order: 1,
          measurement: 'reps',
          technique: 'drop_set',
          reps: '10',
          weight_kg: 100,
          drop_percentage: 20,
        },
      ],
      drop_sets: [
        {
          id: 'stale-drop',
          exercise_id: EX_A,
          exercise_order: 1,
          drop_order: 99,
          drop_percentage: 99,
        },
      ],
    })
    expect(legacy.set_type).toBe('drop_set')
    expect(legacy.exercises?.[0]?.drop_sets?.[0]?.drop_percentage).toBe(20)
    expect(legacy.exercises?.[0]?.drop_sets?.[0]?.drop_order).toBe(1)
  })

  it('fixes emom_mode from live rep_based to executor target_reps', () => {
    const legacy = adaptRpcBlockToLegacy({
      id: BLOCK_ID,
      template_id: TMPL_ID,
      set_order: 2,
      set_type: 'emom',
      rounds_driver: 'interval',
      interval_seconds: 60,
      duration_seconds: 600,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      exercises: [
        {
          id: 'wsee-1',
          set_entry_id: BLOCK_ID,
          exercise_id: EX_A,
          exercise_order: 1,
          measurement: 'reps',
          technique: 'none',
          reps: '12',
        },
      ],
      time_protocols: [
        {
          id: 'stale-tp',
          exercise_id: EX_A,
          exercise_order: 1,
          protocol_type: 'emom',
          emom_mode: 'rep_based',
        },
      ],
    })
    expect(legacy.exercises?.[0]?.time_protocols?.[0]?.emom_mode).toBe('target_reps')
    expect(legacy.exercises?.[0]?.time_protocols?.[0]?.reps_per_round).toBe(12)
  })
})

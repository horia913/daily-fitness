import {
  addSetToGroup,
  clearMeasurementValues,
  derivedLegacyFromPrescriptions,
  emptyPrescription,
  prescriptionsFromSlotLegacy,
  removeSetFromGroup,
  syncPrescriptionsForGroup,
} from '@/lib/groupModel/prescriptions'
import type { Prescription } from '@/lib/groupModel/types'

describe('prescriptions sync', () => {
  const slot = {
    prescriptions: [
      { set_number: 1, reps: '5', weight_kg: 80 },
      { set_number: 2, reps: '5', weight_kg: 80 },
      { set_number: 3, reps: '3', weight_kg: 85 },
    ],
  }

  it('keeps varied per-set values on round-trip shape', () => {
    expect(slot.prescriptions.map((p) => p.reps)).toEqual(['5', '5', '3'])
  })

  it('syncs superset slots to same row count on add set', () => {
    const slots = [
      { prescriptions: [...slot.prescriptions] },
      { prescriptions: [...slot.prescriptions] },
    ]
    const { slots: next, totalSets } = addSetToGroup(slots, 3, 'fixed')
    expect(totalSets).toBe(4)
    expect(next[0].prescriptions).toHaveLength(4)
    expect(next[1].prescriptions).toHaveLength(4)
    expect(next[0].prescriptions[3].reps).toBe('3')
    expect(next[1].prescriptions[3].reps).toBe('3')
  })

  it('amrap driver keeps exactly one row per slot', () => {
    const synced = syncPrescriptionsForGroup([slot], 5, 'amrap')
    expect(synced[0].prescriptions).toHaveLength(1)
  })

  it('remove set decrements total and rows', () => {
    const { slots: next, totalSets } = removeSetFromGroup([slot], 3, 'fixed')
    expect(totalSets).toBe(2)
    expect(next[0].prescriptions).toHaveLength(2)
  })
})

describe('derived legacy from prescriptions', () => {
  it('uses first row for slot scalars', () => {
    const rows: Prescription[] = [
      { set_number: 1, reps: '5', weight_kg: 60, rpe: 2, tempo: '3010' },
      { set_number: 2, reps: '5', weight_kg: 62 },
    ]
    expect(derivedLegacyFromPrescriptions(rows)).toEqual({
      reps: '5',
      weight_kg: 60,
      load_percentage: null,
      rpe: 2,
      tempo: '3010',
      work_seconds: null,
      distance_meters: null,
    })
  })
})

describe('measurement switch clearing', () => {
  it('clears measurement columns', () => {
    const cleared = clearMeasurementValues([
      { set_number: 1, reps: '10', work_seconds: 30, distance_meters: 100 },
    ])
    expect(cleared[0].reps).toBeNull()
    expect(cleared[0].work_seconds).toBeNull()
    expect(cleared[0].distance_meters).toBeNull()
  })
})

describe('prescriptionsFromSlotLegacy fallback', () => {
  it('clones slot scalars into first row', () => {
    const rows = prescriptionsFromSlotLegacy({ reps: '8', weight_kg: 70 }, 3, 'fixed')
    expect(rows).toHaveLength(3)
    expect(rows[0].reps).toBe('8')
    expect(rows[0].weight_kg).toBe(70)
    expect(rows[1].set_number).toBe(2)
    expect(rows[1].reps).toBeUndefined()
  })
})

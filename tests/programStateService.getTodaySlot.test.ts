/**
 * Unit tests for getTodaySlot (Phase C — Today Resolution)
 *
 * getTodaySlot(slots, unlockedWeekMax, todayWeekday):
 * - Returns slot in unlocked week where day_of_week === todayWeekday
 * - Does not filter by completion
 * - Returns null when no match (Rest day)
 * - If multiple slots match (should not happen), returns first by array order
 */

import { describe, it, expect } from '@jest/globals'
import { getTodaySlot } from '../src/lib/programStateService'
import type { ProgramScheduleSlot } from '../src/lib/programStateService'

const mkSlot = (id: string, week: number, dayNum: number, dayOfWeek: number): ProgramScheduleSlot => ({
  id,
  program_id: 'p1',
  week_number: week,
  day_number: dayNum,
  day_of_week: dayOfWeek,
  template_id: 't1',
})

describe('getTodaySlot', () => {
  const week1Slots: ProgramScheduleSlot[] = [
    mkSlot('s1', 1, 1, 0), // Mon
    mkSlot('s2', 1, 2, 1), // Tue
    mkSlot('s3', 1, 3, 2), // Wed
    mkSlot('s4', 1, 4, 3), // Thu
    mkSlot('s5', 1, 5, 4), // Fri
    mkSlot('s6', 1, 6, 5), // Sat
    mkSlot('s7', 1, 7, 6), // Sun
  ]

  it('returns matching slot for day_of_week (Monday=0)', () => {
    const result = getTodaySlot(week1Slots, 1, 0)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('s1')
    expect(result!.day_of_week).toBe(0)
    expect(result!.day_number).toBe(1)
  })

  it('returns matching slot for day_of_week (Wednesday=2)', () => {
    const result = getTodaySlot(week1Slots, 1, 2)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('s3')
    expect(result!.day_of_week).toBe(2)
  })

  it('returns matching slot for day_of_week (Sunday=6)', () => {
    const result = getTodaySlot(week1Slots, 1, 6)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('s7')
    expect(result!.day_of_week).toBe(6)
  })

  it('returns null when no match (Rest day)', () => {
    // Program has Mon,Tue,Thu,Fri,Sat — no Wed
    const sparseSlots = [
      mkSlot('a', 1, 1, 0),
      mkSlot('b', 1, 2, 1),
      mkSlot('c', 1, 3, 3), // Thu
      mkSlot('d', 1, 4, 4),
      mkSlot('e', 1, 5, 5),
    ]
    const result = getTodaySlot(sparseSlots, 1, 2) // Wednesday
    expect(result).toBeNull()
  })

  it('returns null when unlocked week has no slots', () => {
    const week2Only: ProgramScheduleSlot[] = [
      mkSlot('w2-1', 2, 1, 0),
      mkSlot('w2-2', 2, 2, 1),
    ]
    const result = getTodaySlot(week2Only, 1, 0) // week 1 requested, but slots are week 2
    expect(result).toBeNull()
  })

  it('returns slot only from unlocked week', () => {
    const multiWeek = [
      ...week1Slots,
      mkSlot('w2-1', 2, 1, 0),
      mkSlot('w2-2', 2, 2, 1),
    ]
    const result = getTodaySlot(multiWeek, 1, 0)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('s1')
    expect(result!.week_number).toBe(1)

    const result2 = getTodaySlot(multiWeek, 2, 1)
    expect(result2).not.toBeNull()
    expect(result2!.id).toBe('w2-2')
    expect(result2!.week_number).toBe(2)
  })

  it('returns first match when multiple slots have same day_of_week (deterministic)', () => {
    const dupDay = [
      mkSlot('a', 1, 1, 0),
      mkSlot('b', 1, 2, 0),
      mkSlot('c', 1, 3, 0),
    ]
    const result = getTodaySlot(dupDay, 1, 0)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('a')
  })
})

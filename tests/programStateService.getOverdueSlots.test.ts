/**
 * Unit tests for getOverdueSlots (Phase D — Overdue Logic)
 *
 * getOverdueSlots(slots, completedSlots, unlockedWeekMax, todaySlot, todayWeekday, maxCount?):
 * - Works only inside unlockedWeekMax slots
 * - Excludes completed slots (using completedSlots semantics)
 * - If todaySlot exists: overdue = uncompleted where day_number < todaySlot.day_number
 * - If todaySlot null (rest day): overdue = uncompleted where day_of_week < todayWeekday
 * - Returns ascending order, capped at maxCount (default 2)
 * - Pure function, no side effects
 */

import { describe, it, expect } from '@jest/globals'
import { getOverdueSlots } from '../src/lib/programStateService'
import type { ProgramScheduleSlot, CompletedSlot } from '../src/lib/programStateService'

const mkSlot = (id: string, week: number, dayNum: number, dayOfWeek: number): ProgramScheduleSlot => ({
  id,
  program_id: 'p1',
  week_number: week,
  day_number: dayNum,
  day_of_week: dayOfWeek,
  template_id: 't1',
})

const mkCompleted = (scheduleId: string, week: number, dayNum: number): CompletedSlot => ({
  id: `c-${scheduleId}`,
  program_assignment_id: 'a1',
  program_schedule_id: scheduleId,
  completed_at: '2026-02-01T10:00:00Z',
  completed_by: 'u1',
  notes: null,
  week_number: week,
  day_number: dayNum,
  template_id: 't1',
})

describe('getOverdueSlots', () => {
  const week1Slots: ProgramScheduleSlot[] = [
    mkSlot('s1', 1, 1, 0), // Mon
    mkSlot('s2', 1, 2, 1), // Tue
    mkSlot('s3', 1, 3, 2), // Wed
    mkSlot('s4', 1, 4, 3), // Thu
    mkSlot('s5', 1, 5, 4), // Fri
    mkSlot('s6', 1, 6, 5), // Sat
    mkSlot('s7', 1, 7, 6), // Sun
  ]

  it('Case A: todaySlot exists — overdue by day_number < todaySlot.day_number, capped at 2', () => {
    const todaySlot = mkSlot('s4', 1, 4, 3) // Thu = day 4
    const completedSlots: CompletedSlot[] = []
    const result = getOverdueSlots(week1Slots, completedSlots, 1, todaySlot, 3, 2)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('s1')
    expect(result[1].id).toBe('s2')
    expect(result.every(s => s.day_number < 4)).toBe(true)
  })

  it('Case A: todaySlot exists — uses day_number not day_of_week', () => {
    // Today = Fri (day_number 5, day_of_week 4). Overdue = Mon..Thu by day_number
    const todaySlot = mkSlot('s5', 1, 5, 4)
    const completedSlots: CompletedSlot[] = []
    const result = getOverdueSlots(week1Slots, completedSlots, 1, todaySlot, 4, 2)
    expect(result.map(s => s.id)).toEqual(['s1', 's2'])
  })

  it('Case B: rest day (todaySlot null) — overdue by day_of_week < todayWeekday, capped at 2', () => {
    const todayWeekday = 4 // Friday
    const completedSlots: CompletedSlot[] = []
    const result = getOverdueSlots(week1Slots, completedSlots, 1, null, todayWeekday, 2)
    expect(result).toHaveLength(2)
    expect(result[0].day_of_week).toBe(0)
    expect(result[1].day_of_week).toBe(1)
    expect(result.every(s => s.day_of_week < 4)).toBe(true)
  })

  it('Case C: completed slots excluded', () => {
    const todaySlot = mkSlot('s5', 1, 5, 4) // Fri
    const completedSlots = [
      mkCompleted('s1', 1, 1),
      mkCompleted('s2', 1, 2),
    ]
    const result = getOverdueSlots(week1Slots, completedSlots, 1, todaySlot, 4, 2)
    expect(result.map(s => s.id)).toEqual(['s3', 's4']) // s1, s2 completed
  })

  it('Case D: only slots in unlockedWeekMax considered', () => {
    const multiWeek = [
      ...week1Slots,
      mkSlot('w2-1', 2, 1, 0),
      mkSlot('w2-2', 2, 2, 1),
    ]
    const todaySlot = mkSlot('s4', 1, 4, 3)
    const completedSlots: CompletedSlot[] = []
    const result = getOverdueSlots(multiWeek, completedSlots, 1, todaySlot, 3, 2)
    expect(result.every(s => s.week_number === 1)).toBe(true)
    expect(result.map(s => s.id)).toEqual(['s1', 's2'])
  })

  it('returns empty when no overdue', () => {
    const todaySlot = mkSlot('s1', 1, 1, 0) // Mon = first day
    const completedSlots: CompletedSlot[] = []
    const result = getOverdueSlots(week1Slots, completedSlots, 1, todaySlot, 0, 2)
    expect(result).toHaveLength(0)
  })

  it('default maxCount is 2', () => {
    const todaySlot = mkSlot('s7', 1, 7, 6) // Sun
    const completedSlots: CompletedSlot[] = []
    const result = getOverdueSlots(week1Slots, completedSlots, 1, todaySlot, 6)
    expect(result).toHaveLength(2)
  })
})

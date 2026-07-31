import {
  instanceTotalWeeks,
  computeInstanceAdherenceForWeek,
  resolveInstanceProgramWeek,
  type InstanceWeekAssignment,
  type InstancePhase,
} from '@/lib/programInstanceResolver'

const base = (over: Partial<InstanceWeekAssignment> = {}): InstanceWeekAssignment => ({
  start_date: '2026-01-01',
  pause_accumulated_days: 0,
  pause_status: 'active',
  paused_at: null,
  timezone_snapshot: 'UTC',
  status: 'active',
  ...over,
})

const phases = (...weeks: number[]): InstancePhase[] =>
  weeks.map((w) => ({ duration_weeks: w }))

describe('instanceTotalWeeks (N = sum of instance phases)', () => {
  it('sums phase durations', () => {
    expect(instanceTotalWeeks(phases(4, 4))).toBe(8)
    expect(instanceTotalWeeks(phases(2, 3, 1))).toBe(6)
  })

  it('ignores null/zero/negative/NaN phase durations', () => {
    expect(
      instanceTotalWeeks([
        { duration_weeks: 4 },
        { duration_weeks: null },
        { duration_weeks: 0 },
        { duration_weeks: -2 },
        { duration_weeks: undefined },
      ]),
    ).toBe(4)
  })

  it('returns 0 for empty/undefined phases', () => {
    expect(instanceTotalWeeks([])).toBe(0)
    // @ts-expect-error testing defensive nullish handling
    expect(instanceTotalWeeks(undefined)).toBe(0)
  })
})

describe('resolveInstanceProgramWeek — X derivation + clamp', () => {
  it('week 1 on the start date', () => {
    const r = resolveInstanceProgramWeek(base(), phases(4), 'UTC', '2026-01-01')
    expect(r.currentWeek).toBe(1)
    expect(r.totalWeeks).toBe(4)
    expect(r.clamped).toBe(false)
  })

  it('advances one week every 7 calendar days', () => {
    expect(resolveInstanceProgramWeek(base(), phases(4), 'UTC', '2026-01-08').currentWeek).toBe(2)
    expect(resolveInstanceProgramWeek(base(), phases(4), 'UTC', '2026-01-15').currentWeek).toBe(3)
  })

  it('N is the sum of phases (not MAX slot weeks or other fallbacks)', () => {
    const r = resolveInstanceProgramWeek(base(), phases(2, 2), 'UTC', '2026-01-01')
    expect(r.totalWeeks).toBe(4)
  })

  it('clamps X down to N when the calendar week exceeds N', () => {
    const r = resolveInstanceProgramWeek(base(), phases(1), 'UTC', '2026-01-15') // raw week 3
    expect(r.currentWeek).toBe(1)
    expect(r.clamped).toBe(true)
  })

  it('does not clamp when X == N', () => {
    const r = resolveInstanceProgramWeek(base(), phases(2), 'UTC', '2026-01-08') // raw week 2
    expect(r.currentWeek).toBe(2)
    expect(r.clamped).toBe(false)
  })

  it('with no phases (N=0) there is no cap', () => {
    const r = resolveInstanceProgramWeek(base(), [], 'UTC', '2026-01-15') // raw week 3
    expect(r.totalWeeks).toBe(0)
    expect(r.currentWeek).toBe(3)
    expect(r.clamped).toBe(false)
  })

  it('floors a missing start date to week 1', () => {
    const r = resolveInstanceProgramWeek(base({ start_date: null }), phases(4), 'UTC', '2026-06-01')
    expect(r.currentWeek).toBe(1)
  })
})

describe('resolveInstanceProgramWeek — pause handling', () => {
  it('pause_accumulated_days shifts the effective start forward', () => {
    // start 2026-01-01 + 7 paused days => effective start 2026-01-08;
    // target 2026-01-15 => elapsed 7 days => week 2 (would be week 3 without pause)
    const r = resolveInstanceProgramWeek(
      base({ pause_accumulated_days: 7 }),
      phases(8),
      'UTC',
      '2026-01-15',
    )
    expect(r.currentWeek).toBe(2)
  })

  it('while currently paused, the target is frozen at paused_at', () => {
    // paused at 2026-01-08; target 2026-01-22 => effective target frozen to 2026-01-08
    // elapsed 7 days from start => week 2 (does not advance during pause)
    const r = resolveInstanceProgramWeek(
      base({ pause_status: 'paused', paused_at: '2026-01-08T00:00:00Z' }),
      phases(8),
      'UTC',
      '2026-01-22',
    )
    expect(r.currentWeek).toBe(2)
  })
})

describe('resolveInstanceProgramWeek — isComplete', () => {
  it('is complete when status is completed (regardless of week/adherence)', () => {
    const r = resolveInstanceProgramWeek(base({ status: 'completed' }), phases(4), 'UTC', '2026-01-01')
    expect(r.isComplete).toBe(true)
  })

  it('is complete when at/after final week AND all required week-N slots done', () => {
    const r = resolveInstanceProgramWeek(
      base(),
      phases(2),
      'UTC',
      '2026-01-08', // week 2 == N
      { required: 3, completed: 3 },
    )
    expect(r.currentWeek).toBe(2)
    expect(r.isComplete).toBe(true)
  })

  it('is NOT complete when final-week adherence is incomplete', () => {
    const r = resolveInstanceProgramWeek(
      base(),
      phases(2),
      'UTC',
      '2026-01-08',
      { required: 3, completed: 2 },
    )
    expect(r.isComplete).toBe(false)
  })

  it('is NOT complete at final week when no adherence is supplied', () => {
    const r = resolveInstanceProgramWeek(base(), phases(2), 'UTC', '2026-01-08')
    expect(r.isComplete).toBe(false)
  })

  it('is NOT complete before the final week even with adherence', () => {
    const r = resolveInstanceProgramWeek(
      base(),
      phases(4),
      'UTC',
      '2026-01-08', // week 2 of 4
      { required: 3, completed: 3 },
    )
    expect(r.isComplete).toBe(false)
  })
})

describe('computeInstanceAdherenceForWeek — instance-keyed, optional excluded', () => {
  const slots = [
    { id: 'A', week_number: 1, is_optional: false },
    { id: 'B', week_number: 1, is_optional: false },
    { id: 'C', week_number: 1, is_optional: true }, // optional → never required
    { id: 'D', week_number: 2, is_optional: false }, // other week
  ]

  it('counts required (non-optional) slots for the week', () => {
    const r = computeInstanceAdherenceForWeek(slots, [], 1)
    expect(r.required).toBe(2) // A, B (C optional excluded)
    expect(r.completed).toBe(0)
  })

  it('counts only completions keyed to required slots of that week', () => {
    const completions = [
      { program_day_assignment_id: 'A' }, // required week 1 → counts
      { program_day_assignment_id: 'C' }, // optional → ignored
      { program_day_assignment_id: 'D' }, // week 2 → ignored
    ]
    const r = computeInstanceAdherenceForWeek(slots, completions, 1)
    expect(r.required).toBe(2)
    expect(r.completed).toBe(1)
  })

  it('de-duplicates repeated completions for the same slot', () => {
    const completions = [
      { program_day_assignment_id: 'A' },
      { program_day_assignment_id: 'A' },
      { program_day_assignment_id: 'B' },
    ]
    const r = computeInstanceAdherenceForWeek(slots, completions, 1)
    expect(r.completed).toBe(2)
  })

  it('returns {0,0} for a week with no required slots', () => {
    const optionalOnly = [{ id: 'X', week_number: 5, is_optional: true }]
    const r = computeInstanceAdherenceForWeek(optionalOnly, [{ program_day_assignment_id: 'X' }], 5)
    expect(r).toEqual({ required: 0, completed: 0 })
  })

  it('full adherence when all required slots completed', () => {
    const completions = [
      { program_day_assignment_id: 'A' },
      { program_day_assignment_id: 'B' },
    ]
    const r = computeInstanceAdherenceForWeek(slots, completions, 1)
    expect(r).toEqual({ required: 2, completed: 2 })
  })

  it('excludes a coach-skipped slot from the denominator (not a miss)', () => {
    const completions = [
      { program_day_assignment_id: 'A' }, // completed
      { program_day_assignment_id: 'B', notes: 'Skipped by coach: travel' }, // skip → excluded
    ]
    const r = computeInstanceAdherenceForWeek(slots, completions, 1)
    // B removed from required; A completed → 1/1
    expect(r).toEqual({ required: 1, completed: 1 })
  })

  it('coach-skip with no other completions yields a smaller denominator', () => {
    const completions = [
      { program_day_assignment_id: 'A', notes: 'Skipped by coach' },
    ]
    const r = computeInstanceAdherenceForWeek(slots, completions, 1)
    // A excluded, B still required and not done → 0/1
    expect(r).toEqual({ required: 1, completed: 0 })
  })

  it('all required slots coach-skipped → empty denominator', () => {
    const completions = [
      { program_day_assignment_id: 'A', notes: 'Skipped by coach' },
      { program_day_assignment_id: 'B', notes: 'Skipped by coach' },
    ]
    const r = computeInstanceAdherenceForWeek(slots, completions, 1)
    expect(r).toEqual({ required: 0, completed: 0 })
  })
})

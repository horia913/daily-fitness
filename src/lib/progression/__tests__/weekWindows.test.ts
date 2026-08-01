import {
  getCompletionMathFromWorkouts,
  getCurrentProgramWeek,
  getEffectiveToday,
  getNextDue,
  getProgramEnd,
  getProgramWeekWindows,
  getWorkoutDate,
  getWorkoutStatus,
  isInScope,
  type PauseState,
  type WorkoutRef,
} from '@/lib/progression/weekWindows'

/** Real Popescu assignment 3ffc6a7a-71d0-4fee-ab74-cffc66c327c5 */
const POPESCU = {
  assignmentId: '3ffc6a7a-71d0-4fee-ab74-cffc66c327c5',
  startDate: '2026-07-01', // Wednesday
  timeZone: 'Europe/Bucharest',
  totalWeeks: 13,
  pauses: {
    accumulatedDays: 0,
    pauseStatus: 'active',
    pausedAt: null,
  } satisfies PauseState,
  todayYmd: '2026-08-01', // Saturday
  /** Real slots weeks 1–6 (program_day 1=Mon, 2=Tue) */
  workouts: [
    { id: 'w1d1', weekNumber: 1, programDay: 1, isDone: true },
    { id: 'w1d2', weekNumber: 1, programDay: 2, isDone: false },
    { id: 'w2d1', weekNumber: 2, programDay: 1, isDone: true },
    { id: 'w2d2', weekNumber: 2, programDay: 2, isDone: false },
    { id: 'w3d1', weekNumber: 3, programDay: 1, isDone: true },
    { id: 'w3d2', weekNumber: 3, programDay: 2, isDone: false },
    { id: 'w4d1', weekNumber: 4, programDay: 1, isDone: false },
    { id: 'w4d2', weekNumber: 4, programDay: 2, isDone: false },
    { id: 'w5d1', weekNumber: 5, programDay: 1, isDone: false },
    { id: 'w5d2', weekNumber: 5, programDay: 2, isDone: false },
    { id: 'w6d1', weekNumber: 6, programDay: 1, isDone: false },
    { id: 'w6d2', weekNumber: 6, programDay: 2, isDone: false },
  ] satisfies WorkoutRef[],
}

describe('weekWindows — calendar Mon–Sun model', () => {
  describe('program_day → weekday mapping', () => {
    it('maps 1=Mon … 7=Sun onto the week Monday', () => {
      const windows = getProgramWeekWindows('2026-07-01', 1, 'Europe/Bucharest')
      // Week containing Wed Jul 1 → Mon Jun 29
      expect(windows[0].mondayStart).toBe('2026-06-29')
      expect(windows[0].sundayEnd).toBe('2026-07-05')
      expect(getWorkoutDate(1, 1, windows)).toBe('2026-06-29') // Mon
      expect(getWorkoutDate(1, 2, windows)).toBe('2026-06-30') // Tue
      expect(getWorkoutDate(1, 3, windows)).toBe('2026-07-01') // Wed
      expect(getWorkoutDate(1, 7, windows)).toBe('2026-07-05') // Sun
    })
  })

  describe('pre-start exclusion (mid-week start)', () => {
    it('excludes Mon/Tue before a Wednesday start in week 1', () => {
      const start = '2026-07-01'
      const windows = getProgramWeekWindows(start, 2, 'Europe/Bucharest')
      expect(isInScope('2026-06-29', start)).toBe(false)
      expect(isInScope('2026-06-30', start)).toBe(false)
      expect(isInScope('2026-07-01', start)).toBe(true)
      expect(
        getWorkoutStatus(
          { weekNumber: 1, programDay: 1, isDone: false },
          windows,
          start,
          '2026-07-03',
        ),
      ).toBe('out-of-scope')
      expect(
        getWorkoutStatus(
          { weekNumber: 1, programDay: 1, isDone: true },
          windows,
          start,
          '2026-07-03',
        ),
      ).toBe('out-of-scope') // math status ignores done
      expect(
        getWorkoutStatus(
          { weekNumber: 1, programDay: 3, isDone: false },
          windows,
          start,
          '2026-07-01',
        ),
      ).toBe('due-today')
    })
  })

  describe('POPESCU (start Wed 2026-07-01, today Sat 2026-08-01)', () => {
    const windows = getProgramWeekWindows(
      POPESCU.startDate,
      POPESCU.totalWeeks,
      POPESCU.timeZone,
      POPESCU.pauses,
    )
    const effectiveToday = getEffectiveToday(
      POPESCU.todayYmd,
      POPESCU.timeZone,
      POPESCU.pauses,
    )
    const current = getCurrentProgramWeek(windows, effectiveToday)

    const picture = POPESCU.workouts
      .filter((w) => w.weekNumber <= 5)
      .map((w) => {
        const date = getWorkoutDate(w.weekNumber, w.programDay, windows)!
        const inScope = isInScope(date, POPESCU.startDate)
        const status = getWorkoutStatus(
          w,
          windows,
          POPESCU.startDate,
          effectiveToday,
        )
        return {
          id: w.id,
          weekNumber: w.weekNumber,
          programDay: w.programDay,
          date,
          inScope,
          isDone: w.isDone,
          status,
        }
      })

    const nextDue = getNextDue(
      POPESCU.workouts,
      windows,
      POPESCU.startDate,
      effectiveToday,
    )
    const completion = getCompletionMathFromWorkouts(
      POPESCU.workouts.filter((w) => w.weekNumber <= 5),
      windows,
      POPESCU.startDate,
    )
    const programEnd = getProgramEnd(
      POPESCU.startDate,
      POPESCU.totalWeeks,
      POPESCU.timeZone,
      POPESCU.pauses,
    )

    it('week 1 is Mon Jun 29–Sun Jul 5; current week on Aug 1 is 5', () => {
      expect(windows[0]).toEqual({
        weekNumber: 1,
        mondayStart: '2026-06-29',
        sundayEnd: '2026-07-05',
      })
      expect(effectiveToday).toBe('2026-08-01')
      expect(current?.weekNumber).toBe(5)
      expect(current).toMatchObject({
        mondayStart: '2026-07-27',
        sundayEnd: '2026-08-02',
      })
    })

    it('marks W1D1/W1D2 out-of-scope; past incompletes missed; next-due W6D1', () => {
      const byId = Object.fromEntries(picture.map((p) => [p.id!, p]))
      expect(byId.w1d1).toMatchObject({
        date: '2026-06-29',
        inScope: false,
        status: 'out-of-scope',
        isDone: true,
      })
      expect(byId.w1d2).toMatchObject({
        date: '2026-06-30',
        inScope: false,
        status: 'out-of-scope',
      })
      expect(byId.w2d1.status).toBe('completed')
      expect(byId.w2d2.status).toBe('missed')
      expect(byId.w3d1.status).toBe('completed')
      expect(byId.w3d2.status).toBe('missed')
      expect(byId.w4d1.status).toBe('missed')
      expect(byId.w4d2.status).toBe('missed')
      expect(byId.w5d1).toMatchObject({ date: '2026-07-27', status: 'missed' })
      expect(byId.w5d2).toMatchObject({ date: '2026-07-28', status: 'missed' })

      expect(nextDue).toMatchObject({
        id: 'w6d1',
        weekNumber: 6,
        programDay: 1,
      })
      expect(getWorkoutDate(6, 1, windows)).toBe('2026-08-03')
    })

    it('completion math excludes out-of-scope (W1 Mon/Tue)', () => {
      // in-scope weeks 1–5: 8 slots (W2–W5 × 2); done: W2D1, W3D1 → 2/8 = 25%
      expect(completion).toEqual({
        inScopeTotal: 8,
        inScopeDone: 2,
        completionPct: 25,
      })
    })

    it('program end = Sunday of week 13', () => {
      // W1 Mon Jun 29 → W13 Mon Sep 21 → Sun Sep 27
      expect(windows[12].mondayStart).toBe('2026-09-21')
      expect(programEnd).toBe('2026-09-27')
    })

    it('prints full Popescu picture for Phase 1 review', () => {
      const missed = picture.filter((p) => p.status === 'missed')
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify(
          {
            assignmentId: POPESCU.assignmentId,
            startDate: POPESCU.startDate,
            todayYmd: POPESCU.todayYmd,
            effectiveToday,
            currentProgramWeek: current,
            weeks1to5: picture,
            missed,
            nextDue,
            completionWeeks1to5: completion,
            programEnd,
          },
          null,
          2,
        ),
      )
      expect(current?.weekNumber).toBe(5)
    })
  })

  describe('paused 14 days — current week does not advance', () => {
    it('freezes effective today at paused_at while status=paused', () => {
      const start = '2026-07-01'
      const tz = 'Europe/Bucharest'
      const windows = getProgramWeekWindows(start, 8, tz)
      const pauses: PauseState = {
        accumulatedDays: 0,
        pauseStatus: 'paused',
        pausedAt: '2026-07-10T10:00:00+03:00', // Fri Jul 10 → week 2
      }
      const wallToday = '2026-07-24'
      const effective = getEffectiveToday(wallToday, tz, pauses)
      expect(effective).toBe('2026-07-10')
      expect(getCurrentProgramWeek(windows, effective)?.weekNumber).toBe(2)

      // Without freeze, Jul 24 would be week 4 — W2D2 would be long-missed;
      // with freeze, W2 Fri is due-today and W3 stays upcoming.
      expect(
        getWorkoutStatus(
          { weekNumber: 2, programDay: 5, isDone: false },
          windows,
          start,
          effective,
        ),
      ).toBe('due-today')
      expect(
        getWorkoutStatus(
          { weekNumber: 3, programDay: 1, isDone: false },
          windows,
          start,
          effective,
        ),
      ).toBe('upcoming')
    })

    it('after resume, accumulatedDays retards effective today by 14', () => {
      const start = '2026-07-01'
      const tz = 'Europe/Bucharest'
      const windows = getProgramWeekWindows(start, 8, tz)
      const pauses: PauseState = {
        accumulatedDays: 14,
        pauseStatus: 'active',
        pausedAt: null,
      }
      // Wall Aug 1 → effective Jul 18 → week 3 (Jul 13–19)
      const effective = getEffectiveToday('2026-08-01', tz, pauses)
      expect(effective).toBe('2026-07-18')
      expect(getCurrentProgramWeek(windows, effective)?.weekNumber).toBe(3)
      expect(getProgramEnd(start, 13, tz, pauses)).toBe('2026-10-11') // Sep 27 + 14
    })
  })

  describe('edge: all done', () => {
    it('next-due null; completion 100%', () => {
      const start = '2026-07-06' // Monday start — no pre-start exclusion
      const windows = getProgramWeekWindows(start, 2, 'UTC')
      const workouts: WorkoutRef[] = [
        { weekNumber: 1, programDay: 1, isDone: true },
        { weekNumber: 1, programDay: 3, isDone: true },
        { weekNumber: 2, programDay: 1, isDone: true },
      ]
      const effective = '2026-07-10'
      expect(getNextDue(workouts, windows, start, effective)).toBeNull()
      expect(getCompletionMathFromWorkouts(workouts, windows, start)).toEqual({
        inScopeTotal: 3,
        inScopeDone: 3,
        completionPct: 100,
      })
    })
  })
})

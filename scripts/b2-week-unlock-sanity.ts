/**
 * B.2 sanity: log calendar unlock math for active program_assignments (limit 3).
 * Run from dailyfitness-app: npx tsx scripts/b2-week-unlock-sanity.ts
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  addCalendarDaysYmd,
  diffCalendarDaysYmd,
  zonedCalendarDateString,
  zonedYmdFromIsoTimestamp,
} from '../src/lib/clientZonedCalendar'
import {
  computeUnlockedWeekMax,
  getClientIanaTimezone,
  getCompletedSlots,
  getProgramScheduleSlotsForAssignment,
  getTotalWeeksForProgram,
} from '../src/lib/programStateService'
config({ path: '.env.local' })

/** Subset of program_assignments rows used by this script */
type AssignmentPauseRow = {
  id: string
  client_id: string
  program_id: string
  start_date: string | null
  status: string
  progression_mode: string | null
  coach_unlocked_week: number | null
  pause_status: string | null
  paused_at: string | null
  pause_accumulated_days: number | null
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function main() {
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const sb = createClient(url, key)

  const { data: rows, error } = await sb
    .from('program_assignments')
    .select(
      'id, client_id, program_id, start_date, status, progression_mode, coach_unlocked_week, pause_status, paused_at, pause_accumulated_days'
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3)

  if (error) {
    console.error(error)
    process.exit(1)
  }

  if (!rows?.length) {
    console.log('No active program_assignments found.')
    return
  }

  for (const raw of rows) {
    const a = raw as AssignmentPauseRow
    const tz = await getClientIanaTimezone(sb, a.client_id)
    const totalWeeks = await getTotalWeeksForProgram(sb, a.program_id)
    const slots = await getProgramScheduleSlotsForAssignment(sb, a.program_id, a.id)
    const completed = await getCompletedSlots(sb, a.id)
    const finalUnlocked = computeUnlockedWeekMax(slots, completed, {
      progression_mode: a.progression_mode === 'coach_managed' ? 'coach_managed' : 'auto',
      coach_unlocked_week: a.coach_unlocked_week,
    })

    const startYmd = String(a.start_date ?? '').slice(0, 10)
    const pauseAccum = Math.max(0, Number(a.pause_accumulated_days) || 0)
    const effectiveStart = startYmd ? addCalendarDaysYmd(startYmd, pauseAccum) : '(no start)'
    const todayYmd = zonedCalendarDateString(new Date(), tz)
    const paused = a.pause_status === 'paused' && a.paused_at
    const effectiveToday = paused ? zonedYmdFromIsoTimestamp(a.paused_at!, tz) : todayYmd
    const daysElapsed =
      typeof effectiveStart === 'string' && effectiveStart.length === 10
        ? Math.max(0, diffCalendarDaysYmd(effectiveStart, effectiveToday))
        : 0
    const calendarWeek = Math.max(1, Math.floor(daysElapsed / 7) + 1)
    const legacyUnlock = a.coach_unlocked_week ?? 1
    const completionBoundary =
      typeof effectiveStart === 'string' && effectiveStart.length === 10
        ? addCalendarDaysYmd(effectiveStart, totalWeeks * 7)
        : null
    const wouldComplete =
      completionBoundary != null && a.status === 'active' && todayYmd >= completionBoundary

    console.log(JSON.stringify({
      assignment_id: a.id,
      start_date: a.start_date,
      pause_status: a.pause_status ?? 'active',
      paused_at: a.paused_at ?? null,
      pause_accumulated_days: pauseAccum,
      totalWeeks,
      effectiveStartYmd: effectiveStart,
      todayClientLocal: todayYmd,
      effectiveTodayForUnlock: effectiveToday,
      daysElapsed,
      calendarWeek,
      legacyUnlock,
      finalUnlockedWeek: finalUnlocked,
      completionBoundaryYmd: completionBoundary,
      wouldTransitionToCompleted: wouldComplete,
    }, null, 2))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

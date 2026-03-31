/**
 * Week Compliance Service (single source of truth)
 *
 * Program week = rolling 7-day blocks from program_assignments.start_date.
 * Week start = midnight in assignment timezone (timezone_snapshot at creation, else profile.timezone, else UTC).
 * Avoids server timezone defaults; snapshot prevents travel from shifting scoring.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getActiveProgramAssignment,
  getProgramSlots,
  getCompletedSlots,
} from './programStateService'

const MS_PER_DAY = 86400000

/**
 * Return UTC ISO string for midnight on the given date in the given IANA timezone.
 * Uses Intl only; no server timezone. tz defaults to 'UTC' if invalid.
 */
/** UTC instant for 00:00:00 on `dateStr` (YYYY-MM-DD) in `ianaTimezone`. */
export function midnightInTimezone(dateStr: string, ianaTimezone: string): string {
  if (!dateStr || !ianaTimezone) {
    const fallback = (dateStr || new Date().toISOString().slice(0, 10)) + 'T00:00:00.000Z'
    const d = new Date(fallback)
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
  }
  try {
    const d = new Date(dateStr + 'T12:00:00.000Z')
    if (isNaN(d.getTime())) return new Date().toISOString()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: ianaTimezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(d)
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
    const second = parseInt(parts.find((p) => p.type === 'second')?.value ?? '0', 10)
    const msFromMidnight = (hour * 3600 + minute * 60 + second) * 1000
    const midnightUtc = new Date(d.getTime() - msFromMidnight)
    return midnightUtc.toISOString()
  } catch {
    const d = new Date(dateStr + 'T00:00:00.000Z')
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
  }
}

/** Default decay: days to finish week -> time adherence %. Floor 70 at 14+ days. */
const TIME_DECAY_TABLE: Record<number, number> = {
  1: 100,
  2: 100,
  3: 100,
  4: 100,
  5: 100,
  6: 100,
  7: 100,
  8: 95,
  9: 90,
  10: 85,
  11: 80,
  12: 75,
  13: 72,
}
const TIME_FLOOR = 70

export interface WeekComplianceResult {
  assigned: number
  completed: number
  structuralPct: number | null
  weekCompleted: boolean
  weekStartTs: string
  weekFinishTs: string | null
  daysToFinish: number | null
  timeAdherencePct: number | null
  compositePct: number | null
  overrideApplied: boolean
  overrideTimeScore: number | null
}

/**
 * Compute week-level compliance for a program assignment and week number.
 * Week start = midnight in assignment timezone (timezone_snapshot, else client profile.timezone, else UTC).
 */
export async function computeWeekCompliance(
  supabase: SupabaseClient,
  params: { programAssignmentId: string; weekNumber: number }
): Promise<WeekComplianceResult> {
  const { programAssignmentId, weekNumber } = params

  const { data: assignment, error: assignmentError } = await supabase
    .from('program_assignments')
    .select('id, program_id, start_date, timezone_snapshot, client_id')
    .eq('id', programAssignmentId)
    .single()

  if (assignmentError || !assignment?.program_id) {
    return emptyResult()
  }

  let ianaTimezone: string = (assignment as any).timezone_snapshot ?? ''
  if (!ianaTimezone && (assignment as any).client_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', (assignment as any).client_id)
      .single()
    ianaTimezone = (profile?.timezone as string) ?? 'UTC'
  }
  if (!ianaTimezone) ianaTimezone = 'UTC'

  const [slots, completedSlots] = await Promise.all([
    getProgramSlots(supabase, assignment.program_id),
    getCompletedSlots(supabase, programAssignmentId),
  ])

  const startDate = assignment.start_date
  const slotsInWeek = slots.filter((s) => s.week_number === weekNumber)
  const requiredSlotsInWeek = slotsInWeek.filter((s) => !s.is_optional)
  const requiredScheduleIds = new Set(requiredSlotsInWeek.map((s) => s.id))
  const completedInWeek = completedSlots.filter((c) => c.week_number === weekNumber)
  const completedScheduleIds = new Set(completedInWeek.map((c) => c.program_schedule_id))

  const assigned = requiredSlotsInWeek.length
  const completedRequired = completedInWeek.filter((c) => requiredScheduleIds.has(c.program_schedule_id)).length
  let completed = completedRequired
  if (completed > assigned) completed = assigned

  const structuralPct =
    assigned === 0 ? null : Math.round((completed / assigned) * 100)
  const weekCompleted = assigned > 0 && completed >= assigned

  const weekStartDateStr = toWeekStartDateString(startDate, weekNumber)
  const weekStartTs = midnightInTimezone(weekStartDateStr, ianaTimezone)

  let weekFinishTs: string | null = null
  let daysToFinish: number | null = null
  let timeAdherencePct: number | null = null
  let overrideApplied = false
  let overrideTimeScore: number | null = null

  if (weekCompleted && completedInWeek.length > 0) {
    const maxCompletedAt = completedInWeek.reduce(
      (max, c) => (c.completed_at > max ? c.completed_at : max),
      completedInWeek[0].completed_at
    )
    weekFinishTs = maxCompletedAt
    const startMs = new Date(weekStartTs).getTime()
    const finishMs = new Date(weekFinishTs).getTime()
    daysToFinish = Math.ceil((finishMs - startMs) / MS_PER_DAY)

    // Override: if row exists, use override_time_score
    const { data: overrideRow } = await supabase
      .from('program_week_time_override')
      .select('override_time_score')
      .eq('program_assignment_id', programAssignmentId)
      .eq('week_number', weekNumber)
      .maybeSingle()

    if (overrideRow != null) {
      overrideApplied = true
      overrideTimeScore = overrideRow.override_time_score
      timeAdherencePct = overrideRow.override_time_score
    } else {
      const days = Math.max(1, daysToFinish)
      timeAdherencePct =
        TIME_DECAY_TABLE[days] ?? (days >= 14 ? TIME_FLOOR : TIME_FLOOR)
    }
  }

  const compositePct =
    structuralPct != null && timeAdherencePct != null
      ? Math.round(structuralPct * 0.7 + timeAdherencePct * 0.3)
      : null

  return {
    assigned,
    completed,
    structuralPct,
    weekCompleted,
    weekStartTs,
    weekFinishTs,
    daysToFinish,
    timeAdherencePct,
    compositePct,
    overrideApplied,
    overrideTimeScore,
  }
}

function toWeekStartDateString(startDate: string | null, weekNumber: number): string {
  if (!startDate) return new Date().toISOString().slice(0, 10)
  const d = new Date(startDate + 'T00:00:00.000Z')
  d.setUTCDate(d.getUTCDate() + (weekNumber - 1) * 7)
  return d.toISOString().slice(0, 10)
}

function emptyResult(): WeekComplianceResult {
  return {
    assigned: 0,
    completed: 0,
    structuralPct: null,
    weekCompleted: false,
    weekStartTs: new Date().toISOString(),
    weekFinishTs: null,
    daysToFinish: null,
    timeAdherencePct: null,
    compositePct: null,
    overrideApplied: false,
    overrideTimeScore: null,
  }
}

/**
 * Get current week number for a client's active assignment (1-based).
 * Returns null if no active assignment.
 */
export async function getCurrentWeekNumber(
  supabase: SupabaseClient,
  clientId: string
): Promise<number | null> {
  const assignment = await getActiveProgramAssignment(supabase, clientId)
  if (!assignment) return null
  const [slots, completedSlots] = await Promise.all([
    getProgramSlots(supabase, assignment.program_id),
    getCompletedSlots(supabase, assignment.id),
  ])
  const completedIds = new Set(completedSlots.map((c) => c.program_schedule_id))
  const nextSlot = slots.find((s) => !completedIds.has(s.id))
  if (!nextSlot) {
    const last = slots[slots.length - 1]
    return last?.week_number ?? null
  }
  return nextSlot.week_number
}

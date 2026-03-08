/**
 * Control Room Service (read-only)
 *
 * Computes coach-wide signals for the Control Room home.
 * Uses ONLY whitelisted tables: program_assignments, program_schedule,
 * program_day_completions, program_progress. No workout_assignments, no workout_logs.
 *
 * Active program selection invariant: per client, program_assignments where
 * status='active' and client_id=:id, order by updated_at desc, limit 1.
 * If updated_at is null or tie (multiple with same updated_at), exclude that client.
 *
 * Optimized: batch queries (5–6 total) instead of per-client loops (4–6 queries per client).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ControlRoomPeriod {
  startUtc: string
  endUtc: string
  label: string
}

export interface ControlRoomSignals {
  coachProgramCompliancePct: number | null
  coachNutritionCompliancePct?: number | null
  coachHabitCompliancePct?: number | null
  coachOverallCompliancePct?: number | null
}

export interface ControlRoomExclusions {
  excludedClientIds: string[]
  reasons: Record<string, string>
}

export interface ControlRoomResult {
  period: ControlRoomPeriod
  signals: ControlRoomSignals
  exclusions: ControlRoomExclusions
}

/** This week label (UTC) — metadata only; program week comes from engine. */
function getPeriodLabel(): ControlRoomPeriod {
  const now = new Date()
  const start = new Date(now)
  const day = start.getUTCDay()
  const monOffset = day === 0 ? -6 : 1 - day
  start.setUTCDate(start.getUTCDate() + monOffset)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  end.setUTCMilliseconds(-1)
  return {
    startUtc: start.toISOString(),
    endUtc: end.toISOString(),
    label: 'This week',
  }
}

/**
 * Get coach's client IDs (from clients table).
 * Read-only.
 */
async function getCoachClientIds(
  supabase: SupabaseClient,
  coachId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('client_id')
    .eq('coach_id', coachId)

  if (error) {
    console.error('[controlRoomService] Error fetching coach clients:', error)
    return []
  }
  return (data ?? []).map((r) => r.client_id as string)
}

/** One resolved assignment per client (excludes ties and null updated_at). */
interface ResolvedAssignment {
  assignmentId: string
  programId: string
  clientId: string
}

/**
 * Resolve one active assignment per client from batch rows.
 * Invariant: order by updated_at desc, take first; exclude if updated_at null or tie.
 */
function resolveOneAssignmentPerClient(
  rows: { id: string; client_id: string; program_id: string; updated_at: string | null }[]
): { assignments: ResolvedAssignment[]; exclusions: ControlRoomExclusions } {
  const byClient = new Map<string, typeof rows>()
  for (const r of rows) {
    const list = byClient.get(r.client_id) ?? []
    list.push(r)
    byClient.set(r.client_id, list)
  }
  const assignments: ResolvedAssignment[] = []
  const exclusions: ControlRoomExclusions = { excludedClientIds: [], reasons: {} }
  for (const [clientId, list] of byClient) {
    const sorted = [...list].sort((a, b) => {
      const aVal = a.updated_at ?? ''
      const bVal = b.updated_at ?? ''
      return bVal.localeCompare(aVal)
    })
    const first = sorted[0]
    if (first.updated_at == null) {
      exclusions.excludedClientIds.push(clientId)
      exclusions.reasons[clientId] = 'no_active_assignment_or_updated_at_null_or_tied'
      continue
    }
    if (sorted.length >= 2 && sorted[1].updated_at != null && sorted[1].updated_at === first.updated_at) {
      exclusions.excludedClientIds.push(clientId)
      exclusions.reasons[clientId] = 'no_active_assignment_or_updated_at_null_or_tied'
      continue
    }
    assignments.push({ assignmentId: first.id, programId: first.program_id, clientId })
  }
  return { assignments, exclusions }
}

/**
 * Compute Control Room result for a coach: period, signals (program compliance only for now), exclusions.
 * Read-only; batch queries (5–6 total) instead of per-client loops.
 */
export async function getControlRoomResult(
  supabase: SupabaseClient,
  coachId: string
): Promise<ControlRoomResult> {
  const period = getPeriodLabel()
  const exclusions: ControlRoomExclusions = {
    excludedClientIds: [],
    reasons: {},
  }

  const clientIds = await getCoachClientIds(supabase, coachId)
  if (clientIds.length === 0) {
    return { period, signals: { coachProgramCompliancePct: null, coachNutritionCompliancePct: null, coachHabitCompliancePct: null, coachOverallCompliancePct: null }, exclusions }
  }

  const { data: assignmentRows, error: assignErr } = await supabase
    .from('program_assignments')
    .select('id, client_id, program_id, updated_at')
    .in('client_id', clientIds)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })

  if (assignErr) {
    console.error('[controlRoomService] Error fetching program_assignments:', assignErr)
    return { period, signals: { coachProgramCompliancePct: null, coachNutritionCompliancePct: null, coachHabitCompliancePct: null, coachOverallCompliancePct: null }, exclusions }
  }

  const { assignments, exclusions: resolvedExcl } = resolveOneAssignmentPerClient(assignmentRows ?? [])
  exclusions.excludedClientIds.push(...resolvedExcl.excludedClientIds)
  Object.assign(exclusions.reasons, resolvedExcl.reasons)

  if (assignments.length === 0) {
    return {
      period,
      signals: { coachProgramCompliancePct: null, coachNutritionCompliancePct: null, coachHabitCompliancePct: null, coachOverallCompliancePct: null },
      exclusions,
    }
  }

  const assignmentIds = assignments.map((a) => a.assignmentId)
  const programIds = [...new Set(assignments.map((a) => a.programId))]

  const [
    { data: progressRows },
    { data: scheduleRows },
    { data: completionRows },
  ] = await Promise.all([
    supabase
      .from('program_progress')
      .select('program_assignment_id, current_week_number')
      .in('program_assignment_id', assignmentIds),
    supabase
      .from('program_schedule')
      .select('id, program_id, week_number, day_number')
      .in('program_id', programIds)
      .order('week_number', { ascending: true })
      .order('day_number', { ascending: true }),
    supabase
      .from('program_day_completions')
      .select('program_assignment_id, program_schedule_id')
      .in('program_assignment_id', assignmentIds),
  ])

  const progressMap = new Map<string, number>()
  for (const r of progressRows ?? []) {
    if (r.current_week_number != null) {
      progressMap.set(r.program_assignment_id, r.current_week_number)
    }
  }

  const scheduleByProgram = new Map<string, { id: string; program_id: string; week_number: number; day_number: number }[]>()
  const scheduleIdToWeek = new Map<string, { program_id: string; week_number: number }>()
  for (const s of scheduleRows ?? []) {
    const list = scheduleByProgram.get(s.program_id) ?? []
    list.push({ id: s.id, program_id: s.program_id, week_number: s.week_number, day_number: s.day_number ?? 1 })
    scheduleByProgram.set(s.program_id, list)
    scheduleIdToWeek.set(s.id, { program_id: s.program_id, week_number: s.week_number })
  }

  const completedByAssignment = new Map<string, Set<string>>()
  for (const c of completionRows ?? []) {
    const set = completedByAssignment.get(c.program_assignment_id) ?? new Set()
    set.add(c.program_schedule_id)
    completedByAssignment.set(c.program_assignment_id, set)
  }

  const clientPcts: number[] = []
  for (const a of assignments) {
    const slots = scheduleByProgram.get(a.programId) ?? []
    const completedIds = completedByAssignment.get(a.assignmentId) ?? new Set()
    const nextSlot = slots.find((s) => !completedIds.has(s.id)) ?? null
    const referenceSlot = nextSlot ?? slots[slots.length - 1]
    const currentWeek = progressMap.get(a.assignmentId) ?? referenceSlot?.week_number ?? 1

    const scheduleIdsThisWeek = (scheduleByProgram.get(a.programId) ?? []).filter((s) => s.week_number === currentWeek).map((s) => s.id)
    const total = scheduleIdsThisWeek.length
    const completedThisWeek = (completionRows ?? []).filter(
      (c) => c.program_assignment_id === a.assignmentId && scheduleIdsThisWeek.includes(c.program_schedule_id)
    ).length
    const pct = total > 0 ? Math.round((completedThisWeek / total) * 100) : 0
    clientPcts.push(pct)
  }

  const coachProgramCompliancePct =
    clientPcts.length > 0 ? Math.round(clientPcts.reduce((a, b) => a + b, 0) / clientPcts.length) : null

  return {
    period,
    signals: {
      coachProgramCompliancePct,
      coachNutritionCompliancePct: null,
      coachHabitCompliancePct: null,
      coachOverallCompliancePct: null,
    },
    exclusions,
  }
}

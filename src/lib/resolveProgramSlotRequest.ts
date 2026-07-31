/**
 * Resolve the instance schedule row id from a start-workout request body.
 * Prefers `program_day_assignment_id`; falls back to legacy `program_schedule_id`
 * (same UUID space once slots are instance-keyed).
 */
export function resolveRequestedDayAssignmentId(body: {
  program_day_assignment_id?: string | null
  program_schedule_id?: string | null
}): string | null {
  const preferred = body.program_day_assignment_id?.trim()
  if (preferred) return preferred
  const legacy = body.program_schedule_id?.trim()
  return legacy || null
}

export type ProgramStartRequestBody = {
  client_id?: string
  program_day_assignment_id?: string
  /** @deprecated use program_day_assignment_id — accepted for backward compat */
  program_schedule_id?: string
}

/**
 * Coach strength-test session markers.
 * workout_logs has no type/created_by column — we mark via notes + template name.
 */

export const COACH_STRENGTH_TEST_MARKER = '[coach_strength_test]'

export function buildCoachStrengthTestNotes(
  coachId: string,
  summary?: string,
): string {
  const base = `${COACH_STRENGTH_TEST_MARKER} tested_by=${coachId}`
  return summary?.trim() ? `${base} | ${summary.trim()}` : base
}

export function isCoachStrengthTestNotes(
  notes: string | null | undefined,
): boolean {
  return Boolean(notes?.includes(COACH_STRENGTH_TEST_MARKER))
}

export function isCoachStrengthTestSessionName(
  name: string | null | undefined,
): boolean {
  if (!name) return false
  return /^Strength test(\s|$|—|-)/i.test(name.trim())
}

/** True if notes marker or session name indicates a coach strength test. */
export function isCoachStrengthTestSession(opts: {
  notes?: string | null
  name?: string | null
}): boolean {
  return (
    isCoachStrengthTestNotes(opts.notes) ||
    isCoachStrengthTestSessionName(opts.name)
  )
}

/**
 * Strip the machine marker for client display; keep the human summary after `|`.
 */
export function displayCoachStrengthTestNotes(
  notes: string | null | undefined,
): string | null {
  if (!notes?.trim()) return null
  if (!isCoachStrengthTestNotes(notes)) return notes.trim()
  const pipe = notes.indexOf('|')
  if (pipe >= 0) {
    const rest = notes.slice(pipe + 1).trim()
    return rest || null
  }
  return null
}

export function buildStrengthTestSessionName(exerciseNames: string[]): string {
  const unique = [...new Set(exerciseNames.map((n) => n.trim()).filter(Boolean))]
  if (unique.length === 0) return 'Strength test'
  if (unique.length === 1) return `Strength test — ${unique[0]}`
  if (unique.length === 2) return `Strength test — ${unique[0]} & ${unique[1]}`
  return `Strength test — ${unique[0]} +${unique.length - 1}`
}

export type StrengthTestSetInput = {
  exercise_id: string
  exercise_name?: string
  weight_kg: number
  reps: number
  set_number?: number
  notes?: string
}

/**
 * Local-only session scratchpad marks for the gym console.
 * Exercise ids only. NEVER synced to DB / program_day_completions / progression.
 */

export const GYM_CONSOLE_MARKS_PREFIX = 'gym-console-marks:v1:'

export type GymConsoleSessionMarks = {
  /** Exercise keys marked done. */
  exercises: string[]
}

export function sessionMarksStorageKey(scope: string): string {
  return `${GYM_CONSOLE_MARKS_PREFIX}${scope}`
}

export function buildClientSessionMarksScope(opts: {
  clientId: string
  week: number
  programDay: number
  contentId: string
}): string {
  return `client:${opts.clientId}:w${opts.week}:d${opts.programDay}:${opts.contentId}`
}

export function buildProgramSessionMarksScope(opts: {
  programId: string
  week: number
  programDay: number
  contentId: string
}): string {
  return `program:${opts.programId}:w${opts.week}:d${opts.programDay}:${opts.contentId}`
}

export function readSessionMarks(scope: string): GymConsoleSessionMarks {
  if (typeof window === 'undefined' || !scope.trim()) return { exercises: [] }
  try {
    const raw = localStorage.getItem(sessionMarksStorageKey(scope))
    if (!raw) return { exercises: [] }
    const parsed = JSON.parse(raw) as Partial<GymConsoleSessionMarks>
    return {
      exercises: Array.isArray(parsed.exercises)
        ? parsed.exercises.filter((x): x is string => typeof x === 'string')
        : [],
    }
  } catch {
    return { exercises: [] }
  }
}

export function writeSessionMarks(scope: string, marks: GymConsoleSessionMarks): void {
  if (typeof window === 'undefined' || !scope.trim()) return
  try {
    localStorage.setItem(
      sessionMarksStorageKey(scope),
      JSON.stringify({ exercises: marks.exercises }),
    )
  } catch {
    /* ignore */
  }
}

/** Remove every gym-console session mark key (Clear console). */
export function clearAllGymConsoleSessionMarks(): void {
  if (typeof window === 'undefined') return
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(GYM_CONSOLE_MARKS_PREFIX)) toRemove.push(key)
    }
    for (const key of toRemove) localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function exerciseMarkKey(exerciseId: string | null | undefined, fallback: string): string {
  const id = exerciseId?.trim()
  return id ? `ex:${id}` : `ex:${fallback}`
}

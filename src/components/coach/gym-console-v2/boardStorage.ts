/**
 * Gym console board persistence.
 * Only FINALIZED items (workout opened) are stored. Shells are React-state only.
 */

export const GYM_CONSOLE_BOARD_STORAGE_KEY = 'gym-console-board-v2'
/** Legacy key from pre–piece-4 console (client ids only) — ignored for hydrate. */
export const GYM_CONSOLE_BOARD_LEGACY_KEY = 'gym-console-clients'
export const GYM_CONSOLE_BOARD_MAX = 6

export type GymConsoleBoardKind = 'client' | 'program'
export type GymConsoleBoardStatus = 'shell' | 'finalized'

/** Enough to restore the opened workout view after refresh. */
export type GymConsoleOpenedSelection = {
  blockId: string | null
  weekNumber: number
  programDay: number
  /** Canvas template / content id (master or instance fallback). */
  templateId: string
  programInstanceWorkoutId: string | null
}

export type GymConsoleBoardItem = {
  kind: GymConsoleBoardKind
  /** client_id or program_id */
  id: string
  /** Display label cached at add-time */
  label: string
  status: GymConsoleBoardStatus
  /** Present when status === 'finalized' */
  selection?: GymConsoleOpenedSelection
}

function isOpenedSelection(value: unknown): value is GymConsoleOpenedSelection {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    (v.blockId === null || typeof v.blockId === 'string') &&
    typeof v.weekNumber === 'number' &&
    Number.isFinite(v.weekNumber) &&
    typeof v.programDay === 'number' &&
    Number.isFinite(v.programDay) &&
    typeof v.templateId === 'string' &&
    v.templateId.trim().length > 0 &&
    (v.programInstanceWorkoutId === null || typeof v.programInstanceWorkoutId === 'string')
  )
}

/** Stored rows must be finalized with a full selection. Shells never hit disk. */
function isFinalizedStoredItem(value: unknown): value is GymConsoleBoardItem {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (v.status !== 'finalized') return false
  if (v.kind !== 'client' && v.kind !== 'program') return false
  if (typeof v.id !== 'string' || !v.id.trim()) return false
  if (typeof v.label !== 'string') return false
  return isOpenedSelection(v.selection)
}

export function boardItemKey(item: Pick<GymConsoleBoardItem, 'kind' | 'id'>): string {
  return `${item.kind}:${item.id}`
}

/** Hydrate: finalized items only (with selection). */
export function readGymConsoleBoard(): GymConsoleBoardItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(GYM_CONSOLE_BOARD_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isFinalizedStoredItem).slice(0, GYM_CONSOLE_BOARD_MAX)
  } catch {
    return []
  }
}

/**
 * Persist ONLY finalized items. Pass the full in-memory board; shells are stripped.
 * Never call with intent to store shells.
 */
export function writeGymConsoleBoard(items: GymConsoleBoardItem[]): void {
  if (typeof window === 'undefined') return
  try {
    const finalized = items
      .filter(
        (i): i is GymConsoleBoardItem & { status: 'finalized'; selection: GymConsoleOpenedSelection } =>
          i.status === 'finalized' && isOpenedSelection(i.selection),
      )
      .slice(0, GYM_CONSOLE_BOARD_MAX)
      .map((i) => ({
        kind: i.kind,
        id: i.id,
        label: i.label,
        status: 'finalized' as const,
        selection: i.selection,
      }))
    localStorage.setItem(GYM_CONSOLE_BOARD_STORAGE_KEY, JSON.stringify(finalized))
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearGymConsoleBoard(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(GYM_CONSOLE_BOARD_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

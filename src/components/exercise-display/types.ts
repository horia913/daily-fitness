import type { CanvasExercise, CanvasGroup } from '@/lib/groupModel/canvasTypes'

/** Normalized prescription segments for ExerciseDisplay (presentation-only). */
export interface ExerciseDisplaySegments {
  /** Bold primary segment, e.g. "3 × 12/6/6" or "15s/side" in compact mode. */
  setsReps?: string
  load?: string
  rir?: string
  technique?: string
  /** m:ss portion only — component prefixes "rest ". */
  rest?: string
  /** Protocol-specific trailing segments (cluster, EMOM interval, HR, etc.). */
  extras?: string[]
}

export type ExerciseDisplaySize = 'list' | 'executor'

export interface ExerciseDisplayProps {
  badge: string
  /** 0-based group index — drives --fc-group-{a-d} hue cycle. */
  groupIndex: number
  name: string
  size?: ExerciseDisplaySize
  /** Drops "N ×" prefix (round-based group contexts). */
  compact?: boolean
  segments: ExerciseDisplaySegments
  /** Canvas exercise id — used by gym console prev-perf lookup. */
  exerciseId?: string | null
  /**
   * Optional muted reference under the prescription (e.g. last performed).
   * Absent on template / Train paths — no extra UI.
   */
  secondaryLine?: string | null
  /**
   * Gym console opened-workout scratchpad only.
   * When set, a small toggle is absolutely positioned on the right of the row
   * without changing badge / name / prescription layout.
   */
  markToggle?: {
    done: boolean
    onToggle: () => void
  } | null
}

export interface ExerciseGroupDisplayProps {
  groupIndex: number
  /** Group letter: A, B, C… */
  letter: string
  /** Dim mono meta: "{set type} · {n} rounds · rest {m:ss}" */
  metaLine?: string
  exercises: ExerciseDisplayProps[]
  size?: ExerciseDisplaySize
  compact?: boolean
}

/** Input tuple for canvas mappers (Station / instance canvas RPC). */
export interface CanvasDisplayInput {
  group: CanvasGroup
  groupIndex: number
  slot: CanvasExercise
  slotIndex: number
}

export type { CanvasExercise, CanvasGroup }

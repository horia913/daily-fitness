import type { CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import type { ProgramSchedule } from '@/lib/workoutTemplateService'
import type { StationProgram } from '@/types/programStation'
import type { TrainingBlock } from '@/types/trainingBlock'

/** Master template vs per-client instance copy (Station editor). */
export type ProgramEditorMode = 'master' | 'client'

/** Serializable dirty-tracking (Sets ↔ arrays for localStorage). */
export interface ProgramDraftDirtyMeta {
  structureDirty: boolean
  dirtyWorkoutIds: string[]
  pendingNewWorkoutIds: string[]
  pendingNewBlockIds: string[]
  pendingDeactivateWorkoutIds: string[]
}

export interface ProgramDraftState extends ProgramDraftDirtyMeta {
  programId: string
  coachId: string
  program: StationProgram
  categoryId: string
  trainingBlocks: TrainingBlock[]
  schedule: ProgramSchedule[]
  workouts: Record<string, CanvasWorkout>
  /** Station mode — default master when omitted (legacy drafts). */
  editorMode?: ProgramEditorMode
  /** Set when editorMode === 'client'. */
  assignmentId?: string
  clientId?: string
  clientName?: string
  clientAvatarUrl?: string | null
}

export type ProgramSavePhase = 'idle' | 'structure' | 'content' | 'saved' | 'error'

export interface ProgramCommitResult {
  success: boolean
  error?: string
  /** Human-readable partial progress when failure mid-commit */
  partialMessage?: string
  structureCommitted?: boolean
  contentCommittedIds?: string[]
  failedContentId?: string
  /** Remaining pending-new ids after partial content commit (for draft hygiene on retry). */
  pendingNewWorkoutIds?: string[]
}

export const PROGRAM_DRAFT_STORAGE_VERSION = 1

export interface StoredProgramDraft {
  version: number
  savedAt: string
  workingCopy: ProgramDraftState
}

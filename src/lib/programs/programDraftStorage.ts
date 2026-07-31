import type { ProgramDraftState, StoredProgramDraft } from '@/types/programDraft'
import { PROGRAM_DRAFT_STORAGE_VERSION } from '@/types/programDraft'

const KEY_PREFIX = 'dailyfitness:station-draft'

export function programDraftStorageKey(
  coachId: string,
  programId: string,
  assignmentId?: string,
): string {
  if (assignmentId) {
    return `${KEY_PREFIX}:client:${coachId}:${assignmentId}`
  }
  return `${KEY_PREFIX}:${coachId}:${programId}`
}

export function readStoredProgramDraft(
  coachId: string,
  programId: string,
  assignmentId?: string,
): StoredProgramDraft | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(
      programDraftStorageKey(coachId, programId, assignmentId),
    )
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredProgramDraft
    if (parsed?.version !== PROGRAM_DRAFT_STORAGE_VERSION || !parsed.workingCopy) return null
    return parsed
  } catch {
    return null
  }
}

export function writeStoredProgramDraft(
  coachId: string,
  programId: string,
  workingCopy: ProgramDraftState,
  assignmentId?: string,
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false
  try {
    const payload: StoredProgramDraft = {
      version: PROGRAM_DRAFT_STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      workingCopy,
    }
    window.localStorage.setItem(
      programDraftStorageKey(coachId, programId, assignmentId),
      JSON.stringify(payload),
    )
    return true
  } catch {
    return false
  }
}

export function clearStoredProgramDraft(
  coachId: string,
  programId: string,
  assignmentId?: string,
): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(programDraftStorageKey(coachId, programId, assignmentId))
  } catch {
    /* ignore */
  }
}

export function formatDraftSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

/** True when stored draft differs from baseline (has unsaved work). */
export function storedDraftDiffersFromBaseline(
  stored: StoredProgramDraft,
  baseline: ProgramDraftState,
): boolean {
  const w = stored.workingCopy
  return (
    w.structureDirty ||
    w.dirtyWorkoutIds.length > 0 ||
    w.program.name !== baseline.program.name ||
    w.trainingBlocks.length !== baseline.trainingBlocks.length ||
    w.schedule.length !== baseline.schedule.length
  )
}

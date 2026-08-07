'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ProgramCommitResult, ProgramDraftState } from '@/types/programDraft'
import type { StationProgram } from '@/types/programStation'
import type { TrainingBlock } from '@/types/trainingBlock'
import type { CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import { formatSaveError } from '@/lib/groupModel/canvasSave'
import { loadProgramDraftBaseline } from '@/lib/programs/programDraftBaseline'
import { commitProgramDraft } from '@/lib/programs/programDraftCommit'
import { loadInstanceProgramDraftBaseline } from '@/lib/programInstance/instanceProgramDraftBaseline'
import { commitInstanceProgramDraft } from '@/lib/programInstance/instanceProgramDraftCommit'
import type { ProgramEditorMode } from '@/types/programDraft'
import {
  addTrainingBlockToDraft,
  addWeekToBlockInDraft,
  buildDayFromScratch,
  clearDayInDraft,
  copyDayToSlotInDraft,
  copyGroupToDayInDraft,
  deleteTrainingBlockFromDraft,
  duplicateGroupInDraft,
  duplicateTrainingBlockInDraft,
  duplicateWeekInDraft,
  copyWeekToWeeksInDraft,
  insertLibraryWorkoutIntoDraft,
  moveDayInDraft,
  reorderBlocksInDraft,
  updateCategoryId,
  updateProgramMeta,
  updateTrainingBlockInDraft,
  updateWorkoutInDraft,
} from '@/lib/programs/programDraftMutations'
import {
  clearStoredProgramDraft,
  readStoredProgramDraft,
  storedDraftDiffersFromBaseline,
  writeStoredProgramDraft,
} from '@/lib/programs/programDraftStorage'
import {
  cloneProgramDraft,
  clearDirtyFlags,
  hasUnsavedChanges,
} from '@/lib/programs/programDraftUtils'

export type ProgramSaveUiState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

interface ProgramDraftContextValue {
  loading: boolean
  baseline: ProgramDraftState | null
  workingCopy: ProgramDraftState | null
  editorMode: ProgramEditorMode
  saveState: ProgramSaveUiState
  saveError: string | null
  categories: Array<{ id: string; name: string }>
  resumePrompt: { savedAt: string } | null
  isDirty: boolean
  setWorkingCopy: (next: ProgramDraftState) => void
  acceptResume: () => void
  discardStoredDraft: () => void
  discardToBaseline: () => void
  commit: () => Promise<ProgramCommitResult>
  updateProgramName: (name: string) => void
  applySettings: (program: StationProgram) => void
  updateWorkout: (templateId: string, workout: CanvasWorkout) => void
  buildDay: (absoluteWeek: number, programDay: number, activeBlockId: string | null) => void
  insertLibraryDay: (
    libraryWorkout: CanvasWorkout,
    absoluteWeek: number,
    programDay: number,
    activeBlockId: string | null,
    replace: boolean,
  ) => void
  clearDay: (absoluteWeek: number, programDay: number) => void
  copyDay: (
    sourceWeek: number,
    sourceDay: number,
    targetWeek: number,
    targetDay: number,
    activeBlockId: string | null,
  ) => void
  moveDay: (
    sourceWeek: number,
    sourceDay: number,
    targetWeek: number,
    targetDay: number,
    activeBlockId: string | null,
  ) => void
  duplicateGroup: (templateId: string, groupId: string) => void
  copyGroupToDay: (sourceTemplateId: string, groupId: string, targetTemplateId: string) => void
  addBlock: (payload: {
    name: string
    duration_weeks: number
    phase_label?: string | null
    notes?: string | null
  }) => string | null
  updateBlock: (blockId: string, updates: Partial<Omit<TrainingBlock, 'id' | 'program_id'>>) => void
  deleteBlock: (blockId: string) => void
  reorderBlocks: (orderedIds: string[]) => void
  duplicateBlock: (block: TrainingBlock) => void
  addWeek: (blockId: string) => void
  duplicateWeek: (block: TrainingBlock, sourceAbsoluteWeek: number) => void
  copyWeekToWeeks: (
    block: TrainingBlock,
    sourceAbsoluteWeek: number,
    targetAbsWeeks: number[],
  ) => void
}

const ProgramDraftContext = createContext<ProgramDraftContextValue | null>(null)

const STORAGE_DEBOUNCE_MS = 500

export function useProgramDraft(): ProgramDraftContextValue {
  const ctx = useContext(ProgramDraftContext)
  if (!ctx) throw new Error('useProgramDraft must be used within ProgramDraftProvider')
  return ctx
}

interface ProgramDraftProviderBaseProps {
  coachId: string
  children: ReactNode
  supabaseClient?: SupabaseClient
}

export type ProgramDraftProviderProps =
  | (ProgramDraftProviderBaseProps & {
      mode?: 'master'
      programId: string
    })
  | (ProgramDraftProviderBaseProps & {
      mode: 'client'
      programId: string
      assignmentId: string
      clientId: string
      clientName?: string
      clientAvatarUrl?: string | null
    })

export function ProgramDraftProvider(props: ProgramDraftProviderProps) {
  const {
    programId,
    coachId,
    children,
    supabaseClient = supabase,
  } = props
  const editorMode: ProgramEditorMode = props.mode === 'client' ? 'client' : 'master'
  const assignmentId = props.mode === 'client' ? props.assignmentId : undefined
  const clientId = props.mode === 'client' ? props.clientId : undefined
  const clientName = props.mode === 'client' ? props.clientName : undefined
  const clientAvatarUrl = props.mode === 'client' ? props.clientAvatarUrl : undefined

  const storageAssignmentId = assignmentId
  const [loading, setLoading] = useState(true)
  const [baseline, setBaseline] = useState<ProgramDraftState | null>(null)
  const [workingCopy, setWorkingCopyState] = useState<ProgramDraftState | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [saveState, setSaveState] = useState<ProgramSaveUiState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [resumePrompt, setResumePrompt] = useState<{ savedAt: string } | null>(null)
  const storageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Prevents overlapping program commits (double-submit / stray triggers). */
  const commitInFlightRef = useRef(false)

  const setWorkingCopy = useCallback(
    (next: ProgramDraftState) => {
      setWorkingCopyState(next)
      setSaveState(hasUnsavedChanges(next) ? 'dirty' : 'idle')
      setSaveError(null)
      if (storageTimer.current) clearTimeout(storageTimer.current)
      storageTimer.current = setTimeout(() => {
        writeStoredProgramDraft(coachId, programId, next, storageAssignmentId)
      }, STORAGE_DEBOUNCE_MS)
    },
    [coachId, programId, storageAssignmentId],
  )

  const loadInitial = useCallback(async () => {
    setLoading(true)
    try {
      const { data: cats } = await supabaseClient
        .from('workout_categories')
        .select('id, name')
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .order('name')
      setCategories(cats ?? [])

      let withCat: ProgramDraftState
      if (editorMode === 'client' && assignmentId && clientId) {
        const base = await loadInstanceProgramDraftBaseline({
          supabase: supabaseClient,
          assignmentId,
          clientId,
          programId,
          coachId,
          clientName,
          clientAvatarUrl,
        })
        withCat = { ...base, categoryId: 'none' }
      } else {
        const base = await loadProgramDraftBaseline(supabaseClient, programId, coachId, 'none')
        withCat = { ...base, categoryId: 'none', editorMode: 'master' }
      }

      setBaseline(cloneProgramDraft(withCat))

      const stored = readStoredProgramDraft(coachId, programId, storageAssignmentId)
      if (stored && storedDraftDiffersFromBaseline(stored, withCat)) {
        setResumePrompt({ savedAt: stored.savedAt })
        setWorkingCopyState(cloneProgramDraft(withCat))
      } else {
        setWorkingCopyState(cloneProgramDraft(withCat))
      }
    } finally {
      setLoading(false)
    }
  }, [
    coachId,
    programId,
    supabaseClient,
    editorMode,
    assignmentId,
    clientId,
    clientName,
    clientAvatarUrl,
    storageAssignmentId,
  ])

  useEffect(() => {
    void loadInitial()
    return () => {
      if (storageTimer.current) clearTimeout(storageTimer.current)
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current)
    }
  }, [loadInitial])

  const acceptResume = useCallback(() => {
    const stored = readStoredProgramDraft(coachId, programId, storageAssignmentId)
    if (stored?.workingCopy) {
      setWorkingCopyState(cloneProgramDraft(stored.workingCopy))
      setSaveState(hasUnsavedChanges(stored.workingCopy) ? 'dirty' : 'idle')
    }
    setResumePrompt(null)
  }, [coachId, programId, storageAssignmentId])

  const discardStoredDraft = useCallback(() => {
    clearStoredProgramDraft(coachId, programId, storageAssignmentId)
    if (baseline) {
      setWorkingCopyState(cloneProgramDraft(baseline))
      setSaveState('idle')
      setSaveError(null)
    }
    setResumePrompt(null)
  }, [baseline, coachId, programId, storageAssignmentId])

  const discardToBaseline = useCallback(() => {
    clearStoredProgramDraft(coachId, programId, storageAssignmentId)
    if (baseline) {
      setWorkingCopyState(cloneProgramDraft(baseline))
      setSaveState('idle')
      setSaveError(null)
    }
  }, [baseline, coachId, programId, storageAssignmentId])

  const commit = useCallback(async (): Promise<ProgramCommitResult> => {
    if (commitInFlightRef.current) {
      return { success: false, error: 'Save already in progress' }
    }
    if (!workingCopy || !baseline) {
      return { success: false, error: 'Draft not loaded' }
    }

    commitInFlightRef.current = true
    setSaveState('saving')
    setSaveError(null)

    try {
      const result =
        editorMode === 'client'
          ? await commitInstanceProgramDraft(supabaseClient, workingCopy, baseline)
          : await commitProgramDraft(supabaseClient, workingCopy, baseline, categories)
      if (!result.success) {
        setSaveState('error')
        const message = result.error ?? result.partialMessage ?? 'Save failed'
        setSaveError(formatSaveError(message))
        if (result.pendingNewWorkoutIds && workingCopy) {
          const next = {
            ...workingCopy,
            pendingNewWorkoutIds: result.pendingNewWorkoutIds,
          }
          setWorkingCopyState(next)
          writeStoredProgramDraft(coachId, programId, next, storageAssignmentId)
        }
        return result
      }
      const committed = clearDirtyFlags(cloneProgramDraft(workingCopy))
      setBaseline(committed)
      setWorkingCopyState(committed)
      clearStoredProgramDraft(coachId, programId, storageAssignmentId)
      setSaveState('saved')
      if (savedFadeTimer.current) clearTimeout(savedFadeTimer.current)
      savedFadeTimer.current = setTimeout(() => setSaveState('idle'), 2000)
      return result
    } catch (err: unknown) {
      const message = formatSaveError(err)
      setSaveState('error')
      setSaveError(message)
      return { success: false, error: message }
    } finally {
      commitInFlightRef.current = false
    }
  }, [workingCopy, baseline, categories, coachId, programId, supabaseClient, editorMode, storageAssignmentId])

  const mutate = useCallback(
    (fn: (d: ProgramDraftState) => ProgramDraftState) => {
      if (!workingCopy) return
      setWorkingCopy(fn(workingCopy))
    },
    [workingCopy, setWorkingCopy],
  )

  const value = useMemo<ProgramDraftContextValue>(
    () => ({
      loading,
      baseline,
      workingCopy,
      editorMode,
      saveState,
      saveError,
      categories,
      resumePrompt,
      isDirty: workingCopy ? hasUnsavedChanges(workingCopy) : false,
      setWorkingCopy,
      acceptResume,
      discardStoredDraft,
      discardToBaseline,
      commit,
      updateProgramName: (name) => mutate((d) => updateProgramMeta(d, { name })),
      applySettings: (program) => mutate((d) => updateProgramMeta(d, program)),
      updateWorkout: (templateId, workout) =>
        mutate((d) => updateWorkoutInDraft(d, templateId, workout)),
      buildDay: (absoluteWeek, programDay, activeBlockId) =>
        mutate((d) => buildDayFromScratch(d, absoluteWeek, programDay, activeBlockId)),
      insertLibraryDay: (libraryWorkout, absoluteWeek, programDay, activeBlockId, replace) =>
        mutate((d) =>
          insertLibraryWorkoutIntoDraft(
            d,
            libraryWorkout,
            absoluteWeek,
            programDay,
            activeBlockId,
            replace,
          ),
        ),
      clearDay: (absoluteWeek, programDay) =>
        mutate((d) => clearDayInDraft(d, absoluteWeek, programDay)),
      copyDay: (sourceWeek, sourceDay, targetWeek, targetDay, activeBlockId) =>
        mutate((d) =>
          copyDayToSlotInDraft(d, sourceWeek, sourceDay, targetWeek, targetDay, activeBlockId),
        ),
      moveDay: (sourceWeek, sourceDay, targetWeek, targetDay, activeBlockId) =>
        mutate((d) =>
          moveDayInDraft(d, sourceWeek, sourceDay, targetWeek, targetDay, activeBlockId),
        ),
      duplicateGroup: (templateId, groupId) =>
        mutate((d) => duplicateGroupInDraft(d, templateId, groupId)),
      copyGroupToDay: (sourceTemplateId, groupId, targetTemplateId) =>
        mutate((d) => copyGroupToDayInDraft(d, sourceTemplateId, groupId, targetTemplateId)),
      addBlock: (payload) => {
        if (!workingCopy) return null
        const { state, newBlockId } = addTrainingBlockToDraft(workingCopy, payload)
        setWorkingCopy(state)
        return newBlockId
      },
      updateBlock: (blockId, updates) =>
        mutate((d) => updateTrainingBlockInDraft(d, blockId, updates)),
      deleteBlock: (blockId) => mutate((d) => deleteTrainingBlockFromDraft(d, blockId)),
      reorderBlocks: (orderedIds) => mutate((d) => reorderBlocksInDraft(d, orderedIds)),
      duplicateBlock: (block) => mutate((d) => duplicateTrainingBlockInDraft(d, block)),
      addWeek: (blockId) => mutate((d) => addWeekToBlockInDraft(d, blockId)),
      duplicateWeek: (block, sourceAbsoluteWeek) =>
        mutate((d) => duplicateWeekInDraft(d, block, sourceAbsoluteWeek)),
      copyWeekToWeeks: (block, sourceAbsoluteWeek, targetAbsWeeks) =>
        mutate((d) => copyWeekToWeeksInDraft(d, block, sourceAbsoluteWeek, targetAbsWeeks)),
    }),
    [
      loading,
      baseline,
      workingCopy,
      editorMode,
      saveState,
      saveError,
      categories,
      resumePrompt,
      setWorkingCopy,
      acceptResume,
      discardStoredDraft,
      discardToBaseline,
      commit,
      mutate,
    ],
  )

  return <ProgramDraftContext.Provider value={value}>{children}</ProgramDraftContext.Provider>
}

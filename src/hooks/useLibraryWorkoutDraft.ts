'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import { supabase } from '@/lib/supabase'
import { loadWorkoutForCanvas } from '@/lib/groupModel/canvasLoad'
import { saveWorkoutFromCanvas, formatSaveError } from '@/lib/groupModel/canvasSave'
import { createEmptyCanvasWorkout } from '@/lib/groupModel/canvasTypes'
import { cloneCanvasWorkout } from '@/lib/programs/programDraftUtils'

export type LibrarySaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export function useLibraryWorkoutDraft(templateId: string | undefined, coachId: string) {
  const [baseline, setBaseline] = useState<CanvasWorkout | null>(null)
  const [workingCopy, setWorkingCopy] = useState<CanvasWorkout | null>(null)
  const [loading, setLoading] = useState(Boolean(templateId))
  const [saveState, setSaveState] = useState<LibrarySaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isNew = !templateId

  useEffect(() => {
    if (!templateId) {
      const empty = createEmptyCanvasWorkout({ name: 'Untitled template', kind: 'library' })
      setBaseline(cloneCanvasWorkout(empty))
      setWorkingCopy(cloneCanvasWorkout(empty))
      setLoading(false)
      return
    }
    setLoading(true)
    loadWorkoutForCanvas(supabase, templateId)
      .then((w) => {
        if (w) {
          setBaseline(cloneCanvasWorkout(w))
          setWorkingCopy(cloneCanvasWorkout(w))
        }
      })
      .finally(() => setLoading(false))
  }, [templateId])

  const handleWorkoutChange = useCallback((next: CanvasWorkout) => {
    setWorkingCopy(next)
    setDirty(true)
    setSaveState('dirty')
    setSaveError(null)
  }, [])

  const handleNameChange = useCallback(
    (name: string) => {
      if (!workingCopy) return
      handleWorkoutChange({ ...workingCopy, name })
    },
    [workingCopy, handleWorkoutChange],
  )

  const discard = useCallback(() => {
    if (baseline) {
      setWorkingCopy(cloneCanvasWorkout(baseline))
      setDirty(false)
      setSaveState('idle')
      setSaveError(null)
    }
  }, [baseline])

  const commit = useCallback(async (): Promise<{ success: boolean; templateId?: string; error?: string }> => {
    if (!workingCopy) return { success: false, error: 'No workout loaded' }
    setSaveState('saving')
    setSaveError(null)
    const result = await saveWorkoutFromCanvas({
      supabase,
      userId: coachId,
      workout: workingCopy,
      isNew,
    })
    if (!result.success) {
      const msg = result.error ?? 'Save failed'
      setSaveState('error')
      setSaveError(msg)
      return { success: false, error: msg }
    }
    const committed = cloneCanvasWorkout(workingCopy)
    if (result.templateId) committed.id = result.templateId
    setBaseline(committed)
    setWorkingCopy(committed)
    setDirty(false)
    setSaveState('saved')
    if (fadeTimer.current) clearTimeout(fadeTimer.current)
    fadeTimer.current = setTimeout(() => setSaveState('idle'), 2000)
    return { success: true, templateId: result.templateId ?? workingCopy.id }
  }, [workingCopy, coachId, isNew])

  useEffect(
    () => () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current)
    },
    [],
  )

  return {
    workingCopy,
    loading,
    dirty,
    saveState,
    saveError,
    handleWorkoutChange,
    handleNameChange,
    discard,
    commit,
    isNew,
  }
}

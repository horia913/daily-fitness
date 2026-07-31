'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { supabase } from '@/lib/supabase'
import { loadWorkoutForCanvas } from '@/lib/groupModel/canvasLoad'
import { createEmptyCanvasWorkout, type CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import { useExerciseLibrary, type ExerciseLibraryItem } from '@/hooks/useExerciseLibrary'

export interface UseWorkoutCanvasEditorResult {
  workout: CanvasWorkout | null
  loading: boolean
  loadError: string | null
  availableExercises: ExerciseLibraryItem[]
  setWorkout: Dispatch<SetStateAction<CanvasWorkout | null>>
  reloadWorkout: (id: string) => Promise<CanvasWorkout | null>
  retryLoad: () => void
}

export interface UseWorkoutCanvasEditorOptions {
  /** When false, skip network loads (mobile companion gate). */
  enabled?: boolean
}

/**
 * Single owner for template editor data: one batched workout load per templateId
 * (deduped across StrictMode remounts) + shared exercise library cache.
 */
export function useWorkoutCanvasEditor(
  templateId?: string,
  options?: UseWorkoutCanvasEditorOptions,
): UseWorkoutCanvasEditorResult {
  const enabled = options?.enabled !== false
  const [workout, setWorkout] = useState<CanvasWorkout | null>(null)
  const [loading, setLoading] = useState(Boolean(templateId) && enabled)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const availableExercises = useExerciseLibrary(enabled)
  const loadGenerationRef = useRef(0)

  const reloadWorkout = useCallback(async (id: string) => {
    const loaded = await loadWorkoutForCanvas(supabase, id, { bypassCache: true })
    if (loaded) setWorkout(loaded)
    return loaded
  }, [])

  const retryLoad = useCallback(() => {
    setReloadToken((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setLoadError(null)
      return
    }

    if (!templateId) {
      setWorkout(
        createEmptyCanvasWorkout({
          name: 'Untitled template',
          kind: 'library',
        }),
      )
      setLoading(false)
      setLoadError(null)
      return
    }

    const generation = ++loadGenerationRef.current
    let cancelled = false
    setLoading(true)
    setLoadError(null)

    loadWorkoutForCanvas(supabase, templateId)
      .then((w) => {
        if (cancelled || generation !== loadGenerationRef.current) return
        if (w) {
          setWorkout(w)
          setLoadError(null)
        } else {
          setWorkout(null)
          setLoadError('Template not found')
        }
      })
      .catch((err) => {
        if (cancelled || generation !== loadGenerationRef.current) return
        setWorkout(null)
        setLoadError(err instanceof Error ? err.message : 'Failed to load template')
      })
      .finally(() => {
        if (!cancelled && generation === loadGenerationRef.current) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [templateId, reloadToken, enabled])

  return {
    workout,
    loading,
    loadError,
    availableExercises,
    setWorkout,
    reloadWorkout,
    retryLoad,
  }
}

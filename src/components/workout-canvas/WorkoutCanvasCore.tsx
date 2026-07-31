'use client'

import React, { useEffect } from 'react'
import type { CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import { countCanvasExercises } from '@/lib/groupModel/canvasTypes'
import { useWorkoutCanvasEditor } from '@/hooks/useWorkoutCanvasEditor'
import { WorkoutCanvas } from './WorkoutCanvas'
import { useToast } from '@/components/ui/toast-provider'

export interface WorkoutCanvasCoreProps {
  workoutId?: string
  coachId: string
  /** Draft mode: workout supplied by parent working copy — no load, no autosave. */
  workout?: CanvasWorkout | null
  onWorkoutChange?: (workout: CanvasWorkout) => void
  className?: string
  onDuplicateGroup?: (groupId: string) => void
  onCopyGroupToDay?: (groupId: string) => void
  onFillExercise?: (groupId: string, slotId: string) => void
  onFillGroup?: (groupId: string) => void
  fillAccentColor?: string
  visualVariant?: 'default' | 'station'
}

/**
 * Embeddable canvas editing surface. Draft mode (workout prop) = zero network on edit.
 * Legacy load mode (workoutId only) still loads once for library flows transitioning to explicit save.
 */
export function WorkoutCanvasCore({
  workoutId,
  coachId,
  workout: draftWorkout,
  onWorkoutChange,
  className,
  onDuplicateGroup,
  onCopyGroupToDay,
  onFillExercise,
  onFillGroup,
  fillAccentColor,
  visualVariant,
}: WorkoutCanvasCoreProps) {
  const { addToast } = useToast()
  const isDraftMode = draftWorkout != null

  const {
    workout: loadedWorkout,
    loading,
    loadError,
    availableExercises,
    setWorkout,
    retryLoad,
  } = useWorkoutCanvasEditor(isDraftMode ? undefined : workoutId)

  const workout = isDraftMode ? draftWorkout : loadedWorkout

  useEffect(() => {
    if (isDraftMode && draftWorkout) {
      setWorkout(draftWorkout)
    }
  }, [isDraftMode, draftWorkout, setWorkout])

  const loadErrorToastRef = React.useRef<string | null>(null)
  useEffect(() => {
    if (isDraftMode || !loadError || loadError === loadErrorToastRef.current) return
    loadErrorToastRef.current = loadError
    addToast({ title: loadError, variant: 'destructive' })
  }, [loadError, addToast, isDraftMode])

  if (!isDraftMode && loading) {
    return (
      <div
        className={className}
        data-testid="workout-canvas-core-loading"
        style={{ color: 'var(--pe-t3)' }}
      >
        Loading workout…
      </div>
    )
  }

  if (!workout) {
    return (
      <div className={className} data-testid="workout-canvas-core-error">
        <p style={{ color: 'var(--pe-t1)' }}>{loadError ?? 'Workout not found'}</p>
        {!isDraftMode ? (
          <button
            type="button"
            onClick={() => retryLoad()}
            className="mt-3 px-4 py-2 rounded text-sm"
            style={{ background: 'var(--fc-accent)', color: '#0a1a18' }}
          >
            Retry
          </button>
        ) : null}
      </div>
    )
  }

  const exerciseCount = countCanvasExercises(workout)

  return (
    <div className={className} data-testid="workout-canvas-core">
      <WorkoutCanvas
        workout={workout}
        availableExercises={availableExercises}
        coachId={coachId}
        onWorkoutChange={(next) => {
          if (!isDraftMode) setWorkout(next)
          onWorkoutChange?.(next)
        }}
        onError={(msg) => addToast({ title: msg, variant: 'destructive' })}
        onDuplicateGroup={onDuplicateGroup}
        onCopyGroupToDay={onCopyGroupToDay}
        onFillExercise={onFillExercise}
        onFillGroup={onFillGroup}
        fillAccentColor={fillAccentColor}
        visualVariant={visualVariant}
      />
      {exerciseCount > 0 ? (
        <p className="sr-only" data-testid="canvas-exercise-count">
          {exerciseCount} exercises
        </p>
      ) : null}
    </div>
  )
}

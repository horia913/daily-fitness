'use client'

import { useEffect, useState } from 'react'
import WorkoutTemplateService, { type Exercise } from '@/lib/workoutTemplateService'

export type ExerciseLibraryItem = Pick<Exercise, 'id' | 'name' | 'description'>

let cachedExercises: ExerciseLibraryItem[] | null = null
let inflightExercises: Promise<ExerciseLibraryItem[]> | null = null

async function fetchExerciseLibrary(): Promise<ExerciseLibraryItem[]> {
  if (cachedExercises) return cachedExercises
  if (inflightExercises) return inflightExercises

  inflightExercises = WorkoutTemplateService.getExercises(undefined, '')
    .then((rows) => {
      cachedExercises = rows.map((ex) => ({
        id: ex.id,
        name: ex.name,
        description: ex.description,
      }))
      return cachedExercises
    })
    .finally(() => {
      inflightExercises = null
    })

  return inflightExercises
}

/** Session-scoped exercise library — one network fetch shared by all canvas editors. */
export function useExerciseLibrary(enabled = true): ExerciseLibraryItem[] {
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>(cachedExercises ?? [])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void fetchExerciseLibrary().then((rows) => {
      if (!cancelled) setExercises(rows)
    })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return exercises
}

/** Test helper — reset module cache between tests. */
export function resetExerciseLibraryCacheForTests(): void {
  cachedExercises = null
  inflightExercises = null
}

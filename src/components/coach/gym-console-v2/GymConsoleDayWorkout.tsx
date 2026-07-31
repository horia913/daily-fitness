'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { ExerciseGroupDisplay } from '@/components/exercise-display'
import type { ExerciseGroupDisplayProps } from '@/components/exercise-display'
import { loadDayExerciseGroups } from '@/components/client/train/loadDayCanvas'
import { daysAgoText } from '@/app/coach/gym-console/gymConsoleWorkLine'
import {
  getExercisePreviousPerformance,
  type ExercisePreviousPerformance,
} from '@/lib/clientProgressionService'
import { supabase } from '@/lib/supabase'
import {
  exerciseMarkKey,
  readSessionMarks,
  writeSessionMarks,
  type GymConsoleSessionMarks,
} from './sessionMarksStorage'
import styles from './GymConsoleDayWorkout.module.css'

export type GymConsoleDayWorkoutProps = {
  /** Master template day (Add Program path) — always required as fallback. */
  templateId: string
  /** Instance workout when viewing an assigned client's day (Add Client path). */
  programInstanceWorkoutId?: string | null
  /** Optional label shown above the session (e.g. "Week 1 · Day 1"). */
  title?: string
  className?: string
  /** Assignment path only — client whose history to look up. */
  clientId?: string | null
  /** When true with clientId, fetch + show last-performed under each exercise. */
  showPreviousPerformance?: boolean
  /**
   * Opened-workout scratchpad only. When set with sessionMarksScope, each exercise
   * gets a small right-edge done toggle (localStorage — zero DB).
   */
  enableSessionMarks?: boolean
  /** Scope string from sessionMarksStorage builders (client or program + day). */
  sessionMarksScope?: string | null
}

/** Compact "Lst" line matching SessionCard / gymConsoleWorkLine daysAgoText. */
function formatPreviousPerformanceLine(
  last: NonNullable<ExercisePreviousPerformance['lastWorkout']>,
): string {
  const body = `${last.sets} × ${last.reps ?? '—'} @ ${last.weight ?? '—'}kg`
  const ago = last.date ? daysAgoText(last.date) : ''
  return ago ? `Last: ${body} · ${ago}` : `Last: ${body}`
}

function toggleInList(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
}

export function GymConsoleDayWorkout({
  templateId,
  programInstanceWorkoutId = null,
  title,
  className,
  clientId = null,
  showPreviousPerformance = false,
  enableSessionMarks = false,
  sessionMarksScope = null,
}: GymConsoleDayWorkoutProps) {
  const instanceId = programInstanceWorkoutId?.trim() || null
  const trimmedTemplateId = templateId.trim()
  const trimmedClientId = clientId?.trim() || null
  const wantPrevPerf = Boolean(showPreviousPerformance && trimmedClientId)
  const marksScope = sessionMarksScope?.trim() || null
  const wantMarks = Boolean(enableSessionMarks && marksScope)

  const query = useQuery({
    queryKey: ['gym-console-day', trimmedTemplateId, instanceId],
    queryFn: () =>
      loadDayExerciseGroups(supabase, {
        templateId: trimmedTemplateId,
        instanceWorkoutId: instanceId,
      }),
    enabled: Boolean(trimmedTemplateId),
  })

  const groups = query.data ?? []

  const [marks, setMarks] = useState<GymConsoleSessionMarks>({ exercises: [] })

  useEffect(() => {
    if (!wantMarks || !marksScope) {
      setMarks({ exercises: [] })
      return
    }
    setMarks(readSessionMarks(marksScope))
  }, [wantMarks, marksScope])

  const persistMarks = useCallback(
    (next: GymConsoleSessionMarks) => {
      if (!marksScope) return
      setMarks(next)
      writeSessionMarks(marksScope, next)
    },
    [marksScope],
  )

  const toggleExercise = useCallback(
    (exKey: string) => {
      persistMarks({ exercises: toggleInList(marks.exercises, exKey) })
    },
    [marks.exercises, persistMarks],
  )

  const exerciseIds = useMemo(() => {
    if (!wantPrevPerf) return [] as string[]
    const ids: string[] = []
    for (const group of groups) {
      for (const ex of group.exercises) {
        const id = ex.exerciseId?.trim()
        if (id) ids.push(id)
      }
    }
    return [...new Set(ids)]
  }, [groups, wantPrevPerf])

  const prevQueries = useQueries({
    queries: exerciseIds.map((exerciseId) => ({
      queryKey: ['exercise-prev-perf', trimmedClientId, exerciseId] as const,
      queryFn: () => getExercisePreviousPerformance(trimmedClientId!, exerciseId),
      enabled: wantPrevPerf && Boolean(trimmedClientId) && Boolean(exerciseId),
    })),
  })

  const prevLineByExerciseId = new Map<string, string | null>()
  if (wantPrevPerf) {
    exerciseIds.forEach((exerciseId, i) => {
      const result = prevQueries[i]?.data
      if (!result) {
        prevLineByExerciseId.set(exerciseId, null)
        return
      }
      const last = result.lastWorkout
      prevLineByExerciseId.set(exerciseId, last ? formatPreviousPerformanceLine(last) : null)
    })
  }

  const exerciseDoneSet = useMemo(() => new Set(marks.exercises), [marks.exercises])

  const displayGroups: ExerciseGroupDisplayProps[] = groups.map((group) => ({
    ...group,
    exercises: group.exercises.map((ex) => {
      const id = ex.exerciseId?.trim()
      const secondaryLine =
        wantPrevPerf && id ? (prevLineByExerciseId.get(id) ?? null) : ex.secondaryLine ?? null
      const exKey = exerciseMarkKey(ex.exerciseId, `${group.letter}-${ex.badge}-${ex.name}`)
      return {
        ...ex,
        secondaryLine: secondaryLine || null,
        markToggle: wantMarks
          ? {
              done: exerciseDoneSet.has(exKey),
              onToggle: () => toggleExercise(exKey),
            }
          : null,
      }
    }),
  }))

  return (
    <section className={`${styles.root}${className ? ` ${className}` : ''}`} aria-busy={query.isLoading}>
      {title ? <h2 className={styles.title}>{title}</h2> : null}

      {query.isLoading ? (
        <div className={styles.loading} role="status">
          <div className={styles.skeleton} aria-hidden />
          <div className={styles.skeleton} aria-hidden />
          <div className={styles.skeletonShort} aria-hidden />
          <p className={styles.statusText}>Loading workout…</p>
        </div>
      ) : query.isError ? (
        <p className={styles.statusText} role="alert">
          Couldn&apos;t load this workout.
        </p>
      ) : displayGroups.length === 0 ? (
        <p className={styles.statusText}>No workout for this day.</p>
      ) : (
        <div className={styles.groups}>
          {displayGroups.map((group) => (
            <ExerciseGroupDisplay
              key={`${group.groupIndex}-${group.letter}`}
              {...group}
              size="list"
            />
          ))}
        </div>
      )}
    </section>
  )
}

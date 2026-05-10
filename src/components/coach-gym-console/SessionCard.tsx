'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchApi } from '@/lib/apiClient'
import {
  getCurrentWeekProgressionRules,
  getExercisePreviousPerformance,
  getPrDateKeysByExercise,
} from '@/lib/clientProgressionService'
import type { ClientStatus, NextWorkoutResponse } from '@/app/coach/gym-console/gymConsoleTypes'
import { buildWorkLine } from '@/app/coach/gym-console/gymConsoleWorkLine'
import { SessionHead } from './SessionHead'
import { ProgressStrip } from './ProgressStrip'
import { ExerciseSession, type ConsoleExercise } from './ExerciseSession'
import styles from './gymConsoleV1.module.css'

function nextUndoneCurrent(
  list: ConsoleExercise[],
  marked: Set<string>,
  afterSetEntryId: string | null,
): string | null {
  const start = afterSetEntryId ? list.findIndex((e) => e.setEntryId === afterSetEntryId) : -1
  for (let i = start + 1; i < list.length; i++) {
    if (!marked.has(list[i]!.setEntryId)) return list[i]!.setEntryId
  }
  for (let i = 0; i < list.length; i++) {
    if (!marked.has(list[i]!.setEntryId)) return list[i]!.setEntryId
  }
  return null
}

export function SessionCard({
  status,
  onRemoveFromConsole,
  globalNowMs,
  onSessionSetLogged,
  onClientPR,
  weightUnit = 'kg',
}: {
  status: ClientStatus
  onRemoveFromConsole: () => void
  globalNowMs: number
  onSessionSetLogged: () => void
  onClientPR: () => void
  weightUnit?: 'kg' | 'lb'
}) {
  const [workoutData, setWorkoutData] = useState<NextWorkoutResponse | null>(null)
  const [loadingWorkout, setLoadingWorkout] = useState(false)
  const [previousByExercise, setPreviousByExercise] = useState<
    Map<string, Awaited<ReturnType<typeof getExercisePreviousPerformance>>>
  >(new Map())
  const [rulesByExercise, setRulesByExercise] = useState(
    new Map<string, Awaited<ReturnType<typeof getCurrentWeekProgressionRules>>>(),
  )
  const [prDateKeysByExercise, setPrDateKeysByExercise] = useState<Map<string, Set<string>>>(new Map())
  const [historyLoading, setHistoryLoading] = useState(false)
  const [rulesLoading, setRulesLoading] = useState(false)

  const [markedDone, setMarkedDone] = useState<Set<string>>(() => new Set())
  const [currentSetEntryId, setCurrentSetEntryId] = useState<string | null>(null)
  const [sessionSetsByExercise, setSessionSetsByExercise] = useState<Map<string, number>>(() => new Map())
  const [restTimer, setRestTimer] = useState<{
    setEntryId: string
    prescribedSec: number
    endMs: number | null
  } | null>(null)
  const [prFlash, setPrFlash] = useState<Set<string>>(() => new Set())
  const prTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const currentIdRef = useRef<string | null>(null)
  useEffect(() => {
    currentIdRef.current = currentSetEntryId
  }, [currentSetEntryId])

  useEffect(() => {
    let cancelled = false
    setLoadingWorkout(true)
    fetchApi(`/api/coach/pickup/next-workout?clientId=${status.clientId}`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setWorkoutData(body ?? null)
      })
      .catch(() => {
        if (!cancelled) setWorkoutData(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingWorkout(false)
      })
    return () => {
      cancelled = true
    }
  }, [status.clientId])

  const exercises = useMemo<ConsoleExercise[]>(() => {
    const blocks = Array.isArray(workoutData?.blocks) ? workoutData!.blocks! : []
    const rows: ConsoleExercise[] = []
    for (const block of blocks as Array<{
      set_type?: string
      block_type?: string
      exercises?: Array<{
        id?: string
        exercise_id?: string
        exercise_name?: string
      }>
    }>) {
      const blockSetType = String(block.set_type || block.block_type || '').trim()
      const setType = blockSetType || 'straight_set'
      for (const ex of block.exercises || []) {
        const exerciseId = ex.exercise_id
        const exerciseName = ex.exercise_name
        if (!exerciseId || !exerciseName) continue
        const setEntryId =
          typeof ex.id === 'string' && ex.id.length > 0 ? ex.id : `${setType}-${exerciseId}-${rows.length}`
        rows.push({ setEntryId, exerciseId, name: exerciseName, setType })
      }
    }
    return rows
  }, [workoutData])

  useEffect(() => {
    if (exercises.length === 0) {
      setCurrentSetEntryId(null)
      return
    }
    setCurrentSetEntryId((prev) => {
      if (prev && exercises.some((e) => e.setEntryId === prev)) return prev
      return exercises[0]!.setEntryId
    })
  }, [exercises])

  useEffect(() => {
    let cancelled = false
    if (exercises.length === 0) {
      setPreviousByExercise(new Map())
      setRulesByExercise(new Map())
      setPrDateKeysByExercise(new Map())
      setHistoryLoading(false)
      setRulesLoading(false)
      return
    }

    const assignmentId =
      status.programAssignmentId ?? status.nextWorkout?.programAssignmentId ?? null
    const currentWeek = status.currentWeek

    setHistoryLoading(true)
    setRulesLoading(true)

    Promise.all(
      exercises.map(async (ex) => {
        const previous = await getExercisePreviousPerformance(status.clientId, ex.exerciseId)
        return [ex.exerciseId, previous] as const
      }),
    )
      .then((rows) => {
        if (!cancelled) setPreviousByExercise(new Map(rows))
      })
      .catch((err) => {
        console.error('Gym console: previous performance fetch failed', err)
        if (!cancelled) setPreviousByExercise(new Map())
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })

    getPrDateKeysByExercise(
      status.clientId,
      exercises.map((ex) => ex.exerciseId),
    )
      .then((map) => {
        if (!cancelled) setPrDateKeysByExercise(map)
      })
      .catch((err) => {
        console.error('Gym console: PR date fetch failed', err)
        if (!cancelled) setPrDateKeysByExercise(new Map())
      })

    Promise.allSettled(
      exercises.map(async (ex) => {
        if (!assignmentId || currentWeek == null) {
          return [ex.exerciseId, null] as const
        }
        const rule = await getCurrentWeekProgressionRules(assignmentId, currentWeek, ex.exerciseId)
        return [ex.exerciseId, rule] as const
      }),
    )
      .then((results) => {
        if (cancelled) return
        const map = new Map<string, Awaited<ReturnType<typeof getCurrentWeekProgressionRules>> | null>()
        results.forEach((r, i) => {
          const exId = exercises[i]?.exerciseId
          if (!exId) return
          if (r.status === 'fulfilled') {
            map.set(exId, r.value[1])
          } else {
            map.set(exId, null)
          }
        })
        setRulesByExercise(map)
      })
      .finally(() => {
        if (!cancelled) setRulesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    status.clientId,
    status.programAssignmentId,
    status.nextWorkout?.programAssignmentId,
    status.currentWeek,
    exercises,
  ])

  const programLabel =
    (workoutData as { position_label?: string } | null)?.position_label ??
    (status.currentWeek != null && status.currentDay != null
      ? `Week ${status.currentWeek} day ${status.currentDay}`
      : 'Program')
  const programType = status.programName ?? workoutData?.program_name ?? 'Program'
  const subtitle = `${programLabel} · ${programType}`

  const active = status.activeSession

  const handleStatusClick = useCallback(
    (setEntryId: string) => {
      const cur = currentIdRef.current
      setMarkedDone((prev) => {
        const next = new Set(prev)
        const wasDone = next.has(setEntryId)
        const isCurrent = setEntryId === cur

        if (wasDone) {
          next.delete(setEntryId)
          queueMicrotask(() => setCurrentSetEntryId(setEntryId))
          return next
        }

        if (isCurrent) {
          next.add(setEntryId)
          const nxt = nextUndoneCurrent(exercises, next, setEntryId)
          queueMicrotask(() => setCurrentSetEntryId(nxt))
          return next
        }

        if (cur && !next.has(cur)) {
          next.add(cur)
        }
        queueMicrotask(() => setCurrentSetEntryId(setEntryId))
        return next
      })
    },
    [exercises],
  )

  const triggerPrFlash = useCallback((setEntryId: string) => {
    setPrFlash((p) => new Set(p).add(setEntryId))
    const old = prTimers.current.get(setEntryId)
    if (old) clearTimeout(old)
    const t = setTimeout(() => {
      setPrFlash((p) => {
        const n = new Set(p)
        n.delete(setEntryId)
        return n
      })
      prTimers.current.delete(setEntryId)
    }, 2200)
    prTimers.current.set(setEntryId, t)
  }, [])

  const onQuickLogged = useCallback(
    (exerciseId: string, setEntryId: string, rule: Awaited<ReturnType<typeof getCurrentWeekProgressionRules>> | null) =>
      ({ isPR }: { isPR: boolean }) => {
        setSessionSetsByExercise((m) => {
          const n = new Map(m)
          n.set(exerciseId, (n.get(exerciseId) ?? 0) + 1)
          return n
        })
        onSessionSetLogged()
        if (isPR) {
          onClientPR()
          triggerPrFlash(setEntryId)
        }
        const sec = rule?.restSeconds != null && Number.isFinite(rule.restSeconds) ? Math.round(rule.restSeconds) : 60
        setRestTimer({
          setEntryId,
          prescribedSec: sec,
          endMs: Date.now() + sec * 1000,
        })
      },
    [onClientPR, onSessionSetLogged, triggerPrFlash],
  )

  const detailsLoading = historyLoading || rulesLoading

  const doneCount = markedDone.size
  const totalCount = exercises.length
  const currentIndex =
    currentSetEntryId != null ? exercises.findIndex((e) => e.setEntryId === currentSetEntryId) + 1 : 0

  return (
    <div className={styles.sessionCard}>
      <div className={styles.sessionInner}>
        <SessionHead
          clientId={status.clientId}
          clientName={status.clientName || 'Client'}
          workoutSubtitle={subtitle}
          onRemove={onRemoveFromConsole}
        />

        {!loadingWorkout && exercises.length > 0 ? (
          <ProgressStrip doneCount={doneCount} totalCount={totalCount} currentIndex={currentIndex || 1} />
        ) : null}

        {loadingWorkout ? (
          <p style={{ color: 'var(--t3)', fontSize: 13 }}>Loading workout…</p>
        ) : exercises.length === 0 ? (
          <p style={{ color: 'var(--t3)', fontSize: 13 }}>
            {status.status === 'no_program' ? 'No program assigned.' : 'No exercises configured for today.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exercises.map((ex, idx) => {
              const isDone = markedDone.has(ex.setEntryId)
              const isCurrent = !isDone && ex.setEntryId === currentSetEntryId
              const mode: 'done' | 'current' | 'upcoming' = isDone ? 'done' : isCurrent ? 'current' : 'upcoming'
              const rule = rulesByExercise.get(ex.exerciseId) ?? null
              const work = detailsLoading ? null : buildWorkLine(rule)
              const prev = previousByExercise.get(ex.exerciseId)
              const prKeys = prDateKeysByExercise.get(ex.exerciseId)
              const setsHere = sessionSetsByExercise.get(ex.exerciseId) ?? 0
              const rest =
                mode === 'current' && restTimer?.setEntryId === ex.setEntryId
                  ? { prescribedSec: restTimer.prescribedSec, endMs: restTimer.endMs }
                  : null

              const canQuick =
                !!active?.sessionId &&
                !!active.workoutLogId &&
                !!active.workoutAssignmentId &&
                mode === 'current'

              return (
                <ExerciseSession
                  key={ex.setEntryId}
                  exercise={ex}
                  stepNumber={idx + 1}
                  mode={mode}
                  work={work}
                  detailsLoading={detailsLoading}
                  previous={prev}
                  prDateKeys={prKeys}
                  rule={rule}
                  sessionSetsLogged={setsHere}
                  nowMs={globalNowMs}
                  rest={rest}
                  onRestDismiss={() => setRestTimer(null)}
                  showPrBadge={prFlash.has(ex.setEntryId)}
                  cueText={work?.notes?.trim() ? work.notes : null}
                  onStatusClick={() => handleStatusClick(ex.setEntryId)}
                  quickLog={
                    canQuick
                      ? {
                          clientId: status.clientId,
                          sessionId: active.sessionId,
                          workoutLogId: active.workoutLogId,
                          workoutAssignmentId: active.workoutAssignmentId,
                          weightUnit,
                          onLogged: onQuickLogged(ex.exerciseId, ex.setEntryId, rule),
                        }
                      : null
                  }
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

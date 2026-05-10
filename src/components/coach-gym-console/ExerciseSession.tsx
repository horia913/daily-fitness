'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkLineOutput } from '@/app/coach/gym-console/gymConsoleWorkLine'
import { daysAgoText, wasLastSessionPr } from '@/app/coach/gym-console/gymConsoleWorkLine'
import {
  getExercisePreviousPerformance,
  type CurrentWeekRules,
} from '@/lib/clientProgressionService'
import { SetTypePill } from './SetTypePill'
import { RestTimerPill } from './RestTimerPill'
import { QuickLogRow } from './QuickLogRow'
import { PrBadge } from './PrBadge'
import { ExerciseCues } from './ExerciseCues'
import styles from './gymConsoleV1.module.css'

export type ConsoleExercise = {
  setEntryId: string
  exerciseId: string
  name: string
  setType: string
}

type PrevPerf = Awaited<ReturnType<typeof getExercisePreviousPerformance>>

export function ExerciseSession({
  exercise,
  stepNumber,
  mode,
  work,
  detailsLoading,
  previous,
  prDateKeys,
  rule,
  sessionSetsLogged,
  nowMs,
  rest,
  onRestDismiss,
  showPrBadge,
  cueText,
  onStatusClick,
  quickLog,
}: {
  exercise: ConsoleExercise
  stepNumber: number
  mode: 'done' | 'current' | 'upcoming'
  work: WorkLineOutput | null
  detailsLoading: boolean
  previous: PrevPerf | undefined
  prDateKeys: Set<string> | undefined
  rule: CurrentWeekRules | null
  sessionSetsLogged: number
  nowMs: number
  rest: { prescribedSec: number; endMs: number | null } | null
  onRestDismiss: () => void
  showPrBadge: boolean
  cueText: string | null
  onStatusClick: () => void
  quickLog: {
    clientId: string
    sessionId: string
    workoutLogId: string
    workoutAssignmentId: string
    weightUnit: 'kg' | 'lb'
    onLogged: (r: { isPR: boolean }) => void
  } | null
}) {
  const last = previous?.lastWorkout ?? null
  const lastIsPr = wasLastSessionPr(previous, prDateKeys)
  const targetSets = rule?.targetSets ?? null
  const setsLine =
    targetSets != null
      ? `${sessionSetsLogged} / ${targetSets}`
      : `${sessionSetsLogged} logged`
  const setsMeta =
    targetSets != null
      ? `${Math.min(sessionSetsLogged, targetSets)} done · ${Math.max(0, targetSets - sessionSetsLogged)} to go`
      : ''

  const days = last?.date ? daysAgoText(last.date) : ''
  const recent = last?.date && days !== 'unknown date' && (Date.now() - new Date(last.date).getTime()) / 86_400_000 <= 7

  return (
    <div
      className={cn(
        styles.exerciseCard,
        mode === 'done' && styles.exerciseDone,
        mode === 'current' && styles.exerciseCurrent,
        mode === 'upcoming' && styles.exerciseUpcoming,
      )}
    >
      <div className={styles.exHead}>
        <button
          type="button"
          className={cn(
            styles.statusCircle,
            mode === 'current' && styles.statusCurrent,
            mode === 'done' && styles.statusDone,
          )}
          onClick={onStatusClick}
          aria-label={`Exercise status: ${mode}`}
        >
          {mode === 'done' ? (
            <Check size={11} strokeWidth={2.5} aria-hidden />
          ) : mode === 'current' ? (
            <span className={styles.statusInnerPulse} />
          ) : (
            String(stepNumber)
          )}
        </button>
        <span className={cn(styles.exName, mode === 'done' && styles.exNameDone)}>{exercise.name}</span>
        <SetTypePill setType={exercise.setType} />
      </div>

      <div className={styles.prescription}>
        <div className={styles.presLine}>
          <span className={styles.presLab}>Pln</span>
          <span className={styles.presVal}>
            {detailsLoading || !work || work.isEmpty ? (
              <span className={styles.presMeta}>Loading…</span>
            ) : (
              <>
                <span>{work.primary ?? '—'}</span>
                {work.metadata.length > 0 ? (
                  <span className={styles.presMeta}> · {work.metadata.join(' · ')}</span>
                ) : null}
              </>
            )}
          </span>
        </div>
        <div className={styles.presLine}>
          <span className={styles.presLab}>Lst</span>
          <span className={cn(styles.presRowLast, styles.presVal)}>
            {detailsLoading ? (
              <span className={styles.presMeta}>Loading…</span>
            ) : last ? (
              <>
                <span className={recent ? styles.presValGood : undefined}>
                  {last.sets} × {last.reps ?? '—'} @ {last.weight ?? '—'}kg
                </span>
                <span className={styles.presMeta}>{days}</span>
                {lastIsPr ? <span className={styles.presMeta}>· PR session</span> : null}
                {showPrBadge ? <PrBadge /> : null}
              </>
            ) : (
              <span className={styles.neverItalic}>— never performed</span>
            )}
          </span>
        </div>
        {mode === 'current' ? (
          <div className={styles.presLine}>
            <span className={styles.presLab}>Sts</span>
            <span className={cn(styles.presVal, styles.presValCyan)}>{setsLine}</span>
            {setsMeta ? <span className={styles.presMeta}>{setsMeta}</span> : null}
            {rest ? (
              <RestTimerPill
                prescribedSec={rest.prescribedSec}
                endMs={rest.endMs}
                nowMs={nowMs}
                onDismiss={onRestDismiss}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {cueText ? <ExerciseCues text={cueText} /> : null}

      {mode === 'current' && quickLog ? (
        <QuickLogRow
          clientId={quickLog.clientId}
          sessionId={quickLog.sessionId}
          workoutLogId={quickLog.workoutLogId}
          workoutAssignmentId={quickLog.workoutAssignmentId}
          setEntryId={exercise.setEntryId}
          exerciseId={exercise.exerciseId}
          setType={exercise.setType}
          nextSetNumber={sessionSetsLogged + 1}
          weightUnit={quickLog.weightUnit}
          onLogged={(r) => {
            if (r.isPR && typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(30)
            }
            quickLog.onLogged(r)
          }}
        />
      ) : null}
    </div>
  )
}

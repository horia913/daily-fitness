'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { fetchApi } from '@/lib/apiClient'
import { normalizeSetType } from '@/lib/setTypeUtils'
import styles from './gymConsoleV1.module.css'

export function QuickLogRow({
  clientId,
  sessionId,
  workoutLogId,
  workoutAssignmentId,
  setEntryId,
  exerciseId,
  setType,
  nextSetNumber,
  weightUnit,
  onLogged,
}: {
  clientId: string
  sessionId: string
  workoutLogId: string
  workoutAssignmentId: string
  setEntryId: string
  exerciseId: string
  setType: string
  nextSetNumber: number
  weightUnit: 'kg' | 'lb'
  onLogged: (result: { isPR: boolean }) => void
}) {
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const r = Number.parseInt(reps, 10)
    const w = Number.parseFloat(weight)
    if (!Number.isFinite(r) || r <= 0) return
    if (!Number.isFinite(w) || w < 0) return
    setLoading(true)
    try {
      const blockType = normalizeSetType(setType) || 'straight_set'
      const res = await fetchApi('/api/log-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          session_id: sessionId,
          workout_log_id: workoutLogId,
          workout_assignment_id: workoutAssignmentId,
          set_entry_id: setEntryId,
          exercise_id: exerciseId,
          set_type: blockType,
          reps: r,
          weight: w,
          set_number: nextSetNumber,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        console.error('[QuickLogRow] log-set failed', data)
        return
      }
      const isPR = !!data.pr_detected
      onLogged({ isPR })
      setReps('')
      setWeight('')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.quickLog}>
      <span className={styles.setLabel}>Set {nextSetNumber}</span>
      <input
        className={styles.qInput}
        inputMode="numeric"
        placeholder="reps"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        aria-label="Reps"
      />
      <input
        className={styles.qInput}
        inputMode="decimal"
        placeholder={weightUnit}
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        aria-label={`Weight (${weightUnit})`}
      />
      <button type="button" className={styles.logBtn} disabled={loading} onClick={() => void submit()}>
        <Check size={11} strokeWidth={2.5} aria-hidden />
        Log
      </button>
    </div>
  )
}

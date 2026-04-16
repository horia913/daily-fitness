'use client'

import { useState, useEffect, useCallback } from 'react'
import ResponsiveModal from '@/components/ui/ResponsiveModal'
import { Button } from '@/components/ui/button'
import {
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  getWeekReview,
  type WeekReviewData,
  type ExerciseComparisonStatus,
} from '@/lib/weekReviewService'
import { useToast } from '@/components/ui/toast-provider'

export interface WeekReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  programAssignmentId: string
  programId: string
  weekNumber: number
  clientName: string
}

const STATUS_ICON: Record<ExerciseComparisonStatus, React.ReactNode> = {
  on_target: <Check className="w-4 h-4 text-[color:var(--fc-status-success)]" />,
  exceeded: <TrendingUp className="w-4 h-4 text-[color:var(--fc-domain-workouts)]" />,
  under: <TrendingDown className="w-4 h-4 text-[color:var(--fc-status-error)]" />,
  no_data: <Minus className="w-4 h-4 fc-text-dim" />,
}

export function WeekReviewModal({
  isOpen,
  onClose,
  onComplete,
  programAssignmentId,
  programId,
  weekNumber,
  clientName,
}: WeekReviewModalProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reviewData, setReviewData] = useState<WeekReviewData | null>(null)
  const [coachNotes, setCoachNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPerformance, setShowPerformance] = useState(false)
  const { addToast } = useToast()

  const loadReviewData = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    try {
      const data = await getWeekReview(supabase, programAssignmentId, programId, weekNumber)
      setReviewData(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load review data'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [isOpen, programAssignmentId, programId, weekNumber])

  useEffect(() => {
    if (isOpen) {
      setCoachNotes('')
      setShowPerformance(false)
      void loadReviewData()
    }
  }, [isOpen, loadReviewData])

  const handleSaveNote = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/coach/week-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          programAssignmentId,
          weekNumber,
          coachNotes: coachNotes.trim() || undefined,
          performanceSummary: reviewData?.summary || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        addToast({ title: data.error || 'Failed to save note', variant: 'destructive' })
        return
      }

      addToast({ title: 'Week note saved', variant: 'default' })
      onComplete()
      onClose()
    } catch {
      addToast({ title: 'Network error — please try again', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Week review — ${clientName}`}
      maxWidth="3xl"
    >
      <p className="text-xs fc-text-dim -mt-2 mb-4">Week {weekNumber} · optional context below; saves a note for your client.</p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin fc-text-dim" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="w-10 h-10 fc-text-error" />
          <p className="text-sm fc-text-dim">{error}</p>
          <Button onClick={() => void loadReviewData()} className="fc-btn fc-btn-secondary">
            Retry
          </Button>
        </div>
      ) : reviewData ? (
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setShowPerformance((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-2 text-sm fc-text-primary hover:bg-[color:var(--fc-glass-soft)]"
          >
            <span className="font-medium">Week performance (optional)</span>
            {showPerformance ? (
              <ChevronUp className="w-4 h-4 shrink-0 fc-text-dim" />
            ) : (
              <ChevronDown className="w-4 h-4 shrink-0 fc-text-dim" />
            )}
          </button>

          {showPerformance && (
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1 border border-[color:var(--fc-glass-border)] rounded-xl p-3">
              <div className="flex flex-wrap items-center gap-3 text-xs fc-text-dim">
                <span>
                  Completed:{' '}
                  <strong className="fc-text-primary">
                    {reviewData.completedDays}/{reviewData.totalRequiredDays}
                  </strong>
                </span>
                {reviewData.summary.previousWeekVolume != null && (
                  <span>
                    Volume:{' '}
                    <strong className="fc-text-primary">{reviewData.summary.totalVolume.toLocaleString()} kg</strong>
                  </span>
                )}
              </div>
              {reviewData.days.map((day) => (
                <div
                  key={day.scheduleId}
                  className="fc-glass rounded-xl border border-[color:var(--fc-glass-border)] p-3"
                >
                  <h4 className="text-xs font-bold fc-text-primary mb-2">
                    {day.dayLabel}: {day.workoutName}
                  </h4>
                  {day.exercises.length === 0 ? (
                    <p className="text-xs fc-text-dim">No exercise data.</p>
                  ) : (
                    <div className="space-y-1">
                      {day.exercises.map((ex) => (
                        <div key={ex.exerciseId} className="flex items-center justify-between gap-2 text-xs">
                          <span className="fc-text-primary truncate">{ex.exerciseName}</span>
                          <span className="shrink-0">{STATUS_ICON[ex.status]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold fc-text-dim mb-2">
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
              Note for client (optional)
            </label>
            <textarea
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder="e.g. Solid week on squats — keep the same loads next week."
              rows={4}
              className="w-full text-sm fc-glass rounded-xl border border-[color:var(--fc-glass-border)] p-3 fc-text-primary bg-transparent resize-none placeholder:fc-text-dim focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-domain-workouts)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="fc-btn fc-btn-secondary" disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveNote()} disabled={submitting} className="fc-btn fc-btn-primary gap-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save note
            </Button>
          </div>
        </div>
      ) : null}
    </ResponsiveModal>
  )
}

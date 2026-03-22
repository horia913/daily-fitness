'use client'

import { useState, useEffect, useCallback } from 'react'
import ResponsiveModal from '@/components/ui/ResponsiveModal'
import { Button } from '@/components/ui/button'
import {
  ChevronRight,
  ChevronLeft,
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Loader2,
  Sparkles,
  RotateCcw,
  MessageSquare,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  getWeekReview,
  suggestAdjustments,
  type WeekReviewData,
  type SuggestedAdjustment,
  type ExerciseComparisonStatus,
} from '@/lib/weekReviewService'
import { useToast } from '@/components/ui/toast-provider'

interface WeekReviewModalProps {
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

const STATUS_LABEL: Record<ExerciseComparisonStatus, string> = {
  on_target: 'On target',
  exceeded: 'Exceeded',
  under: 'Under',
  no_data: 'No data',
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
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reviewData, setReviewData] = useState<WeekReviewData | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestedAdjustment[]>([])
  const [adjustments, setAdjustments] = useState<Map<string, Record<string, any>>>(new Map())
  const [coachNotes, setCoachNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { addToast } = useToast()

  const loadReviewData = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    try {
      const data = await getWeekReview(supabase, programAssignmentId, programId, weekNumber)
      setReviewData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load review data')
    } finally {
      setLoading(false)
    }
  }, [isOpen, programAssignmentId, programId, weekNumber])

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setCoachNotes('')
      setAdjustments(new Map())
      setSuggestions([])
      loadReviewData()
    }
  }, [isOpen, loadReviewData])

  const handleAutoSuggest = async () => {
    if (!reviewData) return
    try {
      const s = await suggestAdjustments(supabase, programAssignmentId, programId, weekNumber, reviewData)
      setSuggestions(s)
      const newAdj = new Map<string, Record<string, any>>()
      for (const sug of s) {
        if (sug.ruleId && sug.suggestedWeightKg != null) {
          newAdj.set(sug.ruleId, { weight_kg: sug.suggestedWeightKg })
        }
      }
      setAdjustments(newAdj)
    } catch {
      addToast({ title: 'Failed to generate suggestions', variant: 'destructive' })
    }
  }

  const handleSubmit = async (action: 'advance' | 'repeat' | 'adjust_and_advance') => {
    setSubmitting(true)
    try {
      const adjArray = Array.from(adjustments.entries()).map(([ruleId, patch]) => ({ ruleId, patch }))

      const res = await fetch('/api/coach/week-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          programAssignmentId,
          weekNumber,
          action,
          coachNotes: coachNotes.trim() || undefined,
          adjustments: adjArray.length > 0 ? adjArray : undefined,
          performanceSummary: reviewData?.summary || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        addToast({ title: data.error || 'Failed to submit review', variant: 'destructive' })
        return
      }

      const label = action === 'repeat' ? 'Week repeated' : `Advanced to Week ${weekNumber + 1}`
      addToast({ title: label, variant: 'default' })
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
      title={`Week ${weekNumber} Review — ${clientName}`}
      maxWidth="3xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin fc-text-dim" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="w-10 h-10 fc-text-error" />
          <p className="text-sm fc-text-dim">{error}</p>
          <Button onClick={loadReviewData} className="fc-btn fc-btn-secondary">
            Retry
          </Button>
        </div>
      ) : reviewData ? (
        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider fc-text-dim">
            <span className={step === 1 ? 'fc-text-primary' : ''}>1. Performance</span>
            <ChevronRight className="w-3 h-3" />
            <span className={step === 2 ? 'fc-text-primary' : ''}>2. Adjust</span>
            <ChevronRight className="w-3 h-3" />
            <span className={step === 3 ? 'fc-text-primary' : ''}>3. Confirm</span>
          </div>

          {/* Step 1: Performance Review */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 text-sm fc-text-dim">
                <span>
                  Completed: <strong className="fc-text-primary">{reviewData.completedDays}/{reviewData.totalRequiredDays}</strong> workouts
                </span>
                {reviewData.summary.previousWeekVolume != null && (
                  <span>
                    Volume: <strong className="fc-text-primary">{reviewData.summary.totalVolume.toLocaleString()} kg</strong>
                    {' '}
                    ({reviewData.summary.totalVolume >= (reviewData.summary.previousWeekVolume ?? 0)
                      ? <span className="text-[color:var(--fc-status-success)]">+{(reviewData.summary.totalVolume - reviewData.summary.previousWeekVolume).toLocaleString()}</span>
                      : <span className="text-[color:var(--fc-status-error)]">{(reviewData.summary.totalVolume - reviewData.summary.previousWeekVolume).toLocaleString()}</span>
                    } from Week {weekNumber - 1})
                  </span>
                )}
              </div>

              {/* Summary badges */}
              <div className="flex gap-3 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-[color:var(--fc-status-success)]/15 text-[color:var(--fc-status-success)] font-medium">
                  {reviewData.summary.exercisesOnTarget} on target
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[color:var(--fc-domain-workouts)]/15 text-[color:var(--fc-domain-workouts)] font-medium">
                  {reviewData.summary.exercisesExceeded} exceeded
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[color:var(--fc-status-error)]/15 text-[color:var(--fc-status-error)] font-medium">
                  {reviewData.summary.exercisesUnder} under
                </span>
              </div>

              {/* Per-day exercise table */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {reviewData.days.map((day) => (
                  <div key={day.scheduleId} className="fc-glass rounded-xl border border-[color:var(--fc-glass-border)] p-4">
                    <h4 className="text-sm font-bold fc-text-primary mb-3">{day.dayLabel}: {day.workoutName}</h4>
                    {day.exercises.length === 0 ? (
                      <p className="text-xs fc-text-dim">No exercise data for this day.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-xs font-semibold fc-text-dim pb-1 border-b border-[color:var(--fc-glass-border)]">
                          <span>Exercise</span>
                          <span className="text-right w-24">Prescribed</span>
                          <span className="text-right w-24">Actual</span>
                          <span className="w-8" />
                        </div>
                        {day.exercises.map((ex) => (
                          <div key={ex.exerciseId} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center text-sm py-1">
                            <span className="fc-text-primary font-medium truncate">{ex.exerciseName}</span>
                            <span className="text-right w-24 fc-text-dim font-mono text-xs">
                              {ex.prescribed.sets ?? '—'}×{ex.prescribed.reps ?? '—'}
                              {ex.prescribed.weightKg != null ? ` @${ex.prescribed.weightKg}kg` : ''}
                            </span>
                            <span className="text-right w-24 fc-text-primary font-mono text-xs">
                              {ex.actual.setsCompleted}×{ex.actual.avgReps}
                              {ex.actual.avgWeight > 0 ? ` @${ex.actual.avgWeight}kg` : ''}
                            </span>
                            <span className="w-8 flex justify-center">{STATUS_ICON[ex.status]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} className="fc-btn fc-btn-primary gap-1">
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Adjust Next Week */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm fc-text-dim">
                Optionally adjust Week {weekNumber + 1} parameters before advancing. Changes apply to the client&apos;s personalized progression rules.
              </p>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="fc-btn fc-btn-secondary gap-1 text-xs"
                  onClick={handleAutoSuggest}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Auto-suggest
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="fc-btn fc-btn-secondary gap-1 text-xs"
                  onClick={() => { setSuggestions([]); setAdjustments(new Map()) }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Keep defaults
                </Button>
              </div>

              {suggestions.length > 0 ? (
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {suggestions.map((s) => (
                    <div key={s.exerciseId} className="fc-glass rounded-lg border border-[color:var(--fc-glass-border)] p-3 text-sm">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium fc-text-primary">{s.exerciseName}</span>
                        <span className="text-xs fc-text-dim">{s.reason}</span>
                      </div>
                      <div className="flex gap-4 text-xs fc-text-dim">
                        <span>Sets: {s.currentSets ?? '—'} → {s.suggestedSets ?? '—'}</span>
                        <span>Reps: {s.currentReps ?? '—'} → {s.suggestedReps ?? '—'}</span>
                        <span>
                          Weight: {s.currentWeightKg ?? '—'} →{' '}
                          <strong className="fc-text-primary">{s.suggestedWeightKg ?? '—'} kg</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center fc-text-dim text-sm">
                  No adjustments. Click &ldquo;Auto-suggest&rdquo; or proceed to confirm.
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="fc-btn fc-btn-secondary gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={() => setStep(3)} className="fc-btn fc-btn-primary gap-1">
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold fc-text-dim mb-2">
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                  Coach notes for client (optional)
                </label>
                <textarea
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  placeholder="Great week! Bumped your squat since you exceeded the target..."
                  rows={3}
                  className="w-full text-sm fc-glass rounded-xl border border-[color:var(--fc-glass-border)] p-3 fc-text-primary bg-transparent resize-none placeholder:fc-text-dim focus:outline-none focus:ring-1 focus:ring-[color:var(--fc-domain-workouts)]"
                />
              </div>

              <div className="rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] p-4 text-sm fc-text-dim">
                <p className="font-semibold fc-text-primary mb-2">Review summary</p>
                <p>Week {weekNumber}: {reviewData.completedDays}/{reviewData.totalRequiredDays} workouts completed</p>
                <p>
                  Performance: {reviewData.summary.exercisesOnTarget} on target,{' '}
                  {reviewData.summary.exercisesExceeded} exceeded,{' '}
                  {reviewData.summary.exercisesUnder} under
                </p>
                {adjustments.size > 0 && (
                  <p className="text-[color:var(--fc-domain-workouts)]">{adjustments.size} adjustment(s) for Week {weekNumber + 1}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="fc-btn fc-btn-secondary gap-1"
                  disabled={submitting}
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={() => handleSubmit('repeat')}
                  disabled={submitting}
                  className="fc-btn fc-btn-secondary"
                >
                  Repeat Week {weekNumber}
                </Button>
                <Button
                  onClick={() => handleSubmit(adjustments.size > 0 ? 'adjust_and_advance' : 'advance')}
                  disabled={submitting}
                  className="fc-btn fc-btn-primary gap-1"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Advance to Week {weekNumber + 1}</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </ResponsiveModal>
  )
}

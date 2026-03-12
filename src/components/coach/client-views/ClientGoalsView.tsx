'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, Calendar, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast-provider'
import type { Pillar } from '@/components/goals/AddGoalModal'

const PILLAR_LABELS: Record<string, string> = {
  training: 'Training',
  nutrition: 'Nutrition',
  lifestyle: 'Lifestyle',
  checkins: 'Check-ins',
  general: 'General',
}

const GOAL_TYPE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  training: [
    { value: 'strength', label: 'Strength' },
    { value: 'endurance', label: 'Endurance' },
    { value: 'mobility', label: 'Mobility' },
    { value: 'performance', label: 'Performance' },
  ],
  nutrition: [
    { value: 'calorie', label: 'Calorie' },
    { value: 'protein', label: 'Protein' },
    { value: 'water', label: 'Water' },
    { value: 'macro', label: 'Macros' },
  ],
  lifestyle: [
    { value: 'habit', label: 'Habit' },
    { value: 'sleep', label: 'Sleep' },
    { value: 'activity', label: 'Activity' },
  ],
  checkins: [
    { value: 'body_composition', label: 'Body Composition' },
    { value: 'weight', label: 'Weight' },
    { value: 'measurements', label: 'Measurements' },
  ],
  general: [
    { value: 'other', label: 'Other' },
    { value: 'custom', label: 'Custom' },
  ],
}

interface GoalRow {
  id: string
  client_id: string
  coach_id: string | null
  title: string
  description: string | null
  category: string
  pillar: string
  goal_type: string | null
  target_value: number | null
  target_date: string | null
  current_value: number | null
  status: string
  priority: string
  start_date: string
  completed_date: string | null
  progress_percentage: number | null
  target_unit: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface ClientGoalsViewProps {
  clientId: string
}

export default function ClientGoalsView({ clientId }: ClientGoalsViewProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGoals((data as GoalRow[]) ?? [])
    } catch (err) {
      console.error('Error loading goals:', err)
      addToast({ title: 'Failed to load goals', variant: 'destructive' })
      setGoals([])
    } finally {
      setLoading(false)
    }
  }, [clientId, addToast])

  useEffect(() => {
    loadGoals()
  }, [loadGoals])

  const activeGoals = goals.filter((g) => g.status === 'active')
  const completedGoals = goals.filter((g) => g.status === 'completed')
  const achievedCount = completedGoals.length
  const avgProgress =
    activeGoals.length > 0
      ? Math.round(
          activeGoals.reduce((sum, g) => {
            const pct = g.progress_percentage ?? (g.target_value != null && g.target_value !== 0 && g.current_value != null
              ? (Number(g.current_value) / Number(g.target_value)) * 100
              : 0)
            return sum + pct
          }, 0) / activeGoals.length
        )
      : null

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-8 text-center fc-text-dim">
          Loading goals…
        </div>
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div className="space-y-6">
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-8 text-center">
          <Target className="w-12 h-12 mx-auto mb-4 fc-text-subtle" />
          <h3 className="text-lg font-semibold fc-text-primary mb-2">No goals set for this client</h3>
          <p className="text-sm fc-text-dim mb-6">Create a goal to track progress together.</p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="fc-btn fc-btn-primary gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Goal
          </Button>
        </div>
        {showCreateModal && (
          <CoachCreateGoalModal
            clientId={clientId}
            coachId={user?.id ?? ''}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false)
              loadGoals()
            }}
          />
        )}
      </div>
    )
  }

  const displayGoals = [...activeGoals, ...completedGoals]

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-workouts">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">Goals</span>
                <h3 className="text-lg font-semibold fc-text-primary mt-2">Progress Snapshot</h3>
                <p className="text-sm fc-text-dim">Current targets and progress momentum</p>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="outline"
              size="sm"
              className="gap-2 fc-btn fc-btn-secondary"
            >
              <Plus className="w-4 h-4" />
              Create Goal
            </Button>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
              <p className="text-3xl font-bold fc-text-primary">{activeGoals.length}</p>
              <p className="text-sm fc-text-dim">Active Goals</p>
            </div>
            <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
              <p className="text-3xl font-bold fc-text-primary">{achievedCount}</p>
              <p className="text-sm fc-text-dim">Achieved</p>
            </div>
            <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
              <p className="text-3xl font-bold fc-text-primary">
                {avgProgress != null ? `${avgProgress}%` : '—'}
              </p>
              <p className="text-sm fc-text-dim">Avg Progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">Goal Timeline</span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                {activeGoals.length ? 'Active' : 'Completed'} Goals
              </h3>
            </div>
            <span className="ml-auto fc-pill fc-pill-glass fc-text-workouts text-xs">
              {goals.length}
            </span>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {displayGoals.map((goal) => {
            const targetVal = goal.target_value != null ? Number(goal.target_value) : null
            const currentVal = goal.current_value != null ? Number(goal.current_value) : null
            const progress =
              goal.progress_percentage != null
                ? Number(goal.progress_percentage)
                : targetVal != null && targetVal !== 0 && currentVal != null
                  ? Math.round((currentVal / targetVal) * 100)
                  : 0
            const unit = goal.target_unit ?? ''

            return (
              <div
                key={goal.id}
                className="fc-glass rounded-2xl border border-[color:var(--fc-glass-border)] p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="fc-icon-tile fc-icon-workouts">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="fc-text-primary mb-1 text-lg font-semibold">{goal.title}</h4>
                        <div className="flex flex-wrap gap-2">
                          <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                            {PILLAR_LABELS[goal.pillar] ?? goal.pillar}
                          </span>
                          <span
                            className={`fc-pill fc-pill-glass text-xs ${
                              goal.status === 'completed'
                                ? 'fc-text-success'
                                : goal.status === 'paused'
                                  ? 'fc-text-subtle'
                                  : 'fc-text-warning'
                            }`}
                          >
                            {goal.status}
                          </span>
                        </div>
                      </div>
                      {goal.target_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 fc-text-subtle" />
                          <span className="text-sm fc-text-subtle">
                            {new Date(goal.target_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {(targetVal != null || goal.status === 'active') && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="fc-text-subtle">
                            {currentVal != null ? currentVal : '—'} / {targetVal != null ? targetVal : '—'} {unit}
                          </span>
                          <span className="font-semibold fc-text-workouts">
                            {Math.min(100, Math.max(0, progress))}%
                          </span>
                        </div>
                        <div className="fc-progress-track h-3 rounded-full overflow-hidden">
                          <div
                            className="fc-progress-fill h-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {goal.created_at && (
                      <p className="text-xs fc-text-subtle mt-2">
                        Created {new Date(goal.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showCreateModal && (
        <CoachCreateGoalModal
          clientId={clientId}
          coachId={user?.id ?? ''}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadGoals()
          }}
        />
      )}
    </div>
  )
}

interface CoachCreateGoalModalProps {
  clientId: string
  coachId: string
  onClose: () => void
  onSuccess: () => void
}

function CoachCreateGoalModal({ clientId, coachId, onClose, onSuccess }: CoachCreateGoalModalProps) {
  const { addToast } = useToast()
  const [title, setTitle] = useState('')
  const [pillar, setPillar] = useState<Pillar>('general')
  const [targetValue, setTargetValue] = useState('')
  const [targetUnit, setTargetUnit] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [goalType, setGoalType] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coachId || !title || !targetValue) return

    setIsSubmitting(true)
    try {
      const parsed = parseFloat(targetValue)
      if (isNaN(parsed)) {
        addToast({ title: 'Please enter a valid number for target.', variant: 'destructive' })
        return
      }

      const { error } = await supabase.from('goals').insert({
        client_id: clientId,
        coach_id: coachId,
        title,
        pillar,
        target_value: parsed,
        target_unit: targetUnit || 'units',
        target_date: targetDate || null,
        goal_type: goalType || null,
        current_value: 0,
        status: 'active',
        priority: 'medium',
        start_date: new Date().toISOString().split('T')[0],
        progress_percentage: 0,
        category: 'other',
      })

      if (error) throw error

      addToast({ title: 'Goal created', variant: 'default' })
      setTitle('')
      setTargetValue('')
      setTargetUnit('')
      setTargetDate('')
      setGoalType('')
      onSuccess()
    } catch (error) {
      console.error('Error creating goal:', error)
      addToast({
        title: error instanceof Error ? error.message : 'Failed to create goal. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md mt-8 mb-8 fc-modal fc-card p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold fc-text-primary">Create Goal for Client</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 fc-press">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium fc-text-subtle block mb-2">Goal Title *</label>
            <input
              type="text"
              placeholder="e.g., Run 5K, Hit 150g protein daily"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium fc-text-subtle block mb-2">Pillar</label>
            <select
              value={pillar}
              onChange={(e) => setPillar(e.target.value as Pillar)}
              className="w-full px-3 py-2 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary"
            >
              {(Object.keys(PILLAR_LABELS) as Pillar[]).map((p) => (
                <option key={p} value={p}>
                  {PILLAR_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium fc-text-subtle block mb-2">Target *</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                required
                min={0}
                step="0.01"
                className="flex-1 px-3 py-2 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary"
              />
              <input
                type="text"
                placeholder="Unit (kg, reps, min)"
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary"
              />
            </div>
          </div>

          {GOAL_TYPE_OPTIONS[pillar]?.length > 0 && (
            <div>
              <label className="text-sm font-medium fc-text-subtle block mb-2">Goal Type (optional)</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary"
              >
                <option value="">—</option>
                {GOAL_TYPE_OPTIONS[pillar].map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium fc-text-subtle block mb-2">Deadline (optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !title || !targetValue}
              className="flex-1 fc-btn fc-btn-primary"
            >
              {isSubmitting ? 'Creating…' : 'Create Goal'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 fc-btn fc-btn-secondary">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Apple,
  CheckCircle2,
  Dumbbell,
  Hand,
  Moon,
  Scale,
  Target,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast-provider'
import { useCoachClient } from '@/contexts/CoachClientContext'
import GoalCard, { type GoalCardPillar } from '@/components/coach/client-detail/GoalCard'
import EmptyStateBlock from '@/components/coach/client-detail/EmptyStateBlock'
import sec from '@/components/coach/client-detail/coachClientDetailUi.module.css'

type GoalStatusFilter = 'all' | 'active' | 'completed' | 'paused'

type GoalCategory =
  | 'body_composition'
  | 'performance'
  | 'outcome'
  | 'nutrition'
  | 'weight_loss'
  | 'muscle_gain'
  | 'strength'
  | 'endurance'
  | 'mobility'
  | 'other'

type SourceType =
  | 'body_metric'
  | 'personal_record'
  | 'workout_count'
  | 'wellness_field'
  | 'meal_plan'
  | 'manual'

type CoachGoalRow = {
  id: string
  title: string
  category: GoalCategory
  status: string
  priority: string | null
  current_value: number | null
  target_value: number | null
  target_unit: string | null
  target_date: string | null
  completed_date: string | null
  progress_percentage: number | null
  notes: string | null
  created_at: string
  updated_at: string
  goal_source_links:
    | { source_type: SourceType; source_config?: Record<string, unknown> }
    | { source_type: SourceType; source_config?: Record<string, unknown> }[]
    | null
}

type PillarId = 'training' | 'nutrition' | 'body' | 'lifestyle'

const PILLARS: { id: PillarId; label: string; emptyText: string }[] = [
  { id: 'training', label: 'Training', emptyText: 'No training goals set.' },
  { id: 'nutrition', label: 'Nutrition', emptyText: 'No nutrition goals set.' },
  { id: 'body', label: 'Body', emptyText: 'No body goals set.' },
  { id: 'lifestyle', label: 'Lifestyle', emptyText: 'No lifestyle goals set.' },
]

function unwrapSourceType(goal: CoachGoalRow): SourceType | 'manual' {
  const raw = goal.goal_source_links
  if (!raw) return 'manual'
  const row = Array.isArray(raw) ? raw[0] : raw
  return row?.source_type ?? 'manual'
}

function unwrapSourceConfig(goal: CoachGoalRow): Record<string, unknown> | null {
  const raw = goal.goal_source_links
  if (!raw) return null
  const row = Array.isArray(raw) ? raw[0] : raw
  const c = row?.source_config
  return c && typeof c === 'object' ? (c as Record<string, unknown>) : null
}

function sourcePresentation(
  sourceType: SourceType | 'manual',
  sourceConfig?: Record<string, unknown> | null
) {
  if (sourceType === 'body_metric') {
    return { Icon: Scale, label: 'Auto-tracked from body metrics' }
  }
  if (sourceType === 'personal_record') {
    return { Icon: Dumbbell, label: 'Auto-tracked from PRs' }
  }
  if (sourceType === 'workout_count') {
    return { Icon: CheckCircle2, label: 'Auto-tracked from workouts' }
  }
  if (sourceType === 'wellness_field') {
    return { Icon: Moon, label: 'Auto-tracking activates soon' }
  }
  if (sourceType === 'meal_plan') {
    const tracking = sourceConfig && typeof sourceConfig.tracking === 'string' ? sourceConfig.tracking : null
    if (tracking === 'daily_macro') {
      const macro = sourceConfig && typeof sourceConfig.macro === 'string' ? sourceConfig.macro : ''
      const label =
        macro === 'protein_g'
          ? 'Linked to daily protein (sync pending)'
          : macro === 'water_l'
            ? 'Linked to daily water (sync pending)'
            : 'Linked to daily calories (sync pending)'
      return { Icon: Apple, label }
    }
    return { Icon: Apple, label: 'Linked to meal plan adherence (sync pending)' }
  }
  return { Icon: Hand, label: 'Updated manually by client' }
}

function normalizeCategory(
  category: GoalCategory
): 'performance' | 'nutrition' | 'body_composition' | 'outcome' {
  const raw = category as string
  if (raw === 'behavioral') return 'outcome'
  if (category === 'strength' || category === 'endurance' || category === 'mobility') {
    return 'performance'
  }
  if (category === 'weight_loss' || category === 'muscle_gain') {
    return 'body_composition'
  }
  if (category === 'other') {
    return 'outcome'
  }
  return category as 'performance' | 'nutrition' | 'body_composition' | 'outcome'
}

function pillarForCategory(category: GoalCategory): PillarId {
  const normalized = normalizeCategory(category)
  if (normalized === 'performance') return 'training'
  if (normalized === 'nutrition') return 'nutrition'
  if (normalized === 'body_composition') return 'body'
  return 'lifestyle'
}

function categoryLabel(category: GoalCategory): string {
  const normalized = normalizeCategory(category)
  if (normalized === 'body_composition') return 'Body composition'
  if (normalized === 'performance') return 'Performance'
  if (normalized === 'outcome') return 'Outcome'
  return 'Nutrition'
}

function priorityClass(priority: string | null): string {
  if (priority === 'high') return 'text-red-600 bg-red-50 border-red-200'
  if (priority === 'medium') return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-emerald-700 bg-emerald-50 border-emerald-200'
}

function statusClass(status: string): string {
  if (status === 'completed') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (status === 'paused') return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-blue-700 bg-blue-50 border-blue-200'
}

function statusLabel(status: string): string {
  if (status === 'active') return 'Active'
  if (status === 'completed') return 'Completed'
  if (status === 'paused') return 'Paused'
  return status
}

function formatNumber(value: number | null): string {
  if (value == null) return '—'
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

function deadlineCopy(goal: CoachGoalRow): { text: string; className: string } | null {
  if (!goal.target_date) return null
  const target = new Date(goal.target_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((target.getTime() - today.getTime()) / 86400000)
  const labelDate = target.toLocaleDateString()

  if (goal.status === 'completed' && goal.completed_date) {
    const completed = new Date(goal.completed_date)
    completed.setHours(0, 0, 0, 0)
    if (completed.getTime() <= target.getTime()) {
      return {
        text: `Deadline: ${labelDate} (completed on time)`,
        className: 'text-emerald-600',
      }
    }
  }

  if (daysLeft < 0) {
    return {
      text: `Deadline: ${labelDate} (${Math.abs(daysLeft)} days overdue)`,
      className: 'text-red-600',
    }
  }

  return {
    text: `Deadline: ${labelDate} (${daysLeft} days left)`,
    className: 'fc-text-dim',
  }
}

interface ClientGoalsViewProps {
  clientId: string
  layoutVariant?: 'default' | 'coachV6'
}

function pillarToCardPillar(id: PillarId): GoalCardPillar {
  return id
}

export default function ClientGoalsView({
  clientId,
  layoutVariant = 'default',
}: ClientGoalsViewProps) {
  const { addToast } = useToast()
  const { clientName } = useCoachClient()
  const [goals, setGoals] = useState<CoachGoalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>('active')

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('goals')
        .select(
          'id,title,category,status,priority,current_value,target_value,target_unit,target_date,completed_date,progress_percentage,notes,created_at,updated_at,goal_source_links(source_type,source_config)'
        )
        .eq('client_id', clientId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setGoals((data as CoachGoalRow[]) ?? [])
    } catch (err) {
      console.error('[ClientGoalsView] load goals failed:', err)
      addToast({ title: 'Failed to load goals', variant: 'destructive' })
      setGoals([])
    } finally {
      setLoading(false)
    }
  }, [clientId, statusFilter, addToast])

  useEffect(() => {
    void loadGoals()
  }, [loadGoals])

  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === 'active'),
    [goals]
  )
  const averageProgress = useMemo(() => {
    if (activeGoals.length === 0) return 0
    const total = activeGoals.reduce(
      (sum, g) => sum + (g.progress_percentage ?? 0),
      0
    )
    return Math.round(total / activeGoals.length)
  }, [activeGoals])

  const goalsByPillar = useMemo(() => {
    const grouped: Record<PillarId, CoachGoalRow[]> = {
      training: [],
      nutrition: [],
      body: [],
      lifestyle: [],
    }
    for (const goal of goals) {
      grouped[pillarForCategory(goal.category)].push(goal)
    }
    return grouped
  }, [goals])

  const latestSync = useMemo(() => {
    if (goals.length === 0) return null
    const latest = goals.reduce((acc, g) =>
      new Date(g.updated_at).getTime() > new Date(acc.updated_at).getTime() ? g : acc
    )
    return new Date(latest.updated_at)
  }, [goals])

  const showNoGoalsAtAll = goals.length === 0 && statusFilter === 'all'
  const showNoFilteredResults = goals.length === 0 && statusFilter !== 'all'

  if (loading) {
    return (
      <div
        className={
          layoutVariant === 'coachV6'
            ? `${sec.section} animate-pulse h-24`
            : 'fc-card-shell p-8 text-center fc-text-dim'
        }
      >
        {layoutVariant === 'coachV6' ? '' : 'Loading goals...'}
      </div>
    )
  }

  if (layoutVariant === 'coachV6') {
    return (
      <div className="space-y-3">
        <section className={sec.section}>
          <div className={sec.sectionHead}>
            <div>
              <span className={sec.eyebrow}>Client goals</span>
              <h2 className={sec.sectionTitle}>
                {activeGoals.length} active goals · avg {averageProgress}%
              </h2>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as GoalStatusFilter)}
              className="w-full sm:w-48 rounded-[11px] border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] px-3 py-2 text-sm fc-text-primary"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="all">All</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </section>

        {showNoGoalsAtAll && (
          <EmptyStateBlock
            icon={Target}
            title="No goals set yet"
            description={`${clientName || 'This client'} has not added any goals.`}
          />
        )}

        {showNoFilteredResults && (
          <EmptyStateBlock
            icon={Target}
            title="No goals in this filter"
            description="Switch to All to see every goal."
          />
        )}

        {PILLARS.map((pillar) => {
          const items = goalsByPillar[pillar.id]
          if (items.length === 0) return null
          return (
            <section key={pillar.id} className={sec.section}>
              <div className="flex items-center justify-between px-0.5">
                <span
                  style={{
                    fontFamily: 'var(--font-geist-mono, monospace)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--fc-text-subtle)',
                  }}
                >
                  {pillar.label}
                </span>
                <span
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '2px 7px',
                    borderRadius: 999,
                    fontSize: 11,
                    color: 'var(--fc-text-secondary)',
                  }}
                >
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((goal) => {
                  const progress = Math.max(
                    0,
                    Math.min(100, Math.round(goal.progress_percentage ?? 0))
                  )
                  const sourceType = unwrapSourceType(goal)
                  const source = sourcePresentation(sourceType, unwrapSourceConfig(goal))
                  const unit = goal.target_unit ?? ''
                  const deadline = deadlineCopy(goal)
                  const currentStr =
                    goal.current_value != null
                      ? `${formatNumber(goal.current_value)}${unit}`
                      : '—'
                  const targetStr =
                    goal.target_value != null ? `${formatNumber(goal.target_value)}${unit}` : null
                  const foot =
                    deadline != null
                      ? `${source.label} · ${deadline.text.replace(/^Deadline:?\s*/i, '')}`
                      : source.label
                  const pri = (goal.priority ?? 'low').charAt(0).toUpperCase() + (goal.priority ?? 'low').slice(1)
                  return (
                    <GoalCard
                      key={goal.id}
                      pillar={pillarToCardPillar(pillar.id)}
                      title={goal.title}
                      categoryLabel={categoryLabel(goal.category)}
                      statusLabel={statusLabel(goal.status)}
                      priorityLabel={pri}
                      progressPct={progress}
                      currentDisplay={currentStr}
                      targetDisplay={targetStr}
                      footIcon={source.Icon}
                      footText={foot}
                    />
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[color:var(--fc-glass-border)] p-4 fc-glass-soft">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider fc-text-subtle">Client goals</p>
            <h3 className="text-lg font-semibold fc-text-primary">
              {clientName || 'Client'} · {activeGoals.length} active goals
            </h3>
            <p className="text-sm fc-text-dim">Average progress: {averageProgress}%</p>
          </div>

          <div className="w-full sm:w-48">
            <label className="block text-xs uppercase tracking-wider fc-text-subtle mb-1">
              Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as GoalStatusFilter)}
              className="w-full rounded-lg border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface)] px-3 py-2 text-sm fc-text-primary"
            >
              <option value="all">All goals</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </div>
      </section>

      {showNoGoalsAtAll && (
        <section className="rounded-xl border border-[color:var(--fc-glass-border)] p-6 text-center">
          <Target className="w-8 h-8 mx-auto mb-2 fc-text-dim" />
          <p className="text-sm fc-text-primary">No goals set yet.</p>
          <p className="text-sm fc-text-dim">
            {clientName || 'This client'} hasn&apos;t set any goals.
          </p>
        </section>
      )}

      {showNoFilteredResults && (
        <section className="rounded-xl border border-[color:var(--fc-glass-border)] p-6 text-center">
          <p className="text-sm fc-text-primary">
            {statusFilter === 'completed'
              ? 'No completed goals yet.'
              : statusFilter === 'paused'
                ? 'No paused goals.'
                : 'No active goals.'}
          </p>
        </section>
      )}

      {PILLARS.map((pillar) => {
        const items = goalsByPillar[pillar.id]
        return (
          <section
            key={pillar.id}
            className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider fc-text-primary">
                {pillar.label}
              </h4>
              <span className="text-xs fc-text-dim">{items.length}</span>
            </div>

            {items.length === 0 ? (
              <p className="text-sm fc-text-dim py-2">{pillar.emptyText}</p>
            ) : (
              <div className="space-y-3">
                {items.map((goal) => {
                  const progress = Math.max(
                    0,
                    Math.min(100, Math.round(goal.progress_percentage ?? 0))
                  )
                  const sourceType = unwrapSourceType(goal)
                  const source = sourcePresentation(sourceType, unwrapSourceConfig(goal))
                  const unit = goal.target_unit ?? ''
                  const deadline = deadlineCopy(goal)

                  return (
                    <article
                      key={goal.id}
                      className="rounded-lg border border-[color:var(--fc-glass-border)] p-3 bg-[color:var(--fc-glass-highlight)]"
                    >
                      <h5 className="text-base font-semibold fc-text-primary mb-2">{goal.title}</h5>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2 py-1 rounded-full border text-xs fc-text-subtle border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface)]">
                          {categoryLabel(goal.category)}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full border text-xs ${statusClass(goal.status)}`}
                        >
                          {statusLabel(goal.status)}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full border text-xs ${priorityClass(goal.priority)}`}
                        >
                          {(goal.priority ?? 'low').charAt(0).toUpperCase() + (goal.priority ?? 'low').slice(1)}
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-[color:var(--fc-glass-border)] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="mt-2 text-sm fc-text-dim">
                        {goal.current_value != null && goal.target_value != null ? (
                          <span>
                            {formatNumber(goal.current_value)}
                            {unit} / {formatNumber(goal.target_value)}
                            {unit}
                          </span>
                        ) : goal.current_value != null ? (
                          <span>
                            Current: {formatNumber(goal.current_value)}
                            {unit}
                          </span>
                        ) : (
                          <span className="italic">No targets set</span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs fc-text-dim">
                        <source.Icon className="w-4 h-4" />
                        <span>{source.label}</span>
                      </div>

                      {deadline ? (
                        <p className={`text-xs mt-2 ${deadline.className}`}>{deadline.text}</p>
                      ) : null}

                      {goal.notes ? (
                        <p className="text-xs mt-2 italic fc-text-dim">{goal.notes}</p>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      <p className="text-xs fc-text-dim">
        Last auto-sync:{' '}
        {latestSync ? latestSync.toLocaleString() : 'No sync data yet'}
      </p>
    </div>
  )
}

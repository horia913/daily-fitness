'use client'

/**
 * Coach goals hub — read-only view of client self-managed goals.
 * Coaches do not create/edit goals (those writes were schema-broken).
 */

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { withTimeout } from '@/lib/withTimeout'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { useTheme } from '@/contexts/ThemeContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Target,
  Users,
  Search,
  CheckCircle,
  Clock,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { EmptyState } from '@/components/ui/EmptyState'

interface GoalRow {
  id: string
  client_id: string
  title: string
  description: string | null
  category: string | null
  pillar: string | null
  target_value: number | null
  current_value: number | null
  target_unit: string | null
  target_date: string | null
  status: string | null
  progress_percentage: number | null
  created_at: string
  client?: {
    first_name: string | null
    last_name: string | null
    avatar_url?: string | null
  }
}

function calculateProgress(current: number | null, target: number | null): number {
  if (current == null || target == null || target === 0) return 0
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)))
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-[color-mix(in_srgb,var(--fc-status-success)_18%,transparent)] text-[color:var(--fc-status-success)] border-0">
          Completed
        </Badge>
      )
    case 'paused':
      return (
        <Badge className="bg-[color-mix(in_srgb,var(--fc-status-warning)_18%,transparent)] text-[color:var(--fc-status-warning)] border-0">
          Paused
        </Badge>
      )
    default:
      return (
        <Badge className="bg-[color-mix(in_srgb,var(--fc-status-info)_18%,transparent)] text-[color:var(--fc-status-info)] border-0">
          Active
        </Badge>
      )
  }
}

function CoachGoalsContent() {
  const { performanceSettings } = useTheme()

  const [goals, setGoals] = useState<GoalRow[]>([])
  const [clientCount, setClientCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const loadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      setLoading(true)
      await withTimeout(
        (async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) return

          const { data: clientsData, error: clientsError } = await supabase
            .from('clients')
            .select('client_id')
            .eq('coach_id', user.id)
            .eq('status', 'active')

          if (clientsError || !clientsData?.length) {
            setGoals([])
            setClientCount(0)
            return
          }

          const clientIds = clientsData.map((c) => c.client_id)
          setClientCount(clientIds.length)

          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url')
            .in('id', clientIds)

          const { data: goalsData, error: goalsError } = await supabase
            .from('goals')
            .select(
              'id, client_id, title, description, category, pillar, target_value, current_value, target_unit, target_date, status, progress_percentage, created_at',
            )
            .in('client_id', clientIds)
            .order('created_at', { ascending: false })

          if (goalsError || !goalsData) {
            setGoals([])
            return
          }

          setGoals(
            goalsData.map((goal) => ({
              ...goal,
              client: profilesData?.find((p) => p.id === goal.client_id),
            })),
          )
        })(),
        45000,
        'loadData',
      )
    } catch (error) {
      console.error('Error loading goals:', error)
      setGoals([])
      setClientCount(0)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [])

  const goalsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (goalsTimeoutRef.current) clearTimeout(goalsTimeoutRef.current)
    goalsTimeoutRef.current = setTimeout(() => {
      goalsTimeoutRef.current = null
      setLoading(false)
    }, 20_000)
    loadData().finally(() => {
      if (goalsTimeoutRef.current) {
        clearTimeout(goalsTimeoutRef.current)
        goalsTimeoutRef.current = null
      }
    })
    return () => {
      if (goalsTimeoutRef.current) {
        clearTimeout(goalsTimeoutRef.current)
        goalsTimeoutRef.current = null
      }
    }
  }, [loadData])

  const filteredGoals = goals.filter((goal) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      !q ||
      goal.title.toLowerCase().includes(q) ||
      goal.client?.first_name?.toLowerCase().includes(q) ||
      goal.client?.last_name?.toLowerCase().includes(q)

    const normalized =
      goal.status === 'in_progress' ? 'active' : (goal.status ?? 'active')
    const matchesStatus = filterStatus === 'all' || normalized === filterStatus

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          <CoachPageShell
            widthVariant="data-7xl"
            className="p-4 pb-[var(--fc-bottom-safe-area)] sm:p-6"
          >
            <PageSkeleton variant="dashboard" />
          </CoachPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell
          widthVariant="data-7xl"
          className="p-4 pb-[var(--fc-bottom-safe-area)] sm:p-6"
        >
          <div className="space-y-6">
            <GlassCard elevation={2} className="fc-card-shell p-6 md:p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)]">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                    Client Goals
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                    Read-only view — clients manage their own goals.
                  </p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--fc-text-subtle)]" />
                  <Input
                    placeholder="Search goals or clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="fc-input h-12 w-full pl-12"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="fc-select h-12 w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="fc-ghost" onClick={() => void loadData()}>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Refresh
                </Button>
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <GlassCard elevation={1} className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--fc-accent)_18%,transparent)] text-[color:var(--fc-accent)]">
                    <Target className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold fc-text-primary leading-tight">
                      {goals.length}
                    </p>
                    <p className="text-sm font-normal fc-text-dim">Total Goals</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard elevation={1} className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--fc-status-info)_18%,transparent)] text-[color:var(--fc-status-info)]">
                    <Clock className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold fc-text-primary leading-tight">
                      {
                        goals.filter(
                          (g) =>
                            g.status === 'active' || g.status === 'in_progress',
                        ).length
                      }
                    </p>
                    <p className="text-sm font-normal fc-text-dim">Active</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard elevation={1} className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--fc-status-success)_18%,transparent)] text-[color:var(--fc-status-success)]">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold fc-text-primary leading-tight">
                      {goals.filter((g) => g.status === 'completed').length}
                    </p>
                    <p className="text-sm font-normal fc-text-dim">Completed</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard elevation={1} className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--fc-accent-secondary,var(--fc-accent))_18%,transparent)] text-[color:var(--fc-accent-secondary,var(--fc-accent))]">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold fc-text-primary leading-tight">
                      {clientCount}
                    </p>
                    <p className="text-sm font-normal fc-text-dim">
                      Active Clients
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold fc-text-primary flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--fc-accent)_18%,transparent)] text-[color:var(--fc-accent)]">
                  <Target className="w-5 h-5" />
                </div>
                Client Goals
              </h2>
              {filteredGoals.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="No goals yet"
                  description="When clients set goals, they’ll show up here."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGoals.map((goal) => {
                    const progress =
                      goal.progress_percentage != null
                        ? Math.round(Number(goal.progress_percentage))
                        : calculateProgress(
                            goal.current_value,
                            goal.target_value,
                          )
                    const unit = goal.target_unit ?? ''
                    return (
                      <GlassCard
                        key={goal.id}
                        elevation={1}
                        className="group p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--fc-accent)_18%,transparent)] text-[color:var(--fc-accent)] shrink-0">
                              <Target className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold fc-text-primary truncate">
                                {goal.title}
                              </h3>
                              {goal.client && (
                                <p className="text-sm fc-text-dim truncate">
                                  {goal.client.first_name}{' '}
                                  {goal.client.last_name}
                                </p>
                              )}
                            </div>
                          </div>

                          {(goal.category || goal.pillar) && (
                            <p className="text-xs fc-text-subtle capitalize">
                              {[goal.pillar, goal.category]
                                .filter(Boolean)
                                .join(' · ')
                                .replace(/_/g, ' ')}
                            </p>
                          )}

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="fc-text-dim">Progress</span>
                              <span className="font-bold fc-text-primary">
                                {progress}%
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between text-xs">
                              <span className="fc-text-dim">
                                Current: {goal.current_value ?? '—'}
                                {unit ? ` ${unit}` : ''}
                              </span>
                              <span className="fc-text-dim">
                                Target: {goal.target_value ?? '—'}
                                {unit ? ` ${unit}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="fc-text-dim text-sm flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {goal.target_date
                                ? new Date(
                                    goal.target_date + 'T12:00:00',
                                  ).toLocaleDateString()
                                : 'No target date'}
                            </span>
                            {getStatusBadge(goal.status)}
                          </div>
                          {goal.description && (
                            <p className="text-sm fc-text-dim line-clamp-2">
                              {goal.description}
                            </p>
                          )}
                        </div>
                      </GlassCard>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

function GoalsHabitsHubInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('tab') === 'habits') {
      router.replace('/coach/goals', { scroll: false })
    }
  }, [searchParams, router])

  return <CoachGoalsContent />
}

function GoalsHabitsHubFallback() {
  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        <CoachPageShell
          widthVariant="data-7xl"
          className="p-4 pb-[var(--fc-bottom-safe-area)] sm:p-6"
        >
          <PageSkeleton variant="dashboard" />
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

export default function CoachGoalsPage() {
  return (
    <Suspense fallback={<GoalsHabitsHubFallback />}>
      <GoalsHabitsHubInner />
    </Suspense>
  )
}

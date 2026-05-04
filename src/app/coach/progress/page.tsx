'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { useTheme } from '@/contexts/ThemeContext'
import { GlassCard } from '@/components/ui/GlassCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import {
  BarChart3,
  Calendar,
  Search,
  Users,
  Dumbbell,
  Activity,
  Heart,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Flame,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import AnalyticsNav from '@/components/coach/AnalyticsNav'

type Period = 'week' | 'month'

interface ActionQueueClient {
  id: string
  name: string
  avatarUrl: string | null
  adherence: number
  lastActiveAt: string | null
}

interface InactiveClient {
  id: string
  name: string
  avatarUrl: string | null
  daysSince: number | null
  lastWellnessDate: string | null
}

interface FlaggedClient {
  id: string
  name: string
  avatarUrl: string | null
  signal: string
  logDate: string
  daysSince: number
  stressUi: number | null
}

interface OverviewResponse {
  period: Period
  totals: {
    activeClients: number
    completedWorkouts: number
    avgAdherence: number
    checkinsThisWeek: number
  }
  actionQueue: {
    needAttention: ActionQueueClient[]
    inactiveCheckIns: InactiveClient[]
    flagged: FlaggedClient[]
  }
  wellness: {
    checkedInToday: number
    totalClients: number
    averageEnergy: number | null
  }
}

const EMPTY_OVERVIEW: OverviewResponse = {
  period: 'month',
  totals: {
    activeClients: 0,
    completedWorkouts: 0,
    avgAdherence: 0,
    checkinsThisWeek: 0,
  },
  actionQueue: { needAttention: [], inactiveCheckIns: [], flagged: [] },
  wellness: { checkedInToday: 0, totalClients: 0, averageEnergy: null },
}

function getInitials(name: string): string {
  const parts = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return 'C'
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || 'C'
}

function avatarGradientFor(name: string): string {
  const colors = [
    'from-purple-500 to-purple-600',
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600',
    'from-indigo-500 to-indigo-600',
    'from-teal-500 to-teal-600',
    'from-red-500 to-red-600',
  ]
  const idx = (name.charCodeAt(0) || 0) % colors.length
  return colors[idx]
}

function isLikelyAvatarUrl(value: string | null | undefined): boolean {
  if (!value) return false
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.includes('/storage/v1/object/public/avatars/')
  )
}

function formatLastActive(iso: string | null): string {
  if (!iso) return 'No activity yet'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Active today'
  if (diffDays === 1) return 'Active 1 day ago'
  if (diffDays < 7) return `Active ${diffDays} days ago`
  if (diffDays < 30)
    return `Active ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`
  return `Active ${d.toLocaleDateString()}`
}

function formatLastCheckIn(daysSince: number | null): string {
  if (daysSince == null) return 'Never checked in'
  if (daysSince === 0) return 'Last check-in: today'
  if (daysSince === 1) return 'Last check-in: 1 day ago'
  return `Last check-in: ${daysSince} days ago`
}

interface AvatarProps {
  name: string
  avatarUrl: string | null
  size?: 'sm' | 'md'
}

function Avatar({ name, avatarUrl, size = 'md' }: AvatarProps) {
  const dimensions = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-sm'
  const showImage = avatarUrl && isLikelyAvatarUrl(avatarUrl)
  if (showImage) {
    return (
      <div
        className={`${dimensions} rounded-full overflow-hidden flex-shrink-0 bg-[color:var(--fc-glass-highlight)] border border-[color:var(--fc-glass-border)]`}
      >
        <img
          src={avatarUrl as string}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }
  return (
    <div
      className={`${dimensions} rounded-full bg-gradient-to-br ${avatarGradientFor(
        name
      )} flex items-center justify-center text-white font-semibold flex-shrink-0`}
    >
      {getInitials(name)}
    </div>
  )
}

interface ActionCardShellProps {
  title: string
  count: number
  icon: React.ReactNode
  accent: string
  emptyState: string
  empty: boolean
  ariaLabel?: string
  children?: React.ReactNode
}

function ActionCardShell({
  title,
  count,
  icon,
  accent,
  emptyState,
  empty,
  ariaLabel,
  children,
}: ActionCardShellProps) {
  return (
    <GlassCard
      elevation={1}
      className="fc-card-shell p-4 sm:p-5 flex flex-col gap-3 min-h-[280px]"
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`p-2 rounded-xl ${accent} flex items-center justify-center flex-shrink-0`}
          >
            {icon}
          </div>
          <h3 className="text-base font-semibold text-[color:var(--fc-text-primary)] truncate">
            {title}
          </h3>
        </div>
        <Badge
          variant="outline"
          className="rounded-full text-xs px-2.5 py-0.5 flex-shrink-0"
        >
          {count}
        </Badge>
      </div>
      {empty ? (
        <div className="flex-1 flex items-center justify-center text-sm text-[color:var(--fc-text-dim)] text-center px-4 py-6">
          {emptyState}
        </div>
      ) : (
        <div className="flex flex-col gap-2 -mx-1">{children}</div>
      )}
    </GlassCard>
  )
}

interface ActionRowProps {
  href: string
  name: string
  avatarUrl: string | null
  primary: string
  secondary?: string | null
  primaryClass?: string
}

function ActionRow({
  href,
  name,
  avatarUrl,
  primary,
  secondary,
  primaryClass,
}: ActionRowProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[color:var(--fc-glass-highlight)] transition-colors"
    >
      <Avatar name={name} avatarUrl={avatarUrl} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[color:var(--fc-text-primary)] truncate">
          {name}
        </p>
        {secondary && (
          <p className="text-xs text-[color:var(--fc-text-dim)] truncate">
            {secondary}
          </p>
        )}
      </div>
      <span
        className={`text-xs font-semibold whitespace-nowrap ${
          primaryClass ?? 'text-[color:var(--fc-text-primary)]'
        }`}
      >
        {primary}
      </span>
      <ChevronRight
        className="w-4 h-4 text-[color:var(--fc-text-subtle)] group-hover:text-[color:var(--fc-accent-cyan)] transition-colors"
        aria-hidden
      />
    </Link>
  )
}

export default function CoachProgress() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<OverviewResponse>(EMPTY_OVERVIEW)
  const [period, setPeriod] = useState<Period>('month')
  const [searchTerm, setSearchTerm] = useState('')

  const loadingRef = useRef(false)

  const loadData = useCallback(
    async (selectedPeriod: Period, signal?: AbortSignal) => {
      if (!user) return
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/coach/progress/overview?period=${selectedPeriod}`,
          { signal: signal ?? null }
        )
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        const data = (await res.json()) as OverviewResponse
        setOverview({
          period: data.period ?? selectedPeriod,
          totals: data.totals ?? EMPTY_OVERVIEW.totals,
          actionQueue: data.actionQueue ?? EMPTY_OVERVIEW.actionQueue,
          wellness: data.wellness ?? EMPTY_OVERVIEW.wellness,
        })
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        console.error('[coach/progress] load failed:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to load progress data'
        )
        setOverview(EMPTY_OVERVIEW)
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    },
    [user]
  )

  useEffect(() => {
    if (!user) {
      setLoading(false)
      setOverview(EMPTY_OVERVIEW)
      return
    }
    const ac = new AbortController()
    loadData(period, ac.signal)
    return () => {
      loadingRef.current = false
      ac.abort()
    }
  }, [user, period, loadData])

  const filteredQueue = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return overview.actionQueue
    const matches = (name: string) => name.toLowerCase().includes(term)
    return {
      needAttention: overview.actionQueue.needAttention.filter((c) =>
        matches(c.name)
      ),
      inactiveCheckIns: overview.actionQueue.inactiveCheckIns.filter((c) =>
        matches(c.name)
      ),
      flagged: overview.actionQueue.flagged.filter((c) => matches(c.name)),
    }
  }, [overview.actionQueue, searchTerm])

  const periodLabel = period === 'week' ? 'This Week' : 'This Month'
  const completedWorkoutsLabel =
    period === 'week' ? 'Workouts This Week' : 'Workouts This Month'

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          <CoachPageShell
            widthVariant="data-7xl"
            className="p-6 pb-24 space-y-6 bg-[color:var(--fc-bg-page)]"
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
          className="px-4 py-4 pb-32 sm:px-6 sm:py-6 space-y-4 sm:space-y-6"
        >
          <AnalyticsNav />

          {/* Header */}
          <GlassCard
            elevation={2}
            className="fc-card-shell p-3 sm:p-6 md:p-8"
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="hidden sm:flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent-cyan)] flex-shrink-0">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)] truncate">
                  Progress Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mt-1">
                  Team operations cockpit — KPIs, action queue, and wellness pulse.
                </p>
              </div>
            </div>
          </GlassCard>

          {error && (
            <GlassCard
              elevation={1}
              className="fc-card-shell p-4 border border-[color-mix(in_srgb,var(--fc-status-error)_30%,transparent)]"
            >
              <p className="text-sm text-[color:var(--fc-status-error)]">
                {error}
              </p>
            </GlassCard>
          )}

          {/* Filter row */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--fc-text-subtle)]" />
              <Input
                placeholder="Search clients by name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="fc-input h-12 w-full pl-12"
                aria-label="Search clients in action queue"
              />
            </div>
            <Select
              value={period}
              onValueChange={(value) => setPeriod(value as Period)}
            >
              <SelectTrigger className="fc-select h-12 w-full lg:w-48">
                <Calendar className="w-4 h-4 mr-2" aria-hidden />
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Canonical KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <GlassCard
              elevation={1}
              className="fc-card-shell p-4 flex items-center gap-3 sm:gap-4"
            >
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-3 text-white flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-[color:var(--fc-text-primary)] leading-none">
                  {overview.totals.activeClients}
                </p>
                <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mt-1">
                  Active Clients
                </p>
              </div>
            </GlassCard>
            <GlassCard
              elevation={1}
              className="fc-card-shell p-4 flex items-center gap-3 sm:gap-4"
            >
              <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-3 text-white flex-shrink-0">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-[color:var(--fc-text-primary)] leading-none">
                  {overview.totals.completedWorkouts}
                </p>
                <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mt-1">
                  {completedWorkoutsLabel}
                </p>
              </div>
            </GlassCard>
            <GlassCard
              elevation={1}
              className="fc-card-shell p-4 flex items-center gap-3 sm:gap-4"
            >
              <div className="rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 p-3 text-white flex-shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-[color:var(--fc-text-primary)] leading-none">
                  {overview.totals.avgAdherence}%
                </p>
                <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mt-1">
                  Avg Adherence
                </p>
              </div>
            </GlassCard>
            <GlassCard
              elevation={1}
              className="fc-card-shell p-4 flex items-center gap-3 sm:gap-4"
            >
              <div className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 p-3 text-white flex-shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-[color:var(--fc-text-primary)] leading-none">
                  {overview.totals.checkinsThisWeek}
                </p>
                <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mt-1">
                  Check-ins This Week
                </p>
              </div>
            </GlassCard>
          </div>

          {/* Action Queue */}
          <section aria-labelledby="action-queue-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[color:var(--fc-glass-highlight)] border border-[color:var(--fc-glass-border)]">
                  <Flame className="w-5 h-5 text-[color:var(--fc-accent-cyan)]" />
                </div>
                <h2
                  id="action-queue-heading"
                  className="text-xl font-bold text-[color:var(--fc-text-primary)]"
                >
                  Action Queue
                </h2>
              </div>
              {searchTerm.trim().length > 0 && (
                <Badge variant="outline" className="rounded-full text-xs">
                  Filtered by &quot;{searchTerm.trim()}&quot;
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Card A — Need Attention */}
              <ActionCardShell
                title="Need Attention"
                count={filteredQueue.needAttention.length}
                icon={<AlertTriangle className="w-5 h-5 text-white" />}
                accent="bg-gradient-to-br from-red-500 to-orange-500"
                emptyState={
                  searchTerm.trim().length > 0
                    ? 'No matches in this list.'
                    : 'All clients on track 👍'
                }
                empty={filteredQueue.needAttention.length === 0}
              >
                {filteredQueue.needAttention.map((c) => (
                  <ActionRow
                    key={c.id}
                    href={`/coach/clients/${c.id}/progress`}
                    name={c.name}
                    avatarUrl={c.avatarUrl}
                    primary={`${c.adherence}%`}
                    primaryClass={
                      c.adherence < 60
                        ? 'text-[color:var(--fc-status-error)]'
                        : undefined
                    }
                    secondary={formatLastActive(c.lastActiveAt)}
                  />
                ))}
              </ActionCardShell>

              {/* Card B — Inactive Check-ins */}
              <ActionCardShell
                title="Inactive Check-ins"
                count={filteredQueue.inactiveCheckIns.length}
                icon={<Calendar className="w-5 h-5 text-white" />}
                accent="bg-gradient-to-br from-amber-500 to-yellow-500"
                emptyState={
                  searchTerm.trim().length > 0
                    ? 'No matches in this list.'
                    : 'All clients checking in regularly'
                }
                empty={filteredQueue.inactiveCheckIns.length === 0}
              >
                {filteredQueue.inactiveCheckIns.map((c) => (
                  <ActionRow
                    key={c.id}
                    href={`/coach/clients/${c.id}/progress`}
                    name={c.name}
                    avatarUrl={c.avatarUrl}
                    primary={
                      c.daysSince == null
                        ? 'Never'
                        : c.daysSince === 0
                          ? 'Today'
                          : `${c.daysSince}d`
                    }
                    primaryClass="text-[color:var(--fc-status-warning)]"
                    secondary={formatLastCheckIn(c.daysSince)}
                  />
                ))}
              </ActionCardShell>

              {/* Card C — High Stress */}
              <ActionCardShell
                title="High Stress"
                count={filteredQueue.flagged.length}
                icon={<Heart className="w-5 h-5 text-white" />}
                accent="bg-gradient-to-br from-pink-500 to-rose-500"
                ariaLabel="High Stress"
                emptyState={
                  searchTerm.trim().length > 0
                    ? 'No matches in this list.'
                    : 'No high-stress check-ins'
                }
                empty={filteredQueue.flagged.length === 0}
              >
                {filteredQueue.flagged.map((c) => (
                  <ActionRow
                    key={c.id}
                    href={`/coach/clients/${c.id}/progress`}
                    name={c.name}
                    avatarUrl={c.avatarUrl}
                    primary={
                      c.stressUi != null && c.stressUi >= 4
                        ? `Stress ${c.stressUi}/5`
                        : 'Stress'
                    }
                    primaryClass="text-[color:var(--fc-status-error)]"
                    secondary={c.signal}
                  />
                ))}
              </ActionCardShell>
            </div>
          </section>

          {/* Wellness Overview — focused summary */}
          <section aria-labelledby="wellness-heading" className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[color:var(--fc-glass-highlight)] border border-[color:var(--fc-glass-border)]">
                <Heart className="w-5 h-5 text-[color:var(--fc-accent-cyan)]" />
              </div>
              <h2
                id="wellness-heading"
                className="text-xl font-bold text-[color:var(--fc-text-primary)]"
              >
                Wellness Overview
              </h2>
            </div>
            <GlassCard
              elevation={1}
              className="fc-card-shell p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div className="p-4 rounded-2xl bg-[color:var(--fc-glass-highlight)] border border-[color:var(--fc-glass-border)]">
                <div className="flex items-center gap-2 text-[color:var(--fc-text-dim)] text-sm mb-1">
                  <CheckCircle className="w-4 h-4" aria-hidden />
                  <span>Today&apos;s Check-ins</span>
                </div>
                <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                  {overview.wellness.checkedInToday} /{' '}
                  {overview.wellness.totalClients}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[color:var(--fc-glass-highlight)] border border-[color:var(--fc-glass-border)]">
                <div className="flex items-center gap-2 text-[color:var(--fc-text-dim)] text-sm mb-1">
                  <Activity className="w-4 h-4" aria-hidden />
                  <span>Avg Energy (today)</span>
                </div>
                <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                  {overview.wellness.averageEnergy != null
                    ? overview.wellness.averageEnergy.toFixed(1)
                    : '—'}
                </p>
                <p className="text-xs text-[color:var(--fc-text-dim)] mt-1">
                  Average across clients who checked in today.
                </p>
              </div>
            </GlassCard>
          </section>

          {/* Trailing helper bar — link straight into the per-client adherence cockpit. */}
          <GlassCard
            elevation={1}
            className="fc-card-shell p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[color:var(--fc-glass-highlight)] border border-[color:var(--fc-glass-border)]">
                <BarChart3 className="w-5 h-5 text-[color:var(--fc-accent-cyan)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                  Need a deeper look at one client?
                </p>
                <p className="text-xs text-[color:var(--fc-text-dim)] mt-1">
                  The full adherence cockpit (calendar, trend chart, per-domain
                  breakdown) lives on each client&apos;s progress page.
                </p>
              </div>
            </div>
            <Link
              href="/coach/clients"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--fc-accent-cyan)] hover:underline"
            >
              Open client list
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </GlassCard>
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

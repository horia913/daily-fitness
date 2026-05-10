'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { useTheme } from '@/contexts/ThemeContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import {
  Calendar,
  Search,
  Heart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react'
import hub from '@/components/coach-analytics/coachAnalyticsHub.module.css'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import AnalyticsNav from '@/components/coach/AnalyticsNav'
import { AnalyticsHero } from '@/components/coach-analytics/AnalyticsHero'
import { QueueCard } from '@/components/coach-analytics/QueueCard'
import { QueueRow } from '@/components/coach-analytics/QueueRow'
import { EmptyMini } from '@/components/coach-analytics/EmptyMini'
import { CtaBar } from '@/components/coach-analytics/CtaBar'
import { StatTile } from '@/components/coach-analytics/StatTile'

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

function formatLastActive(iso: string | null): string {
  if (!iso) return 'No activity yet'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Active today'
  if (diffDays === 1) return 'Active 1 day ago'
  if (diffDays < 7) return `Active ${diffDays}d ago`
  if (diffDays < 30)
    return `Active ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`
  return `Active ${d.toLocaleDateString()}`
}

function needAttentionMeta(client: ActionQueueClient): { line: string; color: string } {
  if (!client.lastActiveAt) return { line: 'No activity yet', color: 'var(--critical)' }
  const line = formatLastActive(client.lastActiveAt)
  const d = new Date(client.lastActiveAt)
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays >= 2 || line.includes('week')) return { line, color: 'var(--warning)' }
  return { line, color: 'var(--t3)' }
}

function adherencePctColor(pct: number): string {
  if (pct <= 0) return 'var(--critical)'
  if (pct < 50) return 'var(--warning)'
  if (pct > 75) return 'var(--good)'
  return 'var(--t1)'
}

function avgAdherenceHeroColor(pct: number): string {
  if (pct < 20) return 'var(--critical)'
  if (pct <= 25) return 'var(--warning)'
  if (pct > 75) return 'var(--good)'
  return 'var(--t1)'
}

function sortNeedAttention(items: ActionQueueClient[]): ActionQueueClient[] {
  return [...items].sort((a, b) => {
    const aNull = a.lastActiveAt == null
    const bNull = b.lastActiveAt == null
    if (aNull !== bNull) return aNull ? -1 : 1
    if (aNull && bNull) return a.adherence - b.adherence
    return new Date(a.lastActiveAt!).getTime() - new Date(b.lastActiveAt!).getTime()
  })
}

function inactiveStatLine(c: InactiveClient): { line: string; color: string } {
  if (c.daysSince == null) return { line: 'Never checked in', color: 'var(--t3)' }
  const line = `Last ${c.daysSince} days ago`
  if (c.daysSince > 7) return { line, color: 'var(--warning)' }
  return { line, color: 'var(--t3)' }
}

function inactiveBadge(c: InactiveClient): { text: string; color: string } {
  if (c.daysSince == null) return { text: 'Never', color: 'var(--t4)' }
  return {
    text: `${c.daysSince}d`,
    color: c.daysSince > 7 ? 'var(--warning)' : 'var(--t3)',
  }
}

function formatLogShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

function energyColor(val: number | null): string {
  if (val == null) return 'var(--t4)'
  if (val < 4) return 'var(--critical)'
  if (val < 7) return 'var(--warning)'
  return 'var(--good)'
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
        const res = await fetch(`/api/coach/progress/overview?period=${selectedPeriod}`, {
          signal: signal ?? null,
        })
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
        setError(err instanceof Error ? err.message : 'Failed to load progress data')
        setOverview(EMPTY_OVERVIEW)
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    },
    [user],
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
      needAttention: overview.actionQueue.needAttention.filter((c) => matches(c.name)),
      inactiveCheckIns: overview.actionQueue.inactiveCheckIns.filter((c) => matches(c.name)),
      flagged: overview.actionQueue.flagged.filter((c) => matches(c.name)),
    }
  }, [overview.actionQueue, searchTerm])

  const needSorted = useMemo(() => sortNeedAttention(filteredQueue.needAttention), [filteredQueue.needAttention])
  const needDisplay = useMemo(() => needSorted.slice(0, 7), [needSorted])
  const needExtra = needSorted.length > 7

  const inactiveDisplay = useMemo(() => filteredQueue.inactiveCheckIns.slice(0, 7), [filteredQueue.inactiveCheckIns])
  const inactiveExtra = filteredQueue.inactiveCheckIns.length > 7

  const stressDisplay = useMemo(() => filteredQueue.flagged.slice(0, 7), [filteredQueue.flagged])
  const stressExtra = filteredQueue.flagged.length > 7

  const periodLabel = period === 'week' ? 'This week' : 'This month'
  const avgPct = Math.round(overview.totals.avgAdherence ?? 0)
  const checkColor =
    overview.totals.checkinsThisWeek <= 0 ? 'var(--t4)' : 'var(--t1)'

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          <CoachPageShell
            widthVariant="data-7xl"
            className={cn('p-6 pb-[var(--fc-bottom-safe-area)] space-y-6', hub.hub)}
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
          className={cn('px-4 py-4 pb-[var(--fc-bottom-safe-area)] sm:px-6 sm:py-6 space-y-4 sm:space-y-5', hub.hub)}
        >
          <AnalyticsNav />

          <AnalyticsHero
            accent="purple"
            eyebrow="Progress dashboard"
            title="Action queue"
            subtitle="KPIs, action queue, and wellness pulse"
            controls={
              <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
                <div
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border py-1.5 pl-2.5 pr-2"
                  style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
                >
                  <Search className="size-3 shrink-0" style={{ color: 'var(--t3)' }} aria-hidden />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search clients..."
                    className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] outline-none"
                    style={{ color: 'var(--t1)' }}
                    aria-label="Search clients in action queue"
                  />
                </div>
                <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
                  <SelectTrigger
                    className="h-auto min-h-0 w-auto shrink-0 gap-1.5 rounded-[10px] border py-1.5 pl-2 pr-2 text-[11.5px] shadow-none"
                    style={{
                      background: 'var(--card-2)',
                      borderColor: 'var(--line)',
                      color: 'var(--t1)',
                      fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <Calendar className="size-[11px] shrink-0 opacity-80" aria-hidden />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This week</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
            stats={[
              {
                num: overview.totals.activeClients,
                label: 'Active',
                color: 'var(--cyan)',
              },
              {
                num: `${avgPct}%`,
                label: 'Avg adherence',
                color: avgAdherenceHeroColor(avgPct),
              },
              {
                num: overview.totals.checkinsThisWeek,
                label: 'Check-ins · wk',
                color: checkColor,
              },
            ]}
          />

          {error ? (
            <div
              className="rounded-[18px] border p-4 text-sm"
              style={{
                background: 'var(--card)',
                borderColor: 'var(--critical)',
                color: 'var(--critical)',
              }}
            >
              {error}
            </div>
          ) : null}

          <section aria-labelledby="queues-heading" className="space-y-3">
            <h2 id="queues-heading" className="sr-only">
              Action queues
            </h2>

            <QueueCard
              variant="critical"
              title="Need attention"
              count={filteredQueue.needAttention.length}
              icon={<AlertTriangle className="size-3.5 text-[color:var(--critical)]" aria-hidden />}
            >
              {filteredQueue.needAttention.length === 0 ? (
                <p className="text-center text-[11px]" style={{ color: 'var(--t3)' }}>
                  {searchTerm.trim() ? 'No matches in this list.' : 'All clients on track'}
                </p>
              ) : (
                <>
                  {needDisplay.map((c) => {
                    const meta = needAttentionMeta(c)
                    return (
                      <QueueRow
                        key={c.id}
                        href={`/coach/clients/${c.id}/progress`}
                        name={c.name}
                        avatarUrl={c.avatarUrl}
                        seed={c.id}
                        statLine={meta.line}
                        statLineColor={meta.color}
                        stripe="critical"
                        rightSlot={
                          <span
                            className="text-[13px] font-bold leading-none"
                            style={{
                              fontFamily: 'var(--f-display, "Big Shoulders Display", sans-serif)',
                              color: adherencePctColor(c.adherence),
                            }}
                          >
                            {c.adherence}%
                          </span>
                        }
                      />
                    )
                  })}
                  {needExtra ? (
                    <Link
                      href="/coach/clients"
                      className="text-right text-[11px] font-medium"
                      style={{ color: 'var(--cyan)' }}
                    >
                      View all →
                    </Link>
                  ) : null}
                </>
              )}
            </QueueCard>

            <QueueCard
              variant="purple"
              title="Inactive check-ins"
              count={filteredQueue.inactiveCheckIns.length}
              icon={<Clock className="size-3.5 text-[color:var(--purple)]" aria-hidden />}
            >
              {filteredQueue.inactiveCheckIns.length === 0 ? (
                <p className="text-center text-[11px]" style={{ color: 'var(--t3)' }}>
                  {searchTerm.trim() ? 'No matches in this list.' : 'All clients checking in regularly'}
                </p>
              ) : (
                <>
                  {inactiveDisplay.map((c) => {
                    const line = inactiveStatLine(c)
                    const badge = inactiveBadge(c)
                    return (
                      <QueueRow
                        key={c.id}
                        href={`/coach/clients/${c.id}/progress`}
                        name={c.name}
                        avatarUrl={c.avatarUrl}
                        seed={c.id}
                        statLine={line.line}
                        statLineColor={line.color}
                        stripe="purple"
                        rightSlot={
                          <span
                            className="text-[10px] font-medium"
                            style={{
                              fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
                              color: badge.color,
                            }}
                          >
                            {badge.text}
                          </span>
                        }
                      />
                    )
                  })}
                  {inactiveExtra ? (
                    <Link
                      href="/coach/clients"
                      className="text-right text-[11px] font-medium"
                      style={{ color: 'var(--cyan)' }}
                    >
                      View all →
                    </Link>
                  ) : null}
                </>
              )}
            </QueueCard>

            <QueueCard
              variant="rose"
              title="High stress"
              count={filteredQueue.flagged.length}
              icon={<Heart className="size-3.5 text-[color:var(--rose)]" aria-hidden />}
            >
              {filteredQueue.flagged.length === 0 ? (
                <EmptyMini icon={CheckCircle} text="No high-stress check-ins" />
              ) : (
                <>
                  {stressDisplay.map((c) => (
                    <QueueRow
                      key={c.id}
                      href={`/coach/clients/${c.id}/progress`}
                      name={c.name}
                      avatarUrl={c.avatarUrl}
                      seed={c.id}
                      statLine={`Stress ${c.stressUi ?? '—'}/5 · ${formatLogShort(c.logDate)}`}
                      statLineColor="var(--rose)"
                      stripe="rose"
                      rightSlot={
                        <span
                          className="max-w-[100px] truncate text-right text-[10px] font-medium leading-tight"
                          style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)', color: 'var(--t3)' }}
                        >
                          {c.signal}
                        </span>
                      }
                    />
                  ))}
                  {stressExtra ? (
                    <Link
                      href="/coach/clients"
                      className="text-right text-[11px] font-medium"
                      style={{ color: 'var(--cyan)' }}
                    >
                      View all →
                    </Link>
                  ) : null}
                </>
              )}
            </QueueCard>
          </section>

          <div className={hub.sectionCard}>
            <div className={hub.sectionHead}>
              <div className={hub.sectionHeadLeft}>
                <div
                  className="flex size-6 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'var(--rose-soft)' }}
                >
                  <Heart className="size-3.5 text-[color:var(--rose)]" aria-hidden />
                </div>
                <h2 className={hub.sectionTitle}>Wellness overview</h2>
              </div>
              <span className={hub.sectionMeta}>today</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <StatTile
                icon={CheckCircle}
                variant="purple"
                value={
                  <>
                    <span style={{ color: overview.wellness.checkedInToday === 0 ? 'var(--t4)' : 'var(--t1)' }}>
                      {overview.wellness.checkedInToday}
                    </span>
                    <span style={{ color: 'var(--t3)' }}> / {overview.wellness.totalClients}</span>
                  </>
                }
                label={"Today's check-ins"}
                delta="Clients who logged today"
                deltaTone="neutral"
              />
              <StatTile
                icon={Zap}
                variant="warn"
                value={
                  overview.wellness.averageEnergy != null
                    ? overview.wellness.averageEnergy.toFixed(1)
                    : '—'
                }
                label="Avg energy"
                delta={"From today's check-ins"}
                deltaTone="neutral"
                valueColor={energyColor(overview.wellness.averageEnergy)}
              />
            </div>
          </div>

          <CtaBar
            title="Need a deeper look?"
            subtitle="Per-client adherence cockpit"
            href="/coach/clients"
            linkLabel="Open"
          />
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

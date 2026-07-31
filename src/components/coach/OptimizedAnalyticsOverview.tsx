'use client'

import React, { useState, useEffect, useCallback, useRef, type ComponentType, type SVGProps } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  Users,
  TrendingUp,
  Target,
  Dumbbell,
  Apple,
  Heart,
  Award,
  Activity,
  PieChart,
  Trophy,
  Clock,
  Calendar,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fetchApi } from '@/lib/apiClient'
import hub from '@/components/coach-analytics/coachAnalyticsHub.module.css'
import { cn } from '@/lib/utils'
import { AnalyticsHero } from '@/components/coach-analytics/AnalyticsHero'
import { StatTile } from '@/components/coach-analytics/StatTile'
import { BreakdownRow } from '@/components/coach-analytics/BreakdownRow'
import { RankingRow } from '@/components/coach-analytics/RankingRow'
import { ClientGrowthChart } from '@/components/coach-analytics/ClientGrowthChart'

interface ClientCompliance {
  id: string
  name: string
  avatar_url?: string
  compliance: number
}

interface ComplianceBreakdownItem {
  category: string
  percentage: number
  icon: string
  tracked?: boolean
}

type PeriodValue = '7d' | '30d' | '90d' | '1y'

const PERIOD_LABEL: Record<PeriodValue, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '1y': 'Last year',
}

interface ProgramRow {
  programName: string
  programType: string
  successRate: number
  avgProgress: number
  clientCount: number
  weekStatus: string
  color: string
}

interface AnalyticsOverviewData {
  totalClients: number
  activeClients: number
  newClientsThisPeriod: number
  clientRetentionRate: number
  overallComplianceRate: number
  compliancePeriodDelta: number
  avgSessionTime: number
  sessionsPerWeek: number
  goalsAchieved: number
  totalGoals: number
  successRate: number
  totalWorkouts: number
  totalMeals: number
  totalHabits: number
  personalBests: number
  mealsPerWeek: number
  prSuccessRate: number
  activeProgramCount: number
  clientGrowthTrend: 'up' | 'down' | 'stable'
  complianceTrend: 'up' | 'down' | 'stable'
  engagementTrend: 'up' | 'down' | 'stable'
  clientGrowthChartSeries: { label: string; count: number }[]
  clientGrowthQuarterNet: number
  clientGrowthShowEmpty: boolean
  complianceBreakdown: ComplianceBreakdownItem[]
  programEffectiveness: ProgramRow[]
}

const iconMap: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  Dumbbell,
  Apple,
  Heart,
  Target,
}

function tierPctColor(pct: number, tracked: boolean): string {
  if (!tracked) return 'var(--t4)'
  if (pct <= 0) return 'var(--critical)'
  if (pct < 50) return 'var(--warning)'
  if (pct < 75) return 'var(--warning)'
  return 'var(--good)'
}

function tierBarColor(pct: number, tracked: boolean, fallback: string): string {
  if (!tracked) return 'rgba(255,255,255,0.06)'
  if (pct <= 0) return 'var(--critical)'
  if (pct < 50) return 'var(--critical)'
  if (pct < 75) return 'var(--warning)'
  return fallback
}

function programAccent(t: string): { bg: string; fg: string } {
  const x = t.toLowerCase()
  if (x.includes('hypertrophy')) return { bg: 'var(--fc-accent-dim)', fg: 'var(--fc-accent)' }
  if (x.includes('strength')) return { bg: 'var(--purple-soft)', fg: 'var(--purple)' }
  if (x.includes('complete')) return { bg: 'var(--good-soft)', fg: 'var(--good)' }
  return { bg: 'var(--fc-accent-dim)', fg: 'var(--fc-accent)' }
}

export default function OptimizedAnalyticsOverview({ coachId }: { coachId?: string }) {
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [topClients, setTopClients] = useState<ClientCompliance[]>([])
  const [bottomClients, setBottomClients] = useState<ClientCompliance[]>([])
  const loadingRef = useRef(false)

  const [data, setData] = useState<AnalyticsOverviewData>({
    totalClients: 0,
    activeClients: 0,
    newClientsThisPeriod: 0,
    clientRetentionRate: 0,
    overallComplianceRate: 0,
    compliancePeriodDelta: 0,
    avgSessionTime: 0,
    sessionsPerWeek: 0,
    goalsAchieved: 0,
    totalGoals: 0,
    successRate: 0,
    totalWorkouts: 0,
    totalMeals: 0,
    totalHabits: 0,
    personalBests: 0,
    mealsPerWeek: 0,
    prSuccessRate: 0,
    activeProgramCount: 0,
    clientGrowthTrend: 'stable',
    complianceTrend: 'stable',
    engagementTrend: 'stable',
    clientGrowthChartSeries: [],
    clientGrowthQuarterNet: 0,
    clientGrowthShowEmpty: true,
    complianceBreakdown: [],
    programEffectiveness: [],
  })

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      if (!coachId) return
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)
      try {
        const res = await fetchApi(`/api/coach/analytics/overview?period=${selectedPeriod}`, {
          signal: signal ?? null,
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        const j = await res.json()
        const breakdown = (j.complianceBreakdown || []).map(
          (item: { category: string; percentage: number; icon: string; tracked?: boolean }) => ({
            ...item,
            tracked: item.tracked === undefined ? true : item.tracked,
          })
        )
        setTopClients(j.topClients || [])
        setBottomClients(j.bottomClients || [])
        setData({
          totalClients: j.totalClients ?? 0,
          activeClients: j.activeClients ?? 0,
          newClientsThisPeriod: j.newClientsThisPeriod ?? 0,
          clientRetentionRate: j.clientRetentionRate ?? 0,
          overallComplianceRate: j.overallComplianceRate ?? 0,
          compliancePeriodDelta: j.compliancePeriodDelta ?? 0,
          avgSessionTime: j.avgSessionTime ?? 0,
          sessionsPerWeek: j.sessionsPerWeek ?? 0,
          goalsAchieved: j.goalsAchieved ?? 0,
          totalGoals: j.totalGoals ?? 0,
          successRate: j.successRate ?? 0,
          totalWorkouts: j.totalWorkouts ?? 0,
          totalMeals: j.totalMeals ?? 0,
          totalHabits: j.totalHabits ?? 0,
          personalBests: j.personalBests ?? 0,
          mealsPerWeek: j.mealsPerWeek ?? 0,
          prSuccessRate: j.prSuccessRate ?? j.successRate ?? 0,
          activeProgramCount: j.activeProgramCount ?? 0,
          clientGrowthTrend: j.clientGrowthTrend ?? 'stable',
          complianceTrend: j.complianceTrend ?? 'stable',
          engagementTrend: j.engagementTrend ?? 'stable',
          clientGrowthChartSeries: j.clientGrowthChartSeries ?? [],
          clientGrowthQuarterNet: j.clientGrowthQuarterNet ?? 0,
          clientGrowthShowEmpty: Boolean(j.clientGrowthShowEmpty),
          complianceBreakdown: breakdown,
          programEffectiveness: j.programEffectiveness ?? [],
        })
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Error loading analytics data:', err)
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    },
    [coachId, selectedPeriod]
  )

  useEffect(() => {
    if (!coachId) return
    const ac = new AbortController()
    loadData(ac.signal)
    return () => ac.abort()
  }, [coachId, selectedPeriod, loadData])

  const complianceDeltaStr =
    (data.compliancePeriodDelta > 0 ? '+' : '') + `${data.compliancePeriodDelta}%`

  const complianceDeltaTone: 'up' | 'down' | 'neutral' =
    data.compliancePeriodDelta > 0 ? 'up' : data.compliancePeriodDelta < 0 ? 'down' : 'neutral'

  const complianceValueColor =
    data.overallComplianceRate <= 0 ? 'var(--critical)' : 'var(--t1)'

  if (loading) {
    return <PageSkeleton variant="dashboard" />
  }

  return (
    <div className="space-y-4">
      <AnalyticsHero
        accent="cyan"
        eyebrow="Coach analytics"
        title="Overview"
        subtitle="High-level insights into client progress and performance"
        controls={
          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
            <Select
              value={selectedPeriod}
              onValueChange={(v) => setSelectedPeriod(v as PeriodValue)}
            >
              <SelectTrigger
                className={cn(
                  'h-auto min-h-0 w-auto max-w-[min(100%,220px)] border shadow-none py-1.5 px-2.5 gap-1.5 rounded-[10px] text-[11.5px] font-medium [&_svg]:size-[11px]',
                )}
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
                <SelectItem value="7d">{PERIOD_LABEL['7d']}</SelectItem>
                <SelectItem value="30d">{PERIOD_LABEL['30d']}</SelectItem>
                <SelectItem value="90d">{PERIOD_LABEL['90d']}</SelectItem>
                <SelectItem value="1y">{PERIOD_LABEL['1y']}</SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => loadData()}
              className="inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 text-[11px] transition-colors hover:bg-white/[0.04]"
              style={{
                borderColor: 'var(--line)',
                color: 'var(--t2)',
                fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
                background: 'transparent',
              }}
            >
              <RefreshCw className="size-[11px] shrink-0" aria-hidden />
              Refresh
            </button>
          </div>
        }
        stats={[
          { num: data.totalClients, label: 'Total clients', color: 'var(--t1)' },
          { num: data.activeClients, label: 'Active', color: 'var(--fc-accent)' },
          {
            num: `${data.clientRetentionRate}%`,
            label: 'Retention',
            color: data.clientRetentionRate >= 50 ? 'var(--good)' : 'var(--warning)',
          },
          {
            num: `${data.overallComplianceRate}%`,
            label: 'Avg adherence',
            color:
              data.overallComplianceRate <= 0
                ? 'var(--critical)'
                : data.overallComplianceRate < 50
                  ? 'var(--critical)'
                  : data.overallComplianceRate < 75
                    ? 'var(--warning)'
                    : 'var(--good)',
          },
        ]}
      />

      <div className="grid grid-cols-3 gap-1.5">
        <StatTile
          icon={Users}
          variant="cyan"
          value={data.totalClients}
          label="Total"
          delta={`+${data.newClientsThisPeriod} this period`}
          deltaTone={data.newClientsThisPeriod > 0 ? 'up' : 'neutral'}
        />
        <StatTile
          icon={TrendingUp}
          variant="good"
          value={data.activeClients}
          label="Active"
          delta={`${data.clientRetentionRate}% retention`}
          deltaTone="neutral"
        />
        <StatTile
          icon={Target}
          variant="crit"
          value={`${data.overallComplianceRate}`}
          unitSuffix="%"
          label="Adherence"
          valueColor={complianceValueColor}
          delta={complianceDeltaStr}
          deltaTone={complianceDeltaTone}
        />
        <StatTile
          icon={Dumbbell}
          variant="warn"
          value={data.totalWorkouts}
          label="Workouts"
          delta={`${data.avgSessionTime}min avg`}
          deltaTone="neutral"
        />
        <StatTile
          icon={Apple}
          variant="action"
          value={data.totalMeals}
          label="Meals logged"
          delta={`${data.mealsPerWeek}/wk`}
          deltaTone="neutral"
        />
        <StatTile
          icon={Award}
          variant="purple"
          value={data.personalBests}
          label="PRs"
          delta={`${data.prSuccessRate}% rate`}
          deltaTone={data.prSuccessRate >= 50 ? 'up' : data.prSuccessRate > 0 ? 'neutral' : 'down'}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ClientGrowthChart
          series={data.clientGrowthChartSeries}
          growthNet={data.clientGrowthQuarterNet}
          showEmpty={data.clientGrowthShowEmpty}
        />

        <div className={hub.sectionCard}>
          <div className={hub.sectionHead}>
            <div className={hub.sectionHeadLeft}>
              <PieChart className="size-3 shrink-0" style={{ color: 'var(--purple)' }} aria-hidden />
              <span className={hub.sectionTitle}>Adherence breakdown</span>
            </div>
            <span className={hub.sectionMeta}>4 domains</span>
          </div>
          <div className="space-y-2">
            {data.complianceBreakdown.map((item, index) => {
              const Icon = iconMap[item.icon] || Dumbbell
              const tracked = item.tracked !== false
              const display = !tracked ? 'Not tracked' : `${Math.round(item.percentage)}%`
              const pct = tracked ? item.percentage : 0
              const domainColors = ['var(--fc-accent)', 'var(--good)', 'var(--warning)', 'var(--purple)']
              const fill = domainColors[index % domainColors.length]
              return (
                <BreakdownRow
                  key={item.category}
                  icon={Icon}
                  iconBg={`${fill}22`}
                  iconFg={fill}
                  name={item.category}
                  valueDisplay={display}
                  valueColor={tierPctColor(item.percentage, tracked)}
                  barColor={tierBarColor(item.percentage, tracked, fill)}
                  fillPercent={tracked ? item.percentage : 6}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div className={hub.sectionCard}>
        <div className={hub.sectionHead}>
          <div className={hub.sectionHeadLeft}>
            <BarChart3 className="size-3 shrink-0" style={{ color: 'var(--warning)' }} aria-hidden />
            <span className={hub.sectionTitle}>Program effectiveness</span>
          </div>
          <span className={hub.sectionMeta}>{data.activeProgramCount} active</span>
        </div>
        {data.programEffectiveness.length === 0 ? (
          <div
            className="rounded-[11px] border border-dashed p-6 text-center text-[12px] leading-relaxed"
            style={{ background: 'var(--card-2)', borderColor: 'var(--line-2)', color: 'var(--t3)' }}
          >
            No programs yet · Create your first program in{' '}
            <Link href="/coach/programs" className="text-[var(--fc-accent)] underline-offset-2 hover:underline">
              /coach/programs
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {data.programEffectiveness.map((p) => {
              const acc = programAccent(p.programType)
              const sub = `${p.programType} · ${p.clientCount} client${p.clientCount === 1 ? '' : 's'} · ${p.weekStatus}`
              return (
                <BreakdownRow
                  key={p.programName + p.clientCount}
                  icon={BarChart3}
                  iconBg={acc.bg}
                  iconFg={acc.fg}
                  name={p.programName}
                  valueDisplay={`${Math.round(p.avgProgress)}%`}
                  valueColor="var(--fc-accent)"
                  barColor="var(--fc-accent)"
                  fillPercent={p.avgProgress}
                  subMeta={sub}
                />
              )
            })}
          </div>
        )}
      </div>

      <div className={hub.sectionCard}>
        <div className={hub.sectionHead}>
          <div className={hub.sectionHeadLeft}>
            <Activity className="size-3 shrink-0" style={{ color: 'var(--good)' }} aria-hidden />
            <span className={hub.sectionTitle}>Engagement</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
          <StatTile
            icon={Clock}
            variant="cyan"
            value={data.avgSessionTime}
            unitSuffix="min"
            label="Avg session"
            delta={' '}
            deltaTone="neutral"
          />
          <StatTile
            icon={Calendar}
            variant="warn"
            value={data.sessionsPerWeek}
            label="Sessions/wk"
            delta={' '}
            deltaTone="neutral"
            valueColor={data.sessionsPerWeek < 1 ? 'var(--warning)' : 'var(--t1)'}
          />
          <StatTile
            icon={Target}
            variant="purple"
            value={`${data.goalsAchieved}/${data.totalGoals}`}
            label="Goals achieved"
            delta={' '}
            deltaTone="neutral"
          />
          <StatTile
            icon={TrendingUp}
            variant={data.successRate >= 60 ? 'good' : 'crit'}
            value={`${data.successRate}`}
            unitSuffix="%"
            label="Success rate"
            delta={' '}
            deltaTone="neutral"
            valueColor={
              data.successRate >= 75 ? 'var(--good)' : data.successRate >= 50 ? 'var(--warning)' : 'var(--critical)'
            }
          />
        </div>
      </div>

      <div className={hub.sectionCard}>
        <div className={hub.sectionHead}>
          <div className={hub.sectionHeadLeft}>
            <Trophy className="size-3 shrink-0" style={{ color: 'var(--purple)' }} aria-hidden />
            <span className={hub.sectionTitle}>Client rankings</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-1.5" style={{ color: 'var(--good)' }}>
              <TrendingUp className="size-[11px] shrink-0" aria-hidden />
              <span
                className="text-[9.5px] font-medium uppercase tracking-[0.12em]"
                style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
              >
                Top performers
              </span>
            </div>
            <div className="space-y-1.5">
              {topClients.map((c, i) => (
                <RankingRow
                  key={c.id}
                  rank={i + 1}
                  name={c.name}
                  avatarUrl={c.avatar_url}
                  seed={c.id}
                  pct={c.compliance}
                />
              ))}
            </div>
            <Link
              href="/coach/compliance"
              className="mt-2 inline-block text-[11px]"
              style={{ color: 'var(--fc-accent)' }}
            >
              View all →
            </Link>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <AlertTriangle className="size-[11px] shrink-0" style={{ color: 'var(--critical)' }} aria-hidden />
              <span
                className="text-[9.5px] font-medium uppercase tracking-[0.12em]"
                style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)', color: 'var(--critical)' }}
              >
                Needs attention
              </span>
            </div>
            <div className="space-y-1.5">
              {bottomClients.map((c, i) => (
                <RankingRow
                  key={c.id}
                  rank={i + 1}
                  name={c.name}
                  avatarUrl={c.avatar_url}
                  seed={c.id}
                  pct={c.compliance}
                  attentionStripe
                />
              ))}
            </div>
            <Link
              href="/coach/compliance"
              className="mt-2 inline-block text-[11px]"
              style={{ color: 'var(--fc-accent)' }}
            >
              View all →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

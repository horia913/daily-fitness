'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { withTimeout } from '@/lib/withTimeout'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshCw, Search } from 'lucide-react'
import { ComplianceDashboardData, ClientComplianceTracker } from '@/lib/clientCompliance'
import { supabase } from '@/lib/supabase'
import hub from '@/components/coach-analytics/coachAnalyticsHub.module.css'
import { AnalyticsHero } from '@/components/coach-analytics/AnalyticsHero'
import { DistributionViz } from '@/components/coach-analytics/DistributionViz'
import { QuickActions } from '@/components/coach-analytics/QuickActions'
import { ComplianceClientCard } from '@/components/coach-analytics/ComplianceClientCard'

interface OptimizedComplianceDashboardProps {
  coachId: string
}

export default function OptimizedComplianceDashboard({ coachId }: OptimizedComplianceDashboardProps) {
  const [rows, setRows] = useState<ComplianceDashboardData[]>([])
  const [flags, setFlags] = useState<Map<string, { hasNutritionPlan: boolean; hasHabitsConfigured: boolean }>>(
    new Map()
  )
  const [loading, setLoading] = useState(true)
  const loadingRef = useRef(false)
  const [selectedPeriod] = useState<'week' | 'month' | 'quarter'>('week')
  const [sortBy, setSortBy] = useState<'compliance' | 'engagement' | 'name' | 'last_activity'>('compliance')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadClientData()
  }, [coachId, selectedPeriod])

  const loadClientData = async () => {
    if (!coachId) return
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      setLoading(true)
      await withTimeout(
        (async () => {
          const { getCoachClientIds, getPeriodBounds } = await import('@/lib/metrics')
          const period = getPeriodBounds(selectedPeriod === 'week' ? 'this_week' : selectedPeriod === 'month' ? 'this_month' : 'last_4_weeks')
          const periodStart = period.start
          const periodEnd = period.end
          const periodStartDate = periodStart.slice(0, 10)
          const periodEndDate = periodEnd.slice(0, 10)

          const clientIds = await getCoachClientIds(coachId, true)
          if (clientIds.length === 0) {
            setRows([])
            setFlags(new Map())
            return
          }

          const { data: clientsRows, error: clientsError } = await supabase
            .from('clients')
            .select('id, client_id, status, created_at, updated_at')
            .eq('coach_id', coachId)
            .in('client_id', clientIds)
          if (clientsError) throw clientsError

          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', clientIds)

          const [
            workoutLogsRes,
            mealCompletionsRes,
            habitLogsRes,
            assignmentsRes,
            workoutDurationsRes,
            mealAssignRes,
            habitsRes,
          ] = await Promise.all([
            supabase
              .from('workout_logs')
              .select('client_id, completed_at')
              .in('client_id', clientIds)
              .not('completed_at', 'is', null)
              .gte('completed_at', periodStart)
              .lt('completed_at', periodEnd),
            supabase
              .from('meal_completions')
              .select('client_id, completed_at')
              .in('client_id', clientIds)
              .gte('completed_at', periodStart)
              .lt('completed_at', periodEnd),
            supabase
              .from('habit_logs')
              .select('client_id, log_date')
              .in('client_id', clientIds)
              .gte('log_date', periodStartDate)
              .lt('log_date', periodEndDate),
            supabase.from('workout_assignments').select('client_id, scheduled_date, assigned_date').in('client_id', clientIds),
            supabase
              .from('workout_logs')
              .select('client_id, total_duration_minutes')
              .in('client_id', clientIds)
              .not('completed_at', 'is', null)
              .not('total_duration_minutes', 'is', null)
              .gte('completed_at', periodStart)
              .lt('completed_at', periodEnd),
            supabase.from('meal_plan_assignments').select('client_id').in('client_id', clientIds).eq('is_active', true),
            supabase.from('habits').select('client_id').in('client_id', clientIds).eq('is_active', true),
          ])

          const nutritionSet = new Set((mealAssignRes.data || []).map((r: { client_id: string }) => r.client_id))
          const habitConfiguredSet = new Set((habitsRes.data || []).map((r: { client_id: string }) => r.client_id))

          const flagMap = new Map<string, { hasNutritionPlan: boolean; hasHabitsConfigured: boolean }>()
          clientIds.forEach((id) => {
            flagMap.set(id, {
              hasNutritionPlan: nutritionSet.has(id),
              hasHabitsConfigured: habitConfiguredSet.has(id),
            })
          })
          setFlags(flagMap)

          const workoutLogs = workoutLogsRes.data || []
          const nutritionRows = mealCompletionsRes.data || []
          const habitRows = habitLogsRes.data || []
          const assignments = assignmentsRes.data || []
          const durations = workoutDurationsRes.data || []

          const daysInPeriod =
            Math.ceil((new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / (24 * 60 * 60 * 1000)) || 30
          const assignedByClient: Record<string, number> = {}
          clientIds.forEach((id) => (assignedByClient[id] = 0))
          assignments.forEach((r: { client_id: string; scheduled_date?: string; assigned_date?: string }) => {
            const d = (r.scheduled_date || r.assigned_date) ?? ''
            if (d >= periodStartDate && d < periodEndDate) assignedByClient[r.client_id] = (assignedByClient[r.client_id] || 0) + 1
          })

          const profileMap = new Map((profiles || []).map((p: { id: string }) => [p.id, p]))
          const today = new Date().toISOString().split('T')[0]

          const clientsWithData: ComplianceDashboardData[] = (clientsRows || []).map(
            (row: { id: string; client_id: string; created_at?: string; updated_at?: string }) => {
              const clientId = row.client_id
              const profile = profileMap.get(clientId) as { first_name?: string; last_name?: string; email?: string } | undefined
              const hasNutritionPlan = nutritionSet.has(clientId)
              const hasHabitsConfigured = habitConfiguredSet.has(clientId)

              const wCount = workoutLogs.filter((w: { client_id: string }) => w.client_id === clientId).length
              const nDays = new Set(
                nutritionRows
                  .filter((n: { client_id: string }) => n.client_id === clientId)
                  .map((n: { completed_at: string }) => new Date(n.completed_at).toISOString().slice(0, 10))
              ).size
              const hDays = new Set(
                habitRows.filter((h: { client_id: string }) => h.client_id === clientId).map((h: { log_date: string }) => h.log_date)
              ).size
              const assigned = assignedByClient[clientId] || 0
              const workoutCompliance = assigned > 0 ? Math.min(100, Math.round((wCount / assigned) * 100)) : 0
              const nutritionCompliance =
                hasNutritionPlan && daysInPeriod > 0 ? Math.min(100, Math.round((nDays / daysInPeriod) * 100)) : 0
              const habitCompliance =
                hasHabitsConfigured && daysInPeriod > 0 ? Math.min(100, Math.round((hDays / daysInPeriod) * 100)) : 0

              const parts: number[] = [workoutCompliance]
              if (hasNutritionPlan) parts.push(nutritionCompliance)
              if (hasHabitsConfigured) parts.push(habitCompliance)
              const overallCompliance = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0

              const sessionDurations = durations
                .filter((d: { client_id: string }) => d.client_id === clientId)
                .map((d: { total_duration_minutes: number | null }) => d.total_duration_minutes ?? 0)
              const avgDuration =
                sessionDurations.length > 0 ? Math.round(sessionDurations.reduce((a: number, b: number) => a + b, 0) / sessionDurations.length) : 0

              const compliance = {
                id: '',
                client_id: clientId,
                coach_id: coachId,
                metric_date: today,
                workout_compliance: workoutCompliance,
                nutrition_compliance: nutritionCompliance,
                habit_compliance: habitCompliance,
                session_attendance: workoutCompliance,
                overall_compliance: overallCompliance,
                engagement_score: Math.min(100, Math.round((wCount * 10 + nDays * 5 + hDays * 3) / 2)),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
              const engagement = {
                id: '',
                client_id: clientId,
                coach_id: coachId,
                engagement_date: today,
                app_logins: 0,
                workout_sessions: wCount,
                nutrition_logs: nutritionRows.filter((n: { client_id: string }) => n.client_id === clientId).length,
                habit_completions: habitRows.filter((h: { client_id: string }) => h.client_id === clientId).length,
                messages_sent: 0,
                progress_updates: 0,
                feature_usage: {},
                session_duration: avgDuration,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
              const milestones: ComplianceDashboardData['milestones'] = []
              const alerts: ComplianceDashboardData['alerts'] = []
              const insights = ClientComplianceTracker.generateInsights(compliance, engagement, milestones)
              const recommendations = ClientComplianceTracker.generateRecommendations(compliance, engagement, alerts)
              const trends = {
                compliance_trend: 'stable' as const,
                engagement_trend: 'stable' as const,
                workout_trend: 'stable' as const,
                nutrition_trend: 'stable' as const,
              }

              return {
                client: {
                  id: clientId,
                  first_name: profile?.first_name,
                  last_name: profile?.last_name,
                  email: profile?.email ?? '',
                  fitness_level: undefined,
                  goals: [],
                  join_date: row.created_at?.split('T')[0] ?? '',
                  last_active: row.updated_at?.split('T')[0] ?? '',
                },
                compliance,
                engagement,
                milestones,
                alerts,
                trends,
                insights,
                recommendations,
              }
            }
          )

          setRows(clientsWithData)
        })(),
        45000,
        'loadClientData'
      )
    } catch (error) {
      console.error('Error loading client compliance data:', error)
      setRows([])
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  const getComplianceLevel = (score: number) => ClientComplianceTracker.getComplianceLevel(score)

  const distribution = useMemo(() => {
    const excellent = rows.filter((c) => c.compliance.overall_compliance >= 90).length
    const good = rows.filter((c) => c.compliance.overall_compliance >= 75 && c.compliance.overall_compliance < 90).length
    const fair = rows.filter((c) => c.compliance.overall_compliance >= 60 && c.compliance.overall_compliance < 75).length
    const poor = rows.filter((c) => c.compliance.overall_compliance >= 50 && c.compliance.overall_compliance < 60).length
    const critical = rows.filter((c) => c.compliance.overall_compliance < 50).length
    return { excellent, good, fair, poor, critical }
  }, [rows])

  const stats = useMemo(() => {
    const totalClients = rows.length
    const avgCompliance = rows.length > 0 ? rows.reduce((sum, c) => sum + c.compliance.overall_compliance, 0) / rows.length : 0
    const criticalAlerts = rows.reduce(
      (sum, c) => sum + c.alerts.filter((a) => a.alert_level === 'critical').length,
      0
    )
    return { totalClients, avgCompliance, criticalAlerts }
  }, [rows])

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return rows
      .filter((r) => {
        if (filterLevel !== 'all') {
          const complianceLevel = getComplianceLevel(r.compliance.overall_compliance)
          if (complianceLevel.level !== filterLevel) return false
        }
        if (!q) return true
        const name = `${r.client.first_name ?? ''} ${r.client.last_name ?? ''}`.toLowerCase()
        const email = (r.client.email ?? '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'compliance':
            return b.compliance.overall_compliance - a.compliance.overall_compliance
          case 'engagement':
            return b.compliance.engagement_score - a.compliance.engagement_score
          case 'name':
            return (a.client.first_name || '').localeCompare(b.client.first_name || '')
          case 'last_activity': {
            const da = a.client.last_active ? new Date(a.client.last_active).getTime() : 0
            const db = b.client.last_active ? new Date(b.client.last_active).getTime() : 0
            return db - da
          }
          default:
            return 0
        }
      })
  }, [rows, filterLevel, sortBy, searchQuery])

  if (loading) {
    return <PageSkeleton variant="dashboard" />
  }

  const avgPct = Math.round(stats.avgCompliance ?? 0)
  const avgColor =
    avgPct <= 0 ? 'var(--critical)' : avgPct < 50 ? 'var(--critical)' : avgPct < 75 ? 'var(--warning)' : 'var(--good)'

  return (
    <div className="space-y-4">
      <AnalyticsHero
        accent="warning"
        eyebrow="Compliance dashboard"
        title="At-risk pulse"
        subtitle="Follow-through, missed sessions, and at-risk clients"
        stats={[
          { num: stats.totalClients, label: 'Active clients', color: 'var(--cyan)' },
          { num: `${avgPct}%`, label: 'Avg compliance', color: avgColor },
          { num: stats.criticalAlerts, label: 'Critical alerts', color: 'var(--warning)' },
        ]}
      />

      <div
        className="flex items-center gap-2 rounded-[13px] border px-3 py-2"
        style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <Search className="size-3 shrink-0" style={{ color: 'var(--t3)' }} aria-hidden />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clients..."
          className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] outline-none"
          style={{ color: 'var(--t1)' }}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid flex-1 grid-cols-2 gap-2">
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger
            className="h-auto min-h-0 w-full justify-between rounded-[11px] border py-2 px-2.5 text-[11.5px] shadow-none"
            style={{ background: 'var(--card-2)', borderColor: 'var(--line)', color: 'var(--t2)' }}
          >
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="excellent">Excellent</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="fair">Fair</SelectItem>
            <SelectItem value="poor">Poor</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger
            className="h-auto min-h-0 w-full justify-between rounded-[11px] border py-2 px-2.5 text-[11.5px] shadow-none"
            style={{ background: 'var(--card-2)', borderColor: 'var(--line)', color: 'var(--t2)' }}
          >
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="compliance">Sort: Compliance</SelectItem>
            <SelectItem value="engagement">Sort: Engagement</SelectItem>
            <SelectItem value="last_activity">Sort: Last activity</SelectItem>
            <SelectItem value="name">Sort: Name</SelectItem>
          </SelectContent>
        </Select>
        </div>
        <button
          type="button"
          onClick={loadClientData}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-[10px] border px-2.5 py-2 text-[11px] transition-colors hover:bg-white/[0.04] sm:self-auto"
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

      <DistributionViz totalClients={stats.totalClients} distribution={distribution} />
      <QuickActions />

      <div className="space-y-3">
        {filteredAndSorted.map((row) => {
          const f = flags.get(row.client.id) ?? { hasNutritionPlan: false, hasHabitsConfigured: false }
          return (
            <ComplianceClientCard
              key={row.client.id}
              row={row}
              hasNutritionPlan={f.hasNutritionPlan}
              hasHabitsConfigured={f.hasHabitsConfigured}
            />
          )
        })}
      </div>

      {filteredAndSorted.length === 0 ? (
        <div
          className="rounded-[18px] border p-8 text-center text-sm"
          style={{ background: 'var(--card)', borderColor: 'var(--line)', color: 'var(--t3)' }}
        >
          No clients found
        </div>
      ) : null}
    </div>
  )
}

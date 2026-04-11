'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BarChart3, CheckCircle, XCircle, Calendar, Apple, Dumbbell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getPeriodBounds } from '@/lib/metrics/period'
import { getNutritionCompliance } from '@/lib/metrics/nutrition'
import { getClientNutritionGoals, getNutritionComplianceTrend } from '@/lib/nutritionLogService'

interface ClientAdherenceViewProps {
  clientId: string
}

export default function ClientAdherenceView({ clientId }: ClientAdherenceViewProps) {
  const [loading, setLoading] = useState(true)
  const [adherenceData, setAdherenceData] = useState({
    workoutAdherence: 0,
    nutritionAdherence: null as number | null,
    hasNutritionGoals: false,
    weeklyAverage: 0,
    thisWeek: { completed: 0, missed: 0, total: 0 },
    /** Mon–Sun: whether that program day has required slots and all are completed (non-skipped). */
    weekActivityStrip: [] as { hasSlot: boolean; done: boolean }[],
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [assignmentsRes, mealPlanRes, goalsRes] = await Promise.all([
          supabase
            .from('program_assignments')
            .select('id, program_id')
            .eq('client_id', clientId)
            .eq('status', 'active')
            .limit(1),
          supabase
            .from('meal_plan_assignments')
            .select('id')
            .eq('client_id', clientId)
            .eq('is_active', true)
            .limit(1),
          supabase
            .from('goals')
            .select('id')
            .eq('client_id', clientId)
            .eq('pillar', 'nutrition')
            .eq('status', 'active')
            .limit(1)
        ])

        const assignment = assignmentsRes.data?.[0]
        const hasMealPlan = (mealPlanRes.data?.length ?? 0) > 0
        const hasNutritionGoals = (goalsRes.data?.length ?? 0) > 0 || false

        let workoutAdherence = 0
        let weeklyAverage = 0
        let thisWeek = { completed: 0, missed: 0, total: 0 }
        let weekActivityStrip: { hasSlot: boolean; done: boolean }[] = Array.from(
          { length: 7 },
          () => ({ hasSlot: false, done: false })
        )

        if (assignment && !cancelled) {
          const { data: progress } = await supabase
            .from('program_progress')
            .select('current_week_number')
            .eq('program_assignment_id', assignment.id)
            .single()
          const weekNum = progress?.current_week_number ?? 1
          const { data: slots } = await supabase
            .from('program_schedule')
            .select('id, is_optional, day_of_week')
            .eq('program_id', assignment.program_id)
            .eq('week_number', weekNum)
          const requiredSlots = (slots || []).filter((s: { is_optional?: boolean }) => !s.is_optional)
          const assigned = requiredSlots.length
          const requiredScheduleIds = new Set(requiredSlots.map((s: { id: string }) => s.id))
          const { data: completions } = await supabase
            .from('program_day_completions')
            .select('program_schedule_id, notes')
            .eq('program_assignment_id', assignment.id)
          const completedForWeek = (completions || []).filter(
            (c: { program_schedule_id: string; notes?: string | null }) =>
              requiredScheduleIds.has(c.program_schedule_id) &&
              !String(c.notes || '').startsWith('Skipped by coach')
          )
          const completedRequired = completedForWeek.length
          const completed = Math.min(assigned, completedRequired)
          workoutAdherence = assigned > 0 ? Math.round((completed / assigned) * 100) : 0
          weeklyAverage = workoutAdherence
          thisWeek = { completed, missed: Math.max(0, assigned - completed), total: assigned }

          const completedIds = new Set(
            completedForWeek.map((c: { program_schedule_id: string }) => c.program_schedule_id)
          )
          const requiredByDay: Record<number, string[]> = {}
          for (const s of requiredSlots as { id: string; day_of_week?: number }[]) {
            const dow =
              typeof s.day_of_week === 'number' && s.day_of_week >= 0 && s.day_of_week <= 6
                ? s.day_of_week
                : 0
            if (!requiredByDay[dow]) requiredByDay[dow] = []
            requiredByDay[dow].push(s.id)
          }
          weekActivityStrip = Array.from({ length: 7 }, (_, dow) => {
            const ids = requiredByDay[dow] || []
            const hasSlot = ids.length > 0
            const done = hasSlot && ids.every((id) => completedIds.has(id))
            return { hasSlot, done }
          })
        }

        let nutritionAdherence: number | null = null
        if (hasMealPlan || hasNutritionGoals) {
          const period = getPeriodBounds('this_week')
          if (hasMealPlan) {
            const result = await getNutritionCompliance(clientId, period, 'this_week')
            if (!cancelled) nutritionAdherence = result.ratePercent
          } else {
            const startStr = period.start.slice(0, 10)
            const endDate = new Date(period.end)
            endDate.setUTCDate(endDate.getUTCDate() - 1)
            const endStr = endDate.toISOString().slice(0, 10)
            const trend = await getNutritionComplianceTrend(clientId, startStr, endStr)
            if (!cancelled && trend.length > 0) {
              const sum = trend.reduce((s, d) => s + d.compliance, 0)
              nutritionAdherence = Math.round(sum / trend.length)
            }
          }
        }

        if (!cancelled) {
          setAdherenceData({
            workoutAdherence,
            nutritionAdherence,
            hasNutritionGoals: hasMealPlan || hasNutritionGoals,
            weeklyAverage,
            thisWeek,
            weekActivityStrip,
          })
        }
      } catch (err) {
        if (!cancelled) setAdherenceData({
          workoutAdherence: 0,
          nutritionAdherence: null,
          hasNutritionGoals: false,
          weeklyAverage: 0,
          thisWeek: { completed: 0, missed: 0, total: 0 },
          weekActivityStrip: [],
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [clientId])

  if (loading) {
    return (
      <div className="fc-card-shell p-6 text-center fc-text-dim">
        Loading adherence…
      </div>
    )
  }

  const showSetupHint =
    adherenceData.thisWeek.total === 0 &&
    adherenceData.nutritionAdherence == null &&
    !adherenceData.hasNutritionGoals

  if (showSetupHint) {
    return (
      <div className="text-center py-12 px-4 fc-card-shell">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-[color:var(--fc-text-dim)]" />
        <h3 className="text-lg font-semibold mb-2 fc-text-primary">No adherence data yet</h3>
        <p className="text-sm text-[color:var(--fc-text-dim)] mb-6 max-w-md mx-auto">
          Assign an active program and a meal plan (or nutrition goals) to track how consistently this client
          follows their plan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline" className="fc-btn fc-btn-secondary">
            <Link href={`/coach/clients/${clientId}/workouts`}>
              <Dumbbell className="w-4 h-4 mr-2" />
              Workouts &amp; programs
            </Link>
          </Button>
          <Button asChild className="fc-btn fc-btn-primary">
            <Link href={`/coach/clients/${clientId}/meals`}>
              <Apple className="w-4 h-4 mr-2" />
              Meals &amp; nutrition
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="fc-card-shell p-5 text-center">
          <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts">
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold fc-text-primary leading-tight">
            {adherenceData.workoutAdherence}%
          </p>
          <p className="text-sm fc-text-dim">Workout Adherence</p>
        </div>

        <div className="fc-card-shell p-5 text-center">
          <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts">
            <BarChart3 className="w-5 h-5" />
          </div>
          {adherenceData.nutritionAdherence != null ? (
            <>
              <p className="text-3xl font-bold fc-text-primary leading-tight">
                {adherenceData.nutritionAdherence}%
              </p>
              <p className="text-sm fc-text-dim">Nutrition Adherence</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium fc-text-subtle leading-tight">
                No nutrition goals set
              </p>
              <p className="text-sm fc-text-dim">Nutrition Adherence</p>
            </>
          )}
        </div>

        <div className="fc-card-shell p-5 text-center">
          <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold fc-text-primary leading-tight">
            {adherenceData.weeklyAverage}%
          </p>
          <p className="text-sm fc-text-dim">Weekly Average</p>
        </div>
      </div>

      {/* This Week Summary */}
      <div className="fc-card-shell p-6">
        <h3 className="text-xl font-semibold fc-text-primary mb-4">This Week</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-4 py-4 text-center">
            <CheckCircle className="w-7 h-7 mb-2 fc-text-success mx-auto" />
            <p className="text-2xl font-semibold fc-text-primary">
              {adherenceData.thisWeek.completed}
            </p>
            <p className="text-sm fc-text-subtle">Completed</p>
          </div>

          <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-4 py-4 text-center">
            <XCircle className="w-7 h-7 mb-2 fc-text-error mx-auto" />
            <p className="text-2xl font-semibold fc-text-primary">
              {adherenceData.thisWeek.missed}
            </p>
            <p className="text-sm fc-text-subtle">Missed</p>
          </div>

          <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-4 py-4 text-center">
            <Calendar className="w-7 h-7 mb-2 fc-text-workouts mx-auto" />
            <p className="text-2xl font-semibold fc-text-primary">
              {adherenceData.thisWeek.total}
            </p>
            <p className="text-sm fc-text-subtle">Scheduled</p>
          </div>
        </div>
      </div>

      {/* Weekly Calendar View (program week = rolling from start date; not calendar week) */}
      <div className="fc-card-shell p-6">
        <h3 className="text-xl font-semibold fc-text-primary mb-4">7-Day Activity</h3>
        <p className="text-xs fc-text-dim mb-3">Program week — completed vs scheduled above.</p>
        <div className="grid grid-cols-7 gap-2 min-w-0 overflow-x-auto">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
            const cell = adherenceData.weekActivityStrip[i]
            const isCompleted = cell?.done === true
            const noSlot = cell && !cell.hasSlot
            return (
              <div key={i} className="text-center min-w-[2.5rem]">
                <div
                  className={`w-full aspect-square flex items-center justify-center mb-2 rounded-2xl border ${
                    noSlot
                      ? 'opacity-30 fc-glass-soft border-[color:var(--fc-glass-border)]'
                      : isCompleted
                        ? 'bg-[color:var(--fc-domain-workouts)] fc-text-primary border-transparent'
                        : 'fc-glass-soft border-[color:var(--fc-glass-border)] fc-text-subtle'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold fc-text-subtle">{day}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


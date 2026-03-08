'use client'

import { useState, useEffect } from 'react'
import { BarChart3, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ClientAdherenceViewProps {
  clientId: string
}

export default function ClientAdherenceView({ clientId }: ClientAdherenceViewProps) {
  const [loading, setLoading] = useState(true)
  const [adherenceData, setAdherenceData] = useState({
    workoutAdherence: 0,
    nutritionAdherence: 0,
    weeklyAverage: 0,
    thisWeek: { completed: 0, missed: 0, total: 0 }
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: assignments } = await supabase
          .from('program_assignments')
          .select('id, program_id')
          .eq('client_id', clientId)
          .eq('status', 'active')
          .limit(1)
        const assignment = assignments?.[0]
        if (!assignment || cancelled) return

        const { data: progress } = await supabase
          .from('program_progress')
          .select('current_week_number')
          .eq('program_assignment_id', assignment.id)
          .single()
        const weekNum = progress?.current_week_number ?? 1
        const { data: slots } = await supabase
          .from('program_schedule')
          .select('id')
          .eq('program_id', assignment.program_id)
          .eq('week_number', weekNum)
        const assigned = slots?.length ?? 0
        const { data: completions } = await supabase
          .from('program_day_completions')
          .select('id, program_schedule_id, program_schedule!inner(week_number)')
          .eq('program_assignment_id', assignment.id)
        const completedInWeek = (completions || []).filter((c: any) => (c.program_schedule?.week_number ?? 0) === weekNum).length
        const completed = Math.min(assigned, completedInWeek)
        if (!cancelled) {
          setAdherenceData({
            workoutAdherence: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
            nutritionAdherence: 0,
            weeklyAverage: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
            thisWeek: { completed, missed: Math.max(0, assigned - completed), total: assigned }
          })
        }
      } catch (err) {
        if (!cancelled) setAdherenceData({
          workoutAdherence: 0,
          nutritionAdherence: 0,
          weeklyAverage: 0,
          thisWeek: { completed: 0, missed: 0, total: 0 }
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
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6 text-center fc-text-dim">
        Loading adherence…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
          <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts">
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold fc-text-primary leading-tight">
            {adherenceData.workoutAdherence}%
          </p>
          <p className="text-sm fc-text-dim">Workout Adherence</p>
        </div>

        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
          <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts">
            <BarChart3 className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold fc-text-primary leading-tight">
            {adherenceData.nutritionAdherence}%
          </p>
          <p className="text-sm fc-text-dim">Nutrition Adherence</p>
        </div>

        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5 text-center">
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
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
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
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
        <h3 className="text-xl font-semibold fc-text-primary mb-4">7-Day Activity</h3>
        <p className="text-xs fc-text-dim mb-3">Program week — completed vs scheduled above.</p>
        <div className="grid grid-cols-7 gap-2">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
            const isCompleted = false
            return (
              <div key={i} className="text-center">
                <div
                  className={`w-full aspect-square flex items-center justify-center mb-2 rounded-2xl border ${
                    isCompleted
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


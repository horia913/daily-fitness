'use client'

import { useState, useEffect } from 'react'
import { Flame, Droplet, Footprints, Heart, CheckCircle, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { HabitTracker } from '@/lib/habitTracker'

interface ClientHabitsViewProps {
  clientId: string
}

interface HabitData {
  id: string
  name: string
  icon: any
  gradient: string
  current: string
  target: string
  streak: number
  weekData: boolean[]
  completionRate: number
  stats?: {
    currentStreak: number
    longestStreak: number
    totalCompletions: number
    completionRate: number
  }
}

export default function ClientHabitsView({ clientId }: ClientHabitsViewProps) {
  const [habits, setHabits] = useState<HabitData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHabits()
  }, [clientId])

  const loadHabits = async () => {
    try {
      setLoading(true)
      
      // Get client's active habit assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('habit_assignments')
        .select(`
          id,
          habit_id,
          start_date,
          habits(
            name,
            description,
            frequency_type,
            target_days,
            icon
          )
        `)
        .eq('client_id', clientId)
        .eq('is_active', true)

      if (assignmentsError) throw assignmentsError

      if (!assignments || assignments.length === 0) {
        setHabits([])
        setLoading(false)
        return
      }

      // Get habit logs for last 30 days for analytics
      const assignmentIds = assignments.map(a => a.id)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const startDate = thirtyDaysAgo.toISOString().split('T')[0]

      const { data: logs, error: logsError } = await supabase
        .from('habit_logs')
        .select('assignment_id, log_date')
        .in('assignment_id', assignmentIds)
        .gte('log_date', startDate)
        .order('log_date', { ascending: false })

      if (logsError) throw logsError

      // Get last 7 days for week view
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const weekStartDate = sevenDaysAgo.toISOString().split('T')[0]

      const { data: weekLogs } = await supabase
        .from('habit_logs')
        .select('assignment_id, log_date')
        .in('assignment_id', assignmentIds)
        .gte('log_date', weekStartDate)

      // Process each habit assignment
      const habitsData: HabitData[] = await Promise.all(
        assignments.map(async (assignment: any) => {
          const habit = assignment.habits
          const assignmentLogs = (logs || []).filter(l => l.assignment_id === assignment.id)
          const weekAssignmentLogs = (weekLogs || []).filter(l => l.assignment_id === assignment.id)

          // Calculate week data (last 7 days)
          const weekData: boolean[] = []
          for (let i = 6; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]
            weekData.push(weekAssignmentLogs.some(l => l.log_date === dateStr))
          }

          // Calculate stats using HabitTracker
          const entries = assignmentLogs.map((log: any) => ({
            id: log.id || '',
            user_habit_id: assignment.id,
            entry_date: log.log_date,
            completed_value: 1,
            target_value: 1,
            is_completed: true,
            created_at: log.log_date,
            updated_at: log.log_date
          }))

          const stats = HabitTracker.calculateStreak(entries)
          const completionRate = Math.round((weekData.filter(d => d).length / 7) * 100)

          // Determine icon based on habit name
          let Icon = Heart
          if (habit.name?.toLowerCase().includes('water')) Icon = Droplet
          else if (habit.name?.toLowerCase().includes('step')) Icon = Footprints
          else if (habit.name?.toLowerCase().includes('cardio') || habit.name?.toLowerCase().includes('exercise')) Icon = Flame

          return {
            id: assignment.id,
            name: habit.name || 'Habit',
            icon: Icon,
            gradient: 'from-indigo-500 to-purple-600',
            current: `${stats.totalCompletions} completions`,
            target: `${habit.target_days || 7} days/week`,
            streak: stats.currentStreak,
            weekData,
            completionRate,
            stats
          }
        })
      )

      setHabits(habitsData)
    } catch (error) {
      console.error('Error loading habits:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (habits.length === 0) {
    return (
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-8 text-center">
        <div className="mx-auto mb-4 fc-icon-tile fc-icon-habits w-14 h-14">
          <Flame className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold fc-text-primary mb-2">
          No Active Habits
        </h3>
        <p className="text-sm fc-text-dim">
          Assign a habit to start tracking consistency.
        </p>
      </div>
    )
  }

  const avgCompletion = Math.round(
    habits.reduce((sum, habit) => sum + habit.completionRate, 0) / habits.length
  )
  const activeStreaks = habits.filter((habit) => habit.streak > 0).length

  return (
    <div className="space-y-6">
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-habits">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-habits text-xs">
                Habits
              </span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                Consistency Overview
              </h3>
              <p className="text-sm fc-text-dim">
                Weekly adherence and streak momentum
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
            <p className="text-3xl font-bold fc-text-primary">{habits.length}</p>
            <p className="text-sm fc-text-dim">Active Habits</p>
          </div>
          <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
            <p className="text-3xl font-bold fc-text-primary">{activeStreaks}</p>
            <p className="text-sm fc-text-dim">Streaks Running</p>
          </div>
          <div className="fc-glass-soft rounded-2xl border border-[color:var(--fc-glass-border)] p-4 text-center">
            <p className="text-3xl font-bold fc-text-primary">{avgCompletion}%</p>
            <p className="text-sm fc-text-dim">Avg Completion</p>
          </div>
        </div>
      </div>

      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-habits">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-habits text-xs">
                Weekly Tracking
              </span>
              <h3 className="text-lg font-semibold fc-text-primary mt-2">
                Habit Activity
              </h3>
            </div>
            <span className="ml-auto fc-pill fc-pill-glass fc-text-habits text-xs">
              {habits.length}
            </span>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
      {habits.map((habit) => {
        const Icon = habit.icon
        
        return (
          <div
            key={habit.id}
            className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-5"
          >
            <div className="flex items-start gap-4">
              <div className="fc-icon-tile fc-icon-habits">
                <Icon className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold fc-text-primary">{habit.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="fc-pill fc-pill-glass fc-text-warning text-xs">
                      {habit.streak} day streak
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <span className="text-sm fc-text-subtle">
                    Current: <span className="font-semibold fc-text-primary">{habit.current}</span>
                  </span>
                  <span className="text-sm fc-text-subtle">
                    Target: <span className="font-semibold fc-text-primary">{habit.target}</span>
                  </span>
                  <span className="fc-pill fc-pill-glass fc-text-success text-xs">
                    {habit.completionRate}% this week
                  </span>
                </div>

                {/* Analytics Section */}
                {habit.stats && (
                  <div className="mb-3 p-3 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 fc-text-subtle" />
                      <span className="text-xs font-semibold fc-text-subtle">
                        Analytics (Last 30 Days)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="fc-text-subtle">Longest:</span>
                        <span className="font-semibold ml-1 fc-text-primary">
                          {habit.stats.longestStreak} days
                        </span>
                      </div>
                      <div>
                        <span className="fc-text-subtle">Total:</span>
                        <span className="font-semibold ml-1 fc-text-primary">
                          {habit.stats.totalCompletions}
                        </span>
                      </div>
                      <div>
                        <span className="fc-text-subtle">Rate:</span>
                        <span className="font-semibold ml-1 fc-text-primary">
                          {Math.round(habit.stats.completionRate)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7-Day Visual */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs fc-text-subtle">
                    <span>Last 7 days</span>
                    <span>{habit.weekData.filter(Boolean).length}/7</span>
                  </div>
                  <div className="flex gap-2">
                  {habit.weekData.map((completed, i) => (
                    <div
                      key={i}
                      className={`flex-1 flex items-center justify-center h-8 rounded-xl border ${
                        completed
                          ? 'bg-[color:var(--fc-domain-habits)] fc-text-primary border-transparent'
                          : 'fc-glass-soft border-[color:var(--fc-glass-border)] fc-text-subtle'
                      }`}
                    >
                      {completed && <CheckCircle className="w-4 h-4" />}
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
        </div>
      </div>
    </div>
  )
}


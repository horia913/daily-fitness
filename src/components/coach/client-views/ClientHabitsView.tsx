'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useTheme } from '@/contexts/ThemeContext'
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
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
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
          <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (habits.length === 0) {
    return (
      <div className="text-center py-12">
        <p className={theme.textSecondary}>No active habits for this client</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {habits.map((habit) => {
        const Icon = habit.icon
        
        return (
          <div key={habit.id} className={`p-[1px] bg-gradient-to-r ${habit.gradient}`} style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
              <CardContent style={{ padding: '20px' }}>
                <div className="flex items-start gap-4">
                  <div className={`bg-gradient-to-br ${habit.gradient} flex items-center justify-center flex-shrink-0 shadow-md`} style={{ width: '48px', height: '48px', borderRadius: '16px' }}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`${theme.text}`} style={{ fontSize: '18px', fontWeight: '600' }}>{habit.name}</h4>
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                          {habit.streak} day streak
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <span className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>
                        Current: <span className="font-bold text-slate-800 dark:text-slate-200">{habit.current}</span>
                      </span>
                      <span className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>
                        Target: <span className="font-bold text-slate-800 dark:text-slate-200">{habit.target}</span>
                      </span>
                      <span className="text-green-600 dark:text-green-400" style={{ fontSize: '14px', fontWeight: '600' }}>
                        {habit.completionRate}% this week
                      </span>
                    </div>

                    {/* Analytics Section */}
                    {habit.stats && (
                      <div className="mb-3 p-3 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }} />
                          <span className="text-xs font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                            Analytics (Last 30 Days)
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className={theme.textSecondary}>Longest:</span>
                            <span className="font-bold ml-1" style={{ color: isDark ? '#fff' : '#1A1A1A' }}>
                              {habit.stats.longestStreak} days
                            </span>
                          </div>
                          <div>
                            <span className={theme.textSecondary}>Total:</span>
                            <span className="font-bold ml-1" style={{ color: isDark ? '#fff' : '#1A1A1A' }}>
                              {habit.stats.totalCompletions}
                            </span>
                          </div>
                          <div>
                            <span className={theme.textSecondary}>Rate:</span>
                            <span className="font-bold ml-1" style={{ color: isDark ? '#fff' : '#1A1A1A' }}>
                              {Math.round(habit.stats.completionRate)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 7-Day Visual */}
                    <div className="flex gap-2">
                      {habit.weekData.map((completed, i) => (
                        <div
                          key={i}
                          className={`flex-1 flex items-center justify-center ${
                            completed 
                              ? 'bg-green-500 text-white' 
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                          }`}
                          style={{ height: '32px', borderRadius: '12px' }}
                        >
                          {completed && <CheckCircle className="w-4 h-4" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}


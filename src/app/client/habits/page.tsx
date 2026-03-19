'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast-provider'
import { Flame, Target, CheckCircle, ChevronDown, LayoutGrid, Repeat, Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/withTimeout'
interface HabitAssignment {
  id: string
  habit_id: string
  habit_name: string
  habit_description?: string
  habit_icon?: string
  frequency_type: 'daily' | 'weekly'
  target_days: number
  start_date: string
  is_logged_today: boolean
  streak_days: number
  completion_rate: number
  category?: string
  /** Last 7 days (oldest to newest): true if logged that day */
  week_days_logged?: boolean[]
}

export default function ClientHabitsPage() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null)
  const [habits, setHabits] = useState<HabitAssignment[]>([])
  const [optimisticUpdates, setOptimisticUpdates] = useState<Set<string>>(new Set())
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showAddHabitForm, setShowAddHabitForm] = useState(false)
  const [addingHabit, setAddingHabit] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitDescription, setNewHabitDescription] = useState('')
  const [newHabitFrequencyType, setNewHabitFrequencyType] = useState<'daily' | 'weekly'>('daily')
  const [newHabitTargetDays, setNewHabitTargetDays] = useState('1')
  /** Last 90 days: date string -> number of habits completed that day */
  const [heatmapData, setHeatmapData] = useState<Map<string, number>>(new Map())
  /** Last 30 days: { daysWithCompletion, totalDays } for completion rate */
  const [completionRate30, setCompletionRate30] = useState<{ daysWithCompletion: number; totalDays: number }>({ daysWithCompletion: 0, totalDays: 30 })

  const loadHabits = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setLoadError(null)
    setLoadingStartedAt(Date.now())
    try {
      await withTimeout(
        (async () => {
      const today = new Date().toISOString().split('T')[0]

      // Get user's active habit assignments
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
        .eq('client_id', user.id)
        .eq('is_active', true)

      if (assignmentsError) throw assignmentsError

      if (!assignments || assignments.length === 0) {
        setHabits([])
        setHeatmapData(new Map())
        setCompletionRate30({ daysWithCompletion: 0, totalDays: 30 })
        return
      }

      // 90-day heatmap: habit_logs by client_id
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const ninetyStr = ninetyDaysAgo.toISOString().split('T')[0]
      const { data: allLogs } = await supabase
        .from('habit_logs')
        .select('log_date')
        .eq('client_id', user.id)
        .gte('log_date', ninetyStr)
      const dateToCount = new Map<string, number>()
      for (const row of allLogs || []) {
        const d = (row as { log_date: string }).log_date
        dateToCount.set(d, (dateToCount.get(d) || 0) + 1)
      }
      setHeatmapData(dateToCount)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
      const thirtyStr = thirtyDaysAgo.toISOString().split('T')[0]
      let daysWithCompletion = 0
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        if (dateToCount.get(dateStr)) daysWithCompletion++
      }
      setCompletionRate30({ daysWithCompletion, totalDays: 30 })

      // Get today's habit logs
      const assignmentIds = assignments.map(a => a.id)
      const { data: todayLogs, error: logsError } = await supabase
        .from('habit_logs')
        .select('assignment_id')
        .in('assignment_id', assignmentIds)
        .eq('log_date', today)

      if (logsError) throw logsError

      const loggedToday = new Set((todayLogs || []).map(log => log.assignment_id))

      // Get streak data and completion rates
      const habitsWithStats: HabitAssignment[] = await Promise.all(
        assignments.map(async (assignment) => {
          // Get streak data
          const { data: recentLogs } = await supabase
            .from('habit_logs')
            .select('log_date')
            .eq('assignment_id', assignment.id)
            .order('log_date', { ascending: false })
            .limit(30)

          // Calculate streak
          let streakDays = 0
          if (recentLogs && recentLogs.length > 0) {
            const today = new Date()
            let currentDate = new Date(today)
            
            for (const log of recentLogs) {
              const logDate = new Date(log.log_date)
              const daysDiff = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24))
              
              if (daysDiff <= 1) {
                streakDays++
                currentDate = logDate
              } else {
                break
              }
            }
          }

          // Calculate completion rate for the last 7 days
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          const weekAgoStr = weekAgo.toISOString().split('T')[0]

          const { data: weekLogs } = await supabase
            .from('habit_logs')
            .select('log_date')
            .eq('assignment_id', assignment.id)
            .gte('log_date', weekAgoStr)

          const habit = Array.isArray(assignment.habits) ? assignment.habits[0] : assignment.habits
          const expectedDays = habit?.frequency_type === 'daily' ? 7 : habit?.target_days || 1
          const completedDays = weekLogs?.length || 0
          const completionRate = Math.round((completedDays / expectedDays) * 100)

          const weekDates: string[] = []
          for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            weekDates.push(d.toISOString().split('T')[0])
          }
          const loggedSet = new Set((weekLogs || []).map((r: { log_date: string }) => r.log_date))
          const weekDaysLogged = weekDates.map(date => loggedSet.has(date))

          return {
            id: assignment.id,
            habit_id: assignment.habit_id,
            habit_name: habit?.name || 'Unknown Habit',
            habit_description: habit?.description,
            habit_icon: habit?.icon || '🎯',
            frequency_type: habit?.frequency_type || 'daily',
            target_days: habit?.target_days || 1,
            start_date: assignment.start_date,
            is_logged_today: loggedToday.has(assignment.id),
            streak_days: streakDays,
            completion_rate: completionRate,
            category: 'wellness',
            week_days_logged: weekDaysLogged
          }
        })
      )

      setHabits(habitsWithStats)
        })(),
        30000,
        'timeout'
      )
    } catch (error: any) {
      console.error('Error loading habits:', error)
      setHabits([])
      setLoadError(error?.message === 'timeout' ? 'Loading took too long. Please try again.' : (error?.message || 'Failed to load habits'))
    } finally {
      setLoading(false)
      setLoadingStartedAt(null)
    }
  }, [user])

  useEffect(() => {
    if (user) loadHabits()
  }, [loadHabits])


  const handleHabitToggle = async (assignmentId: string) => {
    const habit = habits.find(h => h.id === assignmentId)
    if (!habit) return

    const isCurrentlyCompleted = habit.is_logged_today
    const willBeCompleted = !isCurrentlyCompleted

    // Optimistic UI update
    setOptimisticUpdates(prev => new Set(prev).add(assignmentId))
    setHabits(prevHabits =>
      prevHabits.map(h =>
        h.id === assignmentId 
          ? { ...h, is_logged_today: willBeCompleted }
          : h
      )
    )

    try {
      const today = new Date().toISOString().split('T')[0]

      if (willBeCompleted) {
        const { error } = await supabase
          .from('habit_logs')
          .insert({
            assignment_id: assignmentId,
            client_id: user?.id,
            log_date: today
          })

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('habit_logs')
          .delete()
          .eq('assignment_id', assignmentId)
          .eq('log_date', today)

        if (error) throw error
      }
    } catch (error) {
      console.error('Error updating habit log:', error)
      
      // Revert optimistic update on error
      setHabits(prevHabits =>
        prevHabits.map(h =>
          h.id === assignmentId 
            ? { ...h, is_logged_today: !willBeCompleted }
            : h
        )
      )
    } finally {
      setOptimisticUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(assignmentId)
        return newSet
      })
    }
  }

  const completedHabitsCount = habits.filter(habit => habit.is_logged_today).length
  const allHabitsCompleted = completedHabitsCount === habits.length && habits.length > 0
  const totalStreakDays = habits.reduce((sum, habit) => sum + habit.streak_days, 0)
  const averageCompletionRate = habits.length > 0 
    ? Math.round(habits.reduce((sum, habit) => sum + habit.completion_rate, 0) / habits.length)
    : 0

  const getMotivationalMessage = () => {
    if (allHabitsCompleted) {
      return "Amazing! You've completed all your habits today! 🎉"
    } else if (completedHabitsCount > 0) {
      return `Great progress! ${completedHabitsCount} habit${completedHabitsCount > 1 ? 's' : ''} completed today! 💪`
    } else {
      return "Ready to build some healthy habits today? Let's do this! 🌟"
    }
  }

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'fitness': return 'from-green-500 to-emerald-600'
      case 'hydration': return 'from-blue-500 to-cyan-600'
      case 'wellness': return 'from-purple-500 to-violet-600'
      case 'sleep': return 'from-indigo-500 to-blue-600'
      default: return 'from-slate-500 to-slate-600'
    }
  }

  const getCategoryIconBg = (category?: string) => {
    switch (category) {
      case 'fitness': return 'bg-green-500/10 border-green-500/20'
      case 'hydration': return 'bg-blue-500/10 border-blue-500/20'
      case 'wellness': return 'bg-purple-500/10 border-purple-500/20'
      case 'sleep': return 'bg-indigo-500/10 border-indigo-500/20'
      default: return 'bg-[color:var(--fc-domain-neutral)]/10 border-[color:var(--fc-glass-border)]'
    }
  }

  const getStreakColor = (streak: number) => {
    if (streak >= 21) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    if (streak >= 7) return 'text-orange-600 bg-orange-50 border-orange-200'
    if (streak >= 3) return 'text-green-600 bg-green-50 border-green-200'
    return 'text-[color:var(--fc-text-dim)] bg-[color:var(--fc-glass-highlight)] border-[color:var(--fc-glass-border)]'
  }

  const handleCreateHabit = async () => {
    if (!user) return

    const trimmedName = newHabitName.trim()
    if (!trimmedName) {
      addToast({ title: 'Please enter a habit name', variant: 'default' })
      return
    }

    const parsedTargetDays = Number.parseInt(newHabitTargetDays, 10)
    if (!Number.isFinite(parsedTargetDays) || parsedTargetDays < 1 || parsedTargetDays > 7) {
      addToast({ title: 'Target days must be between 1 and 7', variant: 'default' })
      return
    }

    setAddingHabit(true)
    try {
      const habitPayload = {
        coach_id: user.id,
        name: trimmedName,
        description: newHabitDescription.trim() || null,
        frequency_type: newHabitFrequencyType,
        target_days: parsedTargetDays
      }

      console.info('[Habits][DB Request]', {
        table: 'habits',
        operation: 'INSERT',
        payload: habitPayload
      })

      const { data: newHabit, error: habitInsertError } = await supabase
        .from('habits')
        .insert(habitPayload)
        .select('id')
        .single()

      if (habitInsertError) {
        throw {
          table: 'habits',
          operation: 'INSERT',
          payload: habitPayload,
          dbError: habitInsertError
        }
      }

      const assignmentPayload = {
        habit_id: newHabit.id,
        client_id: user.id,
        start_date: new Date().toISOString().split('T')[0]
      }

      console.info('[Habits][DB Request]', {
        table: 'habit_assignments',
        operation: 'INSERT',
        payload: assignmentPayload
      })

      const { error: assignmentInsertError } = await supabase
        .from('habit_assignments')
        .insert(assignmentPayload)

      if (assignmentInsertError) {
        throw {
          table: 'habit_assignments',
          operation: 'INSERT',
          payload: assignmentPayload,
          dbError: assignmentInsertError
        }
      }

      addToast({ title: 'Habit added', variant: 'success' })
      setShowAddHabitForm(false)
      setNewHabitName('')
      setNewHabitDescription('')
      setNewHabitFrequencyType('daily')
      setNewHabitTargetDays('1')
      await loadHabits()
    } catch (error: any) {
      const dbError = error?.dbError || error
      const table = error?.table || 'unknown'
      const operation = error?.operation || 'unknown'
      const payload = error?.payload || null
      const message = dbError?.message || 'Failed to add habit'

      console.error('[Habits][DB Error]', {
        table,
        operation,
        payload,
        code: dbError?.code,
        message: dbError?.message,
        details: dbError?.details,
        hint: dbError?.hint
      })

      if (
        dbError?.code === '42501' ||
        String(dbError?.message || '').toLowerCase().includes('row-level security')
      ) {
        addToast({ title: `Permission error while saving habit (${table} ${operation})`, variant: 'destructive' })
      } else {
        addToast({ title: message, variant: 'destructive' })
      }
    } finally {
      setAddingHabit(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-10 sm:px-6 lg:px-10">
            <GlassCard elevation={2} className="fc-glass fc-card p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-20 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                  ))}
                </div>
                <div className="h-80 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
              </div>
            </GlassCard>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    )
  }

  if (loadError) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-10 sm:px-6 lg:px-10">
            <GlassCard elevation={2} className="fc-glass fc-card p-8 text-center">
              <p className="text-[color:var(--fc-text-dim)] mb-4">{loadError}</p>
              <Button type="button" onClick={() => { setLoadError(null); setLoading(true); loadHabits(); }} className="fc-btn fc-btn-primary">
                Retry
              </Button>
            </GlassCard>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    )
  }

  const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak_days), 0) : 0
  const weekdayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const getDayLabels = () => {
    const out: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      out.push(weekdayLetters[d.getDay()])
    }
    return out
  }
  const dayLabels = getDayLabels()

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-6xl fc-page flex flex-col pb-36" style={{ gap: "var(--fc-gap-sections)" }}>
          {/* Header: title left, streak badge right */}
          <header>
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight fc-text-primary">
                  Daily Habits
                </h1>
                <p className="text-sm fc-text-dim mt-1">
                  {getMotivationalMessage()}
                </p>
              </div>
              {habits.length > 0 && (
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)] shadow-lg fc-text-success font-bold text-sm font-mono">
                  <Flame className="w-5 h-5 fill-current" />
                  {totalStreakDays} day{totalStreakDays !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Stats grid: 4 cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GlassCard elevation={1} className="fc-glass fc-card p-4 flex flex-col justify-center rounded-2xl">
                <span className="text-sm fc-text-subtle mb-1">Active habits</span>
                <span className="text-2xl font-bold font-mono fc-text-primary">{habits.length}</span>
              </GlassCard>
              <GlassCard elevation={1} className="fc-glass fc-card p-4 flex flex-col justify-center rounded-2xl border-l-4 border-l-[color:var(--fc-status-success)]">
                <span className="text-sm fc-text-subtle mb-1">Today</span>
                <span className="text-2xl font-bold font-mono fc-text-primary">{completedHabitsCount}<span className="text-lg opacity-50">/{habits.length || 1}</span></span>
              </GlassCard>
              <GlassCard elevation={1} className="fc-glass fc-card p-4 hidden md:flex flex-col justify-center rounded-2xl">
                <span className="text-sm fc-text-subtle mb-1">Completion rate</span>
                <span className="text-2xl font-bold font-mono fc-text-primary">{averageCompletionRate}%</span>
              </GlassCard>
              <GlassCard elevation={1} className="fc-glass fc-card p-4 hidden md:flex flex-col justify-center rounded-2xl">
                <span className="text-sm fc-text-subtle mb-1">Best streak</span>
                <span className="text-2xl font-bold font-mono fc-text-primary">{bestStreak}</span>
              </GlassCard>
            </div>
          </header>

          {/* Habit completion heatmap — only when client has habits */}
          {habits.length > 0 && (
            <section className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-4 sm:p-6">
              <h2 className="text-lg font-semibold fc-text-primary mb-2 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5" />
                Completion overview
              </h2>
              <p className="text-sm fc-text-dim mb-3">Last 90 days</p>
              <div className="grid grid-cols-7 gap-[3px] mb-3" style={{ width: 'min(100%, 280px)' }}>
                {(() => {
                  const today = new Date().toISOString().split('T')[0]
                  const days: string[] = []
                  for (let i = 89; i >= 0; i--) {
                    const d = new Date()
                    d.setDate(d.getDate() - i)
                    days.push(d.toISOString().split('T')[0])
                  }
                  const maxCount = Math.max(...Array.from(heatmapData.values()), 1)
                  return days.map((dateStr) => {
                    const count = heatmapData.get(dateStr) || 0
                    const intensity = maxCount > 0 ? count / maxCount : 0
                    const isToday = dateStr === today
                    return (
                      <div
                        key={dateStr}
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{
                          backgroundColor: intensity === 0
                            ? 'var(--fc-glass-highlight)'
                            : `color-mix(in srgb, var(--fc-status-success) ${Math.round(30 + intensity * 70)}%, transparent)`,
                          border: isToday ? '2px solid var(--fc-accent-primary)' : 'none',
                        }}
                        title={`${dateStr}: ${count} habit${count !== 1 ? 's' : ''} completed`}
                      />
                    )
                  })
                })()}
              </div>
              <p className="text-sm fc-text-dim">
                Completion rate: {completionRate30.totalDays > 0 ? Math.round((completionRate30.daysWithCompletion / completionRate30.totalDays) * 100) : 0}% ({completionRate30.daysWithCompletion} of {completionRate30.totalDays} days)
              </p>
            </section>
          )}

          {/* Section: Today's checklist + habit cards */}
          <section className="space-y-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold fc-text-primary flex items-center gap-2">
                Today&apos;s checklist
                {habits.length > 0 && completedHabitsCount < habits.length && (
                  <span className="w-2 h-2 rounded-full bg-[color:var(--fc-status-success)] animate-pulse" aria-hidden />
                )}
              </h2>
              <Button
                type="button"
                onClick={() => setShowAddHabitForm((prev) => !prev)}
                className="fc-btn fc-btn-primary h-10 px-4 rounded-xl font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add habit
              </Button>
            </div>

            {showAddHabitForm && (
              <GlassCard elevation={2} className="fc-glass fc-card p-4 rounded-2xl border border-[color:var(--fc-glass-border)]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm fc-text-subtle mb-1">Habit name</label>
                    <Input
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                      placeholder="e.g., Drink 2L water"
                      className="h-11"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm fc-text-subtle mb-1">Description (optional)</label>
                    <Input
                      value={newHabitDescription}
                      onChange={(e) => setNewHabitDescription(e.target.value)}
                      placeholder="Short note"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-sm fc-text-subtle mb-1">Frequency</label>
                    <select
                      value={newHabitFrequencyType}
                      onChange={(e) => setNewHabitFrequencyType(e.target.value as 'daily' | 'weekly')}
                      className="w-full h-11 rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] px-3 fc-text-primary"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm fc-text-subtle mb-1">Target days (1-7)</label>
                    <Input
                      value={newHabitTargetDays}
                      onChange={(e) => setNewHabitTargetDays(e.target.value)}
                      inputMode="numeric"
                      placeholder="1"
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() => setShowAddHabitForm(false)}
                    className="fc-btn fc-btn-secondary h-10 px-4 rounded-xl"
                    disabled={addingHabit}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateHabit}
                    className="fc-btn fc-btn-primary h-10 px-4 rounded-xl"
                    disabled={addingHabit}
                  >
                    {addingHabit ? 'Adding...' : 'Save habit'}
                  </Button>
                </div>
              </GlassCard>
            )}

            {habits.length > 0 ? (
              <div className="space-y-6">
                {habits.map(habit => (
                  <GlassCard key={habit.id} elevation={2} className="fc-glass fc-card p-5 rounded-2xl border border-[color:var(--fc-glass-border)] transition-all hover:border-[color:var(--fc-glass-border-strong)]">
                    <div className="flex items-center gap-5 mb-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border ${getCategoryIconBg(habit.category)}`}>
                        {habit.habit_icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg fc-text-primary">{habit.habit_name}</h3>
                          </div>
                          <div className="relative w-10 h-10 flex-shrink-0">
                            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                              <circle cx="20" cy="20" r="16" fill="none" stroke="var(--fc-glass-border)" strokeWidth="3" />
                              <circle cx="20" cy="20" r="16" fill="none" stroke="var(--fc-status-success)" strokeWidth="3" strokeLinecap="round"
                                strokeDasharray={`${habit.completion_rate * 1.005} 999`} />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold fc-text-primary">
                              {habit.completion_rate}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleHabitToggle(habit.id)}
                        disabled={optimisticUpdates.has(habit.id)}
                        className={`fc-btn h-12 w-12 rounded-2xl flex-shrink-0 border-2 ${habit.is_logged_today ? 'fc-btn-primary border-transparent' : 'fc-btn-secondary border-[color:var(--fc-glass-border)]'}`}
                      >
                        <CheckCircle className="w-6 h-6" />
                      </Button>
                    </div>
                    {habit.week_days_logged && (
                      <div className="flex items-center justify-between pt-4 border-t border-[color:var(--fc-glass-border)]">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {habit.week_days_logged.map((logged, i) => (
                            <div
                              key={i}
                              className={`w-8 h-8 rounded-lg border flex items-center justify-center text-[10px] font-mono ${
                                logged ? 'fc-text-success bg-[color:var(--fc-status-success)]/20 border-[color:var(--fc-status-success)]/40' : 'border-[color:var(--fc-glass-border)] fc-text-subtle'
                              }`}
                            >
                              {dayLabels[i]}
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] uppercase tracking-widest fc-text-subtle font-bold">
                          {habit.streak_days} day{habit.streak_days !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </GlassCard>
                ))}
              </div>
            ) : (
              <GlassCard elevation={2} className="fc-glass fc-card p-8 rounded-2xl">
                <EmptyState
                  icon={Repeat}
  title="No habits yet"
  description="Your coach will assign habits for you, or ask them to add some. Small daily wins build big results!"
                />
              </GlassCard>
            )}
          </section>

          {/* Collapsible: Weekly progress */}
          {habits.length > 0 && (
            <section className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="w-full flex justify-between items-center p-6 hover:bg-[color:var(--fc-glass-soft)] transition-colors text-left"
              >
                <h3 className="text-xl font-semibold fc-text-primary">Weekly Performance</h3>
                <ChevronDown className={`w-5 h-5 fc-text-subtle transition-transform ${showAnalytics ? 'rotate-180' : ''}`} />
              </button>
              {showAnalytics && (
                <div className="px-6 pb-6 pt-0 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="23" fill="none" stroke="var(--fc-glass-border)" strokeWidth="4" />
                        <circle cx="28" cy="28" r="23" fill="none" stroke="var(--fc-status-success)" strokeWidth="4" strokeLinecap="round"
                          strokeDasharray={`${averageCompletionRate * 1.445} 999`} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold fc-text-primary">
                        {averageCompletionRate}%
                      </span>
                    </div>
                    <p className="text-sm fc-text-dim">Weekly average</p>
                  </div>
                  <div className="space-y-4">
                    {habits.map(habit => (
                      <div key={habit.id} className="fc-glass-soft fc-card p-4 rounded-xl border border-[color:var(--fc-glass-border)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold fc-text-primary">{habit.habit_name}</span>
                          <Badge className={`text-xs ${getStreakColor(habit.streak_days)}`}>
                            <Flame className="w-3 h-3 mr-1" />
                            {habit.streak_days}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="fc-text-subtle">Completion</span>
                            <span className="font-mono font-bold fc-text-primary ml-2">{habit.completion_rate}%</span>
                          </div>
                          <div>
                            <span className="fc-text-subtle">Today</span>
                            <span className="font-semibold fc-text-primary ml-2">{habit.is_logged_today ? 'Done' : 'Pending'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

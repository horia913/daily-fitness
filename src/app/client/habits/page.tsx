'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast-provider'
import { Flame, CheckCircle, ChevronDown, Repeat, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { withTimeout } from '@/lib/withTimeout'
import { ClientPageShell } from '@/components/client-ui'
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

function habitScheduleLabel(habit: HabitAssignment): string {
  if (habit.frequency_type === 'daily') return 'DAILY'
  return `WEEKLY · ${habit.target_days}x / WK`
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

  const getStreakBadgeClass = (streak: number) => {
    if (streak >= 21) return 'text-amber-200 border-amber-500/30 bg-amber-500/10'
    if (streak >= 7) return 'text-orange-200 border-orange-500/30 bg-orange-500/10'
    if (streak >= 3) return 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10'
    return 'text-gray-300 border-white/10 bg-white/[0.06]'
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
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
            <div className="animate-pulse space-y-3">
              <div className="h-10 rounded-xl bg-[color:var(--fc-glass-highlight)]"></div>
              <div className="h-4 w-full rounded bg-[color:var(--fc-glass-highlight)]"></div>
              <div className="h-48 rounded-xl bg-[color:var(--fc-glass-highlight)]"></div>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    )
  }

  if (loadError) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <p className="text-sm text-gray-400 mb-3">{loadError}</p>
              <Button type="button" onClick={() => { setLoadError(null); setLoading(true); loadHabits(); }} className="fc-btn fc-btn-primary h-10 text-sm">
                Retry
              </Button>
            </div>
          </ClientPageShell>
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
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
          <header className="mb-4">
            <h1 className="text-xl font-bold text-white tracking-tight">Daily Habits</h1>
            <p className="text-sm text-gray-500 mt-1">{getMotivationalMessage()}</p>
          </header>

          {habits.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 mb-4">
              <div className="flex items-center justify-between gap-1">
                <div className="flex-1 min-w-0 text-center">
                  <p className="text-base font-semibold text-white tabular-nums">{habits.length}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">Active</p>
                </div>
                <div className="w-px h-8 bg-white/10 shrink-0" aria-hidden />
                <div className="flex-1 min-w-0 text-center">
                  <p className="text-base font-semibold text-white tabular-nums">
                    {completedHabitsCount}/{habits.length}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">Today</p>
                </div>
                <div className="w-px h-8 bg-white/10 shrink-0" aria-hidden />
                <div className="flex-1 min-w-0 text-center">
                  <p className="text-base font-semibold text-white tabular-nums">{averageCompletionRate}%</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">Avg week</p>
                </div>
                <div className="w-px h-8 bg-white/10 shrink-0" aria-hidden />
                <div className="flex-1 min-w-0 text-center">
                  <p className="text-base font-semibold text-white tabular-nums">{bestStreak}d</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">Best streak</p>
                </div>
              </div>
            </div>
          )}

          {habits.length > 0 && (
            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70 mb-2">
                Completion heatmap · last 90 days
              </p>
              <div className="overflow-x-auto -mx-1 px-1 pb-1">
                <div
                  className="grid grid-cols-7 gap-[3px] mb-3 mx-auto"
                  style={{ minWidth: 280, width: 'min(100%, 280px)' }}
                >
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
              </div>
              <p className="text-xs text-gray-500">
                30-day rate:{' '}
                {completionRate30.totalDays > 0
                  ? Math.round((completionRate30.daysWithCompletion / completionRate30.totalDays) * 100)
                  : 0}
                % ({completionRate30.daysWithCompletion}/{completionRate30.totalDays} days)
              </p>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70 flex items-center gap-2">
                Today&apos;s checklist
                {habits.length > 0 && completedHabitsCount < habits.length && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
                )}
              </h2>
              <Button
                type="button"
                onClick={() => setShowAddHabitForm((prev) => !prev)}
                className="fc-btn fc-btn-primary h-9 px-3 rounded-lg text-sm font-semibold shrink-0"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add habit
              </Button>
            </div>

            {showAddHabitForm && (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
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
              </div>
            )}

            {habits.length > 0 ? (
              <div className="space-y-3">
                {habits.map((habit) => (
                  <div
                    key={habit.id}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-xl">
                          {habit.habit_icon}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="text-base font-semibold tracking-tight text-white truncate">
                            {habit.habit_name}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-gray-500">
                            {habitScheduleLabel(habit)}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <div className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-white/[0.04] px-2 py-0.5">
                          <Flame className="h-2.5 w-2.5 shrink-0 text-amber-400" aria-hidden />
                          <span className="text-[11px] font-medium tabular-nums text-gray-300">
                            {habit.streak_days === 1 ? '1 day' : `${habit.streak_days}d`}
                          </span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleHabitToggle(habit.id)}
                          disabled={optimisticUpdates.has(habit.id)}
                          className={cn(
                            'fc-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 p-0',
                            habit.is_logged_today
                              ? 'fc-btn-primary border-transparent'
                              : 'fc-btn-secondary border-white/10',
                          )}
                          aria-pressed={habit.is_logged_today}
                          aria-label={habit.is_logged_today ? 'Mark incomplete' : 'Mark complete'}
                        >
                          <CheckCircle className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                        style={{ width: `${Math.min(100, Math.max(0, habit.completion_rate))}%` }}
                      />
                    </div>
                    {habit.habit_description ? (
                      <p className="mt-2 line-clamp-1 text-sm text-gray-400">{habit.habit_description}</p>
                    ) : null}
                    {habit.week_days_logged && (
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                          {habit.week_days_logged.map((logged, i) => (
                            <div
                              key={i}
                              className={cn(
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[10px] font-mono',
                                logged
                                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                  : 'border-white/10 text-gray-500',
                              )}
                            >
                              {dayLabels[i]}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 px-4 text-center">
                <Repeat className="mx-auto h-8 w-8 text-gray-600 mb-3" strokeWidth={1.25} aria-hidden />
                <p className="text-sm text-gray-400">No habits yet</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  Your coach can assign habits, or use Add habit above. Small daily wins add up.
                </p>
              </div>
            )}
          </section>

          {habits.length > 0 && (
            <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="flex w-full items-center justify-between py-3 px-4 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span className="text-sm font-semibold uppercase tracking-wider text-cyan-300/70">
                  Weekly performance
                </span>
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 text-gray-500 transition-transform', showAnalytics && 'rotate-180')}
                  aria-hidden
                />
              </button>
              {showAnalytics && (
                <div className="space-y-4 border-t border-white/5 px-4 pb-4 pt-3">
                  <div className="flex items-center gap-4">
                    <div className="relative h-12 w-12 shrink-0">
                      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="23" fill="none" stroke="var(--fc-glass-border)" strokeWidth="4" />
                        <circle
                          cx="28"
                          cy="28"
                          r="23"
                          fill="none"
                          stroke="var(--fc-status-success)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${averageCompletionRate * 1.445} 999`}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                        {averageCompletionRate}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Weekly average completion</p>
                  </div>
                  <div className="space-y-3">
                    {habits.map((habit) => (
                      <div
                        key={habit.id}
                        className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-white">{habit.habit_name}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'shrink-0 border text-[10px] gap-0.5 px-1.5 py-0 bg-transparent',
                              getStreakBadgeClass(habit.streak_days),
                            )}
                          >
                            <Flame className="h-2.5 w-2.5" />
                            {habit.streak_days}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-500">Completion</span>
                            <span className="ml-2 font-mono font-semibold tabular-nums text-white">
                              {habit.completion_rate}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Today</span>
                            <span className="ml-2 font-medium text-white">
                              {habit.is_logged_today ? 'Done' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

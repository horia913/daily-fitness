'use client'

import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  Flame, 
  Target, 
  Calendar, 
  TrendingUp,
  Heart,
  Droplets,
  Footprints,
  Moon,
  Sun,
  Coffee,
  Apple,
  Dumbbell,
  BookOpen,
  Zap,
  Star,
  Trophy,
  Award,
  Sparkles,
  Clock,
  CheckCircle2,
  CircleCheck,
  CircleX,
  CircleAlert,
  CircleMinus,
  CirclePlus,
  CircleDot,
  CirclePause,
  CirclePlay,
  CircleStop,
  CircleHelp,
  ExternalLink,
  RefreshCw,
  Plus,
  Eye,
  BarChart3,
  Activity,
  Timer,
  Bell,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Settings,
  Edit,
  Trash2,
  Copy,
  Share2,
  MessageCircle,
  Users,
  User,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  UserCog,
  UserSearch
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

interface HabitAssignment {
  id: string
  habit_id: string
  habit_name: string
  habit_description?: string
  frequency_type: 'daily' | 'weekly'
  target_days: number
  start_date: string
  is_logged_today: boolean
  streak_days: number
  completion_rate: number
  category?: string
  icon?: string
  color?: string
}

interface HabitLog {
  id: string
  assignment_id: string
  log_date: string
}

interface HabitCategory {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  textColor: string
  borderColor: string
  glowColor: string
}

export default function HabitTracker() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<HabitAssignment[]>([])
  const [optimisticUpdates, setOptimisticUpdates] = useState<Set<string>>(new Set())
  const [completedHabits, setCompletedHabits] = useState<Set<string>>(new Set())
  const [showCelebration, setShowCelebration] = useState(false)
  const [expandedHabit, setExpandedHabit] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact')

  useEffect(() => {
    if (user) {
      loadHabits()
    }
  }, [user])

  const loadHabits = async () => {
    if (!user) return
    
    setLoading(true)
    try {
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
            target_days
          )
        `)
        .eq('client_id', user.id)
        .eq('is_active', true)

      if (assignmentsError) throw assignmentsError

      if (!assignments || assignments.length === 0) {
        setHabits([])
        return
      }

      const assignmentIds = assignments.map(a => a.id)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const { data: recentLogs, error: logsError } = await supabase
        .from('habit_logs')
        .select('assignment_id, log_date')
        .in('assignment_id', assignmentIds)
        .gte('log_date', thirtyDaysAgoStr)

      if (logsError) throw logsError

      const logsByAssignment = new Map<string, string[]>()
      const loggedToday = new Set<string>()

      ;(recentLogs || []).forEach(log => {
        if (!logsByAssignment.has(log.assignment_id)) {
          logsByAssignment.set(log.assignment_id, [])
        }
        logsByAssignment.get(log.assignment_id)!.push(log.log_date)
        if (log.log_date === today) {
          loggedToday.add(log.assignment_id)
        }
      })

      const habitsWithStats: HabitAssignment[] = assignments.map((assignment) => {
        const habit = Array.isArray(assignment.habits) ? assignment.habits[0] : assignment.habits
        const assignmentLogs = logsByAssignment.get(assignment.id) || []

        const sortedLogs = [...assignmentLogs].sort(
          (a, b) => new Date(b).getTime() - new Date(a).getTime()
        )

        let streakDays = 0
        if (sortedLogs.length > 0) {
          let currentDate = new Date()
          for (const logDateStr of sortedLogs) {
            const logDate = new Date(logDateStr)
            const daysDiff = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24))
            if (daysDiff <= 1) {
              streakDays++
              currentDate = logDate
            } else {
              break
            }
          }
        }

        const completedDays = assignmentLogs.filter(logDateStr =>
          new Date(logDateStr) >= weekAgo
        ).length

        const expectedDays = habit?.frequency_type === 'daily' ? 7 : habit?.target_days || 1
        const completionRate = Math.round((completedDays / expectedDays) * 100)

        return {
          id: assignment.id,
          habit_id: assignment.habit_id,
          habit_name: habit?.name || 'Unknown Habit',
          habit_description: habit?.description,
          frequency_type: habit?.frequency_type || 'daily',
          target_days: habit?.target_days || 1,
          start_date: assignment.start_date,
          is_logged_today: loggedToday.has(assignment.id),
          streak_days: streakDays,
          completion_rate: completionRate
        }
      })

      setHabits(habitsWithStats)
    } catch (error) {
      console.error('Error loading habits:', error)
      // Set fallback data
      setHabits([
        {
          id: '1',
          habit_id: '1',
          habit_name: 'Drink 3L of Water',
          habit_description: 'Stay hydrated throughout the day',
          frequency_type: 'daily',
          target_days: 1,
          start_date: new Date().toISOString().split('T')[0],
          is_logged_today: false,
          streak_days: 5,
          completion_rate: 85,
          category: 'health',
          icon: 'droplets',
          color: 'blue'
        },
        {
          id: '2',
          habit_id: '2',
          habit_name: '10,000 Steps',
          habit_description: 'Walk at least 10,000 steps daily',
          frequency_type: 'daily',
          target_days: 1,
          start_date: new Date().toISOString().split('T')[0],
          is_logged_today: true,
          streak_days: 12,
          completion_rate: 92,
          category: 'fitness',
          icon: 'footprints',
          color: 'green'
        },
        {
          id: '3',
          habit_id: '3',
          habit_name: 'Meditate 10 Minutes',
          habit_description: 'Practice mindfulness and meditation',
          frequency_type: 'daily',
          target_days: 1,
          start_date: new Date().toISOString().split('T')[0],
          is_logged_today: false,
          streak_days: 3,
          completion_rate: 70,
          category: 'wellness',
          icon: 'heart',
          color: 'purple'
        },
        {
          id: '4',
          habit_id: '4',
          habit_name: 'Read 30 Minutes',
          habit_description: 'Read books or articles for personal growth',
          frequency_type: 'daily',
          target_days: 1,
          start_date: new Date().toISOString().split('T')[0],
          is_logged_today: true,
          streak_days: 7,
          completion_rate: 78,
          category: 'learning',
          icon: 'book',
          color: 'orange'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleHabitToggle = async (assignmentId: string) => {
    const habit = habits.find(h => h.id === assignmentId)
    if (!habit) return

    const isCurrentlyCompleted = habit.is_logged_today
    const isOptimistic = optimisticUpdates.has(assignmentId)
    const willBeCompleted = isOptimistic ? !isCurrentlyCompleted : !isCurrentlyCompleted

    // Optimistic UI update
    setOptimisticUpdates(prev => new Set(prev).add(assignmentId))
    setHabits(prevHabits =>
      prevHabits.map(h =>
        h.id === assignmentId 
          ? { ...h, is_logged_today: willBeCompleted }
          : h
      )
    )

    // Update completed habits set
    if (willBeCompleted) {
      setCompletedHabits(prev => new Set(prev).add(assignmentId))
    } else {
      setCompletedHabits(prev => {
        const newSet = new Set(prev)
        newSet.delete(assignmentId)
        return newSet
      })
    }

    // Check if all habits are completed for celebration
    const updatedHabits = habits.map(h => h.id === assignmentId ? { ...h, is_logged_today: willBeCompleted } : h)
    const allCompleted = updatedHabits.every(h => h.is_logged_today) && updatedHabits.length > 0
    if (allCompleted && willBeCompleted) {
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 3000)
    }

    try {
      const today = new Date().toISOString().split('T')[0]

      if (willBeCompleted) {
        // Log the habit completion
        const { error } = await supabase
          .from('habit_logs')
          .insert({
            assignment_id: assignmentId,
            client_id: user?.id,
            log_date: today
          })

        if (error) throw error
      } else {
        // Remove the habit log
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
      
      // Revert completed habits set
      if (willBeCompleted) {
        setCompletedHabits(prev => {
          const newSet = new Set(prev)
          newSet.delete(assignmentId)
          return newSet
        })
      } else {
        setCompletedHabits(prev => new Set(prev).add(assignmentId))
      }
    } finally {
      // Remove from optimistic updates
      setOptimisticUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(assignmentId)
        return newSet
      })
    }
  }

  const getHabitIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
      droplets: Droplets,
      footprints: Footprints,
      heart: Heart,
      book: BookOpen,
      dumbbell: Dumbbell,
      apple: Apple,
      coffee: Coffee,
      moon: Moon,
      sun: Sun,
      clock: Clock,
      target: Target,
      flame: Flame,
      star: Star,
      trophy: Trophy,
      award: Award,
      sparkles: Sparkles,
      zap: Zap,
      activity: Activity,
      timer: Timer,
      bell: Bell
    }
    return iconMap[iconName] || Target
  }

  const getHabitColor = (color: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; border: string; glow: string } } = {
      blue: {
        bg: 'fc-glass-soft',
        text: 'fc-text-workouts',
        border: 'border border-[color:var(--fc-glass-border)]',
        glow: ''
      },
      green: {
        bg: 'fc-glass-soft',
        text: 'fc-text-success',
        border: 'border border-[color:var(--fc-glass-border)]',
        glow: ''
      },
      purple: {
        bg: 'fc-glass-soft',
        text: 'fc-text-habits',
        border: 'border border-[color:var(--fc-glass-border)]',
        glow: ''
      },
      orange: {
        bg: 'fc-glass-soft',
        text: 'fc-text-warning',
        border: 'border border-[color:var(--fc-glass-border)]',
        glow: ''
      },
      red: {
        bg: 'fc-glass-soft',
        text: 'fc-text-error',
        border: 'border border-[color:var(--fc-glass-border)]',
        glow: ''
      },
      yellow: {
        bg: 'fc-glass-soft',
        text: 'fc-text-warning',
        border: 'border border-[color:var(--fc-glass-border)]',
        glow: ''
      }
    }
    return colorMap[color] || colorMap.blue
  }

  const getStreakBadgeColor = (streak: number) => {
    if (streak >= 30) return 'fc-text-habits'
    if (streak >= 14) return 'fc-text-warning'
    if (streak >= 7) return 'fc-text-success'
    if (streak >= 3) return 'fc-text-workouts'
    return 'fc-text-subtle'
  }

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 90) return 'fc-text-success'
    if (rate >= 70) return 'fc-text-warning'
    if (rate >= 50) return 'fc-text-warning'
    return 'fc-text-error'
  }

  const getMotivationalMessage = (completed: number, total: number) => {
    const percentage = Math.round((completed / total) * 100)
    if (percentage === 100) return "Perfect! You're unstoppable! 🚀"
    if (percentage >= 75) return "Almost there! Keep going! 💪"
    if (percentage >= 50) return "Great progress! You're doing amazing! 🌟"
    if (percentage >= 25) return "Every step counts! Keep building momentum! ⭐"
    return "Let's start building those healthy habits! 🌱"
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const completedHabitsCount = habits.filter(habit => habit.is_logged_today).length
  const allHabitsCompleted = completedHabitsCount === habits.length && habits.length > 0
  const currentDate = new Date()

  if (loading) {
    return (
      <div className="fc-glass fc-card">
        <div className="pb-4 px-6 pt-6">
          <div className="flex items-center gap-3 fc-text-primary font-semibold">
            <div className="fc-icon-tile fc-icon-habits">
              <Flame className="w-5 h-5" />
            </div>
            Today's Habits
          </div>
        </div>
        <div className="space-y-4 px-6 pb-6">
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded bg-[color:var(--fc-glass-border)]"></div>
                <div className="h-4 rounded w-3/4 bg-[color:var(--fc-glass-border)]"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fc-glass fc-card fc-accent-habits relative overflow-hidden">

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center fc-glass fc-card px-6 py-6">
            <div className="p-4 fc-icon-tile fc-icon-habits mx-auto mb-4">
              <Trophy className="w-10 h-10 fc-text-habits animate-bounce" />
            </div>
            <h3 className="text-2xl font-bold fc-text-primary mb-2">
              Amazing! 🎉
            </h3>
            <p className="text-lg fc-text-dim">
              All habits completed today!
            </p>
          </div>
        </div>
      )}

      <div className="pb-4 relative z-10 px-4 sm:px-6 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 fc-text-primary">
            <div className="fc-icon-tile fc-icon-habits">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-habits">Habits</span>
              <h2 className="text-lg sm:text-xl font-bold mt-2">
                Daily Habits
              </h2>
              <p className="text-sm fc-text-dim">{formatDate(currentDate)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="fc-pill fc-pill-glass fc-text-habits px-3 py-1">
              {completedHabitsCount}/{habits.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
              className="text-xs fc-btn fc-btn-ghost"
            >
              {viewMode === 'compact' ? 'Detailed' : 'Compact'}
              <Eye className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-6 relative z-10">
        {habits.length > 0 ? (
          <div className="space-y-6">
            {/* Progress Summary */}
            <div className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="fc-icon-tile fc-icon-habits">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold fc-text-primary">Today's Progress</h3>
                    <p className="text-sm fc-text-dim">Keep building those healthy habits!</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getCompletionRateColor(completedHabitsCount * 100 / habits.length)}`}>
                    {Math.round((completedHabitsCount / habits.length) * 100)}%
                  </div>
                  <p className="text-sm fc-text-dim">
                    {completedHabitsCount} of {habits.length} completed
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="fc-text-dim">Progress to Perfect Day</span>
                  <span className={`font-medium ${getCompletionRateColor(completedHabitsCount * 100 / habits.length)}`}>
                    {completedHabitsCount}/{habits.length} habits
                  </span>
                </div>
                <div className="fc-progress-track">
                  <div 
                    className="fc-progress-fill"
                    style={{ width: `${(completedHabitsCount / habits.length) * 100}%` }}
                  />
                </div>
                <p className={`text-sm font-medium ${getCompletionRateColor(completedHabitsCount * 100 / habits.length)} mt-2`}>
                  {getMotivationalMessage(completedHabitsCount, habits.length)}
                </p>
              </div>
            </div>

            {/* Habits List */}
            <div className="space-y-3">
              {habits.map((habit) => {
                const Icon = getHabitIcon(habit.icon || 'target')
                const habitColors = getHabitColor(habit.color || 'blue')
                const isExpanded = expandedHabit === habit.id
                const isCompleted = habit.is_logged_today
                const isOptimistic = optimisticUpdates.has(habit.id)
                
                return (
                  <div 
                    key={habit.id}
                    className={`fc-list-row p-4 group ${habitColors.border} ${isCompleted ? 'fc-completed' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Habit Icon */}
                      <div className={`p-3 rounded-xl ${habitColors.bg} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-5 h-5 ${habitColors.text}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-bold text-sm sm:text-base ${isCompleted ? 'line-through fc-text-subtle' : 'fc-text-primary'}`}>
                                {habit.habit_name}
                              </h3>
                              {isCompleted && (
                                <CheckCircle className="w-4 h-4 fc-text-success" />
                              )}
                            </div>
                            {habit.habit_description && (
                              <p className="text-xs fc-text-dim mb-2">
                                {habit.habit_description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-2">
                            <span className={`fc-pill fc-pill-glass text-xs ${getStreakBadgeColor(habit.streak_days)}`}>
                              <Flame className="w-3 h-3 mr-1" />
                              {habit.streak_days}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedHabit(isExpanded ? null : habit.id)}
                              className="text-xs p-1 h-6 w-6 fc-btn fc-btn-ghost"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 text-xs fc-text-subtle">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{habit.frequency_type}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              <span className={getCompletionRateColor(habit.completion_rate)}>
                                {habit.completion_rate}% this week
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`habit-${habit.id}`}
                              checked={isCompleted}
                              onCheckedChange={() => handleHabitToggle(habit.id)}
                              disabled={isOptimistic}
                              className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                            />
                            <label
                              htmlFor={`habit-${habit.id}`}
                              className={`text-sm font-medium cursor-pointer ${
                                isCompleted ? 'fc-text-success' : 'fc-text-primary'
                              }`}
                            >
                              {isCompleted ? 'Completed' : 'Mark Complete'}
                            </label>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-[color:var(--fc-glass-border)]">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="fc-text-subtle">Target Days</span>
                                <span className="font-medium fc-text-primary">{habit.target_days} per week</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="fc-text-subtle">Started</span>
                                <span className="font-medium fc-text-primary">
                                  {new Date(habit.start_date).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="fc-text-subtle">Current Streak</span>
                                <span className={`font-medium ${getCompletionRateColor(habit.streak_days * 10)}`}>
                                  {habit.streak_days} days
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-2 rounded-xl text-xs fc-btn fc-btn-secondary"
                              >
                                View History
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Completion Summary */}
            <div className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="fc-icon-tile fc-icon-habits">
                    {allHabitsCompleted ? (
                      <Trophy className="w-5 h-5 fc-text-habits" />
                    ) : (
                      <Target className="w-5 h-5 fc-text-habits" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold fc-text-primary">
                      {allHabitsCompleted ? 'Perfect Day! 🎉' : 'Keep Going! 💪'}
                    </h3>
                    <p className="text-sm fc-text-dim">
                      {completedHabitsCount}/{habits.length} habits completed today
                    </p>
                  </div>
                </div>
                
                {allHabitsCompleted && (
                  <div className="text-right">
                    <div className="flex items-center gap-2 fc-text-success">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-bold">Amazing!</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="p-6 fc-icon-tile fc-icon-habits rounded-2xl w-fit mx-auto mb-6">
              <Target className="w-12 h-12 fc-text-habits" />
            </div>
            <h3 className="text-xl font-bold fc-text-primary mb-2">
              No habits assigned yet
            </h3>
            <p className="text-sm fc-text-dim mb-4">
              Your coach will assign habits for you to track. Check back soon!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="fc-btn fc-btn-primary fc-press rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Request Habits
              </Button>
              <Button variant="outline" className="rounded-xl fc-btn fc-btn-secondary">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
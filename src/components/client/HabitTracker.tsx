'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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
import { useTheme } from '@/contexts/ThemeContext'
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
  const { getThemeStyles } = useTheme()
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
      )

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
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        glow: 'shadow-blue-200 dark:shadow-blue-800'
      },
      green: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
        glow: 'shadow-green-200 dark:shadow-green-800'
      },
      purple: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
        glow: 'shadow-purple-200 dark:shadow-purple-800'
      },
      orange: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-200 dark:border-orange-800',
        glow: 'shadow-orange-200 dark:shadow-orange-800'
      },
      red: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800',
        glow: 'shadow-red-200 dark:shadow-red-800'
      },
      yellow: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-600 dark:text-yellow-400',
        border: 'border-yellow-200 dark:border-yellow-800',
        glow: 'shadow-yellow-200 dark:shadow-yellow-800'
      }
    }
    return colorMap[color] || colorMap.blue
  }

  const getStreakBadgeColor = (streak: number) => {
    if (streak >= 30) return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
    if (streak >= 14) return 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
    if (streak >= 7) return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
    if (streak >= 3) return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
  }

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 dark:text-green-400'
    if (rate >= 70) return 'text-yellow-600 dark:text-yellow-400'
    if (rate >= 50) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
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
  const theme = getThemeStyles()
  const currentDate = new Date()

  if (loading) {
    return (
      <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
        <CardHeader className="pb-4">
          <CardTitle className={`flex items-center gap-2 ${theme.text}`}>
            <div className="p-2 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-xl">
              <Flame className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            Today's Habits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 relative overflow-hidden`}>
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-blue-400/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="p-6 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-2xl w-fit mx-auto mb-4">
              <Trophy className="w-12 h-12 text-green-600 dark:text-green-400 animate-bounce" />
            </div>
            <h3 className={`text-2xl font-bold ${theme.text} mb-2`}>
              Amazing! 🎉
            </h3>
            <p className={`text-lg ${theme.textSecondary}`}>
              All habits completed today!
            </p>
          </div>
        </div>
      )}

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
            <div className="p-2 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-xl">
              <Flame className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Daily Habits</h2>
              <p className={`text-sm ${theme.textSecondary}`}>{formatDate(currentDate)}</p>
            </div>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-3 py-1">
              {completedHabitsCount}/{habits.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
              className="text-xs"
            >
              {viewMode === 'compact' ? 'Detailed' : 'Compact'}
              <Eye className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 relative z-10">
        {habits.length > 0 ? (
          <div className="space-y-6">
            {/* Progress Summary */}
            <div className={`${theme.card} rounded-2xl p-4 border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${theme.text}`}>Today's Progress</h3>
                    <p className={`text-sm ${theme.textSecondary}`}>Keep building those healthy habits!</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getCompletionRateColor(completedHabitsCount * 100 / habits.length)}`}>
                    {Math.round((completedHabitsCount / habits.length) * 100)}%
                  </div>
                  <p className={`text-sm ${theme.textSecondary}`}>
                    {completedHabitsCount} of {habits.length} completed
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className={`${theme.textSecondary}`}>Progress to Perfect Day</span>
                  <span className={`font-medium ${getCompletionRateColor(completedHabitsCount * 100 / habits.length)}`}>
                    {completedHabitsCount}/{habits.length} habits
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
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
                    className={`${theme.card} ${theme.shadow} rounded-2xl p-4 border-2 ${habitColors.border} hover:shadow-xl transition-all duration-300 group hover:scale-105 hover:${habitColors.glow} hover:shadow-lg ${
                      isCompleted ? 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Habit Icon */}
                      <div className={`p-3 rounded-xl ${habitColors.bg} group-hover:scale-110 transition-transform duration-300 ${
                        isCompleted ? 'bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30' : ''
                      }`}>
                        <Icon className={`w-5 h-5 ${habitColors.text} ${isCompleted ? 'text-green-600 dark:text-green-400' : ''}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-bold ${theme.text} text-sm sm:text-base ${
                                isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : ''
                              }`}>
                                {habit.habit_name}
                              </h3>
                              {isCompleted && (
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                              )}
                            </div>
                            {habit.habit_description && (
                              <p className={`text-xs ${theme.textSecondary} mb-2`}>
                                {habit.habit_description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-2">
                            <Badge className={`text-xs ${getStreakBadgeColor(habit.streak_days)}`}>
                              <Flame className="w-3 h-3 mr-1" />
                              {habit.streak_days}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedHabit(isExpanded ? null : habit.id)}
                              className="text-xs p-1 h-6 w-6"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
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
                                isCompleted ? 'text-green-600 dark:text-green-400' : theme.text
                              }`}
                            >
                              {isCompleted ? 'Completed' : 'Mark Complete'}
                            </label>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className={`${theme.textSecondary}`}>Target Days</span>
                                <span className={`font-medium ${theme.text}`}>{habit.target_days} per week</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className={`${theme.textSecondary}`}>Started</span>
                                <span className={`font-medium ${theme.text}`}>
                                  {new Date(habit.start_date).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className={`${theme.textSecondary}`}>Current Streak</span>
                                <span className={`font-medium ${getCompletionRateColor(habit.streak_days * 10)}`}>
                                  {habit.streak_days} days
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-2 rounded-xl text-xs"
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
            <div className={`${theme.card} rounded-2xl p-4 border-2 ${
              allHabitsCompleted 
                ? 'border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20' 
                : 'border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    allHabitsCompleted 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {allHabitsCompleted ? (
                      <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${theme.text}`}>
                      {allHabitsCompleted ? 'Perfect Day! 🎉' : 'Keep Going! 💪'}
                    </h3>
                    <p className={`text-sm ${theme.textSecondary}`}>
                      {completedHabitsCount}/{habits.length} habits completed today
                    </p>
                  </div>
                </div>
                
                {allHabitsCompleted && (
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
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
            <div className="p-6 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-2xl w-fit mx-auto mb-6">
              <Target className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className={`text-xl font-bold ${theme.text} mb-2`}>
              No habits assigned yet
            </h3>
            <p className={`text-sm ${theme.textSecondary} mb-4`}>
              Your coach will assign habits for you to track. Check back soon!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className={`${theme.primary} ${theme.shadow} rounded-xl`}>
                <Plus className="w-4 h-4 mr-2" />
                Request Habits
              </Button>
              <Button variant="outline" className="rounded-xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
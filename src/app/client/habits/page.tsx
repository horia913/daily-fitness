'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Flame, 
  Target, 
  CheckCircle, 
  TrendingUp, 
  Trophy, 
  Sparkles,
  Plus,
  BarChart3,
  Heart,
  Droplets,
  Dumbbell,
  Moon,
  Circle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
}

export default function ClientHabitsPage() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<HabitAssignment[]>([])
  const [optimisticUpdates, setOptimisticUpdates] = useState<Set<string>>(new Set())
  const [showAnalytics, setShowAnalytics] = useState(false)

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
            target_days,
            icon
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
            habit_icon: habit?.icon || '🎯',
            frequency_type: habit?.frequency_type || 'daily',
            target_days: habit?.target_days || 1,
            start_date: assignment.start_date,
            is_logged_today: loggedToday.has(assignment.id),
            streak_days: streakDays,
            completion_rate: completionRate,
            category: 'wellness'
          }
        })
      )

      setHabits(habitsWithStats)
    } catch (error) {
      console.error('Error loading habits:', error)
      // Set fallback data for demo
      setHabits([
        {
          id: '1',
          habit_id: '1',
          habit_name: 'Drink 3L of Water',
          habit_description: 'Stay hydrated throughout the day',
          habit_icon: '💧',
          frequency_type: 'daily',
          target_days: 1,
          start_date: new Date().toISOString().split('T')[0],
          is_logged_today: false,
          streak_days: 5,
          completion_rate: 85,
          category: 'hydration'
        },
        {
          id: '2',
          habit_id: '2',
          habit_name: '10,000 Steps',
          habit_description: 'Walk at least 10,000 steps daily',
          habit_icon: '🚶',
          frequency_type: 'daily',
          target_days: 1,
          start_date: new Date().toISOString().split('T')[0],
          is_logged_today: true,
          streak_days: 12,
          completion_rate: 92,
          category: 'fitness'
        },
        {
          id: '3',
          habit_id: '3',
          habit_name: 'Meditate 10 min',
          habit_description: 'Practice mindfulness daily',
          habit_icon: '🧘',
          frequency_type: 'daily',
          target_days: 1,
          start_date: new Date().toISOString().split('T')[0],
          is_logged_today: false,
          streak_days: 8,
          completion_rate: 78,
          category: 'wellness'
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

  const getStreakColor = (streak: number) => {
    if (streak >= 21) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    if (streak >= 7) return 'text-orange-600 bg-orange-50 border-orange-200'
    if (streak >= 3) return 'text-green-600 bg-green-50 border-green-200'
    return 'text-slate-600 bg-slate-50 border-slate-200'
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="animate-pulse">
                <div className="h-8 bg-slate-200 rounded mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen">
        <div className="p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Enhanced Header with Motivational Messaging */}
            <Card className="bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 border-0 shadow-2xl rounded-3xl overflow-hidden">
              <CardContent className="p-8 text-center relative">
                {/* Floating Sparkles Animation */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-4 left-8 w-3 h-3 bg-yellow-300 rounded-full animate-bounce"></div>
                  <div className="absolute top-8 right-12 w-2 h-2 bg-yellow-200 rounded-full animate-pulse"></div>
                  <div className="absolute bottom-6 left-16 w-2 h-2 bg-white/60 rounded-full animate-bounce delay-1000"></div>
                  <div className="absolute bottom-4 right-8 w-3 h-3 bg-yellow-300/80 rounded-full animate-pulse delay-500"></div>
                </div>
                
                <div className="relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce">
                      <Flame className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  
                  <h1 className="text-3xl font-bold text-white mb-3">
                    My Habits
                  </h1>
                  <p className="text-white/90 text-lg mb-6">
                    {getMotivationalMessage()}
                  </p>
                  
                  {/* Daily Overview */}
                  <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                      <div className="text-2xl font-bold text-white">
                        {completedHabitsCount}/{habits.length}
                      </div>
                      <div className="text-white/80 text-sm">Completed</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                      <div className="text-2xl font-bold text-white">
                        {totalStreakDays}
                      </div>
                      <div className="text-white/80 text-sm">Total Streak</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                      <div className="text-2xl font-bold text-white">
                        {averageCompletionRate}%
                      </div>
                      <div className="text-white/80 text-sm">This Week</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overall Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800 mb-1">
                    {habits.length}
                  </div>
                  <div className="text-sm text-slate-500">Total Habits</div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800 mb-1">
                    {completedHabitsCount}
                  </div>
                  <div className="text-sm text-slate-500">Completed Today</div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Flame className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800 mb-1">
                    {Math.max(...habits.map(h => h.streak_days), 0)}
                  </div>
                  <div className="text-sm text-slate-500">Best Streak</div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800 mb-1">
                    {averageCompletionRate}%
                  </div>
                  <div className="text-sm text-slate-500">Avg Completion</div>
                </CardContent>
              </Card>
            </div>

            {/* Habit List Display */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="p-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  Today&apos;s Habits
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                {habits.length > 0 ? (
                  <div className="space-y-4">
                    {habits.map(habit => (
                      <div 
                        key={habit.id} 
                        className={`p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-md ${
                          habit.is_logged_today 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Habit Icon */}
                          <div className={`w-16 h-16 bg-gradient-to-br ${getCategoryColor(habit.category)} rounded-2xl flex items-center justify-center text-2xl`}>
                            {habit.habit_icon}
                          </div>
                          
                          {/* Habit Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className={`text-lg font-bold ${
                                habit.is_logged_today ? 'line-through text-slate-500' : 'text-slate-800'
                              }`}>
                                {habit.habit_name}
                              </h3>
                              <Badge className={`text-xs ${getStreakColor(habit.streak_days)}`}>
                                <Flame className="w-3 h-3 mr-1" />
                                {habit.streak_days} day{habit.streak_days !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            
                            {habit.habit_description && (
                              <p className="text-sm text-slate-600 mb-3">{habit.habit_description}</p>
                            )}
                            
                            {/* Progress and Stats */}
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <TrendingUp className="w-4 h-4" />
                                {habit.completion_rate}% this week
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Target className="w-4 h-4" />
                                {habit.frequency_type}
                              </div>
                            </div>
                          </div>
                          
                          {/* Completion Toggle */}
                          <div className="flex-shrink-0">
                            <Button
                              onClick={() => handleHabitToggle(habit.id)}
                              disabled={optimisticUpdates.has(habit.id)}
                              className={`w-12 h-12 rounded-2xl transition-all duration-300 ${
                                habit.is_logged_today
                                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                                  : 'bg-gradient-to-r from-slate-200 to-slate-300 hover:from-slate-300 hover:to-slate-400'
                              }`}
                            >
                              {habit.is_logged_today ? (
                                <CheckCircle className="w-6 h-6 text-white" />
                              ) : (
                                <Circle className="w-6 h-6 text-slate-600" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Target className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">No habits assigned yet</h3>
                    <p className="text-slate-600 mb-6">
                      Your coach will assign habits for you to track, or you can add your own
                    </p>
                    <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Habit
                    </Button>
                  </div>
                )}

                {/* Completion Celebration */}
                {habits.length > 0 && (
                  <div className={`flex items-center justify-between p-6 rounded-2xl transition-all duration-300 ${
                    allHabitsCompleted 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' 
                      : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        allHabitsCompleted 
                          ? 'bg-gradient-to-br from-green-500 to-green-600' 
                          : 'bg-gradient-to-br from-blue-500 to-blue-600'
                      }`}>
                        {allHabitsCompleted ? (
                          <Trophy className="w-6 h-6 text-white" />
                        ) : (
                          <Target className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <div className={`font-bold text-lg ${
                          allHabitsCompleted ? 'text-green-800' : 'text-blue-800'
                        }`}>
                          {completedHabitsCount}/{habits.length} habits completed
                        </div>
                        <div className={`text-sm ${
                          allHabitsCompleted ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {allHabitsCompleted ? 'Perfect day! 🎉' : 'Keep going! 💪'}
                        </div>
                      </div>
                    </div>
                    
                    {allHabitsCompleted && (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
                        <span className="text-green-700 font-semibold">All Done!</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl h-14 text-lg font-semibold shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6" />
                  View Analytics
                </div>
              </Button>
              
              <Button 
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl h-14 text-lg font-semibold shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <Plus className="w-6 h-6" />
                  Add New Habit
                </div>
              </Button>
            </div>

            {/* Analytics Panel */}
            {showAnalytics && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="p-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    Habit Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-6">
                    {habits.map(habit => (
                      <div key={habit.id} className="p-4 bg-slate-50 rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{habit.habit_icon}</div>
                            <div>
                              <h4 className="font-bold text-slate-800">{habit.habit_name}</h4>
                              <p className="text-sm text-slate-500">{habit.frequency_type}</p>
                            </div>
                          </div>
                          <Badge className={getStreakColor(habit.streak_days)}>
                            <Flame className="w-3 h-3 mr-1" />
                            {habit.streak_days} days
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-slate-600 mb-1">Completion Rate</div>
                            <div className="text-2xl font-bold text-slate-800">{habit.completion_rate}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-slate-600 mb-1">Current Streak</div>
                            <div className="text-2xl font-bold text-slate-800">{habit.streak_days}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-slate-600 mb-1">Status</div>
                            <div className={`text-lg font-bold ${
                              habit.is_logged_today ? 'text-green-600' : 'text-slate-600'
                            }`}>
                              {habit.is_logged_today ? 'Completed' : 'Pending'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-slate-600 mb-1">Category</div>
                            <div className="text-lg font-bold text-slate-800 capitalize">{habit.category}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

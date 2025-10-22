'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Plus, 
  CheckCircle, 
  Circle, 
  Calendar, 
  Target, 
  TrendingUp,
  Award,
  Clock,
  Star,
  Edit,
  Trash2,
  Settings,
  Bell,
  BellOff,
  BarChart3,
  Flame,
  Trophy,
  Zap
} from 'lucide-react'
import { 
  HabitTracker, 
  UserHabit, 
  HabitEntry, 
  HabitStreak,
  HabitCategory 
} from '@/lib/habitTracker'
import { supabase } from '@/lib/supabase'

interface HabitTrackerProps {
  userId: string
  coachId?: string
}

export default function HabitTrackerComponent({ userId, coachId }: HabitTrackerProps) {
  const [userHabits, setUserHabits] = useState<UserHabit[]>([])
  const [habitEntries, setHabitEntries] = useState<HabitEntry[]>([])
  const [habitStreaks, setHabitStreaks] = useState<HabitStreak[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [editingHabit, setEditingHabit] = useState<UserHabit | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)

  useEffect(() => {
    loadHabitData()
  }, [userId])

  const loadHabitData = async () => {
    try {
      setLoading(true)
      
      // Load user habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('user_habits')
        .select(`
          *,
          habit:habits(
            *,
            category:habit_categories(*)
          ),
          streak:habit_streaks(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (habitsError) throw habitsError

      // Load habit entries for the last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const startDate = thirtyDaysAgo.toISOString().split('T')[0]

      const { data: entriesData, error: entriesError } = await supabase
        .from('habit_entries')
        .select('*')
        .in('user_habit_id', habitsData?.map(h => h.id) || [])
        .gte('entry_date', startDate)
        .order('entry_date', { ascending: false })

      if (entriesError) throw entriesError

      setUserHabits(habitsData || [])
      setHabitEntries(entriesData || [])
      
      // Extract streaks from habits data
      const streaks = habitsData?.map(h => h.streak).filter(Boolean) || []
      setHabitStreaks(streaks as HabitStreak[])
      
    } catch (error) {
      console.error('Error loading habit data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleHabitComplete = async (userHabit: UserHabit, completedValue: number = 1) => {
    try {
      const today = selectedDate
      const targetValue = userHabit.target_value
      const isCompleted = completedValue >= targetValue

      // Check if entry already exists for today
      const existingEntry = habitEntries.find(
        e => e.user_habit_id === userHabit.id && e.entry_date === today
      )

      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('habit_entries')
          .update({
            completed_value: completedValue,
            is_completed: isCompleted,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntry.id)

        if (error) throw error
      } else {
        // Create new entry
        const { error } = await supabase
          .from('habit_entries')
          .insert({
            user_habit_id: userHabit.id,
            entry_date: today,
            completed_value: completedValue,
            target_value: targetValue,
            is_completed: isCompleted
          })

        if (error) throw error
      }

      // Reload data to update streaks
      loadHabitData()
    } catch (error) {
      console.error('Error completing habit:', error)
      alert('Error completing habit. Please try again.')
    }
  }

  const handleHabitSkip = async (userHabit: UserHabit) => {
    try {
      const today = selectedDate

      // Check if entry already exists for today
      const existingEntry = habitEntries.find(
        e => e.user_habit_id === userHabit.id && e.entry_date === today
      )

      if (existingEntry) {
        // Update existing entry to mark as not completed
        const { error } = await supabase
          .from('habit_entries')
          .update({
            completed_value: 0,
            is_completed: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntry.id)

        if (error) throw error
      } else {
        // Create new entry marked as not completed
        const { error } = await supabase
          .from('habit_entries')
          .insert({
            user_habit_id: userHabit.id,
            entry_date: today,
            completed_value: 0,
            target_value: userHabit.target_value,
            is_completed: false
          })

        if (error) throw error
      }

      // Reload data to update streaks
      loadHabitData()
    } catch (error) {
      console.error('Error skipping habit:', error)
      alert('Error skipping habit. Please try again.')
    }
  }

  const getHabitEntries = (userHabitId: string) => {
    return habitEntries.filter(e => e.user_habit_id === userHabitId)
  }

  const getHabitStreak = (userHabitId: string) => {
    return habitStreaks.find(s => s.user_habit_id === userHabitId)
  }

  const getTodayStatus = (userHabit: UserHabit) => {
    const entries = getHabitEntries(userHabit.id)
    return HabitTracker.getTodayStatus(userHabit, entries)
  }

  const getHabitInsights = (userHabit: UserHabit) => {
    const entries = getHabitEntries(userHabit.id)
    const streak = getHabitStreak(userHabit.id)
    if (!streak) return { insights: [], recommendations: [], achievements: [] }
    
    return HabitTracker.generateInsights(userHabit, entries, streak)
  }

  const getOverallStats = () => {
    const totalHabits = userHabits.length
    const completedToday = userHabits.filter(habit => {
      const status = getTodayStatus(habit)
      return status.isCompleted
    }).length
    
    const totalStreak = habitStreaks.reduce((sum, streak) => sum + streak.current_streak, 0)
    const avgCompletionRate = habitStreaks.length > 0 
      ? habitStreaks.reduce((sum, streak) => sum + streak.completion_rate, 0) / habitStreaks.length
      : 0

    return {
      totalHabits,
      completedToday,
      totalStreak,
      avgCompletionRate
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const stats = getOverallStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Habit Tracker</h2>
          <p className="text-slate-600">Build healthy habits, one day at a time</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Button>
          <Button
            onClick={() => setShowAddHabit(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Habit
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-800">{stats.totalHabits}</div>
                <div className="text-sm text-blue-600">Total Habits</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-800">{stats.completedToday}</div>
                <div className="text-sm text-green-600">Completed Today</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Flame className="w-8 h-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-800">{stats.totalStreak}</div>
                <div className="text-sm text-orange-600">Total Streak Days</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-800">{stats.avgCompletionRate.toFixed(1)}%</div>
                <div className="text-sm text-purple-600">Avg Completion</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="date" className="font-medium">Track for:</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <Button
              variant="outline"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userHabits.map(habit => {
          const todayStatus = getTodayStatus(habit)
          const streak = getHabitStreak(habit.id)
          const insights = getHabitInsights(habit)
          
          return (
            <Card key={habit.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">{habit.habit?.icon}</span>
                      {habit.custom_name || habit.habit?.name}
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      {habit.custom_description || habit.habit?.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {habit.frequency_type}
                    </Badge>
                    {habit.reminder_enabled && (
                      <Bell className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{todayStatus.completedValue}/{todayStatus.targetValue}</span>
                  </div>
                  <Progress value={todayStatus.progress} className="h-2" />
                </div>

                {/* Streak Info */}
                {streak && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span>Current: {streak.current_streak} days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span>Best: {streak.longest_streak} days</span>
                    </div>
                  </div>
                )}

                {/* Completion Rate */}
                {streak && (
                  <div className="text-sm text-slate-600">
                    Completion Rate: {streak.completion_rate.toFixed(1)}%
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {todayStatus.isCompleted ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHabitSkip(habit)}
                      className="flex-1"
                    >
                      <Circle className="w-4 h-4 mr-1" />
                      Undo
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleHabitComplete(habit)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Complete
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingHabit(habit)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>

                {/* Insights */}
                {insights.achievements.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex flex-wrap gap-1">
                      {insights.achievements.map((achievement, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Award className="w-3 h-3 mr-1" />
                          {achievement}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {userHabits.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No habits yet</h3>
            <p className="text-slate-600 mb-4">
              Start building healthy habits by adding your first one
            </p>
            <Button onClick={() => setShowAddHabit(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Habit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Analytics Panel */}
      {showAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Habit Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userHabits.map(habit => {
                const entries = getHabitEntries(habit.id)
                const streak = getHabitStreak(habit.id)
                const stats = HabitTracker.getHabitStats(entries)
                
                return (
                  <div key={habit.id} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <span className="text-xl">{habit.habit?.icon}</span>
                        {habit.custom_name || habit.habit?.name}
                      </h4>
                      <Badge variant="outline">{habit.frequency_type}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-slate-600">Total Completions</div>
                        <div className="font-bold text-lg">{stats.totalCompletions}</div>
                      </div>
                      <div>
                        <div className="text-slate-600">Completion Rate</div>
                        <div className="font-bold text-lg">{stats.completionRate.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-slate-600">Current Streak</div>
                        <div className="font-bold text-lg">{streak?.current_streak || 0}</div>
                      </div>
                      <div>
                        <div className="text-slate-600">Longest Streak</div>
                        <div className="font-bold text-lg">{streak?.longest_streak || 0}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

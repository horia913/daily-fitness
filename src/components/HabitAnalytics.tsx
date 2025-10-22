'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Target, 
  Flame, 
  Trophy,
  Award,
  Clock,
  CheckCircle,
  Activity,
  Zap,
  Star,
  X,
  Users,
  MessageCircle,
  Eye,
  ArrowRight,
  ArrowLeft,
  Heart,
  Sparkles,
  AlertCircle,
  Info,
  TrendingDown,
  Minus,
  Play,
  Pause,
  RotateCcw,
  Layers,
  Settings
} from 'lucide-react'
import { 
  HabitTracker, 
  UserHabit, 
  HabitEntry, 
  HabitStreak 
} from '@/lib/habitTracker'
import { useTheme } from '@/contexts/ThemeContext'

interface HabitAnalyticsProps {
  isOpen: boolean
  onClose: () => void
  userHabits: UserHabit[]
  habitEntries: HabitEntry[]
  habitStreaks: HabitStreak[]
  clientName?: string
  clientId?: string
}

export default function HabitAnalyticsComponent({ 
  isOpen,
  onClose,
  userHabits, 
  habitEntries, 
  habitStreaks,
  clientName = "Client",
  clientId
}: HabitAnalyticsProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [selectedHabit, setSelectedHabit] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('overview')
  const [showCalendar, setShowCalendar] = useState(false)

  const getHabitEntries = useCallback((userHabitId: string) => {
    return habitEntries.filter(e => e.user_habit_id === userHabitId)
  }, [habitEntries])

  const getHabitStreak = useCallback((userHabitId: string) => {
    return habitStreaks.find(s => s.user_habit_id === userHabitId)
  }, [habitStreaks])

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCompletionBgColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 dark:bg-green-900/20'
    if (rate >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20'
    return 'bg-red-100 dark:bg-red-900/20'
  }

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-purple-600'
    if (streak >= 14) return 'text-blue-600'
    if (streak >= 7) return 'text-green-600'
    return 'text-slate-600'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'week': return 'Last 7 Days'
      case 'month': return 'Last 30 Days'
      case 'quarter': return 'Last 90 Days'
      case 'year': return 'Last Year'
      default: return 'Last 30 Days'
    }
  }

  const getPeriodDates = (period: string) => {
    const now = new Date()
    const start = new Date(now)
    
    switch (period) {
      case 'week':
        start.setDate(now.getDate() - 7)
        break
      case 'month':
        start.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        start.setMonth(now.getMonth() - 3)
        break
      case 'year':
        start.setFullYear(now.getFullYear() - 1)
        break
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    }
  }

  const getOverallStats = () => {
    const totalHabits = userHabits.length
    const activeHabits = userHabits.filter(habit => {
      const entries = getHabitEntries(habit.id)
      const period = getPeriodDates(selectedPeriod)
      const periodEntries = entries.filter(e => e.entry_date >= period.start && e.entry_date <= period.end)
      return periodEntries.length > 0
    }).length

    const totalCompletions = userHabits.reduce((sum, habit) => {
      const entries = getHabitEntries(habit.id)
      const period = getPeriodDates(selectedPeriod)
      const periodEntries = entries.filter(e => e.entry_date >= period.start && e.entry_date <= period.end)
      return sum + periodEntries.reduce((entrySum, entry) => entrySum + (entry.is_completed ? entry.completed_value : 0), 0)
    }, 0)

    const totalTargets = userHabits.reduce((sum, habit) => {
      const entries = getHabitEntries(habit.id)
      const period = getPeriodDates(selectedPeriod)
      const periodEntries = entries.filter(e => e.entry_date >= period.start && e.entry_date <= period.end)
      return sum + periodEntries.reduce((entrySum, entry) => entrySum + entry.target_value, 0)
    }, 0)

    const overallCompletionRate = totalTargets > 0 ? (totalCompletions / totalTargets) * 100 : 0

    const totalStreakDays = habitStreaks.reduce((sum, streak) => sum + streak.current_streak, 0)
    const avgStreak = habitStreaks.length > 0 ? totalStreakDays / habitStreaks.length : 0

    return {
      totalHabits,
      activeHabits,
      totalCompletions,
      overallCompletionRate,
      avgStreak
    }
  }

  const getTopPerformingHabits = () => {
    return userHabits
      .map(habit => {
        const entries = getHabitEntries(habit.id)
        const streak = getHabitStreak(habit.id)
        const stats = HabitTracker.getHabitStats(entries, selectedPeriod === 'week' ? 'weekly' : 'monthly')
        
        return {
          habit,
          stats,
          streak: streak?.current_streak || 0,
          completionRate: stats.completionRate
        }
      })
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5)
  }

  const getHabitProgress = (userHabitId: string) => {
    const entries = getHabitEntries(userHabitId)
    const period = getPeriodDates(selectedPeriod)
    const periodEntries = entries.filter(e => e.entry_date >= period.start && e.entry_date <= period.end)
    
    return HabitTracker.getHabitProgress(periodEntries, period.start, period.end)
  }

  const getAchievements = () => {
    const achievements: Array<{ title: string; description: string; icon: string; earned: boolean }> = []
    
    const stats = getOverallStats()
    
    // Overall completion rate achievements
    if (stats.overallCompletionRate >= 90) {
      achievements.push({
        title: 'Consistency Master',
        description: 'Maintained 90%+ completion rate',
        icon: '🏆',
        earned: true
      })
    } else if (stats.overallCompletionRate >= 70) {
      achievements.push({
        title: 'Habit Builder',
        description: 'Maintained 70%+ completion rate',
        icon: '🥇',
        earned: true
      })
    }

    // Streak achievements
    const maxStreak = Math.max(...habitStreaks.map(s => s.current_streak), 0)
    if (maxStreak >= 30) {
      achievements.push({
        title: 'Streak Legend',
        description: 'Maintained a 30+ day streak',
        icon: '🔥',
        earned: true
      })
    } else if (maxStreak >= 14) {
      achievements.push({
        title: 'Two Week Warrior',
        description: 'Maintained a 14+ day streak',
        icon: '⚡',
        earned: true
      })
    } else if (maxStreak >= 7) {
      achievements.push({
        title: 'Week Warrior',
        description: 'Maintained a 7+ day streak',
        icon: '⭐',
        earned: true
      })
    }

    // Habit count achievements
    if (stats.totalHabits >= 10) {
      achievements.push({
        title: 'Habit Collector',
        description: 'Tracking 10+ habits',
        icon: '📚',
        earned: true
      })
    } else if (stats.totalHabits >= 5) {
      achievements.push({
        title: 'Habit Enthusiast',
        description: 'Tracking 5+ habits',
        icon: '📖',
        earned: true
      })
    }

    return achievements
  }

  const getInsights = () => {
    const insights: string[] = []
    const stats = getOverallStats()
    const topHabits = getTopPerformingHabits()
    
    if (stats.overallCompletionRate >= 80) {
      insights.push('Excellent consistency! You\'re maintaining great habits across the board.')
    } else if (stats.overallCompletionRate >= 60) {
      insights.push('Good progress! You\'re building solid habits with room for improvement.')
    } else {
      insights.push('Keep going! Every small step counts toward building lasting habits.')
    }

    if (topHabits.length > 0) {
      const topHabit = topHabits[0]
      insights.push(`Your strongest habit is "${topHabit.habit.custom_name || topHabit.habit.habit?.name}" with ${topHabit.completionRate.toFixed(1)}% completion.`)
    }

    if (stats.avgStreak >= 7) {
      insights.push('You\'re building excellent momentum with consistent daily habits!')
    }

    return insights
  }

  const stats = getOverallStats()
  const topHabits = getTopPerformingHabits()
  const achievements = getAchievements()
  const insights = getInsights()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[95vh] overflow-hidden">
        <Card className={`${theme.card} border ${theme.border} h-full flex flex-col rounded-3xl ${theme.shadow}`}>
          {/* Header */}
          <CardHeader className="pb-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                  <BarChart3 className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <div>
                  <CardTitle className={`text-2xl font-bold ${theme.text}`}>
                    {clientName}'s Habit Analytics
                  </CardTitle>
                  <p className={`${theme.textSecondary} mt-1`}>
                    Track progress and identify coaching opportunities
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedPeriod} onValueChange={(value: 'week' | 'month' | 'quarter' | 'year') => setSelectedPeriod(value)}>
                  <SelectTrigger className="w-40 h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="quarter">Last 90 Days</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={onClose} className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid w-full grid-cols-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <TabsTrigger value="overview" className="rounded-xl flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="habits" className="rounded-xl flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span className="hidden sm:inline">Habits</span>
                </TabsTrigger>
                <TabsTrigger value="insights" className="rounded-xl flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span className="hidden sm:inline">Insights</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-8 mt-8">
                {/* Overall Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className={`${theme.card} border ${theme.border} rounded-2xl hover:scale-105 transition-all duration-300`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                          <Target className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <div className={`text-3xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {stats.totalHabits}
                          </div>
                          <div className={`text-sm font-medium ${theme.textSecondary}`}>Total Habits</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`${theme.card} border ${theme.border} rounded-2xl hover:scale-105 transition-all duration-300`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                          <CheckCircle className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                        </div>
                        <div>
                          <div className={`text-3xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            {stats.totalCompletions}
                          </div>
                          <div className={`text-sm font-medium ${theme.textSecondary}`}>Completions</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`${theme.card} border ${theme.border} rounded-2xl hover:scale-105 transition-all duration-300`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                          <Trophy className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                        </div>
                        <div>
                          <div className={`text-3xl font-bold ${getCompletionColor(stats.overallCompletionRate)}`}>
                            {stats.overallCompletionRate.toFixed(1)}%
                          </div>
                          <div className={`text-sm font-medium ${theme.textSecondary}`}>Completion Rate</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`${theme.card} border ${theme.border} rounded-2xl hover:scale-105 transition-all duration-300`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-orange-100'}`}>
                          <Flame className={`w-6 h-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                        </div>
                        <div>
                          <div className={`text-3xl font-bold ${getStreakColor(stats.avgStreak)}`}>
                            {stats.avgStreak.toFixed(1)}
                          </div>
                          <div className={`text-sm font-medium ${theme.textSecondary}`}>Avg Streak</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Insights */}
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-yellow-100'}`}>
                        <Activity className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>Quick Insights</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="space-y-4">
                      {insights.map((insight, index) => (
                        <div key={index} className={`flex items-start gap-3 p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                          <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span className={`${theme.text} leading-relaxed`}>{insight}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Performing Habits */}
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                        <TrendingUp className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>Top Performing Habits</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="space-y-4">
                      {topHabits.map((item, index) => (
                        <div key={item.habit.id} className={`flex items-center justify-between p-4 border ${theme.border} rounded-2xl hover:shadow-lg transition-all duration-200`}>
                          <div className="flex items-center gap-4">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'} text-lg font-bold`}>
                              {index + 1}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{item.habit.habit?.icon}</span>
                              <div>
                                <div className={`font-semibold ${theme.text}`}>{item.habit.custom_name || item.habit.habit?.name}</div>
                                <div className={`text-sm ${theme.textSecondary}`}>
                                  {item.streak} day streak • {item.stats.totalCompletions} completions
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold text-xl ${getCompletionColor(item.completionRate)}`}>
                              {item.completionRate.toFixed(1)}%
                            </div>
                            <div className={`text-sm ${theme.textSecondary}`}>completion rate</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="habits" className="space-y-8 mt-8">
                {/* Habit Progress Charts */}
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                        <BarChart3 className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>Habit Progress</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="space-y-6">
                      {userHabits.map(habit => {
                        const entries = getHabitEntries(habit.id)
                        const streak = getHabitStreak(habit.id)
                        const stats = HabitTracker.getHabitStats(entries, selectedPeriod === 'week' ? 'weekly' : 'monthly')
                        
                        return (
                          <div key={habit.id} className={`p-6 border ${theme.border} rounded-2xl hover:shadow-lg transition-all duration-200`}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <span className="text-3xl">{habit.habit?.icon}</span>
                                <div>
                                  <div className={`font-semibold text-lg ${theme.text}`}>{habit.custom_name || habit.habit?.name}</div>
                                  <div className={`text-sm ${theme.textSecondary}`}>
                                    {streak?.current_streak || 0} day streak • {stats.totalCompletions} completions
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-bold text-2xl ${getCompletionColor(stats.completionRate)}`}>
                                  {stats.completionRate.toFixed(1)}%
                                </div>
                                <div className={`text-sm ${theme.textSecondary}`}>completion rate</div>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <Progress 
                                value={stats.completionRate} 
                                className="h-3 rounded-full"
                              />
                              <div className="flex items-center justify-between text-sm">
                                <span className={`${theme.textSecondary}`}>Target: {stats.totalTarget}</span>
                                <span className={`${theme.textSecondary}`}>Completed: {stats.totalCompletions}</span>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => {/* TODO: Send message to client */}}
                              >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Send Message
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => {/* TODO: View detailed analytics */}}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="insights" className="space-y-8 mt-8">
                {/* Achievements */}
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                        <Award className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>Achievements</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {achievements.map((achievement, index) => (
                        <div key={index} className={`p-6 border rounded-2xl transition-all duration-200 hover:scale-105 ${
                          achievement.earned 
                            ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800' 
                            : `${theme.border} ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`
                        }`}>
                          <div className="flex items-center gap-4">
                            <span className="text-3xl">{achievement.icon}</span>
                            <div>
                              <div className={`font-semibold text-lg ${
                                achievement.earned 
                                  ? 'text-green-800 dark:text-green-200' 
                                  : theme.textSecondary
                              }`}>
                                {achievement.title}
                              </div>
                              <div className={`text-sm ${
                                achievement.earned 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : theme.textSecondary
                              }`}>
                                {achievement.description}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Coaching Recommendations */}
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-orange-100'}`}>
                        <Heart className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>Coaching Recommendations</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="space-y-4">
                      {stats.overallCompletionRate < 60 && (
                        <div className={`p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-2xl`}>
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-semibold text-red-800 dark:text-red-200">Focus on Consistency</div>
                              <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                                Consider reducing the number of habits or adjusting targets to build momentum.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {stats.avgStreak < 7 && (
                        <div className={`p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-2xl`}>
                          <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-semibold text-yellow-800 dark:text-yellow-200">Streak Building</div>
                              <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                                Encourage daily check-ins and celebrate small wins to build longer streaks.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {stats.overallCompletionRate >= 80 && (
                        <div className={`p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 rounded-2xl`}>
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-semibold text-green-800 dark:text-green-200">Excellent Progress!</div>
                              <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                                Consider adding new habits or increasing targets to maintain engagement.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <Button
                          className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-6 py-3 font-semibold`}
                          onClick={() => {/* TODO: Send coaching message */}}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Send Coaching Message
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-xl px-6 py-3"
                          onClick={() => {/* TODO: Schedule check-in */}}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule Check-in
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>
    </div>
  )
}

'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { useClientDashboardData } from '@/hooks/useDashboardData'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Dumbbell, 
  Target, 
  Clock, 
  AlertCircle,
  Play,
  BarChart3,
  Flame,
  Award,
  Trophy,
  Bell,
  MessageCircle,
  TrendingUp,
  Zap,
  Heart,
  Star,
  CheckCircle,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import HabitTracker from '@/components/client/HabitTracker'

function getTimeBasedGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function getMotivationalQuote() {
  const quotes = [
    "Every workout brings you closer to your goals! 💪",
    "Consistency is the key to success! 🌟",
    "You're stronger than you think! 🔥",
    "Small steps lead to big changes! ⭐",
    "Your future self will thank you! 🎯",
    "Progress, not perfection! 📈",
    "Today's effort is tomorrow's strength! 💎"
  ]
  const randomIndex = Math.floor(Math.random() * quotes.length)
  return quotes[randomIndex]
}

export default function ClientDashboard() {
  const { profile, todaysWorkout, stats, achievements, loading } = useClientDashboardData()
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className={`${theme.card} ${theme.shadow} rounded-2xl p-8`}>
              <div className="animate-pulse">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const greeting = getTimeBasedGreeting()
  const motivationalQuote = getMotivationalQuote()

  return (
    <ProtectedRoute requiredRole="client">
      <div className={`min-h-screen ${theme.background}`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-8">

            {/* Enhanced Header with Personalized Greeting */}
            <Card className={`${theme.card} ${theme.shadow} rounded-2xl overflow-hidden`}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h1 className={`text-xl font-semibold ${theme.text} mb-1`}>
                          {greeting}{profile?.first_name ? `, ${profile.first_name}` : ''}! 👋
                        </h1>
                        <p className={`${theme.textSecondary} text-sm leading-relaxed`}>
                          {motivationalQuote}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full">
                    {/* Next Scheduled Workout with Streak in Top Right */}
                    <div className="relative w-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-4 sm:px-6 py-4 rounded-xl border border-blue-200 dark:border-blue-800">
                      {/* Streak in Top Right Corner */}
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                        <div className="flex items-center gap-2 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 px-3 py-2 rounded-lg border border-orange-200 dark:border-orange-800">
                          <Flame 
                            className={`w-4 h-4 transition-all duration-300 ${
                              stats.thisWeek >= 7 ? 'text-red-600 dark:text-red-400' :
                              stats.thisWeek >= 5 ? 'text-orange-600 dark:text-orange-400' :
                              stats.thisWeek >= 3 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-orange-500 dark:text-orange-500'
                            }`}
                            style={{
                              filter: stats.thisWeek >= 5 ? 'drop-shadow(0 0 4px currentColor)' : 'none'
                            }}
                          />
                          <span className={`text-sm font-bold ${
                            stats.thisWeek >= 7 ? 'text-red-600 dark:text-red-400' :
                            stats.thisWeek >= 5 ? 'text-orange-600 dark:text-orange-400' :
                            stats.thisWeek >= 3 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-orange-500 dark:text-orange-500'
                          }`}>
                            {stats.thisWeek}
                          </span>
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="pr-20 sm:pr-24">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Dumbbell className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className={`text-sm sm:text-base font-semibold ${theme.text} block truncate`}>Next Workout</span>
                            <span className={`text-xs sm:text-sm ${theme.textSecondary} truncate block`}>
                              {todaysWorkout ? (todaysWorkout.template?.name || 'Workout') : 'No workout scheduled'}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Action Buttons */}
                        <div className="flex gap-3 items-center">
                          {/* Start Workout Button - Even Longer */}
                          {todaysWorkout ? (
                            <Link href={`/client/workouts/${todaysWorkout.id}/start`} className="flex-[3]">
                              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg px-8 py-3 text-lg font-semibold">
                                <Play className="w-6 h-6 mr-3" />
                                Start Workout
                              </Button>
                            </Link>
                          ) : (
                            <div className="flex-[3]">
                              <Button disabled className="w-full bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg px-8 py-3 text-lg font-semibold cursor-not-allowed">
                                <Play className="w-6 h-6 mr-3" />
                                No Workout
                              </Button>
                            </div>
                          )}
                          
                          {/* Details Button - Centered to Right */}
                          <div className="flex-[1] flex justify-center">
                            <Link href="/client/workouts">
                              <Button variant="outline" className={`${theme.border} ${theme.textSecondary} hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap`}>
                                <Calendar className="w-4 h-4 mr-1" />
                                Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hero Workout Card - Enhanced */}
            {todaysWorkout && (
              <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 shadow-2xl rounded-2xl overflow-hidden">
                <CardHeader className="p-8 pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
                        <Zap className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <span className="text-white/90 text-xl font-semibold">Today's Workout</span>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                          <span className="text-white/70 text-base">Ready to start</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2 text-sm font-medium">
                      {todaysWorkout.status?.replace('_', ' ') || 'assigned'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <div className="space-y-8">
                    <div>
                      <CardTitle className="text-4xl text-white mb-4 font-bold">
                        {todaysWorkout.template?.name || 'Workout'}
                      </CardTitle>
                      <CardDescription className="text-white/80 text-xl leading-relaxed">
                        {todaysWorkout.template?.description || 'Your assigned workout for today'}
                      </CardDescription>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <Clock className="w-7 h-7 text-white/80" />
                        <div>
                          <span className="text-white font-bold text-xl">{todaysWorkout.template?.estimated_duration || 45} min</span>
                          <p className="text-white/70 text-base">Duration</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <Dumbbell className="w-7 h-7 text-white/80" />
                        <div>
                          <span className="text-white font-bold text-xl">{todaysWorkout.exercise_count || 0}</span>
                          <p className="text-white/70 text-base">Exercises</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
                        <Target className="w-7 h-7 text-white/80" />
                        <div>
                          <span className="text-white font-bold text-xl">{todaysWorkout.template?.difficulty_level || 'Intermediate'}</span>
                          <p className="text-white/70 text-base">Level</p>
                        </div>
                      </div>
                    </div>

                    {todaysWorkout.notes && (
                      <div className="p-6 bg-white/10 rounded-2xl backdrop-blur-sm">
                        <div className="flex items-start gap-4">
                          <AlertCircle className="w-6 h-6 text-white/80 mt-1" />
                          <p className="text-white/90 font-medium text-lg">{todaysWorkout.notes}</p>
                        </div>
                      </div>
                    )}

                    <Link href={`/client/workouts/${todaysWorkout.id}/start`}>
                      <Button 
                        size="lg" 
                        className="w-full h-16 text-xl font-bold bg-white text-blue-600 hover:bg-white/90 shadow-xl rounded-2xl transition-all duration-300 hover:scale-105"
                      >
                        <Play className="w-7 h-7 mr-3" />
                        Start Workout
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Snapshot and Coach Message Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Progress Snapshot Card */}
              <Card className={`${theme.card} ${theme.shadow} rounded-2xl overflow-hidden`}>
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className={`text-xl ${theme.text}`}>Progress Snapshot</CardTitle>
                      <p className={`${theme.textSecondary} text-sm`}>Your journey so far</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800">
                      <div>
                        <p className="text-green-700 dark:text-green-300 font-semibold text-base">Weight Progress</p>
                        <p className="text-green-600 dark:text-green-400 text-sm">-2.5kg this month</p>
                      </div>
                      <div className="w-14 h-14 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-7 h-7 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
                      <div>
                        <p className="text-blue-700 dark:text-blue-300 font-semibold text-base">Workouts Completed</p>
                        <p className="text-blue-600 dark:text-blue-400 text-sm">12 this month</p>
                      </div>
                      <div className="w-14 h-14 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <Link href="/client/progress" className="block">
                      <Button variant="outline" className={`w-full rounded-2xl ${theme.border} ${theme.textSecondary} hover:bg-blue-50 dark:hover:bg-blue-900/20`}>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        View Full Progress
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Coach Message Card */}
              <Card className={`${theme.card} ${theme.shadow} rounded-2xl overflow-hidden`}>
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className={`text-xl ${theme.text}`}>Coach Message</CardTitle>
                      <p className={`${theme.textSecondary} text-sm`}>Latest from your coach</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-6">
                    <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                          <Heart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-purple-800 dark:text-purple-200 font-medium text-base">Great work this week!</p>
                          <p className="text-purple-600 dark:text-purple-300 text-sm mt-2">
                            You've been consistent with your workouts. Keep up the amazing progress! 💪
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link href="/client/messages" className="block">
                      <Button variant="outline" className={`w-full rounded-2xl ${theme.border} ${theme.textSecondary} hover:bg-purple-50 dark:hover:bg-purple-900/20`}>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        View All Messages
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Habit Tracker */}
            <HabitTracker />

            {/* Stats Section with Enhanced Visual Gamification */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Weekly Progress with Circular Progress */}
              <Card className={`${theme.card} ${theme.shadow} rounded-2xl overflow-hidden`}>
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className={`text-xl ${theme.text}`}>This Week's Progress</CardTitle>
                      <p className={`${theme.textSecondary} text-sm`}>Goal: 5 workouts</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-6">
                    <div className="flex items-center justify-center">
                      <div className="relative w-28 h-28">
                        <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-slate-200 dark:text-slate-700"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-blue-600"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            fill="none"
                            strokeDasharray={`${(stats.thisWeek / 5) * 100}, 100`}
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-xl font-bold ${theme.text}`}>
                            {stats.thisWeek}/5
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className={`text-lg ${theme.text} font-semibold`}>Workouts Completed</p>
                      <p className={`${theme.textSecondary} text-sm`}>Keep up the great work!</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Habits Card */}
              <Card className={`${theme.card} ${theme.shadow} rounded-2xl overflow-hidden`}>
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className={`text-xl ${theme.text}`}>Daily Habits</CardTitle>
                      <p className={`${theme.textSecondary} text-sm`}>Build consistency</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-6">
                    <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-orange-700 dark:text-orange-300 font-semibold text-base">Today's Habits</span>
                        <Star className="w-5 h-5 text-orange-500" />
                      </div>
                      <p className="text-orange-600 dark:text-orange-400 text-sm">Track your daily progress</p>
                    </div>
                    <Link 
                      href="/client/habits"
                      className="block"
                    >
                      <Button variant="outline" className={`w-full rounded-2xl ${theme.border} ${theme.textSecondary} hover:bg-orange-50 dark:hover:bg-orange-900/20`}>
                        <Target className="w-4 h-4 mr-2" />
                        View All Habits
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Achievements */}
              <Card className={`${theme.card} ${theme.shadow} rounded-2xl overflow-hidden`}>
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className={`text-xl ${theme.text}`}>Recent Achievements</CardTitle>
                      <p className={`${theme.textSecondary} text-sm`}>Celebrate your wins</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-4">
                    {achievements.length > 0 ? (
                      achievements.slice(0, 2).map((achievement) => (
                        <div key={achievement.id} className="flex items-center gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-800">
                          <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                          <div>
                            <p className={`text-sm font-semibold ${theme.text}`}>{achievement.title}</p>
                            <p className={`text-xs ${theme.textSecondary}`}>{achievement.description}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <Trophy className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className={`${theme.textSecondary} text-sm`}>No recent achievements</p>
                        <p className={`${theme.textSecondary} text-xs mt-1`}>Keep working towards your goals!</p>
                      </div>
                    )}
                    <Link href="/client/progress" className="block">
                      <Button variant="outline" className={`w-full rounded-2xl ${theme.border} ${theme.textSecondary} hover:bg-yellow-50 dark:hover:bg-yellow-900/20`}>
                        <Award className="w-4 h-4 mr-2" />
                        View All Achievements
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
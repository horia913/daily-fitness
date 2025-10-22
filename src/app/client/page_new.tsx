'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Play,
  Dumbbell,
  Apple,
  CheckCircle,
  Trophy,
  MessageCircle,
  Flame,
  Droplets,
  Moon,
  Footprints,
  Calendar,
  TrendingUp,
  Target,
  Send,
  X,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function getTimeBasedGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default function ClientDashboard() {
  const { user } = useAuth()
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  
  const [showQuickMessage, setShowQuickMessage] = useState(false)
  const [message, setMessage] = useState('')
  
  // Sample data - In production, fetch from Supabase
  const todaysWorkout = {
    id: '1',
    name: 'Upper Body Strength',
    exercises: 5,
    estimatedDuration: 45
  }
  
  const todaysMeals = {
    breakfast: { logged: true, name: 'Protein Oatmeal' },
    lunch: { logged: false, name: 'Chicken & Rice' },
    dinner: { logged: false, name: 'Salmon & Vegetables' }
  }
  
  const todaysHabits = {
    water: 5,
    waterGoal: 8,
    sleep: 7.5,
    steps: 8542,
    stepsGoal: 10000
  }
  
  const quickStats = {
    weeklyWorkouts: 3,
    weeklyGoal: 4,
    currentStreak: 8,
    leaderboardRank: 12
  }

  const greeting = getTimeBasedGreeting()

  return (
    <ProtectedRoute requiredRole="client">
      <div className={`min-h-screen ${theme.background} pb-24`}>
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-4">
            
            {/* Greeting Header */}
            <div className="rounded-3xl p-[1px] bg-gradient-to-r from-blue-500 to-purple-600 shadow-2xl">
              <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                      <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className={`text-2xl font-bold ${theme.text}`}>
                        {greeting}! 👋
                      </h1>
                      <p className={`${theme.textSecondary} text-sm`}>
                        {quickStats.currentStreak} day streak • Let's keep it going!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 1. LIVE WORKOUT - Priority #1 */}
            <div className="rounded-3xl p-[1px] bg-gradient-to-r from-blue-500 to-indigo-600 shadow-2xl">
              <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className={`text-xl ${theme.text}`}>Today's Workout</CardTitle>
                      <p className={`text-sm ${theme.textSecondary}`}>{todaysWorkout.name}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {todaysWorkout.exercises} exercises
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      ~{todaysWorkout.estimatedDuration} min
                    </Badge>
                  </div>
                  <div className="flex gap-3">
                    <Link href={`/client/workouts/${todaysWorkout.id}/start`} className="flex-1">
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl py-6 text-lg font-semibold">
                        <Play className="w-6 h-6 mr-2" />
                        Start Workout
                      </Button>
                    </Link>
                    <Link href="/client/workouts">
                      <Button variant="outline" className="rounded-xl px-6 py-6">
                        <Calendar className="w-5 h-5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 2. MEAL PLAN COMPLETION - Quick Overview */}
            <div className="rounded-3xl p-[1px] bg-gradient-to-r from-green-500 to-emerald-600 shadow-2xl">
              <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                        <Apple className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className={`text-xl ${theme.text}`}>Today's Nutrition</CardTitle>
                    </div>
                    <Link href="/client/nutrition">
                      <Button variant="ghost" size="sm" className="rounded-lg">
                        View All
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-2">
                  {/* Breakfast */}
                  <div className={cn(
                    "rounded-xl p-3 flex items-center justify-between transition-all",
                    todaysMeals.breakfast.logged 
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700"
                      : `${isDark ? 'bg-slate-800 border-2 border-slate-700' : 'bg-slate-50 border-2 border-slate-200'}`
                  )}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🍳</span>
                      <span className={`font-medium ${theme.text}`}>{todaysMeals.breakfast.name}</span>
                    </div>
                    {todaysMeals.breakfast.logged ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Button size="sm" className="bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Log
                      </Button>
                    )}
                  </div>

                  {/* Lunch */}
                  <div className={cn(
                    "rounded-xl p-3 flex items-center justify-between transition-all",
                    todaysMeals.lunch.logged 
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700"
                      : `${isDark ? 'bg-slate-800 border-2 border-slate-700' : 'bg-slate-50 border-2 border-slate-200'}`
                  )}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🥗</span>
                      <span className={`font-medium ${theme.text}`}>{todaysMeals.lunch.name}</span>
                    </div>
                    {todaysMeals.lunch.logged ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Button size="sm" className="bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Log
                      </Button>
                    )}
                  </div>

                  {/* Dinner */}
                  <div className={cn(
                    "rounded-xl p-3 flex items-center justify-between transition-all",
                    todaysMeals.dinner.logged 
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700"
                      : `${isDark ? 'bg-slate-800 border-2 border-slate-700' : 'bg-slate-50 border-2 border-slate-200'}`
                  )}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🍽️</span>
                      <span className={`font-medium ${theme.text}`}>{todaysMeals.dinner.name}</span>
                    </div>
                    {todaysMeals.dinner.logged ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Button size="sm" className="bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Log
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 3. HABIT TRACKING - Quick Log */}
            <div className="rounded-3xl p-[1px] bg-gradient-to-r from-cyan-500 to-blue-600 shadow-2xl">
              <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <CardTitle className={`text-xl ${theme.text}`}>Today's Habits</CardTitle>
                    </div>
                    <Link href="/client/progress">
                      <Button variant="ghost" size="sm" className="rounded-lg">
                        Full Tracking
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Water */}
                    <div className={cn(
                      "rounded-xl p-3 text-center border-2 transition-all hover:scale-105 cursor-pointer",
                      todaysHabits.water >= todaysHabits.waterGoal
                        ? "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-700"
                        : `${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`
                    )}>
                      <Droplets className={`w-6 h-6 mx-auto mb-1 ${todaysHabits.water >= todaysHabits.waterGoal ? 'text-blue-600' : theme.textSecondary}`} />
                      <p className={`text-xl font-bold ${theme.text}`}>{todaysHabits.water}/{todaysHabits.waterGoal}</p>
                      <p className={`text-xs ${theme.textSecondary}`}>glasses</p>
                    </div>

                    {/* Sleep */}
                    <div className={cn(
                      "rounded-xl p-3 text-center border-2 transition-all hover:scale-105 cursor-pointer",
                      todaysHabits.sleep >= 7
                        ? "bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-700"
                        : `${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`
                    )}>
                      <Moon className={`w-6 h-6 mx-auto mb-1 ${todaysHabits.sleep >= 7 ? 'text-indigo-600' : theme.textSecondary}`} />
                      <p className={`text-xl font-bold ${theme.text}`}>{todaysHabits.sleep}h</p>
                      <p className={`text-xs ${theme.textSecondary}`}>sleep</p>
                    </div>

                    {/* Steps */}
                    <div className={cn(
                      "rounded-xl p-3 text-center border-2 transition-all hover:scale-105 cursor-pointer",
                      todaysHabits.steps >= todaysHabits.stepsGoal
                        ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700"
                        : `${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`
                    )}>
                      <Footprints className={`w-6 h-6 mx-auto mb-1 ${todaysHabits.steps >= todaysHabits.stepsGoal ? 'text-green-600' : theme.textSecondary}`} />
                      <p className={`text-xl font-bold ${theme.text}`}>{(todaysHabits.steps / 1000).toFixed(1)}k</p>
                      <p className={`text-xs ${theme.textSecondary}`}>steps</p>
                    </div>

                    {/* Cardio */}
                    <div className={cn(
                      "rounded-xl p-3 text-center border-2 transition-all hover:scale-105 cursor-pointer",
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    )}>
                      <Dumbbell className={`w-6 h-6 mx-auto mb-1 ${theme.textSecondary}`} />
                      <p className={`text-xl font-bold ${theme.text}`}>0</p>
                      <p className={`text-xs ${theme.textSecondary}`}>cardio</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 4. PROGRESS & LEADERBOARDS - Quick Access */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Progress Stats */}
              <div className="rounded-3xl p-[1px] bg-gradient-to-r from-purple-500 to-pink-600 shadow-2xl">
                <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
                  <CardContent className="p-6">
                    <Link href="/client/progress">
                      <div className="cursor-pointer">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className={`font-bold ${theme.text}`}>Progress</h3>
                            <p className={`text-sm ${theme.textSecondary}`}>Track your journey</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${theme.textSecondary}`}>This Week</span>
                            <span className={`font-bold ${theme.text}`}>{quickStats.weeklyWorkouts}/{quickStats.weeklyGoal} workouts</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full"
                              style={{ width: `${(quickStats.weeklyWorkouts / quickStats.weeklyGoal) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* Leaderboard Rank */}
              <div className="rounded-3xl p-[1px] bg-gradient-to-r from-yellow-500 to-orange-600 shadow-2xl">
                <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
                  <CardContent className="p-6">
                    <Link href="/client/progress">
                      <div className="cursor-pointer">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className={`font-bold ${theme.text}`}>Leaderboard</h3>
                            <p className={`text-sm ${theme.textSecondary}`}>Community ranking</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${theme.textSecondary}`}>Your Rank</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-3xl font-bold ${theme.text}`}>#{quickStats.leaderboardRank}</span>
                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                              Elite
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 5. COACH MESSAGING - Quick Access */}
            <div className="rounded-3xl p-[1px] bg-gradient-to-r from-pink-500 to-rose-600 shadow-2xl">
              <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className={`text-xl ${theme.text}`}>Message Your Coach</CardTitle>
                      <p className={`text-sm ${theme.textSecondary}`}>Quick support</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Type a quick message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="flex-1 rounded-xl"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && message.trim()) {
                          // Send message logic
                          setMessage('')
                        }
                      }}
                    />
                    <Button 
                      disabled={!message.trim()}
                      className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl px-6"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className={`text-xs ${theme.textSecondary} mt-3`}>
                    💬 Your coach typically responds within 24 hours
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Check-In */}
              <Link href="/client/progress" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-blue-400 to-indigo-500 shadow-lg hover:shadow-xl transition-all">
                  <div className={cn(
                    "rounded-2xl p-4 h-full",
                    isDark ? 'bg-slate-800' : 'bg-white'
                  )}>
                    <Calendar className={`w-8 h-8 mb-2 ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm`}>Check-In</p>
                  </div>
                </div>
              </Link>

              {/* Goals */}
              <Link href="/client/progress" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-purple-400 to-pink-500 shadow-lg hover:shadow-xl transition-all">
                  <div className={cn(
                    "rounded-2xl p-4 h-full",
                    isDark ? 'bg-slate-800' : 'bg-white'
                  )}>
                    <Target className={`w-8 h-8 mb-2 ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm`}>Goals</p>
                  </div>
                </div>
              </Link>

              {/* PRs */}
              <Link href="/client/progress" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg hover:shadow-xl transition-all">
                  <div className={cn(
                    "rounded-2xl p-4 h-full",
                    isDark ? 'bg-slate-800' : 'bg-white'
                  )}>
                    <Trophy className={`w-8 h-8 mb-2 ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm`}>Records</p>
                  </div>
                </div>
              </Link>

              {/* Analytics */}
              <Link href="/client/progress" className="block">
                <div className="rounded-2xl p-[1px] bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg hover:shadow-xl transition-all">
                  <div className={cn(
                    "rounded-2xl p-4 h-full",
                    isDark ? 'bg-slate-800' : 'bg-white'
                  )}>
                    <TrendingUp className={`w-8 h-8 mb-2 ${theme.text}`} />
                    <p className={`font-bold ${theme.text} text-sm`}>Analytics</p>
                  </div>
                </div>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}


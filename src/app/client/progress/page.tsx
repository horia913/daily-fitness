'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrophyRoom } from '@/components/progress/TrophyRoom'
import { CheckIns } from '@/components/progress/CheckIns'
import { WorkoutAnalytics } from '@/components/progress/WorkoutAnalytics'
import { LifestyleAnalytics } from '@/components/progress/LifestyleAnalytics'
import { CommunityLeaderboard } from '@/components/progress/CommunityLeaderboard'
import { GoalsAndHabits } from '@/components/progress/GoalsAndHabits'
import { 
  TrendingUp, 
  Dumbbell, 
  Trophy,
  Camera,
  BarChart3,
  FileText,
  Scale,
  Target,
  ChevronRight,
  Flame,
  CheckCircle,
  Award,
  ArrowLeft,
  Calendar,
  Activity,
  Apple
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { fetchPersonalRecords, PersonalRecord } from '@/lib/personalRecords'

interface WorkoutStats {
  totalWorkouts: number
  thisWeek: number
  thisMonth: number
  totalDuration: number
  averageDuration: number
  completionRate: number
}

export default function ClientProgress() {
  const { user } = useAuth()
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<string | null>(null)
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats>({
    totalWorkouts: 0,
    thisWeek: 0,
    thisMonth: 0,
    totalDuration: 0,
    averageDuration: 0,
    completionRate: 0
  })
  const [streak, setStreak] = useState(0)
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([])

  // Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view')
    if (view) {
      setSelectedView(view)
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadProgressData()
    }
  }, [user])

  const loadProgressData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Load workout sessions
      const { data: sessionsData } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', user.id)
        .eq('status', 'completed')

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const thisWeekSessions = sessionsData?.filter(s => new Date(s.completed_at) >= weekAgo) || []
      const thisMonthSessions = sessionsData?.filter(s => new Date(s.completed_at) >= monthAgo) || []

      setWorkoutStats({
        totalWorkouts: sessionsData?.length || 0,
        thisWeek: thisWeekSessions.length,
        thisMonth: thisMonthSessions.length,
        totalDuration: sessionsData?.reduce((sum, s) => sum + (s.total_duration || 0), 0) || 0,
        averageDuration: sessionsData?.length ? (sessionsData.reduce((sum, s) => sum + (s.total_duration || 0), 0) / sessionsData.length) : 0,
        completionRate: 85
      })

      // Calculate streak
      const sortedSessions = sessionsData?.sort((a, b) => 
        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      ) || []
      
      let currentStreak = 0
      let currentDate = new Date()
      
      for (const session of sortedSessions) {
        const sessionDate = new Date(session.completed_at)
        const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff <= 1) {
          currentStreak++
          currentDate = sessionDate
        } else {
          break
        }
      }
      setStreak(currentStreak)

      // Load personal records
      const personalRecordsData = await fetchPersonalRecords(user.id)
      setPersonalRecords(personalRecordsData)

    } catch (error) {
      console.error('Error loading progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Progress menu items
  const progressMenuItems = [
    {
      id: 'checkins',
      title: 'Check-Ins',
      description: 'Weight, measurements & photos',
      icon: Calendar,
      gradient: 'from-purple-500 to-indigo-600'
    },
    {
      id: 'workout-analytics',
      title: 'Workout Analytics',
      description: 'Performance, PRs & progress',
      icon: Activity,
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'lifestyle-analytics',
      title: 'Lifestyle Analytics',
      description: 'Sleep, hydration & habits',
      icon: Apple,
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      id: 'leaderboard',
      title: 'Community Leaderboard',
      description: 'Compete & earn titles',
      icon: Trophy,
      gradient: 'from-yellow-500 to-orange-600'
    },
    {
      id: 'personal-records',
      title: 'Personal Records',
      description: 'Your best lifts and achievements',
      icon: Award,
      gradient: 'from-orange-500 to-red-600'
    },
    {
      id: 'goals',
      title: 'Goals & Habits',
      description: 'Set targets and build consistency',
      icon: Target,
      gradient: 'from-cyan-500 to-blue-600'
    }
  ]

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="p-4">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-slate-200 rounded mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Render specific view if selected
  if (selectedView) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
          <div className="p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Back Button */}
              <Button
                onClick={() => setSelectedView(null)}
                variant="outline"
                className="rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Menu
              </Button>

              {/* Render selected view */}
              {/* Personal Records */}
              {selectedView === 'personal-records' && (
                <TrophyRoom personalRecords={personalRecords} loading={loading} />
              )}
              
              {/* Check-Ins (Photos + Measurements) */}
              {selectedView === 'checkins' && (
                <CheckIns loading={loading} />
              )}
              
              {/* Workout Analytics */}
              {selectedView === 'workout-analytics' && (
                <WorkoutAnalytics loading={loading} />
              )}
              
              {/* Lifestyle Analytics */}
              {selectedView === 'lifestyle-analytics' && (
                <LifestyleAnalytics loading={loading} />
              )}
              
              {/* Community Leaderboard */}
              {selectedView === 'leaderboard' && (
                <CommunityLeaderboard loading={loading} currentUserId={user?.id} />
              )}
              
              {/* Workout History - Removed, now part of Workout Analytics */}
              {selectedView === 'workout-logs' && (
                <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
                  <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className={`text-2xl font-bold ${theme.text}`}>Workout History</CardTitle>
                          <p className={`${theme.textSecondary}`}>All your completed workouts</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className={`${theme.textSecondary} text-center py-8`}>Workout history will be displayed here</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Goals & Habits */}
              {selectedView === 'goals' && (
                <GoalsAndHabits loading={loading} />
              )}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Main menu view
  return (
    <ProtectedRoute requiredRole="client">
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Enhanced Header */}
            <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
              <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h1 className={`text-3xl font-bold ${theme.text}`}>My Progress</h1>
                        <p className={`${theme.textSecondary} text-lg`}>Your fitness journey and achievements</p>
                      </div>
                    </div>
                    
                    {/* Enhanced Progress Summary */}
                    <div className={`p-5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl border-2 border-purple-200 dark:border-purple-700`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-center flex-1">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Flame className="w-7 h-7 text-orange-500" />
                            <div className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{workoutStats.totalWorkouts}</div>
                          </div>
                          <div className={`text-sm font-medium ${theme.textSecondary}`}>Workouts</div>
                        </div>
                        <div className={`w-px h-12 ${theme.border}`}></div>
                        <div className="text-center flex-1">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Flame className="w-7 h-7 text-orange-500" />
                            <div className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{streak}</div>
                          </div>
                          <div className={`text-sm font-medium ${theme.textSecondary}`}>Day Streak</div>
                        </div>
                        <div className={`w-px h-12 ${theme.border}`}></div>
                        <div className="text-center flex-1">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Flame className="w-7 h-7 text-orange-500" />
                            <div className={`text-2xl sm:text-3xl font-bold ${theme.text}`}>{workoutStats.thisMonth}</div>
                          </div>
                          <div className={`text-sm font-medium ${theme.textSecondary}`}>This Month</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Features Menu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {progressMenuItems.map((item) => (
                <div 
                  key={item.id}
                  className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl cursor-pointer hover:shadow-2xl hover:scale-105 transition-all"
                  onClick={() => setSelectedView(item.id)}
                >
                  <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl h-full`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-14 h-14 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                          <item.icon className="w-7 h-7 text-white" />
                        </div>
                        <ChevronRight className={`w-5 h-5 ${theme.textSecondary}`} />
                      </div>
                      <h3 className={`text-xl font-bold ${theme.text} mb-2`}>{item.title}</h3>
                      <p className={`text-sm ${theme.textSecondary}`}>{item.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getStreak } from '@/lib/programService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dumbbell,
  TrendingUp,
  Calendar,
  Clock,
  Trophy,
  Zap,
  Target,
  Activity,
  Award,
  BarChart3,
  ChevronRight,
  Flame,
  CheckCircle
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import { ACHIEVEMENTS, getTierColor, getTierIcon, getAchievementTier, type AchievementTier } from '@/lib/achievements'

interface WorkoutAnalyticsProps {
  loading?: boolean
}

export function WorkoutAnalytics({ loading = false }: WorkoutAnalyticsProps) {
  const { user } = useAuth()
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [selectedAchievement, setSelectedAchievement] = useState<{ achievement: any; tier: AchievementTier; value: number } | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  
  // Real data state
  const [streak, setStreak] = useState(0)
  const [workoutsThisMonth, setWorkoutsThisMonth] = useState(0)
  const [workoutsThisWeek, setWorkoutsThisWeek] = useState(0)
  const [timeSpentThisMonth, setTimeSpentThisMonth] = useState(0)
  const [totalVolumeLifted, setTotalVolumeLifted] = useState(0)
  const [userProgress, setUserProgress] = useState({
    totalWorkouts: 0,
    totalPRs: 0,
    consecutiveWeeks: 0,
    benchPressMax: 0,
    squatMax: 0,
    deadliftMax: 0,
    pullupMax: 0,
    singleWorkoutVolume: 0,
    totalReps: 0,
    totalSets: 0
  })
  const [activityCalendar, setActivityCalendar] = useState<Array<{ day: number; hasWorkout: boolean }>>([])
  const [recentPRs, setRecentPRs] = useState<Array<{ exercise: string; weight: number; reps: number; date: string }>>([])
  const [onTheRise, setOnTheRise] = useState<Array<{ exercise: string; increase: string; trend: string }>>([])
  const [exerciseProgress, setExerciseProgress] = useState<Array<{ exercise: string; data: number[] }>>([])
  const [weeklyVolume, setWeeklyVolume] = useState<Array<{ week: string; volume: number }>>([])

  useEffect(() => {
    if (user) {
      loadAnalyticsData()
    }
  }, [user])

  const loadAnalyticsData = async () => {
    if (!user) return
    
    setDataLoading(true)
    try {
      await Promise.all([
        loadStreak(),
        loadWorkoutFrequency(),
        loadTimeSpent(),
        loadVolumeData(),
        loadUserProgress(),
        loadActivityCalendar(),
        loadRecentPRs(),
        loadOnTheRise(),
        loadExerciseProgress(),
        loadWeeklyVolume()
      ])
    } catch (error) {
      console.error('Error loading workout analytics:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const loadStreak = async () => {
    if (!user) return
    const streakValue = await getStreak(user.id)
    setStreak(streakValue)
  }

  const loadWorkoutFrequency = async () => {
    if (!user) return
    
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    
    const { data: workoutLogs } = await supabase
      .from('workout_logs')
      .select('completed_at')
      .eq('client_id', user.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
    
    if (!workoutLogs) return
    
    const thisMonth = workoutLogs.filter(log => 
      log.completed_at && new Date(log.completed_at) >= monthStart
    ).length
    
    const thisWeek = workoutLogs.filter(log => 
      log.completed_at && new Date(log.completed_at) >= weekStart
    ).length
    
    setWorkoutsThisMonth(thisMonth)
    setWorkoutsThisWeek(thisWeek)
  }

  const loadTimeSpent = async () => {
    if (!user) return
    
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const { data: workoutLogs } = await supabase
      .from('workout_logs')
      .select('total_duration_minutes, completed_at')
      .eq('client_id', user.id)
      .gte('completed_at', monthStart.toISOString())
      .not('total_duration_minutes', 'is', null)
    
    if (!workoutLogs) return
    
    const totalMinutes = workoutLogs.reduce((sum, log) => 
      sum + (log.total_duration_minutes || 0), 0
    )
    
    setTimeSpentThisMonth(totalMinutes)
  }

  const loadVolumeData = async () => {
    if (!user) return
    
    // First get workout_logs for this client
    const { data: workoutLogs } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('client_id', user.id)
    
    if (!workoutLogs || workoutLogs.length === 0) {
      setTotalVolumeLifted(0)
      return
    }
    
    const workoutLogIds = workoutLogs.map(log => log.id)
    
    // Then get set logs for these workouts
    const { data: setLogs } = await supabase
      .from('workout_set_logs')
      .select('weight, reps')
      .in('workout_log_id', workoutLogIds)
      .not('weight', 'is', null)
      .not('reps', 'is', null)
    
    if (!setLogs) {
      setTotalVolumeLifted(0)
      return
    }
    
    const totalVolume = setLogs.reduce((sum, log) => 
      sum + ((log.weight || 0) * (log.reps || 0)), 0
    )
    
    setTotalVolumeLifted(totalVolume)
  }

  // Helper function to find max weight for a specific exercise
  const getExerciseMaxWeight = async (exerciseName: string): Promise<number> => {
    if (!user) return 0
    
    try {
      // Get workout logs first
      const { data: workoutLogs } = await supabase
        .from('workout_logs')
        .select('id')
        .eq('client_id', user.id)
      
      if (!workoutLogs || workoutLogs.length === 0) return 0
      
      const workoutLogIds = workoutLogs.map(log => log.id)
      
      // Query workout_set_logs with exercise join
      const { data: setLogs, error } = await supabase
        .from('workout_set_logs')
        .select(`
          weight,
          exercises (
            id,
            name
          )
        `)
        .in('workout_log_id', workoutLogIds)
        .not('weight', 'is', null)
      
      if (error || !setLogs || setLogs.length === 0) return 0
      
      // Filter by exercise name (case-insensitive) and find max weight
      const exerciseNameLower = exerciseName.toLowerCase()
      const matchingLogs = setLogs.filter(log => {
        const exercise = Array.isArray(log.exercises) ? log.exercises[0] : log.exercises
        const exerciseName = exercise?.name || ''
        return exerciseName.toLowerCase().includes(exerciseNameLower)
      })
      
      if (matchingLogs.length === 0) return 0
      
      // Find max weight
      const maxWeight = matchingLogs.reduce((max, log) => {
        const weight = typeof log.weight === 'number' ? log.weight : parseFloat(log.weight || '0')
        return weight > max ? weight : max
      }, 0)
      
      return maxWeight
    } catch (error) {
      console.error(`Error getting max weight for ${exerciseName}:`, error)
      return 0
    }
  }

  const loadUserProgress = async () => {
    if (!user) return
    
    // Get workout logs first
    const { data: workoutLogs } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('client_id', user.id)
    
    const workoutLogIds = workoutLogs?.map(log => log.id) || []
    
    const [workoutsResult, prsResult, setLogsResult, streakValue] = await Promise.all([
      supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('client_id', user.id),
      supabase.from('personal_records').select('*', { count: 'exact', head: true }).eq('client_id', user.id),
      workoutLogIds.length > 0 
        ? supabase.from('workout_set_logs').select('reps, weight, workout_log_id').in('workout_log_id', workoutLogIds)
        : Promise.resolve({ data: [], error: null }),
      getStreak(user.id)
    ])
    
    // Get exercise-specific maxes
    const [benchPressMax, squatMax, deadliftMax, pullupMax] = await Promise.all([
      getExerciseMaxWeight('bench press'),
      getExerciseMaxWeight('squat'),
      getExerciseMaxWeight('deadlift'),
      getExerciseMaxWeight('pull') // Matches pull-up, pullup, etc.
    ])
    
    // Calculate single workout volume (max volume per workout)
    let singleWorkoutVolume = 0
    if (setLogsResult.data && setLogsResult.data.length > 0) {
      // Group sets by workout_log_id and calculate volume per workout
      const workoutVolumes = new Map<string, number>()
      
      setLogsResult.data.forEach(log => {
        if (log.workout_log_id && log.weight && log.reps) {
          const weight = typeof log.weight === 'number' ? log.weight : parseFloat(log.weight || '0')
          const reps = typeof log.reps === 'number' ? log.reps : parseFloat(log.reps || '0')
          const volume = weight * reps
          
          const currentVolume = workoutVolumes.get(log.workout_log_id) || 0
          workoutVolumes.set(log.workout_log_id, currentVolume + volume)
        }
      })
      
      // Find max volume
      singleWorkoutVolume = Array.from(workoutVolumes.values()).reduce((max, volume) => 
        volume > max ? volume : max, 0
      )
    }
    
    const totalSets = setLogsResult.data?.length || 0
    const totalReps = setLogsResult.data?.reduce((sum, log) => {
      const reps = typeof log.reps === 'number' ? log.reps : parseFloat(log.reps || '0')
      return sum + reps
    }, 0) || 0
    
    setUserProgress({
      totalWorkouts: workoutsResult.count || 0,
      totalPRs: prsResult.count || 0,
      consecutiveWeeks: streakValue,
      benchPressMax,
      squatMax,
      deadliftMax,
      pullupMax,
      singleWorkoutVolume,
      totalReps,
      totalSets
    })
  }

  const loadActivityCalendar = async () => {
    if (!user) return
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: workoutLogs } = await supabase
      .from('workout_logs')
      .select('completed_at')
      .eq('client_id', user.id)
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .not('completed_at', 'is', null)
    
    if (!workoutLogs) {
      setActivityCalendar(Array.from({ length: 30 }, (_, i) => ({ day: i + 1, hasWorkout: false })))
      return
    }
    
    const workoutDates = new Set(workoutLogs.map(log => {
      const date = new Date(log.completed_at!)
      return date.toISOString().split('T')[0]
    }))
    
    const calendar = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      const dateStr = date.toISOString().split('T')[0]
      return {
        day: i + 1,
        hasWorkout: workoutDates.has(dateStr)
      }
    })
    
    setActivityCalendar(calendar)
  }

  const loadRecentPRs = async () => {
    if (!user) return
    
    const { data: prs } = await supabase
      .from('personal_records')
      .select('*, exercises(name)')
      .eq('client_id', user.id)
      .order('achieved_date', { ascending: false })
      .limit(5)
    
    if (!prs) return
    
    const formattedPRs = prs.map(pr => {
      const exerciseName = (pr.exercises as any)?.name || 'Unknown Exercise'
      const date = new Date(pr.achieved_date)
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
      const dateStr = daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`
      
      return {
        exercise: exerciseName,
        weight: pr.weight_kg || 0,
        reps: pr.reps || 0,
        date: dateStr
      }
    })
    
    setRecentPRs(formattedPRs)
  }

  const loadOnTheRise = async () => {
    if (!user) {
      setOnTheRise([])
      return
    }

    try {
      // Get workout logs for last 8 weeks (4 weeks recent, 4 weeks previous)
      const eightWeeksAgo = new Date()
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56) // 8 weeks ago
      const fourWeeksAgo = new Date()
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28) // 4 weeks ago

      const { data: workoutLogs } = await supabase
        .from('workout_logs')
        .select('id, completed_at')
        .eq('client_id', user.id)
        .gte('completed_at', eightWeeksAgo.toISOString())
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true })

      if (!workoutLogs || workoutLogs.length === 0) {
        setOnTheRise([])
        return
      }

      const workoutLogIds = workoutLogs.map(log => log.id)

      // Get all set logs with exercises
      const { data: setLogs } = await supabase
        .from('workout_set_logs')
        .select(`
          weight,
          reps,
          workout_log_id,
          exercises (
            id,
            name
          )
        `)
        .in('workout_log_id', workoutLogIds)
        .not('weight', 'is', null)
        .not('reps', 'is', null)

      if (!setLogs || setLogs.length === 0) {
        setOnTheRise([])
        return
      }

      // Group by exercise and time period
      const exerciseData = new Map<string, { recent: number[]; previous: number[]; name: string }>()

      setLogs.forEach(log => {
        const exercise = Array.isArray(log.exercises) ? log.exercises[0] : log.exercises
        if (!exercise || !exercise.name) return

        const workoutLog = workoutLogs.find(wl => wl.id === log.workout_log_id)
        if (!workoutLog || !workoutLog.completed_at) return

        const completedDate = new Date(workoutLog.completed_at)
        const weight = typeof log.weight === 'number' ? log.weight : parseFloat(log.weight || '0')
        
        if (weight === 0) return

        const exerciseId = exercise.id
        if (!exerciseData.has(exerciseId)) {
          exerciseData.set(exerciseId, { recent: [], previous: [], name: exercise.name })
        }

        const data = exerciseData.get(exerciseId)!
        if (completedDate >= fourWeeksAgo) {
          data.recent.push(weight)
        } else {
          data.previous.push(weight)
        }
      })

      // Calculate trends (exercises with positive increase)
      const trendingExercises: Array<{ exercise: string; increase: string; trend: string }> = []

      exerciseData.forEach((data, exerciseId) => {
        if (data.recent.length === 0 || data.previous.length === 0) return

        const recentAvg = data.recent.reduce((sum, w) => sum + w, 0) / data.recent.length
        const previousAvg = data.previous.reduce((sum, w) => sum + w, 0) / data.previous.length

        if (recentAvg > previousAvg) {
          const increase = ((recentAvg - previousAvg) / previousAvg) * 100
          const increaseText = increase >= 10 
            ? `+${increase.toFixed(0)}%` 
            : `+${increase.toFixed(1)}%`
          
          trendingExercises.push({
            exercise: data.name,
            increase: increaseText,
            trend: increase >= 20 ? 'high' : increase >= 10 ? 'medium' : 'low'
          })
        }
      })

      // Sort by percentage increase (highest first) and limit to top 6
      trendingExercises.sort((a, b) => {
        const aNum = parseFloat(a.increase.replace('+', '').replace('%', ''))
        const bNum = parseFloat(b.increase.replace('+', '').replace('%', ''))
        return bNum - aNum
      })

      setOnTheRise(trendingExercises.slice(0, 6))
    } catch (error) {
      console.error('Error loading on the rise exercises:', error)
      setOnTheRise([])
    }
  }

  const loadExerciseProgress = async () => {
    if (!user) {
      setExerciseProgress([])
      return
    }

    try {
      // Get workout logs for last 12 weeks (3 months)
      const twelveWeeksAgo = new Date()
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)

      const { data: workoutLogs } = await supabase
        .from('workout_logs')
        .select('id, completed_at')
        .eq('client_id', user.id)
        .gte('completed_at', twelveWeeksAgo.toISOString())
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true })

      if (!workoutLogs || workoutLogs.length === 0) {
        setExerciseProgress([])
        return
      }

      const workoutLogIds = workoutLogs.map(log => log.id)

      // Get all set logs with exercises
      const { data: setLogs } = await supabase
        .from('workout_set_logs')
        .select(`
          weight,
          workout_log_id,
          exercises (
            id,
            name
          )
        `)
        .in('workout_log_id', workoutLogIds)
        .not('weight', 'is', null)

      if (!setLogs || setLogs.length === 0) {
        setExerciseProgress([])
        return
      }

      // Group by exercise and week
      const exerciseData = new Map<string, { name: string; weeklyMaxes: Map<number, number> }>()

      setLogs.forEach(log => {
        const exercise = Array.isArray(log.exercises) ? log.exercises[0] : log.exercises
        if (!exercise || !exercise.name) return

        const workoutLog = workoutLogs.find(wl => wl.id === log.workout_log_id)
        if (!workoutLog || !workoutLog.completed_at) return

        const completedDate = new Date(workoutLog.completed_at)
        const weekNumber = Math.floor((completedDate.getTime() - twelveWeeksAgo.getTime()) / (7 * 24 * 60 * 60 * 1000))
        const weight = typeof log.weight === 'number' ? log.weight : parseFloat(log.weight || '0')
        
        if (weight === 0) return

        const exerciseId = exercise.id
        if (!exerciseData.has(exerciseId)) {
          exerciseData.set(exerciseId, { name: exercise.name, weeklyMaxes: new Map() })
        }

        const data = exerciseData.get(exerciseId)!
        const currentMax = data.weeklyMaxes.get(weekNumber) || 0
        if (weight > currentMax) {
          data.weeklyMaxes.set(weekNumber, weight)
        }
      })

      // Convert to array format with weekly data points
      const progressData: Array<{ exercise: string; data: number[] }> = []

      exerciseData.forEach((data, exerciseId) => {
        if (data.weeklyMaxes.size < 2) return // Need at least 2 data points

        // Fill in 12 weeks of data (use previous week's max if no data for that week)
        const weeklyData: number[] = []
        let lastValue = 0

        for (let week = 0; week < 12; week++) {
          const weekMax = data.weeklyMaxes.get(week)
          if (weekMax !== undefined) {
            lastValue = weekMax
            weeklyData.push(weekMax)
          } else if (weeklyData.length > 0) {
            weeklyData.push(lastValue) // Use previous value
          } else {
            weeklyData.push(0) // No data yet
          }
        }

        // Only include exercises with meaningful progression
        if (weeklyData[weeklyData.length - 1] > weeklyData[0]) {
          progressData.push({
            exercise: data.name,
            data: weeklyData
          })
        }
      })

      // Sort by total progress (highest first) and limit to top 10
      progressData.sort((a, b) => {
        const aProgress = a.data[a.data.length - 1] - a.data[0]
        const bProgress = b.data[b.data.length - 1] - b.data[0]
        return bProgress - aProgress
      })

      setExerciseProgress(progressData.slice(0, 10))
    } catch (error) {
      console.error('Error loading exercise progress:', error)
      setExerciseProgress([])
    }
  }

  const loadWeeklyVolume = async () => {
    if (!user) return
    
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
    
    const { data: workoutLogs } = await supabase
      .from('workout_logs')
      .select('id, completed_at')
      .eq('client_id', user.id)
      .gte('completed_at', fourWeeksAgo.toISOString())
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: true })
    
    if (!workoutLogs || workoutLogs.length === 0) {
      setWeeklyVolume([])
      return
    }
    
    // Group by week and calculate volume
    const weeklyVolumes: Record<number, number> = {}
    
    for (const log of workoutLogs) {
      const date = new Date(log.completed_at!)
      const weekNumber = Math.floor((date.getTime() - fourWeeksAgo.getTime()) / (7 * 24 * 60 * 60 * 1000))
      
      // Get set logs for this workout
      const { data: setLogs } = await supabase
        .from('workout_set_logs')
        .select('weight, reps')
        .eq('workout_log_id', log.id)
        .not('weight', 'is', null)
        .not('reps', 'is', null)
      
      const volume = setLogs?.reduce((sum, s) => sum + ((s.weight || 0) * (s.reps || 0)), 0) || 0
      
      if (!weeklyVolumes[weekNumber]) {
        weeklyVolumes[weekNumber] = 0
      }
      weeklyVolumes[weekNumber] += volume
    }
    
    const weeklyVolumeArray = Object.entries(weeklyVolumes)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([week, volume], index) => ({
        week: `W${index + 1}`,
        volume: Math.round(volume)
      }))
    
    setWeeklyVolume(weeklyVolumeArray)
  }

  const maxVolume = weeklyVolume.length > 0 ? Math.max(...weeklyVolume.map(w => w.volume)) : 0
  
  const isLoading = loading || dataLoading

  // If viewing specific exercise (only if we have exercise progress data)
  if (selectedExercise && exerciseProgress.length > 0) {
    const exercise = exerciseProgress.find(e => e.exercise === selectedExercise)
    if (!exercise || !exercise.data || exercise.data.length === 0) {
      setSelectedExercise(null)
      return null
    }

    const maxWeight = Math.max(...exercise.data)
    const minWeight = Math.min(...exercise.data)

    return (
      <div className="space-y-6">
        <Button
          onClick={() => setSelectedExercise(null)}
          variant="outline"
          className="rounded-xl"
        >
          ← Back to Overview
        </Button>

        <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
          <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
            <CardHeader className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className={`text-2xl font-bold ${theme.text}`}>{exercise.exercise}</CardTitle>
                  <p className={`${theme.textSecondary}`}>Weight progression over time</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Simple Line Graph */}
              <div className="relative h-64 mb-6">
                <div className="absolute inset-0 flex items-end justify-between gap-2">
                  {exercise.data.map((weight, index) => {
                    const height = ((weight - minWeight) / (maxWeight - minWeight || 1)) * 100
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <span className={`text-xs font-bold ${theme.text}`}>{weight}kg</span>
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-indigo-600 rounded-t-lg transition-all duration-500"
                          style={{ height: `${Math.max(height, 15)}%` }}
                        ></div>
                        <span className={`text-xs ${theme.textSecondary}`}>W{index + 1}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <p className={`text-sm ${theme.textSecondary} mb-1`}>Starting Weight</p>
                  <p className={`text-2xl font-bold ${theme.text}`}>{exercise.data[0]}kg</p>
                </div>
                <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <p className={`text-sm ${theme.textSecondary} mb-1`}>Current Weight</p>
                  <p className={`text-2xl font-bold ${theme.text}`}>{exercise.data[exercise.data.length - 1]}kg</p>
                </div>
                <div className={`rounded-xl p-4 col-span-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700`}>
                  <p className={`text-sm ${theme.textSecondary} mb-1`}>Total Progress</p>
                  <p className={`text-3xl font-bold text-green-600 dark:text-green-400`}>
                    +{exercise.data[exercise.data.length - 1] - exercise.data[0]}kg
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header - Most Exciting Numbers */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className={`text-2xl font-bold ${theme.text}`}>Workout Analytics</CardTitle>
                <p className={`${theme.textSecondary}`}>Track your fitness performance</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* 1. CONSISTENCY & ACTIVITY - "Show Up" Stats */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <CardTitle className={`text-xl ${theme.text}`}>Consistency & Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-6">
            {/* Workout Streak */}
            <div className="rounded-2xl p-5 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-200 dark:border-orange-700">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                    <Flame className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${theme.textSecondary} mb-1`}>Current Streak</p>
                    <p className={`text-xl sm:text-2xl font-bold ${theme.text}`}>{streak} Weeks! 🔥</p>
                  </div>
                </div>
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-sm sm:text-base px-3 py-1.5 flex-shrink-0">
                  Unstoppable!
                </Badge>
              </div>
            </div>

            {/* Activity Calendar */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.text} mb-3`}>Activity Calendar - Last 30 Days</h3>
              <div className="grid grid-cols-10 gap-1.5">
                {activityCalendar.map((day) => (
                  <div
                    key={day.day}
                    className={cn(
                      "aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all",
                      day.hasWorkout
                        ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md"
                        : `${isDark ? 'bg-slate-700' : 'bg-slate-200'} ${theme.textSecondary}`
                    )}
                  >
                    {day.day}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className={`text-xs ${theme.textSecondary} mb-1`}>This Month</p>
                <p className={`text-3xl font-bold ${theme.text}`}>{workoutsThisMonth}</p>
                <p className={`text-xs ${theme.textSecondary}`}>workouts</p>
              </div>
              <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className={`text-xs ${theme.textSecondary} mb-1`}>This Week</p>
                <p className={`text-3xl font-bold ${theme.text}`}>{workoutsThisWeek}</p>
                <p className={`text-xs ${theme.textSecondary}`}>workouts</p>
              </div>
              <div className={`rounded-xl p-4 col-span-2 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className={`w-4 h-4 ${theme.textSecondary}`} />
                  <p className={`text-xs ${theme.textSecondary}`}>Time Invested This Month</p>
                </div>
                <p className={`text-3xl font-bold ${theme.text}`}>{Math.floor(timeSpentThisMonth / 60)}h {timeSpentThisMonth % 60}m</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. PERFORMANCE & PERSONAL RECORDS - "Level Up" Stats */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <CardTitle className={`text-xl ${theme.text}`}>Performance & Personal Records</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-6">
            {/* Recent PRs */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.text} mb-3 flex items-center gap-2`}>
                <Trophy className="w-4 h-4" />
                Recent Personal Records
              </h3>
              <div className="space-y-3">
                {recentPRs.map((pr, index) => (
                  <div key={index} className="rounded-2xl p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                          <Award className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className={`font-bold ${theme.text}`}>{pr.exercise}</p>
                          <p className={`text-sm ${theme.textSecondary}`}>{pr.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${theme.text}`}>{pr.weight}kg</p>
                        <p className={`text-sm ${theme.textSecondary}`}>{pr.reps} reps</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* On The Rise */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.text} mb-3 flex items-center gap-2`}>
                <TrendingUp className="w-4 h-4 text-green-600" />
                On The Rise
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {onTheRise.map((item, index) => (
                  <div key={index} className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} border-2 border-green-200 dark:border-green-700`}>
                    <p className={`font-bold ${theme.text} mb-1`}>{item.exercise}</p>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">{item.increase}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exercise-Specific Progress */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.text} mb-3`}>Exercise Progress - Tap to view details</h3>
              <div className="space-y-2">
                {exerciseProgress.map((exercise) => {
                  const progress = exercise.data[exercise.data.length - 1] - exercise.data[0]
                  return (
                    <div
                      key={exercise.exercise}
                      onClick={() => setSelectedExercise(exercise.exercise)}
                      className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} cursor-pointer hover:scale-[1.02] transition-all`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className={`font-medium ${theme.text}`}>{exercise.exercise}</p>
                          <p className={`text-sm ${theme.textSecondary}`}>
                            {exercise.data[0]}kg → {exercise.data[exercise.data.length - 1]}kg
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            +{progress}kg
                          </Badge>
                          <ChevronRight className={`w-4 h-4 ${theme.textSecondary}`} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. VOLUME & WORKLOAD - "How Much" Stats */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <CardTitle className={`text-xl ${theme.text}`}>Volume & Workload</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-6">
            {/* Total Volume */}
            <div className="rounded-2xl p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
              <p className={`text-sm ${theme.textSecondary} mb-2`}>💪 Total Weight Lifted This Month</p>
              <p className={`text-4xl font-bold ${theme.text} mb-1`}>
                {totalVolumeLifted.toLocaleString()} kg
              </p>
              <p className={`text-xs ${theme.textSecondary}`}>
                ({(totalVolumeLifted / 1000).toFixed(1)} tonnes)
              </p>
            </div>

            {/* Weekly Volume Chart */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.text} mb-3`}>Weekly Volume Trend</h3>
              <div className="space-y-3">
                {weeklyVolume.map((week, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${theme.text} w-12`}>{week.week}</span>
                    <div className="flex-1 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${(week.volume / maxVolume) * 100}%` }}
                      >
                        <span className="text-xs font-bold text-white">{(week.volume / 1000).toFixed(1)} tonnes</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simple Totals */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className={`w-4 h-4 ${theme.textSecondary}`} />
                  <p className={`text-xs ${theme.textSecondary}`}>Total Reps</p>
                </div>
                <p className={`text-2xl font-bold ${theme.text}`}>1,247</p>
              </div>
              <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Target className={`w-4 h-4 ${theme.textSecondary}`} />
                  <p className={`text-xs ${theme.textSecondary}`}>Total Sets</p>
                </div>
                <p className={`text-2xl font-bold ${theme.text}`}>384</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements/Badges */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl mb-24">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <CardTitle className={`text-xl ${theme.text}`}>Achievements Unlocked</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Display ALL achievements with locked/unlocked states */}
              {ACHIEVEMENTS.filter(a => a.category === 'activity' || a.category === 'performance' || a.category === 'volume').map((achievement) => {
                // Determine user's current value for this achievement
                let currentValue = 0
                switch (achievement.id) {
                  case 'the_regular': currentValue = userProgress.totalWorkouts; break
                  case 'pr_breaker': currentValue = userProgress.totalPRs; break
                  case 'streak_keeper': currentValue = userProgress.consecutiveWeeks; break
                  case 'bench_press_club': currentValue = userProgress.benchPressMax; break
                  case 'squat_club': currentValue = userProgress.squatMax; break
                  case 'deadlift_club': currentValue = userProgress.deadliftMax; break
                  case 'bodyweight_boss': currentValue = userProgress.pullupMax; break
                  case 'volume_vanguard': currentValue = userProgress.singleWorkoutVolume; break
                  case 'repetition_ruler': currentValue = userProgress.totalReps; break
                  case 'the_workhorse': currentValue = userProgress.totalSets; break
                  default: currentValue = 0
                }

                // Get tier info
                const { tier, nextTier, nextThreshold } = getAchievementTier(achievement.id, currentValue)
                const isUnlocked = tier !== null
                const displayTier = tier || 'bronze'
                const tierInfo = achievement.tiers[displayTier]
                const tierIcon = isUnlocked ? getTierIcon(tier!) : '🔒'
                const progress = nextThreshold ? (currentValue / nextThreshold) * 100 : 100
                
                return (
                  <div 
                    key={achievement.id}
                    onClick={() => setSelectedAchievement({ achievement, tier: displayTier, value: currentValue })}
                    className={cn(
                      "rounded-xl p-4 border-2 text-center relative overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-lg",
                      isUnlocked && tier === 'platinum' && "bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 border-cyan-300 dark:border-cyan-700",
                      isUnlocked && tier === 'gold' && "bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border-yellow-300 dark:border-yellow-700",
                      isUnlocked && tier === 'silver' && "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-slate-300 dark:border-slate-600",
                      isUnlocked && tier === 'bronze' && "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-300 dark:border-amber-700",
                      !isUnlocked && `${isDark ? 'bg-slate-800/30' : 'bg-slate-100'} border-slate-300 dark:border-slate-700 opacity-60 grayscale`
                    )}
                  >
                    <div className="absolute top-2 right-2 text-lg">{tierIcon}</div>
                    <div className={cn("text-3xl mb-1", !isUnlocked && "opacity-50")}>{achievement.icon}</div>
                    <p className={`text-sm font-bold ${isUnlocked ? theme.text : theme.textSecondary}`}>
                      {achievement.name}
                    </p>
                    <p className={`text-xs ${theme.textSecondary} mb-1`}>
                      {isUnlocked ? tierInfo.label : 'Locked'}
                    </p>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isUnlocked ? `bg-gradient-to-r ${getTierColor(tier!)}` : "bg-slate-400 dark:bg-slate-600"
                        )}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    {!isUnlocked && nextThreshold && (
                      <p className={`text-xs ${theme.textSecondary} mt-1`}>
                        {currentValue}/{nextThreshold}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            <p className={`text-xs ${theme.textSecondary} text-center mt-4`}>
              💡 {ACHIEVEMENTS.filter(a => a.category === 'activity' || a.category === 'performance' || a.category === 'volume').length} total achievements • Tap any to view details
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Achievement Details Modal */}
      {selectedAchievement && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedAchievement(null)}
        >
          <div 
            className={cn(
              "w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden",
              isDark ? 'bg-slate-900' : 'bg-white'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={cn(
              "p-6 bg-gradient-to-r",
              selectedAchievement.tier === 'platinum' && "from-cyan-500 to-blue-600",
              selectedAchievement.tier === 'gold' && "from-yellow-400 to-orange-500",
              selectedAchievement.tier === 'silver' && "from-slate-300 to-slate-400",
              selectedAchievement.tier === 'bronze' && "from-amber-500 to-orange-600"
            )}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-6xl">{selectedAchievement.achievement.icon}</div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {selectedAchievement.achievement.name}
                    </h2>
                    <p className="text-white/90 text-sm">
                      {selectedAchievement.achievement.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAchievement(null)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <ChevronRight className="w-6 h-6 transform rotate-90" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Current Achievement */}
              <div>
                <h3 className={`text-lg font-bold ${theme.text} mb-3`}>Current Achievement</h3>
                <div className={cn(
                  "rounded-xl p-4 border-2",
                  selectedAchievement.tier === 'platinum' && "bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-300 dark:border-cyan-700",
                  selectedAchievement.tier === 'gold' && "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700",
                  selectedAchievement.tier === 'silver' && "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-300 dark:border-slate-600",
                  selectedAchievement.tier === 'bronze' && "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-300 dark:border-amber-700"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xl font-bold ${theme.text}`}>
                      {getTierIcon(selectedAchievement.tier)} {selectedAchievement.achievement.tiers[selectedAchievement.tier].label}
                    </span>
                    <Badge className={cn(
                      "text-white",
                      selectedAchievement.tier === 'platinum' && "bg-cyan-600",
                      selectedAchievement.tier === 'gold' && "bg-yellow-600",
                      selectedAchievement.tier === 'silver' && "bg-slate-600",
                      selectedAchievement.tier === 'bronze' && "bg-amber-600"
                    )}>
                      Unlocked!
                    </Badge>
                  </div>
                  <p className={`text-sm ${theme.textSecondary}`}>
                    Progress: {selectedAchievement.value.toLocaleString()} / {selectedAchievement.achievement.tiers[selectedAchievement.tier].threshold.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* All Tiers */}
              <div>
                <h3 className={`text-lg font-bold ${theme.text} mb-3`}>All Tiers</h3>
                <div className="space-y-3">
                  {(['bronze', 'silver', 'gold', 'platinum'] as AchievementTier[]).map((tier) => {
                    const tierInfo = selectedAchievement.achievement.tiers[tier]
                    const isUnlocked = selectedAchievement.value >= tierInfo.threshold
                    const isCurrentTier = tier === selectedAchievement.tier
                    
                    return (
                      <div 
                        key={tier}
                        className={cn(
                          "rounded-xl p-4 border-2 transition-all",
                          isUnlocked
                            ? tier === 'platinum' && "bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-300 dark:border-cyan-700"
                            : "",
                          isUnlocked
                            ? tier === 'gold' && "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700"
                            : "",
                          isUnlocked
                            ? tier === 'silver' && "bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-300 dark:border-slate-600"
                            : "",
                          isUnlocked
                            ? tier === 'bronze' && "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-300 dark:border-amber-700"
                            : "",
                          !isUnlocked && `${isDark ? 'bg-slate-800/50' : 'bg-slate-100'} border-slate-300 dark:border-slate-700 opacity-50`
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getTierIcon(tier)}</span>
                            <div>
                              <p className={cn(
                                "font-bold",
                                isUnlocked ? theme.text : theme.textSecondary
                              )}>
                                {tierInfo.label}
                              </p>
                              <p className={`text-sm ${theme.textSecondary}`}>
                                {tierInfo.threshold.toLocaleString()} required
                              </p>
                            </div>
                          </div>
                          {isUnlocked && (
                            <CheckCircle className={cn(
                              "w-6 h-6",
                              tier === 'platinum' && "text-cyan-600",
                              tier === 'gold' && "text-yellow-600",
                              tier === 'silver' && "text-slate-600",
                              tier === 'bronze' && "text-amber-600"
                            )} />
                          )}
                          {!isUnlocked && (
                            <Target className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Close Button */}
              <Button
                onClick={() => setSelectedAchievement(null)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl py-3"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


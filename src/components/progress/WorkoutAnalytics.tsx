'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, ensureAuthenticated } from '@/lib/supabase'
import { getStreak } from '@/lib/programService'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'
import { ACHIEVEMENTS, getTierColor, getTierIcon, getAchievementTier, type AchievementTier } from '@/lib/achievements'

interface WorkoutAnalyticsProps {
  loading?: boolean
}

export function WorkoutAnalytics({ loading = false }: WorkoutAnalyticsProps) {
  const { user } = useAuth()
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
    
    try {
      await ensureAuthenticated()
    } catch (error) {
      console.error('Authentication required for workout frequency:', error)
      return
    }
    
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
    
    try {
      await ensureAuthenticated()
    } catch (error) {
      console.error('Authentication required for time spent:', error)
      return
    }
    
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
    
    try {
      await ensureAuthenticated()
    } catch (error) {
      console.error('Authentication required for volume data:', error)
      return
    }
    
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
      await ensureAuthenticated()
      
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
    
    try {
      // Ensure user is authenticated before querying
      await ensureAuthenticated()
    } catch (error) {
      console.error('Authentication required for workout progress:', error)
      return
    }
    
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
    
    try {
      await ensureAuthenticated()
    } catch (error) {
      console.error('Authentication required for activity calendar:', error)
      return
    }
    
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
    
    try {
      await ensureAuthenticated()
    } catch (error) {
      console.error('Authentication required for recent PRs:', error)
      return
    }
    
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
      await ensureAuthenticated()
      
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
      await ensureAuthenticated()
      
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
    
    try {
      await ensureAuthenticated()
    } catch (error) {
      console.error('Authentication required for weekly volume:', error)
      return
    }
    
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
          className="fc-btn fc-btn-secondary fc-press"
        >
          ← Back to Overview
        </Button>

        <div className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)] overflow-hidden">
          <div className="p-6 border-b border-[color:var(--fc-glass-border)]">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-workouts w-12 h-12">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                  Exercise Progress
                </span>
                <div className="text-2xl font-bold fc-text-primary mt-2">
                  {exercise.exercise}
                </div>
                <p className="fc-text-subtle">Weight progression over time</p>
              </div>
            </div>
          </div>
          <div className="p-6">
              {/* Simple Line Graph */}
              <div className="relative h-64 mb-6">
                <div className="absolute inset-0 flex items-end justify-between gap-2">
                  {exercise.data.map((weight, index) => {
                    const height = ((weight - minWeight) / (maxWeight - minWeight || 1)) * 100
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-xs font-bold fc-text-primary">{weight}kg</span>
                        <div 
                          className="w-full rounded-t-lg transition-all duration-500 bg-[color:var(--fc-domain-workouts)]"
                          style={{ height: `${Math.max(height, 15)}%` }}
                        ></div>
                        <span className="text-xs fc-text-subtle">W{index + 1}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <p className="text-sm fc-text-subtle mb-1">Starting Weight</p>
                  <p className="text-2xl font-bold fc-text-primary">{exercise.data[0]}kg</p>
                </div>
                <div className="rounded-xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <p className="text-sm fc-text-subtle mb-1">Current Weight</p>
                  <p className="text-2xl font-bold fc-text-primary">{exercise.data[exercise.data.length - 1]}kg</p>
                </div>
                <div className="rounded-xl p-4 col-span-2 fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <p className="text-sm fc-text-subtle mb-1">Total Progress</p>
                  <p className="text-3xl font-bold fc-text-success">
                    +{exercise.data[exercise.data.length - 1] - exercise.data[0]}kg
                  </p>
                </div>
              </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)]">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts w-12 h-12">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Analytics
              </span>
              <div className="text-2xl font-bold fc-text-primary mt-2">
                Workout Analytics
              </div>
              <p className="fc-text-subtle">Track your fitness performance</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <p className="text-xs fc-text-subtle mb-1">Streak</p>
              <p className="text-2xl font-bold fc-text-primary">{streak}w</p>
              <p className="text-xs fc-text-subtle">current</p>
            </div>
            <div className="rounded-2xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <p className="text-xs fc-text-subtle mb-1">This Month</p>
              <p className="text-2xl font-bold fc-text-primary">{workoutsThisMonth}</p>
              <p className="text-xs fc-text-subtle">workouts</p>
            </div>
            <div className="rounded-2xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <p className="text-xs fc-text-subtle mb-1">Time Invested</p>
              <p className="text-2xl font-bold fc-text-primary">
                {Math.floor(timeSpentThisMonth / 60)}h {timeSpentThisMonth % 60}m
              </p>
              <p className="text-xs fc-text-subtle">this month</p>
            </div>
            <div className="rounded-2xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <p className="text-xs fc-text-subtle mb-1">Total Volume</p>
              <p className="text-2xl font-bold fc-text-primary">
                {totalVolumeLifted.toLocaleString()}kg
              </p>
              <p className="text-xs fc-text-subtle">this month</p>
            </div>
          </div>
        </div>
      </div>

      {/* 1. CONSISTENCY & ACTIVITY - "Show Up" Stats */}
      <div className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)]">
        <div className="p-6 pb-4 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts w-10 h-10">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Consistency
              </span>
              <div className="text-xl fc-text-primary font-semibold mt-2">
                Consistency & Activity
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 pt-0 space-y-6">
          {/* Workout Streak */}
          <div className="rounded-2xl p-5 fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="fc-icon-tile fc-icon-workouts w-12 h-12 flex-shrink-0">
                  <Flame className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm fc-text-subtle mb-1">Current Streak</p>
                  <p className="text-xl sm:text-2xl font-bold fc-text-primary">{streak} Weeks! 🔥</p>
                </div>
              </div>
              <span className="fc-pill fc-pill-glass fc-text-warning text-sm sm:text-base px-3 py-1.5 flex-shrink-0">
                Unstoppable!
              </span>
            </div>
          </div>

            {/* Activity Calendar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold fc-text-primary">
                Activity Calendar — Last 30 Days
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="fc-pill fc-pill-glass fc-text-workouts">Workout</span>
                <span className="fc-pill fc-pill-glass fc-text-subtle">Rest</span>
              </div>
            </div>
            <div className="grid grid-cols-10 gap-1.5">
              {activityCalendar.map((day) => (
                <div
                  key={day.day}
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all border border-[color:var(--fc-glass-border)]",
                    day.hasWorkout
                      ? "fc-glass fc-text-primary ring-1 ring-[color:var(--fc-domain-workouts)]"
                      : "fc-glass-soft fc-text-subtle"
                  )}
                >
                  {day.day}
                </div>
              ))}
            </div>
          </div>

            {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <p className="text-xs fc-text-subtle mb-1">This Month</p>
              <p className="text-3xl font-bold fc-text-primary">{workoutsThisMonth}</p>
              <p className="text-xs fc-text-subtle">workouts</p>
            </div>
            <div className="rounded-xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <p className="text-xs fc-text-subtle mb-1">This Week</p>
              <p className="text-3xl font-bold fc-text-primary">{workoutsThisWeek}</p>
              <p className="text-xs fc-text-subtle">workouts</p>
            </div>
            <div className="rounded-xl p-4 col-span-2 fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 fc-text-subtle" />
                <p className="text-xs fc-text-subtle">Time Invested This Month</p>
              </div>
              <p className="text-3xl font-bold fc-text-primary">{Math.floor(timeSpentThisMonth / 60)}h {timeSpentThisMonth % 60}m</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PERFORMANCE & PERSONAL RECORDS - "Level Up" Stats */}
      <div className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)]">
        <div className="p-6 pb-4 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts w-10 h-10">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Performance
              </span>
              <div className="text-xl fc-text-primary font-semibold mt-2">
                Performance & Personal Records
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 pt-0 space-y-6">
            {/* Recent PRs */}
          <div>
            <h3 className="text-sm font-semibold fc-text-primary mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Recent Personal Records
            </h3>
            <div className="space-y-3">
              {recentPRs.map((pr, index) => (
                <div key={index} className="rounded-2xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="fc-icon-tile fc-icon-workouts w-10 h-10">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold fc-text-primary">{pr.exercise}</p>
                        <p className="text-sm fc-text-subtle">{pr.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold fc-text-primary">{pr.weight}kg</p>
                      <p className="text-sm fc-text-subtle">{pr.reps} reps</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

            {/* On The Rise */}
          <div>
            <h3 className="text-sm font-semibold fc-text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 fc-text-success" />
              On The Rise
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {onTheRise.map((item, index) => (
                <div key={index} className="rounded-xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <p className="font-bold fc-text-primary mb-1">{item.exercise}</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 fc-text-success" />
                    <p className="text-xl font-bold fc-text-success">{item.increase}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

            {/* Exercise-Specific Progress */}
          <div>
            <h3 className="text-sm font-semibold fc-text-primary mb-3">Exercise Progress - Tap to view details</h3>
            <div className="space-y-2">
              {exerciseProgress.map((exercise) => {
                const progress = exercise.data[exercise.data.length - 1] - exercise.data[0]
                return (
                  <div
                    key={exercise.exercise}
                    onClick={() => setSelectedExercise(exercise.exercise)}
                    className="rounded-xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)] cursor-pointer fc-hover-rise"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium fc-text-primary">{exercise.exercise}</p>
                        <p className="text-sm fc-text-subtle">
                          {exercise.data[0]}kg → {exercise.data[exercise.data.length - 1]}kg
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="fc-pill fc-pill-glass fc-text-success">
                          +{progress}kg
                        </span>
                        <ChevronRight className="w-4 h-4 fc-text-subtle" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. VOLUME & WORKLOAD - "How Much" Stats */}
      <div className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)]">
        <div className="p-6 pb-4 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts w-10 h-10">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Workload
              </span>
              <div className="text-xl fc-text-primary font-semibold mt-2">
                Volume & Workload
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 pt-0 space-y-6">
            {/* Total Volume */}
            <div className="rounded-2xl p-5 fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <p className="text-sm fc-text-subtle mb-2">💪 Total Weight Lifted This Month</p>
              <p className="text-4xl font-bold fc-text-primary mb-1">
                {totalVolumeLifted.toLocaleString()} kg
              </p>
              <p className="text-xs fc-text-subtle">
                ({(totalVolumeLifted / 1000).toFixed(1)} tonnes)
              </p>
            </div>

            {/* Weekly Volume Chart */}
          <div>
            <h3 className="text-sm font-semibold fc-text-primary mb-3">Weekly Volume Trend</h3>
            <div className="space-y-3">
              {weeklyVolume.map((week, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-medium fc-text-primary w-12">{week.week}</span>
                  <div className="flex-1 h-8 fc-progress-track rounded-lg overflow-hidden">
                    <div 
                      className="h-full fc-progress-fill rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
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
            <div className="rounded-xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 fc-text-subtle" />
                <p className="text-xs fc-text-subtle">Total Reps</p>
              </div>
              <p className="text-2xl font-bold fc-text-primary">1,247</p>
            </div>
            <div className="rounded-xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 fc-text-subtle" />
                <p className="text-xs fc-text-subtle">Total Sets</p>
              </div>
              <p className="text-2xl font-bold fc-text-primary">384</p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements/Badges */}
      <div className="fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)] mb-24">
        <div className="p-6 pb-4 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts w-10 h-10">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Achievements
              </span>
              <div className="text-xl fc-text-primary font-semibold mt-2">
                Achievements Unlocked
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 pt-0">
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
                    "rounded-xl p-4 border text-center relative overflow-hidden cursor-pointer transition-all fc-hover-rise",
                    isUnlocked ? "fc-glass-soft border-[color:var(--fc-glass-border)]" : "fc-glass-soft border-[color:var(--fc-glass-border)] opacity-60 grayscale"
                  )}
                >
                  <div className="absolute top-2 right-2 text-lg">{tierIcon}</div>
                  <div className={cn("text-3xl mb-1", !isUnlocked && "opacity-50")}>{achievement.icon}</div>
                  <p className={`text-sm font-bold ${isUnlocked ? "fc-text-primary" : "fc-text-subtle"}`}>
                    {achievement.name}
                  </p>
                  <p className="text-xs fc-text-subtle mb-1">
                    {isUnlocked ? tierInfo.label : 'Locked'}
                  </p>
                  <div className="w-full fc-progress-track rounded-full h-1.5 mt-2">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isUnlocked ? `bg-gradient-to-r ${getTierColor(tier!)}` : "bg-[color:var(--fc-glass-border)]"
                      )}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  {!isUnlocked && nextThreshold && (
                    <p className="text-xs fc-text-subtle mt-1">
                      {currentValue}/{nextThreshold}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs fc-text-subtle text-center mt-4">
            💡 {ACHIEVEMENTS.filter(a => a.category === 'activity' || a.category === 'performance' || a.category === 'volume').length} total achievements • Tap any to view details
          </p>
        </div>
      </div>

      {/* Achievement Details Modal */}
      {selectedAchievement && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedAchievement(null)}
        >
          <div 
            className="w-full max-w-2xl fc-modal fc-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-[color:var(--fc-glass-border)]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-6xl">{selectedAchievement.achievement.icon}</div>
                  <div>
                    <h2 className="text-2xl font-bold fc-text-primary mb-1">
                      {selectedAchievement.achievement.name}
                    </h2>
                    <p className="fc-text-subtle text-sm">
                      {selectedAchievement.achievement.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAchievement(null)}
                  className="fc-btn fc-btn-ghost fc-press"
                >
                  <ChevronRight className="w-6 h-6 transform rotate-90" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Current Achievement */}
              <div>
                <h3 className="text-lg font-bold fc-text-primary mb-3">Current Achievement</h3>
                <div className="rounded-xl p-4 fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-bold fc-text-primary">
                      {getTierIcon(selectedAchievement.tier)} {selectedAchievement.achievement.tiers[selectedAchievement.tier].label}
                    </span>
                    <span className="fc-pill fc-pill-glass fc-text-success">
                      Unlocked!
                    </span>
                  </div>
                  <p className="text-sm fc-text-subtle">
                    Progress: {selectedAchievement.value.toLocaleString()} / {selectedAchievement.achievement.tiers[selectedAchievement.tier].threshold.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* All Tiers */}
              <div>
                <h3 className="text-lg font-bold fc-text-primary mb-3">All Tiers</h3>
                <div className="space-y-3">
                  {(['bronze', 'silver', 'gold', 'platinum'] as AchievementTier[]).map((tier) => {
                    const tierInfo = selectedAchievement.achievement.tiers[tier]
                    const isUnlocked = selectedAchievement.value >= tierInfo.threshold
                    
                    return (
                      <div 
                        key={tier}
                        className={cn(
                          "rounded-xl p-4 border transition-all",
                          isUnlocked ? "fc-glass-soft border-[color:var(--fc-glass-border)]" : "fc-glass-soft border-[color:var(--fc-glass-border)] opacity-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getTierIcon(tier)}</span>
                            <div>
                              <p className={cn(
                                "font-bold",
                                isUnlocked ? "fc-text-primary" : "fc-text-subtle"
                              )}>
                                {tierInfo.label}
                              </p>
                              <p className="text-sm fc-text-subtle">
                                {tierInfo.threshold.toLocaleString()} required
                              </p>
                            </div>
                          </div>
                          {isUnlocked && (
                            <CheckCircle className="w-6 h-6 fc-text-success" />
                          )}
                          {!isUnlocked && (
                            <Target className="w-6 h-6 fc-text-subtle" />
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
                className="w-full fc-btn fc-btn-primary fc-press"
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


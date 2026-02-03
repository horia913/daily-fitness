'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Scale,
  TrendingDown,
  TrendingUp,
  Droplets,
  Moon,
  Footprints,
  Apple,
  Star,
  Smile,
  Camera,
  Ruler,
  CheckCircle,
  Target,
  ChevronRight,
  Award
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { ACHIEVEMENTS, getTierColor, getTierIcon, getAchievementTier, type AchievementTier } from '@/lib/achievements'
import { supabase } from '@/lib/supabase'

interface LifestyleAnalyticsProps {
  loading?: boolean
}

/** Current week Mon–Sun: { dateStr, dayLabel, hasMeals } */
function getThisWeekDays(): { dateStr: string; dayLabel: string }[] {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return { dateStr: d.toISOString().slice(0, 10), dayLabel: labels[i] }
  })
}

export function LifestyleAnalytics({ loading = false }: LifestyleAnalyticsProps) {
  const { isDark, getThemeStyles } = useTheme()
  const { user } = useAuth()
  const theme = getThemeStyles()
  const [selectedAchievement, setSelectedAchievement] = useState<{ achievement: any; tier: AchievementTier; value: number } | null>(null)
  const [nutritionWeek, setNutritionWeek] = useState<{ dateStr: string; dayLabel: string; hasMeals: boolean }[]>([])

  const loadNutritionWeek = useCallback(async () => {
    const weekDays = getThisWeekDays()
    if (!user?.id) {
      setNutritionWeek(weekDays.map((d) => ({ ...d, hasMeals: false })))
      return
    }
    const monday = new Date(weekDays[0].dateStr)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(weekDays[6].dateStr)
    sunday.setHours(23, 59, 59, 999)
    const { data, error } = await supabase
      .from('meal_completions')
      .select('completed_at')
      .eq('client_id', user.id)
      .gte('completed_at', monday.toISOString())
      .lte('completed_at', sunday.toISOString())
    if (error) {
      setNutritionWeek(weekDays.map((d) => ({ ...d, hasMeals: false })))
      return
    }
    const datesWithMeals = new Set(
      (data || []).map((r) => (r.completed_at ? new Date(r.completed_at).toISOString().slice(0, 10) : '')).filter(Boolean)
    )
    setNutritionWeek(weekDays.map((d) => ({ ...d, hasMeals: datesWithMeals.has(d.dateStr) })))
  }, [user?.id])

  useEffect(() => {
    loadNutritionWeek()
  }, [loadNutritionWeek])

  // Sample user progress data - In production, fetch from database
  const userProgress = {
    weightGoalProgress: 50, // percentage
    totalCmLost: 25,
    bodyRecompCheckins: 2,
    hydrationStreak: 14,
    sleepStreak: 7,
    nutritionStreak: 21,
    recoverySessionsLogged: 30
  }

  // Sample data
  const weightData = [
    { week: 'Week 1', weight: 78 },
    { week: 'Week 2', weight: 77.5 },
    { week: 'Week 3', weight: 77 },
    { week: 'Week 4', weight: 76.5 }
  ]

  const bodyFatData = [
    { month: 'Month 1', bodyFat: 22 },
    { month: 'Month 2', bodyFat: 20.5 },
    { month: 'Month 3', bodyFat: 19 }
  ]

  const totalCmLost = 21.5 // cm
  const sleepScore = 85
  const weeklySlsleep = [7.5, 8, 6.5, 7, 8.5, 7.5, 8]
  const waterIntakeToday = 6 // glasses
  const waterGoal = 8
  const hydrationStreak = 7
  const dailySteps = 8542
  const stepsGoal = 10000

  const maxWeight = Math.max(...weightData.map(d => d.weight))
  const minWeight = Math.min(...weightData.map(d => d.weight))
  const maxBodyFat = Math.max(...bodyFatData.map(d => d.bodyFat))
  const minBodyFat = Math.min(...bodyFatData.map(d => d.bodyFat))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                <Apple className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className={`text-2xl font-bold ${theme.text}`}>Lifestyle Analytics</CardTitle>
                <p className={`${theme.textSecondary}`}>Track your health & wellness</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* 1. BODY COMPOSITION & PROGRESS - "Transformation" Stats */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <CardTitle className={`text-xl ${theme.text}`}>Body Composition & Progress</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-6">
            {/* Total Centimeters Lost - Big Win! */}
            <div className="rounded-2xl p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700">
              <div className="text-center">
                <Ruler className={`w-8 h-8 ${theme.text} mx-auto mb-2`} />
                <p className={`text-sm ${theme.textSecondary} mb-1`}>Total Body Measurements Lost</p>
                <p className={`text-5xl font-bold text-green-600 dark:text-green-400 mb-2`}>{totalCmLost} cm</p>
                <p className={`text-sm ${theme.text}`}>Amazing transformation! 🎉</p>
              </div>
            </div>

            {/* Weight Progress */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.text} mb-3 flex items-center gap-2`}>
                <Scale className="w-4 h-4" />
                Weight Progress (Last 4 Weeks)
              </h3>
              <div className="relative h-48 mb-4">
                <div className="absolute inset-0 flex items-end justify-between gap-2">
                  {weightData.map((point, index) => {
                    const height = ((point.weight - minWeight) / (maxWeight - minWeight || 1)) * 100
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <span className={`text-xs font-bold ${theme.text}`}>{point.weight}kg</span>
                        <div 
                          className="w-full bg-gradient-to-t from-purple-500 to-indigo-600 rounded-t-lg transition-all duration-500"
                          style={{ height: `${Math.max(height, 15)}%` }}
                        ></div>
                        <span className={`text-xs ${theme.textSecondary}`}>{point.week}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <TrendingDown className="w-3 h-3 mr-1 inline" />
                  -{(weightData[0].weight - weightData[weightData.length - 1].weight).toFixed(1)} kg
                </Badge>
              </div>
            </div>

            {/* Body Fat % */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.text} mb-3`}>Body Fat % Trend (90-Day)</h3>
              <div className="relative h-32 mb-4">
                <div className="absolute inset-0 flex items-end justify-between gap-3">
                  {bodyFatData.map((point, index) => {
                    const height = ((point.bodyFat - minBodyFat) / (maxBodyFat - minBodyFat || 1)) * 100
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <span className={`text-xs font-bold ${theme.text}`}>{point.bodyFat}%</span>
                        <div 
                          className="w-full bg-gradient-to-t from-orange-500 to-red-600 rounded-t-lg transition-all duration-500"
                          style={{ height: `${Math.max(height, 20)}%` }}
                        ></div>
                        <span className={`text-xs ${theme.textSecondary}`}>{point.month}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <TrendingDown className="w-3 h-3 mr-1 inline" />
                  -{(bodyFatData[0].bodyFat - bodyFatData[bodyFatData.length - 1].bodyFat).toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. DAILY HABITS & WELLNESS - "Foundation" Stats */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Smile className="w-5 h-5 text-white" />
              </div>
              <CardTitle className={`text-xl ${theme.text}`}>Daily Habits & Wellness</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-6">
            {/* Sleep Performance */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.text} mb-3 flex items-center gap-2`}>
                <Moon className="w-4 h-4" />
                Sleep Performance
              </h3>
              
              {/* Sleep Score */}
              <div className="rounded-2xl p-5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-200 dark:border-indigo-700 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${theme.textSecondary} mb-1`}>Last Night's Sleep</p>
                    <p className={`text-4xl font-bold ${theme.text}`}>{sleepScore}/100</p>
                    <p className={`text-sm text-green-600 dark:text-green-400 mt-1`}>Excellent! 😴</p>
                  </div>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Moon className="w-10 h-10 text-white" />
                  </div>
                </div>
              </div>

              {/* Weekly Sleep Chart */}
              <div className="space-y-2">
                <p className={`text-xs ${theme.textSecondary} mb-2`}>Last 7 Nights</p>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${theme.text} w-10`}>{day}</span>
                    <div className="flex-1 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-end pr-2"
                        style={{ width: `${(weeklySlsleep[index] / 10) * 100}%` }}
                      >
                        <span className="text-xs font-bold text-white">{weeklySlsleep[index]}h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hydration */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.text} mb-3 flex items-center gap-2`}>
                <Droplets className="w-4 h-4" />
                Hydration Tracking
              </h3>
              
              {/* Water Bottle Visual */}
              <div className="rounded-2xl p-5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-700 mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className={`text-sm ${theme.textSecondary} mb-2`}>Today's Water Intake</p>
                    <div className="flex items-end gap-1 mb-2">
                      {Array.from({ length: waterGoal }).map((_, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex-1 h-16 rounded-t-lg transition-all",
                            index < waterIntakeToday
                              ? "bg-gradient-to-t from-blue-500 to-cyan-400"
                              : "bg-slate-200 dark:bg-slate-700"
                          )}
                        ></div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-2xl font-bold ${theme.text}`}>
                        {waterIntakeToday} / {waterGoal} glasses
                      </p>
                      {waterIntakeToday >= waterGoal && (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Goal Reached! 💧
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hydration Streak */}
              <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Droplets className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className={`text-sm ${theme.textSecondary}`}>Hydration Streak</p>
                      <p className={`text-2xl font-bold ${theme.text}`}>{hydrationStreak} days</p>
                    </div>
                  </div>
                  <div className="text-2xl">💧</div>
                </div>
              </div>
            </div>

            {/* Daily Steps */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.text} mb-3 flex items-center gap-2`}>
                <Footprints className="w-4 h-4" />
                Daily Activity
              </h3>
              
              <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className={`text-sm ${theme.textSecondary}`}>Today's Steps</p>
                    <p className={`text-3xl font-bold ${theme.text}`}>{dailySteps.toLocaleString()}</p>
                  </div>
                  <Footprints className="w-8 h-8 text-green-500" />
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${(dailySteps / stepsGoal) * 100}%` }}
                  ></div>
                </div>
                <p className={`text-xs ${theme.textSecondary} mt-2`}>
                  Goal: {stepsGoal.toLocaleString()} steps • {Math.round((dailySteps / stepsGoal) * 100)}% complete
                </p>
              </div>
            </div>

            {/* Nutrition Adherence - from meal_completions this week (Mon–Sun) */}
            <div>
              <h3 className={`text-sm font-semibold ${theme.text} mb-3 flex items-center gap-2`}>
                <Apple className="w-4 h-4" />
                Nutrition This Week
              </h3>
              <div className="grid grid-cols-7 gap-2">
                {(nutritionWeek.length === 7 ? nutritionWeek : getThisWeekDays().map((d) => ({ ...d, hasMeals: false }))).map((day, index) => (
                  <div key={day.dateStr} className="text-center">
                    <div className={`rounded-xl p-3 mb-1 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      {day.hasMeals ? '😊' : '—'}
                    </div>
                    <p className={`text-xs ${theme.textSecondary}`}>{day.dayLabel}</p>
                  </div>
                ))}
              </div>
              <p className={`text-xs ${theme.textSecondary} text-center mt-3`}>
                Days with at least one meal logged (from your meal completions)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lifestyle Achievements */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl mb-24">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <CardTitle className={`text-xl ${theme.text}`}>Lifestyle Achievements</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Display ALL lifestyle achievements with locked/unlocked states */}
              {ACHIEVEMENTS.filter(a => a.category === 'transformation' || a.category === 'lifestyle').map((achievement) => {
                // Determine user's current value for this achievement
                let currentValue = 0
                switch (achievement.id) {
                  case 'weight_goal': currentValue = userProgress.weightGoalProgress; break
                  case 'measurement_milestone': currentValue = userProgress.totalCmLost; break
                  case 'body_recomposition': currentValue = userProgress.bodyRecompCheckins; break
                  case 'hydration_habit': currentValue = userProgress.hydrationStreak; break
                  case 'sleep_specialist': currentValue = userProgress.sleepStreak; break
                  case 'nutrition_warrior': currentValue = userProgress.nutritionStreak; break
                  case 'recovery_specialist': currentValue = userProgress.recoverySessionsLogged; break
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
              💡 {ACHIEVEMENTS.filter(a => a.category === 'transformation' || a.category === 'lifestyle').length} total achievements • Tap any to view details
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
                <h3 className={`text-lg font-bold ${theme.text} mb-3`}>
                  {selectedAchievement.tier ? 'Current Achievement' : 'Next Goal'}
                </h3>
                <div className={cn(
                  "rounded-xl p-4 border-2",
                  selectedAchievement.tier === 'platinum' && "bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-300 dark:border-cyan-700",
                  selectedAchievement.tier === 'gold' && "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700",
                  selectedAchievement.tier === 'silver' && "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-300 dark:border-slate-600",
                  selectedAchievement.tier === 'bronze' && "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-300 dark:border-amber-700"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xl font-bold ${theme.text}`}>
                      {selectedAchievement.tier ? getTierIcon(selectedAchievement.tier) : '🎯'} {selectedAchievement.achievement.tiers[selectedAchievement.tier || 'bronze'].label}
                    </span>
                    <Badge className={cn(
                      "text-white",
                      selectedAchievement.tier === 'platinum' && "bg-cyan-600",
                      selectedAchievement.tier === 'gold' && "bg-yellow-600",
                      selectedAchievement.tier === 'silver' && "bg-slate-600",
                      selectedAchievement.tier === 'bronze' && "bg-amber-600",
                      !selectedAchievement.tier && "bg-slate-500"
                    )}>
                      {selectedAchievement.tier ? 'Unlocked!' : 'Locked'}
                    </Badge>
                  </div>
                  <p className={`text-sm ${theme.textSecondary}`}>
                    Progress: {selectedAchievement.value.toLocaleString()} / {selectedAchievement.achievement.tiers[selectedAchievement.tier || 'bronze'].threshold.toLocaleString()}
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
                    
                    return (
                      <div 
                        key={tier}
                        className={cn(
                          "rounded-xl p-4 border-2 transition-all",
                          isUnlocked && tier === 'platinum' && "bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-300 dark:border-cyan-700",
                          isUnlocked && tier === 'gold' && "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700",
                          isUnlocked && tier === 'silver' && "bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-300 dark:border-slate-600",
                          isUnlocked && tier === 'bronze' && "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-300 dark:border-amber-700",
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


'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3,
  TrendingUp,
  Calendar,
  Dumbbell,
  Scale,
  Target,
  Clock
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

interface SimpleChartsProps {
  loading?: boolean
}

export function SimpleCharts({ loading = false }: SimpleChartsProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  // Sample data for demonstration
  const workoutData = [
    { date: 'Mon', workouts: 1 },
    { date: 'Tue', workouts: 0 },
    { date: 'Wed', workouts: 1 },
    { date: 'Thu', workouts: 1 },
    { date: 'Fri', workouts: 0 },
    { date: 'Sat', workouts: 1 },
    { date: 'Sun', workouts: 1 }
  ]

  const weightData = [
    { week: 'Week 1', weight: 78 },
    { week: 'Week 2', weight: 77.5 },
    { week: 'Week 3', weight: 77 },
    { week: 'Week 4', weight: 76.5 }
  ]

  const maxWorkouts = Math.max(...workoutData.map(d => d.workouts))
  const maxWeight = Math.max(...weightData.map(d => d.weight))
  const minWeight = Math.min(...weightData.map(d => d.weight))

  if (loading) {
    return (
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            <p className={`${theme.textSecondary} mt-4`}>Loading charts...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className={`text-2xl font-bold ${theme.text}`}>Progress Charts</CardTitle>
                  <p className={`${theme.textSecondary}`}>Visualize your fitness journey</p>
                </div>
              </div>
              
              {/* Period Selector */}
              <div className="flex gap-2">
                {[
                  { value: '7d' as const, label: '7 Days' },
                  { value: '30d' as const, label: '30 Days' },
                  { value: '90d' as const, label: '90 Days' },
                  { value: 'all' as const, label: 'All Time' }
                ].map((period) => (
                  <Button
                    key={period.value}
                    variant={selectedPeriod === period.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod(period.value)}
                    className={cn(
                      "rounded-lg text-xs px-3",
                      selectedPeriod === period.value 
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white" 
                        : ""
                    )}
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Weekly Workout Activity */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className={`text-xl ${theme.text}`}>Weekly Activity</CardTitle>
                <p className={`text-sm ${theme.textSecondary}`}>Workouts this week</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="space-y-3">
              {workoutData.map((day, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${theme.text} w-12`}>{day.date}</span>
                  <div className="flex-1 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg transition-all duration-500"
                      style={{ width: `${(day.workouts / (maxWorkouts || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm font-bold ${theme.text} w-8 text-right`}>{day.workouts}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${theme.textSecondary}`}>Total workouts this week</span>
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {workoutData.reduce((sum, d) => sum + d.workouts, 0)} workouts
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weight Progress */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className={`text-xl ${theme.text}`}>Weight Progress</CardTitle>
                <p className={`text-sm ${theme.textSecondary}`}>Last 4 weeks</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {/* Simple Line Chart */}
            <div className="relative h-48 mb-4">
              <div className="absolute inset-0 flex items-end justify-between gap-2">
                {weightData.map((point, index) => {
                  const height = ((point.weight - minWeight) / (maxWeight - minWeight || 1)) * 100
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col items-center">
                        <span className={`text-xs font-bold ${theme.text} mb-1`}>{point.weight}kg</span>
                        <div 
                          className="w-full bg-gradient-to-t from-green-500 to-emerald-600 rounded-t-lg transition-all duration-500"
                          style={{ height: `${Math.max(height, 10)}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs ${theme.textSecondary}`}>{point.week}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${theme.textSecondary}`}>Weight change</span>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <TrendingUp className="w-3 h-3 mr-1 inline" />
                  -{(weightData[0].weight - weightData[weightData.length - 1].weight).toFixed(1)} kg
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
          <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${theme.textSecondary}`}>Average Duration</p>
                  <p className={`text-3xl font-bold ${theme.text}`}>45 min</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
          <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${theme.textSecondary}`}>Personal Records</p>
                  <p className={`text-3xl font-bold ${theme.text}`}>12</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Flame, Trophy, Target, TrendingUp, TrendingDown, Activity, Eye, RefreshCw, Plus } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface StreakMetric {
  id: string
  name: string
  days: number
  trend: 'up' | 'down' | 'stable'
  subtitle?: string
}

export default function StreakCounters() {
  const { getThemeStyles } = useTheme()
  const [loading, setLoading] = useState(true)
  const [streaks, setStreaks] = useState<StreakMetric[]>([])
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Mock data; replace with real fetch when backend ready
        setStreaks([
          { id: 'workout', name: 'Workout Streak', days: 7, trend: 'up', subtitle: 'consecutive days' },
          { id: 'hydration', name: 'Hydration Streak', days: 12, trend: 'stable', subtitle: 'days hydrated' },
          { id: 'habits', name: 'Habit Streak', days: 5, trend: 'up', subtitle: 'daily habits' }
        ])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const theme = getThemeStyles()

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400" />
    return <Activity className="w-3 h-3 text-slate-400" />
  }

  const getStreakBadge = (days: number) => {
    if (days >= 30) return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
    if (days >= 14) return 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
    if (days >= 7) return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
    if (days >= 3) return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
  }

  if (loading) {
    return (
      <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
        <CardHeader className="pb-4">
          <CardTitle className={`flex items-center gap-2 ${theme.text}`}>
            <div className="p-2 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl">
              <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            Your Streaks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 relative overflow-hidden`}>
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-500/5 rounded-full blur-3xl"></div>
      </div>

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
            <div className="p-2 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl">
              <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Your Streaks</h2>
              <p className={`text-sm ${theme.textSecondary}`}>Consistency rewards</p>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1">
              {streaks.reduce((a, s) => a + (s.days > 0 ? 1 : 0), 0)} active
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
              className="text-xs"
            >
              {viewMode === 'compact' ? 'Detailed' : 'Compact'}
              <Eye className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 relative z-10">
        {streaks.length > 0 ? (
          <div className="space-y-3">
            {streaks.map((s) => (
              <div key={s.id} className={`${theme.card} ${theme.shadow} rounded-2xl p-4 border-2 hover:shadow-xl transition-all duration-300 group hover:scale-105`}> 
                <div className="flex items-center gap-4">
                  {/* Flame with subtle animation */}
                  <div className="relative">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                      <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400 animate-[pulse_2s_ease-in-out_infinite]" />
                    </div>
                    <div className="absolute inset-0 rounded-xl blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-300 bg-orange-500/20"></div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`font-bold ${theme.text} text-sm sm:text-base`}>{s.name}</h3>
                        <p className={`text-xs ${theme.textSecondary}`}>{s.subtitle || 'active streak'}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {getTrendIcon(s.trend)}
                          <Badge className={`text-xs ${getStreakBadge(s.days)} px-2 py-1`}>{s.days} days</Badge>
                        </div>
                      </div>
                    </div>

                    {viewMode === 'detailed' && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                          <Target className="w-3 h-3" />
                          <span>Keep the streak alive</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="rounded-xl">
                            View History
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl">
                            Share
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className={`${theme.card} rounded-2xl p-4 border-2 mt-2 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Trophy className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h4 className={`text-lg font-bold ${theme.text}`}>Keep it burning! 🔥</h4>
                    <p className={`text-sm ${theme.textSecondary}`}>Consistency compounds into results</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl">
                  <Plus className="w-3 h-3 mr-1" />
                  Start New Streak
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="p-6 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-2xl w-fit mx-auto mb-6">
              <Flame className="w-12 h-12 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className={`text-xl font-bold ${theme.text} mb-2`}>
              No active streaks yet
            </h3>
            <p className={`text-sm ${theme.textSecondary} mb-4`}>
              Start a new streak today and watch it grow
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className={`${theme.primary} ${theme.shadow} rounded-xl`}>
                <Plus className="w-4 h-4 mr-2" />
                Start Streak
              </Button>
              <Button variant="outline" className="rounded-xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}



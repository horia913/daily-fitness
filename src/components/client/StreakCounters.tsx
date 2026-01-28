'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Flame, Trophy, Target, TrendingUp, TrendingDown, Activity, Eye, RefreshCw, Plus } from 'lucide-react'

interface StreakMetric {
  id: string
  name: string
  days: number
  trend: 'up' | 'down' | 'stable'
  subtitle?: string
}

export default function StreakCounters() {
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

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 fc-text-success" />
    if (trend === 'down') return <TrendingDown className="w-3 h-3 fc-text-error" />
    return <Activity className="w-3 h-3 fc-text-subtle" />
  }

  const getStreakBadge = (days: number) => {
    if (days >= 30) return 'fc-text-habits'
    if (days >= 14) return 'fc-text-warning'
    if (days >= 7) return 'fc-text-success'
    if (days >= 3) return 'fc-text-workouts'
    return 'fc-text-subtle'
  }

  if (loading) {
    return (
      <div className="fc-glass fc-card">
        <div className="pb-4 px-6 pt-6">
          <div className="flex items-center gap-3 fc-text-primary font-semibold">
            <div className="fc-icon-tile fc-icon-habits">
              <Flame className="w-5 h-5" />
            </div>
            Your Streaks
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-[color:var(--fc-glass-border)]"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fc-glass fc-card fc-accent-habits relative overflow-hidden">
      <div className="pb-4 relative z-10 px-4 sm:px-6 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 fc-text-primary">
            <div className="fc-icon-tile fc-icon-habits">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-habits">
                Consistency
              </span>
              <h2 className="text-lg sm:text-xl font-bold mt-2">Your Streaks</h2>
              <p className="text-sm fc-text-dim">Consistency rewards</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="fc-pill fc-pill-glass fc-text-habits px-3 py-1">
              {streaks.reduce((a, s) => a + (s.days > 0 ? 1 : 0), 0)} active
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
              className="text-xs fc-btn fc-btn-ghost"
            >
              {viewMode === 'compact' ? 'Detailed' : 'Compact'}
              <Eye className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 relative z-10">
        {streaks.length > 0 ? (
          <div className="space-y-3">
            {streaks.map((s) => (
              <div key={s.id} className="fc-list-row rounded-2xl p-4 group"> 
                <div className="flex items-center gap-4">
                  {/* Flame with subtle animation */}
                  <div className="relative">
                    <div className="fc-icon-tile fc-icon-habits">
                      <Flame className="w-6 h-6 fc-text-habits fc-streak-pulse" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold fc-text-primary text-sm sm:text-base">{s.name}</h3>
                        <p className="text-xs fc-text-dim">{s.subtitle || 'active streak'}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {getTrendIcon(s.trend)}
                          <span className={`fc-pill fc-pill-glass text-xs ${getStreakBadge(s.days)} px-2 py-1`}>
                            {s.days} days
                          </span>
                        </div>
                      </div>
                    </div>

                    {viewMode === 'detailed' && (
                      <div className="mt-3 pt-3 border-t border-[color:var(--fc-glass-border)] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 fc-text-habits">
                          <Target className="w-3 h-3" />
                          <span>Keep the streak alive</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="rounded-xl fc-btn fc-btn-secondary">
                            View History
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl fc-btn fc-btn-secondary">
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
            <div className="fc-glass-soft rounded-2xl p-4 border border-[color:var(--fc-glass-border)] mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="fc-icon-tile fc-icon-habits">
                    <Trophy className="w-5 h-5 fc-text-habits" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold fc-text-primary">Keep it burning! 🔥</h4>
                    <p className="text-sm fc-text-dim">Consistency compounds into results</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl fc-btn fc-btn-secondary">
                  <Plus className="w-3 h-3 mr-1" />
                  Start New Streak
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="p-6 fc-icon-tile fc-icon-habits rounded-2xl w-fit mx-auto mb-6">
              <Flame className="w-12 h-12 fc-text-habits" />
            </div>
            <h3 className="text-xl font-bold fc-text-primary mb-2">
              No active streaks yet
            </h3>
            <p className="text-sm fc-text-dim mb-4">
              Start a new streak today and watch it grow
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="fc-btn fc-btn-primary fc-press rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Start Streak
              </Button>
              <Button variant="outline" className="rounded-xl fc-btn fc-btn-secondary">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar, 
  Zap, 
  Award,
  BarChart3,
  Clock,
  Dumbbell,
  Heart,
  Star,
  ArrowRight
} from 'lucide-react'
import { useWorkoutSummary } from '@/hooks/useWorkoutSummary'

interface SummaryAnalyticsProps {
  userId: string
  className?: string
}

interface WeeklyStats {
  workoutsCompleted: number
  totalDuration: number
  averageScore: number
  consistency: number
  topExercise: string
  improvement: number
}

export function SummaryAnalytics({ userId, className = '' }: SummaryAnalyticsProps) {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('week')

  useEffect(() => {
    loadWeeklyStats()
  }, [userId, timeframe])

  const loadWeeklyStats = async () => {
    try {
      setLoading(true)
      
      // Simulate loading analytics data
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock data - in real implementation, this would come from the database
      const mockStats: WeeklyStats = {
        workoutsCompleted: 4,
        totalDuration: 180,
        averageScore: 87,
        consistency: 85,
        topExercise: 'Bench Press',
        improvement: 12
      }
      
      setWeeklyStats(mockStats)
    } catch (error) {
      console.error('Error loading weekly stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getConsistencyColor = (consistency: number) => {
    if (consistency >= 90) return 'text-green-600'
    if (consistency >= 70) return 'text-blue-600'
    if (consistency >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-yellow-600'
    if (score >= 80) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getImprovementIcon = (improvement: number) => {
    return improvement > 0 ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!weeklyStats) return null

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Performance Analytics
          </CardTitle>
          <div className="flex gap-1">
            {(['week', 'month', 'quarter'] as const).map((period) => (
              <Button
                key={period}
                variant={timeframe === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe(period)}
                className="text-xs capitalize"
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-800">{weeklyStats.workoutsCompleted}</div>
            <div className="text-xs text-blue-600">Workouts</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-800">{Math.round(weeklyStats.totalDuration / 60)}h</div>
            <div className="text-xs text-green-600">Duration</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Star className="w-5 h-5 text-purple-600" />
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(weeklyStats.averageScore)}`}>
              {weeklyStats.averageScore}
            </div>
            <div className="text-xs text-purple-600">Avg Score</div>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <div className={`text-2xl font-bold ${getConsistencyColor(weeklyStats.consistency)}`}>
              {weeklyStats.consistency}%
            </div>
            <div className="text-xs text-orange-600">Consistency</div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Performance</span>
              <span className={`text-sm font-bold ${getScoreColor(weeklyStats.averageScore)}`}>
                {weeklyStats.averageScore}/100
              </span>
            </div>
            <Progress value={weeklyStats.averageScore} className="h-2" />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Consistency</span>
              <span className={`text-sm font-bold ${getConsistencyColor(weeklyStats.consistency)}`}>
                {weeklyStats.consistency}%
              </span>
            </div>
            <Progress value={weeklyStats.consistency} className="h-2" />
          </div>
        </div>

        {/* Insights */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800">This Week's Insights</h4>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
              {getImprovementIcon(weeklyStats.improvement)}
              <span className="text-sm text-green-800">
                <strong>{Math.abs(weeklyStats.improvement)}% improvement</strong> from last week
              </span>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
              <Dumbbell className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                <strong>{weeklyStats.topExercise}</strong> was your most performed exercise
              </span>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-800">
                You're maintaining <strong>excellent consistency</strong> this week
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Details
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Target className="w-4 h-4 mr-2" />
            Set Goals
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Hook for managing summary analytics
export function useSummaryAnalytics(userId: string) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [userId])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      // Load analytics data from database
      // This would integrate with the workout summary system
      await new Promise(resolve => setTimeout(resolve, 1000))
      setAnalytics({})
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    analytics,
    loading,
    refreshAnalytics: loadAnalytics
  }
}

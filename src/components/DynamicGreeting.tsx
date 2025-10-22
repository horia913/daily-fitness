'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  Flame, 
  TrendingUp, 
  Target, 
  Star, 
  Zap, 
  Trophy, 
  Heart,
  Calendar,
  Activity,
  RefreshCw,
  Settings
} from 'lucide-react'
import { 
  TimeBasedGreetingGenerator, 
  GreetingData, 
  UserContext 
} from '@/lib/timeBasedGreetings'

interface DynamicGreetingProps {
  userContext: UserContext
  additionalContext?: {
    lastWorkoutDaysAgo?: number
    upcomingWorkout?: boolean
    goalProgress?: number
    achievements?: string[]
    todaysWorkout?: any
  }
  onRefresh?: () => void
  onSettings?: () => void
  className?: string
}

export function DynamicGreeting({
  userContext,
  additionalContext,
  onRefresh,
  onSettings,
  className = ''
}: DynamicGreetingProps) {
  const [greetingData, setGreetingData] = useState<GreetingData | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showMotivation, setShowMotivation] = useState(true)

  useEffect(() => {
    generateGreeting()
  }, [userContext, additionalContext])

  const generateGreeting = async () => {
    try {
      const greeting = TimeBasedGreetingGenerator.generateGreeting(userContext)
      setGreetingData(greeting)
    } catch (error) {
      console.error('Error generating greeting:', error)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await generateGreeting()
    setIsRefreshing(false)
    onRefresh?.()
  }

  const getTimeIcon = (period: string) => {
    switch (period) {
      case 'early_morning': return <Clock className="w-5 h-5" />
      case 'morning': return <Clock className="w-5 h-5" />
      case 'late_morning': return <Clock className="w-5 h-5" />
      case 'afternoon': return <Clock className="w-5 h-5" />
      case 'evening': return <Clock className="w-5 h-5" />
      case 'night': return <Clock className="w-5 h-5" />
      default: return <Clock className="w-5 h-5" />
    }
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'early_morning': return 'Early Morning'
      case 'morning': return 'Morning'
      case 'late_morning': return 'Late Morning'
      case 'afternoon': return 'Afternoon'
      case 'evening': return 'Evening'
      case 'night': return 'Night'
      default: return 'Day'
    }
  }

  if (!greetingData) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${greetingData.backgroundColor} ${greetingData.borderColor} border-2 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {/* Main Greeting */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{greetingData.icon}</span>
              <h1 className={`text-2xl font-bold ${greetingData.color}`}>
                {greetingData.greeting}
              </h1>
            </div>
            
            {/* Subtitle */}
            <p className="text-slate-600 mb-3">
              {greetingData.subtitle}
            </p>

            {/* Time Context Badge */}
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="flex items-center gap-1">
                {getTimeIcon(greetingData.timeContext.period)}
                {getPeriodLabel(greetingData.timeContext.period)}
              </Badge>
              {greetingData.timeContext.isWeekend && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Weekend
                </Badge>
              )}
            </div>

            {/* Streak Information */}
            {greetingData.streakInfo && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 rounded-full">
                  <Flame className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">
                    {greetingData.streakInfo.days} day streak
                  </span>
                </div>
                <span className="text-sm text-orange-600">
                  {greetingData.streakInfo.message}
                </span>
              </div>
            )}

            {/* Motivational Message */}
            {showMotivation && greetingData.motivationalMessage && (
              <div className="p-3 bg-white/50 rounded-lg mb-4">
                <div className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <p className="text-sm text-slate-700 italic">
                    {greetingData.motivationalMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Additional Context */}
            {additionalContext && (
              <div className="space-y-2">
                {/* Last Workout */}
                {additionalContext.lastWorkoutDaysAgo !== undefined && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {additionalContext.lastWorkoutDaysAgo === 0 
                        ? "Last workout: Today" 
                        : `Last workout: ${additionalContext.lastWorkoutDaysAgo} days ago`
                      }
                    </span>
                  </div>
                )}

                {/* Goal Progress */}
                {additionalContext.goalProgress !== undefined && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Target className="w-4 h-4" />
                    <span>Goal Progress: {additionalContext.goalProgress}%</span>
                  </div>
                )}

                {/* Upcoming Workout */}
                {additionalContext.upcomingWorkout && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Zap className="w-4 h-4" />
                    <span>Workout scheduled for today!</span>
                  </div>
                )}

                {/* Recent Achievements */}
                {additionalContext.achievements && additionalContext.achievements.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600">
                    <Trophy className="w-4 h-4" />
                    <span>{additionalContext.achievements.length} recent achievements!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            {onSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettings}
                className="p-2"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="text-center p-2 bg-white/30 rounded-lg">
            <div className="text-lg font-bold text-slate-800">
              {greetingData.timeContext.hour}:00
            </div>
            <div className="text-xs text-slate-600">Current Time</div>
          </div>
          
          <div className="text-center p-2 bg-white/30 rounded-lg">
            <div className="text-lg font-bold text-slate-800">
              {greetingData.timeContext.isWeekend ? 'Weekend' : 'Weekday'}
            </div>
            <div className="text-xs text-slate-600">Schedule</div>
          </div>
          
          <div className="text-center p-2 bg-white/30 rounded-lg">
            <div className="text-lg font-bold text-slate-800">
              {userContext.role === 'client' ? 'Client' : 'Coach'}
            </div>
            <div className="text-xs text-slate-600">Role</div>
          </div>
          
          <div className="text-center p-2 bg-white/30 rounded-lg">
            <div className="text-lg font-bold text-slate-800">
              {userContext.fitnessLevel || 'N/A'}
            </div>
            <div className="text-xs text-slate-600">Level</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Hook for managing dynamic greeting state
export function useDynamicGreeting(userContext: UserContext) {
  const [greetingData, setGreetingData] = useState<GreetingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generateGreeting()
  }, [userContext])

  const generateGreeting = async () => {
    try {
      setLoading(true)
      const greeting = TimeBasedGreetingGenerator.generateGreeting(userContext)
      setGreetingData(greeting)
    } catch (error) {
      console.error('Error generating greeting:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshGreeting = async () => {
    await generateGreeting()
  }

  return {
    greetingData,
    loading,
    refreshGreeting
  }
}

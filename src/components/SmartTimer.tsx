'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Timer, 
  Play, 
  Pause, 
  SkipForward, 
  Zap, 
  Heart, 
  Brain, 
  Droplets,
  Target,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react'
import { SmartTimer, ExerciseMetadata, SetData, UserProfile, SmartTimerConfig } from '@/lib/smartTimer'

interface SmartTimerProps {
  exercise: ExerciseMetadata
  setData: SetData
  userProfile: UserProfile
  config: SmartTimerConfig
  onTimerComplete: () => void
  onSkip: () => void
  className?: string
}

interface TimerState {
  timeRemaining: number
  isActive: boolean
  isPaused: boolean
  totalTime: number
  recommendations: string[]
  heartRateZone?: 'recovery' | 'aerobic' | 'threshold' | 'anaerobic' | 'neuromuscular'
  intensityLevel: 'low' | 'moderate' | 'high' | 'maximal'
}

export function SmartTimerComponent({
  exercise,
  setData,
  userProfile,
  config,
  onTimerComplete,
  onSkip,
  className = ''
}: SmartTimerProps) {
  const [state, setState] = useState<TimerState>({
    timeRemaining: 0,
    isActive: false,
    isPaused: false,
    totalTime: 0,
    recommendations: [],
    intensityLevel: 'moderate'
  })

  // Calculate optimal rest time when component mounts or dependencies change
  useEffect(() => {
    const optimalRestTime = SmartTimer.calculateOptimalRestTime(exercise, setData, userProfile, config)
    const intensityLevel = SmartTimer.determineIntensityLevel(setData, exercise)
    const recommendations = SmartTimer.getRestRecommendations(exercise, setData, userProfile, optimalRestTime)
    
    setState(prev => ({
      ...prev,
      timeRemaining: optimalRestTime,
      totalTime: optimalRestTime,
      recommendations,
      intensityLevel
    }))
  }, [exercise, setData, userProfile, config])

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (state.isActive && state.timeRemaining > 0 && !state.isPaused) {
      interval = setInterval(() => {
        setState(prev => {
          const newTimeRemaining = prev.timeRemaining - 1
          
          // Update recommendations as time progresses
          const newRecommendations = SmartTimer.getRestRecommendations(exercise, setData, userProfile, newTimeRemaining)
          
          return {
            ...prev,
            timeRemaining: newTimeRemaining,
            recommendations: newRecommendations
          }
        })
      }, 1000)
    } else if (state.timeRemaining === 0 && state.isActive) {
      // Timer completed
      setState(prev => ({ ...prev, isActive: false, isPaused: false }))
      onTimerComplete()
    }

    return () => clearInterval(interval)
  }, [state.isActive, state.timeRemaining, state.isPaused, exercise, setData, userProfile, onTimerComplete])

  const startTimer = useCallback(() => {
    setState(prev => ({ ...prev, isActive: true, isPaused: false }))
  }, [])

  const pauseTimer = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }))
  }, [])

  const resumeTimer = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false }))
  }, [])

  const skipTimer = useCallback(() => {
    setState(prev => ({ ...prev, isActive: false, isPaused: false }))
    onSkip()
  }, [onSkip])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = (): number => {
    if (state.totalTime === 0) return 0
    return ((state.totalTime - state.timeRemaining) / state.totalTime) * 100
  }

  const getIntensityColor = (intensity: string): string => {
    switch (intensity) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'moderate': return 'bg-blue-100 text-blue-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'maximal': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHeartRateZoneColor = (zone?: string): string => {
    switch (zone) {
      case 'recovery': return 'text-green-600'
      case 'aerobic': return 'text-blue-600'
      case 'threshold': return 'text-yellow-600'
      case 'anaerobic': return 'text-orange-600'
      case 'neuromuscular': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (!state.isActive && state.timeRemaining === state.totalTime) {
    // Timer not started yet
    return (
      <Card className={`bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Timer className="w-5 h-5" />
            Smart Rest Timer Ready
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-900 mb-2">
              {formatTime(state.totalTime)}
            </div>
            <p className="text-blue-700 mb-4">
              Optimal rest time calculated based on your exercise and performance
            </p>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge className={getIntensityColor(state.intensityLevel)}>
                {state.intensityLevel} intensity
              </Badge>
              <Badge variant="outline" className="text-blue-600">
                {SmartTimer.determineExerciseType(exercise)} exercise
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-blue-800">Smart Recommendations:</h4>
            <div className="space-y-2">
              {state.recommendations.map((rec, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-blue-700">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  {rec}
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={startTimer}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Smart Rest Timer
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Active timer
  return (
    <Card className={`bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Timer Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Timer className="w-6 h-6 text-orange-600" />
                {state.isPaused && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-600 rounded-full animate-pulse" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-orange-800">Smart Rest Timer</h3>
                <p className="text-3xl font-bold text-orange-900">{formatTime(state.timeRemaining)}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={state.isPaused ? resumeTimer : pauseTimer}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                {state.isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={skipTimer}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-orange-700">
              <span>Progress</span>
              <span>{Math.round(getProgressPercentage())}%</span>
            </div>
            <Progress 
              value={getProgressPercentage()} 
              className="h-3 bg-orange-200"
            />
          </div>

          {/* Smart Recommendations */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-orange-600" />
              <h4 className="font-medium text-orange-800">Smart Recommendations</h4>
            </div>
            <div className="space-y-2">
              {state.recommendations.map((rec, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-orange-700 bg-orange-100 p-2 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  {rec}
                </div>
              ))}
            </div>
          </div>

          {/* Exercise Info */}
          <div className="flex items-center justify-between text-sm text-orange-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                <span>{state.intensityLevel} intensity</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                <span>{SmartTimer.determineExerciseType(exercise)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Set {config.setNumber}/{config.totalSets}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Hook for managing smart timer state
export function useSmartTimer(
  exercise: ExerciseMetadata,
  setData: SetData,
  userProfile: UserProfile,
  config: SmartTimerConfig
) {
  const [timerState, setTimerState] = useState({
    isActive: false,
    isPaused: false,
    timeRemaining: 0,
    totalTime: 0
  })

  const calculateOptimalRest = useCallback(() => {
    return SmartTimer.calculateOptimalRestTime(exercise, setData, userProfile, config)
  }, [exercise, setData, userProfile, config])

  const getRecommendations = useCallback((timeRemaining: number) => {
    return SmartTimer.getRestRecommendations(exercise, setData, userProfile, timeRemaining)
  }, [exercise, setData, userProfile])

  const startTimer = useCallback(() => {
    const optimalTime = calculateOptimalRest()
    setTimerState({
      isActive: true,
      isPaused: false,
      timeRemaining: optimalTime,
      totalTime: optimalTime
    })
  }, [calculateOptimalRest])

  const pauseTimer = useCallback(() => {
    setTimerState(prev => ({ ...prev, isPaused: true }))
  }, [])

  const resumeTimer = useCallback(() => {
    setTimerState(prev => ({ ...prev, isPaused: false }))
  }, [])

  const skipTimer = useCallback(() => {
    setTimerState({
      isActive: false,
      isPaused: false,
      timeRemaining: 0,
      totalTime: 0
    })
  }, [])

  return {
    timerState,
    calculateOptimalRest,
    getRecommendations,
    startTimer,
    pauseTimer,
    resumeTimer,
    skipTimer
  }
}

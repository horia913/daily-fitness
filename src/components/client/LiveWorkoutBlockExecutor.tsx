'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  Clock, 
  Dumbbell, 
  Target,
  Timer,
  AlertCircle,
  Info,
  SkipForward,
  ArrowRight,
  Zap,
  Flame,
  TrendingDown,
  Link,
  PauseCircle,
  TrendingUp,
  Rocket,
  Timer as TimerIcon,
  CloudLightning,
  Activity,
  BarChart3
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  WorkoutBlock, 
  WorkoutBlockType,
  LiveWorkoutBlock,
  LiveWorkoutExercise,
  LoggedSet,
  WORKOUT_BLOCK_CONFIGS
} from '@/types/workoutBlocks'

interface LiveWorkoutBlockExecutorProps {
  block: LiveWorkoutBlock
  onBlockComplete: (blockId: string, loggedSets: LoggedSet[]) => void
  onNextBlock: () => void
}

export default function LiveWorkoutBlockExecutor({
  block,
  onBlockComplete,
  onNextBlock
}: LiveWorkoutBlockExecutorProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSetIndex, setCurrentSetIndex] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([])
  const [roundsCompleted, setRoundsCompleted] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)

  const config = WORKOUT_BLOCK_CONFIGS[block.block.block_type]
  
  // Get current exercise
  const currentExercise = block.block.exercises?.[currentExerciseIndex]
  const totalSets = block.block.total_sets || 1
  const isLastExercise = currentExerciseIndex === (block.block.exercises?.length || 1) - 1
  const isLastSet = currentSetIndex === totalSets - 1

  // Timer logic
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsActive(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isActive, timeRemaining])

  // Start timer
  const startTimer = (duration: number) => {
    setTimeRemaining(duration)
    setIsActive(true)
    setIsPaused(false)
  }

  // Pause/Resume timer
  const toggleTimer = () => {
    if (isActive) {
      setIsPaused(!isPaused)
      setIsActive(false)
    } else {
      setIsActive(true)
      setIsPaused(false)
    }
  }

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Log set
  const logSet = (exerciseId: string, weight?: number, reps?: number) => {
    const newLoggedSet: LoggedSet = {
      id: crypto.randomUUID(),
      exercise_id: exerciseId,
      block_id: block.block.id,
      set_number: currentSetIndex + 1,
      weight_kg: weight,
      reps_completed: reps,
      completed_at: new Date()
    }

    setLoggedSets(prev => [...prev, newLoggedSet])
  }

  // Complete exercise
  const completeExercise = () => {
    if (currentExercise) {
      logSet(currentExercise.exercise_id)
    }

    // Handle different block types
    switch (block.block.block_type) {
      case 'superset':
      case 'giant_set':
        // Move to next exercise without rest
        if (isLastExercise) {
          // Complete the set and start rest
          setCurrentExerciseIndex(0)
          setCurrentSetIndex(prev => prev + 1)
          if (block.block.rest_seconds) {
            startTimer(block.block.rest_seconds)
          }
        } else {
          setCurrentExerciseIndex(prev => prev + 1)
        }
        break

      case 'amrap':
        // Increment rounds
        setRoundsCompleted(prev => prev + 1)
        break

      case 'emom':
        // Wait for next minute
        const currentSeconds = new Date().getSeconds()
        const waitTime = 60 - currentSeconds
        startTimer(waitTime)
        break

      case 'tabata':
        // Handle Tabata protocol (8 rounds of 20s work / 10s rest)
        if (roundsCompleted < 7) {
          setRoundsCompleted(prev => prev + 1)
          startTimer(20) // 20 seconds work
        } else {
          // Tabata complete
          onBlockComplete(block.block.id, loggedSets)
        }
        break

      case 'for_time':
        // For time - just log completion
        onBlockComplete(block.block.id, loggedSets)
        break

      default:
        // Straight set or other types
        if (isLastSet) {
          onBlockComplete(block.block.id, loggedSets)
        } else {
          setCurrentSetIndex(prev => prev + 1)
          if (block.block.rest_seconds) {
            startTimer(block.block.rest_seconds)
          }
        }
        break
    }
  }

  // Get block-specific instructions
  const getBlockInstructions = () => {
    switch (block.block.block_type) {
      case 'superset':
        return `Complete ${currentExerciseIndex === 0 ? 'Exercise A' : 'Exercise B'}, then immediately move to ${currentExerciseIndex === 0 ? 'Exercise B' : 'next set'}. Rest only after completing both exercises.`
      
      case 'giant_set':
        return `Complete all ${block.block.exercises?.length} exercises back-to-back. Rest only after completing the entire circuit.`
      
      case 'drop_set':
        return 'Complete your set, then quickly reduce the weight and continue. No rest between drops.'
      
      case 'cluster_set':
        return 'Perform short clusters with brief rest between them. Rest longer after completing the full set.'
      
      case 'rest_pause':
        return 'Perform reps to failure, then take a brief rest-pause before continuing with the same weight.'
      
      case 'amrap':
        return `Complete as many rounds as possible in ${block.block.duration_seconds ? Math.floor(block.block.duration_seconds / 60) : 15} minutes.`
      
      case 'emom':
        return 'Perform the assigned work at the start of each minute. Rest for the remaining time in that minute.'
      
      case 'tabata':
        return `Work hard for 20 seconds, rest for 10 seconds. Complete ${8 - roundsCompleted} more rounds.`
      
      case 'for_time':
        return 'Complete all exercises as fast as possible. Focus on form and efficiency.'
      
      default:
        return 'Complete your sets with the specified reps and weight. Rest between sets as indicated.'
    }
  }

  // Get block icon
  const getBlockIcon = () => {
    switch (block.block.block_type) {
      case 'superset': return <Zap className="w-6 h-6" />
      case 'giant_set': return <Flame className="w-6 h-6" />
      case 'drop_set': return <TrendingDown className="w-6 h-6" />
      case 'cluster_set': return <Link className="w-6 h-6" />
      case 'rest_pause': return <PauseCircle className="w-6 h-6" />
      case 'pyramid_set': return <TrendingUp className="w-6 h-6" />
      case 'amrap': return <Rocket className="w-6 h-6" />
      case 'emom': return <TimerIcon className="w-6 h-6" />
      case 'tabata': return <CloudLightning className="w-6 h-6" />
      case 'for_time': return <Activity className="w-6 h-6" />
      case 'ladder': return <BarChart3 className="w-6 h-6" />
      default: return <Dumbbell className="w-6 h-6" />
    }
  }

  // Render block-specific UI
  const renderBlockSpecificUI = () => {
    switch (block.block.block_type) {
      case 'amrap':
        return (
          <div className="text-center space-y-4">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {formatTime(block.block.duration_seconds || 900 - (Date.now() - (startTimeRef.current?.getTime() || Date.now())) / 1000)}
            </div>
            <div className="text-lg text-slate-600 dark:text-slate-400">
              Rounds Completed: {roundsCompleted}
            </div>
            <Button
              onClick={completeExercise}
              className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-4"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Complete Round
            </Button>
          </div>
        )

      case 'emom':
        return (
          <div className="text-center space-y-4">
            <div className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-lg text-slate-600 dark:text-slate-400">
              {isActive ? 'Work Time' : 'Rest Time'}
            </div>
            <Button
              onClick={completeExercise}
              disabled={isActive}
              className="bg-cyan-600 hover:bg-cyan-700 text-white text-lg px-8 py-4"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Complete Work
            </Button>
          </div>
        )

      case 'tabata':
        return (
          <div className="text-center space-y-4">
            <div className={`text-6xl font-bold ${isActive ? 'text-red-600' : 'text-green-600'}`}>
              {formatTime(timeRemaining)}
            </div>
            <div className="text-2xl font-semibold">
              {isActive ? 'WORK!' : 'REST'}
            </div>
            <div className="text-lg text-slate-600 dark:text-slate-400">
              Round {roundsCompleted + 1} of 8
            </div>
            {!isActive && (
              <Button
                onClick={completeExercise}
                className="bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-4"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Work
              </Button>
            )}
          </div>
        )

      case 'for_time':
        return (
          <div className="text-center space-y-4">
            <div className="text-4xl font-bold text-rose-600 dark:text-rose-400">
              {startTimeRef.current ? formatTime(Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000)) : '0:00'}
            </div>
            <div className="text-lg text-slate-600 dark:text-slate-400">
              Complete as fast as possible
            </div>
            <Button
              onClick={completeExercise}
              className="bg-rose-600 hover:bg-rose-700 text-white text-lg px-8 py-4"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Complete Exercise
            </Button>
          </div>
        )

      default:
        return (
          <div className="text-center space-y-4">
            {/* Rest Timer */}
            {timeRemaining > 0 && (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-lg text-slate-600 dark:text-slate-400 mb-4">
                  Rest Time
                </div>
                <Button
                  onClick={toggleTimer}
                  variant="outline"
                  className="mr-2"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </Button>
              </div>
            )}

            {/* Set Information */}
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                Set {currentSetIndex + 1} of {totalSets}
              </div>
              {currentExercise && (
                <div className="text-lg text-slate-600 dark:text-slate-400 mb-4">
                  {currentExercise.exercise?.name}
                </div>
              )}
            </div>

            {/* Complete Button */}
            <Button
              onClick={completeExercise}
              className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-4"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Complete Set
            </Button>
          </div>
        )
    }
  }

  return (
    <Card className={`${theme.card} border ${theme.border} shadow-lg`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
              {getBlockIcon()}
            </div>
            <div>
              <CardTitle className="text-xl">
                {block.block.block_name || config.name}
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Block {block.block.block_order}
              </p>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="text-right">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Progress
            </div>
            <div className="text-lg font-bold text-slate-800 dark:text-white">
              {block.completedSets} / {block.totalSets}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                Instructions
              </h4>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                {getBlockInstructions()}
              </p>
            </div>
          </div>
        </div>

        {/* Block-Specific UI */}
        {renderBlockSpecificUI()}

        {/* Exercise List */}
        {block.block.exercises && block.block.exercises.length > 1 && (
          <div className="space-y-2">
            <h4 className="font-medium text-slate-800 dark:text-white">
              Exercises in this block:
            </h4>
            <div className="grid gap-2">
              {block.block.exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index === currentExerciseIndex
                      ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {exercise.exercise_letter || String.fromCharCode(65 + index)}
                    </Badge>
                    <span className="font-medium text-slate-800 dark:text-white">
                      {exercise.exercise?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span>{exercise.sets} sets</span>
                    <span>{exercise.reps} reps</span>
                    {exercise.weight_kg && (
                      <span>{exercise.weight_kg}kg</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Block Button */}
        {block.isCompleted && (
          <Button
            onClick={onNextBlock}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg py-4"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            Next Block
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

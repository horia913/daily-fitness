'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Timer, SkipForward, Play, Pause, Check, Plus, Minus } from 'lucide-react'

interface RestTimerOverlayProps {
  isActive: boolean
  initialTime: number
  onComplete: () => void
  onSkip: () => void
  exerciseName?: string
  nextSet?: number
  totalSets?: number
}

export function RestTimerOverlay({
  isActive,
  initialTime,
  onComplete,
  onSkip,
  exerciseName,
  nextSet,
  totalSets
}: RestTimerOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime)
  const [isPaused, setIsPaused] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(initialTime)
      setIsPaused(false)
      setIsCompleted(false)
      setShowWarning(false)
      return
    }

    const interval = setInterval(() => {
      if (!isPaused && timeLeft > 0) {
        setTimeLeft(prev => {
          // Show warning in last 10 seconds
          if (prev <= 10 && prev > 0) {
            setShowWarning(true)
          }
          
          if (prev <= 1) {
            setIsCompleted(true)
            // Play completion sound
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
              audio.play().catch(() => {}) // Ignore audio play errors
            } catch {}
            
            setTimeout(() => {
              onComplete()
            }, 1500) // Show completion for 1.5 seconds
            return 0
          }
          return prev - 1
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, isPaused, timeLeft, onComplete])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = ((initialTime - timeLeft) / initialTime) * 100

  const adjustTime = (seconds: number) => {
    const newTime = Math.max(0, timeLeft + seconds)
    setTimeLeft(newTime)
    if (newTime <= 10) {
      setShowWarning(true)
    }
  }

  if (!isActive) return null

  // Dynamic ring color based on state
  const ringColor = isCompleted
    ? 'var(--fc-status-success)'
    : showWarning
    ? 'var(--fc-status-warning)'
    : 'var(--fc-domain-workouts)'

  const ringBgColor = showWarning
    ? 'color-mix(in srgb, var(--fc-status-warning) 25%, transparent)'
    : 'var(--fc-surface-sunken)'

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-6 backdrop-blur-xl"
      style={{ background: 'color-mix(in srgb, var(--fc-app-bg) 85%, transparent)' }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        {/* Timer Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500"
          style={{
            background: showWarning
              ? 'color-mix(in srgb, var(--fc-status-warning) 20%, transparent)'
              : 'color-mix(in srgb, var(--fc-domain-workouts) 20%, transparent)',
          }}
        >
          <Timer
            className={`w-6 h-6 transition-all duration-500 ${showWarning ? 'animate-pulse' : ''}`}
            style={{ color: showWarning ? 'var(--fc-status-warning)' : 'var(--fc-domain-workouts)' }}
          />
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-xl font-bold fc-text-primary mb-1">
            {isCompleted ? 'Rest Complete' : showWarning ? 'Almost Ready' : 'Rest Time'}
          </h2>
          {exerciseName && (
            <p className="text-sm fc-text-dim">
              {exerciseName} {nextSet && totalSets ? `• Set ${nextSet}/${totalSets}` : ''}
            </p>
          )}
        </div>

        {/* Timer Ring */}
        <div className="relative w-52 h-52">
          <svg className="w-52 h-52 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke={ringBgColor}
              strokeWidth="6"
              fill="none"
              className="transition-all duration-500"
            />
            {/* Progress Circle */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke={ringColor}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          {/* Time Display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {isCompleted ? (
                <div className="flex flex-col items-center">
                  <Check className="w-12 h-12 mb-1" style={{ color: 'var(--fc-status-success)' }} />
                  <span className="text-base font-bold fc-text-primary">Done!</span>
                </div>
              ) : (
                <>
                  <div
                    className={`text-5xl font-bold font-mono transition-all duration-500 ${showWarning ? 'animate-pulse' : ''}`}
                    style={{ color: showWarning ? 'var(--fc-status-warning)' : 'var(--fc-text-primary)' }}
                  >
                    {formatTime(timeLeft)}
                  </div>
                  <p className="text-xs fc-text-dim mt-1 font-mono">
                    {showWarning ? 'Get ready!' : `${Math.round(progress)}%`}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        {!isCompleted && (
          <div className="w-full space-y-4">
            {/* Time Adjustment */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => adjustTime(-15)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{ background: 'var(--fc-surface-sunken)' }}
              >
                <Minus className="w-4 h-4 fc-text-dim" />
              </button>
              <span className="text-xs fc-text-dim font-mono">±15s</span>
              <button
                onClick={() => adjustTime(15)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{ background: 'var(--fc-surface-sunken)' }}
              >
                <Plus className="w-4 h-4 fc-text-dim" />
              </button>
            </div>

            {/* Main Controls */}
            <div className="flex gap-3">
              <Button
                onClick={() => setIsPaused(!isPaused)}
                variant="fc-secondary"
                className="flex-1 h-12 rounded-xl font-semibold"
              >
                {isPaused ? (
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
                onClick={onSkip}
                variant="fc-primary"
                className="flex-1 h-12 rounded-xl font-semibold"
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </Button>
            </div>
          </div>
        )}

        {/* Completion Message */}
        {isCompleted && (
          <div
            className="text-center px-6 py-4 rounded-2xl w-full"
            style={{
              background: 'color-mix(in srgb, var(--fc-status-success) 10%, var(--fc-surface-card))',
              border: '1px solid color-mix(in srgb, var(--fc-status-success) 25%, transparent)',
            }}
          >
            <p className="text-base font-bold fc-text-primary">
              Ready for your next set!
            </p>
            <p className="text-xs fc-text-dim mt-1">
              Great job. Time to crush it.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

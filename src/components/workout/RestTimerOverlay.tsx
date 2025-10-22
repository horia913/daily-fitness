'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-500 ${
      showWarning ? 'bg-gradient-to-br from-orange-900/80 to-red-900/80' : 'bg-black/60'
    }`}>
      <Card className={`w-full max-w-lg shadow-2xl border-0 transition-all duration-500 ${
        showWarning ? 'bg-gradient-to-br from-orange-50 to-red-50' : 'bg-white'
      }`}>
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
              <div className={`flex items-center justify-center mb-6 transition-all duration-500 ${
                showWarning ? 'animate-pulse' : ''
              }`}>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  showWarning 
                    ? 'bg-gradient-to-br from-orange-500 to-red-600 shadow-lg' 
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                }`}>
                  <Timer className={`w-8 h-8 ${showWarning ? 'text-white' : 'text-white'}`} />
                </div>
              </div>
              <h2 className={`text-3xl font-bold mb-3 transition-colors duration-500 ${
                showWarning ? 'text-orange-800' : 'text-slate-800'
              }`}>
                {isCompleted ? 'Rest Complete!' : showWarning ? 'Almost Ready!' : 'Rest Time'}
              </h2>
              {exerciseName && (
                <p className={`text-lg transition-colors duration-500 ${
                  showWarning ? 'text-orange-600' : 'text-slate-600'
                }`}>
                  {exerciseName} • Set {nextSet} of {totalSets}
                </p>
              )}
            </div>

            {/* Timer Display */}
            <div className="text-center">
              <div className="relative w-56 h-56 mx-auto mb-8">
                {/* Progress Circle */}
                <svg className="w-56 h-56 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke={showWarning ? "rgb(251 146 60)" : "rgb(226 232 240)"}
                    strokeWidth="10"
                    fill="none"
                    className="transition-all duration-500"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke={showWarning ? "rgb(239 68 68)" : "rgb(59 130 246)"}
                    strokeWidth="10"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                    className={`transition-all duration-1000 ease-out ${
                      showWarning ? 'drop-shadow-lg' : ''
                    }`}
                  />
                </svg>
                
                {/* Time Display */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`text-6xl font-bold transition-all duration-500 ${
                      isCompleted 
                        ? 'text-green-600' 
                        : showWarning 
                        ? 'text-orange-600 animate-pulse' 
                        : 'text-slate-800'
                    }`}>
                      {isCompleted ? (
                        <div className="flex flex-col items-center">
                          <Check className="w-20 h-20 mx-auto mb-2" />
                          <span className="text-2xl">Done!</span>
                        </div>
                      ) : (
                        formatTime(timeLeft)
                      )}
                    </div>
                    {!isCompleted && (
                      <p className={`text-lg font-medium mt-3 transition-colors duration-500 ${
                        showWarning ? 'text-orange-600' : 'text-slate-500'
                      }`}>
                        {showWarning ? 'Get Ready!' : `${Math.round(progress)}% complete`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            {!isCompleted && (
              <div className="space-y-4">
                {/* Time Adjustment */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    onClick={() => adjustTime(-15)}
                    variant="ghost"
                    size="sm"
                    className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200"
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                  <span className="text-sm font-medium text-slate-600">-15s</span>
                  
                  <Button
                    onClick={() => adjustTime(15)}
                    variant="ghost"
                    size="sm"
                    className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                  <span className="text-sm font-medium text-slate-600">+15s</span>
                </div>

                {/* Main Controls */}
                <div className="flex gap-4">
                  <Button
                    onClick={() => setIsPaused(!isPaused)}
                    variant={showWarning ? "default" : "outline"}
                    size="lg"
                    className={`flex-1 rounded-2xl transition-all duration-300 ${
                      showWarning 
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg' 
                        : 'hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Pause
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={onSkip}
                    variant="outline"
                    size="lg"
                    className={`flex-1 rounded-2xl transition-all duration-300 ${
                      showWarning 
                        ? 'border-orange-300 text-orange-600 hover:bg-orange-50' 
                        : 'hover:bg-green-50 hover:border-green-300'
                    }`}
                  >
                    <SkipForward className="w-5 h-5 mr-2" />
                    Skip
                  </Button>
                </div>
              </div>
            )}

            {/* Completion Message */}
            {isCompleted && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                  <p className="text-xl text-green-700 font-bold">
                    🎉 Ready for your next set!
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Great job! Time to crush it! 💪
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Minus, Plus, SkipForward } from 'lucide-react'

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
  totalSets,
}: RestTimerOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime)

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(initialTime)
      return
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isActive, initialTime, onComplete])

  if (!isActive) return null

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const total = initialTime <= 0 ? 1 : initialTime
  const progress = ((total - timeLeft) / total) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-[color-mix(in_srgb,var(--fc-group-c)_30%,transparent)] bg-[color-mix(in_srgb,var(--fc-group-c)_5%,transparent)] p-6 shadow-[0_0_40px_rgba(6,182,212,0.15)] backdrop-blur-md">
        <p className="mb-2 text-xs uppercase tracking-wider text-[color-mix(in_srgb,var(--fc-group-c)_70%,white)]">REST TIMER</p>
        <p className="mb-4 text-sm text-gray-400">
          Next: {exerciseName || 'Exercise'} — Set {nextSet || 1} of {totalSets || 1}
        </p>

        <div className="my-6 text-center text-6xl font-bold tabular-nums text-white">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>

        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--fc-group-c)_30%,transparent)]">
          <div
            className="h-full rounded-full bg-[color:var(--fc-group-c)] transition-all duration-700"
            style={{ width: `${100 - progress}%` }}
          />
        </div>

        <div className="mb-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setTimeLeft((v) => Math.max(0, v - 15))}
            className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--fc-group-c)_30%,transparent)] px-3 py-1.5 text-xs font-medium text-[color-mix(in_srgb,var(--fc-group-c)_35%,white)] hover:bg-[color-mix(in_srgb,var(--fc-group-c)_10%,transparent)]"
          >
            <Minus className="h-3.5 w-3.5" />
            15s
          </button>
          <button
            type="button"
            onClick={() => setTimeLeft((v) => v + 15)}
            className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--fc-group-c)_30%,transparent)] px-3 py-1.5 text-xs font-medium text-[color-mix(in_srgb,var(--fc-group-c)_35%,white)] hover:bg-[color-mix(in_srgb,var(--fc-group-c)_10%,transparent)]"
          >
            <Plus className="h-3.5 w-3.5" />
            15s
          </button>
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-800 py-3 text-gray-400 transition-colors hover:bg-gray-700"
        >
          <SkipForward className="h-4 w-4" />
          Skip rest
        </button>
      </div>
    </div>
  )
}

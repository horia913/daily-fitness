'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import OptimizedExerciseLibrary from '@/components/coach/OptimizedExerciseLibrary'

export default function ExerciseLibrary() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-7xl space-y-3 px-4 pb-32 pt-4 sm:px-6 lg:px-10">
          <Link
            href="/coach/training"
            className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)]"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            Training
          </Link>
          <header className="mb-3 flex min-h-10 items-center justify-between gap-3">
            <h1 className="text-lg font-semibold tracking-tight fc-text-primary sm:text-xl">
              Exercise library
            </h1>
          </header>

          <OptimizedExerciseLibrary coachId={user?.id || ''} />
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

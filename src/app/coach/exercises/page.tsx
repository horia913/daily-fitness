'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { GlassCard } from '@/components/ui/GlassCard'
import { Dumbbell } from 'lucide-react'
import OptimizedExerciseLibrary from '@/components/coach/OptimizedExerciseLibrary'

export default function ExerciseLibrary() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[color:var(--fc-aurora-blue)]/20">
                <Dumbbell className="w-6 h-6 text-[color:var(--fc-accent-blue)]" />
              </div>
              <div>
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Exercise Library
                </span>
                <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)]">
                  Exercises
                </h1>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Manage exercise entries and metadata.
                </p>
              </div>
            </div>
          </GlassCard>

          <OptimizedExerciseLibrary coachId={user?.id || ''} />
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

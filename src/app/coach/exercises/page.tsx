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
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-32 pt-8 sm:px-6 lg:px-10 space-y-6">
          <Link href="/coach/programs" className="fc-surface inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-surface-card-border)] px-3 py-2.5 w-fit text-[color:var(--fc-text-primary)] text-sm font-medium mb-4">
            <ArrowLeft className="w-4 h-4 shrink-0" />
            Back to Training
          </Link>
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight fc-text-primary border-b-2 border-[color:var(--fc-accent-primary)] pb-1 w-fit">
                Exercise Archive
              </h1>
              <p className="text-sm fc-text-dim mt-1 font-mono">Database index</p>
            </div>
          </header>

          <OptimizedExerciseLibrary coachId={user?.id || ''} />
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

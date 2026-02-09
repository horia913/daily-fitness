'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import OptimizedExerciseLibrary from '@/components/coach/OptimizedExerciseLibrary'

export default function ExerciseLibrary() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-32 pt-8 sm:px-6 lg:px-10 space-y-6">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight fc-text-primary border-b-2 border-[color:var(--fc-accent-primary)] pb-1 w-fit">
                Exercise Archive
              </h1>
              <p className="text-sm fc-text-dim mt-1 font-mono">Database index</p>
            </div>
          </header>

          <OptimizedExerciseLibrary coachId={user?.id || ''} />

          <Button
            className="fixed bottom-8 right-8 z-50 h-16 w-16 rounded-2xl fc-btn-primary shadow-lg"
            size="icon"
            aria-label="Add exercise"
            onClick={() => {}}
          >
            <Plus className="w-7 h-7" />
          </Button>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

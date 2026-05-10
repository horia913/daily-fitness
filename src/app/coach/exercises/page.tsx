'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import OptimizedExerciseLibrary from '@/components/coach/OptimizedExerciseLibrary'
import hub from '@/components/coach-analytics/coachAnalyticsHub.module.css'
import { cn } from '@/lib/utils'

export default function ExerciseLibrary() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell
          widthVariant="data-7xl"
          className={cn('px-4 pb-[var(--fc-bottom-safe-area)] pt-4 sm:px-6 lg:px-10 space-y-3', hub.hub)}
        >
          <OptimizedExerciseLibrary coachId={user?.id || ''} />
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { ClientPageShell } from '@/components/client-ui'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import HabitTracker from '@/components/client/HabitTracker'

export default function ClientHabitsPage() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()
  if (!user) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
            <PageSkeleton variant="list" />
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
          <HabitTracker userId={user.id} />
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

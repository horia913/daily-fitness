'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
          <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
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
        <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
          <div className="mb-4">
            <Link
              href="/client/me"
              className="fc-surface inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--fc-glass-border)]"
              aria-label="Back to Me"
            >
              <ArrowLeft className="h-4 w-4 fc-text-primary" />
            </Link>
          </div>
          <HabitTracker userId={user.id} />
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

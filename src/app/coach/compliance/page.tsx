'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { GlassCard } from '@/components/ui/GlassCard'
import { ClipboardCheck } from 'lucide-react'
import OptimizedComplianceDashboard from '@/components/coach/OptimizedComplianceDashboard'

export default function CoachCompliancePage() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen">
          <div className="relative px-4 sm:px-6 pb-16 pt-6 sm:pt-10">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
              <GlassCard elevation={2} className="fc-card-shell p-3 sm:p-6 md:p-8">
                <div className="flex flex-col gap-3 sm:gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="hidden sm:flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] flex-shrink-0">
                      <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)] truncate">
                        Compliance Dashboard
                      </h1>
                      <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] hidden sm:block">
                        Highlight follow-through, missed sessions, and at-risk clients.
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4 sm:p-6">
                <OptimizedComplianceDashboard coachId={user?.id || ''} />
              </GlassCard>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

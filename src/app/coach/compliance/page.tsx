'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { GlassCard } from '@/components/ui/GlassCard'
import { ShieldCheck } from 'lucide-react'
import OptimizedComplianceDashboard from '@/components/coach/OptimizedComplianceDashboard'
import AnalyticsNav from '@/components/coach/AnalyticsNav'

export default function CoachCompliancePage() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="data-7xl" className="p-3 pb-32 sm:p-6 md:p-6 space-y-4 sm:space-y-6">
          <AnalyticsNav />
          <GlassCard elevation={2} className="fc-card-shell p-3 sm:p-6 md:p-8">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)] truncate">
                  Compliance Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mt-1">
                  Highlight follow-through, missed sessions, and at-risk clients.
                </p>
              </div>
            </div>
          </GlassCard>
          <OptimizedComplianceDashboard coachId={user?.id || ''} />
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import OptimizedComplianceDashboard from '@/components/coach/OptimizedComplianceDashboard'
import AnalyticsNav from '@/components/coach/AnalyticsNav'
import hub from '@/components/coach-analytics/coachAnalyticsHub.module.css'
import { cn } from '@/lib/utils'

export default function CoachCompliancePage() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell
          widthVariant="data-7xl"
          className={cn('p-3 pb-[var(--fc-bottom-safe-area)] sm:p-6 md:p-6 space-y-4 sm:space-y-6', hub.hub)}
        >
          <AnalyticsNav />
          <OptimizedComplianceDashboard coachId={user?.id || ''} />
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

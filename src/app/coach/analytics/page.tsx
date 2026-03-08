'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import OptimizedAnalyticsReporting from '@/components/coach/OptimizedAnalyticsReporting'
import AnalyticsNav from '@/components/coach/AnalyticsNav'

export default function CoachAnalytics() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen p-3 sm:p-6 md:p-6 pb-32">
          <div className="max-w-7xl mx-auto">
            <AnalyticsNav />
            <OptimizedAnalyticsReporting coachId={user?.id || ''} />
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

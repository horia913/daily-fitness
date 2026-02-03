'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { Badge } from '@/components/ui/badge'
import { BarChart3 } from 'lucide-react'
import OptimizedAnalyticsReporting from '@/components/coach/OptimizedAnalyticsReporting'

export default function CoachAnalytics() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen">
          <div className="relative px-4 sm:px-6 pb-16 pt-6 sm:pt-10 w-full">
            <div className="w-full max-w-[100%] space-y-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <Badge className="fc-badge fc-badge-strong w-fit">Analytics Hub</Badge>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-semibold text-[color:var(--fc-text-primary)]">
                        Coach Analytics
                      </h1>
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        Track client trends, performance signals, and coaching impact.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full">
                <OptimizedAnalyticsReporting coachId={user?.id || ''} />
              </div>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

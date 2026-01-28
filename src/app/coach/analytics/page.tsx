'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { GlassCard } from '@/components/ui/GlassCard'
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
          <div className="relative px-6 pb-16 pt-10">
            <div className="max-w-7xl mx-auto space-y-6">
              <GlassCard className="p-6 md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-3">
                    <Badge className="fc-badge fc-badge-strong w-fit">Analytics Hub</Badge>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg">
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
              </GlassCard>

              <GlassCard className="p-4 sm:p-6">
                <OptimizedAnalyticsReporting coachId={user?.id || ''} />
              </GlassCard>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

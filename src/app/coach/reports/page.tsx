'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { GlassCard } from '@/components/ui/GlassCard'
import { FileText } from 'lucide-react'
import OptimizedDetailedReports from '@/components/coach/OptimizedDetailedReports'
import AnalyticsNav from '@/components/coach/AnalyticsNav'

export default function CoachReports() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen p-4 sm:p-6 md:p-6 pb-32">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <AnalyticsNav />
            <GlassCard elevation={2} className="fc-card-shell p-3 sm:p-6 md:p-6 lg:p-8">
              <div className="flex flex-col gap-3 sm:gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="hidden sm:flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora-green)]/20 text-[color:var(--fc-accent-green)] flex-shrink-0">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)] truncate">
                      Coaching Reports
                    </h1>
                    <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] hidden sm:block">
                      Build client-ready summaries and performance narratives.
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Single wrapper: no padding on mobile to avoid card-in-card nesting; padding from sm up */}
            <div className="rounded-none sm:rounded-2xl sm:border sm:border-[color:var(--fc-glass-border)] p-0 sm:p-4 md:p-6 sm:bg-[color:var(--fc-glass)]/50">
              <OptimizedDetailedReports coachId={user?.id || ''} />
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

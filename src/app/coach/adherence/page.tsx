'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { GlassCard } from '@/components/ui/GlassCard'
import { Filter } from 'lucide-react'
import OptimizedAdherenceTracking from '@/components/coach/OptimizedAdherenceTracking'
import AnalyticsNav from '@/components/coach/AnalyticsNav'

export default function CoachAdherencePage() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen p-2 sm:p-4 md:p-6 pb-32">
          <div className="max-w-7xl mx-auto space-y-3 sm:space-y-8">
            <AnalyticsNav />
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-3 p-3 sm:p-6 rounded-2xl fc-card-shell border border-[color:var(--fc-glass-border)]">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="hidden sm:flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] flex-shrink-0">
                  <Filter className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight fc-text-primary truncate">Adherence Overview</h1>
                  <p className="text-xs sm:text-sm text-[color:var(--fc-text-dim)] mt-1 hidden sm:block">
                    Track client follow-through and identify at-risk clients
                  </p>
                </div>
              </div>
            </header>

            <GlassCard className="p-2 sm:p-6 rounded-2xl">
              <OptimizedAdherenceTracking coachId={user?.id || ''} />
            </GlassCard>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

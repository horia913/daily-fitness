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
          <div className="relative px-6 pb-16 pt-10">
            <div className="max-w-7xl mx-auto space-y-6">
              <GlassCard elevation={2} className="fc-glass fc-card p-6 md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)]">
                      <ClipboardCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                        Compliance Dashboard
                      </h1>
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
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

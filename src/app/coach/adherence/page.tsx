'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Filter, Download, ChevronRight } from 'lucide-react'
import OptimizedAdherenceTracking from '@/components/coach/OptimizedAdherenceTracking'

export default function CoachAdherencePage() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen p-6 md:p-10 pb-32">
          <div className="max-w-4xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <nav className="flex items-center gap-2 text-sm fc-text-dim mb-2 font-mono uppercase tracking-widest">
                  <span>Coach</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="fc-text-primary">Adherence</span>
                </nav>
                <h1 className="text-3xl font-bold tracking-tight fc-text-primary">Adherence Overview</h1>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="fc-btn fc-btn-ghost">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="fc-btn fc-btn-ghost">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </header>

            <GlassCard className="p-4 sm:p-6 rounded-2xl">
              <OptimizedAdherenceTracking coachId={user?.id || ''} />
            </GlassCard>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

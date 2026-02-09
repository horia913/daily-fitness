'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import OptimizedAnalyticsReporting from '@/components/coach/OptimizedAnalyticsReporting'

const TIME_RANGES = ['This Week', 'This Month', 'This Quarter', 'All Time'] as const
type TimeRangeKey = (typeof TIME_RANGES)[number]

export default function CoachAnalytics() {
  const { user } = useAuth()
  const { performanceSettings } = useTheme()
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('This Month')

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen">
          <div className="relative w-full fc-page px-4 sm:px-6 pt-10 pb-12">
            <div className="w-full max-w-7xl mx-auto space-y-6">
              <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight fc-text-primary">Coach Analytics</h1>
                  <p className="text-sm fc-text-dim mt-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                    Live data
                  </p>
                </div>
                <Button className="fc-btn fc-btn-primary w-full sm:w-auto shrink-0" onClick={() => { /* TODO: export report */ }}>
                  <Download className="w-5 h-5 mr-2" />
                  Export Report
                </Button>
              </header>

              <section className="overflow-x-auto">
                <div className="flex p-1.5 fc-glass rounded-2xl w-fit border border-[color:var(--fc-glass-border)]">
                  {TIME_RANGES.map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setTimeRange(range)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${timeRange === range ? 'fc-glass-soft fc-text-primary' : 'fc-text-dim hover:fc-text-primary'}`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </section>

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

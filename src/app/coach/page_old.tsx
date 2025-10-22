'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { useCoachDashboardData } from '@/hooks/useDashboardData'
import { useTheme } from '@/contexts/ThemeContext'
import CoachDashboardHeader from '@/components/coach/CoachDashboardHeader'
import ActionItems from '@/components/coach/ActionItems'
import TodaySchedule from '@/components/coach/TodaySchedule'
import ComplianceSnapshot from '@/components/coach/ComplianceSnapshot'
import NewClientRequests from '@/components/coach/NewClientRequests'

export default function CoachDashboard() {
  const { todaysSessions, loading } = useCoachDashboardData()
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.background}`}>
        <div className="animate-pulse">
          <div className="h-64 bg-slate-200 dark:bg-slate-800"></div>
          <div className="p-6 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className={`${theme.card} rounded-2xl p-6`}>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <div className={`min-h-screen ${theme.background}`}>
        {/* Enhanced Header */}
        <CoachDashboardHeader />
        
        {/* Main Content */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* New Client Requests Section */}
            <NewClientRequests />

            {/* Action Items Section */}
            <ActionItems />

            {/* Today's Schedule Section */}
            <TodaySchedule sessions={todaysSessions || []} />

            {/* Client Compliance Section */}
            <ComplianceSnapshot />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
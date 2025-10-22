'use client'

import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import OptimizedAnalyticsReporting from '@/components/coach/OptimizedAnalyticsReporting'

export default function CoachAnalytics() {
  const { user } = useAuth()

  return (
    <ProtectedRoute requiredRole="coach">
      <OptimizedAnalyticsReporting coachId={user?.id || ''} />
    </ProtectedRoute>
  )
}

'use client'

import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import OptimizedDetailedReports from '@/components/coach/OptimizedDetailedReports'

export default function CoachReports() {
  const { user } = useAuth()

  return (
    <ProtectedRoute requiredRole="coach">
      <OptimizedDetailedReports coachId={user?.id || ''} />
    </ProtectedRoute>
  )
}

'use client'

import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import OptimizedComplianceDashboard from '@/components/coach/OptimizedComplianceDashboard'

export default function CoachCompliancePage() {
  const { user } = useAuth()

  return (
    <ProtectedRoute requiredRole="coach">
      <OptimizedComplianceDashboard coachId={user?.id || ''} />
    </ProtectedRoute>
  )
}

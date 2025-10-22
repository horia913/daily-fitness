'use client'

import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import OptimizedAdherenceTracking from '@/components/coach/OptimizedAdherenceTracking'

export default function CoachAdherencePage() {
  const { user } = useAuth()

  return (
    <ProtectedRoute requiredRole="coach">
      <OptimizedAdherenceTracking coachId={user?.id || ''} />
    </ProtectedRoute>
  )
}

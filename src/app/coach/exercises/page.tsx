'use client'

import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import OptimizedExerciseLibrary from '@/components/coach/OptimizedExerciseLibrary'

export default function ExerciseLibrary() {
  const { user } = useAuth()

  return (
    <ProtectedRoute requiredRole="coach">
      <OptimizedExerciseLibrary coachId={user?.id || ''} />
    </ProtectedRoute>
  )
}

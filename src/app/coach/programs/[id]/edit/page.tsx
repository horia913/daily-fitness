'use client'

import { useParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import ProgramStationShell from '@/components/coach/programs/station/ProgramStationShell'

export default function EditProgramPage() {
  const params = useParams()
  const programId = typeof params?.id === 'string' ? params.id : ''

  return (
    <ProtectedRoute requiredRole="coach">
      <ProgramStationShell programId={programId} />
    </ProtectedRoute>
  )
}

'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

/** Legacy program hub — editing is unified in the Station (client-instance mode). */
export default function ClientProgramRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const programId = params.programId as string

  useEffect(() => {
    router.replace(`/coach/clients/${clientId}/programs/${programId}/edit`)
  }, [clientId, programId, router])

  return <PageSkeleton variant="form" />
}

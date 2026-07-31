'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import ProgramStationShell from '@/components/coach/programs/station/ProgramStationShell'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { supabase } from '@/lib/supabase'
import { fetchApi } from '@/lib/apiClient'
import { useCoachClient } from '@/contexts/CoachClientContext'

export default function ClientProgramStationEditPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { clientName: contextClientName } = useCoachClient()
  const clientId = typeof params?.id === 'string' ? params.id : ''
  const programId = typeof params?.programId === 'string' ? params.programId : ''
  const assignmentIdFromUrl = searchParams.get('assignmentId')?.trim() || null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignmentId, setAssignmentId] = useState<string | null>(null)
  const [clientName, setClientName] = useState(contextClientName || '')
  const [clientAvatarUrl, setClientAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId || !programId) {
      setError('Invalid client or program')
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const resolveParams = new URLSearchParams({ programId })
        if (assignmentIdFromUrl) {
          resolveParams.set('assignmentId', assignmentIdFromUrl)
        }

        const [resolveRes, profileRes] = await Promise.all([
          fetchApi(
            `/api/coach/clients/${clientId}/program-assignments/resolve?${resolveParams.toString()}`,
          ),
          supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', clientId)
            .maybeSingle(),
        ])

        if (cancelled) return

        const profile = profileRes.data

        if (!resolveRes.ok) {
          const body = await resolveRes.json().catch(() => ({}))
          setError(
            typeof body.error === 'string'
              ? body.error
              : 'No active program assignment found for this client.',
          )
          return
        }

        const resolved = (await resolveRes.json()) as {
          assignmentId?: string
        }

        if (!resolved.assignmentId) {
          setError('No active program assignment found for this client.')
          return
        }

        setAssignmentId(resolved.assignmentId)
        const fn = (profile as { first_name?: string | null } | null)?.first_name ?? ''
        const ln = (profile as { last_name?: string | null } | null)?.last_name ?? ''
        const composed = `${fn} ${ln}`.trim()
        setClientName(composed || contextClientName || 'Client')
        setClientAvatarUrl((profile as { avatar_url?: string | null } | null)?.avatar_url ?? null)
      } catch (e) {
        if (!cancelled) {
          console.error('[ClientProgramStationEditPage] resolve failed:', e)
          setError('No active program assignment found for this client.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [clientId, programId, assignmentIdFromUrl, contextClientName])

  return (
    <ProtectedRoute requiredRole="coach">
      {loading ? (
        <PageSkeleton variant="form" />
      ) : error || !assignmentId ? (
        <div className="p-8 text-center fc-text-dim">{error ?? 'Unable to open client program editor.'}</div>
      ) : (
        <ProgramStationShell
          mode="client"
          programId={programId}
          assignmentId={assignmentId}
          clientId={clientId}
          clientName={clientName}
          clientAvatarUrl={clientAvatarUrl}
        />
      )}
    </ProtectedRoute>
  )
}

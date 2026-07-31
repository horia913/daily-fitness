'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { MobilityAssessmentForm } from '@/components/coach/mobility/MobilityAssessmentForm'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/components/ui/toast-provider'
import {
  fetchActiveMobilityCatalog,
  fetchMobilityAssessment,
  updateMobilityAssessment,
  type MobilityAssessment,
  type MobilityTestCatalogItem,
} from '@/lib/mobilityAssessmentService'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function CoachEditMobilityAssessmentPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = String(params.clientId ?? '')
  const assessmentId = String(params.assessmentId ?? '')
  const { performanceSettings } = useTheme()
  const { addToast } = useToast()
  const [catalog, setCatalog] = useState<MobilityTestCatalogItem[]>([])
  const [assessment, setAssessment] = useState<MobilityAssessment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchActiveMobilityCatalog(),
      fetchMobilityAssessment(assessmentId),
    ])
      .then(([cat, a]) => {
        if (cancelled) return
        setCatalog(cat)
        setAssessment(a)
        if (a && a.client_id !== clientId) {
          addToast({
            variant: 'destructive',
            title: 'Assessment does not belong to this client',
          })
        }
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) {
          addToast({
            variant: 'destructive',
            title: 'Could not load assessment',
            description: e instanceof Error ? e.message : 'Try again',
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [assessmentId, clientId, addToast])

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="default-5xl" className="px-4 pt-6 pb-[var(--fc-bottom-safe-area)] sm:px-6">
          <Link
            href={`/coach/testing/${clientId}/mobility`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-[color:var(--fc-accent)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Mobility history
          </Link>

          <header className="mb-6">
            <h1
              className="font-bold fc-text-primary"
              style={{ fontSize: 'var(--fc-type-h2)' }}
            >
              Edit mobility assessment
            </h1>
            <p className="mt-1 text-sm fc-text-dim">
              Blank fields are not saved. Clearing a value removes that row.
            </p>
          </header>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--fc-accent)]" />
            </div>
          ) : !assessment ? (
            <p className="text-sm fc-text-dim">Assessment not found.</p>
          ) : (
            <MobilityAssessmentForm
              key={assessment.id}
              catalog={catalog}
              initialItems={assessment.items}
              initialNotes={assessment.notes}
              initialAssessedAt={assessment.assessed_at}
              submitLabel="Update assessment"
              onCancel={() =>
                router.push(`/coach/testing/${clientId}/mobility`)
              }
              onSubmit={async ({ assessedAt, notes, items }) => {
                await updateMobilityAssessment({
                  assessmentId: assessment.id,
                  assessedAt,
                  notes,
                  items,
                })
                addToast({ variant: 'success', title: 'Assessment updated' })
                router.push(`/coach/testing/${clientId}/mobility`)
              }}
            />
          )}
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

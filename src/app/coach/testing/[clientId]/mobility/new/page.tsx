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
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast-provider'
import {
  createMobilityAssessment,
  fetchActiveMobilityCatalog,
  type MobilityTestCatalogItem,
} from '@/lib/mobilityAssessmentService'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function CoachNewMobilityAssessmentPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = String(params.clientId ?? '')
  const { performanceSettings } = useTheme()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [catalog, setCatalog] = useState<MobilityTestCatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchActiveMobilityCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data)
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) {
          addToast({
            variant: 'destructive',
            title: 'Could not load test catalog',
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
  }, [addToast])

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
              New mobility assessment
            </h1>
            <p className="mt-1 text-sm fc-text-dim">
              Battery from catalog · group by joint · leave blank to skip
            </p>
          </header>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--fc-accent)]" />
            </div>
          ) : catalog.length === 0 ? (
            <p className="text-sm fc-text-dim">No active tests in the catalog.</p>
          ) : (
            <MobilityAssessmentForm
              catalog={catalog}
              onCancel={() =>
                router.push(`/coach/testing/${clientId}/mobility`)
              }
              onSubmit={async ({ assessedAt, notes, items }) => {
                if (!user?.id) throw new Error('Not signed in')
                await createMobilityAssessment({
                  clientId,
                  assessedBy: user.id,
                  assessedAt,
                  notes,
                  items,
                })
                addToast({ variant: 'success', title: 'Assessment saved' })
                router.push(`/coach/testing/${clientId}/mobility`)
              }}
            />
          )}
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

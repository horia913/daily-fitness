'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { BodyMeasurementForm } from '@/components/coach/BodyMeasurementForm'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast-provider'
import {
  getClientMeasurements,
  isCoachMeasured,
  type BodyMeasurement,
} from '@/lib/measurementService'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function CoachEditBodyCompositionPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = String(params.clientId ?? '')
  const measurementId = String(params.measurementId ?? '')
  const { performanceSettings } = useTheme()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [row, setRow] = useState<BodyMeasurement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getClientMeasurements(clientId)
      .then((list) => {
        if (cancelled) return
        const found = list.find((m) => m.id === measurementId) ?? null
        setRow(found)
        if (found && !isCoachMeasured(found)) {
          addToast({
            variant: 'destructive',
            title: 'Only coach-measured entries can be edited here',
          })
        }
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) {
          addToast({
            variant: 'destructive',
            title: 'Could not load measurement',
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clientId, measurementId, addToast])

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell
          widthVariant="form-2xl"
          className="px-4 pt-6 pb-[var(--fc-bottom-safe-area)] sm:px-6"
        >
          <Link
            href={`/coach/testing/${clientId}/body-composition`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-[color:var(--fc-accent)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Body composition history
          </Link>

          <header className="mb-6">
            <h1
              className="font-bold fc-text-primary"
              style={{ fontSize: 'var(--fc-type-h2)' }}
            >
              Edit measurement
            </h1>
          </header>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--fc-accent)]" />
            </div>
          ) : !row || !isCoachMeasured(row) || !user?.id ? (
            <p className="text-sm fc-text-dim">
              Measurement not found or not coach-measured.
            </p>
          ) : (
            <BodyMeasurementForm
              key={row.id}
              clientId={clientId}
              coachId={user.id}
              initial={row}
              submitLabel="Update measurement"
              onCancel={() =>
                router.push(`/coach/testing/${clientId}/body-composition`)
              }
              onSuccess={() => {
                addToast({ variant: 'success', title: 'Measurement updated' })
                router.push(`/coach/testing/${clientId}/body-composition`)
              }}
            />
          )}
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

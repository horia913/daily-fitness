'use client'

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
import { ArrowLeft } from 'lucide-react'

export default function CoachNewBodyCompositionPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = String(params.clientId ?? '')
  const { performanceSettings } = useTheme()
  const { user } = useAuth()
  const { addToast } = useToast()

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
              Record measurement
            </h1>
            <p className="mt-1 text-sm fc-text-dim">
              Same form as client check-in · back-date if logging after the
              session
            </p>
          </header>

          {user?.id ? (
            <BodyMeasurementForm
              clientId={clientId}
              coachId={user.id}
              submitLabel="Save measurement"
              onCancel={() =>
                router.push(`/coach/testing/${clientId}/body-composition`)
              }
              onSuccess={() => {
                addToast({ variant: 'success', title: 'Measurement saved' })
                router.push(`/coach/testing/${clientId}/body-composition`)
              }}
            />
          ) : null}
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

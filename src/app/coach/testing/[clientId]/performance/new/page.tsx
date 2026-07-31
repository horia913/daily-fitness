'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { PerformanceResultForm } from '@/components/coach/performance/PerformanceResultForm'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast-provider'
import {
  createPerformanceResult,
  fetchActivePerformanceCatalog,
  type PerformanceTestCatalogItem,
} from '@/lib/performanceTestService'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function CoachNewPerformanceResultPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = String(params.clientId ?? '')
  const { performanceSettings } = useTheme()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [catalog, setCatalog] = useState<PerformanceTestCatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchActivePerformanceCatalog()
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
        <CoachPageShell
          widthVariant="form-2xl"
          className="px-4 pt-6 pb-[var(--fc-bottom-safe-area)] sm:px-6"
        >
          <Link
            href={`/coach/testing/${clientId}/performance`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-[color:var(--fc-accent)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Performance history
          </Link>

          <header className="mb-6">
            <h1
              className="font-bold fc-text-primary"
              style={{ fontSize: 'var(--fc-type-h2)' }}
            >
              Record performance result
            </h1>
            <p className="mt-1 text-sm fc-text-dim">
              Catalog-driven · back-date if logging after the session
            </p>
          </header>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--fc-accent)]" />
            </div>
          ) : catalog.length === 0 ? (
            <p className="text-sm fc-text-dim">No active tests in the catalog.</p>
          ) : (
            <PerformanceResultForm
              catalog={catalog}
              onCancel={() =>
                router.push(`/coach/testing/${clientId}/performance`)
              }
              onSubmit={async (payload) => {
                if (!user?.id) throw new Error('Not signed in')
                await createPerformanceResult({
                  ...payload,
                  client_id: clientId,
                  tested_by: user.id,
                })
                addToast({ variant: 'success', title: 'Result saved' })
                router.push(`/coach/testing/${clientId}/performance`)
              }}
            />
          )}
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

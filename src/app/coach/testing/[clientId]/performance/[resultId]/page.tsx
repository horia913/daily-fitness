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
import { useToast } from '@/components/ui/toast-provider'
import {
  fetchActivePerformanceCatalog,
  fetchPerformanceResult,
  updatePerformanceResult,
  type PerformanceTestCatalogItem,
  type PerformanceTestResult,
} from '@/lib/performanceTestService'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function CoachEditPerformanceResultPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = String(params.clientId ?? '')
  const resultId = String(params.resultId ?? '')
  const { performanceSettings } = useTheme()
  const { addToast } = useToast()
  const [catalog, setCatalog] = useState<PerformanceTestCatalogItem[]>([])
  const [result, setResult] = useState<PerformanceTestResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchActivePerformanceCatalog(),
      fetchPerformanceResult(resultId),
    ])
      .then(([cat, r]) => {
        if (cancelled) return
        setCatalog(cat)
        setResult(r)
        if (r && r.client_id !== clientId) {
          addToast({
            variant: 'destructive',
            title: 'Result does not belong to this client',
          })
        }
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) {
          addToast({
            variant: 'destructive',
            title: 'Could not load result',
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
  }, [resultId, clientId, addToast])

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
              Edit performance result
            </h1>
          </header>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--fc-accent)]" />
            </div>
          ) : !result ? (
            <p className="text-sm fc-text-dim">Result not found.</p>
          ) : (
            <PerformanceResultForm
              key={result.id}
              catalog={catalog}
              lockedTest={
                catalog.find((c) => c.id === result.test_id) ??
                result.test ??
                null
              }
              initial={result}
              submitLabel="Update result"
              onCancel={() =>
                router.push(`/coach/testing/${clientId}/performance`)
              }
              onSubmit={async (payload) => {
                await updatePerformanceResult(result.id, payload)
                addToast({ variant: 'success', title: 'Result updated' })
                router.push(`/coach/testing/${clientId}/performance`)
              }}
            />
          )}
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

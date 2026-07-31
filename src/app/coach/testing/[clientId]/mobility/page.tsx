'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { Button } from '@/components/ui/button'
import { ConfirmActionDialog } from '@/components/client-ui'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/components/ui/toast-provider'
import {
  deleteMobilityAssessment,
  fetchClientMobilityAssessments,
  formatAssessorAttribution,
  type MobilityAssessment,
} from '@/lib/mobilityAssessmentService'
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'

export default function CoachMobilityModulePage() {
  const params = useParams()
  const router = useRouter()
  const clientId = String(params.clientId ?? '')
  const { performanceSettings } = useTheme()
  const { addToast } = useToast()
  const [assessments, setAssessments] = useState<MobilityAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const data = await fetchClientMobilityAssessments(clientId)
      setAssessments(data)
    } catch (e) {
      console.error(e)
      addToast({
        variant: 'destructive',
        title: 'Could not load assessments',
        description: e instanceof Error ? e.message : 'Try again',
      })
      setAssessments([])
    } finally {
      setLoading(false)
    }
  }, [clientId, addToast])

  useEffect(() => {
    void load()
  }, [load])

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    setDeleting(true)
    try {
      await deleteMobilityAssessment(pendingDeleteId)
      setPendingDeleteId(null)
      addToast({ variant: 'success', title: 'Assessment deleted' })
      await load()
    } catch (e) {
      addToast({
        variant: 'destructive',
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Try again',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="form-2xl" className="px-4 pt-6 pb-[var(--fc-bottom-safe-area)] sm:px-6">
          <Link
            href={`/coach/testing/${clientId}`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-[color:var(--fc-accent)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Test modules
          </Link>

          <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-bold fc-text-primary"
                style={{ fontSize: 'var(--fc-type-h2)' }}
              >
                Mobility
              </h1>
              <p className="mt-1 text-sm fc-text-dim">
                Assessment history. Sparse battery — enter only what you test.
              </p>
            </div>
            <Button
              type="button"
              onClick={() =>
                router.push(`/coach/testing/${clientId}/mobility/new`)
              }
              className="shrink-0"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New assessment
            </Button>
          </header>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--fc-accent)]" />
            </div>
          ) : assessments.length === 0 ? (
            <div className="rounded-lg border border-[color:var(--fc-glass-border)] px-4 py-8 text-center">
              <p className="text-sm fc-text-dim">
                No mobility assessments yet for this client.
              </p>
              <Button
                type="button"
                className="mt-4"
                onClick={() =>
                  router.push(`/coach/testing/${clientId}/mobility/new`)
                }
              >
                Start first assessment
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--fc-glass-border)] border-y border-[color:var(--fc-glass-border)]">
              {assessments.map((a) => {
                const date = new Date(a.assessed_at)
                const dateLabel = Number.isNaN(date.getTime())
                  ? a.assessed_at
                  : date.toLocaleString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                return (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium fc-text-primary">{dateLabel}</p>
                      <p className="text-xs fc-text-dim">
                        {a.items.length} value
                        {a.items.length === 1 ? '' : 's'}
                        {a.notes ? ` · ${a.notes}` : ''}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[color:var(--fc-text-subtle)]">
                        {formatAssessorAttribution(a)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Edit assessment"
                        onClick={() =>
                          router.push(
                            `/coach/testing/${clientId}/mobility/${a.id}`,
                          )
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete assessment"
                        onClick={() => setPendingDeleteId(a.id)}
                      >
                        <Trash2 className="h-4 w-4 text-[color:var(--fc-status-error)]" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <ConfirmActionDialog
            open={pendingDeleteId != null}
            onOpenChange={(open) => {
              if (!open) setPendingDeleteId(null)
            }}
            title="Delete this assessment?"
            description="All recorded values for this session will be removed. This cannot be undone."
            confirmLabel="Delete"
            variant="destructive"
            confirming={deleting}
            onConfirm={() => void confirmDelete()}
          />
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

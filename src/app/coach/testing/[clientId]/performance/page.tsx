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
  deletePerformanceResult,
  fetchClientPerformanceResults,
  formatResultValue,
  isCoachTested,
  isSelfLogged,
  type PerformanceTestResult,
} from '@/lib/performanceTestService'
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CoachPerformanceModulePage() {
  const params = useParams()
  const router = useRouter()
  const clientId = String(params.clientId ?? '')
  const { performanceSettings } = useTheme()
  const { addToast } = useToast()
  const [results, setResults] = useState<PerformanceTestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const data = await fetchClientPerformanceResults(clientId)
      setResults(data)
    } catch (e) {
      console.error(e)
      addToast({
        variant: 'destructive',
        title: 'Could not load results',
        description: e instanceof Error ? e.message : 'Try again',
      })
      setResults([])
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
      await deletePerformanceResult(pendingDeleteId)
      setPendingDeleteId(null)
      addToast({ variant: 'success', title: 'Result deleted' })
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
        <CoachPageShell
          widthVariant="form-2xl"
          className="px-4 pt-6 pb-[var(--fc-bottom-safe-area)] sm:px-6"
        >
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
                Performance
              </h1>
              <p className="mt-1 text-sm fc-text-dim">
                Full history — coach-tested and self-logged, tagged by source.
              </p>
            </div>
            <Button
              type="button"
              onClick={() =>
                router.push(`/coach/testing/${clientId}/performance/new`)
              }
              className="shrink-0"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Record result
            </Button>
          </header>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--fc-accent)]" />
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-lg border border-[color:var(--fc-glass-border)] px-4 py-8 text-center">
              <p className="text-sm fc-text-dim">
                No performance results yet for this client.
              </p>
              <Button
                type="button"
                className="mt-4"
                onClick={() =>
                  router.push(`/coach/testing/${clientId}/performance/new`)
                }
              >
                Record first result
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--fc-glass-border)] border-y border-[color:var(--fc-glass-border)]">
              {results.map((r) => {
                const unit = r.test?.result_unit ?? ''
                const coach = isCoachTested(r)
                const self = isSelfLogged(r)
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium fc-text-primary">
                          {r.test?.display_name ?? 'Test'}
                        </p>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            coach
                              ? 'border-[color:var(--fc-accent)]/40 text-[color:var(--fc-accent)]'
                              : 'border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-subtle)]'
                          }`}
                        >
                          {coach ? 'Coach tested' : self ? 'Self-logged' : 'Logged'}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-sm fc-text-primary">
                        {formatResultValue(r.result_value, unit)}
                        {r.secondary_value != null && r.test?.secondary_unit
                          ? ` · ${r.test.secondary_label ?? 'Sec'}: ${formatResultValue(r.secondary_value, r.test.secondary_unit)}`
                          : ''}
                      </p>
                      <p className="text-xs fc-text-dim">{formatDate(r.tested_at)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Edit result"
                        onClick={() =>
                          router.push(
                            `/coach/testing/${clientId}/performance/${r.id}`,
                          )
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete result"
                        onClick={() => setPendingDeleteId(r.id)}
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
            title="Delete this result?"
            description="This removes the recorded value permanently."
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

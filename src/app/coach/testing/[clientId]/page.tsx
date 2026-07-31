'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { useTheme } from '@/contexts/ThemeContext'
import { fetchApi } from '@/lib/apiClient'
import {
  COACH_TESTING_MODULES,
  testingModuleHref,
} from '@/lib/coachTestingModules'
import { ArrowLeft, ChevronRight, ClipboardList, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CoachClientTestingPage() {
  const params = useParams()
  const clientId = String(params.clientId ?? '')
  const { performanceSettings } = useTheme()
  const [clientName, setClientName] = useState<string>('Client')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    setLoading(true)
    fetchApi('/api/coach/clients')
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return
        const arr = Array.isArray(body.clients) ? body.clients : []
        const match = arr.find((c: {
          client_id?: string
          profiles?: { id?: string; first_name?: string | null; last_name?: string | null; email?: string | null }
          id?: string
        }) => {
          const id = c.client_id || c.profiles?.id || c.id
          return id === clientId
        })
        if (match?.profiles) {
          const name =
            `${match.profiles.first_name ?? ''} ${match.profiles.last_name ?? ''}`.trim() ||
            match.profiles.email ||
            'Client'
          setClientName(name)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="form-2xl" className="px-4 pt-6 pb-[var(--fc-bottom-safe-area)] sm:px-6">
          <Link
            href="/coach/testing"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-[color:var(--fc-accent)]"
          >
            <ArrowLeft className="h-4 w-4" />
            All clients
          </Link>

          <header className="mb-6">
            <div className="mb-1 flex items-center gap-2 text-[color:var(--fc-accent)]">
              <ClipboardList className="h-5 w-5" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-widest">
                Testing
              </span>
            </div>
            <h1
              className="font-bold fc-text-primary"
              style={{ fontSize: 'var(--fc-type-h2)' }}
            >
              {loading ? (
                <Loader2 className="inline h-5 w-5 animate-spin" />
              ) : (
                clientName
              )}
            </h1>
            <p className="mt-1 text-sm fc-text-dim">
              Choose a test module. Coach writes; the client views results.
            </p>
          </header>

          <nav
            className="flex flex-col border-y border-[color:var(--fc-glass-border)]"
            aria-label="Test modules"
          >
            {COACH_TESTING_MODULES.map((mod) => {
              const href = testingModuleHref(clientId, mod)
              if (!mod.available) {
                return (
                  <div
                    key={mod.id}
                    className="flex w-full min-h-[52px] items-center gap-4 border-b border-[color:var(--fc-glass-border)] py-3 opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold fc-text-primary">{mod.title}</h2>
                      <p className="mt-0.5 text-xs fc-text-dim">{mod.description}</p>
                    </div>
                    <span className="text-[11px] uppercase tracking-wide text-[color:var(--fc-text-subtle)]">
                      Soon
                    </span>
                  </div>
                )
              }
              return (
                <Link
                  key={mod.id}
                  href={href}
                  className={cn(
                    'flex w-full min-h-[52px] items-center gap-4 border-b border-[color:var(--fc-glass-border)] py-3 text-left transition-colors hover:bg-[color:var(--fc-glass-highlight)]',
                    'border-l-2 border-l-[color:var(--fc-group-c)] bg-[color-mix(in_srgb,var(--fc-group-c)_5%,transparent)] pl-3',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold fc-text-primary">{mod.title}</h2>
                    <p className="mt-0.5 text-xs fc-text-dim">{mod.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--fc-accent)]/80" />
                </Link>
              )
            })}
          </nav>
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

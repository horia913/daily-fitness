'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/contexts/ThemeContext'
import { fetchApi } from '@/lib/apiClient'
import { ClipboardList, Loader2, Search, User } from 'lucide-react'

type RosterClient = {
  id: string
  status: string
  client_id?: string
  profiles?: {
    id?: string
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    avatar_url?: string | null
  } | null
}

function displayName(c: RosterClient): string {
  const p = c.profiles
  if (!p) return 'Client'
  return (
    `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() ||
    p.email ||
    'Client'
  )
}

function clientIdOf(c: RosterClient): string {
  return c.client_id || c.profiles?.id || c.id
}

export default function CoachTestingHubPage() {
  const router = useRouter()
  const { performanceSettings } = useTheme()
  const [list, setList] = useState<RosterClient[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchApi('/api/coach/clients')
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return
        const arr = Array.isArray(body.clients) ? body.clients : []
        setList(arr.filter((c: RosterClient) => c.status === 'active'))
      })
      .catch(() => {
        if (!cancelled) setList([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => displayName(c).toLowerCase().includes(q))
  }, [list, query])

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="form-2xl" className="px-4 pt-6 pb-[var(--fc-bottom-safe-area)] sm:px-6">
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
              Testing hub
            </h1>
            <p className="mt-1 text-sm fc-text-dim">
              Pick a client, then run assessments. Mobility is available now;
              more modules will land here later.
            </p>
          </header>

          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--fc-text-subtle)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients"
              className="h-11 pl-9"
              aria-label="Search clients"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--fc-accent)]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm fc-text-dim">
              {list.length === 0
                ? 'No active clients on your roster.'
                : 'No clients match that search.'}
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--fc-glass-border)] border-y border-[color:var(--fc-glass-border)]">
              {filtered.map((c) => {
                const id = clientIdOf(c)
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/coach/testing/${id}`)}
                      className="flex w-full min-h-[52px] items-center gap-3 py-3 text-left transition-colors hover:bg-[color:var(--fc-glass-highlight)]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--fc-glass-highlight)] text-[color:var(--fc-accent)]">
                        <User className="h-5 w-5" />
                      </div>
                      <span className="min-w-0 flex-1 font-medium fc-text-primary">
                        {displayName(c)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="mt-6">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/coach/training">Back to training</Link>
            </Button>
          </div>
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

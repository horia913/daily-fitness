'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/components/ui/toast-provider'
import { fetchApi } from '@/lib/apiClient'
import { supabase } from '@/lib/supabase/client'
import { calculateE1RM } from '@/lib/e1rmUtils'
import {
  ArrowLeft,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'

type ExerciseOption = {
  id: string
  name: string
}

type DraftSet = {
  key: string
  exercise_id: string
  exercise_name: string
  weight_kg: string
  reps: string
}

type RecentMax = {
  best_weight: number | null
  best_reps: number | null
  estimated_1rm: number | null
}

function toLocalDatetimeValue(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function CoachStrengthTestingPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = String(params.clientId ?? '')
  const { performanceSettings } = useTheme()
  const { addToast } = useToast()

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<ExerciseOption[]>([])
  const [drafts, setDrafts] = useState<DraftSet[]>([])
  const [testedAtLocal, setTestedAtLocal] = useState(toLocalDatetimeValue)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [recentByExercise, setRecentByExercise] = useState<
    Record<string, RecentMax>
  >({})

  const selectedExerciseIds = useMemo(
    () => [...new Set(drafts.map((d) => d.exercise_id))],
    [drafts],
  )

  const searchExercises = useCallback(async (q: string) => {
    setSearching(true)
    try {
      const term = q.trim()
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name')
        .ilike('name', `%${term}%`)
        .order('name')
        .limit(25)
      if (error) throw error
      setResults(
        (data ?? []).map((e) => ({
          id: e.id as string,
          name: e.name as string,
        })),
      )
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim().length >= 2) void searchExercises(query)
      else setResults([])
    }, 250)
    return () => clearTimeout(t)
  }, [query, searchExercises])

  useEffect(() => {
    if (selectedExerciseIds.length === 0) {
      setRecentByExercise({})
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchApi(
          `/api/coach/testing/strength-test?clientId=${encodeURIComponent(clientId)}&exerciseIds=${selectedExerciseIds.map(encodeURIComponent).join(',')}`,
        )
        const body = await res.json()
        if (cancelled || !res.ok) return
        setRecentByExercise((body.metrics ?? {}) as Record<string, RecentMax>)
      } catch {
        if (!cancelled) setRecentByExercise({})
      }
    })()
    return () => {
      cancelled = true
    }
  }, [clientId, selectedExerciseIds])

  const addExercise = (ex: ExerciseOption) => {
    setDrafts((prev) => [
      ...prev,
      {
        key: `${ex.id}-${Date.now()}-${prev.length}`,
        exercise_id: ex.id,
        exercise_name: ex.name,
        weight_kg: '',
        reps: '1',
      },
    ])
    setQuery('')
    setResults([])
  }

  const updateDraft = (key: string, patch: Partial<DraftSet>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    )
  }

  const removeDraft = (key: string) => {
    setDrafts((prev) => prev.filter((d) => d.key !== key))
  }

  const handleSave = async () => {
    if (drafts.length === 0) {
      addToast({
        variant: 'destructive',
        title: 'Add at least one test set',
      })
      return
    }
    for (const d of drafts) {
      const w = Number(d.weight_kg)
      const r = Number(d.reps)
      if (!(w > 0) || !(r > 0) || !Number.isInteger(r)) {
        addToast({
          variant: 'destructive',
          title: `Invalid set for ${d.exercise_name}`,
          description: 'Weight and whole-number reps required',
        })
        return
      }
    }

    const testedAt = new Date(testedAtLocal)
    if (Number.isNaN(testedAt.getTime())) {
      addToast({ variant: 'destructive', title: 'Invalid test date' })
      return
    }

    setSaving(true)
    try {
      const res = await fetchApi('/api/coach/testing/strength-test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId,
          testedAt: testedAt.toISOString(),
          notes: notes.trim() || undefined,
          sets: drafts.map((d) => ({
            exercise_id: d.exercise_id,
            exercise_name: d.exercise_name,
            weight_kg: Number(d.weight_kg),
            reps: Number(d.reps),
          })),
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body?.error ?? body?.details ?? 'Save failed')
      }
      const prCount = Array.isArray(body.pr_detected)
        ? body.pr_detected.filter(Boolean).length
        : 0
      addToast({
        variant: 'success',
        title: 'Strength test saved',
        description: prCount
          ? `${prCount} PR detected · logged as real session`
          : 'Logged as real workout session',
      })
      setDrafts([])
      setNotes('')
      router.push(`/coach/testing/${clientId}`)
    } catch (e) {
      addToast({
        variant: 'destructive',
        title: 'Could not save test',
        description: e instanceof Error ? e.message : 'Try again',
      })
    } finally {
      setSaving(false)
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

          <header className="mb-6">
            <h1
              className="font-bold fc-text-primary"
              style={{ fontSize: 'var(--fc-type-h2)' }}
            >
              Strength testing
            </h1>
            <p className="mt-1 text-sm fc-text-dim">
              1RM / 3RM / 5RM logged as real sets — PR and e1RM update on the
              normal path.
            </p>
          </header>

          <div className="mb-4 space-y-1.5">
            <Label htmlFor="tested-at">Tested at</Label>
            <Input
              id="tested-at"
              type="datetime-local"
              value={testedAtLocal}
              onChange={(e) => setTestedAtLocal(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="mb-4 space-y-1.5">
            <Label htmlFor="ex-search">Add exercise</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--fc-text-subtle)]" />
              <Input
                id="ex-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search exercises…"
                className="h-10 pl-9"
              />
            </div>
            {searching ? (
              <p className="text-xs fc-text-dim">Searching…</p>
            ) : results.length > 0 ? (
              <ul className="max-h-48 overflow-y-auto rounded-md border border-[color:var(--fc-glass-border)]">
                {results.map((ex) => (
                  <li key={ex.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[color:var(--fc-glass-highlight)]"
                      onClick={() => addExercise(ex)}
                    >
                      <span className="fc-text-primary">{ex.name}</span>
                      <Plus className="h-4 w-4 text-[color:var(--fc-accent)]" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {drafts.length === 0 ? (
            <p className="mb-4 rounded-lg border border-[color:var(--fc-glass-border)] px-4 py-6 text-center text-sm fc-text-dim">
              Pick an exercise, then enter the test set (e.g. 140 kg × 1).
            </p>
          ) : (
            <ul className="mb-4 space-y-3">
              {drafts.map((d) => {
                const ref = recentByExercise[d.exercise_id]
                const w = Number(d.weight_kg)
                const r = Number(d.reps)
                const previewE1 =
                  w > 0 && r > 0 ? calculateE1RM(w, r) : null
                return (
                  <li
                    key={d.key}
                    className="rounded-lg border border-[color:var(--fc-glass-border)] p-3"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium fc-text-primary">
                          {d.exercise_name}
                        </p>
                        {ref ? (
                          <p className="text-[11px] fc-text-dim">
                            Recent:{" "}
                            {ref.best_weight != null && ref.best_reps != null
                              ? `${ref.best_weight} kg × ${ref.best_reps}`
                              : '—'}
                            {ref.estimated_1rm != null
                              ? ` · e1RM ${ref.estimated_1rm.toFixed(1)} kg`
                              : ''}
                          </p>
                        ) : (
                          <p className="text-[11px] fc-text-subtle">
                            No prior max on file
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove set"
                        onClick={() => removeDraft(d.key)}
                      >
                        <Trash2 className="h-4 w-4 text-[color:var(--fc-status-error)]" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Weight (kg)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          value={d.weight_kg}
                          onChange={(e) =>
                            updateDraft(d.key, { weight_kg: e.target.value })
                          }
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Reps</Label>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          value={d.reps}
                          onChange={(e) =>
                            updateDraft(d.key, { reps: e.target.value })
                          }
                          className="h-10"
                        />
                      </div>
                    </div>
                    {previewE1 != null ? (
                      <p className="mt-1.5 text-[11px] font-mono fc-text-dim">
                        Epley e1RM ≈ {previewE1.toFixed(1)} kg
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() =>
                        setDrafts((prev) => [
                          ...prev,
                          {
                            key: `${d.exercise_id}-${Date.now()}-extra`,
                            exercise_id: d.exercise_id,
                            exercise_name: d.exercise_name,
                            weight_kg: '',
                            reps: d.reps || '1',
                          },
                        ])
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Another set of {d.exercise_name}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="mb-4 space-y-1.5">
            <Label htmlFor="session-notes">Session notes</Label>
            <Textarea
              id="session-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional"
            />
          </div>

          <Button
            type="button"
            disabled={saving || drafts.length === 0}
            onClick={() => void handleSave()}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save strength test'
            )}
          </Button>
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}

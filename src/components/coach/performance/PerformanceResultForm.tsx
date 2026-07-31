'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  formatCategoryLabel,
  groupCatalogByCategory,
  parseTimeOrNumber,
  type PerformanceResultInput,
  type PerformanceTestCatalogItem,
  type PerformanceTestResult,
} from '@/lib/performanceTestService'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatSecondsInput(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return String(seconds)
}

export type PerformanceResultFormProps = {
  catalog: PerformanceTestCatalogItem[]
  /** Pre-selected catalog test (edit, or client flow with fixed test) */
  lockedTest?: PerformanceTestCatalogItem | null
  initial?: PerformanceTestResult | null
  submitLabel?: string
  onSubmit: (
    payload: Omit<PerformanceResultInput, 'client_id' | 'tested_by'>,
  ) => Promise<void>
  onCancel?: () => void
  /** Compact styling for client modal */
  variant?: 'coach' | 'client'
}

export function PerformanceResultForm({
  catalog,
  lockedTest = null,
  initial = null,
  submitLabel = 'Save result',
  onSubmit,
  onCancel,
  variant = 'coach',
}: PerformanceResultFormProps) {
  const groups = groupCatalogByCategory(catalog)
  const [testId, setTestId] = useState(
    () => lockedTest?.id ?? initial?.test_id ?? catalog[0]?.id ?? '',
  )
  const selected =
    lockedTest ??
    catalog.find((t) => t.id === testId) ??
    catalog[0] ??
    null

  const [testedAtLocal, setTestedAtLocal] = useState(() =>
    toLocalDatetimeValue(initial?.tested_at ?? new Date().toISOString()),
  )
  const [resultRaw, setResultRaw] = useState(() => {
    if (initial?.result_value == null) return ''
    if (selected?.result_unit === 's') {
      return formatSecondsInput(Number(initial.result_value))
    }
    return String(initial.result_value)
  })
  const [secondaryRaw, setSecondaryRaw] = useState(
    initial?.secondary_value != null ? String(initial.secondary_value) : '',
  )
  const [perceivedEffort, setPerceivedEffort] = useState(
    initial?.perceived_effort != null ? String(initial.perceived_effort) : '',
  )
  const [conditions, setConditions] = useState(initial?.conditions ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!selected) {
      setError('Pick a test')
      return
    }
    const result_value = parseTimeOrNumber(resultRaw)
    if (result_value == null) {
      setError(
        selected.result_unit === 's'
          ? 'Enter a valid result (e.g. 3.45 or 5:30)'
          : 'Enter a valid result value',
      )
      return
    }

    let secondary_value: number | null = null
    if (selected.secondary_unit) {
      if (secondaryRaw.trim()) {
        const s = Number(secondaryRaw)
        if (!Number.isFinite(s)) {
          setError(`Enter a valid ${selected.secondary_label ?? 'secondary'} value`)
          return
        }
        secondary_value = s
      }
    }

    let perceived: number | null = null
    if (perceivedEffort.trim()) {
      perceived = parseInt(perceivedEffort, 10)
      if (!Number.isFinite(perceived) || perceived < 1 || perceived > 10) {
        setError('Perceived effort must be 1–10')
        return
      }
    }

    const testedAt = new Date(testedAtLocal)
    if (Number.isNaN(testedAt.getTime())) {
      setError('Invalid test date')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        test_id: selected.id,
        tested_at: testedAt.toISOString(),
        result_value,
        secondary_value,
        conditions: conditions.trim() || null,
        perceived_effort: perceived,
        notes: notes.trim() || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    variant === 'client'
      ? 'h-11 rounded-lg border border-[color:var(--ps-line)] bg-transparent'
      : 'h-10'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!lockedTest && (
        <div className="space-y-2">
          <Label>Test</Label>
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.category}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--fc-text-subtle)]">
                  {formatCategoryLabel(g.category)}
                </p>
                <div className="flex flex-col gap-1">
                  {g.items.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTestId(t.id)
                        setResultRaw('')
                        setSecondaryRaw('')
                      }}
                      className={cn(
                        'rounded-md border px-3 py-2 text-left text-sm transition-colors',
                        testId === t.id
                          ? 'border-[color:var(--fc-accent)] bg-[color:var(--fc-accent)]/10 text-[color:var(--fc-text-primary)]'
                          : 'border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-dim)] hover:bg-[color:var(--fc-glass-highlight)]',
                      )}
                    >
                      <span className="font-medium">{t.display_name}</span>
                      <span className="ml-2 text-[11px] text-[color:var(--fc-text-subtle)]">
                        {t.result_unit}
                        {t.secondary_unit
                          ? ` · +${t.secondary_label ?? t.secondary_unit}`
                          : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <>
          {lockedTest && (
            <p className="text-sm text-[color:var(--fc-text-dim)]">
              {selected.display_name}
              {selected.description ? ` — ${selected.description}` : ''}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="tested-at">Tested at</Label>
            <Input
              id="tested-at"
              type="datetime-local"
              value={testedAtLocal}
              onChange={(e) => setTestedAtLocal(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="result-value">
              Result ({selected.result_unit})
              {selected.result_unit === 's' ? ' — seconds or MM:SS' : ''}
            </Label>
            <Input
              id="result-value"
              value={resultRaw}
              onChange={(e) => setResultRaw(e.target.value)}
              placeholder={selected.result_unit === 's' ? 'e.g. 3.45 or 5:30' : '—'}
              className={inputClass}
              required
              autoFocus={Boolean(lockedTest)}
            />
          </div>

          {selected.secondary_unit ? (
            <div className="space-y-1.5">
              <Label htmlFor="secondary-value">
                {selected.secondary_label ?? 'Secondary'} ({selected.secondary_unit})
              </Label>
              <Input
                id="secondary-value"
                type="number"
                step="any"
                value={secondaryRaw}
                onChange={(e) => setSecondaryRaw(e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="rpe">Perceived effort (1–10)</Label>
            <Input
              id="rpe"
              type="number"
              min={1}
              max={10}
              value={perceivedEffort}
              onChange={(e) => setPerceivedEffort(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conditions">Conditions</Label>
            <Input
              id="conditions"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Optional (e.g. indoor, wet track)"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional — sprint splits can go here"
            />
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-[color:var(--fc-status-error)]" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-[color:var(--fc-glass-border)] pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving || !selected} className="min-w-[9rem]">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  )
}

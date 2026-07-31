'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  formatJointLabel,
  groupCatalogByJoint,
  measureUnit,
  type MobilityAssessmentItemInput,
  type MobilityAssessmentItemRow,
  type MobilityMeasureType,
  type MobilitySide,
  type MobilityTestCatalogItem,
} from '@/lib/mobilityAssessmentService'
import { Loader2 } from 'lucide-react'

type EntryState = {
  /** Raw string for numeric; for grade/passfail use sentinel or empty */
  value: string
  notes: string
}

function entryKey(testId: string, side: MobilitySide): string {
  return `${testId}:${side}`
}

function emptyEntries(): Record<string, EntryState> {
  return {}
}

function entriesFromItems(
  items: MobilityAssessmentItemRow[],
  catalogById: Map<string, MobilityTestCatalogItem>,
): Record<string, EntryState> {
  const next: Record<string, EntryState> = {}
  for (const item of items) {
    const test = catalogById.get(item.test_id)
    const key = entryKey(item.test_id, item.side)
    let value = String(item.value)
    if (test?.measure_type === 'passfail') {
      value = Number(item.value) >= 1 ? 'pass' : 'fail'
    }
    next[key] = { value, notes: item.notes ?? '' }
  }
  return next
}

function parseEnteredValue(
  measureType: MobilityMeasureType,
  raw: string,
): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (measureType === 'passfail') {
    if (trimmed === 'pass') return 1
    if (trimmed === 'fail') return 0
    return null
  }
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return null
  if (measureType === 'grade') {
    if (n < 0 || n > 5 || !Number.isInteger(n)) return null
  }
  return n
}

/** Only non-blank fields become rows — sparse by design. */
export function collectSparseItems(
  catalog: MobilityTestCatalogItem[],
  entries: Record<string, EntryState>,
): MobilityAssessmentItemInput[] {
  const items: MobilityAssessmentItemInput[] = []
  for (const test of catalog) {
    const sides: MobilitySide[] = test.bilateral
      ? ['left', 'right']
      : ['bilateral']
    for (const side of sides) {
      const state = entries[entryKey(test.id, side)]
      if (!state) continue
      const value = parseEnteredValue(test.measure_type, state.value)
      if (value == null) continue
      items.push({
        test_id: test.id,
        side,
        value,
        notes: state.notes.trim() || null,
      })
    }
  }
  return items
}

const GRADE_OPTIONS = [0, 1, 2, 3, 4, 5] as const

function NormHint({
  min,
  max,
  unit,
}: {
  min: number | null
  max: number | null
  unit: string | null
}) {
  if (min == null && max == null) return null
  const u = unit ?? ''
  let label = ''
  if (min != null && max != null) label = `Norm ${min}–${max}${u}`
  else if (min != null) label = `Norm ≥${min}${u}`
  else label = `Norm ≤${max}${u}`
  return (
    <span className="text-[11px] text-[color:var(--fc-text-subtle)]">{label}</span>
  )
}

function SideInput({
  test,
  side,
  state,
  onChange,
}: {
  test: MobilityTestCatalogItem
  side: MobilitySide
  state: EntryState
  onChange: (next: EntryState) => void
}) {
  const unit = measureUnit(test.measure_type)
  const sideLabel =
    side === 'left' ? 'L' : side === 'right' ? 'R' : null

  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      {sideLabel && (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--fc-text-subtle)]">
          {sideLabel}
        </span>
      )}

      {test.measure_type === 'degrees' || test.measure_type === 'cm' ? (
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            value={state.value}
            onChange={(e) => onChange({ ...state, value: e.target.value })}
            placeholder="—"
            className="h-10 pr-10"
            aria-label={`${test.display_name}${sideLabel ? ` ${sideLabel}` : ''}`}
          />
          {unit && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[color:var(--fc-text-subtle)]">
              {unit}
            </span>
          )}
        </div>
      ) : null}

      {test.measure_type === 'grade' ? (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1">
            {GRADE_OPTIONS.map((g) => {
              const selected = state.value === String(g)
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...state,
                      value: selected ? '' : String(g),
                    })
                  }
                  className={cn(
                    'h-9 w-9 rounded-md border text-sm font-semibold transition-colors',
                    selected
                      ? 'border-[color:var(--fc-accent)] bg-[color:var(--fc-accent)]/15 text-[color:var(--fc-accent)]'
                      : 'border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-dim)] hover:bg-[color:var(--fc-glass-highlight)]',
                  )}
                  aria-pressed={selected}
                  aria-label={`Grade ${g}`}
                >
                  {g}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-[color:var(--fc-text-subtle)]">
            0 = no contraction · 5 = normal
          </p>
        </div>
      ) : null}

      {test.measure_type === 'passfail' ? (
        <div className="flex gap-1">
          {(['pass', 'fail'] as const).map((opt) => {
            const selected = state.value === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  onChange({
                    ...state,
                    value: selected ? '' : opt,
                  })
                }
                className={cn(
                  'h-9 flex-1 rounded-md border text-sm font-semibold capitalize transition-colors',
                  selected
                    ? opt === 'pass'
                      ? 'border-[color:var(--fc-status-success)] bg-[color:var(--fc-status-success)]/15 text-[color:var(--fc-status-success)]'
                      : 'border-[color:var(--fc-status-error)] bg-[color:var(--fc-status-error)]/15 text-[color:var(--fc-status-error)]'
                    : 'border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-dim)] hover:bg-[color:var(--fc-glass-highlight)]',
                )}
                aria-pressed={selected}
              >
                {opt}
              </button>
            )
          })}
        </div>
      ) : null}

      <Input
        value={state.notes}
        onChange={(e) => onChange({ ...state, notes: e.target.value })}
        placeholder="Note (optional)"
        className="h-8 text-xs"
      />
    </div>
  )
}

export type MobilityAssessmentFormProps = {
  catalog: MobilityTestCatalogItem[]
  initialItems?: MobilityAssessmentItemRow[]
  initialNotes?: string | null
  initialAssessedAt?: string
  submitLabel?: string
  onSubmit: (payload: {
    assessedAt: string
    notes: string
    items: MobilityAssessmentItemInput[]
  }) => Promise<void>
  onCancel?: () => void
}

export function MobilityAssessmentForm({
  catalog,
  initialItems = [],
  initialNotes = '',
  initialAssessedAt,
  submitLabel = 'Save assessment',
  onSubmit,
  onCancel,
}: MobilityAssessmentFormProps) {
  const catalogById = useMemo(
    () => new Map(catalog.map((t) => [t.id, t])),
    [catalog],
  )
  const groups = useMemo(() => groupCatalogByJoint(catalog), [catalog])

  const [entries, setEntries] = useState<Record<string, EntryState>>(() =>
    entriesFromItems(initialItems, catalogById),
  )
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [assessedAtLocal, setAssessedAtLocal] = useState(() => {
    const d = initialAssessedAt ? new Date(initialAssessedAt) : new Date()
    if (Number.isNaN(d.getTime())) {
      const now = new Date()
      return now.toISOString().slice(0, 16)
    }
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setEntry = (key: string, next: EntryState) => {
    setEntries((prev) => ({ ...prev, [key]: next }))
  }

  const getEntry = (testId: string, side: MobilitySide): EntryState =>
    entries[entryKey(testId, side)] ?? { value: '', notes: '' }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const items = collectSparseItems(catalog, entries)
    if (items.length === 0) {
      setError('Enter at least one test value before saving.')
      return
    }
    const assessedAt = new Date(assessedAtLocal)
    if (Number.isNaN(assessedAt.getTime())) {
      setError('Invalid assessment date.')
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        assessedAt: assessedAt.toISOString(),
        notes,
        items,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="assessed-at">Assessed at</Label>
          <Input
            id="assessed-at"
            type="datetime-local"
            value={assessedAtLocal}
            onChange={(e) => setAssessedAtLocal(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="assessment-notes">Assessment notes</Label>
          <Textarea
            id="assessment-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional session notes"
          />
        </div>
      </div>

      <p className="text-xs text-[color:var(--fc-text-dim)]">
        Sparse save — only values you enter are stored. Leave blank to skip a
        test.
      </p>

      {groups.map((group) => (
        <section key={group.joint} className="space-y-3">
          <h3 className="border-b border-[color:var(--fc-glass-border)] pb-2 text-sm font-semibold uppercase tracking-wide text-[color:var(--fc-accent)]">
            {formatJointLabel(group.joint)}
          </h3>
          <ul className="space-y-4">
            {group.items.map((test) => {
              const sides: MobilitySide[] = test.bilateral
                ? ['left', 'right']
                : ['bilateral']
              return (
                <li
                  key={test.id}
                  className="rounded-lg border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)]/30 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[color:var(--fc-text-primary)]">
                        {test.display_name}
                      </p>
                      <p className="text-[11px] text-[color:var(--fc-text-subtle)]">
                        {test.test_kind === 'rom' ? 'ROM' : 'Strength'} ·{' '}
                        {test.measure_type}
                      </p>
                    </div>
                    <NormHint
                      min={test.norm_min}
                      max={test.norm_max}
                      unit={measureUnit(test.measure_type)}
                    />
                  </div>
                  <div
                    className={cn(
                      'flex gap-3',
                      test.bilateral ? 'flex-row' : 'flex-col',
                    )}
                  >
                    {sides.map((side) => (
                      <SideInput
                        key={side}
                        test={test}
                        side={side}
                        state={getEntry(test.id, side)}
                        onChange={(next) =>
                          setEntry(entryKey(test.id, side), next)
                        }
                      />
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

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
        <Button type="submit" disabled={saving} className="min-w-[10rem]">
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

/** Exported for tests / sparse-save verification helpers */
export { emptyEntries, entryKey }

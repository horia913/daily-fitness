'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { ProgramDraftState } from '@/types/programDraft'
import {
  applyFillStamp,
  blockEndWeek,
  buildFillPreview,
  buildInitialScopeMatchKeys,
  clampEndWeek,
  defaultEndWeek,
  enumeratePropertiesForSlots,
  FILL_PROPERTY_LABELS,
  type ExerciseMatchKey,
  type FillPatternKind,
  type FillPreview,
  type FillPropertyKey,
  type FillScope,
  type FillStampConfig,
} from '@/lib/programs/fillTool'
import {
  findSlotByMatchKey,
  getSourceWorkout,
  sortedGroups,
  sourceWeekSessionDays,
} from '@/lib/programs/fillTool/matching'
import type { CanvasExercise } from '@/lib/groupModel/canvasTypes'
import { programDayLabel } from '@/lib/programs/stationScheduleUtils'

export interface FillToolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: ProgramDraftState
  onApply: (next: ProgramDraftState, result: { writtenCount: number; skipped: number }) => void
  sourceAbsoluteWeek: number
  sourceProgramDay: number
  activeBlockId: string | null
  initialScope: FillScope
  initialGroupId?: string
  initialSlotId?: string
}

type DialogStep = 'config' | 'preview'

const PATTERN_LABELS: Record<FillPatternKind, string> = {
  linear: 'Linear',
  step: 'Step',
  hold: 'Hold',
  wave: 'Wave',
}

const SCOPE_LABELS: Record<FillScope, string> = {
  exercise: 'This exercise',
  group: 'This group',
  day: 'Whole day',
  week: 'Whole source week',
}

function skipReasonLabel(reason: string): string {
  switch (reason) {
    case 'different_exercise':
      return 'Different exercise in this slot'
    case 'property_not_ramped':
      return 'Property not on source (structure copied only)'
    case 'non_numeric_reps':
      return 'Non-numeric reps (copied as-is)'
    default:
      return reason
  }
}

export function FillToolDialog({
  open,
  onOpenChange,
  draft,
  onApply,
  sourceAbsoluteWeek,
  sourceProgramDay,
  activeBlockId,
  initialScope,
  initialGroupId,
  initialSlotId,
}: FillToolDialogProps) {
  const [step, setStep] = useState<DialogStep>('config')
  const [scope, setScope] = useState<FillScope>(initialScope)
  const [property, setProperty] = useState<FillPropertyKey | null>(null)
  const [pattern, setPattern] = useState<FillPatternKind>('linear')
  const [stepSize, setStepSize] = useState('2.5')
  const [holdWeeks, setHoldWeeks] = useState('2')
  const [jumpSize, setJumpSize] = useState('5')
  const [waveLength, setWaveLength] = useState('3')
  const [withinStep, setWithinStep] = useState('5')
  const [cycleStep, setCycleStep] = useState('2.5')
  const [endAbsoluteWeek, setEndAbsoluteWeek] = useState(1)
  const [preview, setPreview] = useState<FillPreview | null>(null)
  const [scopeMatchKeys, setScopeMatchKeys] = useState<ExerciseMatchKey[]>([])

  const source = useMemo(
    () => getSourceWorkout(draft, sourceAbsoluteWeek, sourceProgramDay),
    [draft, sourceAbsoluteWeek, sourceProgramDay],
  )

  const defaultEnd = useMemo(
    () => defaultEndWeek(draft, sourceAbsoluteWeek, activeBlockId),
    [draft, sourceAbsoluteWeek, activeBlockId],
  )

  const minEnd = sourceAbsoluteWeek + 1

  const blockEnd = useMemo(
    () => blockEndWeek(draft, activeBlockId),
    [draft, activeBlockId],
  )

  useEffect(() => {
    if (!open) return
    setStep('config')
    setScope(initialScope)
    setPattern('linear')
    setStepSize('2.5')
    setHoldWeeks('2')
    setJumpSize('5')
    setWaveLength('3')
    setWithinStep('5')
    setCycleStep('2.5')
    setEndAbsoluteWeek(defaultEnd)
    setPreview(null)
    const keys = buildInitialScopeMatchKeys(
      draft,
      sourceAbsoluteWeek,
      sourceProgramDay,
      initialScope,
      initialGroupId,
      initialSlotId,
    )
    setScopeMatchKeys(keys)
  }, [
    open,
    initialScope,
    initialGroupId,
    initialSlotId,
    draft,
    sourceAbsoluteWeek,
    sourceProgramDay,
    defaultEnd,
  ])

  useEffect(() => {
    if (!open) return
    setEndAbsoluteWeek((prev) => clampEndWeek(sourceAbsoluteWeek, prev, blockEnd))
  }, [open, sourceAbsoluteWeek, blockEnd])

  useEffect(() => {
    if (!open) return
    setScopeMatchKeys(
      buildInitialScopeMatchKeys(
        draft,
        sourceAbsoluteWeek,
        sourceProgramDay,
        scope,
        initialGroupId,
        initialSlotId,
      ),
    )
  }, [open, scope, draft, sourceAbsoluteWeek, sourceProgramDay, initialGroupId, initialSlotId])

  const scopedSlots = useMemo((): CanvasExercise[] => {
    if (!source && scope !== 'week') return []
    if (scope === 'week') {
      return sourceWeekSessionDays(draft, sourceAbsoluteWeek).flatMap((day) => {
        const daySource = getSourceWorkout(draft, sourceAbsoluteWeek, day)
        if (!daySource) return []
        return sortedGroups(daySource.workout).flatMap((group) => group.slots)
      })
    }
    if (!source) return []
    if (scope === 'day') {
      return sortedGroups(source.workout).flatMap((group) => group.slots)
    }
    if (scope === 'group') {
      const groupIndex = scopeMatchKeys[0]?.groupIndex
      if (groupIndex == null) return []
      return sortedGroups(source.workout)[groupIndex]?.slots ?? []
    }
    return scopeMatchKeys
      .map((key) => findSlotByMatchKey(source.workout, key)?.slot)
      .filter((slot): slot is CanvasExercise => slot != null)
  }, [source, scope, scopeMatchKeys, draft, sourceAbsoluteWeek])

  const isHold = pattern === 'hold'

  const availableProperties = useMemo(() => {
    if (isHold || !source || scopedSlots.length === 0) return []
    return enumeratePropertiesForSlots(scopedSlots)
  }, [source, scopedSlots, isHold])

  useEffect(() => {
    if (!open || isHold) return
    if (availableProperties.length === 0) {
      setProperty(null)
      return
    }
    setProperty((prev) =>
      prev && availableProperties.includes(prev) ? prev : availableProperties[0],
    )
  }, [open, availableProperties, isHold])

  const buildConfig = (): FillStampConfig | null => {
    if (!isHold && !property) return null
    const rampProperty: FillPropertyKey | null = isHold ? null : property

    const keys =
      scope === 'day' || scope === 'week'
        ? []
        : scopeMatchKeys.length > 0
          ? scopeMatchKeys
          : buildInitialScopeMatchKeys(
              draft,
              sourceAbsoluteWeek,
              sourceProgramDay,
              scope,
              initialGroupId,
              initialSlotId,
            )

    const patternInputs =
      pattern === 'linear'
        ? { step: Number(stepSize) || 0 }
        : pattern === 'step'
          ? { hold: Number(holdWeeks) || 1, jump: Number(jumpSize) || 0 }
          : pattern === 'wave'
            ? {
                waveLength: Number(waveLength) || 1,
                withinStep: Number(withinStep) || 0,
                cycleStep: Number(cycleStep) || 0,
              }
            : {}

    return {
      sourceAbsoluteWeek,
      sourceProgramDay,
      scope,
      scopeMatchKeys: keys,
      property: rampProperty,
      pattern,
      patternInputs,
      endAbsoluteWeek: clampEndWeek(sourceAbsoluteWeek, endAbsoluteWeek, blockEnd),
      activeBlockId,
    }
  }

  const handlePreview = () => {
    const config = buildConfig()
    if (!config) return
    const nextPreview = buildFillPreview(draft, config)
    if (!nextPreview) return
    if (!nextPreview.summary.sourceEmpty && nextPreview.rows.length === 0) return
    setPreview(nextPreview)
    setStep('preview')
  }

  const handleApply = () => {
    if (!preview || preview.summary.sourceEmpty) return
    const result = applyFillStamp(draft, preview)
    onApply(result.draft, {
      writtenCount: result.writtenCount,
      skipped: preview.summary.skippedDifferent,
    })
    onOpenChange(false)
  }

  const canPreview = Boolean(
    source &&
      (isHold ||
        (availableProperties.length > 0 && property && availableProperties.includes(property))),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          step === 'preview'
            ? 'max-w-[min(98vw,112rem)] w-full max-h-[92vh] overflow-hidden flex flex-col gap-4 p-6'
            : 'max-w-[min(98vw,112rem)] w-full max-h-[92vh] overflow-y-auto'
        }
        data-testid="fill-tool-dialog"
      >
        <DialogHeader>
          <DialogTitle>Fill across weeks</DialogTitle>
          <p className="text-sm text-[var(--pe-t3)]">
            {programDayLabel(sourceProgramDay)} · Week {sourceAbsoluteWeek} is the ramp baseline.
            {scope === 'week'
              ? ' Week scope stamps all sessions from this source week forward.'
              : ' Same exercise in range is re-ramped; empty slots are filled; different exercises are skipped.'}{' '}
            No rule is stored.
          </p>
        </DialogHeader>

        {step === 'config' ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--pe-t3)]">
                  Scope
                </label>
                <select
                  className="w-full rounded-lg border border-[var(--pe-line)] bg-transparent px-3 py-2 text-sm text-[var(--pe-t1)]"
                  value={scope}
                  onChange={(e) => setScope(e.target.value as FillScope)}
                  data-testid="fill-scope-select"
                >
                  {(Object.keys(SCOPE_LABELS) as FillScope[]).map((key) => (
                    <option key={key} value={key}>
                      {SCOPE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--pe-t3)]">
                  Property {isHold ? '(Hold — copy only)' : ''}
                </label>
                {isHold ? (
                  <p className="rounded-lg border border-[var(--pe-line)] px-3 py-2 text-sm text-[var(--pe-t3)]">
                    Hold copies structure and values unchanged.
                  </p>
                ) : (
                  <select
                    className="w-full rounded-lg border border-[var(--pe-line)] bg-transparent px-3 py-2 text-sm text-[var(--pe-t1)]"
                    value={property ?? ''}
                    onChange={(e) => setProperty(e.target.value as FillPropertyKey)}
                    disabled={availableProperties.length === 0}
                    data-testid="fill-property-select"
                  >
                    {availableProperties.map((key) => (
                      <option key={key} value={key}>
                        {FILL_PROPERTY_LABELS[key]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--pe-t3)]">
                  Pattern
                </label>
                <select
                  className="w-full rounded-lg border border-[var(--pe-line)] bg-transparent px-3 py-2 text-sm text-[var(--pe-t1)]"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value as FillPatternKind)}
                  data-testid="fill-pattern-select"
                >
                  {(Object.keys(PATTERN_LABELS) as FillPatternKind[]).map((key) => (
                    <option key={key} value={key}>
                      {PATTERN_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--pe-t3)]">
                  Apply through week
                </label>
                <Input
                  type="number"
                  min={minEnd}
                  max={blockEnd}
                  value={endAbsoluteWeek}
                  onChange={(e) =>
                    setEndAbsoluteWeek(
                      clampEndWeek(sourceAbsoluteWeek, Number(e.target.value) || minEnd, blockEnd),
                    )
                  }
                  data-testid="fill-end-week"
                />
                <p className="mt-1 text-[11px] text-[var(--pe-t3)]">
                  Weeks {sourceAbsoluteWeek} → {clampEndWeek(sourceAbsoluteWeek, endAbsoluteWeek, blockEnd)}
                </p>
              </div>
            </div>

            {pattern === 'linear' ? (
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--pe-t3)]">
                  Step per week
                </label>
                <Input
                  type="number"
                  step="0.25"
                  value={stepSize}
                  onChange={(e) => setStepSize(e.target.value)}
                  data-testid="fill-linear-step"
                />
              </div>
            ) : null}

            {pattern === 'step' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--pe-t3)]">
                    Hold (weeks)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={holdWeeks}
                    onChange={(e) => setHoldWeeks(e.target.value)}
                    data-testid="fill-step-hold"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--pe-t3)]">
                    Jump
                  </label>
                  <Input
                    type="number"
                    step="0.25"
                    value={jumpSize}
                    onChange={(e) => setJumpSize(e.target.value)}
                    data-testid="fill-step-jump"
                  />
                </div>
              </div>
            ) : null}

            {pattern === 'wave' ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--pe-t3)]">
                    Wave length
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={waveLength}
                    onChange={(e) => setWaveLength(e.target.value)}
                    data-testid="fill-wave-length"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--pe-t3)]">
                    Within-step
                  </label>
                  <Input
                    type="number"
                    step="0.25"
                    value={withinStep}
                    onChange={(e) => setWithinStep(e.target.value)}
                    data-testid="fill-wave-within"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--pe-t3)]">
                    Cycle step
                  </label>
                  <Input
                    type="number"
                    step="0.25"
                    value={cycleStep}
                    onChange={(e) => setCycleStep(e.target.value)}
                    data-testid="fill-wave-cycle"
                  />
                </div>
              </div>
            ) : null}

            {!isHold && availableProperties.length === 0 ? (
              <p className="text-sm text-[var(--pe-t3)]">
                No rampable properties found on the scoped exercises in this source.
              </p>
            ) : null}
          </div>
        ) : preview ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4" data-testid="fill-preview-panel">
            {preview.summary.sourceEmpty ? (
              <p
                className="text-sm text-amber-200/90 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2"
                data-testid="fill-source-empty-message"
              >
                {preview.summary.sourceEmptyMessage}
              </p>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
            <p className="shrink-0 text-sm text-[var(--pe-t2)]">
              {preview.summary.willWrite} to write · {preview.summary.skippedDifferent} different exercise
              {preview.summary.skippedDifferent === 1 ? '' : 's'} skipped
            </p>
            <div
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-lg border border-[var(--pe-line)]"
              data-testid="fill-preview-scroll"
            >
              <table className="w-full table-fixed text-xs">
                <colgroup>
                  <col className="w-[20%]" />
                  {preview.weekLabels.map((label) => (
                    <col key={label} />
                  ))}
                </colgroup>
                <thead className="sticky top-0 z-10 bg-[var(--pe-card-2)]">
                  <tr className="border-b border-[var(--pe-line)] text-[var(--pe-t3)]">
                    <th className="px-2 py-2 text-left font-semibold">Exercise</th>
                    {preview.weekLabels.map((label) => (
                      <th
                        key={label}
                        className="px-0.5 py-2 text-center font-semibold text-[9px] leading-tight whitespace-normal break-words"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.rowId} className="border-b border-[var(--pe-line)] last:border-0">
                      <td className="px-2 py-1.5 text-[var(--pe-t1)] truncate" title={row.label}>
                        {row.label}
                      </td>
                      {row.cells.map((cell) => (
                        <td
                          key={`${cell.absoluteWeek}-${cell.programDay}`}
                          className={`px-0.5 py-1.5 text-center font-mono text-[10px] tabular-nums leading-tight ${
                            cell.status === 'skip_different'
                              ? 'bg-amber-500/10 text-amber-200/80'
                              : cell.status === 'source'
                                ? 'text-[var(--pe-t3)]'
                                : 'text-[var(--pe-t1)]'
                          }`}
                        >
                          {cell.display}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.skips.length > 0 ? (
              <div className="shrink-0" data-testid="fill-skip-list">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--pe-t3)] mb-2">
                  Skipped
                </p>
                <ul className="space-y-1 text-xs text-[var(--pe-t2)]">
                  {preview.skips.map((skip, index) => (
                    <li key={`${skip.absoluteWeek}-${skip.programDay}-${index}`}>
                      Wk {skip.absoluteWeek}
                      {skip.programDay ? ` · ${programDayLabel(skip.programDay)}` : ''} · {skip.label} —{' '}
                      {skipReasonLabel(skip.reason)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="shrink-0 gap-2">
          <button
            type="button"
            className="text-sm text-[var(--pe-t2)]"
            onClick={() => {
              if (step === 'preview') {
                setStep('config')
                return
              }
              onOpenChange(false)
            }}
          >
            {step === 'preview' ? 'Back' : 'Cancel'}
          </button>
          {step === 'config' ? (
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--fc-accent, #2E7BFF)' }}
              disabled={!canPreview}
              onClick={handlePreview}
              data-testid="fill-preview-button"
            >
              Preview
            </button>
          ) : (
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--fc-accent, #2E7BFF)' }}
              onClick={handleApply}
              disabled={Boolean(preview?.summary.sourceEmpty)}
              data-testid="fill-apply-button"
            >
              Apply
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

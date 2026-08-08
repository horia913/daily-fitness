'use client'

import React, { useEffect, useMemo, useState } from 'react'
import type { ProgramDraftState } from '@/types/programDraft'
import { computeBlockWeekRanges } from '@/lib/programs/stationBlockWeeks'
import { weekDateLabel } from '@/lib/programs/periodizationRibbonColors'
import { getScheduleSlot } from '@/lib/programs/stationScheduleUtils'

export interface WeekTargetPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: ProgramDraftState
  title: string
  /** Source absolute week — excluded from targets. */
  excludeWeek: number
  /** Absolute weeks that cannot be overwrite targets (client past-week lock). */
  lockedWeeks?: ReadonlySet<number>
  onConfirm: (targetAbsWeeks: number[]) => void
}

export function WeekTargetPicker({
  open,
  onOpenChange,
  draft,
  title,
  excludeWeek,
  lockedWeeks,
  onConfirm,
}: WeekTargetPickerProps) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set())

  useEffect(() => {
    if (open) setSelected(new Set())
  }, [open, excludeWeek])

  const groups = useMemo(() => {
    const ranges = computeBlockWeekRanges(draft.trainingBlocks)
    const blockById = new Map(draft.trainingBlocks.map((b) => [b.id, b]))
    return ranges.map((range) => {
      const block = blockById.get(range.blockId)
      const weeks: Array<{
        week: number
        label: string
        occupied: boolean
        locked: boolean
      }> = []
      for (let week = range.startWeek; week <= range.endWeek; week++) {
        if (week === excludeWeek) continue
        const occupied = [1, 2, 3, 4, 5, 6, 7].some((day) =>
          Boolean(getScheduleSlot(draft.schedule, week, day)?.template_id),
        )
        weeks.push({
          week,
          label: `Wk ${week} · ${weekDateLabel(week)}`,
          occupied,
          locked: lockedWeeks?.has(week) ?? false,
        })
      }
      return {
        blockId: range.blockId,
        blockName: block?.name ?? 'Phase',
        weeks,
      }
    }).filter((g) => g.weeks.length > 0)
  }, [draft, excludeWeek, lockedWeeks])

  const selectedList = useMemo(
    () => [...selected].sort((a, b) => a - b),
    [selected],
  )

  const toggle = (week: number) => {
    if (lockedWeeks?.has(week)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(week)) next.delete(week)
      else next.add(week)
      return next
    })
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[10055] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      data-testid="week-target-picker"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative flex max-h-[70vh] w-full max-w-md flex-col rounded-[14px] border border-[var(--pe-line)] shadow-2xl"
        style={{ background: 'var(--pe-card)' }}
      >
        <div className="border-b border-[var(--pe-line)] px-4 py-3">
          <h2 className="text-base font-semibold text-[var(--pe-t1)]">{title}</h2>
          <p className="mt-1 text-[11px] text-[var(--pe-t3)]">
            Select one or more weeks. Occupied weeks will be replaced.
          </p>
        </div>
        <div className="overflow-y-auto p-2">
          {groups.length === 0 ? (
            <p className="px-2 py-4 text-sm text-[var(--pe-t3)]">No target weeks available.</p>
          ) : (
            groups.map((group) => (
              <div key={group.blockId} className="mb-2">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--pe-t3)]">
                  {group.blockName}
                </p>
                {group.weeks.map((w) => {
                  const checked = selected.has(w.week)
                  return (
                    <label
                      key={w.week}
                      data-testid={`week-target-${w.week}`}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 ${
                        w.locked
                          ? 'cursor-not-allowed opacity-55'
                          : 'cursor-pointer hover:bg-white/[0.04]'
                      }`}
                      title={
                        w.locked
                          ? "This week is completed and locked to preserve the client's history"
                          : undefined
                      }
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--fc-accent,#2E7BFF)]"
                        checked={checked}
                        disabled={w.locked}
                        onChange={() => toggle(w.week)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-[var(--pe-t1)]">
                          {w.label}
                          {w.locked ? ' · Locked' : ''}
                        </span>
                        {w.locked ? (
                          <span className="text-[10px] text-[var(--pe-t3)]">
                            Completed history — cannot overwrite
                          </span>
                        ) : w.occupied ? (
                          <span className="text-[10px] text-[var(--pe-warning,#FFC822)]">
                            Has workouts — will replace
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--pe-t3)]">Empty</span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[var(--pe-line)] px-4 py-3">
          <span className="text-[11px] text-[var(--pe-t3)]">
            {selectedList.length === 0
              ? 'None selected'
              : `${selectedList.length} week${selectedList.length === 1 ? '' : 's'}`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-[var(--pe-line)] px-4 py-2 text-sm text-[var(--pe-t2)] hover:bg-white/[0.04]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedList.length === 0}
              data-testid="week-target-confirm"
              onClick={() => {
                onConfirm(selectedList)
                onOpenChange(false)
              }}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--fc-accent, #2E7BFF)' }}
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

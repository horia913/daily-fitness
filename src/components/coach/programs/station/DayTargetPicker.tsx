'use client'

import React, { useMemo } from 'react'
import type { ProgramDraftState } from '@/types/programDraft'
import { computeBlockWeekRanges } from '@/lib/programs/stationBlockWeeks'
import { getScheduleSlot, programDayLabel } from '@/lib/programs/stationScheduleUtils'

export interface DayTargetPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: ProgramDraftState
  title: string
  /** Exclude this slot from the list (source day). */
  excludeWeek?: number
  excludeDay?: number
  /** Only show days that already have a workout (for copy-group). */
  requireWorkout?: boolean
  onSelect: (target: { week: number; day: number; templateId: string | null }) => void
}

export function DayTargetPicker({
  open,
  onOpenChange,
  draft,
  title,
  excludeWeek,
  excludeDay,
  requireWorkout,
  onSelect,
}: DayTargetPickerProps) {
  const targets = useMemo(() => {
    const ranges = computeBlockWeekRanges(draft.trainingBlocks)
    const blockById = new Map(draft.trainingBlocks.map((b) => [b.id, b]))
    const rows: Array<{
      week: number
      day: number
      templateId: string | null
      label: string
      blockName: string
    }> = []

    for (const range of ranges) {
      const block = [...blockById.values()].find((b) => b.id === range.blockId)
      const blockName = block?.name ?? 'Phase'
      for (let week = range.startWeek; week <= range.endWeek; week++) {
        for (let day = 1; day <= 7; day++) {
          if (week === excludeWeek && day === excludeDay) continue
          const slot = getScheduleSlot(draft.schedule, week, day)
          const templateId = slot?.template_id ?? null
          if (requireWorkout && !templateId) continue
          const workoutName = templateId ? draft.workouts[templateId]?.name : null
          rows.push({
            week,
            day,
            templateId,
            blockName,
            label: `${programDayLabel(day)} · Wk ${week}${workoutName ? ` · ${workoutName}` : ' · Rest'}`,
          })
        }
      }
    }
    return rows
  }, [draft, excludeWeek, excludeDay, requireWorkout])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[10055] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      data-testid="day-target-picker"
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
        </div>
        <div className="overflow-y-auto p-2">
          {targets.length === 0 ? (
            <p className="px-2 py-4 text-sm text-[var(--pe-t3)]">No targets available.</p>
          ) : (
            targets.map((t) => (
              <button
                key={`${t.week}-${t.day}`}
                type="button"
                data-testid={`target-${t.week}-${t.day}`}
                onClick={() => {
                  onSelect({ week: t.week, day: t.day, templateId: t.templateId })
                  onOpenChange(false)
                }}
                className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left hover:bg-white/[0.04]"
              >
                <span className="text-sm font-medium text-[var(--pe-t1)]">{t.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--pe-t3)]">
                  {t.blockName}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import type { DaySlotSummary } from '@/lib/programs/stationScheduleUtils'
import { programDayLabel } from '@/lib/programs/stationScheduleUtils'
import css from '@/components/coach/programs/programEditV1.module.css'

interface DayEditorPlaceholderProps {
  absoluteWeek: number
  programDay: number
  summary: DaySlotSummary
}

export function DayEditorPlaceholder({
  absoluteWeek,
  programDay,
  summary,
}: DayEditorPlaceholderProps) {
  return (
    <section
      className={css.wrap}
      data-testid="day-editor-placeholder"
      aria-label="Day editor placeholder"
    >
      <div
        className="rounded-[16px] border p-4 space-y-4"
        style={{ borderColor: 'var(--pe-line)', background: 'var(--pe-card)' }}
      >
        <div>
          <p className={css.eyebrow}>Day summary</p>
          <h3
            className="text-lg font-semibold text-[var(--pe-t1)] mt-1"
            style={{ fontFamily: 'var(--f-headline, Bricolage Grotesque, sans-serif)' }}
          >
            {programDayLabel(programDay)} · Absolute week {absoluteWeek}
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[var(--pe-t3)] text-[11px] uppercase tracking-wide">Status</dt>
              <dd className="text-[var(--pe-t1)] font-medium mt-0.5">
                {summary.isRest ? 'Rest day' : 'Workout scheduled'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--pe-t3)] text-[11px] uppercase tracking-wide">Label</dt>
              <dd className="text-[var(--pe-t1)] font-medium mt-0.5">{summary.label}</dd>
            </div>
            {!summary.isRest ? (
              <div>
                <dt className="text-[var(--pe-t3)] text-[11px] uppercase tracking-wide">Optional</dt>
                <dd className="text-[var(--pe-t1)] font-medium mt-0.5">
                  {summary.isOptional ? 'Yes' : 'No'}
                </dd>
              </div>
            ) : null}
            {summary.templateId ? (
              <div className="col-span-2">
                <dt className="text-[var(--pe-t3)] text-[11px] uppercase tracking-wide">Template ID</dt>
                <dd className="text-[var(--pe-t4)] font-mono text-[11px] mt-0.5 break-all">
                  {summary.templateId}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div
          className="rounded-xl border border-dashed px-4 py-8 text-center"
          style={{ borderColor: 'rgba(34, 211, 238, 0.35)', background: 'rgba(34, 211, 238, 0.06)' }}
        >
          <p className="text-sm font-semibold text-[var(--fc-accent)]">Day editor — embedded in next step</p>
          <p className="text-[12px] text-[var(--pe-t3)] mt-2 max-w-md mx-auto">
            The workout canvas will mount here in Step C. Exercise grouping, prescriptions, and save/load
            stay on the existing Group-model canvas path.
          </p>
        </div>
      </div>
    </section>
  )
}

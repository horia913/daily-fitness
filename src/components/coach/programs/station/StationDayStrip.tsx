'use client'

import React from 'react'
import type { DaySlotSummary } from '@/lib/programs/stationScheduleUtils'
import { programDayLabel } from '@/lib/programs/stationScheduleUtils'
import css from '@/components/coach/programs/programEditV1.module.css'
import { cn } from '@/lib/utils'

interface StationDayStripProps {
  absoluteWeek: number
  selectedDay: number
  summaries: DaySlotSummary[]
  onSelectDay: (programDay: number) => void
}

export function StationDayStrip({
  absoluteWeek,
  selectedDay,
  summaries,
  onSelectDay,
}: StationDayStripProps) {
  return (
    <section className={cn('space-y-2', css.wrap)} aria-label="Days" data-testid="day-strip">
      <h2
        className="text-sm font-bold text-[var(--pe-t1)]"
        style={{ fontFamily: 'var(--f-headline, Bricolage Grotesque, sans-serif)' }}
      >
        Week {absoluteWeek} · Days
      </h2>
      <div className="grid grid-cols-7 gap-2" role="tablist" aria-label="Day selector">
        {summaries.map((summary, index) => {
          const programDay = index + 1
          const isActive = programDay === selectedDay
          return (
            <button
              key={programDay}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`day-${programDay}`}
              onClick={() => onSelectDay(programDay)}
              className="rounded-lg px-2 py-2 text-left min-h-[72px] transition-colors"
              style={{
                background: isActive ? 'rgba(34, 211, 238, 0.12)' : 'var(--pe-card-2)',
                border: `1px solid ${isActive ? 'var(--fc-accent)' : 'var(--pe-line)'}`,
              }}
            >
              <span
                className="text-[10px] font-semibold uppercase tracking-wider text-[var(--pe-t3)]"
                style={{ fontFamily: 'var(--f-mono, Geist Mono, monospace)' }}
              >
                {programDayLabel(programDay)}
              </span>
              <span className="block text-[12px] font-medium text-[var(--pe-t1)] mt-1 truncate">
                {summary.isRest ? 'Rest' : summary.label}
              </span>
              {!summary.isRest && summary.exerciseCount != null && summary.exerciseCount > 0 ? (
                <span className="text-[9px] text-[var(--pe-t3)] uppercase tracking-wide">
                  {summary.exerciseCount} ex
                </span>
              ) : null}
              {summary.isOptional ? (
                <span className="text-[9px] text-[var(--pe-warning)] uppercase tracking-wide">Optional</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

'use client'

import React from 'react'
import { ArrowLeft, Settings2 } from 'lucide-react'
import type { ProgramType, StationProgram } from '@/types/programStation'
import css from '@/components/coach/programs/programEditV1.module.css'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<ProgramType, string> = {
  fixed: 'Fixed program',
  recurring: 'Recurring week',
}

interface ProgramStationHeaderProps {
  program: StationProgram
  onOpenSettings: () => void
  onBack: () => void
  saveButton?: React.ReactNode
  /** Recurring programs: name lives here (fixed programs use PeriodizationRibbon). */
  showProgramName?: boolean
  onProgramNameChange?: (name: string) => void
  hideSettings?: boolean
  backLabel?: string
}

export function ProgramStationHeader({
  program,
  onOpenSettings,
  onBack,
  saveButton,
  showProgramName,
  onProgramNameChange,
  hideSettings,
  backLabel = 'Programs',
}: ProgramStationHeaderProps) {
  return (
    <header
      className={cn('flex flex-wrap items-start gap-3 pb-4 border-b', css.wrap)}
      style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-[11px] font-medium text-[var(--pe-t2)] hover:text-[var(--pe-t1)] hover:bg-white/[0.04] transition-colors"
        style={{ fontFamily: 'var(--f-mono, Geist Mono, monospace)' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {backLabel}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={css.eyebrow} style={{ color: 'var(--fc-accent)' }}>
            The Station
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{
              fontFamily: 'var(--f-mono, Geist Mono, monospace)',
              background: 'var(--fc-accent-dim)',
              color: 'var(--fc-accent)',
            }}
          >
            {TYPE_LABELS[program.type]}
          </span>
        </div>
        {showProgramName && onProgramNameChange ? (
          <input
            value={program.name}
            onChange={(e) => onProgramNameChange(e.target.value)}
            className="w-full min-w-0 bg-transparent text-xl font-semibold outline-none border-b border-transparent focus:border-[var(--fc-accent)] text-[var(--pe-t1)]"
            style={{ fontFamily: 'var(--f-headline, Bricolage Grotesque, sans-serif)' }}
            placeholder="Program name"
            aria-label="Program name"
          />
        ) : null}
      </div>

      {saveButton}

      {!hideSettings ? (
      <button
        type="button"
        onClick={onOpenSettings}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium text-[var(--pe-t2)] hover:text-[var(--pe-t1)] hover:bg-white/[0.04] transition-colors"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Settings
      </button>
      ) : null}
    </header>
  )
}

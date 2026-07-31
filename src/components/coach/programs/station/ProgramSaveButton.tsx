'use client'

import React from 'react'
import type { ProgramSaveUiState } from '@/contexts/ProgramDraftContext'
import { CANVAS } from '@/components/workout-canvas/canvasTokens'

interface ProgramSaveButtonProps {
  saveState: ProgramSaveUiState
  isDirty: boolean
  errorMessage?: string | null
  onSave: () => void
}

export function ProgramSaveButton({
  saveState,
  isDirty,
  errorMessage,
  onSave,
}: ProgramSaveButtonProps) {
  const label =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'saved'
        ? 'Saved'
        : saveState === 'error'
          ? 'Save failed'
          : 'Save'

  const color =
    saveState === 'error'
      ? '#F87171'
      : saveState === 'saved'
        ? CANVAS.cyan
        : isDirty
          ? 'var(--fc-accent, #2E7BFF)'
          : CANVAS.muted

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        data-testid="program-save-button"
        onClick={() => {
          if (saveState === 'saving') return
          void onSave()
        }}
        disabled={saveState === 'saving' || (!isDirty && saveState !== 'error')}
        className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[11px] font-semibold disabled:opacity-50 transition-opacity"
        style={{
          fontFamily: 'var(--f-mono, Geist Mono, monospace)',
          background: isDirty || saveState === 'error' ? 'var(--fc-accent, #2E7BFF)' : 'transparent',
          color: isDirty || saveState === 'error' ? '#fff' : 'var(--pe-t2)',
          border: isDirty || saveState === 'error' ? 'none' : '1px solid var(--pe-line)',
          boxShadow:
            isDirty && saveState === 'idle'
              ? '0 0 22px rgba(46, 123, 255, 0.42), 0 0 4px rgba(46, 123, 255, 0.25)'
              : undefined,
        }}
      >
        {isDirty && saveState === 'idle' ? (
          <span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden />
        ) : null}
        {label}
      </button>
      {isDirty && saveState === 'idle' ? (
        <span className="text-[10px] text-[var(--pe-t3)]" style={{ color }}>
          Unsaved changes
        </span>
      ) : null}
      {saveState === 'error' && errorMessage ? (
        <span className="text-[10px] max-w-[220px] text-right text-[#F87171]" title={errorMessage}>
          {errorMessage}
        </span>
      ) : null}
    </div>
  )
}

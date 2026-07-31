'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface ProgramSaveOverlayProps {
  visible: boolean
  /** Quieter subline for larger commits (multiple dirty days or structure changes). */
  showSubline?: boolean
}

/**
 * Full-screen blocking overlay during program-level commit.
 * Not dismissible — clears only when saveState leaves "saving".
 */
export function ProgramSaveOverlay({ visible, showSubline }: ProgramSaveOverlayProps) {
  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="program-save-overlay-title"
      aria-describedby={showSubline ? 'program-save-overlay-desc' : undefined}
      data-testid="program-save-overlay"
      style={{
        background: 'color-mix(in srgb, var(--pe-app-bg, #0a1a18) 55%, transparent)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'auto',
      }}
    >
      <div
        className="flex flex-col items-center gap-4 rounded-2xl px-10 py-8 text-center pointer-events-none"
        style={{
          background: 'var(--pe-card)',
          border: '1px solid var(--pe-line)',
          boxShadow: '0 24px 48px color-mix(in srgb, #000 40%, transparent)',
        }}
      >
        <Loader2
          className="h-10 w-10 animate-spin"
          style={{ color: "var(--fc-accent)" }}
          aria-hidden
        />
        <div>
          <p
            id="program-save-overlay-title"
            className="text-base font-semibold"
            style={{ color: 'var(--pe-t1)' }}
          >
            Saving program…
          </p>
          {showSubline ? (
            <p
              id="program-save-overlay-desc"
              className="mt-1 text-sm"
              style={{ color: 'var(--pe-t3)' }}
            >
              Saving your changes
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

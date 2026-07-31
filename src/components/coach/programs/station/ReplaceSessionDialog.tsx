'use client'

import React from 'react'

export interface ReplaceSessionDialogProps {
  open: boolean
  targetDayLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ReplaceSessionDialog({
  open,
  targetDayLabel,
  onConfirm,
  onCancel,
}: ReplaceSessionDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[10060] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="replace-session-title"
      data-testid="replace-session-dialog"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Cancel"
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-sm rounded-[14px] border border-[var(--pe-line)] p-5 shadow-2xl"
        style={{ background: 'var(--pe-card)' }}
      >
        <h2 id="replace-session-title" className="text-base font-semibold text-[var(--pe-t1)]">
          Replace {targetDayLabel}&apos;s session?
        </h2>
        <p className="mt-2 text-sm text-[var(--pe-t3)]">
          This day already has a workout. Replacing will remove the existing session from the
          schedule.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--pe-line)] px-4 py-2 text-sm text-[var(--pe-t2)] hover:bg-white/[0.04]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="replace-session-confirm"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--fc-accent, #2E7BFF)' }}
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  )
}

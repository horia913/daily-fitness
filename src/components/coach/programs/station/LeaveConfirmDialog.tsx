'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface LeaveConfirmDialogProps {
  open: boolean
  saving?: boolean
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function LeaveConfirmDialog({
  open,
  saving,
  onSave,
  onDiscard,
  onCancel,
}: LeaveConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md" data-testid="leave-confirm-dialog">
        <DialogHeader>
          <DialogTitle>Unsaved changes</DialogTitle>
          <DialogDescription>
            Save your changes before leaving, discard them, or stay on this page.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
          <button
            type="button"
            data-testid="leave-cancel"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-[var(--pe-line)] px-4 py-2 text-sm font-medium text-[var(--pe-t2)] hover:bg-white/[0.04] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="leave-discard"
            onClick={onDiscard}
            disabled={saving}
            className="rounded-lg border border-[#FF5A5F]/40 px-4 py-2 text-sm font-medium text-[#FF5A5F] hover:bg-[#FF5A5F]/10 disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            data-testid="leave-save"
            onClick={onSave}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--fc-accent, #2E7BFF)' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

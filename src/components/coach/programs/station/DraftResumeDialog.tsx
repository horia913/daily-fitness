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
import { formatDraftSavedAt } from '@/lib/programs/programDraftStorage'

interface DraftResumeDialogProps {
  open: boolean
  savedAt: string
  onResume: () => void
  onDiscard: () => void
}

export function DraftResumeDialog({
  open,
  savedAt,
  onResume,
  onDiscard,
}: DraftResumeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent className="sm:max-w-md" data-testid="draft-resume-dialog">
        <DialogHeader>
          <DialogTitle>Resume unsaved work?</DialogTitle>
          <DialogDescription>
            Unsaved changes from {formatDraftSavedAt(savedAt)}. Resume your draft or load the last
            saved version from the database.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            data-testid="draft-discard"
            onClick={onDiscard}
            className="rounded-lg border border-[var(--pe-line)] px-4 py-2 text-sm font-medium text-[var(--pe-t2)] hover:bg-white/[0.04]"
          >
            Discard
          </button>
          <button
            type="button"
            data-testid="draft-resume"
            onClick={onResume}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--fc-accent, #2E7BFF)' }}
          >
            Resume
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

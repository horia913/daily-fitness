'use client'

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export interface SaveToLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, notes: string) => void | Promise<void>
  busy?: boolean
  defaultName?: string
}

export function SaveToLibraryDialog({
  open,
  onOpenChange,
  onSave,
  busy = false,
  defaultName = '',
}: SaveToLibraryDialogProps) {
  const [name, setName] = useState(defaultName)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setName(defaultName)
      setNotes('')
    }
  }, [open, defaultName])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="save-to-library-dialog">
        <DialogHeader>
          <DialogTitle>Save to library</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--pe-t3)]">
              Name <span className="text-[#FF5A5F]">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Library workout name"
              disabled={busy}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--pe-t3)]">
              Notes <span className="normal-case font-normal text-[var(--pe-t4)]">(optional)</span>
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Stored as the workout description"
              rows={3}
              disabled={busy}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <button
            type="button"
            className="text-sm text-[var(--pe-t2)]"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="save-to-library-confirm"
            disabled={busy || !name.trim()}
            onClick={() => void onSave(name.trim(), notes)}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--fc-accent, #2E7BFF)' }}
          >
            {busy ? 'Saving…' : 'Save to library'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

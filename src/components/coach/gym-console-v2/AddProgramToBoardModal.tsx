'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Loader2, Layers, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { fetchApi } from '@/lib/apiClient'
import { GYM_CONSOLE_BOARD_MAX } from './boardStorage'
import type { CoachProgramListItem } from './ProgramTemplatePicker'
import styles from './GymConsoleBoard.module.css'

type ProgramsApiResponse = {
  programs?: CoachProgramListItem[]
  error?: string
}

export type AddProgramToBoardModalProps = {
  open: boolean
  onClose: () => void
  existingProgramIds: string[]
  slotsRemaining: number
  onAdd: (items: { id: string; label: string }[]) => void
}

export function AddProgramToBoardModal({
  open,
  onClose,
  existingProgramIds,
  slotsRemaining,
  onAdd,
}: AddProgramToBoardModalProps) {
  const [list, setList] = useState<CoachProgramListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setLoading(true)
    fetchApi('/api/coach/programs?filter=active')
      .then((res) => res.json())
      .then((body: ProgramsApiResponse) => {
        setList(Array.isArray(body.programs) ? body.programs : [])
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [open])

  const existing = new Set(existingProgramIds)
  const maxPick = Math.max(0, Math.min(slotsRemaining, GYM_CONSOLE_BOARD_MAX))

  const toggle = (id: string) => {
    if (existing.has(id)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < maxPick) next.add(id)
      return next
    })
  }

  const handleSave = () => {
    const items = list
      .filter((p) => selected.has(p.id))
      .map((p) => ({ id: p.id, label: p.name?.trim() || 'Program' }))
    onAdd(items)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent showCloseButton={false} className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <DialogTitle className={styles.modalTitle}>Add program</DialogTitle>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className={styles.modalHint}>
          {maxPick <= 0
            ? 'Board is full (6 items).'
            : `Select up to ${maxPick} program${maxPick === 1 ? '' : 's'}.`}
        </p>
        {loading ? (
          <div className={styles.modalLoading}>
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          </div>
        ) : list.length === 0 ? (
          <p className={styles.modalHint}>No active programs yet.</p>
        ) : (
          <ul className={styles.modalList}>
            {list.map((p) => {
              const onBoard = existing.has(p.id)
              const isSelected = selected.has(p.id)
              const disabled = onBoard || (!isSelected && selected.size >= maxPick)
              const weeks = p.totalWeeks ?? 0
              const meta = weeks > 0 ? `${weeks} wk` : null
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => !disabled && toggle(p.id)}
                    disabled={disabled}
                    className={`${styles.modalRow}${isSelected ? ` ${styles.modalRowSelected}` : ''}${
                      disabled ? ` ${styles.modalRowDisabled}` : ''
                    }`}
                  >
                    <Layers className={styles.modalRowIcon} aria-hidden />
                    <span className={styles.modalRowLabel}>
                      {p.name?.trim() || 'Program'}
                      {meta ? ` · ${meta}` : ''}
                      {onBoard ? ' · on board' : ''}
                    </span>
                    {isSelected ? <CheckCircle className={styles.modalCheck} aria-hidden /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className={styles.modalActions}>
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleSave}
            disabled={selected.size === 0 || maxPick <= 0}
          >
            Add{selected.size > 0 ? ` (${selected.size})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

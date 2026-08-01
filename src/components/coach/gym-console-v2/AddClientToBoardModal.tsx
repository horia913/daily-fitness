'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Loader2, User, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { fetchApi } from '@/lib/apiClient'
import { GYM_CONSOLE_BOARD_MAX } from './boardStorage'
import styles from './GymConsoleBoard.module.css'

export type ClientForBoardModal = {
  client_id: string
  status: string
  profiles?: { first_name?: string; last_name?: string; email?: string }
}

function clientDisplayName(c: ClientForBoardModal): string {
  if (!c.profiles) return 'Client'
  const name = `${c.profiles.first_name ?? ''} ${c.profiles.last_name ?? ''}`.trim()
  return name || c.profiles.email || 'Client'
}

export type AddClientToBoardModalProps = {
  open: boolean
  onClose: () => void
  /** Client ids already on the board (cannot re-add). */
  existingClientIds: string[]
  slotsRemaining: number
  onAdd: (items: { id: string; label: string }[]) => void
}

export function AddClientToBoardModal({
  open,
  onClose,
  existingClientIds,
  slotsRemaining,
  onAdd,
}: AddClientToBoardModalProps) {
  const [list, setList] = useState<ClientForBoardModal[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setLoading(true)
    fetchApi('/api/coach/clients')
      .then((res) => res.json())
      .then((body) => {
        const arr = Array.isArray(body.clients) ? (body.clients as ClientForBoardModal[]) : []
        setList(arr.filter((c) => c.status === 'active'))
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [open])

  const existing = new Set(existingClientIds)
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
      .filter((c) => selected.has(c.client_id))
      .map((c) => ({ id: c.client_id, label: clientDisplayName(c) }))
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
          <DialogTitle className={styles.modalTitle}>Add client</DialogTitle>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className={styles.modalHint}>
          {maxPick <= 0
            ? 'Board is full (6 items).'
            : `Select up to ${maxPick} active client${maxPick === 1 ? '' : 's'}.`}
        </p>
        {loading ? (
          <div className={styles.modalLoading}>
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          </div>
        ) : (
          <ul className={styles.modalList}>
            {list.map((c) => {
              const name = clientDisplayName(c)
              const onBoard = existing.has(c.client_id)
              const isSelected = selected.has(c.client_id)
              const disabled = onBoard || (!isSelected && selected.size >= maxPick)
              return (
                <li key={c.client_id}>
                  <button
                    type="button"
                    onClick={() => !disabled && toggle(c.client_id)}
                    disabled={disabled}
                    className={`${styles.modalRow}${isSelected ? ` ${styles.modalRowSelected}` : ''}${
                      disabled ? ` ${styles.modalRowDisabled}` : ''
                    }`}
                  >
                    <User className={styles.modalRowIcon} aria-hidden />
                    <span className={styles.modalRowLabel}>
                      {name}
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
          <Button type="button" variant="outline" className={styles.modalCancelBtn} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className={styles.modalPrimaryBtn}
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

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { programDayLabel } from '@/lib/programs/stationScheduleUtils'
import columnCss from './sessionColumns.module.css'
import { cn } from '@/lib/utils'

export function stockDayWorkoutName(programDay: number): string {
  return `${programDayLabel(programDay)} workout`
}

export interface DayWorkoutNameEditProps {
  programDay: number
  value: string
  onCommit: (nextName: string) => void
  /** Larger title style (embedded session column). */
  variant?: 'title' | 'inline'
  className?: string
  testId?: string
}

export function DayWorkoutNameEdit({
  programDay,
  value,
  onCommit,
  variant = 'title',
  className,
  testId,
}: DayWorkoutNameEditProps) {
  const stock = stockDayWorkoutName(programDay)
  const display = value.trim() || stock
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(display)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(display)
  }, [display, editing])

  useEffect(() => {
    if (!editing) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [editing])

  const commit = () => {
    const next = draft.trim() || stock
    setEditing(false)
    if (next !== display) onCommit(next)
    else setDraft(display)
  }

  const cancel = () => {
    setDraft(display)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        data-testid={testId ? `${testId}-input` : undefined}
        aria-label="Workout day name"
        className={cn(
          columnCss.nameInput,
          variant === 'title' ? columnCss.nameInputTitle : columnCss.nameInputInline,
          className,
        )}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
          }
        }}
      />
    )
  }

  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={`Rename workout: ${display}`}
      title="Click to rename"
      className={cn(
        columnCss.nameEditBtn,
        variant === 'title' ? columnCss.nameEditTitle : columnCss.nameEditInline,
        className,
      )}
      onClick={() => setEditing(true)}
    >
      <span className={columnCss.nameEditText}>{display}</span>
      <Pencil className={columnCss.nameEditIcon} aria-hidden />
    </button>
  )
}

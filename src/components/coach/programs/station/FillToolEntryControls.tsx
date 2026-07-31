'use client'

import React from 'react'
import { TrendingUp } from 'lucide-react'
import entryCss from './fillToolEntries.module.css'

function accentStyle(accentColor?: string): React.CSSProperties | undefined {
  if (!accentColor) return undefined
  return { '--fill-entry-accent': accentColor } as React.CSSProperties
}

export function FillProgressionButton({
  onClick,
  accentColor,
}: {
  onClick: () => void
  accentColor?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={entryCss.progressionBtn}
      style={accentStyle(accentColor)}
      data-testid="fill-progression-header"
      aria-label="Progression — fill across weeks"
    >
      <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Progression
    </button>
  )
}

export function FillWeekProgressionButton({
  onClick,
  accentColor,
}: {
  onClick: () => void
  accentColor?: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={entryCss.weekProgressionBtn}
      style={accentStyle(accentColor)}
      data-testid="fill-progression-week"
      title="Progress this week"
      aria-label="Progress this week"
    >
      <TrendingUp className="h-3 w-3 shrink-0" aria-hidden />
    </button>
  )
}

export function FillRampChip({
  onClick,
  accentColor,
  visible,
}: {
  onClick: () => void
  accentColor?: string
  /** When true, chip is always painted (parent owns hover reveal). */
  visible?: boolean
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={
        visible
          ? entryCss.rampChip
          : `${entryCss.rampChip} opacity-0 transition-opacity group-hover/row:opacity-100`
      }
      style={accentStyle(accentColor)}
      data-testid="fill-progression-exercise"
      aria-label="Progression — fill across weeks"
    >
      <TrendingUp className="h-3 w-3 shrink-0" aria-hidden />
      Progression
    </button>
  )
}

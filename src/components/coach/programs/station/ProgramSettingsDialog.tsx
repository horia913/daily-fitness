'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProgramType, StationProgram } from '@/types/programStation'
import {
  PERIODIZATION_STYLE_NONE,
  PERIODIZATION_STYLES,
} from '@/lib/programs/periodizationStyles'
import css from '@/components/coach/programs/programEditV1.module.css'

function coachDifficultyLabel(level: string): string {
  switch (level) {
    case 'beginner':
      return 'Beginner'
    case 'intermediate':
      return 'Intermediate'
    case 'advanced':
      return 'Athlete'
    case 'athlete':
      return 'Elite'
    default:
      return level
  }
}

interface ProgramSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: StationProgram
  /** Derived from SUM(phase.duration_weeks) — read-only display. */
  phaseTotalWeeks: number
  saving: boolean
  onDraftChange: (next: StationProgram) => void
  onSave: () => void
}

export function ProgramSettingsDialog({
  open,
  onOpenChange,
  draft,
  phaseTotalWeeks,
  saving,
  onDraftChange,
  onSave,
}: ProgramSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${css.wrap}`} style={{ background: 'var(--pe-card)' }}>
        <DialogHeader>
          <DialogTitle className="text-[var(--pe-t1)]">Program settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]">
              Program type
            </label>
            <Select
              value={draft.type}
              onValueChange={(v) => onDraftChange({ ...draft, type: v as ProgramType })}
            >
              <SelectTrigger className="h-10 border-[var(--pe-line)] bg-[var(--pe-card-2)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed — phases, weeks, and end date</SelectItem>
                <SelectItem value="recurring">Recurring — single repeating week</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]">
              Periodization style
            </label>
            <Select
              value={draft.periodization_style ?? PERIODIZATION_STYLE_NONE}
              onValueChange={(v) =>
                onDraftChange({
                  ...draft,
                  periodization_style: v === PERIODIZATION_STYLE_NONE ? null : v,
                })
              }
            >
              <SelectTrigger className="h-10 border-[var(--pe-line)] bg-[var(--pe-card-2)]">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PERIODIZATION_STYLE_NONE}>None</SelectItem>
                {PERIODIZATION_STYLES.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]">
              Description
            </label>
            <Textarea
              value={draft.description ?? ''}
              onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
              rows={3}
              className="border-[var(--pe-line)] bg-[var(--pe-card-2)] text-[var(--pe-t1)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]">
                Difficulty
              </label>
              <Select
                value={draft.difficulty_level}
                onValueChange={(v) =>
                  onDraftChange({
                    ...draft,
                    difficulty_level: v as StationProgram['difficulty_level'],
                  })
                }
              >
                <SelectTrigger className="h-10 border-[var(--pe-line)] bg-[var(--pe-card-2)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['beginner', 'intermediate', 'advanced', 'athlete'] as const).map((level) => (
                    <SelectItem key={level} value={level}>
                      {coachDifficultyLabel(level)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]">
                Target audience
              </label>
              <Input
                value={draft.target_audience ?? ''}
                onChange={(e) => onDraftChange({ ...draft, target_audience: e.target.value })}
                className="h-10 border-[var(--pe-line)] bg-[var(--pe-card-2)]"
              />
            </div>
          </div>
          {draft.type === 'fixed' ? (
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pe-t3)]">
                Total duration (weeks)
              </label>
              <p className="h-10 flex items-center px-3 rounded-md border border-[var(--pe-line)] bg-[var(--pe-card-2)] text-sm text-[var(--pe-t1)]">
                {phaseTotalWeeks || '—'}
                <span className="ml-2 text-[11px] text-[var(--pe-t3)]">from phases</span>
              </p>
            </div>
          ) : null}
          <div className="flex items-center justify-between rounded-lg border border-[var(--pe-line)] px-3 py-2">
            <div>
              <p className="text-sm text-[var(--pe-t1)]">Active</p>
              <p className="text-[11px] text-[var(--pe-t3)]">Visible to clients for assignment</p>
            </div>
            <Switch
              checked={draft.is_active}
              onCheckedChange={(checked) => onDraftChange({ ...draft, is_active: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 text-sm text-[var(--pe-t2)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !draft.name.trim()}
            onClick={onSave}
            className="h-10 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--fc-accent, #2E7BFF)' }}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

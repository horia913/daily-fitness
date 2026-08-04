'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MoreVertical, Dumbbell, Library } from 'lucide-react'
import type { DaySlotSummary } from '@/lib/programs/stationScheduleUtils'
import { programDayLabel, programTimelineDay } from '@/lib/programs/stationScheduleUtils'
import { WorkoutCanvasCore } from '@/components/workout-canvas/WorkoutCanvasCore'
import { supabase } from '@/lib/supabase'
import { loadWorkoutForCanvas } from '@/lib/groupModel/canvasLoad'
import { saveDayWorkoutToLibrary } from '@/lib/programs/stationDayWorkout'
import { useProgramDraft } from '@/contexts/ProgramDraftContext'
import { useToast } from '@/components/ui/toast-provider'
import { LibraryWorkoutPicker } from './LibraryWorkoutPicker'
import { SaveToLibraryDialog } from './SaveToLibraryDialog'
import { FillToolDialog } from './FillToolDialog'
import { FillProgressionButton } from './FillToolEntryControls'
import entryCss from './fillToolEntries.module.css'
import type { FillScope } from '@/lib/programs/fillTool'
import columnCss from './sessionColumns.module.css'
import css from '@/components/coach/programs/programEditV1.module.css'

export interface ProgramDayEditorProps {
  coachId: string
  absoluteWeek: number
  programDay: number
  summary: DaySlotSummary
  activeBlockId: string | null
  onDuplicateGroup?: (groupId: string) => void
  onCopyGroupToDay?: (groupId: string) => void
  onMoveTo?: () => void
  onCopyTo?: () => void
  embedded?: boolean
  accentColor?: string
  /** Prefix slot (e.g. drag handle) rendered at the start of the embedded header row. */
  headerPrefix?: React.ReactNode
}

export function ProgramDayEditor({
  coachId,
  absoluteWeek,
  programDay,
  summary,
  activeBlockId,
  onDuplicateGroup,
  onCopyGroupToDay,
  onMoveTo,
  onCopyTo,
  embedded,
  accentColor,
  headerPrefix,
}: ProgramDayEditorProps) {
  const { addToast } = useToast()
  const draft = useProgramDraft()
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<'add' | 'replace'>('add')
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [fillOpen, setFillOpen] = useState(false)
  const [fillScope, setFillScope] = useState<FillScope>('day')
  const [fillGroupId, setFillGroupId] = useState<string | undefined>()
  const [fillSlotId, setFillSlotId] = useState<string | undefined>()
  const kebabRef = useRef<HTMLDivElement>(null)

  const templateId = summary.templateId
  const isRest = summary.isRest || !templateId
  const workout = templateId && draft.workingCopy ? draft.workingCopy.workouts[templateId] : null
  const timelineDay = programTimelineDay(absoluteWeek, programDay)

  const handleWorkoutChange = (next: import('@/lib/groupModel/canvasTypes').CanvasWorkout) => {
    if (!templateId) return
    draft.updateWorkout(templateId, next)
  }

  const runBuildFromScratch = () => {
    draft.buildDay(absoluteWeek, programDay, activeBlockId)
    addToast({ title: 'Empty workout added — start adding exercises. Save to commit.' })
  }

  const runInsertFromLibrary = async (libraryId: string) => {
    setBusy(true)
    try {
      const libraryWorkout = await loadWorkoutForCanvas(supabase, libraryId)
      if (!libraryWorkout) throw new Error('Library workout not found')
      draft.insertLibraryDay(
        libraryWorkout,
        absoluteWeek,
        programDay,
        activeBlockId,
        pickerMode === 'replace',
      )
      setPickerOpen(false)
      addToast({ title: 'Workout copied into this day. Save to commit.' })
    } catch (e) {
      addToast({
        title: e instanceof Error ? e.message : 'Could not insert from library',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const runSaveToLibrary = async (name: string, notes: string) => {
    if (!templateId || !workout) return
    setBusy(true)
    try {
      await saveDayWorkoutToLibrary(supabase, coachId, templateId, name, notes, workout)
      setSaveDialogOpen(false)
      addToast({ title: 'Saved to library as an independent copy.' })
    } catch (e) {
      addToast({
        title: e instanceof Error ? e.message : 'Could not save to library',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const runClearDay = () => {
    if (!window.confirm('Clear this day? The schedule slot will be removed (rest day).')) return
    draft.clearDay(absoluteWeek, programDay)
    setMenuOpen(false)
    addToast({ title: 'Day cleared in working copy. Save to commit.' })
  }

  const openFill = (scope: FillScope, groupId?: string, slotId?: string) => {
    setFillScope(scope)
    setFillGroupId(groupId)
    setFillSlotId(slotId)
    setFillOpen(true)
    setMenuOpen(false)
  }

  const openPicker = (mode: 'add' | 'replace') => {
    setPickerMode(mode)
    setPickerOpen(true)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (kebabRef.current?.contains(e.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const kebabMenu = !isRest ? (
    <div className="relative shrink-0" ref={kebabRef}>
      <button
        type="button"
        data-testid={`session-kebab-${programDay}`}
        onClick={() => setMenuOpen((v) => !v)}
        className="p-1.5 rounded-lg hover:bg-white/[0.04]"
        aria-label="Session actions"
        aria-expanded={menuOpen}
      >
        <MoreVertical className="w-4 h-4 text-[var(--pe-t3)]" />
      </button>
      {menuOpen ? (
        <div
          className={`absolute right-0 mt-1 min-w-[180px] rounded-lg py-1 border border-[var(--pe-line)] ${entryCss.kebabMenu}`}
          style={{ background: 'var(--pe-card-2)' }}
          role="menu"
        >
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-[var(--pe-t1)] hover:bg-white/[0.04]"
            onClick={() => {
              setMenuOpen(false)
              setSaveDialogOpen(true)
            }}
          >
            Save to library
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-[var(--pe-t1)] hover:bg-white/[0.04]"
            onClick={() => openPicker('replace')}
          >
            Replace from library
          </button>
          {onMoveTo ? (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-[var(--pe-t1)] hover:bg-white/[0.04]"
              onClick={() => {
                setMenuOpen(false)
                onMoveTo()
              }}
            >
              Move to…
            </button>
          ) : null}
          {onCopyTo ? (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-[var(--pe-t1)] hover:bg-white/[0.04]"
              onClick={() => {
                setMenuOpen(false)
                onCopyTo()
              }}
            >
              Copy to…
            </button>
          ) : null}
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-[#FF5A5F] hover:bg-white/[0.04]"
            onClick={runClearDay}
          >
            Clear day
          </button>
        </div>
      ) : null}
    </div>
  ) : null

  const sessionHeaderActions = !isRest ? (
    <div className={entryCss.headerActions}>
      <FillProgressionButton onClick={() => openFill('day')} accentColor={accentColor} />
      {kebabMenu}
    </div>
  ) : (
    kebabMenu
  )

  const editorBody = isRest ? (
    <div className={embedded ? columnCss.restBody : undefined} data-testid="rest-day-add-workout">
      {embedded ? (
        <>
          <p className={columnCss.restLabel}>Rest</p>
          <p className="text-[12px] text-[var(--pe-t3)] max-w-xs">
            Add a workout to this day or leave it as recovery.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-[var(--pe-t1)]">Add workout to this day</p>
          <p className="text-[12px] text-[var(--pe-t3)] max-w-md mx-auto">
            Build a new workout here or copy one from your library. Each day owns its own
            independent copy.
          </p>
        </>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          data-testid="build-from-scratch"
          disabled={busy}
          onClick={runBuildFromScratch}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--fc-accent, #2E7BFF)' }}
        >
          <Dumbbell className="w-4 h-4" />
          Add workout
        </button>
        <button
          type="button"
          data-testid="insert-from-library"
          disabled={busy}
          onClick={() => openPicker('add')}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--pe-line)] px-4 py-2 text-sm font-medium text-[var(--pe-t1)] hover:bg-white/[0.04] disabled:opacity-50"
        >
          <Library className="w-4 h-4" />
          Insert from library
        </button>
      </div>
    </div>
  ) : workout ? (
            <WorkoutCanvasCore
              key={`${absoluteWeek}-${programDay}-${templateId}`}
              coachId={coachId}
              workout={workout}
              onWorkoutChange={handleWorkoutChange}
              onDuplicateGroup={onDuplicateGroup}
              onCopyGroupToDay={onCopyGroupToDay}
              onFillExercise={(groupId, slotId) => openFill('exercise', groupId, slotId)}
              onFillGroup={(groupId) => openFill('group', groupId)}
              fillAccentColor={accentColor}
              visualVariant="station"
            />
  ) : (
    <p className="text-sm text-[var(--pe-t3)] p-4">Workout not loaded in working copy.</p>
  )

  if (embedded) {
    return (
      <>
        <div className={columnCss.body}>
          <div className={columnCss.header}>
            {headerPrefix ?? <span className="w-6" />}
            <div className={columnCss.headerText}>
              <p className={columnCss.dayLabel}>{programDayLabel(programDay)}</p>
              <p className={columnCss.dayDate}>Day {timelineDay}</p>
              {!isRest && summary.exerciseCount != null && summary.exerciseCount > 0 ? (
                <p className={columnCss.sessionMeta}>
                  {summary.label}
                  {summary.isOptional ? ' · Optional' : ''}
                </p>
              ) : null}
            </div>
            {sessionHeaderActions}
          </div>
          <div className={columnCss.sessionBody}>{editorBody}</div>
        </div>
        <LibraryWorkoutPicker
          open={pickerOpen}
          coachId={coachId}
          onOpenChange={setPickerOpen}
          onSelect={runInsertFromLibrary}
          busy={busy}
        />
        <SaveToLibraryDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          onSave={runSaveToLibrary}
          busy={busy}
          defaultName={summary.label !== 'Workout' ? summary.label : ''}
        />
        {draft.workingCopy && fillOpen ? (
          <FillToolDialog
            open={fillOpen}
            onOpenChange={setFillOpen}
            draft={draft.workingCopy}
            onApply={(next, result) => {
              draft.setWorkingCopy(next)
              addToast({
                title: `Filled ${result.writtenCount} cells${result.skipped ? ` · ${result.skipped} skipped` : ''}. Save to commit.`,
              })
            }}
            sourceAbsoluteWeek={absoluteWeek}
            sourceProgramDay={programDay}
            activeBlockId={activeBlockId}
            initialScope={fillScope}
            initialGroupId={fillGroupId}
            initialSlotId={fillSlotId}
          />
        ) : null}
      </>
    )
  }

  return (
    <section
      className={css.wrap}
      data-testid="program-day-editor"
      aria-label={`${programDayLabel(programDay)} editor`}
    >
      <div
        className="rounded-[16px] border"
        style={{ borderColor: 'var(--pe-line)', background: 'var(--pe-card)' }}
      >
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--pe-line)] ${columnCss.sessionEditorHeader}`}
        >
          <div className="min-w-0">
            <p className={css.eyebrow}>Day editor</p>
            <h3
              className="text-base font-semibold text-[var(--pe-t1)] truncate"
              style={{ fontFamily: 'var(--f-headline, Bricolage Grotesque, sans-serif)' }}
            >
              {programDayLabel(programDay)} · Week {absoluteWeek}
            </h3>
            {!isRest ? (
              <p className="text-[11px] text-[var(--pe-t3)] mt-0.5">
                {summary.exerciseCount != null && summary.exerciseCount > 0
                  ? `${summary.exerciseCount} exercises`
                  : summary.label}
                {summary.isOptional ? ' · Optional' : ''}
              </p>
            ) : (
              <p className="text-[11px] text-[var(--pe-t3)] mt-0.5">Rest day</p>
            )}
          </div>
          {sessionHeaderActions}
        </div>
        <div className={`p-4 ${columnCss.sessionEditorBody}`}>{editorBody}</div>
      </div>
      <LibraryWorkoutPicker
        open={pickerOpen}
        coachId={coachId}
        onOpenChange={setPickerOpen}
        onSelect={runInsertFromLibrary}
        busy={busy}
      />
      <SaveToLibraryDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={runSaveToLibrary}
        busy={busy}
        defaultName={summary.label !== 'Workout' ? summary.label : ''}
      />
      {draft.workingCopy && fillOpen ? (
        <FillToolDialog
          open={fillOpen}
          onOpenChange={setFillOpen}
          draft={draft.workingCopy}
          onApply={(next, result) => {
            draft.setWorkingCopy(next)
            addToast({
              title: `Filled ${result.writtenCount} cells${result.skipped ? ` · ${result.skipped} skipped` : ''}. Save to commit.`,
            })
          }}
          sourceAbsoluteWeek={absoluteWeek}
          sourceProgramDay={programDay}
          activeBlockId={activeBlockId}
          initialScope={fillScope}
          initialGroupId={fillGroupId}
          initialSlotId={fillSlotId}
        />
      ) : null}
    </section>
  )
}

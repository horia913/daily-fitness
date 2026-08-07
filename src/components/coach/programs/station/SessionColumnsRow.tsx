'use client'

import React, { useCallback, useEffect, useState, type CSSProperties } from 'react'
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd'
import { GripVertical, Copy, MoreHorizontal } from 'lucide-react'
import type { DaySlotSummary } from '@/lib/programs/stationScheduleUtils'
import { programDayLabel } from '@/lib/programs/stationScheduleUtils'
import { useProgramDraft } from '@/contexts/ProgramDraftContext'
import { useToast } from '@/components/ui/toast-provider'
import { ProgramDayEditor } from './ProgramDayEditor'
import { DayTargetPicker } from './DayTargetPicker'
import { ReplaceSessionDialog } from './ReplaceSessionDialog'
import { FillProgressionButton } from './FillToolEntryControls'
import columnCss from './sessionColumns.module.css'
import shellCss from '@/components/coach/programs/programEditV1.module.css'
import { cn } from '@/lib/utils'

export interface SessionColumnsRowProps {
  coachId: string
  absoluteWeek: number
  summaries: DaySlotSummary[]
  activeBlockId: string | null
  blockAccentColor: string
  /** Progress the currently viewed week (same absolute week as this sessions row). */
  onProgressWeek?: (absoluteWeek: number) => void
  /** Duplicate current week across all weeks in its phase. */
  onDuplicateWeek?: () => void
  /** Open targeted copy picker for the current week. */
  onRequestCopyWeek?: () => void
}

type PendingAction =
  | {
      kind: 'copy' | 'move'
      sourceDay: number
      targetWeek: number
      targetDay: number
    }
  | null

type PickerMode =
  | { kind: 'move-day'; sourceDay: number }
  | { kind: 'copy-day'; sourceDay: number }
  | { kind: 'copy-group'; sourceDay: number; groupId: string }
  | null

export function SessionColumnsRow({
  coachId,
  absoluteWeek,
  summaries,
  activeBlockId,
  blockAccentColor,
  onProgressWeek,
  onDuplicateWeek,
  onRequestCopyWeek,
}: SessionColumnsRowProps) {
  const draft = useProgramDraft()
  const { addToast } = useToast()
  const [pendingReplace, setPendingReplace] = useState<PendingAction>(null)
  const [picker, setPicker] = useState<PickerMode>(null)
  const [weekMenuOpen, setWeekMenuOpen] = useState(false)

  useEffect(() => {
    setPicker(null)
    setWeekMenuOpen(false)
  }, [absoluteWeek])

  useEffect(() => {
    if (!weekMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      const root = document.getElementById('session-week-actions-menu')
      const trigger = document.getElementById('session-week-actions-trigger')
      if (root?.contains(t) || trigger?.contains(t)) return
      setWeekMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [weekMenuOpen])

  const showWeekActions = Boolean(onDuplicateWeek || onRequestCopyWeek)

  const targetOccupied = useCallback(
    (week: number, day: number) => {
      const summary = summaries[day - 1]
      if (week === absoluteWeek) return Boolean(summary && !summary.isRest)
      const slot = draft.workingCopy?.schedule.find(
        (s) => s.week_number === week && s.program_day === day,
      )
      return Boolean(slot?.template_id)
    },
    [summaries, absoluteWeek, draft.workingCopy?.schedule],
  )

  const runCopy = (sourceDay: number, targetWeek: number, targetDay: number) => {
    draft.copyDay(absoluteWeek, sourceDay, targetWeek, targetDay, activeBlockId)
    addToast({ title: 'Session copied in working copy. Save to commit.' })
  }

  const runMove = (sourceDay: number, targetWeek: number, targetDay: number) => {
    if (targetWeek === absoluteWeek && sourceDay === targetDay) return
    draft.moveDay(absoluteWeek, sourceDay, targetWeek, targetDay, activeBlockId)
    addToast({ title: 'Session moved in working copy. Save to commit.' })
  }

  const requestCopyOrMove = (
    kind: 'copy' | 'move',
    sourceDay: number,
    targetWeek: number,
    targetDay: number,
  ) => {
    if (kind === 'copy' && targetWeek === absoluteWeek && sourceDay === targetDay) return
    if (targetOccupied(targetWeek, targetDay)) {
      setPendingReplace({ kind, sourceDay, targetWeek, targetDay })
      return
    }
    if (kind === 'copy') runCopy(sourceDay, targetWeek, targetDay)
    else runMove(sourceDay, targetWeek, targetDay)
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const sourceDay = Number(result.draggableId.replace('session-day-', ''))
    const targetDay = Number(result.destination.droppableId.replace('session-drop-', ''))
    if (Number.isNaN(sourceDay) || Number.isNaN(targetDay)) return
    if (sourceDay === targetDay) return
    const summary = summaries[sourceDay - 1]
    if (!summary || summary.isRest) return
    requestCopyOrMove('copy', sourceDay, absoluteWeek, targetDay)
  }

  const handlePickerSelect = (target: { week: number; day: number; templateId: string | null }) => {
    if (!picker) return
    if (picker.kind === 'move-day') {
      requestCopyOrMove('move', picker.sourceDay, target.week, target.day)
    } else if (picker.kind === 'copy-day') {
      requestCopyOrMove('copy', picker.sourceDay, target.week, target.day)
    } else if (picker.kind === 'copy-group') {
      const sourceSummary = summaries[picker.sourceDay - 1]
      if (!sourceSummary?.templateId || !target.templateId) {
        addToast({ title: 'Target day needs an existing workout.', variant: 'destructive' })
        return
      }
      draft.copyGroupToDay(sourceSummary.templateId, picker.groupId, target.templateId)
      addToast({ title: 'Group copied to target day. Save to commit.' })
    }
    setPicker(null)
  }

  const confirmReplace = () => {
    if (!pendingReplace) return
    const { kind, sourceDay, targetWeek, targetDay } = pendingReplace
    if (kind === 'copy') runCopy(sourceDay, targetWeek, targetDay)
    else runMove(sourceDay, targetWeek, targetDay)
    setPendingReplace(null)
  }

  const replaceTargetLabel =
    pendingReplace != null ? programDayLabel(pendingReplace.targetDay) : ''

  if (!draft.workingCopy) return null

  return (
    <>
      <section
        className={cn(columnCss.row, shellCss.wrap)}
        aria-label="Week sessions"
        data-testid="session-columns-row"
      >
        <div className={columnCss.rowHeader}>
          <div className={columnCss.rowHeaderTitle}>
            <h2
              className="text-sm font-bold text-[var(--pe-t1)]"
              style={{ fontFamily: 'var(--f-headline, Bricolage Grotesque, sans-serif)' }}
            >
              Week {absoluteWeek} · Sessions
            </h2>
            <div
              className={columnCss.weekHeaderActions}
              style={
                blockAccentColor
                  ? ({ '--fill-entry-accent': blockAccentColor } as CSSProperties)
                  : undefined
              }
            >
              {onProgressWeek ? (
                <FillProgressionButton
                  onClick={() => onProgressWeek(absoluteWeek)}
                  accentColor={blockAccentColor}
                />
              ) : null}
              {showWeekActions ? (
                <>
                  <button
                    id="session-week-actions-trigger"
                    type="button"
                    className={columnCss.weekActionsBtn}
                    aria-label="Week actions"
                    aria-expanded={weekMenuOpen}
                    data-testid="session-week-actions"
                    onClick={() => setWeekMenuOpen((v) => !v)}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                  {weekMenuOpen ? (
                    <div
                      id="session-week-actions-menu"
                      role="menu"
                      className={columnCss.weekActionsMenu}
                      data-testid="session-week-actions-menu"
                    >
                      {onRequestCopyWeek ? (
                        <button
                          type="button"
                          role="menuitem"
                          data-testid="copy-week-to"
                          className={columnCss.weekActionsItem}
                          onClick={() => {
                            setWeekMenuOpen(false)
                            onRequestCopyWeek()
                          }}
                        >
                          <Copy className="h-3 w-3" />
                          Copy to week…
                        </button>
                      ) : null}
                      {onDuplicateWeek ? (
                        <button
                          type="button"
                          role="menuitem"
                          data-testid="duplicate-week"
                          className={columnCss.weekActionsItem}
                          onClick={() => {
                            setWeekMenuOpen(false)
                            onDuplicateWeek()
                          }}
                        >
                          <Copy className="h-3 w-3" />
                          Duplicate to all weeks in phase
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
          <p className={columnCss.hint}>Drag to copy · scroll across the week</p>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className={columnCss.scroll} data-testid="session-columns-scroll">
            {summaries.map((summary, index) => {
              const programDay = index + 1
              const isRest = summary.isRest

              const dragHandle = !isRest ? (
                <Draggable draggableId={`session-day-${programDay}`} index={0}>
                  {(dragProvided) => (
                    <button
                      type="button"
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={columnCss.dragBtn}
                      aria-label={`Drag ${programDayLabel(programDay)} session to copy`}
                      data-testid={`session-drag-${programDay}`}
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                  )}
                </Draggable>
              ) : null

              return (
                <Droppable key={programDay} droppableId={`session-drop-${programDay}`}>
                  {(dropProvided, dropSnapshot) => (
                    <div
                      ref={dropProvided.innerRef}
                      {...dropProvided.droppableProps}
                      data-testid={`session-column-${programDay}`}
                      data-expanded="true"
                      className={cn(
                        columnCss.column,
                        dropSnapshot.isDraggingOver && columnCss.columnDropTarget,
                      )}
                      style={{ '--session-accent': blockAccentColor } as CSSProperties}
                    >
                      <ProgramDayEditor
                        coachId={coachId}
                        absoluteWeek={absoluteWeek}
                        programDay={programDay}
                        summary={summary}
                        activeBlockId={activeBlockId}
                        embedded
                        accentColor={blockAccentColor}
                        headerPrefix={dragHandle}
                        onMoveTo={() =>
                          setPicker({ kind: 'move-day', sourceDay: programDay })
                        }
                        onCopyTo={() =>
                          setPicker({ kind: 'copy-day', sourceDay: programDay })
                        }
                        onDuplicateGroup={(groupId) => {
                          if (!summary.templateId) return
                          draft.duplicateGroup(summary.templateId, groupId)
                          addToast({
                            title: 'Group duplicated in working copy. Save to commit.',
                          })
                        }}
                        onCopyGroupToDay={(groupId) =>
                          setPicker({ kind: 'copy-group', sourceDay: programDay, groupId })
                        }
                      />
                      {dropProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              )
            })}
          </div>
        </DragDropContext>
      </section>

      <ReplaceSessionDialog
        open={pendingReplace != null}
        targetDayLabel={replaceTargetLabel}
        onConfirm={confirmReplace}
        onCancel={() => setPendingReplace(null)}
      />

      <DayTargetPicker
        open={picker != null}
        onOpenChange={(open) => {
          if (!open) setPicker(null)
        }}
        draft={draft.workingCopy}
        title={
          picker?.kind === 'move-day'
            ? 'Move session to…'
            : picker?.kind === 'copy-day'
              ? 'Copy session to…'
              : 'Copy group to day…'
        }
        excludeWeek={picker ? absoluteWeek : undefined}
        excludeDay={picker?.sourceDay}
        requireWorkout={picker?.kind === 'copy-group'}
        onSelect={handlePickerSelect}
      />
    </>
  )
}

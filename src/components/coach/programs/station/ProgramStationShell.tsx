'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { TrainingBlockModal } from '@/components/coach/programs/TrainingBlockModal'
import { type TrainingBlock } from '@/types/trainingBlock'
import { phaseTypeDisplayLabel } from '@/lib/programs/periodizationStyles'
import { useToast } from '@/components/ui/toast-provider'
import {
  DesktopOnlyGate,
  useIsDesktopCanvas,
} from '@/components/workout-canvas/DesktopOnlyGate'
import {
  absoluteWeekFromRelative,
  computeBlockStartWeek,
  sumTrainingBlockWeeks,
} from '@/lib/programs/stationBlockWeeks'
import { ribbonPhaseHexColors } from '@/lib/programs/periodizationPhaseColors'
import { getScheduleSlot, summarizeDaySlot } from '@/lib/programs/stationScheduleUtils'
import { weeksWithScheduledContent } from '@/lib/programs/programDraftMutations'
import { countCanvasExercises } from '@/lib/groupModel/canvasTypes'
import { ProgramDraftProvider, useProgramDraft } from '@/contexts/ProgramDraftContext'
import { ProgramStationHeader } from './ProgramStationHeader'
import { ProgramSettingsDialog } from './ProgramSettingsDialog'
import { PeriodizationRibbon } from './PeriodizationRibbon'
import { SessionColumnsRow } from './SessionColumnsRow'
import { WeekTargetPicker } from './WeekTargetPicker'
import { ReplaceWeekCopyDialog } from './ReplaceWeekCopyDialog'
import { FillToolDialog } from './FillToolDialog'
import { DraftResumeDialog } from './DraftResumeDialog'
import { LeaveConfirmDialog } from './LeaveConfirmDialog'
import { ProgramSaveButton } from './ProgramSaveButton'
import { ProgramSaveOverlay } from './ProgramSaveOverlay'
import { StationModeBanner } from './StationModeBanner'
import { ProgramVolumeRail } from './ProgramVolumeRail'
import { CoachPageShell } from '@/components/coach-ui/CoachPageShell'
import stationCss from './stationEditor.module.css'
import type { CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import css from '@/components/coach/programs/programEditV1.module.css'
import { cn } from '@/lib/utils'
import { formatGroupMetaLabel } from '@/components/workout-canvas/formatSummary'
import type { ProgramEditorMode } from '@/types/programDraft'

export type ProgramStationShellProps =
  | { mode?: 'master'; programId: string }
  | {
      mode: 'client'
      programId: string
      assignmentId: string
      clientId: string
      clientName?: string
      clientAvatarUrl?: string | null
    }

function ProgramStationInner({ programId }: { programId: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const { addToast } = useToast()
  const draft = useProgramDraft()
  const isClientMode = draft.editorMode === 'client'
  const exitHref =
    isClientMode && draft.workingCopy?.clientId
      ? `/coach/clients/${draft.workingCopy.clientId}/workouts`
      : '/coach/programs'

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [relativeWeek, setRelativeWeek] = useState(1)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState(draft.workingCopy?.program ?? null)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [editingBlock, setEditingBlock] = useState<TrainingBlock | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaveSaving, setLeaveSaving] = useState(false)
  const [volumeCollapsed, setVolumeCollapsed] = useState(false)
  const [weekFillOpen, setWeekFillOpen] = useState(false)
  const [weekFillSourceAbs, setWeekFillSourceAbs] = useState(1)
  const [weekCopy, setWeekCopy] = useState<{
    block: TrainingBlock
    sourceAbsWeek: number
  } | null>(null)
  const [weekCopyPending, setWeekCopyPending] = useState<{
    block: TrainingBlock
    sourceAbsWeek: number
    targets: number[]
    occupied: number[]
  } | null>(null)

  const program = draft.workingCopy?.program ?? null
  const trainingBlocks = draft.workingCopy?.trainingBlocks ?? []
  const schedule = draft.workingCopy?.schedule ?? []

  useEffect(() => {
    if (trainingBlocks.length > 0) {
      setActiveBlockId((prev) => prev ?? trainingBlocks[0].id)
    }
  }, [trainingBlocks])

  const activeBlock = useMemo(
    () => trainingBlocks.find((b) => b.id === activeBlockId) ?? trainingBlocks[0] ?? null,
    [trainingBlocks, activeBlockId],
  )

  const isRecurring = program?.type === 'recurring'

  const blockStartWeek = useMemo(() => {
    if (isRecurring) return 1
    return computeBlockStartWeek(trainingBlocks, activeBlock?.id ?? null)
  }, [trainingBlocks, activeBlock?.id, isRecurring])

  const phaseTotalWeeks = sumTrainingBlockWeeks(trainingBlocks)

  const weekCount = isRecurring
    ? 1
    : Math.max(1, activeBlock?.duration_weeks ?? phaseTotalWeeks ?? 1)
  const absoluteWeek = isRecurring
    ? 1
    : absoluteWeekFromRelative(blockStartWeek, Math.min(relativeWeek, weekCount))

  const daySummaries = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const programDay = i + 1
      const slot = getScheduleSlot(schedule, absoluteWeek, programDay)
      const templateId = slot?.template_id ?? null
      const workout = templateId && draft.workingCopy ? draft.workingCopy.workouts[templateId] : null
      const templateName = workout?.name ?? slot?.template_name ?? null
      const exerciseCount = workout ? countCanvasExercises(workout) : templateId ? 0 : 0
      const groupLabels = workout?.groups.map((g) => formatGroupMetaLabel(g)).filter(Boolean)
      return summarizeDaySlot(slot, templateName, exerciseCount, groupLabels)
    })
  }, [schedule, absoluteWeek, draft.workingCopy])

  const weekVolumeWorkouts = useMemo((): CanvasWorkout[] => {
    if (!draft.workingCopy) return []
    const seen = new Set<string>()
    const workouts: CanvasWorkout[] = []
    for (const slot of schedule) {
      if (slot.week_number !== absoluteWeek || !slot.template_id) continue
      if (seen.has(slot.template_id)) continue
      seen.add(slot.template_id)
      const w = draft.workingCopy.workouts[slot.template_id]
      if (w) workouts.push(w)
    }
    return workouts
  }, [schedule, absoluteWeek, draft.workingCopy])

  const weekSessionCount = useMemo(
    () => daySummaries.filter((d) => !d.isRest).length,
    [daySummaries],
  )

  const activeBlockIndex = trainingBlocks.findIndex((b) => b.id === activeBlock?.id)
  const phaseColors = ribbonPhaseHexColors(trainingBlocks, program?.periodization_style)
  const blockAccentColor =
    phaseColors[activeBlockIndex >= 0 ? activeBlockIndex : 0] ??
    phaseColors[0] ??
    '#2EF2C6'

  const isSaving = draft.saveState === 'saving'
  const showSaveSubline = Boolean(
    draft.workingCopy &&
      (draft.workingCopy.structureDirty || draft.workingCopy.dirtyWorkoutIds.length > 1),
  )

  const handleSave = useCallback(async () => {
    if (draft.saveState === 'saving') return false
    const result = await draft.commit()
    if (!result.success) {
      addToast({
        title: result.partialMessage ?? result.error ?? 'Save failed',
        variant: 'destructive',
      })
      return false
    }
    addToast({ title: isClientMode ? 'Client program saved' : 'Program saved' })
    return true
  }, [draft.commit, draft.saveState, addToast, isClientMode])

  const tryNavigateBack = useCallback(() => {
    if (draft.isDirty) {
      setLeaveOpen(true)
      return
    }
    router.push(exitHref)
  }, [draft.isDirty, router, exitHref])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!draft.isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [draft.isDirty])

  const applyWeekCopy = useCallback(
    (block: TrainingBlock, sourceAbsWeek: number, targets: number[]) => {
      draft.copyWeekToWeeks(block, sourceAbsWeek, targets)
      const n = targets.length
      addToast({
        title: `Week copied to ${n} week${n === 1 ? '' : 's'} in working copy. Save to commit.`,
      })
    },
    [draft, addToast],
  )

  const requestWeekCopyTargets = useCallback(
    (block: TrainingBlock, sourceAbsWeek: number, targets: number[]) => {
      if (targets.length === 0) return
      const occupied = weeksWithScheduledContent(
        draft.workingCopy?.schedule ?? [],
        targets,
      )
      if (occupied.length > 0) {
        setWeekCopyPending({ block, sourceAbsWeek, targets, occupied })
        return
      }
      applyWeekCopy(block, sourceAbsWeek, targets)
    },
    [draft.workingCopy?.schedule, applyWeekCopy],
  )

  const openSettings = () => {
    if (!program) return
    setSettingsDraft({ ...program })
    setSettingsOpen(true)
  }

  const applySettings = () => {
    if (!settingsDraft) return
    draft.applySettings(settingsDraft)
    setSettingsOpen(false)
    addToast({ title: 'Settings updated in working copy. Save to commit.' })
  }

  const phaseTypeLabel =
    !isRecurring && activeBlock
      ? phaseTypeDisplayLabel(activeBlock, { periodizationStyle: program?.periodization_style })
      : null
  const blockLabel =
    !isRecurring && activeBlock
      ? `${activeBlock.name}${phaseTypeLabel ? ` · ${phaseTypeLabel}` : ''} · Abs wks ${blockStartWeek}–${blockStartWeek + weekCount - 1}`
      : isRecurring
        ? 'Single repeating week'
        : undefined

  if (draft.loading || !program || !user?.id) {
    return <PageSkeleton variant="form" />
  }

  return (
    <>
      <ProgramSaveOverlay visible={isSaving} showSubline={showSaveSubline} />

      <div className={stationCss.contained}>
        <ProgramStationHeader
          program={program}
          onOpenSettings={openSettings}
          onBack={tryNavigateBack}
          hideSettings={isClientMode}
          backLabel={isClientMode ? 'Client training' : 'Programs'}
          showProgramName={isRecurring && !isClientMode}
          onProgramNameChange={
            isRecurring && !isClientMode ? draft.updateProgramName : undefined
          }
          saveButton={
            <ProgramSaveButton
              saveState={draft.saveState}
              isDirty={draft.isDirty}
              errorMessage={draft.saveError}
              onSave={() => void handleSave()}
            />
          }
        />

        <div className="mt-6" data-testid="program-station-shell">
          {!isRecurring ? (
            <PeriodizationRibbon
            programName={program.name}
            onProgramNameChange={isClientMode ? undefined : draft.updateProgramName}
            periodizationStyle={program.periodization_style}
            trainingBlocks={trainingBlocks}
            activeBlockId={activeBlock?.id ?? null}
            relativeWeek={relativeWeek}
            onSelectBlock={(id) => {
              setActiveBlockId(id)
              setRelativeWeek(1)
            }}
            onSelectBlockWeek={(blockId, rel) => {
              setActiveBlockId(blockId)
              setRelativeWeek(rel)
            }}
            onAddBlock={() => {
              setEditingBlock(null)
              setShowBlockModal(true)
            }}
            onEditBlock={(block) => {
              setEditingBlock(block)
              setShowBlockModal(true)
            }}
            onDeleteBlock={(id) => draft.deleteBlock(id)}
            onMoveBlock={(id, dir) => {
              const idx = trainingBlocks.findIndex((b) => b.id === id)
              if (idx < 0) return
              const target = dir === 'left' ? idx - 1 : idx + 1
              if (target < 0 || target >= trainingBlocks.length) return
              const ordered = [...trainingBlocks]
              const [moved] = ordered.splice(idx, 1)
              ordered.splice(target, 0, moved)
              draft.reorderBlocks(ordered.map((b) => b.id))
            }}
            onDuplicateBlock={(block) => {
              draft.duplicateBlock(block)
              addToast({ title: 'Phase duplicated in working copy. Save to commit.' })
            }}
            onAddWeek={(blockId) => {
              const block = trainingBlocks.find((b) => b.id === blockId)
              if (!block) return
              draft.addWeek(blockId)
              setActiveBlockId(blockId)
              setRelativeWeek(block.duration_weeks + 1)
              addToast({ title: 'Week added in working copy. Save to commit.' })
            }}
          />
        ) : (
          <section className={css.wrap} data-testid="recurring-week-label">
            <h2 className="text-sm font-bold text-[var(--pe-t1)]">Recurring week</h2>
            <p className="text-[11px] text-[var(--pe-t3)] mt-1">{blockLabel}</p>
          </section>
        )}
        </div>
      </div>

      <div className={stationCss.sessionsBleed}>
        <ProgramVolumeRail
          absoluteWeek={absoluteWeek}
          workouts={weekVolumeWorkouts}
          sessionCount={weekSessionCount}
          coachId={user.id}
          collapsed={volumeCollapsed}
          onCollapsedChange={setVolumeCollapsed}
        />
        <SessionColumnsRow
          coachId={user.id}
          absoluteWeek={absoluteWeek}
          summaries={daySummaries}
          activeBlockId={activeBlock?.id ?? null}
          blockAccentColor={blockAccentColor}
          onProgressWeek={
            isRecurring
              ? undefined
              : (absWeek) => {
                  setWeekFillSourceAbs(absWeek)
                  setWeekFillOpen(true)
                }
          }
          onDuplicateWeek={
            isRecurring || !activeBlock
              ? undefined
              : () => {
                  draft.duplicateWeek(activeBlock, absoluteWeek)
                  addToast({ title: 'Week duplicated in working copy. Save to commit.' })
                }
          }
          onRequestCopyWeek={
            isRecurring || !activeBlock
              ? undefined
              : () => {
                  setWeekCopy({ block: activeBlock, sourceAbsWeek: absoluteWeek })
                }
          }
        />
      </div>

      {settingsDraft ? (
        <ProgramSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          draft={settingsDraft}
          phaseTotalWeeks={phaseTotalWeeks}
          saving={false}
          onDraftChange={setSettingsDraft}
          onSave={applySettings}
        />
      ) : null}

      <TrainingBlockModal
        isOpen={showBlockModal}
        block={editingBlock}
        programId={programId}
        nextBlockOrder={trainingBlocks.length + 1}
        periodizationStyle={program?.periodization_style}
        totalBlockCount={trainingBlocks.length + (editingBlock ? 0 : 1)}
        onSave={() => undefined}
        onDelete={(blockId) => {
          draft.deleteBlock(blockId)
          setShowBlockModal(false)
        }}
        onClose={() => setShowBlockModal(false)}
        draftMode
        onDraftSave={(payload) => {
          if (editingBlock) {
            draft.updateBlock(editingBlock.id, payload)
          } else {
            const newId = draft.addBlock(payload)
            if (newId) setActiveBlockId(newId)
          }
          setShowBlockModal(false)
          addToast({ title: 'Phase updated in working copy. Save to commit.' })
        }}
      />

      {draft.resumePrompt ? (
        <DraftResumeDialog
          open
          savedAt={draft.resumePrompt.savedAt}
          onResume={draft.acceptResume}
          onDiscard={draft.discardStoredDraft}
        />
      ) : null}

      <LeaveConfirmDialog
        open={leaveOpen}
        saving={leaveSaving}
        onCancel={() => setLeaveOpen(false)}
        onDiscard={() => {
          draft.discardToBaseline()
          setLeaveOpen(false)
          router.push(exitHref)
        }}
        onSave={async () => {
          setLeaveSaving(true)
          const ok = await handleSave()
          setLeaveSaving(false)
          if (ok) {
            setLeaveOpen(false)
            router.push(exitHref)
          }
        }}
      />

      {draft.workingCopy && weekCopy ? (
        <WeekTargetPicker
          open
          onOpenChange={(open) => {
            if (!open) setWeekCopy(null)
          }}
          draft={draft.workingCopy}
          title={`Copy week ${weekCopy.sourceAbsWeek} to…`}
          excludeWeek={weekCopy.sourceAbsWeek}
          onConfirm={(targets) => {
            const { block, sourceAbsWeek } = weekCopy
            setWeekCopy(null)
            requestWeekCopyTargets(block, sourceAbsWeek, targets)
          }}
        />
      ) : null}

      <ReplaceWeekCopyDialog
        open={weekCopyPending != null}
        occupiedWeeks={weekCopyPending?.occupied ?? []}
        onCancel={() => setWeekCopyPending(null)}
        onConfirm={() => {
          if (!weekCopyPending) return
          const { block, sourceAbsWeek, targets } = weekCopyPending
          setWeekCopyPending(null)
          applyWeekCopy(block, sourceAbsWeek, targets)
        }}
      />

      {draft.workingCopy && weekFillOpen ? (
        <FillToolDialog
          open={weekFillOpen}
          onOpenChange={setWeekFillOpen}
          draft={draft.workingCopy}
          onApply={(next, result) => {
            draft.setWorkingCopy(next)
            addToast({
              title: `Filled ${result.writtenCount} cells${result.skipped ? ` · ${result.skipped} skipped` : ''}. Save to commit.`,
            })
          }}
          sourceAbsoluteWeek={weekFillSourceAbs}
          sourceProgramDay={1}
          activeBlockId={activeBlock?.id ?? null}
          initialScope="week"
        />
      ) : null}
    </>
  )
}

export function ProgramStationShell(props: ProgramStationShellProps) {
  const { user } = useAuth()
  const isDesktop = useIsDesktopCanvas()
  const mode: ProgramEditorMode = props.mode === 'client' ? 'client' : 'master'
  const programId = props.programId

  if (isDesktop === null) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-[var(--pe-t3)]">Loading…</p>
      </div>
    )
  }

  if (!isDesktop) {
    return <DesktopOnlyGate />
  }

  if (!user?.id) {
    return (
      <CoachPageShell widthVariant="data-7xl" className="p-4 sm:p-6">
        <PageSkeleton variant="form" />
      </CoachPageShell>
    )
  }

  return (
    <div className={stationCss.root}>
      <StationModeBanner
        mode={mode}
        clientName={props.mode === 'client' ? props.clientName : undefined}
        clientAvatarUrl={props.mode === 'client' ? props.clientAvatarUrl : undefined}
      />
      <CoachPageShell
        widthVariant="data-7xl"
        className={cn(stationCss.shell, 'min-h-screen pb-16 pt-4 sm:pt-6', css.wrap)}
      >
        {props.mode === 'client' ? (
          <ProgramDraftProvider
            mode="client"
            programId={programId}
            coachId={user.id}
            assignmentId={props.assignmentId}
            clientId={props.clientId}
            clientName={props.clientName}
            clientAvatarUrl={props.clientAvatarUrl}
          >
            <ProgramStationInner programId={programId} />
          </ProgramDraftProvider>
        ) : (
          <ProgramDraftProvider programId={programId} coachId={user.id}>
            <ProgramStationInner programId={programId} />
          </ProgramDraftProvider>
        )}
      </CoachPageShell>
    </div>
  )
}

export default ProgramStationShell

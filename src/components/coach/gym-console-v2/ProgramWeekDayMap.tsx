'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import WorkoutTemplateService, {
  type ProgramSchedule,
} from '@/lib/workoutTemplateService'
import { TrainingBlockService } from '@/lib/trainingBlockService'
import { computeBlockWeekRanges } from '@/lib/programs/stationBlockWeeks'
import { ribbonBlockColor } from '@/lib/programs/periodizationRibbonColors'
import type { TrainingBlock } from '@/types/trainingBlock'
import { supabase } from '@/lib/supabase'
import {
  getAssignmentDayStatus,
  loadAssignmentMapData,
  type AssignmentDayStatus,
  type AssignmentMapSlot,
} from './assignmentMapLoad'
import { GymConsoleDayWorkout } from './GymConsoleDayWorkout'
import { GymConsolePhaseBar } from './GymConsolePhaseBar'
import {
  buildClientSessionMarksScope,
  buildProgramSessionMarksScope,
} from './sessionMarksStorage'
import type { GymConsoleOpenedSelection } from './boardStorage'
import styles from './ProgramWeekDayMap.module.css'

export type ProgramWeekDayMapMode = 'template' | 'assignment'

export type ProgramWeekDayMapProps = {
  /**
   * Master program id — required for mode='template'.
   * For mode='assignment', optional (resolved from assignment); pass when known.
   */
  programId?: string
  /**
   * `template` — master program_schedule.
   * `assignment` — client instance PDAs + completions + phases.
   */
  mode?: ProgramWeekDayMapMode
  /** Piece 3: assignment id when mode === 'assignment' (or resolve via clientId). */
  assignmentId?: string | null
  /** Piece 3: client id — used to resolve active assignment when assignmentId omitted. */
  clientId?: string | null
  className?: string
  /**
   * Restore a finalized board item directly into the opened-workout view.
   * Skips next-due auto-jump.
   */
  initialSelection?: GymConsoleOpenedSelection | null
  /** Fired when the coach commits "Open workout" — parent finalizes + persists. */
  onFinalizeSelection?: (selection: GymConsoleOpenedSelection) => void
}

type ScheduleDay = {
  programDay: number
  scheduleId: string | null
  /** Master template id (fallback for canvas). */
  templateId: string | null
  /** Instance workout id (assignment path). */
  instanceWorkoutId: string | null
  templateName: string | null
  isOptional: boolean
  status: AssignmentDayStatus
}

type EnrichedSchedule = ProgramSchedule & { template_name?: string }

/** Stable empties — never allocate fresh [] inside render for memo/effect deps. */
const EMPTY_SCHEDULE: EnrichedSchedule[] = []
const EMPTY_BLOCKS: TrainingBlock[] = []
const EMPTY_ASSIGNMENT_SLOTS: AssignmentMapSlot[] = []

async function loadTemplateSchedule(programId: string): Promise<EnrichedSchedule[]> {
  const schedule = await WorkoutTemplateService.getProgramSchedule(programId)
  const missingNameIds = [
    ...new Set(
      schedule
        .filter((s) => s.template_id && !s.template_name)
        .map((s) => s.template_id),
    ),
  ]

  const nameById = new Map<string, string>()
  if (missingNameIds.length > 0) {
    const { data } = await supabase
      .from('workout_templates')
      .select('id, name')
      .in('id', missingNameIds)
    for (const row of data ?? []) {
      if (row?.id && row?.name) nameById.set(row.id, row.name)
    }
  }

  return schedule.map((s) => ({
    ...s,
    template_name: s.template_name ?? (s.template_id ? nameById.get(s.template_id) : undefined),
  }))
}

function buildTemplateWeekDays(slots: EnrichedSchedule[], weekNumber: number): ScheduleDay[] {
  const byDay = new Map<number, EnrichedSchedule>()
  for (const slot of slots) {
    if (slot.week_number !== weekNumber) continue
    const day = Number(slot.program_day)
    if (!Number.isFinite(day) || day < 1 || day > 7) continue
    if (!byDay.has(day)) byDay.set(day, slot)
  }

  return Array.from({ length: 7 }, (_, i) => {
    const programDay = i + 1
    const slot = byDay.get(programDay)
    const templateId = slot?.template_id?.trim() || null
    return {
      programDay,
      scheduleId: slot?.id ?? null,
      templateId,
      instanceWorkoutId: null,
      templateName: slot?.template_name?.trim() || null,
      isOptional: Boolean(slot?.is_optional),
      status: templateId ? 'upcoming' : 'rest',
    }
  })
}

function buildAssignmentWeekDays(
  slots: AssignmentMapSlot[],
  weekNumber: number,
  completedPdaIds: Set<string>,
  nextDuePdaId: string | null,
  nextDueWeek: number | null,
  nextDueProgramDay: number | null,
): ScheduleDay[] {
  const byDay = new Map<number, AssignmentMapSlot>()
  for (const slot of slots) {
    if (slot.week_number !== weekNumber) continue
    const day = Number(slot.program_day)
    if (!Number.isFinite(day) || day < 1 || day > 7) continue
    if (!byDay.has(day)) byDay.set(day, slot)
  }

  return Array.from({ length: 7 }, (_, i) => {
    const programDay = i + 1
    const slot = byDay.get(programDay)
    const instanceWorkoutId = slot?.program_instance_workout_id?.trim() || null
    const templateId = slot?.template_id?.trim() || null
    const hasWorkout = Boolean(instanceWorkoutId || templateId)
    const scheduleId = slot?.id ?? null
    const isCompleted = Boolean(scheduleId && completedPdaIds.has(scheduleId))
    const status = getAssignmentDayStatus({
      hasWorkout,
      isCompleted,
      scheduleId,
      weekNumber,
      programDay,
      nextDuePdaId,
      nextDueWeek,
      nextDueProgramDay,
    })
    return {
      programDay,
      scheduleId,
      templateId,
      instanceWorkoutId,
      templateName: slot?.template_name?.trim() || null,
      isOptional: Boolean(slot?.is_optional),
      status,
    }
  })
}

function weekNumbersFromTemplate(schedule: EnrichedSchedule[]): number[] {
  const set = new Set<number>()
  for (const s of schedule) {
    if (typeof s.week_number === 'number' && s.week_number > 0) set.add(s.week_number)
  }
  const sorted = [...set].sort((a, b) => a - b)
  return sorted.length > 0 ? sorted : [1]
}

function weekNumbersFromAssignment(slots: AssignmentMapSlot[]): number[] {
  const set = new Set<number>()
  for (const s of slots) {
    if (s.week_number > 0) set.add(s.week_number)
  }
  const sorted = [...set].sort((a, b) => a - b)
  return sorted.length > 0 ? sorted : [1]
}

function weeksInBlockRange(
  allWeeks: number[],
  startWeek: number,
  endWeek: number,
): number[] {
  const inRange = allWeeks.filter((w) => w >= startWeek && w <= endWeek)
  if (inRange.length > 0) return inRange
  if (endWeek < startWeek) return []
  return Array.from({ length: endWeek - startWeek + 1 }, (_, i) => startWeek + i)
}

const STATUS_CARD_CLASS: Partial<Record<AssignmentDayStatus, string>> = {
  done: styles.dayCardDone,
  missed: styles.dayCardMissed,
  upcoming: styles.dayCardUpcoming,
  nextDue: styles.dayCardNextDue,
  rest: styles.dayCardRest,
}

const STATUS_DOT_CLASS: Partial<Record<AssignmentDayStatus, string>> = {
  done: styles.statusDotDone,
  missed: styles.statusDotMissed,
  upcoming: styles.statusDotUpcoming,
  nextDue: styles.statusDotNextDue,
}

const STATUS_LABEL: Partial<Record<AssignmentDayStatus, string>> = {
  done: 'Done',
  missed: 'Missed',
  upcoming: 'Upcoming',
  nextDue: 'Next',
}

type DayListProps = {
  days: ScheduleDay[]
  activeWeek: number
  peekedDay: number | null
  onTogglePeek: (programDay: number, hasWorkout: boolean) => void
  onOpenDay: (programDay: number) => void
  ribbonColor?: string | null
  showStatus?: boolean
  /** Assignment path — enables previous-performance under exercises. */
  clientId?: string | null
  showPreviousPerformance?: boolean
}

function DayList({
  days,
  activeWeek,
  peekedDay,
  onTogglePeek,
  onOpenDay,
  ribbonColor,
  showStatus = false,
  clientId = null,
  showPreviousPerformance = false,
}: DayListProps) {
  const tintStyle = ribbonColor
    ? ({ ['--map-phase' as string]: ribbonColor } as CSSProperties)
    : undefined

  return (
    <ul
      className={styles.dayList}
      style={tintStyle}
      role="list"
      aria-label={`Week ${activeWeek} days`}
    >
      {days.map((day) => {
        const hasWorkout = Boolean(day.instanceWorkoutId || day.templateId)
        const peeked = peekedDay === day.programDay
        const subtitle = hasWorkout
          ? day.templateName || 'Workout'
          : day.isOptional
            ? 'Optional rest'
            : 'Rest'
        const statusClass = showStatus ? STATUS_CARD_CLASS[day.status] : undefined
        const canvasTemplateId = day.templateId || day.instanceWorkoutId || ''

        return (
          <li
            key={`${activeWeek}-${day.programDay}`}
            className={`${styles.dayCard}${peeked ? ` ${styles.dayCardOpen}` : ''}${
              !hasWorkout ? ` ${styles.dayCardRest}` : ''
            }${statusClass ? ` ${statusClass}` : ''}`}
          >
            <button
              type="button"
              className={styles.dayHeader}
              disabled={!hasWorkout}
              aria-expanded={hasWorkout ? peeked : undefined}
              onClick={() => onTogglePeek(day.programDay, hasWorkout)}
            >
              {showStatus && hasWorkout ? (
                <span
                  className={`${styles.statusDot} ${STATUS_DOT_CLASS[day.status] ?? ''}`}
                  title={STATUS_LABEL[day.status]}
                  aria-label={STATUS_LABEL[day.status]}
                />
              ) : (
                <span className={styles.dayLabel}>Day {day.programDay}</span>
              )}
              {showStatus && hasWorkout ? (
                <span className={styles.dayMeta}>
                  <span className={styles.dayLabelInline}>Day {day.programDay}</span>
                  <span className={styles.dayName}>{subtitle}</span>
                  {STATUS_LABEL[day.status] ? (
                    <span className={styles.statusPill}>{STATUS_LABEL[day.status]}</span>
                  ) : null}
                </span>
              ) : (
                <span className={styles.dayName}>{subtitle}</span>
              )}
              {hasWorkout ? (
                <ChevronDown
                  className={`${styles.chevron}${peeked ? ` ${styles.chevronOpen}` : ''}`}
                  size={16}
                  strokeWidth={2}
                  aria-hidden
                />
              ) : null}
            </button>

            {peeked && hasWorkout && canvasTemplateId ? (
              <div className={styles.dayBody}>
                <GymConsoleDayWorkout
                  templateId={canvasTemplateId}
                  programInstanceWorkoutId={day.instanceWorkoutId}
                  title={`Week ${activeWeek} · Day ${day.programDay}`}
                  clientId={showPreviousPerformance ? clientId : undefined}
                  showPreviousPerformance={showPreviousPerformance}
                />
                <div className={styles.dayPeekActions}>
                  <button
                    type="button"
                    className={styles.openWorkoutBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenDay(day.programDay)
                    }}
                  >
                    Open workout
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

type WeekTabsProps = {
  weeks: number[]
  activeWeek: number
  onSelectWeek: (week: number) => void
  ribbonColor?: string | null
  labelMode?: 'absolute' | 'relative'
  blockStartWeek?: number
}

function WeekTabs({
  weeks,
  activeWeek,
  onSelectWeek,
  ribbonColor,
  labelMode = 'absolute',
  blockStartWeek = 1,
}: WeekTabsProps) {
  const tintStyle = ribbonColor
    ? ({ ['--map-phase' as string]: ribbonColor } as CSSProperties)
    : undefined

  return (
    <div
      className={styles.weekBar}
      style={tintStyle}
      role="tablist"
      aria-label="Program weeks"
    >
      {weeks.map((week) => {
        const selected = week === activeWeek
        const label =
          labelMode === 'relative' ? `W${week - blockStartWeek + 1}` : `W${week}`
        return (
          <button
            key={week}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`${styles.weekTab}${selected ? ` ${styles.weekTabActive}` : ''}`}
            onClick={() => onSelectWeek(week)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function ProgramWeekDayMap({
  programId = '',
  mode = 'template',
  assignmentId = null,
  clientId = null,
  className,
  initialSelection = null,
  onFinalizeSelection,
}: ProgramWeekDayMapProps) {
  const trimmedProgramId = programId.trim()
  const isAssignment = mode === 'assignment'
  const [activeBlockId, setActiveBlockId] = useState<string | null>(
    () => initialSelection?.blockId ?? null,
  )
  const [activeWeek, setActiveWeek] = useState(() => initialSelection?.weekNumber ?? 1)
  /** Peek accordion: at most one day expanded inline while browsing. */
  const [peekedDay, setPeekedDay] = useState<number | null>(null)
  /** Committed open: hides nav, shows only this day's workout. */
  const [openedDay, setOpenedDay] = useState<number | null>(
    () => initialSelection?.programDay ?? null,
  )
  const hasJumpedToNextDueRef = useRef(Boolean(initialSelection))
  const userHasNavigatedRef = useRef(Boolean(initialSelection))
  const didApplyInitialRef = useRef(false)

  const templateScheduleQuery = useQuery({
    queryKey: ['program-schedule', trimmedProgramId, 'template'],
    queryFn: () => loadTemplateSchedule(trimmedProgramId),
    enabled: !isAssignment && Boolean(trimmedProgramId),
  })

  const templateBlocksQuery = useQuery({
    queryKey: ['program-blocks', trimmedProgramId],
    queryFn: () => TrainingBlockService.getTrainingBlocks(trimmedProgramId),
    enabled: !isAssignment && Boolean(trimmedProgramId),
  })

  const assignmentQuery = useQuery({
    queryKey: ['gym-console-assignment-map', assignmentId ?? null, clientId ?? null],
    queryFn: () => loadAssignmentMapData(supabase, { assignmentId, clientId }),
    enabled: isAssignment && Boolean(assignmentId?.trim() || clientId?.trim()),
  })

  const schedule: EnrichedSchedule[] = !isAssignment
    ? (templateScheduleQuery.data ?? EMPTY_SCHEDULE)
    : EMPTY_SCHEDULE
  const assignmentData = isAssignment ? assignmentQuery.data : null
  const assignmentSlots = assignmentData?.slots ?? EMPTY_ASSIGNMENT_SLOTS

  const blocks: TrainingBlock[] = isAssignment
    ? (assignmentData?.blocks ?? EMPTY_BLOCKS)
    : (templateBlocksQuery.data ?? EMPTY_BLOCKS)
  const hasBlocks = blocks.length > 0

  const allWeekNumbers = useMemo(() => {
    if (isAssignment) return weekNumbersFromAssignment(assignmentSlots)
    return weekNumbersFromTemplate(schedule)
  }, [isAssignment, assignmentSlots, schedule])

  const blockRanges = useMemo(() => computeBlockWeekRanges(blocks), [blocks])

  const activeBlock: TrainingBlock | null = useMemo(() => {
    if (!hasBlocks) return null
    return blocks.find((b) => b.id === activeBlockId) ?? blocks[0] ?? null
  }, [hasBlocks, blocks, activeBlockId])

  const activeBlockIndex = useMemo(() => {
    if (!activeBlock) return 0
    const idx = blocks.findIndex((b) => b.id === activeBlock.id)
    return idx >= 0 ? idx : 0
  }, [blocks, activeBlock])

  const activeRibbonColor = useMemo(() => {
    if (!hasBlocks || !activeBlock) return null
    return ribbonBlockColor(activeBlockIndex, blocks.length)
  }, [hasBlocks, activeBlock, activeBlockIndex, blocks.length])

  const activeRange = useMemo(() => {
    if (!activeBlock) return null
    return blockRanges.find((r) => r.blockId === activeBlock.id) ?? null
  }, [activeBlock, blockRanges])

  const weekNumbers = useMemo(() => {
    if (!hasBlocks || !activeRange) return allWeekNumbers
    return weeksInBlockRange(allWeekNumbers, activeRange.startWeek, activeRange.endWeek)
  }, [hasBlocks, activeRange, allWeekNumbers])

  // Reset one-time jump / nav guards when the assignment (or mode) identity changes.
  useEffect(() => {
    if (initialSelection) {
      hasJumpedToNextDueRef.current = true
      userHasNavigatedRef.current = true
      return
    }
    hasJumpedToNextDueRef.current = false
    userHasNavigatedRef.current = false
  }, [mode, assignmentId, clientId, initialSelection])

  useEffect(() => {
    if (!hasBlocks) return
    if (!activeBlockId || !blocks.some((b) => b.id === activeBlockId)) {
      const restoreId = initialSelection?.blockId ?? null
      if (restoreId && blocks.some((b) => b.id === restoreId)) {
        setActiveBlockId(restoreId)
      } else {
        setActiveBlockId(blocks[0]?.id ?? null)
      }
    }
  }, [hasBlocks, blocks, activeBlockId, initialSelection?.blockId])

  // Clamp only when active week is invalid for the *current* block's week list
  // (e.g. switched to a block that doesn't contain the previous week). Do not
  // otherwise rewrite a valid user selection.
  useEffect(() => {
    if (weekNumbers.length === 0) return
    if (weekNumbers.includes(activeWeek)) return
    setActiveWeek(weekNumbers[0] ?? 1)
    setPeekedDay(null)
    if (!initialSelection) setOpenedDay(null)
  }, [weekNumbers, activeWeek, initialSelection])

  useEffect(() => {
    setPeekedDay(null)
    if (!initialSelection) setOpenedDay(null)
  }, [trimmedProgramId, mode, assignmentId, clientId, initialSelection])

  const mapLoading = isAssignment
    ? assignmentQuery.isLoading
    : templateScheduleQuery.isLoading || templateBlocksQuery.isLoading

  // Re-apply finalized selection once data is ready (block id / week / day).
  useEffect(() => {
    if (!initialSelection || didApplyInitialRef.current) return
    if (mapLoading) return
    if (hasBlocks && initialSelection.blockId) {
      setActiveBlockId(initialSelection.blockId)
    }
    setActiveWeek(initialSelection.weekNumber)
    setOpenedDay(initialSelection.programDay)
    setPeekedDay(null)
    hasJumpedToNextDueRef.current = true
    userHasNavigatedRef.current = true
    didApplyInitialRef.current = true
  }, [initialSelection, mapLoading, hasBlocks])

  // One-time jump to next-due week when assignment data first loads.
  // Never re-fires after the coach has manually navigated weeks/blocks.
  useEffect(() => {
    if (!isAssignment) return
    if (userHasNavigatedRef.current || hasJumpedToNextDueRef.current) return
    const nextDueWeek = assignmentData?.nextDueWeek
    if (nextDueWeek == null || !assignmentData?.assignmentId) return

    hasJumpedToNextDueRef.current = true
    const ranges = computeBlockWeekRanges(assignmentData.blocks ?? EMPTY_BLOCKS)
    const range = ranges.find(
      (r) => nextDueWeek >= r.startWeek && nextDueWeek <= r.endWeek,
    )
    if (range) setActiveBlockId(range.blockId)
    setActiveWeek(nextDueWeek)
  }, [
    isAssignment,
    assignmentData?.assignmentId,
    assignmentData?.nextDueWeek,
    assignmentData?.blocks,
  ])

  const days = useMemo(() => {
    if (isAssignment) {
      return buildAssignmentWeekDays(
        assignmentSlots,
        activeWeek,
        assignmentData?.completedPdaIds ?? new Set(),
        assignmentData?.nextDuePdaId ?? null,
        assignmentData?.nextDueWeek ?? null,
        assignmentData?.nextDueProgramDay ?? null,
      )
    }
    return buildTemplateWeekDays(schedule, activeWeek)
  }, [isAssignment, assignmentData, assignmentSlots, activeWeek, schedule])

  const selectBlock = (blockId: string) => {
    userHasNavigatedRef.current = true
    setActiveBlockId(blockId)
    setPeekedDay(null)
    setOpenedDay(null)
    const range = blockRanges.find((r) => r.blockId === blockId)
    if (range) {
      const weeks = weeksInBlockRange(allWeekNumbers, range.startWeek, range.endWeek)
      setActiveWeek(weeks[0] ?? range.startWeek)
    }
  }

  const selectWeek = (week: number) => {
    userHasNavigatedRef.current = true
    setActiveWeek(week)
    setPeekedDay(null)
    setOpenedDay(null)
  }

  const togglePeek = (programDay: number, hasWorkout: boolean) => {
    if (!hasWorkout) return
    setPeekedDay((prev) => (prev === programDay ? null : programDay))
  }

  const openDay = (programDay: number) => {
    setOpenedDay(programDay)
    setPeekedDay(programDay)
    const day = days.find((d) => d.programDay === programDay)
    const contentId = day?.templateId || day?.instanceWorkoutId || ''
    if (!day || !contentId || !onFinalizeSelection) return
    onFinalizeSelection({
      blockId: activeBlock?.id ?? activeBlockId,
      weekNumber: activeWeek,
      programDay,
      templateId: contentId,
      programInstanceWorkoutId: day.instanceWorkoutId ?? null,
    })
  }

  const backToNav = () => {
    setOpenedDay(null)
  }

  const loading = mapLoading
  const error = isAssignment
    ? assignmentQuery.isError || (assignmentQuery.isSuccess && assignmentData == null)
    : templateScheduleQuery.isError
  const errorMessage = isAssignment
    ? assignmentData == null && assignmentQuery.isSuccess
      ? 'No active program assignment for this client.'
      : "Couldn't load this client's assignment."
    : "Couldn't load this program's schedule."

  const showPrevPerf = isAssignment && Boolean(clientId?.trim())
  const openedScheduleDay =
    openedDay != null ? days.find((d) => d.programDay === openedDay) ?? null : null
  const openedTemplateId =
    openedScheduleDay?.templateId || openedScheduleDay?.instanceWorkoutId || ''
  const openedHasWorkout = Boolean(
    openedScheduleDay &&
      (openedScheduleDay.instanceWorkoutId || openedScheduleDay.templateId) &&
      openedTemplateId,
  )

  const openedMarksScope =
    openedDay != null && openedHasWorkout
      ? isAssignment && clientId?.trim()
        ? buildClientSessionMarksScope({
            clientId: clientId.trim(),
            week: activeWeek,
            programDay: openedDay,
            contentId:
              openedScheduleDay?.instanceWorkoutId?.trim() ||
              openedScheduleDay?.templateId?.trim() ||
              openedTemplateId,
          })
        : !isAssignment && trimmedProgramId
          ? buildProgramSessionMarksScope({
              programId: trimmedProgramId,
              week: activeWeek,
              programDay: openedDay,
              contentId: openedTemplateId,
            })
          : null
      : null

  const dayListProps = {
    days,
    activeWeek,
    peekedDay,
    onTogglePeek: togglePeek,
    onOpenDay: openDay,
    showStatus: isAssignment,
    clientId: isAssignment ? clientId : null,
    showPreviousPerformance: showPrevPerf,
  } as const

  return (
    <div className={`${styles.root}${className ? ` ${className}` : ''}`}>
      {loading ? (
        <div className={styles.loading} role="status">
          <div className={styles.skeleton} aria-hidden />
          <div className={styles.skeleton} aria-hidden />
          <div className={styles.skeleton} aria-hidden />
          <p className={styles.statusText}>Loading schedule…</p>
        </div>
      ) : error ? (
        <p className={styles.statusText} role="alert">
          {errorMessage}
        </p>
      ) : openedDay != null && openedHasWorkout ? (
        <div className={styles.openedView}>
          <button type="button" className={styles.backBtn} onClick={backToNav}>
            ← Back to program
          </button>
          <GymConsoleDayWorkout
            templateId={openedTemplateId}
            programInstanceWorkoutId={openedScheduleDay?.instanceWorkoutId}
            title={`Week ${activeWeek} · Day ${openedDay}`}
            clientId={showPrevPerf ? clientId : undefined}
            showPreviousPerformance={showPrevPerf}
            enableSessionMarks={Boolean(openedMarksScope)}
            sessionMarksScope={openedMarksScope}
          />
        </div>
      ) : hasBlocks ? (
        <>
          <GymConsolePhaseBar
            trainingBlocks={blocks}
            activeBlockId={activeBlock?.id ?? null}
            onSelectBlock={selectBlock}
          />

          {activeBlock ? (
            <>
              <WeekTabs
                weeks={weekNumbers}
                activeWeek={activeWeek}
                onSelectWeek={selectWeek}
                ribbonColor={activeRibbonColor}
                labelMode="absolute"
                blockStartWeek={activeRange?.startWeek ?? 1}
              />
              <DayList {...dayListProps} ribbonColor={activeRibbonColor} />
            </>
          ) : null}
        </>
      ) : (
        <>
          <WeekTabs
            weeks={weekNumbers}
            activeWeek={activeWeek}
            onSelectWeek={selectWeek}
          />
          <DayList {...dayListProps} />
        </>
      )}
    </div>
  )
}

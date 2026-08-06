'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvided,
  type DropResult,
} from '@hello-pangea/dnd'
import type { CanvasAction } from '@/lib/groupModel/canvasActions'
import { applyCanvasAction } from '@/lib/groupModel/canvasActions'
import type { CanvasExercise, CanvasGroup, CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import type { ExerciseLibraryItem } from '@/hooks/useExerciseLibrary'
import { groupColorIndex } from '@/lib/groupModel/canvasTypes'
import type { Measurement, SlotProperty } from '@/lib/groupModel/types'
import { CANVAS, groupChipBg, groupChipBgVibrant, groupConnectorColor } from './canvasTokens'
import { formatExerciseSummary, formatGroupMetaLabel, groupLetter, slotLetter } from './formatSummary'
import { PrescriptionTable } from './PrescriptionTable'
import { CanvasFloatingMenu, CanvasMenuItem } from './CanvasFloatingMenu'
import { GripVertical, MoreVertical } from 'lucide-react'
import { FillRampChip } from '@/components/coach/programs/station/FillToolEntryControls'
import { cn } from '@/lib/utils'

const GROUP_HINT_KEY = 'canvas-coach-created-group'

function getCloneContainer(): HTMLElement {
  return document.body
}

function DragCloneShell({
  provided,
  children,
  borderLeft,
}: {
  provided: DraggableProvided
  children: React.ReactNode
  borderLeft?: string
}) {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className="rounded-md py-3 px-3 shadow-2xl"
      style={{
        ...provided.draggableProps.style,
        background: CANVAS.bg,
        color: CANVAS.text,
        border: `1px solid ${CANVAS.hairline}`,
        borderLeft: borderLeft ?? `1px solid ${CANVAS.hairline}`,
        maxWidth: 420,
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  )
}

function GroupDragClone({
  provided,
  group,
  groupIndex,
  chipFill,
  chipText,
}: {
  provided: DraggableProvided
  group: CanvasGroup
  groupIndex: number
  chipFill: (c: string) => string
  chipText?: string
}) {
  const color = CANVAS.groupColors[groupColorIndex(groupIndex)]
  const isMulti = group.slots.length > 1
  const names = group.slots.map((s) => s.exercise?.name ?? 'Exercise').join(' · ')
  return (
    <DragCloneShell
      provided={provided}
      borderLeft={isMulti ? `2px solid ${color}` : undefined}
    >
      <div className="flex items-center gap-2">
        <span
          data-group-letter
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: chipFill(color), color: chipText ?? color }}
        >
          {groupLetter(groupIndex)}
        </span>
        <div className="min-w-0">
          <div className="font-medium truncate text-sm">{names || 'Group'}</div>
          <div className="text-xs font-mono mt-0.5 truncate" style={{ color: CANVAS.muted }}>
            {formatGroupMetaLabel(group)}
          </div>
        </div>
      </div>
    </DragCloneShell>
  )
}

function SlotDragClone({
  provided,
  slot,
  group,
  groupIndex,
  slotIndex,
  chipFill,
  chipText,
}: {
  provided: DraggableProvided
  slot: CanvasExercise
  group: CanvasGroup
  groupIndex: number
  slotIndex: number
  chipFill: (c: string) => string
  chipText?: string
}) {
  const color = CANVAS.groupColors[groupColorIndex(groupIndex)]
  return (
    <DragCloneShell provided={provided}>
      <div className="flex items-center gap-2">
        <span
          data-group-letter
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: chipFill(color), color: chipText ?? color }}
        >
          {slotLetter(groupIndex, slotIndex, group.slots.length)}
        </span>
        <div className="min-w-0">
          <div className="font-medium truncate text-sm">
            {slot.exercise?.name ?? 'Exercise'}
          </div>
          <div className="text-xs font-mono mt-0.5 truncate" style={{ color: CANVAS.muted }}>
            {formatExerciseSummary(slot, group)}
          </div>
        </div>
      </div>
    </DragCloneShell>
  )
}

export interface WorkoutCanvasProps {
  workout: CanvasWorkout
  availableExercises: ExerciseLibraryItem[]
  coachId: string
  onWorkoutChange: (workout: CanvasWorkout) => void
  onAction?: (action: CanvasAction) => void
  onError?: (message: string) => void
  /** Program station: duplicate group in place (working-copy mutation). */
  onDuplicateGroup?: (groupId: string) => void
  /** Program station: open copy-group-to-day picker. */
  onCopyGroupToDay?: (groupId: string) => void
  /** Program station: open fill tool for one exercise. */
  onFillExercise?: (groupId: string, slotId: string) => void
  /** Program station: open fill tool for a group. */
  onFillGroup?: (groupId: string) => void
  /** Program station: block ribbon color for fill Progression entries. */
  fillAccentColor?: string
  /** Station program editor — near-black card styling + vibrant badges. */
  visualVariant?: 'default' | 'station'
}

function hasCreatedGroupHint(coachId: string): boolean {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(`${GROUP_HINT_KEY}-${coachId}`) === '1'
}

function markGroupCreated(coachId: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(`${GROUP_HINT_KEY}-${coachId}`, '1')
}

export function WorkoutCanvas({
  workout,
  availableExercises,
  coachId,
  onWorkoutChange,
  onAction,
  onError,
  onDuplicateGroup,
  onCopyGroupToDay,
  onFillExercise,
  onFillGroup,
  fillAccentColor,
  visualVariant = 'default',
}: WorkoutCanvasProps) {
  const isStation = visualVariant === 'station'
  const chipFill = isStation ? groupChipBgVibrant : groupChipBg
  const chipText = isStation ? '#0a100e' : undefined
  const hairline = isStation ? 'rgba(255,255,255,0.06)' : CANVAS.hairline
  const surfaceBg = isStation ? 'transparent' : CANVAS.bg
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set())
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [addExerciseOpen, setAddExerciseOpen] = useState(false)
  const [addToGroupId, setAddToGroupId] = useState<string | null>(null)
  const [replaceTarget, setReplaceTarget] = useState<{
    groupId: string
    slotId: string
  } | null>(null)
  const [exerciseQuery, setExerciseQuery] = useState('')
  const [groupMetaOpen, setGroupMetaOpen] = useState<string | null>(null)
  const [groupMenuOpen, setGroupMenuOpen] = useState<string | null>(null)
  const [slotMenuOpen, setSlotMenuOpen] = useState<string | null>(null)
  const [showGroupHint, setShowGroupHint] = useState(false)
  const groupMetaAnchorRef = useRef<HTMLElement | null>(null)
  const groupMenuAnchorRef = useRef<HTMLElement | null>(null)
  const slotMenuAnchorRef = useRef<HTMLElement | null>(null)

  const selectionMode = selectedGroups.size > 0

  useEffect(() => {
    setShowGroupHint(!hasCreatedGroupHint(coachId))
  }, [coachId])

  const filteredExercises = useMemo(() => {
    const q = exerciseQuery.toLowerCase().trim()
    if (!q) return availableExercises.slice(0, 12)
    return availableExercises
      .filter(
        (ex) =>
          ex.name.toLowerCase().includes(q) ||
          (ex.description && ex.description.toLowerCase().includes(q)),
      )
      .slice(0, 12)
  }, [availableExercises, exerciseQuery])

  const dispatch = useCallback(
    (action: CanvasAction) => {
      onAction?.(action)
      const result = applyCanvasAction(workout, action)
      if (!result.ok) {
        if (result.needsConfirm) {
          const confirmed = window.confirm(result.error)
          if (confirmed) {
            const retry = applyCanvasAction(workout, { ...action, confirmed: true } as CanvasAction)
            if (retry.ok) onWorkoutChange(retry.workout)
            else onError?.(retry.error)
          }
        } else {
          onError?.(result.error)
        }
        return
      }
      if (action.type === 'GROUP_SELECTED') {
        markGroupCreated(coachId)
        setShowGroupHint(false)
      }
      onWorkoutChange(result.workout)
    },
    [workout, onWorkoutChange, onAction, onError, coachId],
  )

  const toggleSlotExpanded = (slotId: string) => {
    setExpandedSlots((prev) => {
      const next = new Set(prev)
      if (next.has(slotId)) next.delete(slotId)
      else next.add(slotId)
      return next
    })
  }

  const toggleGroupSelected = (groupId: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const clearSelection = () => setSelectedGroups(new Set())

  const handleMergeSelected = () => {
    dispatch({ type: 'GROUP_SELECTED', groupIds: [...selectedGroups] })
    clearSelection()
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    if (result.type === 'group') {
      dispatch({
        type: 'REORDER_GROUPS',
        fromIndex: result.source.index,
        toIndex: result.destination.index,
      })
    } else if (result.type === 'slot') {
      const groupId = result.source.droppableId.replace('slots-', '')
      dispatch({
        type: 'REORDER_SLOTS',
        groupId,
        fromIndex: result.source.index,
        toIndex: result.destination.index,
      })
    }
  }

  const handleAddExercise = (exerciseId: string, groupId?: string | null) => {
    const exercise = availableExercises.find((e) => e.id === exerciseId)
    if (groupId) {
      dispatch({
        type: 'ADD_EXERCISE_TO_GROUP',
        groupId,
        exerciseId,
        exercise: exercise ?? { id: exerciseId, name: 'Exercise' },
      })
    } else {
      dispatch({
        type: 'ADD_EXERCISE',
        exerciseId,
        exercise: exercise ?? { id: exerciseId, name: 'Exercise' },
      })
    }
    setAddExerciseOpen(false)
    setAddToGroupId(null)
    setExerciseQuery('')
  }

  const handleReplaceExercise = (exerciseId: string) => {
    if (!replaceTarget) return
    const exercise = availableExercises.find((e) => e.id === exerciseId)
    dispatch({
      type: 'REPLACE_EXERCISE',
      groupId: replaceTarget.groupId,
      slotId: replaceTarget.slotId,
      exerciseId,
      exercise: exercise ?? { id: exerciseId, name: 'Exercise' },
    })
    setReplaceTarget(null)
    setExerciseQuery('')
  }

  const openReplacePicker = (groupId: string, slotId: string) => {
    setSlotMenuOpen(null)
    setAddExerciseOpen(false)
    setAddToGroupId(null)
    setReplaceTarget({ groupId, slotId })
    setExerciseQuery('')
    setExpandedSlots((prev) => {
      const next = new Set(prev)
      next.add(slotId)
      return next
    })
  }

  const closeReplacePicker = () => {
    setReplaceTarget(null)
    setExerciseQuery('')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setReplaceTarget(null)
        setAddExerciseOpen(true)
        setAddToGroupId(null)
      }
      if ((e.key === 'g' || e.key === 'G') && selectedGroups.size >= 2) {
        e.preventDefault()
        handleMergeSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const renderExerciseSearch = (
    groupId: string | null,
    onClose: () => void,
    options?: { replaceSlotId?: string },
  ) => {
    const replaceSlotId = options?.replaceSlotId
    const isReplace = Boolean(replaceSlotId && groupId)
    const group = groupId ? workout.groups.find((g) => g.id === groupId) : null
    const takenIds = new Set(
      (group?.slots ?? [])
        .filter((s) => s.id !== replaceSlotId)
        .map((s) => s.exercise_id),
    )

    return (
      <div className="relative max-w-xl mt-2">
        <input
          autoFocus
          placeholder={isReplace ? 'Replace with…' : 'Search exercises…'}
          value={exerciseQuery}
          onChange={(e) => setExerciseQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
          style={{
            background: CANVAS.surface,
            border: `1px solid ${CANVAS.hairline}`,
            color: CANVAS.text,
          }}
        />
        {(exerciseQuery || filteredExercises.length > 0) && (
          <ul
            className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-lg shadow-xl"
            style={{
              background: CANVAS.menuSurface,
              border: `1px solid ${CANVAS.hairline}`,
            }}
          >
            {filteredExercises.map((ex) => {
              const taken = takenIds.has(ex.id)
              return (
                <li key={ex.id}>
                  <button
                    type="button"
                    disabled={taken}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    onClick={() => {
                      if (taken) return
                      if (isReplace && groupId && replaceSlotId) {
                        handleReplaceExercise(ex.id)
                      } else {
                        handleAddExercise(ex.id, groupId)
                      }
                    }}
                  >
                    {ex.name}
                    {taken ? (
                      <span className="ml-2 text-[10px]" style={{ color: CANVAS.muted }}>
                        already in group
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <button
          type="button"
          className="mt-2 text-xs"
          style={{ color: CANVAS.muted }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div
      className={isStation ? 'w-full pb-8' : 'w-full min-h-[50vh] pb-28'}
      data-station-canvas={isStation ? true : undefined}
      style={{ background: surfaceBg, color: CANVAS.text }}
    >
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable
          droppableId="groups"
          type="group"
          getContainerForClone={getCloneContainer}
          renderClone={(provided, _snapshot, rubric) => {
            const groupIndex = rubric.source.index
            const group =
              workout.groups.find((g) => g.id === rubric.draggableId) ??
              workout.groups[groupIndex]
            if (!group) return null
            return (
              <GroupDragClone
                provided={provided}
                group={group}
                groupIndex={groupIndex}
                chipFill={chipFill}
                chipText={chipText}
              />
            )
          }}
        >
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className={isStation ? 'space-y-6 px-2 py-4' : 'space-y-8 px-4 py-6'}>
              {workout.groups.map((group, groupIndex) => {
                const color = CANVAS.groupColors[groupColorIndex(groupIndex)]
                const isMulti = group.slots.length > 1
                const letter = groupLetter(groupIndex)
                const isGroupSelected = selectedGroups.has(group.id)
                const checkboxVisible = selectionMode ? 'opacity-100' : 'opacity-0 group-hover/group:opacity-100'
                return (
                  <Draggable key={group.id} draggableId={group.id} index={groupIndex}>
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className="group/group relative pl-4 rounded-md transition-colors"
                        style={{
                          ...dragProvided.draggableProps.style,
                          borderLeft: isMulti && !isStation
                            ? `2px solid ${isGroupSelected ? color : groupConnectorColor(color)}`
                            : isMulti && isStation
                              ? `2px solid ${isGroupSelected ? color : 'rgba(255,255,255,0.06)'}`
                              : undefined,
                          background: isGroupSelected ? `${color}14` : undefined,
                        }}
                      >
                        <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                          {isMulti && (
                            <div className="flex items-center gap-2 mb-3 -ml-4">
                              <input
                                type="checkbox"
                                className={`shrink-0 w-4 h-4 accent-[var(--fc-accent,#2E7BFF)] transition-opacity ${checkboxVisible}`}
                                checked={isGroupSelected}
                                onChange={() => toggleGroupSelected(group.id)}
                                aria-label={`Select group ${letter}`}
                              />
                              <span
                                data-group-letter
                                className="text-[10px] font-semibold px-2 py-0.5 rounded"
                                style={{
                                  background: chipFill(color),
                                  color: chipText ?? color,
                                }}
                              >
                                {letter}
                              </span>
                              <button
                                type="button"
                                className="text-xs hover:underline"
                                style={{ color: CANVAS.muted }}
                                onClick={(e) => {
                                  groupMetaAnchorRef.current = e.currentTarget
                                  setGroupMetaOpen(groupMetaOpen === group.id ? null : group.id)
                                }}
                              >
                                {formatGroupMetaLabel(group)}
                              </button>
                              <button
                                type="button"
                                className="text-xs opacity-0 group-hover/group:opacity-100 transition-opacity"
                                style={{ color: CANVAS.muted }}
                                onClick={() => dispatch({ type: 'UNGROUP', groupId: group.id })}
                              >
                                Ungroup
                              </button>
                              <div className="relative ml-auto">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    groupMenuAnchorRef.current = e.currentTarget
                                    setGroupMenuOpen(groupMenuOpen === group.id ? null : group.id)
                                  }}
                                  style={{ color: CANVAS.muted }}
                                  aria-label="Group menu"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                <CanvasFloatingMenu
                                  open={groupMenuOpen === group.id}
                                  anchorRef={groupMenuAnchorRef}
                                  onClose={() => setGroupMenuOpen(null)}
                                  align="end"
                                >
                                  <CanvasMenuItem
                                    onClick={() => {
                                      dispatch({ type: 'UNGROUP', groupId: group.id })
                                      setGroupMenuOpen(null)
                                    }}
                                  >
                                    Ungroup
                                  </CanvasMenuItem>
                                  {onDuplicateGroup ? (
                                    <CanvasMenuItem
                                      onClick={() => {
                                        onDuplicateGroup(group.id)
                                        setGroupMenuOpen(null)
                                      }}
                                    >
                                      Duplicate
                                    </CanvasMenuItem>
                                  ) : null}
                                  {onCopyGroupToDay ? (
                                    <CanvasMenuItem
                                      onClick={() => {
                                        onCopyGroupToDay(group.id)
                                        setGroupMenuOpen(null)
                                      }}
                                    >
                                      Copy to day…
                                    </CanvasMenuItem>
                                  ) : null}
                                  {onFillGroup ? (
                                    <CanvasMenuItem
                                      onClick={() => {
                                        onFillGroup(group.id)
                                        setGroupMenuOpen(null)
                                      }}
                                    >
                                      Fill group across weeks…
                                    </CanvasMenuItem>
                                  ) : null}
                                </CanvasFloatingMenu>
                              </div>
                            </div>
                          )}

                          <CanvasFloatingMenu
                            open={groupMetaOpen === group.id}
                            anchorRef={groupMetaAnchorRef}
                            onClose={() => setGroupMetaOpen(null)}
                            minWidth={260}
                          >
                            <div className="px-3 py-2 space-y-3 text-xs">
                              <label className="flex items-center gap-2">
                                Rounds
                                <input
                                  type="number"
                                  min={1}
                                  className="w-16 bg-transparent border-b font-mono"
                                  style={{ borderColor: CANVAS.hairline }}
                                  value={group.total_sets}
                                  onChange={(e) =>
                                    dispatch({
                                      type: 'UPDATE_GROUP_META',
                                      groupId: group.id,
                                      patch: { total_sets: Number(e.target.value) || 1 },
                                    })
                                  }
                                />
                              </label>
                              <label className="flex items-center gap-2">
                                Rest after round (s)
                                <input
                                  type="number"
                                  className="w-16 bg-transparent border-b font-mono"
                                  style={{ borderColor: CANVAS.hairline }}
                                  value={group.rest_seconds ?? ''}
                                  onChange={(e) =>
                                    dispatch({
                                      type: 'UPDATE_GROUP_META',
                                      groupId: group.id,
                                      patch: {
                                        rest_seconds: e.target.value ? Number(e.target.value) : null,
                                      },
                                    })
                                  }
                                />
                              </label>
                              <div>
                                <p className="mb-1 uppercase tracking-wide text-[10px]" style={{ color: CANVAS.muted }}>
                                  Advanced · driver
                                </p>
                                <select
                                  value={group.rounds_driver}
                                  onChange={(e) =>
                                    dispatch({
                                      type: 'UPDATE_GROUP_META',
                                      groupId: group.id,
                                      patch: {
                                        rounds_driver: e.target
                                          .value as CanvasWorkout['groups'][0]['rounds_driver'],
                                      },
                                    })
                                  }
                                  className="w-full bg-transparent border rounded px-2 py-1"
                                  style={{ borderColor: CANVAS.hairline }}
                                >
                                  <option value="fixed">Fixed</option>
                                  <option value="amrap">AMRAP</option>
                                  <option value="interval">Interval</option>
                                  <option value="for_time">For time</option>
                                </select>
                              </div>
                            </div>
                          </CanvasFloatingMenu>

                          <Droppable
                            droppableId={`slots-${group.id}`}
                            type="slot"
                            getContainerForClone={getCloneContainer}
                            renderClone={(provided, _snapshot, rubric) => {
                              const slot =
                                group.slots.find((s) => s.id === rubric.draggableId) ??
                                group.slots[rubric.source.index]
                              if (!slot) return null
                              const slotIndex = Math.max(
                                0,
                                group.slots.findIndex((s) => s.id === slot.id),
                              )
                              return (
                                <SlotDragClone
                                  provided={provided}
                                  slot={slot}
                                  group={group}
                                  groupIndex={groupIndex}
                                  slotIndex={slotIndex}
                                  chipFill={chipFill}
                                  chipText={chipText}
                                />
                              )
                            }}
                          >
                            {(slotProvided) => (
                              <div ref={slotProvided.innerRef} {...slotProvided.droppableProps} className="space-y-0">
                                {group.slots.map((slot, slotIndex) => (
                                  <Draggable key={slot.id} draggableId={slot.id} index={slotIndex}>
                                    {(slotDrag) => (
                                      <div
                                        ref={slotDrag.innerRef}
                                        {...slotDrag.draggableProps}
                                        className={cn(
                                          'group/row py-3',
                                          isStation && 'relative',
                                        )}
                                        style={{
                                          ...slotDrag.draggableProps.style,
                                          borderTop: `1px solid ${hairline}`,
                                          background: isGroupSelected && isMulti ? `${color}0A` : undefined,
                                        }}
                                      >
                                        <div className="flex items-start gap-2">
                                          {!isStation && !isMulti && (
                                            <input
                                              type="checkbox"
                                              className={`mt-1.5 shrink-0 w-4 h-4 accent-[var(--fc-accent,#2E7BFF)] transition-opacity ${checkboxVisible}`}
                                              checked={isGroupSelected}
                                              onChange={() => toggleGroupSelected(group.id)}
                                              aria-label={`Select ${slot.exercise?.name ?? 'exercise'}`}
                                            />
                                          )}
                                          {!isStation ? (
                                            <span
                                              {...slotDrag.dragHandleProps}
                                              className="opacity-0 group-hover/row:opacity-100 pt-1 shrink-0 cursor-grab active:cursor-grabbing"
                                              style={{ color: CANVAS.muted }}
                                              aria-hidden
                                            >
                                              <GripVertical className="w-4 h-4" />
                                            </span>
                                          ) : (
                                            <span
                                              {...slotDrag.dragHandleProps}
                                              className="sr-only"
                                            >
                                              Drag
                                            </span>
                                          )}
                                          <span
                                            data-group-letter
                                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 shrink-0"
                                            style={{
                                              background: chipFill(color),
                                              color: chipText ?? color,
                                            }}
                                          >
                                            {slotLetter(groupIndex, slotIndex, group.slots.length)}
                                          </span>
                                          <div className="flex-1 min-w-0">
                                            <button
                                              type="button"
                                              className="text-left w-full"
                                              onClick={() => toggleSlotExpanded(slot.id)}
                                            >
                                              <div
                                                className={
                                                  isStation
                                                    ? 'font-medium whitespace-nowrap'
                                                    : 'font-medium truncate'
                                                }
                                              >
                                                {slot.exercise?.name ?? 'Exercise'}
                                              </div>
                                              <div
                                                className={
                                                  isStation
                                                    ? 'text-xs font-mono mt-0.5 whitespace-nowrap'
                                                    : 'text-xs font-mono truncate mt-0.5'
                                                }
                                                style={{ color: CANVAS.muted }}
                                              >
                                                {formatExerciseSummary(slot, group)}
                                              </div>
                                            </button>
                                            {replaceTarget?.slotId === slot.id &&
                                            replaceTarget.groupId === group.id
                                              ? renderExerciseSearch(group.id, closeReplacePicker, {
                                                  replaceSlotId: slot.id,
                                                })
                                              : null}
                                            {expandedSlots.has(slot.id) && (
                                              <PrescriptionTable
                                                slot={slot}
                                                group={group}
                                                onUpdatePrescription={(setNumber, patch) =>
                                                  dispatch({
                                                    type: 'UPDATE_PRESCRIPTION',
                                                    groupId: group.id,
                                                    slotId: slot.id,
                                                    setNumber,
                                                    patch,
                                                  })
                                                }
                                                onAddSet={() =>
                                                  dispatch({ type: 'ADD_SET', groupId: group.id })
                                                }
                                                onRemoveSet={() =>
                                                  dispatch({
                                                    type: 'REMOVE_SET',
                                                    groupId: group.id,
                                                    setNumber: 0,
                                                  })
                                                }
                                                onSetMeasurement={(measurement, confirmed) =>
                                                  dispatch({
                                                    type: 'SET_MEASUREMENT',
                                                    groupId: group.id,
                                                    slotId: slot.id,
                                                    measurement,
                                                    confirmed,
                                                  })
                                                }
                                                onToggleProperty={(property, confirmed) => {
                                                  if (slot.enabledProperties.includes(property)) {
                                                    dispatch({
                                                      type: 'REMOVE_PROPERTY',
                                                      groupId: group.id,
                                                      slotId: slot.id,
                                                      property,
                                                      confirmed,
                                                    })
                                                  } else {
                                                    dispatch({
                                                      type: 'ADD_PROPERTY',
                                                      groupId: group.id,
                                                      slotId: slot.id,
                                                      property,
                                                    })
                                                  }
                                                }}
                                                onUpdateSlot={(patch) =>
                                                  dispatch({
                                                    type: 'UPDATE_SLOT',
                                                    groupId: group.id,
                                                    slotId: slot.id,
                                                    patch,
                                                  })
                                                }
                                              />
                                            )}
                                          </div>
                                          {!isStation && onFillExercise ? (
                                            <FillRampChip
                                              onClick={() => onFillExercise(group.id, slot.id)}
                                              accentColor={fillAccentColor}
                                            />
                                          ) : null}
                                          {!isStation ? (
                                            <button
                                              type="button"
                                              className="opacity-0 group-hover/row:opacity-100 p-1 shrink-0"
                                              style={{ color: CANVAS.muted }}
                                              aria-label="Exercise menu"
                                              onClick={(e) => {
                                                slotMenuAnchorRef.current = e.currentTarget
                                                setSlotMenuOpen(slotMenuOpen === slot.id ? null : slot.id)
                                              }}
                                            >
                                              <MoreVertical className="w-4 h-4" />
                                            </button>
                                          ) : null}
                                          {!isStation ? (
                                          <CanvasFloatingMenu
                                            open={slotMenuOpen === slot.id}
                                            anchorRef={slotMenuAnchorRef}
                                            onClose={() => setSlotMenuOpen(null)}
                                            align="end"
                                          >
                                            {onFillExercise ? (
                                              <CanvasMenuItem
                                                onClick={() => {
                                                  onFillExercise(group.id, slot.id)
                                                  setSlotMenuOpen(null)
                                                }}
                                              >
                                                Fill this exercise…
                                              </CanvasMenuItem>
                                            ) : null}
                                            {isMulti && (
                                              <CanvasMenuItem
                                                onClick={() => {
                                                  dispatch({
                                                    type: 'REMOVE_FROM_GROUP',
                                                    groupId: group.id,
                                                    slotId: slot.id,
                                                  })
                                                  setSlotMenuOpen(null)
                                                }}
                                              >
                                                Remove from group
                                              </CanvasMenuItem>
                                            )}
                                            <CanvasMenuItem
                                              onClick={() => openReplacePicker(group.id, slot.id)}
                                            >
                                              Replace exercise…
                                            </CanvasMenuItem>
                                            <CanvasMenuItem
                                              onClick={() => {
                                                dispatch({
                                                  type: 'DELETE_SLOT',
                                                  groupId: group.id,
                                                  slotId: slot.id,
                                                })
                                                setSlotMenuOpen(null)
                                              }}
                                            >
                                              Delete exercise
                                            </CanvasMenuItem>
                                          </CanvasFloatingMenu>
                                          ) : null}
                                        </div>
                                        {isStation ? (
                                          <div className="pointer-events-none absolute right-0 top-2 z-[1] flex items-center gap-1 opacity-0 transition-opacity group-hover/row:pointer-events-auto group-hover/row:opacity-100">
                                            {!isMulti ? (
                                              <input
                                                type="checkbox"
                                                className="shrink-0 w-4 h-4 accent-[var(--fc-accent,#2E7BFF)]"
                                                checked={isGroupSelected}
                                                onChange={() => toggleGroupSelected(group.id)}
                                                aria-label={`Select ${slot.exercise?.name ?? 'exercise'}`}
                                              />
                                            ) : null}
                                            {onFillExercise ? (
                                              <FillRampChip
                                                onClick={() => onFillExercise(group.id, slot.id)}
                                                accentColor={fillAccentColor}
                                                visible
                                              />
                                            ) : null}
                                            <button
                                              type="button"
                                              className="p-1 shrink-0"
                                              style={{ color: CANVAS.muted }}
                                              aria-label="Exercise menu"
                                              onClick={(e) => {
                                                slotMenuAnchorRef.current = e.currentTarget
                                                setSlotMenuOpen(slotMenuOpen === slot.id ? null : slot.id)
                                              }}
                                            >
                                              <MoreVertical className="w-4 h-4" />
                                            </button>
                                            <CanvasFloatingMenu
                                              open={slotMenuOpen === slot.id}
                                              anchorRef={slotMenuAnchorRef}
                                              onClose={() => setSlotMenuOpen(null)}
                                              align="end"
                                            >
                                              {onFillExercise ? (
                                                <CanvasMenuItem
                                                  onClick={() => {
                                                    onFillExercise(group.id, slot.id)
                                                    setSlotMenuOpen(null)
                                                  }}
                                                >
                                                  Fill this exercise…
                                                </CanvasMenuItem>
                                              ) : null}
                                              {isMulti && (
                                                <CanvasMenuItem
                                                  onClick={() => {
                                                    dispatch({
                                                      type: 'REMOVE_FROM_GROUP',
                                                      groupId: group.id,
                                                      slotId: slot.id,
                                                    })
                                                    setSlotMenuOpen(null)
                                                  }}
                                                >
                                                  Remove from group
                                                </CanvasMenuItem>
                                              )}
                                              <CanvasMenuItem
                                                onClick={() => openReplacePicker(group.id, slot.id)}
                                              >
                                                Replace exercise…
                                              </CanvasMenuItem>
                                              <CanvasMenuItem
                                                onClick={() => {
                                                  dispatch({
                                                    type: 'DELETE_SLOT',
                                                    groupId: group.id,
                                                    slotId: slot.id,
                                                  })
                                                  setSlotMenuOpen(null)
                                                }}
                                              >
                                                Delete exercise
                                              </CanvasMenuItem>
                                            </CanvasFloatingMenu>
                                          </div>
                                        ) : null}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {slotProvided.placeholder}

                                {isMulti && (
                                  <div className="pt-2 opacity-0 group-hover/group:opacity-100 transition-opacity">
                                    {addToGroupId === group.id ? (
                                      renderExerciseSearch(group.id, () => {
                                        setAddToGroupId(null)
                                        setExerciseQuery('')
                                      })
                                    ) : (
                                      <button
                                        type="button"
                                        className="text-xs"
                                        style={{ color: CANVAS.cyan }}
                                        onClick={() => {
                                          setReplaceTarget(null)
                                          setAddToGroupId(group.id)
                                          setAddExerciseOpen(false)
                                          setExerciseQuery('')
                                        }}
                                      >
                                        + Add exercise to group
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      </div>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="px-4 py-3" style={{ borderTop: `1px solid ${CANVAS.hairline}` }}>
        {!addExerciseOpen ? (
          <>
            <button
              type="button"
              onClick={() => {
                setReplaceTarget(null)
                setAddExerciseOpen(true)
                setAddToGroupId(null)
              }}
              className="text-sm"
              style={{ color: CANVAS.cyan }}
            >
              + Add exercise <kbd className="ml-2 text-[10px] opacity-60">N</kbd>
            </button>
            {showGroupHint && (
              <p className="mt-2 text-xs" style={{ color: CANVAS.muted }}>
                Tip: select two groups and press G to merge into a superset or circuit.
              </p>
            )}
          </>
        ) : (
          renderExerciseSearch(null, () => {
            setAddExerciseOpen(false)
            setExerciseQuery('')
          })
        )}
      </div>

      {selectedGroups.size >= 2 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-4 px-4 py-3 text-sm"
          style={{
            background: CANVAS.menuSurface,
            borderTop: `1px solid ${CANVAS.hairline}`,
            boxShadow: '0 -8px 32px rgba(0,0,0,.35)',
          }}
        >
          <span style={{ color: CANVAS.muted }}>{selectedGroups.size} selected</span>
          <button
            type="button"
            onClick={handleMergeSelected}
            className="px-4 py-1.5 rounded text-xs font-semibold"
            style={{ background: CANVAS.accent, color: '#fff' }}
          >
            Group <kbd className="ml-1 opacity-70">G</kbd>
          </button>
          <button type="button" onClick={clearSelection} style={{ color: CANVAS.muted }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

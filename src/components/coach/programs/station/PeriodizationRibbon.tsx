'use client'

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Copy,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { TrainingBlock } from '@/types/trainingBlock'
import { computeBlockWeekRanges } from '@/lib/programs/stationBlockWeeks'
import { weekDateLabel } from '@/lib/programs/periodizationRibbonColors'
import { ribbonPhaseHexColors } from '@/lib/programs/periodizationPhaseColors'
import {
  formatPhaseDisplayName,
  periodizationStyleLabel,
} from '@/lib/programs/periodizationStyles'
import css from './periodizationRibbon.module.css'
import shellCss from '@/components/coach/programs/programEditV1.module.css'
import { cn } from '@/lib/utils'

/** Must match periodizationRibbon.module.css week geometry. */
const WEEK_CARD_MIN = 56
const WEEK_GAP = 3
const WEEK_GROUP_PAD_X = 3
const ADD_WEEK_W = 44

/** Minimum width of one phase column at compressed card size (scroll only below this total). */
function phaseColumnMinWidthPx(weekCount: number): number {
  const n = Math.max(1, weekCount)
  return WEEK_GROUP_PAD_X * 2 + n * WEEK_CARD_MIN + ADD_WEEK_W + n * WEEK_GAP
}

export interface PeriodizationRibbonProps {
  programName: string
  onProgramNameChange?: (name: string) => void
  periodizationStyle?: string | null
  trainingBlocks: TrainingBlock[]
  activeBlockId: string | null
  relativeWeek: number
  onSelectBlock: (blockId: string) => void
  onSelectBlockWeek: (blockId: string, relativeWeek: number) => void
  onAddBlock: () => void
  onEditBlock: (block: TrainingBlock) => void
  onDeleteBlock: (blockId: string) => void
  onMoveBlock: (blockId: string, direction: 'left' | 'right') => void
  onDuplicateBlock: (block: TrainingBlock) => void
  onDuplicateWeek: (block: TrainingBlock, absoluteWeek: number) => void
  onAddWeek: (blockId: string) => void
  busy?: boolean
}

type MenuKind = 'block' | 'week'

export function PeriodizationRibbon({
  programName,
  onProgramNameChange,
  periodizationStyle,
  trainingBlocks,
  activeBlockId,
  relativeWeek,
  onSelectBlock,
  onSelectBlockWeek,
  onAddBlock,
  onEditBlock,
  onDeleteBlock,
  onMoveBlock,
  onDuplicateBlock,
  onDuplicateWeek,
  onAddWeek,
  busy,
}: PeriodizationRibbonProps) {
  const ranges = computeBlockWeekRanges(trainingBlocks)
  const [menu, setMenu] = useState<{
    kind: MenuKind
    blockId: string
    rel?: number
    pos: { top: number; left: number }
  } | null>(null)
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const closeMenu = useCallback(() => setMenu(null), [])

  const openMenu = useCallback(
    (kind: MenuKind, blockId: string, rel?: number) => {
      const key = kind === 'block' ? `block-${blockId}` : `week-${blockId}-${rel}`
      const el = triggerRefs.current[key]
      if (!el) return
      const r = el.getBoundingClientRect()
      const menuWidth = 168
      let left = r.right - menuWidth
      if (left < 8) left = 8
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8
      }
      let top = r.bottom + 6
      const maxTop = window.innerHeight - 280
      if (top > maxTop) top = Math.max(8, r.top - 6 - 260)
      setMenu({ kind, blockId, rel, pos: { top, left } })
    },
    [],
  )

  useEffect(() => {
    if (!menu) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      const menuEl = document.getElementById('periodization-ribbon-menu')
      if (menuEl?.contains(t)) return
      closeMenu()
    }
    const onScroll = () => closeMenu()
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menu, closeMenu])

  useLayoutEffect(() => {
    if (!menu) return
    const key =
      menu.kind === 'block'
        ? `block-${menu.blockId}`
        : `week-${menu.blockId}-${menu.rel}`
    const el = triggerRefs.current[key]
    if (!el) return
    const r = el.getBoundingClientRect()
    const menuWidth = 168
    let left = r.right - menuWidth
    if (left < 8) left = 8
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8
    }
    let top = r.bottom + 6
    const maxTop = window.innerHeight - 280
    if (top > maxTop) top = Math.max(8, r.top - 6 - 260)
    setMenu((prev) => (prev ? { ...prev, pos: { top, left } } : null))
  }, [menu?.blockId, menu?.kind, menu?.rel, trainingBlocks.length])

  const menuBlock = menu ? trainingBlocks.find((b) => b.id === menu.blockId) : null
  const menuBlockIndex = menuBlock
    ? trainingBlocks.findIndex((b) => b.id === menuBlock.id)
    : -1
  const styleLabel = periodizationStyleLabel(periodizationStyle)
  const phaseHex = ribbonPhaseHexColors(trainingBlocks, periodizationStyle)
  const isSolo = trainingBlocks.length === 1

  return (
    <section
      className={cn(css.wrap, shellCss.wrap)}
      aria-label="Periodization"
      data-testid="periodization-ribbon"
    >
      <div className={css.nameRow}>
        {onProgramNameChange ? (
          <input
            value={programName}
            onChange={(e) => onProgramNameChange(e.target.value)}
            className={css.nameInput}
            placeholder="Program name"
            aria-label="Program name"
          />
        ) : (
          <p className={css.nameInput} aria-label="Program name">
            {programName}
          </p>
        )}
        {styleLabel ? (
          <p className={css.styleSubtitle}>{styleLabel}</p>
        ) : null}
      </div>

      <div className={css.timelineScroll} data-testid="ribbon-bar">
        <div className={css.timelineTrack} data-testid="week-strip">
          {trainingBlocks.map((block, blockIndex) => {
            const range = ranges[blockIndex]
            if (!range) return null
            const isActive = block.id === activeBlockId
            const displayName = formatPhaseDisplayName(block.name, block.phase_label, {
              periodizationStyle,
              blockOrder: block.block_order,
            })
            const color = phaseHex[blockIndex] ?? '#2EF2C6'
            const weekCount = Math.max(1, block.duration_weeks)
            const colMin = phaseColumnMinWidthPx(weekCount)
            const isFirst = !isSolo && blockIndex === 0
            const isLast = !isSolo && blockIndex === trainingBlocks.length - 1
            const isActiveBlock = block.id === activeBlockId

            return (
              <div
                key={block.id}
                className={css.phaseColumn}
                style={{
                  flexGrow: weekCount,
                  flexShrink: 1,
                  flexBasis: 0,
                  minWidth: colMin,
                }}
                data-testid={`week-block-${block.id}`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  data-testid={`ribbon-block-${block.id}`}
                  className={cn(
                    css.blockSegment,
                    isSolo && css.blockSegmentSolo,
                    isFirst && css.blockSegmentFirst,
                    isLast && css.blockSegmentLast,
                    isActive && css.blockSegmentActive,
                  )}
                  style={
                    {
                      '--seg-color': color,
                      zIndex: isActive ? 10 : trainingBlocks.length - blockIndex,
                    } as React.CSSProperties
                  }
                  onClick={() => onSelectBlock(block.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectBlock(block.id)
                    }
                  }}
                >
                  <span className={css.blockLabel}>{displayName}</span>
                  <button
                    ref={(el) => {
                      triggerRefs.current[`block-${block.id}`] = el
                    }}
                    type="button"
                    className={css.blockMenuBtn}
                    aria-label={`Edit ${displayName}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (menu?.kind === 'block' && menu.blockId === block.id) closeMenu()
                      else openMenu('block', block.id)
                    }}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className={css.weekBlockGroup}>
                  {Array.from({ length: weekCount }, (_, i) => {
                    const rel = i + 1
                    const abs = range.startWeek + rel - 1
                    const weekActive = isActiveBlock && rel === relativeWeek
                    return (
                      <div key={rel} className={css.weekCardWrap}>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={weekActive}
                          data-testid={`week-${block.id}-${rel}`}
                          className={cn(css.weekCell, weekActive && css.weekCellActive)}
                          style={{ '--week-block-color': color } as React.CSSProperties}
                          onClick={() => onSelectBlockWeek(block.id, rel)}
                        >
                          <span className={css.weekNum}>Wk {abs}</span>
                          <span className={css.weekDate}>{weekDateLabel(abs)}</span>
                        </button>
                        {weekActive ? (
                          <button
                            ref={(el) => {
                              triggerRefs.current[`week-${block.id}-${rel}`] = el
                            }}
                            type="button"
                            data-testid={`week-kebab-${block.id}-${rel}`}
                            className={css.weekKebab}
                            aria-label="Week actions"
                            onClick={() => {
                              if (
                                menu?.kind === 'week' &&
                                menu.blockId === block.id &&
                                menu.rel === rel
                              ) {
                                closeMenu()
                              } else {
                                openMenu('week', block.id, rel)
                              }
                            }}
                          >
                            <MoreHorizontal className="w-2.5 h-2.5" />
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAddWeek(block.id)}
                    data-testid={`add-week-${block.id}`}
                    className={css.addWeekBtn}
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              </div>
            )
          })}

          <button
            type="button"
            onClick={onAddBlock}
            data-testid="add-block"
            className={css.addBlockBtn}
          >
            <Plus className="w-3.5 h-3.5" />
            Add phase
          </button>
        </div>
      </div>

      {menu &&
        menuBlock &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="periodization-ribbon-menu"
            role="menu"
            className={css.menuPortal}
            style={{ top: menu.pos.top, left: menu.pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {menu.kind === 'block' ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className={css.menuRow}
                  onClick={() => {
                    closeMenu()
                    onEditBlock(menuBlock)
                  }}
                >
                  <Pencil className="w-3 h-3" />
                  Rename phase
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={css.menuRow}
                  onClick={() => {
                    closeMenu()
                    onDuplicateBlock(menuBlock)
                  }}
                >
                  <Copy className="w-3 h-3" />
                  Duplicate phase
                </button>
                <div className={css.menuDivider} />
                <button
                  type="button"
                  role="menuitem"
                  className={css.menuRow}
                  disabled={menuBlockIndex <= 0}
                  onClick={() => {
                    if (menuBlockIndex <= 0) return
                    closeMenu()
                    onMoveBlock(menuBlock.id, 'left')
                  }}
                >
                  <ChevronLeft className="w-3 h-3" />
                  Move left
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={css.menuRow}
                  disabled={menuBlockIndex >= trainingBlocks.length - 1}
                  onClick={() => {
                    if (menuBlockIndex >= trainingBlocks.length - 1) return
                    closeMenu()
                    onMoveBlock(menuBlock.id, 'right')
                  }}
                >
                  <ChevronRight className="w-3 h-3" />
                  Move right
                </button>
                <div className={css.menuDivider} />
                <button
                  type="button"
                  role="menuitem"
                  className={css.menuRow}
                  style={{ color: '#FF5A5F' }}
                  onClick={() => {
                    closeMenu()
                    onDeleteBlock(menuBlock.id)
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete phase
                </button>
              </>
            ) : (
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                data-testid="duplicate-week"
                className={css.menuRow}
                onClick={() => {
                  closeMenu()
                  const range = ranges[menuBlockIndex]
                  if (!range || menu.rel == null) return
                  onDuplicateWeek(menuBlock, range.startWeek + menu.rel - 1)
                }}
              >
                <Copy className="w-3 h-3" />
                Duplicate week
              </button>
            )}
          </div>,
          document.body,
        )}
    </section>
  )
}

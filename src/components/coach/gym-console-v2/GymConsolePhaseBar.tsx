'use client'

import type { CSSProperties } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { ribbonPhaseHexColors } from '@/lib/programs/periodizationPhaseColors'
import { formatPhaseDisplayName } from '@/lib/programs/periodizationStyles'
import { cn } from '@/lib/utils'
import ribbonCss from '@/components/coach/programs/station/periodizationRibbon.module.css'
import styles from './GymConsolePhaseBar.module.css'

export type GymConsolePhaseBarBlock = {
  id: string
  name: string
  phase_label?: string | null
  duration_weeks: number
  block_order: number
}

export type GymConsolePhaseBarProps = {
  trainingBlocks: GymConsolePhaseBarBlock[]
  activeBlockId: string | null
  onSelectBlock: (blockId: string) => void
  /** Optional periodization style for sequential phase naming (same as edit ribbon). */
  periodizationStyle?: string | null
  /** When set, shows kebab that opens edit for that block. */
  onEditBlock?: (block: GymConsolePhaseBarBlock) => void
  className?: string
}

/**
 * Display/select slice of PeriodizationRibbon's intensity chevron bar.
 * Same shape + per-phase-name colors; optional edit kebab; no add-phase / week dock.
 */
export function GymConsolePhaseBar({
  trainingBlocks,
  activeBlockId,
  onSelectBlock,
  periodizationStyle = null,
  onEditBlock,
  className,
}: GymConsolePhaseBarProps) {
  if (trainingBlocks.length === 0) return null

  const phaseHex = ribbonPhaseHexColors(trainingBlocks, periodizationStyle)
  const isSolo = trainingBlocks.length === 1

  return (
    <div className={cn(styles.wrap, className)}>
      <div
        className={ribbonCss.ribbonBar}
        data-testid="gym-console-phase-bar"
        role="tablist"
        aria-label="Training blocks"
      >
        {trainingBlocks.map((block, blockIndex) => {
          const isActive = block.id === activeBlockId
          const displayName = formatPhaseDisplayName(block.name, block.phase_label, {
            periodizationStyle,
            blockOrder: block.block_order,
          })
          const color = phaseHex[blockIndex] ?? '#2EF2C6'
          const flexGrow = Math.max(1, block.duration_weeks)
          const isFirst = !isSolo && blockIndex === 0
          const isLast = !isSolo && blockIndex === trainingBlocks.length - 1

          return (
            <button
              key={block.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`gym-console-phase-block-${block.id}`}
              className={cn(
                ribbonCss.blockSegment,
                isSolo && ribbonCss.blockSegmentSolo,
                isFirst && ribbonCss.blockSegmentFirst,
                isLast && ribbonCss.blockSegmentLast,
                isActive && ribbonCss.blockSegmentActive,
              )}
              style={
                {
                  flexGrow,
                  flexBasis: 0,
                  '--seg-color': color,
                  zIndex: isActive ? 10 : trainingBlocks.length - blockIndex,
                } as CSSProperties
              }
              onClick={() => onSelectBlock(block.id)}
            >
              <span className={ribbonCss.blockLabel}>{displayName}</span>
              {onEditBlock ? (
                <span
                  role="button"
                  tabIndex={0}
                  className={ribbonCss.blockMenuBtn}
                  aria-label={`Edit ${displayName}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditBlock(block)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      onEditBlock(block)
                    }
                  }}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

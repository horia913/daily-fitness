'use client'

import { ribbonBlockColor } from '@/lib/programs/periodizationRibbonColors'
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
  className?: string
}

/**
 * Display/select-only slice of PeriodizationRibbon's block bar.
 * Reuses ribbonBlockColor + periodizationRibbon.module.css for pixel match.
 * No add-phase, menus, or week dock.
 */
export function GymConsolePhaseBar({
  trainingBlocks,
  activeBlockId,
  onSelectBlock,
  periodizationStyle = null,
  className,
}: GymConsolePhaseBarProps) {
  if (trainingBlocks.length === 0) return null

  return (
    <div className={cn(styles.wrap, className)}>
      <div className={ribbonCss.ribbonBar} data-testid="gym-console-phase-bar" role="tablist" aria-label="Training blocks">
        {trainingBlocks.map((block, blockIndex) => {
          const isActive = block.id === activeBlockId
          const displayName = formatPhaseDisplayName(block.name, block.phase_label, {
            periodizationStyle,
            blockOrder: block.block_order,
          })
          const color = ribbonBlockColor(blockIndex, trainingBlocks.length)
          const nextColor =
            blockIndex < trainingBlocks.length - 1
              ? ribbonBlockColor(blockIndex + 1, trainingBlocks.length)
              : null
          const flexGrow = Math.max(1, block.duration_weeks)

          return (
            <button
              key={block.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`gym-console-phase-block-${block.id}`}
              className={cn(ribbonCss.blockSegment, isActive && ribbonCss.blockSegmentActive)}
              style={{
                flexGrow,
                flexBasis: 0,
                background: color,
              }}
              onClick={() => onSelectBlock(block.id)}
            >
              <span className={ribbonCss.blockLabel}>{displayName}</span>
              {nextColor ? (
                <span
                  className={ribbonCss.blockSeam}
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, ${nextColor} 100%)`,
                  }}
                  aria-hidden
                />
              ) : null}
            </button>
          )
        })}
        <div className={ribbonCss.sheen} aria-hidden />
      </div>
    </div>
  )
}

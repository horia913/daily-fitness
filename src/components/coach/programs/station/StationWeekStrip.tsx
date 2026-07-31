'use client'

import React, { useState } from 'react'
import { Copy, MoreVertical, Plus } from 'lucide-react'
import type { TrainingBlock } from '@/types/trainingBlock'
import { computeBlockWeekRanges } from '@/lib/programs/stationBlockWeeks'
import css from '@/components/coach/programs/programEditV1.module.css'
import { cn } from '@/lib/utils'

const BLOCK_COLORS = [
  '#6EE7B7',
  '#7DD3FC',
  '#F0ABFC',
  '#FDE68A',
  '#FDBA74',
  '#A5B4FC',
] as const

interface StationWeekStripProps {
  trainingBlocks: TrainingBlock[]
  activeBlockId: string | null
  relativeWeek: number
  onSelectBlockWeek: (blockId: string, relativeWeek: number) => void
  onDuplicateWeek: (block: TrainingBlock, absoluteWeek: number) => void
  onAddWeek: (blockId: string) => void
  busy?: boolean
}

export function StationWeekStrip({
  trainingBlocks,
  activeBlockId,
  relativeWeek,
  onSelectBlockWeek,
  onDuplicateWeek,
  onAddWeek,
  busy,
}: StationWeekStripProps) {
  const ranges = computeBlockWeekRanges(trainingBlocks)
  const [menuWeek, setMenuWeek] = useState<{ blockId: string; rel: number } | null>(null)

  return (
    <section className={cn('space-y-2', css.wrap)} aria-label="Weeks" data-testid="week-strip">
      <h2
        className="text-sm font-bold text-[var(--pe-t1)]"
        style={{ fontFamily: 'var(--f-headline, Bricolage Grotesque, sans-serif)' }}
      >
        Weeks
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-1" data-testid="week-strip-blocks">
        {trainingBlocks.map((block, blockIndex) => {
          const range = ranges[blockIndex]
          if (!range) return null
          const color = BLOCK_COLORS[blockIndex % BLOCK_COLORS.length]
          const isActiveBlock = block.id === activeBlockId
          const weekCount = Math.max(1, block.duration_weeks)

          return (
            <div
              key={block.id}
              className="flex-shrink-0 flex flex-col gap-1.5"
              data-testid={`week-block-${block.id}`}
            >
              <p
                className="text-[9px] font-semibold uppercase tracking-wider truncate max-w-[240px]"
                style={{
                  color,
                  fontFamily: 'var(--f-mono, Geist Mono, monospace)',
                }}
              >
                {block.name} · Wks {range.startWeek}–{range.endWeek}
              </p>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: weekCount }, (_, i) => {
                  const rel = i + 1
                  const abs = range.startWeek + rel - 1
                  const isActive = isActiveBlock && rel === relativeWeek
                  return (
                    <div key={rel} className="relative flex-shrink-0">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        data-testid={`week-${block.id}-${rel}`}
                        onClick={() => onSelectBlockWeek(block.id, rel)}
                        className="rounded-lg px-3 py-2 text-left min-w-[68px] transition-colors"
                        style={{
                          background: isActive ? 'rgba(34, 211, 238, 0.12)' : 'var(--pe-card-2)',
                          border: `1px solid ${isActive ? 'var(--fc-accent)' : 'var(--pe-line)'}`,
                          boxShadow: isActive ? `inset 0 -2px 0 ${color}` : undefined,
                        }}
                      >
                        <span
                          className="block text-[10px] uppercase tracking-wider text-[var(--pe-t3)]"
                          style={{ fontFamily: 'var(--f-mono, Geist Mono, monospace)' }}
                        >
                          Wk {rel}
                        </span>
                        <span className="block text-[10px] text-[var(--pe-t4)] mt-0.5">
                          Abs {abs}
                        </span>
                      </button>
                      {isActive ? (
                        <button
                          type="button"
                          data-testid={`week-kebab-${block.id}-${rel}`}
                          onClick={() =>
                            setMenuWeek(
                              menuWeek?.blockId === block.id && menuWeek.rel === rel
                                ? null
                                : { blockId: block.id, rel },
                            )
                          }
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center bg-[var(--pe-card)] border border-[var(--pe-line)]"
                          aria-label="Week actions"
                        >
                          <MoreVertical className="w-2.5 h-2.5 text-[var(--pe-t3)]" />
                        </button>
                      ) : null}
                      {menuWeek?.blockId === block.id && menuWeek.rel === rel && isActive ? (
                        <div
                          className="absolute right-0 top-full mt-1 min-w-[140px] rounded-lg py-1 z-50 border border-[var(--pe-line)]"
                          style={{ background: 'var(--pe-card-2)' }}
                        >
                          <button
                            type="button"
                            disabled={busy}
                            data-testid="duplicate-week"
                            onClick={() => {
                              setMenuWeek(null)
                              onDuplicateWeek(block, abs)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--pe-t1)] hover:bg-white/[0.04] disabled:opacity-50"
                          >
                            <Copy className="w-3 h-3" />
                            Duplicate week
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAddWeek(block.id)}
                  data-testid={`add-week-${block.id}`}
                  className="inline-flex h-[52px] items-center gap-1 rounded-lg border border-dashed border-[var(--pe-line)] px-2.5 text-[10px] font-medium text-[var(--fc-accent)] hover:bg-[var(--fc-accent-dim)] disabled:opacity-50 flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add week
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

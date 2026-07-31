'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { TrainingBlockHeader } from '@/components/coach/programs/TrainingBlockHeader'
import type { TrainingBlock } from '@/types/trainingBlock'
import css from '@/components/coach/programs/programEditV1.module.css'

export interface BlockSpineProps {
  visible: boolean
  trainingBlocks: TrainingBlock[]
  activeBlockId: string | null
  onSelectBlock: (id: string) => void
  onAddBlock: () => void
  onEditBlock: (block: TrainingBlock) => void
  onDeleteBlock: (blockId: string) => void
  onUpdateBlock: (blockId: string, updates: Partial<TrainingBlock>) => void
  onMoveBlock: (blockId: string, direction: 'left' | 'right') => void
  onDuplicateBlock: (block: TrainingBlock) => void | Promise<void>
}

export function BlockSpine({
  visible,
  trainingBlocks,
  activeBlockId,
  onSelectBlock,
  onAddBlock,
  onEditBlock,
  onDeleteBlock,
  onUpdateBlock,
  onMoveBlock,
  onDuplicateBlock,
}: BlockSpineProps) {
  if (visible) {
    return (
      <section className={css.wrap} aria-label="Training phases" data-testid="block-spine">
        <TrainingBlockHeader
          trainingBlocks={trainingBlocks}
          activeBlockId={activeBlockId}
          onSelectBlock={onSelectBlock}
          onAddBlock={onAddBlock}
          onEditBlock={onEditBlock}
          onDeleteBlock={onDeleteBlock}
          onUpdateBlock={onUpdateBlock}
          onMoveBlock={onMoveBlock}
          onDuplicateBlock={onDuplicateBlock}
        />
      </section>
    )
  }

  return (
    <div className={`flex justify-end ${css.wrap}`}>
      <button
        type="button"
        onClick={onAddBlock}
        data-testid="add-block-collapsed"
        className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-medium text-[var(--fc-accent)] hover:bg-[var(--fc-accent-dim)] border border-transparent hover:border-[var(--fc-accent-glow)] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add phase
      </button>
    </div>
  )
}

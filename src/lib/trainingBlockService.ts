'use client'

import { supabase } from './supabase'
import { TrainingBlock } from '@/types/trainingBlock'

function sortBlocksProgramOrder(blocks: TrainingBlock[]): TrainingBlock[] {
  return [...blocks].sort((a, b) => {
    if (a.block_order !== b.block_order) return a.block_order - b.block_order
    const ac = a.created_at ? new Date(a.created_at).getTime() : 0
    const bc = b.created_at ? new Date(b.created_at).getTime() : 0
    return ac - bc
  })
}

export class TrainingBlockService {
  /**
   * Get all training blocks for a program, ordered by block_order ascending.
   */
  static async getTrainingBlocks(programId: string): Promise<TrainingBlock[]> {
    try {
      const { data, error } = await supabase
        .from('training_blocks')
        .select('*')
        .eq('program_id', programId)
        .order('block_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data as TrainingBlock[]) || []
    } catch (error) {
      console.error('[TrainingBlockService] Error fetching training blocks:', error)
      return []
    }
  }

  /**
   * Which training block covers this absolute program week (1-based).
   * Uses the same ordering as the DB: block_order, then created_at.
   */
  static getBlockForWeekFromBlocks(
    blocks: TrainingBlock[],
    weekNumber: number,
  ): TrainingBlock | null {
    const ordered = sortBlocksProgramOrder(blocks)
    let cumulativeWeeks = 0
    for (const block of ordered) {
      const span = Math.max(0, Number(block.duration_weeks) || 0)
      if (weekNumber > cumulativeWeeks && weekNumber <= cumulativeWeeks + span) {
        return block
      }
      cumulativeWeeks += span
    }
    return null
  }

  static async getBlockForWeek(
    programId: string,
    weekNumber: number,
  ): Promise<TrainingBlock | null> {
    const blocks = await this.getTrainingBlocks(programId)
    if (!blocks.length) return null
    return this.getBlockForWeekFromBlocks(blocks, weekNumber)
  }

  /**
   * Get a single training block by ID.
   */
  static async getTrainingBlock(blockId: string): Promise<TrainingBlock | null> {
    try {
      const { data, error } = await supabase
        .from('training_blocks')
        .select('*')
        .eq('id', blockId)
        .single()

      if (error) throw error
      return data as TrainingBlock
    } catch (error) {
      console.error('[TrainingBlockService] Error fetching training block:', error)
      return null
    }
  }

  /**
   * Create a new training block. `block_order` is always assigned by this service
   * (caller-supplied block_order is ignored).
   */
  static async createTrainingBlock(payload: {
    program_id: string
    name: string
    duration_weeks: number
    phase_label?: string | null
    notes?: string | null
    /** Ignored; service assigns the next block_order. */
    block_order?: number
  }): Promise<TrainingBlock> {
    const { data: existing, error: orderError } = await supabase
      .from('training_blocks')
      .select('block_order')
      .eq('program_id', payload.program_id)
      .order('block_order', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)

    if (orderError) throw orderError

    const nextOrder = (existing?.[0]?.block_order ?? 0) + 1

    const { data: block, error } = await supabase
      .from('training_blocks')
      .insert({
        program_id: payload.program_id,
        name: payload.name,
        duration_weeks: payload.duration_weeks,
        block_order: nextOrder,
        phase_label: payload.phase_label ?? null,
        notes: payload.notes ?? null,
      })
      .select('*')
      .single()

    if (error) throw error
    if (!block) throw new Error('createTrainingBlock: insert returned no row')

    return block as TrainingBlock
  }

  /**
   * Update an existing training block.
   */
  static async updateTrainingBlock(
    blockId: string,
    updates: Partial<Omit<TrainingBlock, 'id' | 'program_id' | 'created_at'>>,
  ): Promise<TrainingBlock> {
    const { data, error } = await supabase
      .from('training_blocks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', blockId)
      .select('*')
      .single()

    if (error) throw error
    if (!data) throw new Error('updateTrainingBlock: update returned no row')

    return data as TrainingBlock
  }

  /**
   * Delete a training block. DB trigger rejects deleting the last block.
   * Progression rules are removed by training_block_id (schedule rows no longer carry block id).
   */
  static async deleteTrainingBlock(blockId: string): Promise<void> {
    const { data: block, error: blockErr } = await supabase
      .from('training_blocks')
      .select('program_id, duration_weeks')
      .eq('id', blockId)
      .single()

    if (blockErr) throw blockErr
    if (!block) throw new Error('Phase not found')

    const { error: rulesErr } = await supabase
      .from('program_progression_rules')
      .delete()
      .eq('training_block_id', blockId)

    if (rulesErr) throw rulesErr

    const { error: delErr } = await supabase.from('training_blocks').delete().eq('id', blockId)

    if (delErr) throw delErr
  }

  /**
   * Reorder training blocks within a program.
   */
  static async reorderTrainingBlocks(
    programId: string,
    orderedBlockIds: string[],
  ): Promise<boolean> {
    try {
      const updates = orderedBlockIds.map((id, index) =>
        supabase
          .from('training_blocks')
          .update({ block_order: index + 1, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('program_id', programId),
      )

      const results = await Promise.all(updates)
      const firstError = results.find((r) => r.error)
      if (firstError?.error) throw firstError.error

      return true
    } catch (error) {
      console.error('[TrainingBlockService] Error reordering training blocks:', error)
      return false
    }
  }
}

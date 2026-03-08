'use client'

import { supabase } from './supabase'
import {
  TrainingBlock,
  TrainingBlockGoal,
  ProgressionProfile,
} from '@/types/trainingBlock'

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

      if (error) throw error
      return (data as TrainingBlock[]) || []
    } catch (error) {
      console.error('[TrainingBlockService] Error fetching training blocks:', error)
      return []
    }
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
   * Create a new training block.
   */
  static async createTrainingBlock(payload: {
    program_id: string
    name: string
    goal: TrainingBlockGoal
    custom_goal_label?: string
    duration_weeks: number
    block_order: number
    progression_profile?: ProgressionProfile
    notes?: string
  }): Promise<TrainingBlock | null> {
    try {
      const { data, error } = await supabase
        .from('training_blocks')
        .insert({
          program_id:          payload.program_id,
          name:                payload.name,
          goal:                payload.goal,
          custom_goal_label:   payload.custom_goal_label ?? null,
          duration_weeks:      payload.duration_weeks,
          block_order:         payload.block_order,
          progression_profile: payload.progression_profile ?? 'none',
          notes:               payload.notes ?? null,
        })
        .select('*')
        .single()

      if (error) throw error
      return data as TrainingBlock
    } catch (error) {
      console.error('[TrainingBlockService] Error creating training block:', error)
      return null
    }
  }

  /**
   * Update an existing training block.
   * Only the fields present in `updates` are changed.
   */
  static async updateTrainingBlock(
    blockId: string,
    updates: Partial<Omit<TrainingBlock, 'id' | 'program_id' | 'created_at'>>
  ): Promise<TrainingBlock | null> {
    try {
      const { data, error } = await supabase
        .from('training_blocks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', blockId)
        .select('*')
        .single()

      if (error) throw error
      return data as TrainingBlock
    } catch (error) {
      console.error('[TrainingBlockService] Error updating training block:', error)
      return null
    }
  }

  /**
   * Delete a training block.
   * The ON DELETE CASCADE FK ensures all associated program_schedule
   * and program_progression_rules rows are deleted automatically.
   */
  static async deleteTrainingBlock(blockId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('training_blocks')
        .delete()
        .eq('id', blockId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('[TrainingBlockService] Error deleting training block:', error)
      return false
    }
  }

  /**
   * Reorder training blocks within a program.
   * `orderedBlockIds` is the full ordered array of block IDs for the program,
   * from first (position 1) to last.
   */
  static async reorderTrainingBlocks(
    programId: string,
    orderedBlockIds: string[]
  ): Promise<boolean> {
    try {
      const updates = orderedBlockIds.map((id, index) =>
        supabase
          .from('training_blocks')
          .update({ block_order: index + 1, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('program_id', programId)
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

  /**
   * Backward-compatibility helper.
   * Returns the first (implicit) training block for a program.
   * If none exists yet (should not happen after migration), creates one.
   */
  static async getOrCreateImplicitBlock(
    programId: string,
    programName: string,
    durationWeeks: number
  ): Promise<TrainingBlock | null> {
    try {
      const { data: existing, error: selectError } = await supabase
        .from('training_blocks')
        .select('*')
        .eq('program_id', programId)
        .order('block_order', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (selectError) throw selectError
      if (existing) return existing as TrainingBlock

      // No block found — create the implicit one
      return await this.createTrainingBlock({
        program_id:    programId,
        name:          `${programName} - Phase 1`,
        goal:          'custom',
        duration_weeks: durationWeeks,
        block_order:   1,
        progression_profile: 'none',
      })
    } catch (error) {
      console.error('[TrainingBlockService] Error in getOrCreateImplicitBlock:', error)
      return null
    }
  }
}

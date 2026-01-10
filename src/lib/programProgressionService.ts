'use client'

import { supabase } from './supabase'
import { WorkoutBlockService } from './workoutBlockService'
import { WorkoutBlock, WorkoutBlockExercise } from '@/types/workoutBlocks'

export interface ProgramProgressionRule {
  id?: string
  program_id?: string
  program_schedule_id?: string
  week_number: number
  program_assignment_id?: string
  client_id?: string
  
  // Block information
  block_id?: string
  block_type: string
  block_order: number
  block_name?: string
  
  // Exercise information
  exercise_id: string
  exercise_order: number
  exercise_letter?: string
  exercise?: {
    id: string
    name: string
    description?: string | null
    video_url?: string | null
  }
  
  // Common fields
  sets?: number | null
  reps?: string | null
  rest_seconds?: number | null
  tempo?: string | null
  rir?: number | null
  weight_kg?: number | null
  load_percentage?: number | null
  notes?: string | null
  
  // Type-specific fields
  first_exercise_reps?: string | null
  second_exercise_reps?: string | null
  rest_between_pairs?: number | null
  exercise_reps?: string | null
  drop_set_reps?: string | null
  drop_percentage?: number | null
  reps_per_cluster?: number | null
  clusters_per_set?: number | null
  intra_cluster_rest?: number | null
  rest_pause_duration?: number | null
  max_rest_pauses?: number | null
  isolation_reps?: string | null
  compound_reps?: string | null
  compound_exercise_id?: string | null
  duration_minutes?: number | null
  emom_mode?: string | null
  target_reps?: number | null
  work_seconds?: number | null
  rounds?: number | null
  rest_after_set?: number | null
  time_cap_minutes?: number | null
  rest_after_exercise?: number | null
  pyramid_order?: number | null
  ladder_order?: number | null
  
  created_at?: string
  updated_at?: string
}

export class ProgramProgressionService {
  
  /**
   * REQUIREMENT 1: Copy workout template data to program_progression_rules
   * This creates a program-specific copy that can be edited independently
   */
  static async copyWorkoutToProgram(
    programId: string,
    programScheduleId: string,
    templateId: string,
    weekNumber: number = 1
  ): Promise<boolean> {
    try {
      console.log('[ProgressionCopy] START', {
        programId,
        programScheduleId,
        templateId,
        weekNumber,
        timestamp: new Date().toISOString(),
      })
      
      // 1. Get all blocks from workout template
      const blocks = await WorkoutBlockService.getWorkoutBlocks(templateId)
      console.log('[ProgressionCopy] Loaded template blocks', {
        templateId,
        blockCount: blocks?.length || 0,
        blockOrders: blocks?.map((b) => ({ id: b.id, order: b.block_order, type: b.block_type })) || [],
      })
      
      if (!blocks || blocks.length === 0) {
        console.log('⚠️ No blocks found for template:', templateId)
        return true // Not an error, just empty template
      }
      
      // 2. Convert blocks to progression rules
      const progressionRules: Omit<ProgramProgressionRule, 'id' | 'created_at' | 'updated_at'>[] = []
      
      for (const block of blocks) {
        const stopwatchStart = performance.now()
        const blockRules = await this.convertBlockToProgressionRules(
          programId,
          programScheduleId,
          weekNumber,
          block
        )
        progressionRules.push(...blockRules)
        console.log('[ProgressionCopy] Processed block', {
          templateId,
          blockId: block.id,
          blockType: block.block_type,
          blockOrder: block.block_order,
          exerciseCount: block.exercises?.length || 0,
          generatedRuleCount: blockRules.length,
          elapsedMs: (performance.now() - stopwatchStart).toFixed(2),
        })
      }
      
      if (progressionRules.length === 0) {
        console.log('⚠️ No progression rules generated')
        return true
      }
      
      console.log('[ProgressionCopy] Aggregated rules', {
        totalRuleCount: progressionRules.length,
        sample: progressionRules.slice(0, 5).map((rule) => ({
          blockId: rule.block_id,
          blockOrder: rule.block_order,
          exerciseId: rule.exercise_id,
          exerciseOrder: rule.exercise_order,
          blockType: rule.block_type,
        })),
      })

      // 3. Insert into program_progression_rules
      // Ensure we never include legacy fields like template_exercise_id
      // Also ensure reps fields are strings (can contain ranges like "12-15")
      // AND ensure integer fields are actually integers (not strings like "12-15")
      const sanitizedProgressionRules = progressionRules.map((rule: any) => {
        const { template_exercise_id, ...rest } = rule
        const sanitized: any = { ...rest }
        
        // Ensure INTEGER fields are actually integers (not strings or ranges)
        // These fields should only contain numbers
        const integerFields = ['sets', 'rest_seconds', 'rir', 'exercise_order', 'block_order', 'week_number', 
          'drop_percentage', 'reps_per_cluster', 'clusters_per_set', 'intra_cluster_rest',
          'rest_pause_duration', 'max_rest_pauses', 'duration_minutes', 'target_reps', 'work_seconds', 
          'rounds', 'rest_after_set', 'time_cap_minutes', 'rest_after_exercise', 'pyramid_order', 'ladder_order',
          'rest_between_pairs']
        
        for (const field of integerFields) {
          if (sanitized[field] !== undefined && sanitized[field] !== null) {
            // If it's already a number, keep it
            if (typeof sanitized[field] === 'number') {
              continue
            }
            // If it's a string that looks like a number, parse it
            const strValue = String(sanitized[field])
            // Handle ranges like "12-15" by taking first number
            const numValue = parseInt(strValue.split('-')[0], 10)
            if (!isNaN(numValue)) {
              sanitized[field] = numValue
            } else {
              // If it can't be parsed, remove it to avoid errors
              delete sanitized[field]
            }
          }
        }
        
        // Convert all TEXT reps fields to strings (preserving ranges like "12-15")
        // NOTE: These should be TEXT in database, but handle both TEXT and INTEGER cases
        const stringRepsFields = ['reps', 'first_exercise_reps', 'second_exercise_reps', 'exercise_reps', 'drop_set_reps', 'isolation_reps', 'compound_reps']
        for (const field of stringRepsFields) {
          if (sanitized[field] !== undefined && sanitized[field] !== null) {
            const value = sanitized[field]
            const strValue = String(value)
            // Check if it's a range like "12-15"
            if (strValue.includes('-') && /^\d+-\d+$/.test(strValue.trim())) {
              // It's a range - store as string for TEXT columns
              // If column is INTEGER, this will fail and we'll need to handle it differently
              sanitized[field] = strValue
            } else if (typeof value === 'string') {
              sanitized[field] = value
            } else if (typeof value === 'number') {
              sanitized[field] = String(value)
            } else {
              sanitized[field] = String(value)
            }
          }
        }
        
        return sanitized
      })

      // Log a sample rule to debug any type issues
      if (sanitizedProgressionRules.length > 0) {
        const sample = sanitizedProgressionRules[0]
        console.log('[ProgressionCopy] Sample rule before insert:', {
          exercise_id: sample.exercise_id,
          block_type: sample.block_type,
          reps: sample.reps,
          repsType: typeof sample.reps,
          sets: sample.sets,
          setsType: typeof sample.sets,
          exercise_order: sample.exercise_order,
          exerciseOrderType: typeof sample.exercise_order,
          rest_seconds: sample.rest_seconds,
          restSecondsType: typeof sample.rest_seconds,
          rest_between_pairs: sample.rest_between_pairs,
          restBetweenPairsType: typeof sample.rest_between_pairs,
        })
        
        // Final validation: ensure no integer field has a string rep range
        for (const rule of sanitizedProgressionRules) {
          const integerFields = ['sets', 'rest_seconds', 'rir', 'exercise_order', 'block_order', 'week_number', 
            'rest_between_pairs', 'drop_percentage', 'reps_per_cluster', 'clusters_per_set', 
            'intra_cluster_rest', 'rest_pause_duration', 'max_rest_pauses', 'duration_minutes', 'target_reps', 
            'work_seconds', 'rounds', 'rest_after_set', 'time_cap_minutes', 'rest_after_exercise', 
            'pyramid_order', 'ladder_order']
          
          for (const field of integerFields) {
            if (rule[field] !== undefined && rule[field] !== null) {
              const value = rule[field]
              // Check if it's a string that contains a dash (like "12-15")
              if (typeof value === 'string' && value.includes('-')) {
                console.warn(`[ProgressionCopy] WARNING: Integer field "${field}" has rep range value:`, value)
                // Parse to get first number
                const parsed = parseInt(value.split('-')[0], 10)
                if (!isNaN(parsed)) {
                  rule[field] = parsed
                  console.log(`[ProgressionCopy] Converted "${field}" from "${value}" to ${parsed}`)
                } else {
                  delete rule[field]
                }
              }
            }
          }
        }
      }
      
      console.log('[ProgressionCopy] Inserting rules', {
        insertCount: sanitizedProgressionRules.length,
        programId,
        programScheduleId,
      })
      let { data, error } = await supabase
        .from('program_progression_rules')
        .insert(sanitizedProgressionRules)
        .select()
      
      // If error is about integer column receiving "12-15", try parsing rep ranges
      if (error && error.code === '22P02' && error.message?.includes('"12-15"')) {
        console.log('[ProgressionCopy] Retrying with parsed rep ranges (database may have INTEGER reps column)')
        // Re-sanitize: if reps fields contain ranges, parse to first number for INTEGER columns
        const reSanitized = sanitizedProgressionRules.map((rule: any) => {
          const sanitized: any = { ...rule }
          // If reps is a range like "12-15", parse it to integer (first number)
          // This handles case where database column is INTEGER instead of TEXT
          if (sanitized.reps && typeof sanitized.reps === 'string' && sanitized.reps.includes('-')) {
            const parsed = parseInt(sanitized.reps.split('-')[0], 10)
            if (!isNaN(parsed)) {
              sanitized.reps = parsed
              console.log(`[ProgressionCopy] Parsed reps range "${rule.reps}" to integer ${parsed}`)
            }
          }
          // Same for other reps fields
          const repsFields = ['first_exercise_reps', 'second_exercise_reps', 'exercise_reps', 'drop_set_reps', 'isolation_reps', 'compound_reps']
          for (const field of repsFields) {
            if (sanitized[field] && typeof sanitized[field] === 'string' && sanitized[field].includes('-')) {
              const parsed = parseInt(sanitized[field].split('-')[0], 10)
              if (!isNaN(parsed)) {
                sanitized[field] = parsed
                console.log(`[ProgressionCopy] Parsed ${field} range "${rule[field]}" to integer ${parsed}`)
              }
            }
          }
          return sanitized
        })
        
        // Retry insert with parsed values
        const retryResult = await supabase
          .from('program_progression_rules')
          .insert(reSanitized)
          .select()
        
        if (retryResult.error) {
          console.error('❌ Error inserting progression rules (after retry):', retryResult.error)
          throw retryResult.error
        }
        
        data = retryResult.data
        error = null
      } else if (error) {
        console.error('❌ Error inserting progression rules:', error)
        throw error
      }

      console.log('[ProgressionCopy] INSERT COMPLETE', {
        insertedRowCount: data?.length || 0,
        programId,
        programScheduleId,
      })
      return true
    } catch (error) {
      console.error('❌ Error in copyWorkoutToProgram:', error)
      return false
    }
  }
  
  /**
   * Copy all program progression rules to a client-specific table when a program is assigned
   */
  static async copyProgramRulesToClient(
    programId: string,
    programAssignmentId: string,
    clientId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('program_progression_rules')
        .select('*')
        .eq('program_id', programId)

      if (error) throw error

      console.log('[ClientProgramCopy] Program has progression rules to copy', {
        programId,
        ruleCount: data?.length ?? 0,
      })

      if (!data || data.length === 0) {
        console.log('[ClientProgramCopy] No program progression rules to copy', {
          programId,
        })
        return true
      }

      const rowsToInsert = data.map((rule: any) => ({
        client_id: clientId,
        program_assignment_id: programAssignmentId,
        week_number: rule.week_number ?? 1,
        block_id: rule.block_id ?? null,
        block_type: rule.block_type ?? null,
        block_order: rule.block_order ?? null,
        exercise_id: rule.exercise_id ?? null,
        exercise_order: rule.exercise_order ?? null,
        exercise_letter: rule.exercise_letter ?? null,
        sets: rule.sets ?? null,
        reps:
          rule.reps !== undefined && rule.reps !== null
            ? String(rule.reps)
            : null,
        rest_seconds: rule.rest_seconds ?? null,
        tempo: rule.tempo ?? null,
        rir: rule.rir ?? null,
        second_exercise_id: rule.second_exercise_id ?? null,
        compound_exercise_id: rule.compound_exercise_id ?? null,
        first_exercise_reps: rule.first_exercise_reps ?? null,
        second_exercise_reps: rule.second_exercise_reps ?? null,
        isolation_reps: rule.isolation_reps ?? null,
        compound_reps: rule.compound_reps ?? null,
        rest_between_pairs: rule.rest_between_pairs ?? null,
        exercise_reps: rule.exercise_reps ?? null,
        drop_set_reps: rule.drop_set_reps ?? null,
        weight_reduction_percentage: rule.weight_reduction_percentage ?? null,
        reps_per_cluster: rule.reps_per_cluster ?? null,
        clusters_per_set: rule.clusters_per_set ?? null,
        intra_cluster_rest: rule.intra_cluster_rest ?? null,
        rest_pause_duration: rule.rest_pause_duration ?? null,
        max_rest_pauses: rule.max_rest_pauses ?? null,
        rounds: rule.rounds ?? null,
        work_seconds: rule.work_seconds ?? null,
        rest_after_exercise: rule.rest_after_exercise ?? null,
        rest_after_set: rule.rest_after_set ?? null,
        duration_minutes: rule.duration_minutes ?? null,
        emom_mode: rule.emom_mode ?? null,
        target_reps: rule.target_reps ?? null,
        time_cap_minutes: rule.time_cap_minutes ?? null,
        notes: rule.notes ?? null,
        weight_kg: rule.weight_kg ?? null,
        load_percentage: rule.load_percentage ?? null,
        pyramid_order: rule.pyramid_order ?? null,
        ladder_order: rule.ladder_order ?? null,
      }))

      const { error: insertError } = await supabase
        .from('client_program_progression_rules')
        .insert(rowsToInsert)

      if (insertError) throw insertError

      console.log('[ClientProgramCopy] Copied progression rules to client', {
        programId,
        programAssignmentId,
        clientId,
        ruleCount: rowsToInsert.length,
      })
      return true
    } catch (error) {
      console.error('❌ Error copying program progression rules to client:', error)
      return false
    }
  }

  /**
   * Delete client-specific progression rules for an assignment
   */
  static async deleteClientProgramProgressionRules(
    programAssignmentId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('client_program_progression_rules')
        .delete()
        .eq('program_assignment_id', programAssignmentId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('❌ Error deleting client program progression rules:', error)
      return false
    }
  }

  static async getClientProgressionRules(
    programAssignmentId: string
  ): Promise<ProgramProgressionRule[]> {
    try {
      const { data, error } = await supabase
        .from('client_program_progression_rules')
        .select('*')
        .eq('program_assignment_id', programAssignmentId)
        .order('week_number')
        .order('block_order')
        .order('exercise_order')

      if (error) throw error
      return (data || []) as ProgramProgressionRule[]
    } catch (error) {
      console.error('❌ Error fetching client progression rules:', error)
      return []
    }
  }

  /**
   * Convert a workout block to progression rules
   * Handles all different block types
   */
  private static async convertBlockToProgressionRules(
    programId: string,
    programScheduleId: string,
    weekNumber: number,
    block: WorkoutBlock
  ): Promise<Omit<ProgramProgressionRule, 'id' | 'created_at' | 'updated_at'>[]> {
    const rules: Omit<ProgramProgressionRule, 'id' | 'created_at' | 'updated_at'>[] = []
    
    if (!block.exercises || block.exercises.length === 0) {
      return rules
    }
    
    const blockLogPrefix = '[ProgressionCopy] convertBlockToProgressionRules'
    console.log(blockLogPrefix, 'START', {
      blockId: block.id,
      blockType: block.block_type,
      blockOrder: block.block_order,
      exerciseCount: block.exercises.length,
    })

    const baseRule = {
      program_id: programId,
      program_schedule_id: programScheduleId,
      week_number: weekNumber,
      block_id: block.id,
      block_type: block.block_type,
      block_order: block.block_order,
      block_name: block.block_name || undefined,
    }
    
    switch (block.block_type) {
      case 'straight_set':
        for (const exercise of block.exercises) {
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            sets: exercise.sets || undefined,
            reps: exercise.reps || undefined,
            rest_seconds: exercise.rest_seconds || block.rest_seconds || undefined,
            tempo: exercise.tempo || undefined,
            rir: exercise.rir || undefined,
            weight_kg: exercise.weight_kg || undefined,
            load_percentage: exercise.load_percentage || undefined,
            notes: exercise.notes || undefined,
          })
        }
        break
      
      case 'superset':
        // Two exercises with same exercise_letter
        for (const exercise of block.exercises) {
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            exercise_letter: exercise.exercise_letter || undefined,
            sets: exercise.sets || undefined,
            first_exercise_reps: exercise.exercise_letter === 'A' ? exercise.reps : undefined,
            second_exercise_reps: exercise.exercise_letter === 'B' ? exercise.reps : undefined,
            rest_between_pairs: block.rest_seconds || undefined,
            tempo: exercise.tempo || undefined,
            rir: exercise.rir || undefined,
            weight_kg: exercise.weight_kg || undefined,
            load_percentage: exercise.load_percentage || undefined,
            notes: exercise.notes || undefined,
          })
        }
        break
      
      case 'giant_set':
        // 3+ exercises with exercise_letter (A, B, C, D, etc.)
        // Sort by exercise_letter to ensure consistent order
        const sortedGiantExercises = [...(block.exercises || [])].sort((a, b) => {
          const letterA = a.exercise_letter || "A"
          const letterB = b.exercise_letter || "A"
          return letterA.localeCompare(letterB)
        })
        
        for (const exercise of sortedGiantExercises) {
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order || 1,
            exercise_letter: exercise.exercise_letter || undefined,
            sets: exercise.sets || block.total_sets || undefined,
            reps: exercise.reps || undefined,
            rest_between_pairs: block.rest_seconds || undefined,
            tempo: exercise.tempo || undefined,
            rir: exercise.rir || undefined,
            weight_kg: exercise.weight_kg || undefined,
            load_percentage: exercise.load_percentage || undefined,
            notes: exercise.notes || undefined,
          })
        }
        break
      
      case 'drop_set':
        for (const exercise of block.exercises) {
          // Check if there are drop sets defined
          const dropSets = exercise.drop_sets || []
          // Get initial weight/load from first drop set (drop_order = 1) or exercise
          const initialDropSet = dropSets.find((ds: any) => ds.drop_order === 1) || dropSets[0]
          // Get drop_percentage from first drop set
          const dropPercentage = (initialDropSet as any)?.drop_percentage || undefined
          
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            sets: exercise.sets || block.total_sets || undefined,
            // Main reps come from block.reps_per_set (initial/main set reps)
            exercise_reps: block.reps_per_set || exercise.reps || undefined,
            drop_set_reps: dropSets.length > 0 ? dropSets[0].reps : undefined,
            drop_percentage: dropPercentage || 20, // Use stored value or default
            rest_seconds: block.rest_seconds || exercise.rest_seconds || undefined,
            tempo: exercise.tempo || undefined,
            rir: exercise.rir || undefined,
            weight_kg: (initialDropSet as any)?.weight_kg || exercise.weight_kg || undefined,
            load_percentage: (initialDropSet as any)?.load_percentage || exercise.load_percentage || undefined,
            notes: exercise.notes || undefined,
          })
        }
        break
      
      case 'cluster_set':
        for (const exercise of block.exercises) {
          const clusterSets = exercise.cluster_sets || []
          const clusterConfig = clusterSets.length > 0 ? clusterSets[0] : null
          
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            sets: exercise.sets || undefined,
            reps_per_cluster: clusterConfig?.reps_per_cluster || undefined,
            clusters_per_set: clusterConfig?.clusters_per_set || undefined,
            intra_cluster_rest: clusterConfig?.intra_cluster_rest || undefined,
            rest_seconds: clusterConfig?.inter_set_rest || exercise.rest_seconds || undefined,
            tempo: exercise.tempo || undefined,
            rir: exercise.rir || undefined,
            weight_kg: (clusterConfig as any)?.weight_kg || exercise.weight_kg || undefined,
            load_percentage: (clusterConfig as any)?.load_percentage || exercise.load_percentage || undefined,
            notes: exercise.notes || undefined,
          })
        }
        break
      
      case 'rest_pause':
        for (const exercise of block.exercises) {
          const restPauseSets = exercise.rest_pause_sets || []
          const restPauseConfig = restPauseSets.length > 0 ? restPauseSets[0] : null
          
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            sets: exercise.sets || undefined,
            reps: exercise.reps || undefined,
            rest_pause_duration: restPauseConfig?.rest_pause_duration || undefined,
            max_rest_pauses: restPauseConfig?.max_rest_pauses || undefined,
            rest_seconds: exercise.rest_seconds || undefined,
            tempo: exercise.tempo || undefined,
            weight_kg: (restPauseConfig as any)?.weight_kg || exercise.weight_kg || undefined,
            load_percentage: (restPauseConfig as any)?.load_percentage || exercise.load_percentage || undefined,
            notes: exercise.notes || undefined,
          })
        }
        break
      
      case 'pre_exhaustion':
        // Two exercises: isolation (letter A) then compound (letter B)
        for (const exercise of block.exercises) {
          const isIsolation = exercise.exercise_letter === "A" || exercise.exercise_order === 1
          
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            exercise_letter: exercise.exercise_letter || (isIsolation ? "A" : "B"),
            sets: exercise.sets || undefined,
            // Isolation reps go into reps field for first exercise
            isolation_reps: isIsolation ? exercise.reps : undefined,
            // Compound reps go into reps field for second exercise
            compound_reps: !isIsolation ? exercise.reps : undefined,
            compound_exercise_id: !isIsolation ? exercise.exercise_id : undefined,
            rest_between_pairs: block.rest_seconds || undefined,
            tempo: exercise.tempo || undefined,
            rir: exercise.rir || undefined,
            // Both exercises use same columns, so copy them for each
            weight_kg: exercise.weight_kg || undefined,
            load_percentage: exercise.load_percentage || undefined,
            notes: exercise.notes || undefined,
          })
        }
        break
      
      case 'amrap':
        for (const exercise of block.exercises) {
          // Find time protocol for this specific exercise
          const amrapTimeProtocol = block.time_protocols?.find(
            (tp: any) => tp.protocol_type === 'amrap' && 
            tp.exercise_id === exercise.exercise_id && 
            tp.exercise_order === exercise.exercise_order
          ) || block.time_protocols?.find((tp: any) => tp.protocol_type === 'amrap')
          
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            duration_minutes: amrapTimeProtocol?.total_duration_minutes || block.duration_seconds ? Math.floor((block.duration_seconds || 0) / 60) : undefined,
            reps: exercise.reps || undefined,
            target_reps: amrapTimeProtocol?.target_reps || (exercise.reps ? (parseInt(String(exercise.reps), 10) || undefined) : undefined),
            tempo: exercise.tempo || undefined,
            weight_kg: (amrapTimeProtocol as any)?.weight_kg || exercise.weight_kg || undefined,
            load_percentage: (amrapTimeProtocol as any)?.load_percentage || exercise.load_percentage || undefined,
            notes: exercise.notes || undefined,
          })
        }
        break
      
      case 'emom':
        for (const exercise of block.exercises) {
          // Find time protocol for this specific exercise
          const emomTimeProtocol = block.time_protocols?.find(
            (tp: any) => tp.protocol_type === 'emom' && 
            tp.exercise_id === exercise.exercise_id && 
            tp.exercise_order === exercise.exercise_order
          ) || block.time_protocols?.find((tp: any) => tp.protocol_type === 'emom')
          
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            emom_mode: 'target_reps', // or 'target_time'
            duration_minutes: emomTimeProtocol?.total_duration_minutes || undefined,
            target_reps: exercise.reps ? (parseInt(String(exercise.reps), 10) || undefined) : undefined,
            work_seconds: emomTimeProtocol?.work_seconds || undefined,
            tempo: exercise.tempo || undefined,
            weight_kg: (emomTimeProtocol as any)?.weight_kg || exercise.weight_kg || undefined,
            load_percentage: (emomTimeProtocol as any)?.load_percentage || exercise.load_percentage || undefined,
            notes: exercise.notes || undefined,
          })
        }
        break
      
      case 'tabata':
        for (const exercise of block.exercises) {
          // Find time protocol for this specific exercise
          const tabataTimeProtocol = block.time_protocols?.find(
            (tp: any) => tp.protocol_type === 'tabata' && 
            tp.exercise_id === exercise.exercise_id && 
            tp.exercise_order === exercise.exercise_order
          ) || block.time_protocols?.find((tp: any) => tp.protocol_type === 'tabata')
          
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            work_seconds: tabataTimeProtocol?.work_seconds || 20,
            rest_seconds: tabataTimeProtocol?.rest_seconds || 10,
            rounds: tabataTimeProtocol?.rounds || 8,
            rest_after_set: block.rest_seconds || undefined,
            tempo: exercise.tempo || undefined,
            notes: exercise.notes || undefined,
          })
        }
        break
      
      case 'for_time':
        // For time-based blocks, exercises come from time_protocols if block.exercises is empty
        if (!block.exercises || block.exercises.length === 0) {
          // Fallback: create rules from time_protocols directly
          const forTimeProtocols = (block.time_protocols || []).filter((tp: any) => tp.protocol_type === 'for_time')
          for (const tp of forTimeProtocols) {
            rules.push({
              ...baseRule,
              exercise_id: tp.exercise_id,
              exercise_order: tp.exercise_order || 1,
              target_reps: tp.target_reps || undefined,
              time_cap_minutes: tp.time_cap_minutes || tp.total_duration_minutes || undefined,
              tempo: undefined, // Time protocols don't have tempo
              weight_kg: (tp as any)?.weight_kg || undefined,
              load_percentage: (tp as any)?.load_percentage || undefined,
              notes: undefined, // Time protocols don't have notes
            })
          }
        } else {
          // Normal path: exercises exist, match with time protocols
          for (const exercise of block.exercises) {
            // Find time protocol for this specific exercise
            const forTimeProtocol = block.time_protocols?.find(
              (tp: any) => tp.protocol_type === 'for_time' && 
              tp.exercise_id === exercise.exercise_id && 
              (tp.exercise_order === exercise.exercise_order || tp.exercise_order === exercise.exercise_order)
            ) || block.time_protocols?.find((tp: any) => tp.protocol_type === 'for_time')
            
            rules.push({
              ...baseRule,
              exercise_id: exercise.exercise_id,
              exercise_order: exercise.exercise_order,
              target_reps: forTimeProtocol?.target_reps || (exercise.reps ? (parseInt(String(exercise.reps), 10) || undefined) : undefined),
              time_cap_minutes: forTimeProtocol?.time_cap_minutes || forTimeProtocol?.total_duration_minutes || undefined,
              tempo: exercise.tempo || undefined,
              weight_kg: (forTimeProtocol as any)?.weight_kg || exercise.weight_kg || undefined,
              load_percentage: (forTimeProtocol as any)?.load_percentage || exercise.load_percentage || undefined,
              notes: exercise.notes || undefined,
            })
          }
        }
        break
      
      case 'pyramid_set':
        for (const exercise of block.exercises) {
          const pyramidSets = exercise.pyramid_sets || []
          
          if (pyramidSets.length > 0) {
            // Create a rule for each pyramid level
            pyramidSets.forEach((pyramidSet, index) => {
              rules.push({
                ...baseRule,
                exercise_id: exercise.exercise_id,
                exercise_order: exercise.exercise_order,
                pyramid_order: pyramidSet.pyramid_order || index + 1,
                sets: exercise.sets || undefined,
                reps: pyramidSet.reps || exercise.reps || undefined,
                weight_kg: pyramidSet.weight_kg || undefined,
                rest_seconds: pyramidSet.rest_seconds || exercise.rest_seconds || undefined,
                tempo: exercise.tempo || undefined,
                notes: exercise.notes || undefined,
              })
            })
          } else {
            // Fallback if no pyramid sets defined
            rules.push({
              ...baseRule,
              exercise_id: exercise.exercise_id,
              exercise_order: exercise.exercise_order,
              sets: exercise.sets || undefined,
              reps: exercise.reps || undefined,
              rest_seconds: exercise.rest_seconds || undefined,
              tempo: exercise.tempo || undefined,
              notes: exercise.notes || undefined,
            })
          }
        }
        break
      
      case 'ladder':
        for (const exercise of block.exercises) {
          const ladderSets = exercise.ladder_sets || []
          
          if (ladderSets.length > 0) {
            // Create a rule for each ladder level
            ladderSets.forEach((ladderSet, index) => {
              rules.push({
                ...baseRule,
                exercise_id: exercise.exercise_id,
                exercise_order: exercise.exercise_order,
                ladder_order: ladderSet.ladder_order || index + 1,
                reps: ladderSet.reps?.toString() || exercise.reps || undefined,
                weight_kg: ladderSet.weight_kg || undefined,
                rest_seconds: ladderSet.rest_seconds || exercise.rest_seconds || undefined,
                tempo: exercise.tempo || undefined,
                notes: exercise.notes || undefined,
              })
            })
          } else {
            // Fallback
            rules.push({
              ...baseRule,
              exercise_id: exercise.exercise_id,
              exercise_order: exercise.exercise_order,
              sets: exercise.sets || undefined,
              reps: exercise.reps || undefined,
              rest_seconds: exercise.rest_seconds || undefined,
              tempo: exercise.tempo || undefined,
              notes: exercise.notes || undefined,
            })
          }
        }
        break
      
      default:
        // Generic fallback for any unknown types
        for (const exercise of block.exercises) {
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            sets: exercise.sets || undefined,
            reps: exercise.reps || undefined,
            rest_seconds: exercise.rest_seconds || undefined,
            tempo: exercise.tempo || undefined,
            rir: exercise.rir || undefined,
            notes: exercise.notes || undefined,
          })
        }
    }
    console.log(blockLogPrefix, 'END', {
      blockId: block.id,
      blockType: block.block_type,
      blockOrder: block.block_order,
      generatedRuleCount: rules.length,
      sample: rules.slice(0, 2).map((r) => ({
        exerciseId: r.exercise_id,
        exerciseOrder: r.exercise_order,
        blockType: r.block_type,
      })),
    })
    
    return rules
  }
  
  /**
   * REQUIREMENT 2 & 6: Get progression rules for a program and week
   * Auto-populates from Week 1 if data doesn't exist
   */
  static async getProgressionRules(
    programId: string,
    weekNumber: number,
    programScheduleId?: string
  ): Promise<{ rules: ProgramProgressionRule[]; isPlaceholder: boolean }> {
    try {
      // Query for the specific week
      // Use explicit foreign key name to avoid ambiguity (there are two FKs to exercises)
      let query = supabase
        .from('program_progression_rules')
        .select(`
          *,
          exercise:exercises!program_progression_rules_exercise_id_fkey(id, name, description, video_url)
        `)
        .eq('program_id', programId)
        .eq('week_number', weekNumber)
        .order('block_order')
        .order('exercise_order')
      
      if (programScheduleId) {
        query = query.eq('program_schedule_id', programScheduleId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // If data exists for this week, return it
      if (data && data.length > 0) {
        return { rules: data as ProgramProgressionRule[], isPlaceholder: false }
      }
      
      // No data for this week - load Week 1 as placeholder
      if (weekNumber > 1) {
        const week1Query = supabase
          .from('program_progression_rules')
          .select(`
            *,
            exercise:exercises!program_progression_rules_exercise_id_fkey(id, name, description, video_url)
          `)
          .eq('program_id', programId)
          .eq('week_number', 1)
          .order('block_order')
          .order('exercise_order')
        
        if (programScheduleId) {
          week1Query.eq('program_schedule_id', programScheduleId)
        }
        
        const { data: week1Data, error: week1Error } = await week1Query
        
        if (week1Error) throw week1Error
        
        if (week1Data && week1Data.length > 0) {
          // Return Week 1 data as placeholders
          return { 
            rules: week1Data.map(rule => ({ ...rule, id: undefined })) as ProgramProgressionRule[], 
            isPlaceholder: true 
          }
        }
      }
      
      // No data at all
      return { rules: [], isPlaceholder: false }
    } catch (error) {
      console.error('Error getting progression rules:', error)
      return { rules: [], isPlaceholder: false }
    }
  }
  
  /**
   * REQUIREMENT 3: Update a progression rule
   */
  static async updateProgressionRule(
    ruleId: string,
    updates: Partial<ProgramProgressionRule>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('program_progression_rules')
        .update(updates)
        .eq('id', ruleId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating progression rule:', error)
      return false
    }
  }
  
  /**
   * Create new progression rule (used when editing placeholder from Week 1)
   */
  static async createProgressionRule(
    rule: Omit<ProgramProgressionRule, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ProgramProgressionRule | null> {
    try {
      const { data, error } = await supabase
        .from('program_progression_rules')
        .insert(rule)
        .select()
        .single()
      
      if (error) throw error
      return data as ProgramProgressionRule
    } catch (error) {
      console.error('Error creating progression rule:', error)
      return null
    }
  }
  
  /**
   * REQUIREMENT 4: Replace exercise in progression rule
   */
  static async replaceExercise(
    ruleId: string,
    newExerciseId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('program_progression_rules')
        .update({ exercise_id: newExerciseId })
        .eq('id', ruleId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error replacing exercise:', error)
      return false
    }
  }
  
  /**
   * REQUIREMENT 5: Replace entire workout for a program schedule
   */
  static async replaceWorkout(
    programId: string,
    programScheduleId: string,
    newTemplateId: string,
    weekNumber: number
  ): Promise<boolean> {
    try {
      // 1. Delete all existing rules for this schedule and week
      const { error: deleteError } = await supabase
        .from('program_progression_rules')
        .delete()
        .eq('program_schedule_id', programScheduleId)
        .eq('week_number', weekNumber)
      
      if (deleteError) throw deleteError
      
      // 2. Copy new workout template
      return await this.copyWorkoutToProgram(
        programId,
        programScheduleId,
        newTemplateId,
        weekNumber
      )
    } catch (error) {
      console.error('Error replacing workout:', error)
      return false
    }
  }
  
  /**
   * Delete all progression rules for a program schedule
   */
  static async deleteProgressionRules(
    programScheduleId: string,
    weekNumber?: number
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('program_progression_rules')
        .delete()
        .eq('program_schedule_id', programScheduleId)
      
      if (weekNumber !== undefined) {
        query = query.eq('week_number', weekNumber)
      }
      
      const { error } = await query
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting progression rules:', error)
      return false
    }
  }
}

export default ProgramProgressionService


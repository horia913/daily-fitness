'use client'

import { supabase } from './supabase'
import { WorkoutSetEntryService } from './workoutBlockService'
import { WorkoutSetEntry, WorkoutSetEntryExercise } from '@/types/workoutSetEntries'
/**
 * Coerce values for INTEGER DB columns. Column `rpe` stores prescribed RPE: parse the
 * full token (no `10 - rpe`, no reps-style "12-15" → first segment only).
 */
function coerceIntegerField(field: string, raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.round(raw)
  const s = String(raw).trim()
  if (s === '') return undefined
  if (field === 'rpe') {
    const n = Number(s.replace(/,/g, ''))
    return Number.isFinite(n) ? Math.round(n) : undefined
  }
  const head = s.split('-')[0]?.trim() ?? ''
  const numValue = parseInt(head, 10)
  return Number.isNaN(numValue) ? undefined : numValue
}

/** Map DB row → TS ProgramProgressionRule (column `rpe` = field `rpe`). */
function mapProgressionRuleFromDb(rule: any): ProgramProgressionRule {
  const { weight_reduction_percentage, ...rest } = rule
  return {
    ...rest,
    rpe: rest.rpe ?? null,
    drop_percentage: weight_reduction_percentage ?? rule.drop_percentage ?? null,
  } as ProgramProgressionRule
}

/**
 * Prepare rule for DB insert/update. Drops joined `exercise`; maps drop_percentage.
 */
function remapProgressionRuleForDb(rule: any): any {
  const { drop_percentage, exercise, ...rest } = rule
  const row: any = { ...rest }
  if (drop_percentage !== undefined && drop_percentage !== null) {
    row.weight_reduction_percentage = drop_percentage
  }
  return row
}

export interface ProgramProgressionRule {
  id?: string
  program_id?: string
  program_schedule_id?: string
  week_number: number
  program_assignment_id?: string
  client_id?: string
  
  // Set entry information
  set_entry_id?: string
  set_type: string
  set_order: number
  set_name?: string
  
  // Exercise information
  exercise_id: string
  /** Optional exercise swap target when matching protocol rows to a rule */
  override_exercise_id?: string | null
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
  /** Prescribed RPE (1–10). DB column `rpe`. */
  rpe?: number | null
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
  
  hr_zone?: number | null
  hr_percentage_min?: number | null
  hr_percentage_max?: number | null
  hr_duration_seconds?: number | null
  hr_work_duration_seconds?: number | null
  hr_rest_duration_seconds?: number | null
  hr_target_rounds?: number | null
  hr_distance_meters?: number | null

  /** Speed / endurance progression (matches DB jsonb on program_progression_rules) */
  speed_endurance_config?: Record<string, unknown> | null
  
  training_block_id?: string | null // Added in Phase 2

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
    weekNumber: number = 1,
    trainingBlockId?: string | null
  ): Promise<boolean> {
    try {
      // 1. Get all blocks from workout template
      const blocks = await WorkoutSetEntryService.getWorkoutBlocks(templateId)
      
      if (!blocks || blocks.length === 0) {
        return true // Not an error, just empty template
      }
      
      // 2. Convert blocks to progression rules
      const progressionRules: Omit<ProgramProgressionRule, 'id' | 'created_at' | 'updated_at'>[] = []
      
      for (const block of blocks) {
        const blockRules = await this.convertBlockToProgressionRules(
          programId,
          programScheduleId,
          weekNumber,
          block
        )
        progressionRules.push(...blockRules)
      }
      
      if (progressionRules.length === 0) {
        return true
      }

      if (trainingBlockId) {
        progressionRules.forEach((r: any) => { r.training_block_id = trainingBlockId })
      }

      // 3. Insert into program_progression_rules
      // Ensure we never include legacy fields like template_exercise_id
      // Also ensure reps fields are strings (can contain ranges like "12-15")
      // AND ensure integer fields are actually integers (not strings like "12-15")
      // Map drop_percentage to weight_reduction_percentage (database column name)
      const sanitizedProgressionRules = progressionRules.map((rule: any) => {
        const { template_exercise_id, id, created_at, updated_at, ...rest } = rule
        const sanitized: any = remapProgressionRuleForDb(rest)
        
        // Ensure INTEGER fields are actually integers (not strings or ranges)
        // These fields should only contain numbers
        const integerFields = ['sets', 'rest_seconds', 'rpe', 'exercise_order', 'set_order', 'week_number', 
          'weight_reduction_percentage', 'reps_per_cluster', 'clusters_per_set', 'intra_cluster_rest',
          'rest_pause_duration', 'max_rest_pauses', 'duration_minutes', 'target_reps', 'work_seconds', 
          'rounds', 'rest_after_set', 'time_cap_minutes', 'rest_after_exercise',
          'rest_between_pairs']
        
        for (const field of integerFields) {
          if (sanitized[field] !== undefined && sanitized[field] !== null) {
            if (typeof sanitized[field] === 'number' && Number.isFinite(sanitized[field] as number)) {
              continue
            }
            const coerced = coerceIntegerField(field, sanitized[field])
            if (coerced !== undefined) {
              sanitized[field] = coerced
            } else {
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

      // Final validation: ensure no integer field has a rep-range string (e.g. "12-15")
      for (const rule of sanitizedProgressionRules) {
        const integerFields = ['sets', 'rest_seconds', 'rpe', 'exercise_order', 'set_order', 'week_number',
          'rest_between_pairs', 'weight_reduction_percentage', 'reps_per_cluster', 'clusters_per_set',
          'intra_cluster_rest', 'rest_pause_duration', 'max_rest_pauses', 'duration_minutes', 'target_reps',
          'work_seconds', 'rounds', 'rest_after_set', 'time_cap_minutes', 'rest_after_exercise',
          ]
        for (const field of integerFields) {
          if (rule[field] !== undefined && rule[field] !== null) {
            const value = rule[field]
            if (typeof value === 'string') {
              const coerced = coerceIntegerField(field, value)
              if (coerced !== undefined) {
                rule[field] = coerced
              } else {
                delete rule[field]
              }
            }
          }
        }
      }
      let { data, error } = await supabase
        .from('program_progression_rules')
        .insert(sanitizedProgressionRules)
        .select()
      
      if (error && error.code === '22P02' && error.message?.includes('"12-15"')) {
        // Re-sanitize: if reps fields contain ranges, parse to first number for INTEGER columns
        const reSanitized = sanitizedProgressionRules.map((rule: any) => {
          const sanitized: any = { ...rule }
          // If reps is a range like "12-15", parse it to integer (first number)
          // This handles case where database column is INTEGER instead of TEXT
          if (sanitized.reps && typeof sanitized.reps === 'string' && sanitized.reps.includes('-')) {
            const parsed = parseInt(sanitized.reps.split('-')[0], 10)
            if (!isNaN(parsed)) {
              sanitized.reps = parsed
            }
          }
          // Same for other reps fields
          const repsFields = ['first_exercise_reps', 'second_exercise_reps', 'exercise_reps', 'drop_set_reps', 'isolation_reps', 'compound_reps']
          for (const field of repsFields) {
            if (sanitized[field] && typeof sanitized[field] === 'string' && sanitized[field].includes('-')) {
              const parsed = parseInt(sanitized[field].split('-')[0], 10)
              if (!isNaN(parsed)) {
                sanitized[field] = parsed
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
          console.error('Error inserting progression rules (retry):', retryResult.error)
          throw retryResult.error
        }
        
        data = retryResult.data
        error = null
      } else if (error) {
        console.error('Error inserting progression rules:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('❌ Error in copyWorkoutToProgram:', error)
      return false
    }
  }

  /**
   * Match rows from workout_drop_sets / workout_cluster_sets / workout_rest_pause_sets /
   * workout_time_protocols to a progression rule. Those tables always use the template's
   * exercise_id; the rule may list the template in exercise_id and the swap in
   * override_exercise_id, or (some flows) flip which column holds which — accept either.
   */
  private static specialTableRowMatchesProgressionRule(
    row: { exercise_id: string; exercise_order: number },
    rule: ProgramProgressionRule
  ): boolean {
    if (row.exercise_order !== rule.exercise_order) return false
    if (row.exercise_id === rule.exercise_id) return true
    const ov = rule.override_exercise_id
    if (ov != null && row.exercise_id === ov) return true
    return false
  }

  /** Overlay progression rule + speed_endurance_config onto template workout_speed_sets row. */
  private static mergeSpeedSetRowWithRule(row: any, rule: ProgramProgressionRule): any {
    const cfg =
      rule.speed_endurance_config && typeof rule.speed_endurance_config === 'object'
        ? (rule.speed_endurance_config as Record<string, unknown>)
        : {}
    const intervals =
      rule.sets != null && rule.sets !== undefined
        ? rule.sets
        : (cfg.intervals as number | undefined) ?? row?.intervals
    const rest =
      rule.rest_seconds != null && rule.rest_seconds !== undefined
        ? rule.rest_seconds
        : (cfg.rest_seconds as number | undefined) ?? row?.rest_seconds
    const cfgLoad = cfg.load_pct_bw ?? cfg.load_percent_bw
    const cfgTargetSp = cfg.target_speed_pct ?? cfg.max_speed_percent
    const cfgTargetHr = cfg.target_hr_pct ?? cfg.max_hr_percent
    return {
      ...row,
      intervals,
      rest_seconds: rest,
      distance_meters: (cfg.distance_meters as number | undefined) ?? row?.distance_meters,
      load_pct_bw:
        (cfgLoad as number | null | undefined) ??
        row?.load_pct_bw ??
        row?.load_percent_bw ??
        null,
      target_speed_pct:
        (cfgTargetSp as number | null | undefined) ??
        row?.target_speed_pct ??
        row?.max_speed_percent ??
        null,
      target_hr_pct:
        (cfgTargetHr as number | null | undefined) ??
        row?.target_hr_pct ??
        row?.max_hr_percent ??
        null,
      notes: rule.notes ?? (cfg.notes as string | undefined) ?? row?.notes ?? null,
    }
  }

  private static mergeEnduranceRowWithRule(row: any, rule: ProgramProgressionRule): any {
    const cfg =
      rule.speed_endurance_config && typeof rule.speed_endurance_config === 'object'
        ? (rule.speed_endurance_config as Record<string, unknown>)
        : {}
    return {
      ...row,
      target_distance_meters:
        (cfg.target_distance_meters as number | undefined) ?? row?.target_distance_meters,
      target_time_seconds:
        (cfg.target_time_seconds as number | null | undefined) ?? row?.target_time_seconds ?? null,
      target_pace_seconds_per_km:
        (cfg.target_pace_seconds_per_km as number | null | undefined) ??
        row?.target_pace_seconds_per_km ??
        null,
      hr_zone: (cfg.hr_zone as number | null | undefined) ?? row?.hr_zone ?? null,
      target_hr_pct:
        (cfg.target_hr_pct as number | null | undefined) ??
        (cfg.hr_percentage as number | null | undefined) ??
        row?.target_hr_pct ??
        row?.hr_percentage ??
        null,
      notes: rule.notes ?? (cfg.notes as string | undefined) ?? row?.notes ?? null,
    }
  }

  private static mergeHrRowWithRule(row: any, rule: ProgramProgressionRule): any {
    return {
      ...row,
      hr_zone: rule.hr_zone ?? row?.hr_zone,
      hr_percentage_min: rule.hr_percentage_min ?? row?.hr_percentage_min,
      hr_percentage_max: rule.hr_percentage_max ?? row?.hr_percentage_max,
      duration_seconds: rule.hr_duration_seconds ?? row?.duration_seconds,
      work_duration_seconds: rule.hr_work_duration_seconds ?? row?.work_duration_seconds,
      rest_duration_seconds: rule.hr_rest_duration_seconds ?? row?.rest_duration_seconds,
      target_rounds: rule.hr_target_rounds ?? row?.target_rounds,
      distance_meters: rule.hr_distance_meters ?? row?.distance_meters,
    }
  }

  private static syntheticSpeedSetFromRule(rule: ProgramProgressionRule): any {
    const cfg = (rule.speed_endurance_config || {}) as Record<string, unknown>
    return {
      id: `synthetic-speed-${rule.set_entry_id}-${rule.exercise_order}`,
      set_entry_id: rule.set_entry_id,
      exercise_id: rule.exercise_id,
      exercise_order: rule.exercise_order,
      intervals: rule.sets ?? (cfg.intervals as number | undefined) ?? 1,
      distance_meters: (cfg.distance_meters as number | undefined) ?? 0,
      load_pct_bw:
        (cfg.load_pct_bw as number | null | undefined) ??
        (cfg.load_percent_bw as number | null | undefined) ??
        null,
      target_speed_pct:
        (cfg.target_speed_pct as number | null | undefined) ??
        (cfg.max_speed_percent as number | null | undefined) ??
        null,
      target_hr_pct:
        (cfg.target_hr_pct as number | null | undefined) ??
        (cfg.max_hr_percent as number | null | undefined) ??
        null,
      rest_seconds: rule.rest_seconds ?? (cfg.rest_seconds as number | undefined) ?? 120,
      notes: rule.notes ?? (cfg.notes as string | undefined) ?? null,
    }
  }

  private static syntheticEnduranceSetFromRule(rule: ProgramProgressionRule): any {
    const cfg = (rule.speed_endurance_config || {}) as Record<string, unknown>
    return {
      id: `synthetic-endurance-${rule.set_entry_id}-${rule.exercise_order}`,
      set_entry_id: rule.set_entry_id,
      exercise_id: rule.exercise_id,
      exercise_order: rule.exercise_order,
      target_distance_meters: (cfg.target_distance_meters as number | undefined) ?? 0,
      target_time_seconds: (cfg.target_time_seconds as number | null | undefined) ?? null,
      target_pace_seconds_per_km: (cfg.target_pace_seconds_per_km as number | null | undefined) ?? null,
      hr_zone: (cfg.hr_zone as number | null | undefined) ?? null,
      target_hr_pct:
        (cfg.target_hr_pct as number | null | undefined) ??
        (cfg.hr_percentage as number | null | undefined) ??
        null,
      notes: rule.notes ?? (cfg.notes as string | undefined) ?? null,
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
    block: WorkoutSetEntry
  ): Promise<Omit<ProgramProgressionRule, 'id' | 'created_at' | 'updated_at'>[]> {
    const rules: Omit<ProgramProgressionRule, 'id' | 'created_at' | 'updated_at'>[] = []
    
    if (!block.exercises || block.exercises.length === 0) {
      return rules
    }
    
    const baseRule = {
      program_id: programId,
      program_schedule_id: programScheduleId,
      week_number: weekNumber,
      set_entry_id: block.id,
      set_type: block.set_type,
      set_order: block.set_order,
      set_name: block.set_name || undefined,
    }
    
    switch (block.set_type) {
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
            rpe: exercise.rpe || undefined,
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
            rpe: exercise.rpe || undefined,
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
            rpe: exercise.rpe || undefined,
            weight_kg: exercise.weight_kg || undefined,
            load_percentage: exercise.load_percentage || undefined,
            notes: exercise.notes || undefined,
          })
        }
        break
      
      case 'drop_set':
        for (const exercise of block.exercises) {
          const dropSets = exercise.drop_sets || []
          const dropSet = dropSets[0]
          const initialDropSet = dropSets.find((ds: any) => ds.drop_order === 1) || dropSets[0]
          
          let dropPercentage = undefined
          if (dropSet) {
            dropPercentage = (dropSet as any)?.drop_percentage
          }
          if (dropPercentage === undefined || dropPercentage === null) {
            for (const ds of dropSets) {
              const dsDropPercentage = (ds as any)?.drop_percentage
              if (dsDropPercentage !== undefined && dsDropPercentage !== null) {
                dropPercentage = dsDropPercentage
                break
              }
            }
          }
          
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            sets: exercise.sets || block.total_sets || undefined,
            // Main reps come from block.reps_per_set (initial/main set reps)
            exercise_reps: block.reps_per_set || exercise.reps || undefined,
            drop_set_reps: dropSets.length > 0 ? dropSets[0].reps : undefined,
            drop_percentage: dropPercentage || 20, // Use stored value or default (will be mapped to weight_reduction_percentage)
            rest_seconds: block.rest_seconds || exercise.rest_seconds || undefined,
            tempo: exercise.tempo || undefined,
            rpe: exercise.rpe || undefined,
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
            rpe: exercise.rpe || undefined,
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
            rpe: exercise.rpe || undefined,
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

      case 'speed_work':
        for (const exercise of block.exercises) {
          const sp = (exercise as any).speed_sets?.[0]
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            sets: sp?.intervals ?? block.total_sets ?? undefined,
            rest_seconds: sp?.rest_seconds ?? block.rest_seconds ?? undefined,
            speed_endurance_config: {
              kind: 'speed_work',
              progression_order: ['intervals', 'intensity', 'distance', 'rest', 'load'],
              progression_stage: 0,
              intervals: sp?.intervals,
              distance_meters: sp?.distance_meters ?? null,
              load_pct_bw: sp?.load_pct_bw ?? (sp as any)?.load_percent_bw ?? null,
              target_speed_pct: sp?.target_speed_pct ?? (sp as any)?.max_speed_percent ?? null,
              target_hr_pct: sp?.target_hr_pct ?? (sp as any)?.max_hr_percent ?? null,
              rest_seconds: sp?.rest_seconds ?? block.rest_seconds ?? null,
              increment_intervals: 1,
              min_intervals: 1,
              max_intervals: 20,
              increment_speed_percent: 2,
              increment_distance_meters: 5,
              decrement_rest_seconds: 10,
              min_rest_seconds: 60,
              increment_load_bw: 2,
              max_load_bw: 40,
              frequency: 'weekly',
            },
            notes: sp?.notes || exercise.notes || undefined,
          })
        }
        break

      case 'endurance':
        for (const exercise of block.exercises) {
          const en = (exercise as any).endurance_sets?.[0]
          rules.push({
            ...baseRule,
            exercise_id: exercise.exercise_id,
            exercise_order: exercise.exercise_order,
            sets: 1,
            speed_endurance_config: {
              kind: 'endurance',
              progression_order: ['distance', 'pace', 'time'],
              progression_stage: 0,
              target_distance_meters: en?.target_distance_meters ?? null,
              target_time_seconds: en?.target_time_seconds ?? null,
              target_pace_seconds_per_km: en?.target_pace_seconds_per_km ?? null,
              hr_zone: en?.hr_zone ?? null,
              target_hr_pct: en?.target_hr_pct ?? (en as any)?.hr_percentage ?? null,
              increment_distance_percent: 10,
              decrement_pace_seconds_per_week: 5,
              increment_time_seconds_per_week: 30,
              frequency: 'weekly',
            },
            notes: en?.notes || exercise.notes || undefined,
          })
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
            rpe: exercise.rpe || undefined,
            notes: exercise.notes || undefined,
          })
        }
    }
    return rules
  }
  
  /**
   * REQUIREMENT 2 & 6: Get progression rules for a program and week
   * Auto-populates from Week 1 if data doesn't exist
   */
  /**
   * @param trainingBlockId Logical block for this week — derive from
   * training_blocks + week_number in the UI; do not use program_schedule.training_block_id.
   */
  static async getProgressionRules(
    programId: string,
    weekNumber: number,
    programScheduleId?: string,
    trainingBlockId?: string // Added in Phase 2: optional filter by training block
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
        .order('set_order')
        .order('exercise_order')
      
      if (programScheduleId) {
        query = query.eq('program_schedule_id', programScheduleId)
      }

      if (trainingBlockId) {
        query = query.or(`training_block_id.eq.${trainingBlockId},training_block_id.is.null`)
      }
      
      const { data, error } = await query

      if (error) throw error
      
      // If data exists for this week, return it
      if (data && data.length > 0) {
        const mappedRules = data.map((rule: any) => mapProgressionRuleFromDb(rule))
        return { rules: mappedRules, isPlaceholder: false }
      }
      
      // No data for this week - load Week 1 as placeholder
      if (weekNumber > 1) {
        let week1Query = supabase
          .from('program_progression_rules')
          .select(`
            *,
            exercise:exercises!program_progression_rules_exercise_id_fkey(id, name, description, video_url)
          `)
          .eq('program_id', programId)
          .eq('week_number', 1)
          .order('set_order')
          .order('exercise_order')
        
        // When a trainingBlockId is known each week has its own distinct program_schedule_id.
        // Filtering the Week-1 fallback by the *current* week's schedule ID would always
        // return empty (Week-1 rows carry Week-1's schedule ID, not Week-N's).
        // Use trainingBlockId alone to scope to the right block; omit schedule ID filter.
        if (trainingBlockId) {
          week1Query = week1Query.or(`training_block_id.eq.${trainingBlockId},training_block_id.is.null`)
        } else if (programScheduleId) {
          // Legacy path: single schedule ID shared across all weeks (pre-training-blocks).
          week1Query = week1Query.eq('program_schedule_id', programScheduleId)
        }
        
        const { data: week1Data, error: week1Error } = await week1Query
        
        if (week1Error) throw week1Error
        
        if (week1Data && week1Data.length > 0) {
          const mappedWeek1Rules = week1Data.map((rule: any) => ({
            ...mapProgressionRuleFromDb(rule),
            id: undefined,
          }))
          return { 
            rules: mappedWeek1Rules, 
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
      const { id: _id, created_at: _c, updated_at: _u, exercise: _e, ...rest } =
        updates as any
      const dbUpdates = remapProgressionRuleForDb(rest)
      const { error } = await supabase
        .from('program_progression_rules')
        .update(dbUpdates)
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
      const row = remapProgressionRuleForDb(rule)
      const { data, error } = await supabase
        .from('program_progression_rules')
        .insert(row)
        .select()
        .single()
      
      if (error) throw error
      return mapProgressionRuleFromDb(data)
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

  /**
   * Delete all progression rules for a training block from a given week onwards.
   * Used when applying generated progression (clear Weeks 2+ before bulk insert).
   * @deprecated Prefer deleteProgressionRulesForSchedules which is scope-correct and
   *   also removes rules whose training_block_id is NULL (auto-filled template copies).
   */
  static async deleteProgressionRulesForBlockWeeks(
    trainingBlockId: string,
    fromWeek: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('program_progression_rules')
        .delete()
        .eq('training_block_id', trainingBlockId)
        .gte('week_number', fromWeek)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting progression rules for block weeks:', error)
      return false
    }
  }

  /**
   * Delete all progression rules for a set of program_schedule IDs.
   * This is the correct way to clear weeks before a bulk progression insert because:
   *  - It is scoped to the specific training day (program_schedule_id is day-specific).
   *  - It removes ALL rules for those weeks regardless of training_block_id value,
   *    including rules where training_block_id IS NULL (auto-filled template copies).
   */
  static async deleteProgressionRulesForSchedules(
    scheduleIds: string[]
  ): Promise<boolean> {
    if (!scheduleIds.length) return true
    try {
      const { error } = await supabase
        .from('program_progression_rules')
        .delete()
        .in('program_schedule_id', scheduleIds)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting progression rules for schedules:', error)
      return false
    }
  }

  /**
   * Bulk insert progression rules (e.g. generated for Weeks 2+).
   * Sanitizes rules for DB (drops joined fields, maps drop_percentage) and inserts in chunks.
   */
  static async bulkCreateProgressionRules(
    rules: Omit<ProgramProgressionRule, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<boolean> {
    if (!rules.length) return true
    try {
      const integerFields = [
        'sets', 'rest_seconds', 'rpe', 'exercise_order', 'set_order', 'week_number',
        'weight_reduction_percentage', 'reps_per_cluster', 'clusters_per_set', 'intra_cluster_rest',
        'rest_pause_duration', 'max_rest_pauses', 'duration_minutes', 'target_reps', 'work_seconds',
        'rounds', 'rest_after_set', 'time_cap_minutes', 'rest_after_exercise',
        'rest_between_pairs'
      ]
      const stringRepsFields = ['reps', 'first_exercise_reps', 'second_exercise_reps', 'exercise_reps', 'drop_set_reps', 'isolation_reps', 'compound_reps']
      const CHUNK_SIZE = 50

      const sanitized = rules.map((rule: any) => {
        const { id, created_at, updated_at, ...rest } = rule
        const row: any = remapProgressionRuleForDb(rest)
        for (const field of integerFields) {
          if (row[field] !== undefined && row[field] !== null) {
            if (typeof row[field] !== 'number') {
              const coerced = coerceIntegerField(field, row[field])
              if (coerced !== undefined) {
                row[field] = coerced
              } else {
                delete row[field]
              }
            }
          }
        }
        for (const field of stringRepsFields) {
          if (row[field] !== undefined && row[field] !== null) {
            row[field] = String(row[field])
          }
        }
        return row
      })

      for (let i = 0; i < sanitized.length; i += CHUNK_SIZE) {
        const chunk = sanitized.slice(i, i + CHUNK_SIZE)
        const { data, error } = await supabase
          .from('program_progression_rules')
          .insert(chunk)
        if (error) throw error
      }
      return true
    } catch (error) {
      console.error('Error bulk creating progression rules:', error)
      return false
    }
  }
}

export default ProgramProgressionService


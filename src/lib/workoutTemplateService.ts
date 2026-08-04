'use client'

import { supabase } from './supabase'
import { ProgramProgressionService } from './programProgressionService'
import { WorkoutBlockService } from './workoutBlockService'

// Enhanced interfaces for the new architecture
export interface WorkoutTemplate {
  id: string
  name: string
  description?: string
  coach_id: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'athlete'
  estimated_duration: number
  category?: string
  kind?: 'library' | 'program_day' | 'client_day'
  source_workout_id?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  exercises?: TemplateExercise[]
  usage_count?: number
  rating?: number
  exercise_count?: number
}

export interface TemplateExercise {
  id: string
  template_id: string
  exercise_id: string
  order_index: number
  notes?: string
  created_at: string
  updated_at: string
  exercise?: Exercise
}

export interface Exercise {
  id: string
  name: string
  description?: string
  instructions?: string
  tips?: string
  category?: string
  created_at: string
  updated_at: string
  alternatives?: ExerciseAlternative[]
}

export interface ExerciseCategory {
  id: string
  name: string
  description?: string
  icon?: string
  color: string
  created_at: string
}

export interface ExerciseAlternative {
  id: string
  primary_exercise_id: string
  alternative_exercise_id: string
  reason: 'equipment' | 'difficulty' | 'injury' | 'preference'
  notes?: string
  created_at: string
  alternative_exercise?: Exercise
}

export interface Program {
  id: string
  name: string
  description?: string
  coach_id: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'athlete'
  /** Derived client-side from SUM(training_blocks.duration_weeks) — not a DB column. */
  duration_weeks?: number
  target_audience?: string | null
  /** Legacy — dropped from workout_programs; stripped on write. */
  category?: string | null
  /** FLIP 3 — fixed (periodized) vs recurring (single repeating week). */
  type?: 'fixed' | 'recurring'
  /** Display-only periodization preset. */
  periodization_style?: string | null
  is_public?: boolean // Optional - not in database schema
  is_active: boolean
  created_at: string
  updated_at: string
  schedule?: ProgramSchedule[]
  training_blocks?: import('@/types/trainingBlock').TrainingBlock[] // Added in Phase 2
}

export interface ProgramSchedule {
  id: string
  program_id: string
  program_day: number // 1-7 (Day 1, Day 2, ..., Day 7) - Interface uses program_day, DB uses day_of_week
  week_number: number // Week number in the program
  template_id: string
  training_block_id?: string | null // Added in Phase 2
  /** Populated when schedule is enriched with `training_blocks` (e.g. client program details). */
  training_block?: import('@/types/trainingBlock').TrainingBlock | null
  // Note: is_optional, is_active, notes are NOT in database schema (mapped/optional fields)
  is_optional?: boolean // Optional field (not in DB schema, defaults to false)
  is_active?: boolean // Optional field (not in DB schema, defaults to true)
  notes?: string // Optional field (not in DB schema)
  template_name?: string // Computed/joined from workout_templates
  template_description?: string // Computed/joined from workout_templates
  estimated_duration?: number | null // Computed/joined from workout_templates
  created_at: string
  updated_at: string
  template?: WorkoutTemplate
}

// ===== PROGRAM ASSIGNMENTS =====
export interface ProgramAssignment {
  id: string
  program_id: string
  client_id: string
  coach_id?: string
  current_day_number?: number // Current day in the program (default: 1)
  completed_days?: number // Number of days completed (default: 0)
  total_days: number
  start_date: string
  preferred_workout_days?: number[] // Array of preferred workout days
  status?: string // Assignment status (default: 'active')
  is_customized?: boolean // Whether assignment is customized (default: false)
  notes?: string // Optional notes
  name?: string // Optional assignment name
  description?: string // Optional assignment description
  duration_weeks?: number // Program duration in weeks
  created_at?: string
  updated_at?: string
}

export interface ProgramDayAssignment {
  id: string
  program_assignment_id: string
  program_day_id: string | null
  day_number: number | null
  day_type: string | null
  workout_assignment_id: string | null
  name: string | null
  description: string | null
  estimated_duration: number | null
  target_muscles: string[] | null
  intensity_level: string | null
  rest_focus: string | null
  recommended_activities: string[] | null
  is_completed: boolean | null
  completed_date: string | null
  notes: string | null
  is_customized: boolean | null
  created_at: string
  updated_at: string
  program_day: number | null
  workout_template_id: string | null
  week_number?: number | null
}

/** Result of bulk program assignment (Fix 1 — snapshot + assignment must both succeed). */
export interface AssignProgramToClientsResult {
  successful: Array<{ clientId: string; assignmentId: string }>
  failed: Array<{
    clientId: string
    stage: 'assignment' | 'snapshot' | 'cleanup'
    error: string
    orphanedAssignmentId?: string
  }>
}

export interface DailyWorkout {
  hasWorkout: boolean
  templateId?: string
  scheduleId?: string
  templateName?: string
  templateDescription?: string
  weekNumber?: number
  programDay?: number // Day 1-7 instead of dayOfWeek
  estimatedDuration?: number
  difficultyLevel?: string
  exercises?: DailyWorkoutExercise[]
  exerciseCount?: number
  totalSets?: number
  generatedAt?: string
  message?: string
  weekCompleted?: boolean
  currentWeek?: number
}

// New interfaces for flexible program system
export interface ProgramAssignmentProgress {
  id: string
  assignment_id: string
  client_id: string
  program_id: string
  current_week: number
  current_day: number // Day 1-7
  days_completed_this_week: number
  cycle_start_date: string
  last_workout_date?: string
  total_weeks_completed: number
  is_program_completed: boolean
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface CompletedProgram {
  id: string
  client_id: string
  program_id: string
  assignment_id: string
  program_name: string
  program_description?: string
  total_weeks: number
  difficulty_level: string
  coach_name: string
  started_date: string
  completed_date: string
  total_workouts_completed: number
  completion_percentage: number
  created_at: string
  updated_at: string
}

export interface WorkoutCompletion {
  id: string
  assignment_progress_id: string
  client_id: string
  program_id: string
  week_number: number
  program_day: number
  template_id: string
  workout_date: string
  completed_at: string
  duration_minutes?: number
  notes?: string
  created_at: string
}

export interface DailyWorkoutExercise {
  id: string
  exerciseId: string
  name: string
  description?: string
  instructions?: string
  orderIndex: number
  notes?: string
  sets: number
  reps: string
  weightGuidance?: string
  restSeconds: number
  rpeTarget?: number
  progressionNotes?: string
}

export class WorkoutTemplateService {
  
  // ===== WORKOUT TEMPLATE MANAGEMENT =====
  
  static async getWorkoutTemplates(coachId: string, options?: { skipExerciseCount?: boolean }): Promise<WorkoutTemplate[]> {
    try {
      const { ensureAuthenticated } = await import('./supabase');
      await ensureAuthenticated();

      if (process.env.NODE_ENV !== 'production') console.time('[getWorkoutTemplates] workout_templates')
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .eq('kind', 'library')
        .order('created_at', { ascending: false })
      if (process.env.NODE_ENV !== 'production') {
        console.timeEnd('[getWorkoutTemplates] workout_templates')
        console.log('[getWorkoutTemplates] workout_templates rows=', (data || []).length)
      }
      if (error) throw error
      const templates = data || []

      if (templates.length === 0) {
        return []
      }

      const skipCount = options?.skipExerciseCount === true
      if (skipCount) {
        if (process.env.NODE_ENV !== 'production') console.log('[getWorkoutTemplates] skipExerciseCount=true, skipping blocks metadata and count queries')
        return templates.map((t: any) => ({ ...t, exercise_count: 0 }))
      }

      const templateIds = templates.map((t: any) => t.id)
      if (process.env.NODE_ENV !== 'production') console.time('[getWorkoutTemplates] workout_set_entries metadata')
      const { data: blocks, error: blocksError } = await supabase
        .from('workout_set_entries')
        .select('id, template_id, set_type')
        .in('template_id', templateIds)
      if (process.env.NODE_ENV !== 'production') {
        console.timeEnd('[getWorkoutTemplates] workout_set_entries metadata')
        console.log('[getWorkoutTemplates] workout_set_entries metadata rows=', (blocks || []).length)
      }
      if (blocksError) {
        console.warn('Unable to load blocks for exercise counting:', blocksError.message)
      }

      // Group set entries by template_id and set_type
      const blocksByTemplate = new Map<string, any[]>()
      const blockIdsByType = {
        usesBlockExercises: [] as string[],
        usesDropSets: [] as string[],
        usesClusterSets: [] as string[],
        usesRestPause: [] as string[],
        usesTimeProtocols: [] as string[],
      }

      ;(blocks || []).forEach((block: any) => {
        const templateId = block.template_id
        if (!blocksByTemplate.has(templateId)) {
          blocksByTemplate.set(templateId, [])
        }
        blocksByTemplate.get(templateId)!.push(block)

        const blockType = block.set_type
        // Categorize set entries by which table they use for exercises
        if (
          [
            'straight_set',
            'superset',
            'giant_set',
            'pre_exhaustion',
            'speed_work',
            'endurance',
          ].includes(blockType)
        ) {
          blockIdsByType.usesBlockExercises.push(block.id)
        } else if (blockType === 'drop_set') {
          blockIdsByType.usesDropSets.push(block.id)
        } else if (blockType === 'cluster_set') {
          blockIdsByType.usesClusterSets.push(block.id)
        } else if (blockType === 'rest_pause') {
          blockIdsByType.usesRestPause.push(block.id)
        } else if (['amrap', 'emom', 'for_time', 'tabata'].includes(blockType)) {
          blockIdsByType.usesTimeProtocols.push(block.id)
        }
      })

      // Count exercises from each table with timeout protection
      const counts: Record<string, number> = {}
      
      // Build a map of set_entry_id -> template_id to avoid JOINs
      const blockToTemplate = new Map<string, string>()
      ;(blocks || []).forEach((block: any) => {
        blockToTemplate.set(block.id, block.template_id)
      })
      
      // Helper for timeout-protected queries (NO JOINs - much faster)
      const safeQueryForCount = async <T>(
        queryBuilder: PromiseLike<{ data: T | null; error: any }>,
        timeoutMs: number = 8000
      ): Promise<T | null> => {
        try {
          const result = await Promise.race([
            queryBuilder,
            new Promise<{ data: null; error: { message: string } }>((resolve) =>
              setTimeout(() => resolve({ data: null, error: { message: 'Query timeout' } }), timeoutMs)
            )
          ]);
          if (result.error) {
            console.warn('[WorkoutTemplateService] Query error:', result.error.message);
            return null;
          }
          return result.data;
        } catch (error) {
          console.warn('[WorkoutTemplateService] Query failed:', error);
          return null;
        }
      };
      
      // Count from workout_set_entry_exercises (for straight_set, superset, giant_set, pre_exhaustion)
      if (blockIdsByType.usesBlockExercises.length > 0) {
        if (process.env.NODE_ENV !== 'production') console.time('[getWorkoutTemplates] count workout_set_entry_exercises')
        const exerciseRows = await safeQueryForCount<any[]>(
          supabase
            .from('workout_set_entry_exercises')
            .select('id, set_entry_id')
            .in('set_entry_id', blockIdsByType.usesBlockExercises)
        )
        if (process.env.NODE_ENV !== 'production') {
          console.timeEnd('[getWorkoutTemplates] count workout_set_entry_exercises')
          console.log('[getWorkoutTemplates] count workout_set_entry_exercises rows=', exerciseRows?.length ?? 0)
        }
        if (exerciseRows) {
          exerciseRows.forEach((row: any) => {
            const templateId = blockToTemplate.get(row.set_entry_id)
            if (templateId) {
              counts[templateId] = (counts[templateId] || 0) + 1
            }
          })
        }
      }

      // Count from workout_drop_sets (for drop_set) - count unique exercises per set entry
      if (blockIdsByType.usesDropSets.length > 0) {
        if (process.env.NODE_ENV !== 'production') console.time('[getWorkoutTemplates] count workout_drop_sets')
        const dropSets = await safeQueryForCount<any[]>(
          supabase
            .from('workout_drop_sets')
            .select('set_entry_id, exercise_id, exercise_order')
            .in('set_entry_id', blockIdsByType.usesDropSets)
        )
        if (process.env.NODE_ENV !== 'production') {
          console.timeEnd('[getWorkoutTemplates] count workout_drop_sets')
          console.log('[getWorkoutTemplates] count workout_drop_sets rows=', dropSets?.length ?? 0)
        }
        if (dropSets) {
          const uniqueExercises = new Set<string>()
          dropSets.forEach((row: any) => {
            const templateId = blockToTemplate.get(row.set_entry_id)
            const key = `${templateId}:${row.exercise_id}:${row.exercise_order}`
            if (templateId && !uniqueExercises.has(key)) {
              uniqueExercises.add(key)
              counts[templateId] = (counts[templateId] || 0) + 1
            }
          })
        }
      }

      // Count from workout_cluster_sets (for cluster_set)
      if (blockIdsByType.usesClusterSets.length > 0) {
        if (process.env.NODE_ENV !== 'production') console.time('[getWorkoutTemplates] count workout_cluster_sets')
        const clusterSets = await safeQueryForCount<any[]>(
          supabase
            .from('workout_cluster_sets')
            .select('set_entry_id, exercise_id, exercise_order')
            .in('set_entry_id', blockIdsByType.usesClusterSets)
        )
        if (process.env.NODE_ENV !== 'production') {
          console.timeEnd('[getWorkoutTemplates] count workout_cluster_sets')
          console.log('[getWorkoutTemplates] count workout_cluster_sets rows=', clusterSets?.length ?? 0)
        }
        if (clusterSets) {
          const uniquePerTemplate = new Set<string>()
          clusterSets.forEach((row: any) => {
            const templateId = blockToTemplate.get(row.set_entry_id)
            if (!templateId || row.exercise_id == null || row.exercise_order == null) return
            const key = `${templateId}:${row.exercise_id}:${row.exercise_order}`
            if (!uniquePerTemplate.has(key)) {
              uniquePerTemplate.add(key)
              counts[templateId] = (counts[templateId] || 0) + 1
            }
          })
        }
      }

      // Count from workout_rest_pause_sets (for rest_pause)
      if (blockIdsByType.usesRestPause.length > 0) {
        if (process.env.NODE_ENV !== 'production') console.time('[getWorkoutTemplates] count workout_rest_pause_sets')
        const restPauseSets = await safeQueryForCount<any[]>(
          supabase
            .from('workout_rest_pause_sets')
            .select('set_entry_id, exercise_id, exercise_order')
            .in('set_entry_id', blockIdsByType.usesRestPause)
        )
        if (process.env.NODE_ENV !== 'production') {
          console.timeEnd('[getWorkoutTemplates] count workout_rest_pause_sets')
          console.log('[getWorkoutTemplates] count workout_rest_pause_sets rows=', restPauseSets?.length ?? 0)
        }
        if (restPauseSets) {
          restPauseSets.forEach((row: any) => {
            const templateId = blockToTemplate.get(row.set_entry_id)
            if (templateId) {
              counts[templateId] = (counts[templateId] || 0) + 1
            }
          })
        }
      }

      // Count from workout_time_protocols (for amrap, emom, for_time, tabata) - count unique exercises per set entry
      if (blockIdsByType.usesTimeProtocols.length > 0) {
        if (process.env.NODE_ENV !== 'production') console.time('[getWorkoutTemplates] count workout_time_protocols')
        const timeProtocols = await safeQueryForCount<any[]>(
          supabase
            .from('workout_time_protocols')
            .select('set_entry_id, exercise_id, exercise_order')
            .in('set_entry_id', blockIdsByType.usesTimeProtocols)
        )
        if (process.env.NODE_ENV !== 'production') {
          console.timeEnd('[getWorkoutTemplates] count workout_time_protocols')
          console.log('[getWorkoutTemplates] count workout_time_protocols rows=', timeProtocols?.length ?? 0)
        }
        if (timeProtocols) {
          const uniqueExercises = new Set<string>()
          timeProtocols.forEach((row: any) => {
            const templateId = blockToTemplate.get(row.set_entry_id)
            const key = `${templateId}:${row.exercise_id}:${row.exercise_order}`
            if (templateId && !uniqueExercises.has(key)) {
              uniqueExercises.add(key)
              counts[templateId] = (counts[templateId] || 0) + 1
            }
          })
        }
      }

      const speedBlockIds = (blocks || [])
        .filter((b: any) => b.set_type === 'speed_work')
        .map((b: any) => b.id)
      const enduranceBlockIds = (blocks || [])
        .filter((b: any) => b.set_type === 'endurance')
        .map((b: any) => b.id)
      const speedEnduranceBlockIds = [...speedBlockIds, ...enduranceBlockIds]
      if (speedEnduranceBlockIds.length > 0) {
        const [speedRows, enduranceRows, wseeSeRows] = await Promise.all([
          speedBlockIds.length > 0
            ? safeQueryForCount<any[]>(
                supabase
                  .from('workout_speed_sets')
                  .select('set_entry_id')
                  .in('set_entry_id', speedBlockIds),
              )
            : Promise.resolve([]),
          enduranceBlockIds.length > 0
            ? safeQueryForCount<any[]>(
                supabase
                  .from('workout_endurance_sets')
                  .select('set_entry_id')
                  .in('set_entry_id', enduranceBlockIds),
              )
            : Promise.resolve([]),
          safeQueryForCount<any[]>(
            supabase
              .from('workout_set_entry_exercises')
              .select('set_entry_id')
              .in('set_entry_id', speedEnduranceBlockIds),
          ),
        ])
        const wseeByBlock = new Set<string>()
        ;(wseeSeRows || []).forEach((row: any) => {
          if (row.set_entry_id) wseeByBlock.add(row.set_entry_id)
        })
        ;(speedRows || []).forEach((row: any) => {
          const sid = row.set_entry_id
          if (!sid || wseeByBlock.has(sid)) return
          const templateId = blockToTemplate.get(sid)
          if (templateId) counts[templateId] = (counts[templateId] || 0) + 1
        })
        ;(enduranceRows || []).forEach((row: any) => {
          const sid = row.set_entry_id
          if (!sid || wseeByBlock.has(sid)) return
          const templateId = blockToTemplate.get(sid)
          if (templateId) counts[templateId] = (counts[templateId] || 0) + 1
        })
      }

      return templates.map((template: any) => ({
        ...template,
        exercise_count: counts[template.id] || 0,
      }))
    } catch (error) {
      console.error('Error fetching workout templates:', error)
      return []
    }
  }

  // Get a single template by ID (efficient - doesn't load all templates).
  // Use skipExerciseCount: true when the caller will load blocks and derive count from them
  // (avoids duplicate heavy queries and reduces timeouts on template details page).
  static async getWorkoutTemplateById(
    templateId: string,
    options?: { skipExerciseCount?: boolean }
  ): Promise<WorkoutTemplate | null> {
    try {
      const { ensureAuthenticated } = await import('./supabase');
      await ensureAuthenticated();
      
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error) {
        console.error('Error fetching template by ID:', error)
        return null
      }

      if (!data) return null

      const skipCount = options?.skipExerciseCount === true
      const exerciseCount = skipCount ? 0 : await this.countExercisesForTemplate(templateId)

      return {
        ...data,
        exercise_count: exerciseCount,
      } as WorkoutTemplate
    } catch (error) {
      console.error('Error fetching workout template by ID:', error)
      return null
    }
  }

  // Helper for timeout-protected queries (handles Supabase thenable objects)
  private static async safeQueryWithTimeout<T>(
    queryBuilder: any,
    timeoutMs: number = 5000
  ): Promise<T | null> {
    try {
      const result = await Promise.race([
        queryBuilder.then((r: any) => r),
        new Promise<{ data: null; error: { message: string } }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'Query timeout' } }), timeoutMs)
        )
      ])
      if (result.error) {
        console.warn('[WorkoutTemplateService] Query error:', result.error.message)
        return null
      }
      return result.data
    } catch (error) {
      console.warn('[WorkoutTemplateService] Query failed:', error)
      return null
    }
  }

  // Count exercises for a single template (uses same logic as getWorkoutTemplates)
  static async countExercisesForTemplate(templateId: string): Promise<number> {
    try {
      // Get all set entries for this template
      const blocks = await this.safeQueryWithTimeout<any[]>(
        supabase
          .from('workout_set_entries')
          .select('id, template_id, set_type')
          .eq('template_id', templateId)
      )

      if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return 0

      // Categorize set entries by which table they use for exercises
      const blockIdsByType = {
        usesBlockExercises: [] as string[],
        usesDropSets: [] as string[],
        usesClusterSets: [] as string[],
        usesRestPause: [] as string[],
        usesTimeProtocols: [] as string[],
      }

      blocks.forEach((block: any) => {
        const blockType = block.set_type
        if (
          [
            'straight_set',
            'superset',
            'giant_set',
            'pre_exhaustion',
            'speed_work',
            'endurance',
          ].includes(blockType)
        ) {
          blockIdsByType.usesBlockExercises.push(block.id)
        } else if (blockType === 'drop_set') {
          blockIdsByType.usesDropSets.push(block.id)
        } else if (blockType === 'cluster_set') {
          blockIdsByType.usesClusterSets.push(block.id)
        } else if (blockType === 'rest_pause') {
          blockIdsByType.usesRestPause.push(block.id)
        } else if (['amrap', 'emom', 'for_time', 'tabata'].includes(blockType)) {
          blockIdsByType.usesTimeProtocols.push(block.id)
        }
      })

      // Run all count queries in parallel with timeout protection
      const countPromises: Promise<number>[] = []

      // Count from workout_set_entry_exercises
      if (blockIdsByType.usesBlockExercises.length > 0) {
        countPromises.push(
          this.safeQueryWithTimeout<any[]>(
            supabase
              .from('workout_set_entry_exercises')
              .select('id')
              .in('set_entry_id', blockIdsByType.usesBlockExercises)
          ).then(data => (Array.isArray(data) ? data.length : 0))
        )
      }

      // Count from workout_drop_sets - count unique exercises per set entry
      if (blockIdsByType.usesDropSets.length > 0) {
        countPromises.push(
          this.safeQueryWithTimeout<any[]>(
            supabase
              .from('workout_drop_sets')
              .select('exercise_id, exercise_order')
              .in('set_entry_id', blockIdsByType.usesDropSets)
          ).then(data => {
            if (!data || !Array.isArray(data)) return 0
            const uniqueExercises = new Set<string>()
            data.forEach((row: any) => {
              uniqueExercises.add(`${row.exercise_id}:${row.exercise_order}`)
            })
            return uniqueExercises.size
          })
        )
      }

      // Count from workout_cluster_sets (unique exercise per block)
      if (blockIdsByType.usesClusterSets.length > 0) {
        countPromises.push(
          this.safeQueryWithTimeout<any[]>(
            supabase
              .from('workout_cluster_sets')
              .select('exercise_id, exercise_order')
              .in('set_entry_id', blockIdsByType.usesClusterSets)
          ).then(data => {
            if (!data || !Array.isArray(data)) return 0
            const uniqueExercises = new Set<string>()
            data.forEach((row: any) => {
              uniqueExercises.add(`${row.exercise_id}:${row.exercise_order}`)
            })
            return uniqueExercises.size
          })
        )
      }

      // Count from workout_rest_pause_sets
      if (blockIdsByType.usesRestPause.length > 0) {
        countPromises.push(
          this.safeQueryWithTimeout<any[]>(
            supabase
              .from('workout_rest_pause_sets')
              .select('id')
              .in('set_entry_id', blockIdsByType.usesRestPause)
          ).then(data => (Array.isArray(data) ? data.length : 0))
        )
      }

      // Count from workout_time_protocols - count unique exercises per set entry
      if (blockIdsByType.usesTimeProtocols.length > 0) {
        countPromises.push(
          this.safeQueryWithTimeout<any[]>(
            supabase
              .from('workout_time_protocols')
              .select('exercise_id, exercise_order')
              .in('set_entry_id', blockIdsByType.usesTimeProtocols)
          ).then(data => {
            if (!data || !Array.isArray(data)) return 0
            const uniqueExercises = new Set<string>()
            data.forEach((row: any) => {
              uniqueExercises.add(`${row.exercise_id}:${row.exercise_order}`)
            })
            return uniqueExercises.size
          })
        )
      }

      // Wait for all counts and sum them
      const counts = await Promise.all(countPromises)
      let total = counts.reduce((sum, count) => sum + count, 0)

      const speedBlockIds = blocks
        .filter((b: any) => b.set_type === 'speed_work')
        .map((b: any) => b.id)
      const enduranceBlockIds = blocks
        .filter((b: any) => b.set_type === 'endurance')
        .map((b: any) => b.id)
      const speedEnduranceBlockIds = [...speedBlockIds, ...enduranceBlockIds]
      if (speedEnduranceBlockIds.length > 0) {
        const [speedRows, enduranceRows, wseeSeRows] = await Promise.all([
          speedBlockIds.length > 0
            ? this.safeQueryWithTimeout<any[]>(
                supabase
                  .from('workout_speed_sets')
                  .select('set_entry_id')
                  .in('set_entry_id', speedBlockIds),
              )
            : Promise.resolve([]),
          enduranceBlockIds.length > 0
            ? this.safeQueryWithTimeout<any[]>(
                supabase
                  .from('workout_endurance_sets')
                  .select('set_entry_id')
                  .in('set_entry_id', enduranceBlockIds),
              )
            : Promise.resolve([]),
          this.safeQueryWithTimeout<any[]>(
            supabase
              .from('workout_set_entry_exercises')
              .select('set_entry_id')
              .in('set_entry_id', speedEnduranceBlockIds),
          ),
        ])
        const wseeByBlock = new Set<string>()
        ;(wseeSeRows || []).forEach((row: any) => {
          if (row.set_entry_id) wseeByBlock.add(row.set_entry_id)
        })
        ;(speedRows || []).forEach((row: any) => {
          const sid = row.set_entry_id
          if (sid && !wseeByBlock.has(sid)) total += 1
        })
        ;(enduranceRows || []).forEach((row: any) => {
          const sid = row.set_entry_id
          if (sid && !wseeByBlock.has(sid)) total += 1
        })
      }

      return total
    } catch (error) {
      console.error('Error counting exercises for template:', error)
      return 0
    }
  }

  static async assignWorkoutToClient(
    clientRelationshipId: string,
    clientProfileId: string,
    templateId: string,
    coachId: string,
    scheduledDate: string,
    notes?: string | null
  ): Promise<any | null> {
    try {
      const template = await this.getWorkoutTemplateById(templateId)

      const { data: existing, error: existingError } = await supabase
        .from('workout_assignments')
        .select('*')
        .eq('client_id', clientProfileId)
        .eq('workout_template_id', templateId)
        .maybeSingle()

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError
      }

      let assignment = existing || null

      if (!assignment) {
        const insertPayload: any = {
          client_id: clientProfileId,
          workout_template_id: templateId,
          coach_id: coachId,
          scheduled_date: scheduledDate,
          status: 'assigned',
          name: template?.name ?? 'Workout Assignment',
          notes: notes ?? null,
        }

        const { data, error } = await supabase
          .from('workout_assignments')
          .insert(insertPayload)
          .select('*')
          .single()

        if (error) throw error
        assignment = data
      } else {
        const updates: any = {}
        if (scheduledDate && assignment.scheduled_date !== scheduledDate) {
          updates.scheduled_date = scheduledDate
        }
        if (notes !== undefined && assignment.notes !== notes) {
          updates.notes = notes
        }
        if (template?.name && assignment.name !== template.name) {
          updates.name = template.name
        }

        if (Object.keys(updates).length > 0) {
          const { data, error } = await supabase
            .from('workout_assignments')
            .update(updates)
            .eq('id', assignment.id)
            .select('*')
            .single()

          if (error) throw error
          assignment = data
        }
      }

      if (!assignment?.id) {
        return null
      }

      // No longer creating copies - assignment links directly to original template
      try {
        const { emitInAppNotification } = await import('@/lib/inAppNotificationEvents')
        void emitInAppNotification({
          event: 'client_workout_assigned',
          clientId: clientProfileId,
          assignmentId: assignment.id,
        })
      } catch {
        /* non-blocking */
      }
      return assignment
    } catch (error) {
      console.error('Error assigning workout to client:', error)
      return null
    }
  }

  static async createWorkoutTemplate(template: Omit<WorkoutTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<WorkoutTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .insert(template)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating workout template:', error)
      return null
    }
  }

  static async updateWorkoutTemplate(id: string, updates: Partial<WorkoutTemplate>): Promise<WorkoutTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating workout template:', error)
      return null
    }
  }

  static async deleteWorkoutTemplate(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('workout_templates')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting workout template:', error)
      return false
    }
  }

  static async duplicateWorkoutTemplate(id: string, newName: string): Promise<WorkoutTemplate | null> {
    try {
      // First get the original template
      const { data: originalTemplate, error: fetchError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Create new template
      const { data: newTemplate, error: createError } = await supabase
        .from('workout_templates')
        .insert({
          name: newName,
          description: originalTemplate.description,
          coach_id: originalTemplate.coach_id,
          difficulty_level: originalTemplate.difficulty_level,
          estimated_duration: originalTemplate.estimated_duration,
          category: originalTemplate.category,
          is_active: true
        })
        .select()
        .single()

      if (createError) throw createError

      // Copy blocks using WorkoutBlockService
      const { WorkoutBlockService } = await import('./workoutBlockService')
      const blocks = await WorkoutBlockService.getWorkoutBlocks(id)
      
      if (blocks && blocks.length > 0) {
        // Create blocks for the new template
        for (const block of blocks) {
          const newBlock = await WorkoutBlockService.createWorkoutBlock(
            newTemplate.id,
            block.set_type,
            block.set_order,
            {
              set_name: block.set_name,
              set_notes: block.set_notes,
              total_sets: block.total_sets,
              reps_per_set: block.reps_per_set,
              rest_seconds: block.rest_seconds,
              duration_seconds: block.duration_seconds,
            }
          )

          // Copy exercises within the block
          if (newBlock && block.exercises && block.exercises.length > 0) {
            for (const exercise of block.exercises) {
              await WorkoutBlockService.addExerciseToBlock(
                newBlock.id,
                exercise.exercise_id,
                exercise.exercise_order,
                {
                  exercise_letter: exercise.exercise_letter,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  weight_kg: exercise.weight_kg,
                  rpe: exercise.rpe,
                  tempo: exercise.tempo,
                  rest_seconds: exercise.rest_seconds,
                  notes: exercise.notes,
                }
              )
            }
          }
        }
      }

      return newTemplate
    } catch (error) {
      console.error('Error duplicating workout template:', error)
      return null
    }
  }

  // ===== TEMPLATE EXERCISE MANAGEMENT =====
  // NOTE: These methods are deprecated. Use WorkoutBlockService instead.
  // Keeping for backward compatibility, but they now delegate to WorkoutBlockService
  
  static async addExerciseToTemplate(templateId: string, exerciseId: string, orderIndex: number, notes?: string): Promise<TemplateExercise | null> {
    try {
      // Use WorkoutBlockService to create a straight_set block
      const { WorkoutBlockService } = await import('./workoutBlockService')
      const block = await WorkoutBlockService.createWorkoutBlock(
        templateId,
        'straight_set',
        orderIndex,
        { set_notes: notes }
      )

      if (!block) return null

      // Add exercise to the block
      const blockExercise = await WorkoutBlockService.addExerciseToBlock(
        block.id,
        exerciseId,
        1,
        { notes }
      )

      if (!blockExercise) return null

      // Return in legacy format for compatibility
      return {
        id: blockExercise.id,
        template_id: templateId,
        exercise_id: exerciseId,
        order_index: orderIndex,
        notes: notes || null,
      } as any
    } catch (error) {
      console.error('Error adding exercise to template:', error)
      return null
    }
  }

  static async updateTemplateExercise(id: string, updates: Partial<TemplateExercise>): Promise<TemplateExercise | null> {
    try {
      // Legacy method - exercise updates now handled via WorkoutBlockService
      console.warn('updateTemplateExercise is deprecated. Use WorkoutBlockService.updateWorkoutBlock instead.')
      return null
    } catch (error) {
      console.error('Error updating template exercise:', error)
      return null
    }
  }

  static async removeExerciseFromTemplate(id: string): Promise<boolean> {
    try {
      // Legacy method - exercise removal now handled via WorkoutBlockService
      console.warn('removeExerciseFromTemplate is deprecated. Use WorkoutBlockService.deleteWorkoutBlock instead.')
      return false
    } catch (error) {
      console.error('Error removing exercise from template:', error)
      return false
    }
  }

  static async reorderTemplateExercises(templateId: string, exercises: { id: string; orderIndex: number }[]): Promise<boolean> {
    try {
      // Legacy method - use WorkoutBlockService.reorderWorkoutBlocks instead
      console.warn('reorderTemplateExercises is deprecated. Use WorkoutBlockService.reorderWorkoutBlocks instead.')
      const { WorkoutBlockService } = await import('./workoutBlockService')
      
      // Convert exercise IDs to block order updates
      // Note: This is a simplified approach - in reality, we'd need to map exercises to blocks
      const blocks = await WorkoutBlockService.getWorkoutBlocks(templateId)
      const blockOrders = blocks.map((block, index) => ({
        blockId: block.id,
        newOrder: index + 1,
      }))
      
      return await WorkoutBlockService.reorderWorkoutBlocks(templateId, blockOrders)
    } catch (error) {
      console.error('Error reordering template exercises:', error)
      return false
    }
  }

  // ===== PROGRAM MANAGEMENT =====
  
  static async getPrograms(coachId: string, includeInactive: boolean = false): Promise<Program[]> {
    try {
      let query = supabase
        .from('workout_programs')
        .select('*')
        .eq('coach_id', coachId)
      
      if (!includeInactive) {
        query = query.eq('is_active', true)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching programs:', error)
      return []
    }
  }

  static async createProgram(programData: Omit<Program, 'id' | 'created_at' | 'updated_at'>): Promise<Program | null> {
    try {
      console.log('📝 WorkoutTemplateService.createProgram called with:', programData);

      // duration_weeks / category were dropped from workout_programs (length lives on training_blocks)
      const { duration_weeks: _dropDuration, category: _dropCategory, ...safeProgramData } = programData

      const insertData = {
        ...safeProgramData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('📝 Inserting program data:', insertData);
      
      const { data, error } = await supabase
        .from('workout_programs')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('❌ Supabase error creating program:', error);
        throw error;
      }
      
      console.log('✅ Program created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating program:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return null;
    }
  }

  static async updateProgram(programId: string, programData: Partial<Program>): Promise<Program | null> {
    const { duration_weeks: _dropDuration, category: _dropCategory, ...patch } = programData

    const { data, error } = await supabase
      .from('workout_programs')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', programId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteProgram(programId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('workout_programs')
        .update({ is_active: false })
        .eq('id', programId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting program:', error)
      return false
    }
  }

  // ===== PROGRAM SCHEDULE MANAGEMENT =====
  
  static async getProgramSchedule(programId: string): Promise<ProgramSchedule[]> {
    // Use program_schedule table with columns: program_id, day_of_week, week_number, template_id
    // Avoid DB-side ordering on unknown columns; fetch and sort client-side.
    try {
      const { data: rows, error } = await supabase
        .from('program_schedule')
        .select('*')
        .eq('program_id', programId)

      if (error) throw error

      // Map to legacy ProgramSchedule shape used by callers
      const mapped = (rows || []).map((row: any) => {
        const programDay =
          typeof row.program_day === 'number'
            ? row.program_day
            : typeof row.day_number === 'number'
            ? row.day_number
            : typeof row.day === 'number'
            ? row.day
            : typeof row.day_of_week === 'number'
            ? row.day_of_week + 1
            : 1

        const weekNumber =
          typeof row.week_number === 'number'
            ? row.week_number
            : typeof row.week === 'number'
            ? row.week
            : 1

        const templateId = row.template_id ?? row.workout_template_id

        return {
          id: row.id,
          program_id: row.program_id,
          program_day: programDay,
          week_number: weekNumber,
          template_id: templateId,
          training_block_id: row.training_block_id ?? null,
          is_optional: row.is_optional ?? false,
          is_active: row.is_active ?? true,
          notes: row.notes,
          template_name: row.template_name ?? undefined,
          template_description: row.template_description ?? undefined,
          estimated_duration: row.estimated_duration ?? null,
          created_at: row.created_at,
          updated_at: row.updated_at,
        } as unknown as ProgramSchedule
      })

      // Client-side sort by (week_number ASC, program_day ASC)
      mapped.sort((a: any, b: any) => {
        const wa = a.week_number ?? 1
        const wb = b.week_number ?? 1
        if (wa !== wb) return wa - wb
        const da = a.program_day ?? 1
        const db = b.program_day ?? 1
        return da - db
      })

      return mapped
    } catch (error) {
      console.error('Error fetching program schedule:', error)
      return []
    }
  }

  // ===== PROGRAM ASSIGNMENT MANAGEMENT =====

  // NOTE: The old client-side assign saga (createProgramAssignment +
  // clearStaleRunDataForAssignmentReuse) was removed in the Program Spine
  // Rebuild (step 3). Assignment now goes through the transactional RPC
  // `assign_program_instance` via assignProgramToClients().

  static async getProgramAssignmentsByClient(clientId: string): Promise<ProgramAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('program_assignments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching client program assignments:', error)
      return []
    }
  }

  static async upsertProgramDayAssignment(
    programAssignmentId: string,
    weekNumber: number,
    programDay: number,
    workoutTemplateId: string | null,
    notes?: string | null,
    overrides?: {
      name?: string | null
      description?: string | null
      estimated_duration?: number | null
    }
  ): Promise<ProgramDayAssignment | null> {
    try {
      const dayNumber = (weekNumber - 1) * 7 + programDay
      const dayType = workoutTemplateId ? 'workout' : 'rest'
      const defaultName =
        dayType === 'workout'
          ? `Workout Day ${weekNumber}-${programDay}`
          : `Rest Day ${weekNumber}-${programDay}`
      const name = overrides?.name ?? defaultName
      const defaultDescription =
        dayType === 'rest' ? 'Rest day' : null
      const description = overrides?.description ?? defaultDescription

      const payload: any = {
        program_assignment_id: programAssignmentId,
        program_day_id: null,
        day_number: dayNumber,
        day_type: dayType,
        workout_template_id: workoutTemplateId ?? null,
        name,
        description,
        notes: notes ?? null,
        is_completed: false,
        program_day: programDay,
        target_muscles: [],
        recommended_activities: [],
      }

      if (overrides?.name !== undefined) payload.name = overrides.name
      if (overrides?.description !== undefined) payload.description = overrides.description
      if (overrides?.estimated_duration !== undefined) payload.estimated_duration = overrides.estimated_duration

      const { data, error } = await supabase
        .from('program_day_assignments')
        .upsert(payload)
        .select('*')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error upserting program day assignment:', error)
      return null
    }
  }

  static async removeProgramDayAssignment(programAssignmentId: string, weekNumber: number, programDay: number): Promise<boolean> {
    try {
      const dayNumber = (weekNumber - 1) * 7 + programDay
      const { error } = await supabase
        .from('program_day_assignments')
        .delete()
        .eq('program_assignment_id', programAssignmentId)
        .eq('program_day', programDay)
        .eq('day_number', dayNumber)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error removing program day assignment:', error)
      return false
    }
  }

  static async getProgramAssignmentDetail(programAssignmentId: string): Promise<{ assignment: ProgramAssignment | null; days: ProgramDayAssignment[] }> {
    try {
      const [{ data: assignment, error: aErr }, { data: days, error: dErr }] = await Promise.all([
        supabase.from('program_assignments').select('*').eq('id', programAssignmentId).single(),
        supabase.from('program_day_assignments').select('*').eq('program_assignment_id', programAssignmentId)
      ])

      if (aErr) throw aErr
      if (dErr) throw dErr

      const sorted = (days || []).sort((a: any, b: any) => {
        const da = typeof a.day_number === 'number' ? a.day_number : 0
        const db = typeof b.day_number === 'number' ? b.day_number : 0
        if (da !== db) return da - db
        const pa = typeof a.program_day === 'number' ? a.program_day : 0
        const pb = typeof b.program_day === 'number' ? b.program_day : 0
        return pa - pb
      })

      const mapped = sorted.map((day: any) => {
        const dayNumber = typeof day.day_number === 'number' ? day.day_number : null
        const derivedWeek =
          dayNumber !== null ? Math.floor((dayNumber - 1) / 7) + 1 : null
        return {
          ...day,
          program_assignment_id: day.program_assignment_id || day.assignment_id,
          week_number: derivedWeek,
        }
      }) as ProgramDayAssignment[]

      return {
        assignment: assignment || null,
        days: mapped,
      }
    } catch (error) {
      console.error('Error fetching program assignment detail:', error)
      return { assignment: null, days: [] }
    }
  }

  /**
   * Returns which of the given client IDs have an active program assignment,
   * with the current program name (for replace confirmation UI).
   */
  static async getClientsWithActiveProgram(clientIds: string[]): Promise<{ client_id: string; program_name: string }[]> {
    if (!clientIds.length) return []
    try {
      const { data: assignments, error } = await supabase
        .from('program_assignments')
        .select('client_id, program_id')
        .in('client_id', clientIds)
        .eq('status', 'active')

      if (error) {
        console.error('Error fetching active program assignments:', error)
        return []
      }
      if (!assignments?.length) return []

      const programIds = [...new Set(assignments.map((a) => a.program_id).filter(Boolean))]
      const { data: programs, error: programsError } = await supabase
        .from('workout_programs')
        .select('id, name')
        .in('id', programIds)

      if (programsError || !programs?.length) {
        return assignments.map((a) => ({ client_id: a.client_id, program_name: 'Program' }))
      }
      const nameById = new Map(programs.map((p) => [p.id, p.name ?? 'Program']))
      return assignments.map((a) => ({
        client_id: a.client_id,
        program_name: nameById.get(a.program_id) ?? 'Program',
      }))
    } catch (e) {
      console.error('getClientsWithActiveProgram:', e)
      return []
    }
  }

  /**
   * Assign a program to multiple clients. Each client gets a complete,
   * client-owned instance produced by the transactional RPC
   * `assign_program_instance` (deep copy of phases, workouts, set entries,
   * exercises, per-set prescriptions, legacy protocol satellites, schedule,
   * and progression rules). Each client either gets a full instance or
   * nothing (the RPC is all-or-nothing); failures are reported per client.
   *
   * Replaces the old client-side saga (createProgramAssignment +
   * copyProgramRulesToClient + program_day_assignments snapshot upsert +
   * orphan cleanup). Re-assign always creates a FRESH instance (D8).
   */
  static async assignProgramToClients(
    programId: string,
    clientIds: string[],
    coachId: string | undefined,
    startDate: string,
    notes?: string,
    progressionMode?: 'auto' | 'coach_managed'
  ): Promise<AssignProgramToClientsResult> {
    const successful: AssignProgramToClientsResult['successful'] = []
    const failed: AssignProgramToClientsResult['failed'] = []

    if (!coachId) {
      for (const clientId of clientIds) {
        failed.push({ clientId, stage: 'assignment', error: 'Missing coachId — cannot assign program instance' })
      }
      return { successful, failed }
    }

    for (const clientId of clientIds) {
      try {
        // Snapshot the client's timezone at assign time (frozen on the instance).
        const { data: clientProfile } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('id', clientId)
          .maybeSingle()
        const timezoneSnapshot = (clientProfile?.timezone as string) || 'UTC'

        const { data, error } = await supabase.rpc('assign_program_instance', {
          p_program_id: programId,
          p_client_id: clientId,
          p_coach_id: coachId,
          p_start_date: startDate,
          p_progression_mode: progressionMode ?? 'auto',
          p_timezone_snapshot: timezoneSnapshot,
          p_notes: notes ?? null,
        })

        if (error) throw error

        const assignmentId = (data as unknown as string) || ''
        if (!assignmentId) {
          failed.push({
            clientId,
            stage: 'assignment',
            error: 'assign_program_instance returned no assignment id',
          })
          continue
        }

        successful.push({ clientId, assignmentId })
        try {
          const { emitInAppNotification } = await import('@/lib/inAppNotificationEvents')
          void emitInAppNotification({
            event: 'client_program_assigned',
            clientId,
            assignmentId,
          })
        } catch {
          /* non-blocking */
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        failed.push({ clientId, stage: 'assignment', error: msg })
      }
    }

    return { successful, failed }
  }

  /**
   * Upsert one master program_schedule cell. Master-only — does NOT touch
   * program_day_assignments on active assignments (step 7: propagation removed).
   */
  static async setProgramSchedule(args: {
    programId: string
    programDay: number
    weekNumber: number
    templateId: string
    isOptional?: boolean
  }): Promise<void> {
    const { programId, programDay, weekNumber, templateId, isOptional = false } = args

    if (programDay < 1 || programDay > 7) {
      throw new Error(`Invalid program_day: ${programDay}. Must be between 1-7.`)
    }

    const dayOfWeek = programDay - 1

    if (process.env.NODE_ENV !== 'production') {
      console.log('[setProgramSchedule] Saving slot:', {
        programId,
        programDay,
        dayOfWeek,
        weekNumber,
        templateId,
      })
    }

    const { data: row, error } = await supabase
      .from('program_schedule')
      .upsert(
        {
          program_id: programId,
          day_of_week: dayOfWeek,
          week_number: weekNumber,
          day_number: programDay,
          template_id: templateId,
          is_optional: isOptional,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'program_id,day_of_week,week_number' },
      )
      .select('*')
      .single()

    if (error) {
      console.error('[setProgramSchedule] upsert error:', error)
      throw error
    }

    if (!row) {
      throw new Error('setProgramSchedule: no row returned from upsert')
    }
  }

  static async removeProgramSchedule(programId: string, programDay: number, weekNumber: number): Promise<boolean> {
    // Validate programDay is between 1-7
    if (programDay < 1 || programDay > 7) {
      throw new Error(`Invalid program_day: ${programDay}. Must be between 1-7.`)
    }

    const dayOfWeek = programDay - 1

    const { data: scheduleRows, error: selectError } = await supabase
      .from('program_schedule')
      .select('id')
      .eq('program_id', programId)
      .eq('day_of_week', dayOfWeek)
      .eq('week_number', weekNumber)

    if (selectError) throw selectError

    if (scheduleRows && scheduleRows.length > 0) {
      for (const row of scheduleRows) {
        if (row?.id) {
          await ProgramProgressionService.deleteProgressionRules(row.id, weekNumber).catch((err) => {
            console.error('Error deleting progression rules before removing schedule:', err)
          })
        }
      }
    }

    const { error } = await supabase
      .from('program_schedule')
      .delete()
      .eq('program_id', programId)
      .eq('day_of_week', dayOfWeek)
      .eq('week_number', weekNumber)

    if (error) throw error

    return true
  }

  // ===== TEMPLATE EXERCISES =====
  // NOTE: This method is deprecated. Use WorkoutBlockService.getWorkoutBlocks instead.
  static async getWorkoutTemplateExercises(templateId: string): Promise<any[]> {
    try {
      // Use WorkoutBlockService instead
      const { WorkoutBlockService } = await import('./workoutBlockService')
      const blocks = await WorkoutBlockService.getWorkoutBlocks(templateId)
      
      // Convert blocks to legacy format for backward compatibility
      const exercises: any[] = []
      blocks.forEach((block, blockIndex) => {
        if (block.exercises && block.exercises.length > 0) {
          block.exercises.forEach((exercise, exIndex) => {
            exercises.push({
              id: exercise.id,
              template_id: templateId,
              exercise_id: exercise.exercise_id,
              order_index: block.set_order || blockIndex + 1,
              notes: exercise.notes || block.set_notes,
            })
          })
        }
      })
      
      return exercises
    } catch (error) {
      console.error('Error fetching workout template exercises:', error)
      return []
    }
  }

  // ===== DAILY WORKOUT GENERATION =====
  
  // ===== FLEXIBLE PROGRAM SYSTEM =====
  
  static async getNextDueWorkout(clientId: string): Promise<DailyWorkout> {
    try {
      const { data, error } = await supabase
        .rpc('get_next_due_workout', {
          p_client_id: clientId
        })

      if (error) {
        // Handle specific error cases gracefully
        if (error.code === 'PGRST202') {
          console.log('get_next_due_workout function not found, falling back to legacy method')
          return this.getDailyWorkout(clientId, new Date().toISOString().split('T')[0])
        }
        console.log('Error calling get_next_due_workout:', error)
        // Return a default response instead of throwing
        return { 
          hasWorkout: false, 
          message: 'No active program assigned. Contact your coach to get started!' 
        }
      }
      return data || { hasWorkout: false, message: 'No active program assigned. Contact your coach to get started!' }
    } catch (error) {
      console.error('Error getting next due workout:', error)
      // Return a helpful message instead of falling back
      return { 
        hasWorkout: false, 
        message: 'No active program assigned. Contact your coach to get started!',
        weekCompleted: false
      }
    }
  }

  static async getCompletedPrograms(clientId: string): Promise<CompletedProgram[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_completed_programs', {
          p_client_id: clientId
        })

      if (error) {
        // Handle specific error cases gracefully
        if (error.code === 'PGRST202') {
          console.log('get_completed_programs function not found, returning empty array')
          return []
        }
        throw error
      }
      return data || []
    } catch (error) {
      console.error('Error getting completed programs:', error)
      return []
    }
  }

  static async getProgramProgress(clientId: string): Promise<ProgramAssignmentProgress | null> {
    try {
      // REFACTORED: Read canonical program state from programStateService
      // (calendar-derived current week + ledger/completion state) instead of
      // legacy program_assignment_progress table.
      const { getProgramState } = await import('./programStateService')
      const state = await getProgramState(supabase, clientId)

      if (!state.assignment) {
        return null
      }

      // Map canonical state to legacy ProgramAssignmentProgress shape
      return {
        id: state.assignment.id, // Using assignment ID as stand-in
        assignment_id: state.assignment.id,
        client_id: state.assignment.client_id,
        program_id: state.assignment.program_id,
        current_week: state.currentWeekNumber,
        current_day: state.currentDayNumber,
        is_program_completed: state.isCompleted,
        cycle_start_date: state.assignment.start_date || new Date().toISOString(),
        created_at: state.assignment.created_at,
      } as ProgramAssignmentProgress
    } catch (error) {
      console.error('Error getting program progress:', error)
      return null
    }
  }

  static async getWorkoutHistory(clientId: string, limit: number = 10): Promise<WorkoutCompletion[]> {
    try {
      // Query workout_logs via workout_assignments for the new schema
      const { data: assignments, error: assignError } = await supabase
        .from('workout_assignments')
        .select('id, workout_template_id')
        .eq('client_id', clientId)

      if (assignError || !assignments || assignments.length === 0) {
        return []
      }

      const assignmentIds = assignments.map(a => a.id)
      const { data, error } = await supabase
        .from('workout_logs')
        .select(`
          *,
          workout_assignments!inner(
            workout_template_id,
            template:workout_templates(name, difficulty_level)
          )
        `)
        .in('workout_assignment_id', assignmentIds)
        .order('completed_at', { ascending: false })
        .limit(limit)

      if (error) {
        // If workout_logs doesn't exist or has issues, return empty array
        console.log('Error querying workout_logs:', error)
        return []
      }

      // Map workout_logs data to WorkoutCompletion format
      return (data || []).map((log: any) => ({
        id: log.id,
        assignment_progress_id: log.workout_assignment_id,
        client_id: clientId,
        program_id: '', // Not available in workout_logs
        week_number: 0, // Not available in workout_logs
        program_day: 0, // Not available in workout_logs
        template_id: log.workout_assignments?.workout_template_id || '',
        workout_date: log.completed_at?.split('T')[0] || '',
        completed_at: log.completed_at || '',
        duration_minutes: log.duration_minutes,
        created_at: log.created_at || new Date().toISOString(),
        template: log.workout_assignments?.template
      } as WorkoutCompletion))
    } catch (error) {
      console.error('Error getting workout history:', error)
      return []
    }
  }

  // Legacy method for backward compatibility
  static async getDailyWorkout(clientId: string, workoutDate: string = new Date().toISOString().split('T')[0]): Promise<DailyWorkout> {
    // For now, just return the next due workout regardless of date
    // This maintains compatibility while transitioning to the new system
    return await this.getNextDueWorkout(clientId)
  }

  // ===== EXERCISE ALTERNATIVES =====
  
  static async getExerciseAlternatives(exerciseId: string): Promise<ExerciseAlternative[]> {
    try {
      const { data, error } = await supabase
        .from('exercise_alternatives')
        .select(`
          *,
          alternative_exercise:exercises!alternative_exercise_id(*)
        `)
        .eq('primary_exercise_id', exerciseId)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching exercise alternatives:', error)
      return []
    }
  }

  static async addExerciseAlternative(primaryExerciseId: string, alternativeExerciseId: string, reason: ExerciseAlternative['reason'], notes?: string): Promise<ExerciseAlternative | null> {
    try {
      const { data, error } = await supabase
        .from('exercise_alternatives')
        .insert({
          primary_exercise_id: primaryExerciseId,
          alternative_exercise_id: alternativeExerciseId,
          reason,
          notes: notes || null
        })
        .select(`
          *,
          alternative_exercise:exercises!alternative_exercise_id(*)
        `)
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('This alternative already exists for this exercise')
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error adding exercise alternative:', error)
      throw error
    }
  }

  static async removeExerciseAlternative(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('exercise_alternatives')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error removing exercise alternative:', error)
      return false
    }
  }

  // ===== UTILITY FUNCTIONS =====
  
  static async getExercises(categoryId?: string, search?: string): Promise<Exercise[]> {
    try {
      let query = supabase
        .from('exercises')
        .select('*')

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
      }

      const { data, error } = await query
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching exercises:', error)
      return []
    }
  }

  static async getExerciseCategories(): Promise<ExerciseCategory[]> {
    try {
      const { data, error } = await supabase
        .from('exercise_categories')
        .select('*')
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching exercise categories:', error)
      return []
    }
  }

  // ===== ANALYTICS & INSIGHTS =====
  
  static async getTemplateUsageStats(coachId: string): Promise<{ templateId: string; templateName: string; usageCount: number; avgRating: number }[]> {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          id,
          name,
          program_schedule!inner(program_id)
        `)
        .eq('coach_id', coachId)

      if (error) throw error

      // Transform the data to get usage counts
      const usageStats = (data || []).map((template: any) => ({
        templateId: template.id,
        templateName: template.name,
        usageCount: template.program_schedule.length,
        avgRating: 0 // This would need to be calculated from client feedback
      }))

      return usageStats
    } catch (error) {
      console.error('Error fetching template usage stats:', error)
      return []
    }
  }
}

export default WorkoutTemplateService

import { supabase } from './supabase'
import { WorkoutExerciseGroup, ExerciseGroupType, ExerciseRow } from '@/types/workoutGroups'

/**
 * Service for managing workout exercise groups
 * Handles creating groups and saving exercises for all exercise types
 */
export class WorkoutGroupService {
  
  /**
   * Save an exercise group (creates group + exercise rows)
   */
  static async saveExerciseGroup(
    templateId: string,
    exerciseData: any
  ): Promise<WorkoutExerciseGroup | null> {
    try {
      // 1. Create the group
      const { data: group, error: groupError } = await supabase
        .from('workout_exercise_groups')
        .insert({
          template_id: templateId,
          group_type: exerciseData.exercise_type || 'straight_set',
          group_order: await this.getNextGroupOrder(templateId),
          rest_after_seconds: exerciseData.rest_seconds || 60,
          
          // Protocol-specific parameters
          rounds: exerciseData.rounds,
          work_seconds: exerciseData.work_seconds,
          rest_seconds: exerciseData.rest_seconds,
          duration_seconds: exerciseData.amrap_duration || exerciseData.emom_duration,
          reps_per_minute: exerciseData.emom_reps,
          drop_percentage: exerciseData.drop_percentage,
          target_reps: exerciseData.target_reps,
          time_cap: exerciseData.time_cap,
          rest_pause_duration: exerciseData.rest_pause_duration,
          max_rest_pauses: exerciseData.max_rest_pauses,
          clusters_per_set: exerciseData.clusters_per_set,
          intra_cluster_rest: exerciseData.intra_cluster_rest,
          inter_set_rest: exerciseData.inter_set_rest
        })
        .select()
        .single()

      if (groupError) throw groupError

      // 2. Prepare exercise rows based on type
      const exerciseRows = this.prepareExerciseRows(templateId, group.id, exerciseData)

      // 3. Insert exercise rows
      if (exerciseRows.length > 0) {
        const { error: insertError } = await supabase
          .from('workout_template_exercises')
          .insert(exerciseRows)

        if (insertError) throw insertError
      }

      return group
    } catch (error) {
      console.error('Error saving exercise group:', error)
      return null
    }
  }

  /**
   * Prepare exercise rows based on exercise type
   */
  private static prepareExerciseRows(
    templateId: string,
    groupId: string,
    exerciseData: any
  ): ExerciseRow[] {
    
    const exerciseRows: ExerciseRow[] = []
    let currentOrder = 0

    switch (exerciseData.exercise_type) {
      
      case 'superset':
        // Insert BOTH exercises
        if (exerciseData.exercise_id) {
          exerciseRows.push({
            template_id: templateId,
            exercise_id: exerciseData.exercise_id,
            group_id: groupId,
            group_letter: 'A',
            sets: exerciseData.sets ? parseInt(exerciseData.sets) : null,
            reps: exerciseData.reps || null,
            rest_seconds: exerciseData.rest_seconds ? parseInt(exerciseData.rest_seconds) : null,
            rir: exerciseData.rir ? parseInt(exerciseData.rir) : null,
            tempo: exerciseData.tempo || null,
            notes: exerciseData.notes || null
          })
        }
        
        if (exerciseData.superset_exercise_id) {
          exerciseRows.push({
            template_id: templateId,
            exercise_id: exerciseData.superset_exercise_id,
            group_id: groupId,
            group_letter: 'B',
            sets: exerciseData.superset_reps || exerciseData.sets ? parseInt(exerciseData.superset_reps || exerciseData.sets) : null,
            reps: exerciseData.reps || null,
            rest_seconds: exerciseData.rest_seconds ? parseInt(exerciseData.rest_seconds) : null,
            notes: exerciseData.notes || null
          })
        }
        break

      case 'giant_set':
        // Insert ALL exercises from giant_set_exercises
        if (exerciseData.giant_set_exercises && Array.isArray(exerciseData.giant_set_exercises)) {
          exerciseData.giant_set_exercises.forEach((ex: any, index: number) => {
            exerciseRows.push({
              template_id: templateId,
              exercise_id: ex.exercise_id,
              group_id: groupId,
              group_letter: String.fromCharCode(65 + index), // A, B, C, D...
              sets: ex.sets ? parseInt(ex.sets) : null,
              reps: ex.reps || null,
              rest_seconds: ex.rest_seconds ? parseInt(ex.rest_seconds) : null,
              notes: ex.notes || null
            })
          })
        }
        break

      case 'circuit':
        // Insert ALL exercises from circuit_sets
        if (exerciseData.circuit_sets && Array.isArray(exerciseData.circuit_sets)) {
          exerciseData.circuit_sets.forEach((set: any) => {
            if (set.exercises && Array.isArray(set.exercises)) {
              set.exercises.forEach((ex: any, index: number) => {
                exerciseRows.push({
                  template_id: templateId,
                  exercise_id: ex.exercise_id,
                  group_id: groupId,
                  group_letter: String.fromCharCode(65 + index),
                  work_seconds: ex.work_seconds ? parseInt(ex.work_seconds) : null,
                  rest_seconds: ex.rest_seconds ? parseInt(ex.rest_seconds) : null,
                  sets: ex.sets ? parseInt(ex.sets) : null,
                  reps: ex.reps || null,
                  notes: ex.notes || null
                })
              })
            }
          })
        }
        break

      case 'tabata':
        // Insert exercises from tabata_sets
        if (exerciseData.tabata_sets && Array.isArray(exerciseData.tabata_sets)) {
          exerciseData.tabata_sets.forEach((set: any) => {
            if (set.exercises && Array.isArray(set.exercises)) {
              set.exercises.forEach((ex: any, index: number) => {
                exerciseRows.push({
                  template_id: templateId,
                  exercise_id: ex.exercise_id,
                  group_id: groupId,
                  group_letter: String.fromCharCode(65 + index),
                  work_seconds: ex.work_seconds ? parseInt(ex.work_seconds) : null,
                  rest_seconds: ex.rest_seconds ? parseInt(ex.rest_seconds) : null,
                  notes: ex.notes || null
                })
              })
            }
          })
        }
        break

      case 'drop_set':
        // Insert same exercise multiple times with different weights
        if (exerciseData.exercise_id) {
          const drops = exerciseData.drop_sets || []
          drops.forEach((drop: any, index: number) => {
            exerciseRows.push({
              template_id: templateId,
              exercise_id: exerciseData.exercise_id,
              group_id: groupId,
              group_letter: null,
              weight_kg: drop.weight_kg || null,
              reps: drop.reps || exerciseData.reps || null,
              rest_seconds: drop.rest_seconds ? parseInt(drop.rest_seconds) : 0,
              notes: drop.notes || exerciseData.notes || null
            })
          })
        }
        break

      case 'pyramid_set':
        // Insert same exercise multiple times with progressive weights/reps
        if (exerciseData.exercise_id) {
          const pyramids = exerciseData.pyramid_sets || []
          pyramids.forEach((pyramid: any, index: number) => {
            exerciseRows.push({
              template_id: templateId,
              exercise_id: exerciseData.exercise_id,
              group_id: groupId,
              group_letter: null,
              weight_kg: pyramid.weight_kg || null,
              reps: pyramid.reps || null,
              rest_seconds: pyramid.rest_seconds ? parseInt(pyramid.rest_seconds) : null,
              notes: pyramid.notes || exerciseData.notes || null
            })
          })
        }
        break

      case 'pre_exhaustion':
        // Insert 2 exercises (isolation then compound)
        if (exerciseData.exercise_id && exerciseData.compound_exercise_id) {
          // Isolation exercise
          exerciseRows.push({
            template_id: templateId,
            exercise_id: exerciseData.exercise_id,
            group_id: groupId,
            group_letter: 'A',
            sets: exerciseData.sets ? parseInt(exerciseData.sets) : null,
            reps: exerciseData.isolation_reps || exerciseData.reps || null,
            rest_seconds: exerciseData.rest_seconds ? parseInt(exerciseData.rest_seconds) : null,
            notes: exerciseData.notes || null
          })
          
          // Compound exercise
          exerciseRows.push({
            template_id: templateId,
            exercise_id: exerciseData.compound_exercise_id,
            group_id: groupId,
            group_letter: 'B',
            sets: exerciseData.sets ? parseInt(exerciseData.sets) : null,
            reps: exerciseData.compound_reps || exerciseData.reps || null,
            rest_seconds: exerciseData.rest_seconds ? parseInt(exerciseData.rest_seconds) : null,
            notes: exerciseData.notes || null
          })
        }
        break

      case 'amrap':
      case 'emom':
      case 'for_time':
      case 'ladder':
        // Insert exercises (can be multiple for AMRAP/EMOM)
        const exerciseList = exerciseData.amrap_exercises || exerciseData.emom_exercises || []
        
        if (exerciseList.length > 0) {
          exerciseList.forEach((ex: any, index: number) => {
            exerciseRows.push({
              template_id: templateId,
              exercise_id: ex.exercise_id || exerciseData.exercise_id,
              group_id: groupId,
              group_letter: exerciseList.length > 1 ? String.fromCharCode(65 + index) : null,
              sets: ex.sets ? parseInt(ex.sets) : (exerciseData.sets ? parseInt(exerciseData.sets) : null),
              reps: ex.reps || exerciseData.reps || null,
              notes: ex.notes || exerciseData.notes || null
            })
          })
        } else if (exerciseData.exercise_id) {
          // Single exercise
          exerciseRows.push({
            template_id: templateId,
            exercise_id: exerciseData.exercise_id,
            group_id: groupId,
            group_letter: null,
            sets: exerciseData.sets ? parseInt(exerciseData.sets) : null,
            reps: exerciseData.reps || null,
            notes: exerciseData.notes || null
          })
        }
        break

      case 'cluster_set':
      case 'rest_pause':
      case 'straight_set':
      default:
        // Single exercise (most types)
        if (exerciseData.exercise_id) {
          exerciseRows.push({
            template_id: templateId,
            exercise_id: exerciseData.exercise_id,
            group_id: groupId,
            group_letter: null,
            sets: exerciseData.sets ? parseInt(exerciseData.sets) : null,
            reps: exerciseData.reps || null,
            rest_seconds: exerciseData.rest_seconds ? parseInt(exerciseData.rest_seconds) : null,
            rir: exerciseData.rir ? parseInt(exerciseData.rir) : null,
            tempo: exerciseData.tempo || null,
            weight_kg: exerciseData.weight_kg || null,
            notes: exerciseData.notes || null
          })
        }
        break
    }

    return exerciseRows
  }

  /**
   * Get next group order for a template
   */
  private static async getNextGroupOrder(templateId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('workout_exercise_groups')
        .select('group_order')
        .eq('template_id', templateId)
        .order('group_order', { ascending: false })
        .limit(1)

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      
      return data?.[0]?.group_order ? data[0].group_order + 1 : 1
    } catch (error) {
      console.error('Error getting next group order:', error)
      return 1
    }
  }

  /**
   * Load exercises grouped by groups
   */
  static async loadGroupedExercises(templateId: string) {
    try {
      const { data: exercises, error } = await supabase
        .from('workout_template_exercises')
        .select(`
          *,
          exercise:exercises(id, name, description),
          group:workout_exercise_groups(*)
        `)
        .eq('template_id', templateId)
        .order('group_id')
        .order('group_letter')

      if (error) throw error

      // Group by group_id
      const grouped = (exercises || []).reduce((acc: any, ex: any) => {
        const groupId = ex.group_id || `ungrouped-${ex.id}`
        if (!acc[groupId]) acc[groupId] = []
        acc[groupId].push(ex)
        return acc
      }, {})

      return Object.values(grouped)
    } catch (error) {
      console.error('Error loading grouped exercises:', error)
      return []
    }
  }
}

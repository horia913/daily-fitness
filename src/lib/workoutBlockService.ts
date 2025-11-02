import { supabase } from '@/lib/supabase'
import { 
  WorkoutBlock, 
  WorkoutBlockExercise, 
  WorkoutBlockType,
  WorkoutDropSet,
  WorkoutClusterSet,
  WorkoutPyramidSet,
  WorkoutRestPauseSet,
  WorkoutTimeProtocol,
  WorkoutLadderSet,
  LiveWorkoutBlock,
  LiveWorkoutExercise,
  LoggedSet
} from '@/types/workoutBlocks'

export class WorkoutBlockService {
  // Create a new workout block
  static async createWorkoutBlock(
    templateId: string,
    blockType: WorkoutBlockType,
    blockOrder: number,
    blockData: Partial<WorkoutBlock>
  ): Promise<WorkoutBlock | null> {
    try {
      // Check if block_type column exists by trying a simple query first
      // If block_type doesn't exist, the column might be named differently
      // or the table might need the column added
      const insertData: any = {
        template_id: templateId,
        block_order: blockOrder,
      };

      // Only include fields that likely exist
      if (blockData.block_name) insertData.block_name = blockData.block_name;
      if (blockData.block_notes) insertData.block_notes = blockData.block_notes;
      if (blockData.duration_seconds) insertData.duration_seconds = blockData.duration_seconds;
      if (blockData.rest_seconds) insertData.rest_seconds = blockData.rest_seconds;
      if (blockData.total_sets) insertData.total_sets = blockData.total_sets;
      if (blockData.reps_per_set) insertData.reps_per_set = blockData.reps_per_set;
      if (blockData.block_parameters && Object.keys(blockData.block_parameters).length > 0) {
        insertData.block_parameters = blockData.block_parameters;
      }
      
      // Try block_type, if it fails the error will be informative
      insertData.block_type = blockType;

      const { data, error } = await supabase
        .from('workout_blocks')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Full error details:', error);
        // Log more details about the error
        if (error.code === 'PGRST204') {
          console.error('Column not found. The workout_blocks table may be missing the block_type column.');
          console.error('Please check your database schema and ensure the workout_blocks table has a block_type column of type workout_block_type enum.');
        }
        throw error;
      }
      return data
    } catch (error: any) {
      console.error('Error creating workout block:', error)
      // Return a more descriptive error
      if (error?.code === 'PGRST204') {
        console.error('Database schema issue: The workout_blocks table is missing the block_type column.');
        console.error('The table needs a column: block_type workout_block_type');
      }
      return null
    }
  }

  // Get all blocks for a workout template
  static async getWorkoutBlocks(templateId: string): Promise<WorkoutBlock[]> {
    try {
      // Simplified query to only include tables that exist in the current schema
      const { data, error } = await supabase
        .from('workout_blocks')
        .select(`
          *,
          exercises:workout_block_exercises(
            *,
            exercise:exercises(*)
          )
        `)
        .eq('template_id', templateId)
        .order('block_order')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching workout blocks:', error)
      return []
    }
  }

  // Add exercise to a block
  static async addExerciseToBlock(
    blockId: string,
    exerciseId: string,
    exerciseOrder: number,
    exerciseData: Partial<WorkoutBlockExercise>
  ): Promise<WorkoutBlockExercise | null> {
    try {
      // Build insert data object, only including fields that have values
      const insertData: any = {
        block_id: blockId,
        exercise_id: exerciseId,
        exercise_order: exerciseOrder,
      };

      // Only include optional fields if they have values
      if (exerciseData.exercise_letter !== undefined && exerciseData.exercise_letter !== null) {
        insertData.exercise_letter = exerciseData.exercise_letter;
      }
      if (exerciseData.sets !== undefined && exerciseData.sets !== null) {
        insertData.sets = exerciseData.sets;
      }
      if (exerciseData.reps !== undefined && exerciseData.reps !== null && exerciseData.reps !== '') {
        insertData.reps = exerciseData.reps;
      }
      if (exerciseData.weight_kg !== undefined && exerciseData.weight_kg !== null) {
        insertData.weight_kg = exerciseData.weight_kg;
      }
      if (exerciseData.rir !== undefined && exerciseData.rir !== null) {
        insertData.rir = exerciseData.rir;
      }
      if (exerciseData.tempo !== undefined && exerciseData.tempo !== null && exerciseData.tempo !== '') {
        insertData.tempo = exerciseData.tempo;
      }
      if (exerciseData.rest_seconds !== undefined && exerciseData.rest_seconds !== null) {
        insertData.rest_seconds = exerciseData.rest_seconds;
      }
      if (exerciseData.notes !== undefined && exerciseData.notes !== null && exerciseData.notes !== '') {
        insertData.notes = exerciseData.notes;
      }

      const { data, error } = await supabase
        .from('workout_block_exercises')
        .insert(insertData)
        .select(`
          *,
          exercise:exercises(*)
        `)
        .single()

      if (error) {
        console.error('Error adding exercise to block - Full error:', error);
        // Provide helpful error messages for common schema issues
        if (error.code === 'PGRST204') {
          console.error('Column not found. Please check that the workout_block_exercises table has all required columns.');
          console.error('Required columns: block_id, exercise_id, exercise_order');
          console.error('Optional columns: exercise_letter, sets, reps, weight_kg, rir, tempo, rest_seconds, notes');
        }
        throw error;
      }
      return data
    } catch (error: any) {
      console.error('Error adding exercise to block:', error);
      // Log more details for debugging
      if (error?.code === 'PGRST204') {
        console.error('Database schema issue: The workout_block_exercises table may be missing required columns.');
      }
      return null
    }
  }

  // Create drop set configuration
  static async createDropSet(
    blockExerciseId: string,
    dropOrder: number,
    weightKg: number,
    reps: string,
    restSeconds: number = 0
  ): Promise<WorkoutDropSet | null> {
    try {
      const { data, error } = await supabase
        .from('workout_drop_sets')
        .insert({
          block_exercise_id: blockExerciseId,
          drop_order: dropOrder,
          weight_kg: weightKg,
          reps: reps,
          rest_seconds: restSeconds
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating drop set:', error)
      return null
    }
  }

  // Create cluster set configuration
  static async createClusterSet(
    blockExerciseId: string,
    repsPerCluster: number,
    clustersPerSet: number,
    intraClusterRest: number = 15,
    interSetRest: number = 120
  ): Promise<WorkoutClusterSet | null> {
    try {
      const { data, error } = await supabase
        .from('workout_cluster_sets')
        .insert({
          block_exercise_id: blockExerciseId,
          reps_per_cluster: repsPerCluster,
          clusters_per_set: clustersPerSet,
          intra_cluster_rest: intraClusterRest,
          inter_set_rest: interSetRest
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating cluster set:', error)
      return null
    }
  }

  // Create pyramid set configuration
  static async createPyramidSet(
    blockExerciseId: string,
    pyramidOrder: number,
    weightKg: number,
    reps: string,
    restSeconds: number
  ): Promise<WorkoutPyramidSet | null> {
    try {
      const { data, error } = await supabase
        .from('workout_pyramid_sets')
        .insert({
          block_exercise_id: blockExerciseId,
          pyramid_order: pyramidOrder,
          weight_kg: weightKg,
          reps: reps,
          rest_seconds: restSeconds
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating pyramid set:', error)
      return null
    }
  }

  // Create rest-pause set configuration
  static async createRestPauseSet(
    blockExerciseId: string,
    initialWeightKg: number,
    initialReps: number,
    restPauseDuration: number = 15,
    maxRestPauses: number = 3
  ): Promise<WorkoutRestPauseSet | null> {
    try {
      const { data, error } = await supabase
        .from('workout_rest_pause_sets')
        .insert({
          block_exercise_id: blockExerciseId,
          initial_weight_kg: initialWeightKg,
          initial_reps: initialReps,
          rest_pause_duration: restPauseDuration,
          max_rest_pauses: maxRestPauses
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating rest-pause set:', error)
      return null
    }
  }

  // Create time protocol configuration
  static async createTimeProtocol(
    blockId: string,
    protocolType: 'amrap' | 'emom' | 'for_time' | 'ladder',
    protocolData: Partial<WorkoutTimeProtocol>
  ): Promise<WorkoutTimeProtocol | null> {
    try {
      const { data, error } = await supabase
        .from('workout_time_protocols')
        .insert({
          block_id: blockId,
          protocol_type: protocolType,
          total_duration_minutes: protocolData.total_duration_minutes,
          work_seconds: protocolData.work_seconds,
          rest_seconds: protocolData.rest_seconds,
          rounds: protocolData.rounds
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating time protocol:', error)
      return null
    }
  }

  // Create ladder set configuration
  static async createLadderSet(
    blockExerciseId: string,
    ladderOrder: number,
    weightKg: number,
    reps: number,
    restSeconds: number
  ): Promise<WorkoutLadderSet | null> {
    try {
      const { data, error } = await supabase
        .from('workout_ladder_sets')
        .insert({
          block_exercise_id: blockExerciseId,
          ladder_order: ladderOrder,
          weight_kg: weightKg,
          reps: reps,
          rest_seconds: restSeconds
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating ladder set:', error)
      return null
    }
  }

  // Update workout block
  static async updateWorkoutBlock(
    blockId: string,
    updates: Partial<WorkoutBlock>
  ): Promise<WorkoutBlock | null> {
    try {
      const { data, error } = await supabase
        .from('workout_blocks')
        .update(updates)
        .eq('id', blockId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating workout block:', error)
      return null
    }
  }

  // Delete workout block
  static async deleteWorkoutBlock(blockId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('workout_blocks')
        .delete()
        .eq('id', blockId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting workout block:', error)
      return false
    }
  }

  // Reorder workout blocks
  static async reorderWorkoutBlocks(
    templateId: string,
    blockOrders: { blockId: string; newOrder: number }[]
  ): Promise<boolean> {
    try {
      const updates = blockOrders.map(({ blockId, newOrder }) =>
        supabase
          .from('workout_blocks')
          .update({ block_order: newOrder })
          .eq('id', blockId)
          .eq('template_id', templateId)
      )

      await Promise.all(updates)
      return true
    } catch (error) {
      console.error('Error reordering workout blocks:', error)
      return false
    }
  }

  // Get block type specific configuration
  static getBlockTypeConfig(blockType: WorkoutBlockType) {
    const configs = {
      straight_set: {
        name: 'Straight Set',
        description: 'Traditional sets with rest between each set',
        icon: '📋',
        color: 'blue',
        requiresMultipleExercises: false,
        supportsTimeProtocols: false,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsPyramidSets: false,
        supportsRestPause: false,
        supportsLadder: false
      },
      superset: {
        name: 'Superset',
        description: 'Two exercises performed back-to-back with rest after the pair',
        icon: '⚡',
        color: 'orange',
        requiresMultipleExercises: true,
        supportsTimeProtocols: false,
        supportsDropSets: true,
        supportsClusterSets: true,
        supportsPyramidSets: true,
        supportsRestPause: false,
        supportsLadder: false
      },
      giant_set: {
        name: 'Giant Set',
        description: 'Three or more exercises performed back-to-back',
        icon: '🔥',
        color: 'red',
        requiresMultipleExercises: true,
        supportsTimeProtocols: false,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsPyramidSets: false,
        supportsRestPause: false,
        supportsLadder: false
      },
      drop_set: {
        name: 'Drop Set',
        description: 'Reduce weight and continue without rest',
        icon: '📉',
        color: 'purple',
        requiresMultipleExercises: false,
        supportsTimeProtocols: false,
        supportsDropSets: true,
        supportsClusterSets: false,
        supportsPyramidSets: false,
        supportsRestPause: false,
        supportsLadder: false
      },
      cluster_set: {
        name: 'Cluster Set',
        description: 'Short rests between clusters within a set',
        icon: '🔗',
        color: 'indigo',
        requiresMultipleExercises: false,
        supportsTimeProtocols: false,
        supportsDropSets: false,
        supportsClusterSets: true,
        supportsPyramidSets: false,
        supportsRestPause: false,
        supportsLadder: false
      },
      rest_pause: {
        name: 'Rest-Pause Set',
        description: 'Brief rest-pause between efforts with same weight',
        icon: '⏸️',
        color: 'teal',
        requiresMultipleExercises: false,
        supportsTimeProtocols: false,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsPyramidSets: false,
        supportsRestPause: true,
        supportsLadder: false
      },
      pyramid_set: {
        name: 'Pyramid Set',
        description: 'Progressive weight/rep schemes',
        icon: '🔺',
        color: 'green',
        requiresMultipleExercises: false,
        supportsTimeProtocols: false,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsPyramidSets: true,
        supportsRestPause: false,
        supportsLadder: false
      },
      pre_exhaustion: {
        name: 'Pre-Exhaustion',
        description: 'Isolation exercise followed by compound movement',
        icon: '🎯',
        color: 'pink',
        requiresMultipleExercises: true,
        supportsTimeProtocols: false,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsPyramidSets: false,
        supportsRestPause: false,
        supportsLadder: false
      },
      amrap: {
        name: 'AMRAP',
        description: 'As Many Rounds As Possible in given time',
        icon: '🚀',
        color: 'yellow',
        requiresMultipleExercises: false,
        supportsTimeProtocols: true,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsPyramidSets: false,
        supportsRestPause: false,
        supportsLadder: false
      },
      emom: {
        name: 'EMOM',
        description: 'Every Minute On the Minute protocol',
        icon: '⏰',
        color: 'cyan',
        requiresMultipleExercises: false,
        supportsTimeProtocols: true,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsPyramidSets: false,
        supportsRestPause: false,
        supportsLadder: false
      },
      tabata: {
        name: 'Tabata',
        description: '20 seconds work, 10 seconds rest protocol',
        icon: '⚡',
        color: 'amber',
        requiresMultipleExercises: false,
        supportsTimeProtocols: true,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsPyramidSets: false,
        supportsRestPause: false,
        supportsLadder: false
      },
      for_time: {
        name: 'For Time',
        description: 'Complete all exercises as fast as possible',
        icon: '🏃',
        color: 'rose',
        requiresMultipleExercises: false,
        supportsTimeProtocols: true,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsPyramidSets: false,
        supportsRestPause: false,
        supportsLadder: false
      },
      ladder: {
        name: 'Ladder',
        description: 'Ascending or descending rep schemes',
        icon: '🪜',
        color: 'emerald',
        requiresMultipleExercises: false,
        supportsTimeProtocols: false,
        supportsDropSets: false,
        supportsClusterSets: false,
        supportsPyramidSets: false,
        supportsRestPause: false,
        supportsLadder: true
      }
    }

    return configs[blockType] || configs.straight_set
  }

  // Validate block configuration
  static validateBlockConfiguration(
    blockType: WorkoutBlockType,
    blockData: Partial<WorkoutBlock>,
    exercises: WorkoutBlockExercise[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const config = this.getBlockTypeConfig(blockType)

    // Check if multiple exercises are required
    if (config.requiresMultipleExercises && exercises.length < 2) {
      errors.push(`${config.name} requires at least 2 exercises`)
    }

    // Check time-based protocols
    if (config.supportsTimeProtocols && !blockData.duration_seconds) {
      errors.push(`${config.name} requires duration to be specified`)
    }

    // Check specific block types
    switch (blockType) {
      case 'superset':
        if (exercises.length !== 2) {
          errors.push('Superset must have exactly 2 exercises')
        }
        break
      case 'giant_set':
        if (exercises.length < 3) {
          errors.push('Giant set must have at least 3 exercises')
        }
        break
      case 'tabata':
        if (blockData.duration_seconds !== 240) { // 4 minutes total (8 rounds)
          errors.push('Tabata must be exactly 4 minutes (8 rounds)')
        }
        break
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

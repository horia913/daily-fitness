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
      // 1) Fetch blocks first (without exercises - we'll add them based on block type)
      const { data: blocks, error } = await supabase
        .from('workout_blocks')
        .select('*')
        .eq('template_id', templateId)
        .order('block_order')

      if (error) throw error
      if (!blocks || blocks.length === 0) return []

      // 2) Collect IDs for batch queries
      const allBlockIds = blocks.map((b: any) => b.id)

      // If no blocks, return early
      if (allBlockIds.length === 0) return []

      // 3) Run related-table queries in parallel (batched)
      // NOTE: Special tables now use block_id, exercise_id, exercise_order (NOT block_exercise_id)
      const [
        exercisesRes, // workout_block_exercises (ONLY for straight_set, superset, giant_set, pre_exhaustion)
        timeProtocolsRes, // workout_time_protocols (ONLY for amrap, emom, for_time, tabata)
        dropRes, // workout_drop_sets (ONLY for drop_set)
        clusterRes, // workout_cluster_sets (ONLY for cluster_set)
        pyramidRes, // workout_pyramid_sets (deprecated)
        ladderRes, // workout_ladder_sets (deprecated)
        restPauseRes // workout_rest_pause_sets (ONLY for rest_pause)
      ] = await Promise.all([
        supabase.from('workout_block_exercises')
          .select('*, exercise:exercises(id, name, description, video_url)')
          .in('block_id', allBlockIds),
        supabase.from('workout_time_protocols').select('*').in('block_id', allBlockIds),
        supabase.from('workout_drop_sets').select('*').in('block_id', allBlockIds),
        supabase.from('workout_cluster_sets').select('*').in('block_id', allBlockIds),
        supabase.from('workout_pyramid_sets').select('*').in('block_id', allBlockIds),
        supabase.from('workout_ladder_sets').select('*').in('block_id', allBlockIds),
        supabase.from('workout_rest_pause_sets').select('*').in('block_id', allBlockIds)
      ])

      // Fetch exercise details for special tables
      const allExerciseIds = new Set<string>()
      ;(dropRes.data || []).forEach((ds: any) => allExerciseIds.add(ds.exercise_id))
      ;(clusterRes.data || []).forEach((cs: any) => allExerciseIds.add(cs.exercise_id))
      ;(restPauseRes.data || []).forEach((rp: any) => allExerciseIds.add(rp.exercise_id))
      ;(timeProtocolsRes.data || []).forEach((tp: any) => allExerciseIds.add(tp.exercise_id))

      const { data: exercisesData } = await supabase
        .from('exercises')
        .select('id, name, description, video_url')
        .in('id', Array.from(allExerciseIds))

      const exercisesMap = new Map<string, any>()
      ;(exercisesData || []).forEach((ex: any) => {
        exercisesMap.set(ex.id, ex)
      })

      // 4) Build lookup maps
      // Group exercises by block_id (for blocks that use workout_block_exercises)
      const exercisesByBlock = new Map<string, any[]>()
      ;(exercisesRes.data || []).forEach((ex: any) => {
        if (!exercisesByBlock.has(ex.block_id)) {
          exercisesByBlock.set(ex.block_id, [])
        }
        exercisesByBlock.get(ex.block_id)!.push(ex)
      })

      // Time protocols: multiple per block for tabata/circuit, single for others
      const timeProtocolsByBlock = new Map<string, any[]>()
      if (timeProtocolsRes.error) {
        console.error('Error fetching time_protocols:', timeProtocolsRes.error)
      }
      ;(timeProtocolsRes.data || []).forEach((tp: any) => {
        if (!timeProtocolsByBlock.has(tp.block_id)) {
          timeProtocolsByBlock.set(tp.block_id, [])
        }
        timeProtocolsByBlock.get(tp.block_id)!.push(tp)
      })

      // Helper to create composite key for matching: block_id + exercise_id + exercise_order
      const createExerciseKey = (blockId: string, exerciseId: string, exerciseOrder: number) => {
        return `${blockId}:${exerciseId}:${exerciseOrder}`
      }

      // Group special table data by composite key
      const groupByExercise = (arr: any[], tableName: string) => {
        const map = new Map<string, any[]>()
        arr.forEach((row: any) => {
          const k = createExerciseKey(row.block_id, row.exercise_id, row.exercise_order)
          if (!map.has(k)) map.set(k, [])
          map.get(k)!.push(row)
          if (process.env.NODE_ENV !== "production") {
            console.log(`WorkoutBlockService -> Grouping ${tableName}: Key '${k}' with data`, row);
          }
        })
        if (process.env.NODE_ENV !== "production") {
          console.log(`WorkoutBlockService -> ${tableName} Map Keys:`, Array.from(map.keys()));
        }
        return map
      }

      const dropByExercise = groupByExercise(dropRes.data || [], "drop_sets")
      const clusterByExercise = groupByExercise(clusterRes.data || [], "cluster_sets")
      const pyramidByExercise = groupByExercise(pyramidRes.data || [], "pyramid_sets")
      const ladderByExercise = groupByExercise(ladderRes.data || [], "ladder_sets")
      const restPauseByExercise = groupByExercise(restPauseRes.data || [], "rest_pause_sets")

      // 5) Attach exercises to blocks based on block type
      const enriched = (blocks || []).map((block: any) => {
        const blockType = block.block_type
        
        // Attach time protocols (array for circuit/tabata, single for others)
        const blockTimeProtocols = timeProtocolsByBlock.get(block.id) || []
        block.time_protocols = blockTimeProtocols
        block.time_protocol = blockTimeProtocols.length > 0 ? blockTimeProtocols[0] : null // Keep for backward compatibility

        // Determine which table to use based on block type
        const usesBlockExercises = ['straight_set', 'superset', 'giant_set', 'pre_exhaustion'].includes(blockType)
        const usesDropSets = blockType === 'drop_set'
        const usesClusterSets = blockType === 'cluster_set'
        const usesRestPause = blockType === 'rest_pause'
        const usesTimeProtocols = ['amrap', 'emom', 'for_time', 'tabata', 'circuit'].includes(blockType)

        if (usesBlockExercises) {
          // Blocks that use workout_block_exercises
          const blockExercises = exercisesByBlock.get(block.id) || []
          let mappedExercises = blockExercises.map((ex: any) => {
            const exerciseKey = createExerciseKey(block.id, ex.exercise_id, ex.exercise_order)
            return {
              ...ex,
              // Attach special table data for complex blocks (superset, giant_set, pre_exhaustion)
              drop_sets: dropByExercise.get(exerciseKey) || [],
              cluster_sets: clusterByExercise.get(exerciseKey) || [],
              pyramid_sets: pyramidByExercise.get(exerciseKey) || [],
              ladder_sets: ladderByExercise.get(exerciseKey) || [],
              rest_pause_sets: restPauseByExercise.get(exerciseKey) || []
            }
          })
          
          // For giant_set, sort by exercise_letter (A, B, C, D) to ensure correct order
          if (blockType === 'giant_set') {
            mappedExercises = mappedExercises.sort((a, b) => {
              const letterA = a.exercise_letter || "A"
              const letterB = b.exercise_letter || "A"
              return letterA.localeCompare(letterB)
            })
          }
          
          block.exercises = mappedExercises
        } else if (usesDropSets) {
          // drop_set: Create exercises from workout_drop_sets
          const dropSets = dropRes.data?.filter((ds: any) => ds.block_id === block.id) || []
          // Group by exercise_id and exercise_order to create unique exercises
          const exerciseMap = new Map<string, any>()
          dropSets.forEach((ds: any) => {
            const key = `${ds.exercise_id}:${ds.exercise_order}`
            if (!exerciseMap.has(key)) {
              exerciseMap.set(key, {
                id: ds.id, // Use drop_set id as exercise id
                block_id: ds.block_id,
                exercise_id: ds.exercise_id,
                exercise_order: ds.exercise_order,
                exercise: exercisesMap.get(ds.exercise_id) || null,
                sets: block.total_sets,
                reps: block.reps_per_set,
                weight_kg: ds.weight_kg, // From workout_drop_sets (initial weight in drop_order=1)
                load_percentage: ds.load_percentage, // From workout_drop_sets (initial load in drop_order=1)
                drop_sets: dropSets.filter((d: any) => 
                  d.exercise_id === ds.exercise_id && d.exercise_order === ds.exercise_order
                ).sort((a: any, b: any) => a.drop_order - b.drop_order)
              })
            }
          })
          block.exercises = Array.from(exerciseMap.values()).sort((a, b) => a.exercise_order - b.exercise_order)
        } else if (usesClusterSets) {
          // cluster_set: Create exercises from workout_cluster_sets
          const clusterSets = clusterRes.data?.filter((cs: any) => cs.block_id === block.id) || []
          block.exercises = clusterSets.map((cs: any) => ({
            id: cs.id,
            block_id: cs.block_id,
            exercise_id: cs.exercise_id,
            exercise_order: cs.exercise_order,
            exercise: exercisesMap.get(cs.exercise_id) || null,
            sets: block.total_sets,
            reps_per_cluster: cs.reps_per_cluster,
            clusters_per_set: cs.clusters_per_set,
            intra_cluster_rest: cs.intra_cluster_rest,
            rest_seconds: block.rest_seconds, // Inter-set rest from block
            weight_kg: cs.weight_kg, // From workout_cluster_sets
            load_percentage: cs.load_percentage, // From workout_cluster_sets
            cluster_sets: [cs] // Wrap in array for consistency
          })).sort((a, b) => a.exercise_order - b.exercise_order)
        } else if (usesRestPause) {
          // rest_pause: Create exercises from workout_rest_pause_sets
          const restPauseSets = restPauseRes.data?.filter((rp: any) => rp.block_id === block.id) || []
          block.exercises = restPauseSets.map((rp: any) => ({
            id: rp.id,
            block_id: rp.block_id,
            exercise_id: rp.exercise_id,
            exercise_order: rp.exercise_order,
            exercise: exercisesMap.get(rp.exercise_id) || null,
            sets: block.total_sets,
            reps: block.reps_per_set,
            rest_pause_duration: rp.rest_pause_duration,
            max_rest_pauses: rp.max_rest_pauses,
            weight_kg: rp.weight_kg, // From workout_rest_pause_sets
            load_percentage: rp.load_percentage, // From workout_rest_pause_sets
            rest_pause_sets: [rp] // Wrap in array for consistency
          })).sort((a, b) => a.exercise_order - b.exercise_order)
        } else if (usesTimeProtocols) {
          // amrap, emom, for_time, tabata: Create exercises from workout_time_protocols
          const timeProtocols = timeProtocolsByBlock.get(block.id) || []
          // Group by exercise_id and exercise_order to create unique exercises
          const exerciseMap = new Map<string, any>()
          timeProtocols.forEach((tp: any) => {
            const key = `${tp.exercise_id}:${tp.exercise_order}`
            if (!exerciseMap.has(key)) {
              exerciseMap.set(key, {
                id: tp.id,
                block_id: tp.block_id,
                exercise_id: tp.exercise_id,
                exercise_order: tp.exercise_order,
                exercise: exercisesMap.get(tp.exercise_id) || null,
                sets: block.total_sets,
                weight_kg: tp.weight_kg, // From workout_time_protocols
                load_percentage: tp.load_percentage, // From workout_time_protocols (null for tabata)
                // Attach all time protocols for this exercise
                time_protocols: timeProtocols.filter((t: any) => 
                  t.exercise_id === tp.exercise_id && t.exercise_order === tp.exercise_order
                )
              })
            }
          })
          block.exercises = Array.from(exerciseMap.values()).sort((a, b) => a.exercise_order - b.exercise_order)
        } else {
          // Unknown block type - return empty exercises
          block.exercises = []
        }

        return block
      })

      return enriched
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
      if (exerciseData.load_percentage !== undefined && exerciseData.load_percentage !== null) {
        insertData.load_percentage = exerciseData.load_percentage;
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
    blockId: string,
    exerciseId: string,
    exerciseOrder: number,
    dropOrder: number,
    weightKg: number | null | undefined,
    reps: string,
    loadPercentage?: number | null | undefined,
    dropPercentage?: number | null | undefined
    // rest_seconds removed - rest is stored in workout_blocks.rest_seconds
  ): Promise<WorkoutDropSet | null> {
    try {
      const { data, error } = await supabase
        .from('workout_drop_sets')
        .insert({
          block_id: blockId,
          exercise_id: exerciseId,
          exercise_order: exerciseOrder,
          drop_order: dropOrder,
          weight_kg: weightKg ?? null,
          load_percentage: loadPercentage ?? null,
          drop_percentage: dropPercentage ?? null,
          reps: reps
          // rest_seconds was removed from schema
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
    blockId: string,
    exerciseId: string,
    exerciseOrder: number,
    repsPerCluster: number,
    clustersPerSet: number,
    intraClusterRest: number = 15,
    interSetRest: number = 120,
    weightKg?: number | null | undefined,
    loadPercentage?: number | null | undefined
  ): Promise<WorkoutClusterSet | null> {
    try {
      const { data, error } = await supabase
        .from('workout_cluster_sets')
        .insert({
          block_id: blockId,
          exercise_id: exerciseId,
          exercise_order: exerciseOrder,
          reps_per_cluster: repsPerCluster,
          clusters_per_set: clustersPerSet,
          intra_cluster_rest: intraClusterRest,
          inter_set_rest: interSetRest,
          weight_kg: weightKg ?? null,
          load_percentage: loadPercentage ?? null
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
    blockId: string,
    exerciseId: string,
    exerciseOrder: number,
    weightKg: number | null | undefined, // Renamed from initialWeightKg
    // initialReps removed - reps are tracked in workout_blocks table
    restPauseDuration: number = 15,
    maxRestPauses: number = 3,
    loadPercentage?: number | null | undefined
  ): Promise<WorkoutRestPauseSet | null> {
    try {
      const { data, error } = await supabase
        .from('workout_rest_pause_sets')
        .insert({
          block_id: blockId,
          exercise_id: exerciseId,
          exercise_order: exerciseOrder,
          weight_kg: weightKg ?? null, // Column renamed from initial_weight_kg to weight_kg
          load_percentage: loadPercentage ?? null,
          // initial_reps was removed from schema
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

  // Create time protocol configuration (one per exercise)
  static async createTimeProtocol(
    blockId: string,
    exerciseId: string,
    exerciseOrder: number,
    protocolType: 'amrap' | 'emom' | 'for_time' | 'tabata' | 'circuit',
    protocolData: Partial<WorkoutTimeProtocol>
  ): Promise<WorkoutTimeProtocol | null> {
    try {
      // Build insert object - only include fields that are defined (not undefined)
      const insertData: any = {
        block_id: blockId,
        exercise_id: exerciseId,
        exercise_order: exerciseOrder,
        protocol_type: protocolType,
      };

      // Only add fields that are defined (not undefined)
      if (protocolData.total_duration_minutes !== undefined) insertData.total_duration_minutes = protocolData.total_duration_minutes;
      if (protocolData.work_seconds !== undefined) insertData.work_seconds = protocolData.work_seconds;
      if (protocolData.rest_seconds !== undefined) insertData.rest_seconds = protocolData.rest_seconds;
      if (protocolData.rest_after_set !== undefined) insertData.rest_after_set = protocolData.rest_after_set;
      if (protocolData.rounds !== undefined) insertData.rounds = protocolData.rounds;
      if (protocolData.reps_per_round !== undefined) insertData.reps_per_round = protocolData.reps_per_round;
      if (protocolData.set !== undefined) insertData.set = protocolData.set;
      insertData.weight_kg = protocolData.weight_kg ?? null;
      insertData.load_percentage = protocolData.load_percentage ?? null;
      
      // Protocol-specific fields (only add for relevant protocol types)
      // target_reps: for for_time and amrap
      if ((protocolType === 'for_time' || protocolType === 'amrap') && protocolData.target_reps !== undefined && protocolData.target_reps !== null) {
        insertData.target_reps = protocolData.target_reps;
      }
      
      // time_cap_minutes: for for_time only
      if (protocolType === 'for_time' && protocolData.time_cap_minutes !== undefined) {
        insertData.time_cap_minutes = protocolData.time_cap_minutes;
      }
      
      // emom_mode: for emom only
      if (protocolType === 'emom' && protocolData.emom_mode !== undefined) {
        insertData.emom_mode = protocolData.emom_mode;
      }

      const { data, error } = await supabase
        .from('workout_time_protocols')
        .insert(insertData)
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

  // Delete all special table data for a block (helper for updates)
  static async deleteBlockSpecialData(blockId: string): Promise<void> {
    // Delete all special table data that references this block
    await supabase.from('workout_block_exercises').delete().eq('block_id', blockId);
    await supabase.from('workout_drop_sets').delete().eq('block_id', blockId);
    await supabase.from('workout_cluster_sets').delete().eq('block_id', blockId);
    await supabase.from('workout_rest_pause_sets').delete().eq('block_id', blockId);
    await supabase.from('workout_pyramid_sets').delete().eq('block_id', blockId);
    await supabase.from('workout_ladder_sets').delete().eq('block_id', blockId);
    await supabase.from('workout_time_protocols').delete().eq('block_id', blockId);
  }

  // Delete workout block (and all related special table data)
  static async deleteWorkoutBlock(blockId: string): Promise<boolean> {
    try {
      // First, delete all special table data that references this block
      // This must be done before deleting the block due to foreign key constraints
      await this.deleteBlockSpecialData(blockId);

      // Now delete the block itself
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

    return configs[blockType as keyof typeof configs] || configs.straight_set
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

-- ============================================================================
-- Migration: Special Set Tables Indexes
-- Purpose: Add indexes on block_id for all special set tables to prevent timeouts
-- 
-- CRITICAL: These tables are queried with .in('block_id', [...]) and without
-- indexes, Postgres does sequential scans causing statement timeouts.
-- ============================================================================

-- ============================================================================
-- INDEX 1: workout_drop_sets (block_id)
-- Supports: WorkoutBlockService queries for drop_set blocks
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_drop_sets_block 
ON workout_drop_sets (block_id);

-- ============================================================================
-- INDEX 2: workout_cluster_sets (block_id)
-- Supports: WorkoutBlockService queries for cluster_set blocks
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_cluster_sets_block 
ON workout_cluster_sets (block_id);

-- ============================================================================
-- INDEX 3: workout_rest_pause_sets (block_id)
-- Supports: WorkoutBlockService queries for rest_pause blocks
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_rest_pause_sets_block 
ON workout_rest_pause_sets (block_id);

-- ============================================================================
-- INDEX 4: workout_pyramid_sets (block_id)
-- Supports: WorkoutBlockService queries for pyramid_set blocks
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_pyramid_sets_block 
ON workout_pyramid_sets (block_id);

-- ============================================================================
-- INDEX 5: workout_ladder_sets (block_id)
-- Supports: WorkoutBlockService queries for ladder blocks
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_ladder_sets_block 
ON workout_ladder_sets (block_id);

-- ============================================================================
-- INDEX 6: workout_time_protocols (block_id)
-- Supports: WorkoutBlockService queries for tabata/amrap/emom/for_time/circuit blocks
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_time_protocols_block 
ON workout_time_protocols (block_id);

-- ============================================================================
-- INDEX 7: workout_hr_sets (block_id)
-- Supports: WorkoutBlockService queries for hr_sets blocks
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_hr_sets_block 
ON workout_hr_sets (block_id);

-- ============================================================================
-- INDEX 8: workout_time_protocols (exercise_id)
-- Supports: queries that filter by exercise_id
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_time_protocols_exercise 
ON workout_time_protocols (exercise_id);

-- ============================================================================
-- INDEX 9: workout_drop_sets (exercise_id)
-- Supports: queries that filter by exercise_id
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_drop_sets_exercise 
ON workout_drop_sets (exercise_id);

-- ============================================================================
-- INDEX 10: workout_cluster_sets (exercise_id)
-- Supports: queries that filter by exercise_id
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_cluster_sets_exercise 
ON workout_cluster_sets (exercise_id);

-- ============================================================================
-- INDEX 11: workout_rest_pause_sets (exercise_id)
-- Supports: queries that filter by exercise_id
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_rest_pause_sets_exercise 
ON workout_rest_pause_sets (exercise_id);

-- ============================================================================
-- INDEX 12: workout_block_exercises (block_id) - CRITICAL FOR PERFORMANCE
-- Supports: WorkoutBlockService queries with .in('block_id', [...])
-- This is the MOST IMPORTANT index - without it, queries timeout!
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_block_exercises_block 
ON workout_block_exercises (block_id);

-- ============================================================================
-- INDEX 13: workout_block_exercises (exercise_id)
-- Supports: queries that filter/join by exercise_id
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_workout_block_exercises_exercise 
ON workout_block_exercises (exercise_id);

-- ============================================================================
-- VERIFICATION QUERY
-- Run after migration to verify indexes exist:
-- ============================================================================
-- SELECT indexname, tablename 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
--   AND (
--     indexname LIKE 'idx_workout_drop_sets%' OR
--     indexname LIKE 'idx_workout_cluster_sets%' OR
--     indexname LIKE 'idx_workout_rest_pause_sets%' OR
--     indexname LIKE 'idx_workout_pyramid_sets%' OR
--     indexname LIKE 'idx_workout_ladder_sets%' OR
--     indexname LIKE 'idx_workout_time_protocols%' OR
--     indexname LIKE 'idx_workout_hr_sets%' OR
--     indexname LIKE 'idx_workout_block_exercises%'
--   )
-- ORDER BY tablename, indexname;

-- ============================================================================
-- Migration: Client Workout Block Exercises JSON to Relational
-- Purpose: Verify if client_workout_block_exercises JSON columns are needed
--          or if existing relational tables can be used
-- ============================================================================

-- Step 1: Analyze JSON column usage
-- ============================================================================

SELECT 
  column_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN column_name = 'drop_sets' THEN drop_sets END) as rows_with_drop_sets,
  COUNT(CASE WHEN column_name = 'cluster_sets' THEN cluster_sets END) as rows_with_cluster_sets,
  COUNT(CASE WHEN column_name = 'pyramid_sets' THEN pyramid_sets END) as rows_with_pyramid_sets,
  COUNT(CASE WHEN column_name = 'ladder_sets' THEN ladder_sets END) as rows_with_ladder_sets,
  COUNT(CASE WHEN column_name = 'rest_pause_sets' THEN rest_pause_sets END) as rows_with_rest_pause_sets,
  COUNT(CASE WHEN column_name = 'amrap_config' THEN amrap_config END) as rows_with_amrap_config,
  COUNT(CASE WHEN column_name = 'emom_config' THEN emom_config END) as rows_with_emom_config,
  COUNT(CASE WHEN column_name = 'tabata_config' THEN tabata_config END) as rows_with_tabata_config,
  COUNT(CASE WHEN column_name = 'circuit_config' THEN circuit_config END) as rows_with_circuit_config
FROM client_workout_block_exercises,
  (VALUES 
    ('drop_sets'), ('cluster_sets'), ('pyramid_sets'), ('ladder_sets'),
    ('rest_pause_sets'), ('amrap_config'), ('emom_config'), ('tabata_config'), ('circuit_config')
  ) AS cols(column_name)
GROUP BY column_name;

-- Check if corresponding relational tables exist and can be used
SELECT 
  'workout_drop_sets' as table_name,
  COUNT(*) as row_count,
  'Can be used for client workouts' as note
FROM workout_drop_sets
UNION ALL
SELECT 
  'workout_cluster_sets',
  COUNT(*),
  'Can be used for client workouts'
FROM workout_cluster_sets
UNION ALL
SELECT 
  'workout_pyramid_sets',
  COUNT(*),
  'Can be used for client workouts'
FROM workout_pyramid_sets
UNION ALL
SELECT 
  'workout_ladder_sets',
  COUNT(*),
  'Can be used for client workouts'
FROM workout_ladder_sets
UNION ALL
SELECT 
  'workout_rest_pause_sets',
  COUNT(*),
  'Can be used for client workouts'
FROM workout_rest_pause_sets
UNION ALL
SELECT 
  'workout_time_protocols',
  COUNT(*),
  'Can be used for client workouts (amrap, emom, tabata, circuit)'
FROM workout_time_protocols;

-- Step 2: Decision Analysis
-- ============================================================================

-- Investigation Results:
-- All JSON columns in client_workout_block_exercises are NULL (0 rows with data):
-- - drop_sets: 0 rows with data
-- - cluster_sets: 0 rows with data
-- - pyramid_sets: 0 rows with data
-- - ladder_sets: 0 rows with data
-- - rest_pause_sets: 0 rows with data
-- - amrap_config: 0 rows with data
-- - emom_config: 0 rows with data
-- - tabata_config: 0 rows with data
-- - circuit_config: 0 rows with data
--
-- The existing relational tables (workout_drop_sets, workout_cluster_sets, etc.)
-- can be used for client workouts by linking them to client_workout_blocks
-- via the block_id relationship.

-- Recommendation: 
-- 1. Use existing relational tables with client_workout_blocks.block_id
-- 2. Mark JSON columns in client_workout_block_exercises as deprecated
-- 3. No migration needed (all columns are NULL)

-- Step 3: Add deprecation comments
-- ============================================================================

COMMENT ON COLUMN client_workout_block_exercises.drop_sets IS 
  'DEPRECATED: Use workout_drop_sets table linked via client_workout_blocks.block_id';

COMMENT ON COLUMN client_workout_block_exercises.cluster_sets IS 
  'DEPRECATED: Use workout_cluster_sets table linked via client_workout_blocks.block_id';

COMMENT ON COLUMN client_workout_block_exercises.pyramid_sets IS 
  'DEPRECATED: Use workout_pyramid_sets table linked via client_workout_blocks.block_id';

COMMENT ON COLUMN client_workout_block_exercises.ladder_sets IS 
  'DEPRECATED: Use workout_ladder_sets table linked via client_workout_blocks.block_id';

COMMENT ON COLUMN client_workout_block_exercises.rest_pause_sets IS 
  'DEPRECATED: Use workout_rest_pause_sets table linked via client_workout_blocks.block_id';

COMMENT ON COLUMN client_workout_block_exercises.amrap_config IS 
  'DEPRECATED: Use workout_time_protocols table linked via client_workout_blocks.block_id';

COMMENT ON COLUMN client_workout_block_exercises.emom_config IS 
  'DEPRECATED: Use workout_time_protocols table linked via client_workout_blocks.block_id';

COMMENT ON COLUMN client_workout_block_exercises.tabata_config IS 
  'DEPRECATED: Use workout_time_protocols table linked via client_workout_blocks.block_id';

COMMENT ON COLUMN client_workout_block_exercises.circuit_config IS 
  'DEPRECATED: Use workout_time_protocols table linked via client_workout_blocks.block_id';

-- NOTE: If there is existing JSON data that needs to be migrated, 
-- create a separate migration script after analyzing the JSON structure


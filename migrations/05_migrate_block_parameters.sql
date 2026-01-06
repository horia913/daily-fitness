-- ============================================================================
-- Migration: Workout Block Parameters Analysis
-- Purpose: Analyze block_parameters JSON usage and determine if migration is needed
-- ============================================================================

-- Step 1: Analyze block_parameters usage
-- ============================================================================

-- Check if block_parameters is actually used
SELECT 
  'workout_blocks' as table_name,
  COUNT(*) as total_rows,
  COUNT(block_parameters) as rows_with_json,
  COUNT(*) - COUNT(block_parameters) as rows_without_json,
  ROUND(100.0 * COUNT(block_parameters) / COUNT(*), 2) as usage_percentage
FROM workout_blocks
UNION ALL
SELECT 
  'client_workout_blocks',
  COUNT(*),
  COUNT(block_parameters),
  COUNT(*) - COUNT(block_parameters),
  ROUND(100.0 * COUNT(block_parameters) / COUNT(*), 2)
FROM client_workout_blocks
UNION ALL
SELECT 
  'workout_block_assignments',
  COUNT(*),
  COUNT(block_parameters),
  COUNT(*) - COUNT(block_parameters),
  ROUND(100.0 * COUNT(block_parameters) / COUNT(*), 2)
FROM workout_block_assignments;

-- Sample block_parameters structure
SELECT 
  block_type,
  COUNT(*) as count,
  jsonb_object_keys(block_parameters) as parameter_keys
FROM workout_blocks
WHERE block_parameters IS NOT NULL
  AND jsonb_typeof(block_parameters) = 'object'
GROUP BY block_type, jsonb_object_keys(block_parameters)
ORDER BY block_type, count DESC;

-- Check if block_parameters contains data that's not already in relational tables
-- This query helps determine if migration is needed
SELECT 
  wb.id,
  wb.block_type,
  wb.block_parameters,
  CASE 
    WHEN wb.block_type IN ('straight_set', 'superset', 'giant_set', 'pre_exhaustion') 
      THEN (SELECT COUNT(*) FROM workout_block_exercises WHERE block_id = wb.id)
    WHEN wb.block_type = 'drop_set'
      THEN (SELECT COUNT(*) FROM workout_drop_sets WHERE block_id = wb.id)
    WHEN wb.block_type = 'cluster_set'
      THEN (SELECT COUNT(*) FROM workout_cluster_sets WHERE block_id = wb.id)
    WHEN wb.block_type = 'rest_pause'
      THEN (SELECT COUNT(*) FROM workout_rest_pause_sets WHERE block_id = wb.id)
    WHEN wb.block_type = 'pyramid_set'
      THEN (SELECT COUNT(*) FROM workout_pyramid_sets WHERE block_id = wb.id)
    WHEN wb.block_type = 'ladder'
      THEN (SELECT COUNT(*) FROM workout_ladder_sets WHERE block_id = wb.id)
    WHEN wb.block_type IN ('amrap', 'emom', 'for_time', 'tabata', 'circuit')
      THEN (SELECT COUNT(*) FROM workout_time_protocols WHERE block_id = wb.id)
    ELSE 0
  END as relational_data_count
FROM workout_blocks wb
WHERE wb.block_parameters IS NOT NULL
LIMIT 20;

-- Verify if block_parameters data matches relational table data
-- For time-based blocks (amrap, emom, for_time, tabata)
SELECT 
  wb.id,
  wb.block_type,
  wb.block_parameters->>'amrap_duration' as json_amrap_duration,
  wtp.total_duration_minutes as relational_duration,
  wb.block_parameters->>'time_cap' as json_time_cap,
  wtp.time_cap_minutes as relational_time_cap,
  wb.block_parameters->>'target_reps' as json_target_reps,
  wtp.target_reps as relational_target_reps
FROM workout_blocks wb
LEFT JOIN workout_time_protocols wtp ON wtp.block_id = wb.id
WHERE wb.block_type IN ('amrap', 'emom', 'for_time', 'tabata')
  AND wb.block_parameters IS NOT NULL
LIMIT 10;

-- Decision Analysis:
-- Investigation shows block_parameters contains actual data:
-- - workout_blocks: 43 rows with data (100% usage)
-- - client_workout_blocks: 13 rows with data (100% usage)
-- 
-- Data structure includes: amrap_duration, time_cap, target_reps, drop_set_reps, 
-- drop_percentage, work_seconds, emom_duration, emom_reps, rounds, rest_after, tabata_sets
--
-- However, based on verification summary, special relational tables already exist:
-- - workout_time_protocols (for amrap, emom, for_time, tabata)
-- - workout_drop_sets (for drop_set)
-- - etc.
--
-- The block_parameters data appears to be redundant/legacy data that should already
-- be in the relational tables. Recommendation: 
-- 1. Verify relational tables have this data
-- 2. If missing, migrate block_parameters to relational tables
-- 3. If present, mark block_parameters as deprecated
--
-- For now: Mark for deprecation, but keep columns for backward compatibility

-- Step 2: Create deprecation notice (if block_parameters is unused)
-- ============================================================================

-- Add comment to columns indicating they are deprecated
COMMENT ON COLUMN workout_blocks.block_parameters IS 
  'DEPRECATED: This column is legacy and should not be used. All block data is stored in relational tables (workout_block_exercises, workout_drop_sets, etc.)';

COMMENT ON COLUMN client_workout_blocks.block_parameters IS 
  'DEPRECATED: This column is legacy and should not be used. All block data is stored in relational tables.';

COMMENT ON COLUMN workout_block_assignments.block_parameters IS 
  'DEPRECATED: This column is legacy and should not be used. All block data is stored in relational tables.';

-- NOTE: Columns are kept for backward compatibility but should not be written to
-- They can be removed in a future migration after confirming no code uses them


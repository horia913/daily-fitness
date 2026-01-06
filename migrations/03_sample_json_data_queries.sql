-- ============================================================================
-- Sample JSON Data Queries
-- Purpose: Extract sample data from each JSON column to understand structure
-- Run these queries AFTER running 01_json_column_inventory.sql to get table/column names
-- ============================================================================

-- ============================================================================
-- EXERCISES TABLE JSON COLUMNS
-- ============================================================================

-- Sample muscle_groups data
SELECT 
  id,
  name,
  muscle_groups,
  jsonb_typeof(muscle_groups) as json_type,
  jsonb_array_length(muscle_groups) as array_length
FROM exercises
WHERE muscle_groups IS NOT NULL
  AND jsonb_typeof(muscle_groups) = 'array'
LIMIT 10;

-- Sample equipment_types data
SELECT 
  id,
  name,
  equipment_types,
  jsonb_typeof(equipment_types) as json_type,
  jsonb_array_length(equipment_types) as array_length
FROM exercises
WHERE equipment_types IS NOT NULL
  AND jsonb_typeof(equipment_types) = 'array'
LIMIT 10;

-- Sample instructions data
SELECT 
  id,
  name,
  instructions,
  jsonb_typeof(instructions) as json_type,
  jsonb_array_length(instructions) as array_length
FROM exercises
WHERE instructions IS NOT NULL
  AND jsonb_typeof(instructions) = 'array'
LIMIT 10;

-- Sample tips data
SELECT 
  id,
  name,
  tips,
  jsonb_typeof(tips) as json_type,
  jsonb_array_length(tips) as array_length
FROM exercises
WHERE tips IS NOT NULL
  AND jsonb_typeof(tips) = 'array'
LIMIT 10;

-- ============================================================================
-- WORKOUT BLOCKS JSON COLUMNS
-- ============================================================================

-- Sample block_parameters from workout_blocks
SELECT 
  id,
  template_id,
  block_type,
  block_order,
  block_parameters,
  jsonb_typeof(block_parameters) as json_type,
  jsonb_object_keys(block_parameters) as parameter_keys
FROM workout_blocks
WHERE block_parameters IS NOT NULL
  AND jsonb_typeof(block_parameters) = 'object'
LIMIT 10;

-- Sample block_parameters from client_workout_blocks
SELECT 
  id,
  client_id,
  workout_assignment_id,
  block_type,
  block_order,
  block_parameters,
  jsonb_typeof(block_parameters) as json_type
FROM client_workout_blocks
WHERE block_parameters IS NOT NULL
LIMIT 10;

-- Sample block_parameters from workout_block_assignments
SELECT 
  id,
  workout_assignment_id,
  block_order,
  block_parameters,
  jsonb_typeof(block_parameters) as json_type
FROM workout_block_assignments
WHERE block_parameters IS NOT NULL
LIMIT 10;

-- ============================================================================
-- CLIENT WORKOUT BLOCK EXERCISES JSON COLUMNS
-- ============================================================================

-- Sample drop_sets data
SELECT 
  id,
  client_block_id,
  exercise_id,
  exercise_order,
  drop_sets,
  jsonb_typeof(drop_sets) as json_type
FROM client_workout_block_exercises
WHERE drop_sets IS NOT NULL
LIMIT 5;

-- Sample cluster_sets data
SELECT 
  id,
  client_block_id,
  exercise_id,
  exercise_order,
  cluster_sets,
  jsonb_typeof(cluster_sets) as json_type
FROM client_workout_block_exercises
WHERE cluster_sets IS NOT NULL
LIMIT 5;

-- Sample pyramid_sets data
SELECT 
  id,
  client_block_id,
  exercise_id,
  exercise_order,
  pyramid_sets,
  jsonb_typeof(pyramid_sets) as json_type
FROM client_workout_block_exercises
WHERE pyramid_sets IS NOT NULL
LIMIT 5;

-- Sample ladder_sets data
SELECT 
  id,
  client_block_id,
  exercise_id,
  exercise_order,
  ladder_sets,
  jsonb_typeof(ladder_sets) as json_type
FROM client_workout_block_exercises
WHERE ladder_sets IS NOT NULL
LIMIT 5;

-- Sample rest_pause_sets data
SELECT 
  id,
  client_block_id,
  exercise_id,
  exercise_order,
  rest_pause_sets,
  jsonb_typeof(rest_pause_sets) as json_type
FROM client_workout_block_exercises
WHERE rest_pause_sets IS NOT NULL
LIMIT 5;

-- Sample amrap_config data
SELECT 
  id,
  client_block_id,
  exercise_id,
  exercise_order,
  amrap_config,
  jsonb_typeof(amrap_config) as json_type
FROM client_workout_block_exercises
WHERE amrap_config IS NOT NULL
LIMIT 5;

-- Sample emom_config data
SELECT 
  id,
  client_block_id,
  exercise_id,
  exercise_order,
  emom_config,
  jsonb_typeof(emom_config) as json_type
FROM client_workout_block_exercises
WHERE emom_config IS NOT NULL
LIMIT 5;

-- Sample tabata_config data
SELECT 
  id,
  client_block_id,
  exercise_id,
  exercise_order,
  tabata_config,
  jsonb_typeof(tabata_config) as json_type
FROM client_workout_block_exercises
WHERE tabata_config IS NOT NULL
LIMIT 5;

-- Sample circuit_config data
SELECT 
  id,
  client_block_id,
  exercise_id,
  exercise_order,
  circuit_config,
  jsonb_typeof(circuit_config) as json_type
FROM client_workout_block_exercises
WHERE circuit_config IS NOT NULL
LIMIT 5;

-- ============================================================================
-- WORKOUT LOGS JSON COLUMNS
-- ============================================================================

-- Sample completed_sets from workout_exercise_logs
SELECT 
  id,
  workout_log_id,
  exercise_id,
  exercise_order,
  completed_sets,
  jsonb_typeof(completed_sets) as json_type,
  CASE 
    WHEN jsonb_typeof(completed_sets) = 'array' 
    THEN jsonb_array_length(completed_sets)
    ELSE NULL
  END as array_length
FROM workout_exercise_logs
WHERE completed_sets IS NOT NULL
LIMIT 10;

-- Sample giant_set_exercises from workout_set_logs
SELECT 
  id,
  workout_log_id,
  block_type,
  giant_set_exercises,
  jsonb_typeof(giant_set_exercises) as json_type,
  CASE 
    WHEN jsonb_typeof(giant_set_exercises) = 'array' 
    THEN jsonb_array_length(giant_set_exercises)
    ELSE NULL
  END as array_length
FROM workout_set_logs
WHERE giant_set_exercises IS NOT NULL
LIMIT 10;

-- ============================================================================
-- DAILY WORKOUT CACHE JSON COLUMN
-- ============================================================================

-- Sample workout_data from daily_workout_cache
SELECT 
  id,
  client_id,
  program_id,
  workout_date,
  jsonb_typeof(workout_data) as json_type,
  jsonb_object_keys(workout_data) as data_keys
FROM daily_workout_cache
WHERE workout_data IS NOT NULL
LIMIT 5;

-- ============================================================================
-- STATISTICS: Count non-null JSON values per column
-- ============================================================================

SELECT 
  'exercises.muscle_groups' as column_path,
  COUNT(*) as total_rows,
  COUNT(muscle_groups) as non_null_count,
  COUNT(*) - COUNT(muscle_groups) as null_count
FROM exercises
UNION ALL
SELECT 
  'exercises.equipment_types',
  COUNT(*),
  COUNT(equipment_types),
  COUNT(*) - COUNT(equipment_types)
FROM exercises
UNION ALL
SELECT 
  'exercises.instructions',
  COUNT(*),
  COUNT(instructions),
  COUNT(*) - COUNT(instructions)
FROM exercises
UNION ALL
SELECT 
  'exercises.tips',
  COUNT(*),
  COUNT(tips),
  COUNT(*) - COUNT(tips)
FROM exercises
UNION ALL
SELECT 
  'workout_blocks.block_parameters',
  COUNT(*),
  COUNT(block_parameters),
  COUNT(*) - COUNT(block_parameters)
FROM workout_blocks
UNION ALL
SELECT 
  'client_workout_blocks.block_parameters',
  COUNT(*),
  COUNT(block_parameters),
  COUNT(*) - COUNT(block_parameters)
FROM client_workout_blocks
UNION ALL
SELECT 
  'workout_block_assignments.block_parameters',
  COUNT(*),
  COUNT(block_parameters),
  COUNT(*) - COUNT(block_parameters)
FROM workout_block_assignments
UNION ALL
SELECT 
  'client_workout_block_exercises.drop_sets',
  COUNT(*),
  COUNT(drop_sets),
  COUNT(*) - COUNT(drop_sets)
FROM client_workout_block_exercises
UNION ALL
SELECT 
  'client_workout_block_exercises.cluster_sets',
  COUNT(*),
  COUNT(cluster_sets),
  COUNT(*) - COUNT(cluster_sets)
FROM client_workout_block_exercises
UNION ALL
SELECT 
  'client_workout_block_exercises.pyramid_sets',
  COUNT(*),
  COUNT(pyramid_sets),
  COUNT(*) - COUNT(pyramid_sets)
FROM client_workout_block_exercises
UNION ALL
SELECT 
  'client_workout_block_exercises.ladder_sets',
  COUNT(*),
  COUNT(ladder_sets),
  COUNT(*) - COUNT(ladder_sets)
FROM client_workout_block_exercises
UNION ALL
SELECT 
  'client_workout_block_exercises.rest_pause_sets',
  COUNT(*),
  COUNT(rest_pause_sets),
  COUNT(*) - COUNT(rest_pause_sets)
FROM client_workout_block_exercises
UNION ALL
SELECT 
  'client_workout_block_exercises.amrap_config',
  COUNT(*),
  COUNT(amrap_config),
  COUNT(*) - COUNT(amrap_config)
FROM client_workout_block_exercises
UNION ALL
SELECT 
  'client_workout_block_exercises.emom_config',
  COUNT(*),
  COUNT(emom_config),
  COUNT(*) - COUNT(emom_config)
FROM client_workout_block_exercises
UNION ALL
SELECT 
  'client_workout_block_exercises.tabata_config',
  COUNT(*),
  COUNT(tabata_config),
  COUNT(*) - COUNT(tabata_config)
FROM client_workout_block_exercises
UNION ALL
SELECT 
  'client_workout_block_exercises.circuit_config',
  COUNT(*),
  COUNT(circuit_config),
  COUNT(*) - COUNT(circuit_config)
FROM client_workout_block_exercises
UNION ALL
SELECT 
  'workout_exercise_logs.completed_sets',
  COUNT(*),
  COUNT(completed_sets),
  COUNT(*) - COUNT(completed_sets)
FROM workout_exercise_logs
UNION ALL
SELECT 
  'workout_set_logs.giant_set_exercises',
  COUNT(*),
  COUNT(giant_set_exercises),
  COUNT(*) - COUNT(giant_set_exercises)
FROM workout_set_logs
UNION ALL
SELECT 
  'daily_workout_cache.workout_data',
  COUNT(*),
  COUNT(workout_data),
  COUNT(*) - COUNT(workout_data)
FROM daily_workout_cache;


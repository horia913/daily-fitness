-- ============================================================
-- MIGRATION: Move data from block_parameters to individual tables
-- ============================================================
-- This migrates data from workout_blocks.block_parameters (JSONB)
-- to workout_time_protocols, workout_drop_sets, etc.
-- Uses workout_block_exercises to get exercise_id and exercise_order

-- ============================================================
-- 1. MIGRATE AMRAP blocks
-- ============================================================
-- Create workout_time_protocols records for each exercise in AMRAP blocks
INSERT INTO workout_time_protocols (
  block_id,
  exercise_id,
  exercise_order,
  protocol_type,
  total_duration_minutes,
  reps_per_round
)
SELECT 
  wb.id as block_id,
  wbe.exercise_id,
  wbe.exercise_order,
  'amrap' as protocol_type,
  (wb.block_parameters->>'amrap_duration')::integer as total_duration_minutes,
  (wb.block_parameters->>'target_reps')::integer as reps_per_round
FROM workout_blocks wb
INNER JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
WHERE wb.block_type = 'amrap'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters->>'amrap_duration' IS NOT NULL
  AND NOT EXISTS (
    -- Don't insert if record already exists
    SELECT 1 FROM workout_time_protocols tp 
    WHERE tp.block_id = wb.id 
      AND tp.exercise_id = wbe.exercise_id 
      AND tp.exercise_order = wbe.exercise_order
  );

-- ============================================================
-- 2. MIGRATE FOR_TIME blocks
-- ============================================================
INSERT INTO workout_time_protocols (
  block_id,
  exercise_id,
  exercise_order,
  protocol_type,
  total_duration_minutes,
  reps_per_round
)
SELECT 
  wb.id as block_id,
  wbe.exercise_id,
  wbe.exercise_order,
  'for_time' as protocol_type,
  (wb.block_parameters->>'time_cap')::integer as total_duration_minutes,
  (wb.block_parameters->>'target_reps')::integer as reps_per_round
FROM workout_blocks wb
INNER JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
WHERE wb.block_type = 'for_time'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters->>'time_cap' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM workout_time_protocols tp 
    WHERE tp.block_id = wb.id 
      AND tp.exercise_id = wbe.exercise_id 
      AND tp.exercise_order = wbe.exercise_order
  );

-- ============================================================
-- 3. MIGRATE EMOM blocks
-- ============================================================
INSERT INTO workout_time_protocols (
  block_id,
  exercise_id,
  exercise_order,
  protocol_type,
  total_duration_minutes,
  work_seconds,
  rest_seconds,
  reps_per_round
)
SELECT 
  wb.id as block_id,
  wbe.exercise_id,
  wbe.exercise_order,
  'emom' as protocol_type,
  (wb.block_parameters->>'emom_duration')::integer as total_duration_minutes,
  CASE 
    WHEN wb.block_parameters->>'work_seconds' IS NOT NULL 
    THEN (wb.block_parameters->>'work_seconds')::integer 
    ELSE NULL 
  END as work_seconds,
  CASE 
    WHEN wb.block_parameters->>'rest_after' IS NOT NULL 
    THEN (wb.block_parameters->>'rest_after')::integer 
    ELSE NULL 
  END as rest_seconds,
  CASE 
    WHEN wb.block_parameters->>'emom_reps' IS NOT NULL 
    THEN (wb.block_parameters->>'emom_reps')::integer 
    ELSE NULL 
  END as reps_per_round
FROM workout_blocks wb
INNER JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
WHERE wb.block_type = 'emom'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters->>'emom_duration' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM workout_time_protocols tp 
    WHERE tp.block_id = wb.id 
      AND tp.exercise_id = wbe.exercise_id 
      AND tp.exercise_order = wbe.exercise_order
  );

-- ============================================================
-- 4. MIGRATE DROP_SET blocks
-- ============================================================
INSERT INTO workout_drop_sets (
  block_id,
  exercise_id,
  exercise_order,
  drop_order,
  reps
)
SELECT 
  wb.id as block_id,
  wbe.exercise_id,
  wbe.exercise_order,
  1 as drop_order, -- First drop
  wb.block_parameters->>'drop_set_reps' as reps
FROM workout_blocks wb
INNER JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
WHERE wb.block_type = 'drop_set'
  AND wb.block_parameters IS NOT NULL
  AND (
    wb.block_parameters->>'drop_percentage' IS NOT NULL 
    OR wb.block_parameters->>'drop_set_reps' IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM workout_drop_sets ds 
    WHERE ds.block_id = wb.id 
      AND ds.exercise_id = wbe.exercise_id 
      AND ds.exercise_order = wbe.exercise_order
  );

-- ============================================================
-- 5. MIGRATE TABATA blocks
-- ============================================================
-- Tabata has tabata_sets array, each set has exercises array
-- We need to create one time_protocol record per exercise
INSERT INTO workout_time_protocols (
  block_id,
  exercise_id,
  exercise_order,
  protocol_type,
  work_seconds,
  rest_seconds,
  rounds,
  reps_per_round
)
SELECT 
  wb.id as block_id,
  (exercise_data->>'exercise_id')::uuid as exercise_id,
  COALESCE((exercise_data->>'order')::integer, exercise_order) as exercise_order,
  'tabata' as protocol_type,
  COALESCE(
    (exercise_data->>'work_seconds')::integer,
    (wb.block_parameters->>'work_seconds')::integer,
    20
  ) as work_seconds,
  COALESCE(
    (exercise_data->>'rest_seconds')::integer,
    (set_data->>'rest_between_sets')::integer,
    (wb.block_parameters->>'rest_after')::integer,
    10
  ) as rest_seconds,
  COALESCE((wb.block_parameters->>'rounds')::integer, 8) as rounds,
  NULL as reps_per_round
FROM workout_blocks wb
CROSS JOIN LATERAL jsonb_array_elements(wb.block_parameters->'tabata_sets') AS set_data
CROSS JOIN LATERAL jsonb_array_elements(set_data->'exercises') AS exercise_data
INNER JOIN workout_block_exercises wbe ON wb.id = wbe.block_id 
  AND wbe.exercise_id = (exercise_data->>'exercise_id')::uuid
WHERE wb.block_type = 'tabata'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters->'tabata_sets' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM workout_time_protocols tp 
    WHERE tp.block_id = wb.id 
      AND tp.exercise_id = (exercise_data->>'exercise_id')::uuid
      AND tp.exercise_order = COALESCE((exercise_data->>'order')::integer, wbe.exercise_order)
  );

-- ============================================================
-- 6. MIGRATE CIRCUIT blocks
-- ============================================================
-- Circuit has circuit_sets array, each set has exercises array
-- We need to create one time_protocol record per exercise
INSERT INTO workout_time_protocols (
  block_id,
  exercise_id,
  exercise_order,
  protocol_type,
  work_seconds,
  rest_after_round_seconds,
  rounds,
  reps_per_round
)
SELECT 
  wb.id as block_id,
  (exercise_data->>'exercise_id')::uuid as exercise_id,
  COALESCE((exercise_data->>'order')::integer, exercise_order) as exercise_order,
  'circuit' as protocol_type,
  COALESCE(
    (exercise_data->>'work_seconds')::integer,
    NULL
  ) as work_seconds,
  COALESCE(
    (set_data->>'rest_between_sets')::integer,
    (exercise_data->>'rest_after')::integer,
    NULL
  ) as rest_after_round_seconds,
  jsonb_array_length(wb.block_parameters->'circuit_sets') as rounds,
  NULL as reps_per_round
FROM workout_blocks wb
CROSS JOIN LATERAL jsonb_array_elements(wb.block_parameters->'circuit_sets') AS set_data
CROSS JOIN LATERAL jsonb_array_elements(set_data->'exercises') AS exercise_data
INNER JOIN workout_block_exercises wbe ON wb.id = wbe.block_id 
  AND wbe.exercise_id = (exercise_data->>'exercise_id')::uuid
WHERE wb.block_type = 'circuit'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters->'circuit_sets' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM workout_time_protocols tp 
    WHERE tp.block_id = wb.id 
      AND tp.exercise_id = (exercise_data->>'exercise_id')::uuid
      AND tp.exercise_order = COALESCE((exercise_data->>'order')::integer, wbe.exercise_order)
  );

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Check how many records were created
SELECT 
  'workout_time_protocols' as table_name,
  protocol_type,
  COUNT(*) as records_created
FROM workout_time_protocols
WHERE protocol_type IN ('amrap', 'emom', 'for_time', 'tabata', 'circuit')
GROUP BY protocol_type

UNION ALL

SELECT 
  'workout_drop_sets',
  'drop_set',
  COUNT(*)
FROM workout_drop_sets;

-- Check if all blocks with block_parameters got migrated
SELECT 
  wb.block_type,
  COUNT(DISTINCT wb.id) as blocks_with_params,
  COUNT(DISTINCT CASE 
    WHEN wb.block_type IN ('amrap', 'emom', 'for_time', 'tabata', 'circuit') 
      THEN tp.block_id 
    WHEN wb.block_type = 'drop_set' 
      THEN ds.block_id 
    ELSE NULL 
  END) as blocks_migrated
FROM workout_blocks wb
LEFT JOIN workout_time_protocols tp ON wb.id = tp.block_id 
  AND wb.block_type IN ('amrap', 'emom', 'for_time', 'tabata', 'circuit')
LEFT JOIN workout_drop_sets ds ON wb.id = ds.block_id 
  AND wb.block_type = 'drop_set'
WHERE wb.block_parameters IS NOT NULL
  AND wb.block_parameters::text != '{}'
GROUP BY wb.block_type;


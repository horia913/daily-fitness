-- ============================================================
-- MIGRATION: Move data from block_parameters to individual tables
-- ============================================================
-- This migrates data from workout_blocks.block_parameters (JSONB)
-- to workout_time_protocols, workout_drop_sets, etc.
-- Uses workout_block_exercises to get exercise_id and exercise_order

-- ============================================================
-- 1. MIGRATE AMRAP blocks
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
  'amrap' as protocol_type,
  (wb.block_parameters->>'amrap_duration')::integer as total_duration_minutes,
  (wb.block_parameters->>'target_reps')::integer as reps_per_round
FROM workout_blocks wb
INNER JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
WHERE wb.block_type = 'amrap'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters->>'amrap_duration' IS NOT NULL
  AND NOT EXISTS (
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
  1 as drop_order,
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
-- 5. MIGRATE CLUSTER_SET blocks
-- ============================================================
-- Data is stored in workout_block_exercises columns, not block_parameters
INSERT INTO workout_cluster_sets (
  block_id,
  exercise_id,
  exercise_order,
  reps_per_cluster,
  clusters_per_set,
  intra_cluster_rest,
  inter_set_rest
)
SELECT 
  wb.id as block_id,
  wbe.exercise_id,
  wbe.exercise_order,
  CASE 
    WHEN wbe.cluster_reps IS NOT NULL 
    THEN wbe.cluster_reps::integer 
    ELSE NULL 
  END as reps_per_cluster,
  CASE 
    WHEN wbe.clusters_per_set IS NOT NULL 
    THEN wbe.clusters_per_set::integer 
    ELSE NULL 
  END as clusters_per_set,
  CASE 
    WHEN wbe.intra_cluster_rest IS NOT NULL 
    THEN wbe.intra_cluster_rest::integer 
    ELSE NULL 
  END as intra_cluster_rest,
  COALESCE(
    wbe.rest_seconds,
    wb.rest_seconds,
    120
  ) as inter_set_rest
FROM workout_blocks wb
INNER JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
WHERE wb.block_type = 'cluster_set'
  AND (
    wbe.cluster_reps IS NOT NULL 
    OR wbe.clusters_per_set IS NOT NULL
    OR wbe.intra_cluster_rest IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM workout_cluster_sets cs 
    WHERE cs.block_id = wb.id 
      AND cs.exercise_id = wbe.exercise_id 
      AND cs.exercise_order = wbe.exercise_order
  );

-- ============================================================
-- 6. MIGRATE REST_PAUSE blocks
-- ============================================================
-- Data is stored in workout_block_exercises columns, not block_parameters
INSERT INTO workout_rest_pause_sets (
  block_id,
  exercise_id,
  exercise_order,
  initial_weight_kg,
  initial_reps,
  rest_pause_duration,
  max_rest_pauses
)
SELECT 
  wb.id as block_id,
  wbe.exercise_id,
  wbe.exercise_order,
  wbe.weight_kg as initial_weight_kg,
  CASE 
    WHEN wbe.reps IS NOT NULL AND wbe.reps != '' 
    THEN (regexp_replace(wbe.reps, '[^0-9]', '', 'g'))::integer 
    ELSE NULL 
  END as initial_reps,
  CASE 
    WHEN wbe.rest_pause_duration IS NOT NULL 
    THEN wbe.rest_pause_duration::integer 
    ELSE NULL 
  END as rest_pause_duration,
  CASE 
    WHEN wbe.max_rest_pauses IS NOT NULL 
    THEN wbe.max_rest_pauses::integer 
    ELSE NULL 
  END as max_rest_pauses
FROM workout_blocks wb
INNER JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
WHERE wb.block_type = 'rest_pause'
  AND (
    wbe.rest_pause_duration IS NOT NULL 
    OR wbe.max_rest_pauses IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM workout_rest_pause_sets rps 
    WHERE rps.block_id = wb.id 
      AND rps.exercise_id = wbe.exercise_id 
      AND rps.exercise_order = wbe.exercise_order
  );

-- ============================================================
-- 7. MIGRATE TABATA blocks
-- ============================================================
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
  COALESCE(
    CASE 
      WHEN exercise_data->>'order' IS NOT NULL AND exercise_data->>'order' != '' 
      THEN (exercise_data->>'order')::integer 
      ELSE NULL 
    END,
    wbe.exercise_order
  ) as exercise_order,
  'tabata' as protocol_type,
  COALESCE(
    CASE 
      WHEN exercise_data->>'work_seconds' IS NOT NULL AND exercise_data->>'work_seconds' != '' 
      THEN (exercise_data->>'work_seconds')::integer 
      ELSE NULL 
    END,
    CASE 
      WHEN wb.block_parameters->>'work_seconds' IS NOT NULL AND wb.block_parameters->>'work_seconds' != '' 
      THEN (wb.block_parameters->>'work_seconds')::integer 
      ELSE NULL 
    END,
    20
  ) as work_seconds,
  COALESCE(
    CASE 
      WHEN exercise_data->>'rest_seconds' IS NOT NULL AND exercise_data->>'rest_seconds' != '' 
      THEN (exercise_data->>'rest_seconds')::integer 
      ELSE NULL 
    END,
    CASE 
      WHEN set_data->>'rest_between_sets' IS NOT NULL AND set_data->>'rest_between_sets' != '' 
      THEN (set_data->>'rest_between_sets')::integer 
      ELSE NULL 
    END,
    CASE 
      WHEN wb.block_parameters->>'rest_after' IS NOT NULL AND wb.block_parameters->>'rest_after' != '' 
      THEN (wb.block_parameters->>'rest_after')::integer 
      ELSE NULL 
    END,
    10
  ) as rest_seconds,
  COALESCE(
    CASE 
      WHEN wb.block_parameters->>'rounds' IS NOT NULL AND wb.block_parameters->>'rounds' != '' 
      THEN (wb.block_parameters->>'rounds')::integer 
      ELSE NULL 
    END,
    8
  ) as rounds,
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
      AND tp.exercise_order = COALESCE(
        CASE 
          WHEN exercise_data->>'order' IS NOT NULL AND exercise_data->>'order' != '' 
          THEN (exercise_data->>'order')::integer 
          ELSE NULL 
        END,
        wbe.exercise_order
      )
  );

-- ============================================================
-- 8. MIGRATE CIRCUIT blocks
-- ============================================================
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
  COALESCE(
    CASE 
      WHEN exercise_data->>'order' IS NOT NULL AND exercise_data->>'order' != '' 
      THEN (exercise_data->>'order')::integer 
      ELSE NULL 
    END,
    wbe.exercise_order
  ) as exercise_order,
  'circuit' as protocol_type,
  CASE 
    WHEN exercise_data->>'work_seconds' IS NOT NULL AND exercise_data->>'work_seconds' != '' 
    THEN (exercise_data->>'work_seconds')::integer 
    ELSE NULL 
  END as work_seconds,
  COALESCE(
    CASE 
      WHEN set_data->>'rest_between_sets' IS NOT NULL AND set_data->>'rest_between_sets' != '' 
      THEN (set_data->>'rest_between_sets')::integer 
      ELSE NULL 
    END,
    CASE 
      WHEN exercise_data->>'rest_after' IS NOT NULL AND exercise_data->>'rest_after' != '' 
      THEN (exercise_data->>'rest_after')::integer 
      ELSE NULL 
    END
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
      AND tp.exercise_order = COALESCE(
        CASE 
          WHEN exercise_data->>'order' IS NOT NULL AND exercise_data->>'order' != '' 
          THEN (exercise_data->>'order')::integer 
          ELSE NULL 
        END,
        wbe.exercise_order
      )
  );


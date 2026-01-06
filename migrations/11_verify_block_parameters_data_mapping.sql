-- ============================================================================
-- Verification: block_parameters Data Mapping Check
-- Purpose: Verify if block_parameters data exists in relational tables
-- ============================================================================

-- Step 1: Check if block_parameters data is already in relational tables
-- ============================================================================

-- For AMRAP blocks: Check workout_time_protocols
SELECT 
  'AMRAP blocks' as check_type,
  wb.id as block_id,
  wb.block_type,
  wb.block_parameters->>'amrap_duration' as json_amrap_duration,
  wtp.total_duration_minutes as relational_duration,
  CASE 
    WHEN wb.block_parameters->>'amrap_duration' IS NOT NULL 
      AND wtp.total_duration_minutes IS NULL 
    THEN 'MISSING in relational table'
    WHEN wb.block_parameters->>'amrap_duration' IS NOT NULL 
      AND wtp.total_duration_minutes IS NOT NULL 
    THEN 'EXISTS in relational table'
    ELSE 'No data in block_parameters'
  END as status
FROM workout_blocks wb
LEFT JOIN workout_time_protocols wtp ON wtp.block_id = wb.id AND wtp.protocol_type = 'amrap'
WHERE wb.block_type = 'amrap'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters != '{}'::jsonb
LIMIT 10;

-- For EMOM blocks: Check workout_time_protocols
SELECT 
  'EMOM blocks' as check_type,
  wb.id as block_id,
  wb.block_type,
  wb.block_parameters->>'emom_duration' as json_emom_duration,
  wb.block_parameters->>'work_seconds' as json_work_seconds,
  wb.block_parameters->>'emom_reps' as json_emom_reps,
  wb.block_parameters->>'emom_mode' as json_emom_mode,
  wtp.total_duration_minutes as relational_duration,
  wtp.work_seconds as relational_work_seconds,
  wtp.reps_per_round as relational_reps_per_round,
  CASE 
    WHEN (wb.block_parameters->>'emom_duration' IS NOT NULL OR 
          wb.block_parameters->>'work_seconds' IS NOT NULL OR
          wb.block_parameters->>'emom_reps' IS NOT NULL)
      AND wtp.id IS NULL 
    THEN 'MISSING in relational table'
    WHEN (wb.block_parameters->>'emom_duration' IS NOT NULL OR 
          wb.block_parameters->>'work_seconds' IS NOT NULL OR
          wb.block_parameters->>'emom_reps' IS NOT NULL)
      AND wtp.id IS NOT NULL 
    THEN 'EXISTS in relational table'
    ELSE 'No data in block_parameters'
  END as status
FROM workout_blocks wb
LEFT JOIN workout_time_protocols wtp ON wtp.block_id = wb.id AND wtp.protocol_type = 'emom'
WHERE wb.block_type = 'emom'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters != '{}'::jsonb
LIMIT 10;

-- For FOR_TIME blocks: Check workout_time_protocols
-- Note: time_cap_minutes and target_reps may not exist in workout_time_protocols
-- Check if columns exist first, or just verify that relational data exists
SELECT 
  'FOR_TIME blocks' as check_type,
  wb.id as block_id,
  wb.block_type,
  wb.block_parameters->>'time_cap' as json_time_cap,
  wb.block_parameters->>'target_reps' as json_target_reps,
  CASE 
    WHEN (wb.block_parameters->>'time_cap' IS NOT NULL OR 
          wb.block_parameters->>'target_reps' IS NOT NULL)
      AND wtp.id IS NULL 
    THEN 'MISSING in relational table'
    WHEN (wb.block_parameters->>'time_cap' IS NOT NULL OR 
          wb.block_parameters->>'target_reps' IS NOT NULL)
      AND wtp.id IS NOT NULL 
    THEN 'EXISTS in relational table'
    ELSE 'No data in block_parameters'
  END as status
FROM workout_blocks wb
LEFT JOIN workout_time_protocols wtp ON wtp.block_id = wb.id AND wtp.protocol_type = 'for_time'
WHERE wb.block_type = 'for_time'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters != '{}'::jsonb
LIMIT 10;

-- For TABATA blocks: Check workout_time_protocols
SELECT 
  'TABATA blocks' as check_type,
  wb.id as block_id,
  wb.block_type,
  wb.block_parameters->>'rounds' as json_rounds,
  wb.block_parameters->>'work_seconds' as json_work_seconds,
  wb.block_parameters->>'rest_after' as json_rest_after,
  wtp.rounds as relational_rounds,
  wtp.work_seconds as relational_work_seconds,
  wtp.rest_after_set as relational_rest_after_set,
  CASE 
    WHEN (wb.block_parameters->>'rounds' IS NOT NULL OR 
          wb.block_parameters->>'work_seconds' IS NOT NULL)
      AND wtp.id IS NULL 
    THEN 'MISSING in relational table'
    WHEN (wb.block_parameters->>'rounds' IS NOT NULL OR 
          wb.block_parameters->>'work_seconds' IS NOT NULL)
      AND wtp.id IS NOT NULL 
    THEN 'EXISTS in relational table'
    ELSE 'No data in block_parameters'
  END as status
FROM workout_blocks wb
LEFT JOIN workout_time_protocols wtp ON wtp.block_id = wb.id AND wtp.protocol_type = 'tabata'
WHERE wb.block_type = 'tabata'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters != '{}'::jsonb
LIMIT 10;

-- For DROP_SET blocks: Check workout_drop_sets
-- Note: workout_drop_sets uses 'reps' not 'drop_set_reps'
SELECT 
  'DROP_SET blocks' as check_type,
  wb.id as block_id,
  wb.block_type,
  wb.block_parameters->>'drop_set_reps' as json_drop_set_reps,
  wb.block_parameters->>'drop_percentage' as json_drop_percentage,
  wds.reps as relational_reps,
  wds.drop_percentage as relational_drop_percentage,
  CASE 
    WHEN (wb.block_parameters->>'drop_set_reps' IS NOT NULL OR 
          wb.block_parameters->>'drop_percentage' IS NOT NULL)
      AND wds.id IS NULL 
    THEN 'MISSING in relational table'
    WHEN (wb.block_parameters->>'drop_set_reps' IS NOT NULL OR 
          wb.block_parameters->>'drop_percentage' IS NOT NULL)
      AND wds.id IS NOT NULL 
    THEN 'EXISTS in relational table'
    ELSE 'No data in block_parameters'
  END as status
FROM workout_blocks wb
LEFT JOIN workout_drop_sets wds ON wds.block_id = wb.id
WHERE wb.block_type = 'drop_set'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters != '{}'::jsonb
LIMIT 10;

-- Step 2: Summary - Count blocks with block_parameters vs relational data
-- ============================================================================

SELECT 
  wb.block_type,
  COUNT(*) as total_blocks,
  COUNT(CASE WHEN wb.block_parameters IS NOT NULL AND wb.block_parameters != '{}'::jsonb THEN 1 END) as blocks_with_json,
  COUNT(CASE 
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
  END) as blocks_with_relational_data
FROM workout_blocks wb
WHERE wb.block_parameters IS NOT NULL
  AND wb.block_parameters != '{}'::jsonb
GROUP BY wb.block_type
ORDER BY wb.block_type;

-- Step 3: Check client_workout_blocks
-- ============================================================================

SELECT 
  cwb.block_type,
  COUNT(*) as total_blocks,
  COUNT(CASE WHEN cwb.block_parameters IS NOT NULL AND cwb.block_parameters != '{}'::jsonb THEN 1 END) as blocks_with_json,
  COUNT(CASE 
    WHEN cwb.block_type IN ('straight_set', 'superset', 'giant_set', 'pre_exhaustion') 
      THEN (SELECT COUNT(*) FROM workout_block_exercises wbe 
            JOIN client_workout_blocks cwb2 ON wbe.block_id = cwb2.original_block_id 
            WHERE cwb2.id = cwb.id)
    WHEN cwb.block_type = 'drop_set'
      THEN (SELECT COUNT(*) FROM workout_drop_sets wds 
            JOIN client_workout_blocks cwb2 ON wds.block_id = cwb2.original_block_id 
            WHERE cwb2.id = cwb.id)
    WHEN cwb.block_type IN ('amrap', 'emom', 'for_time', 'tabata', 'circuit')
      THEN (SELECT COUNT(*) FROM workout_time_protocols wtp 
            JOIN client_workout_blocks cwb2 ON wtp.block_id = cwb2.original_block_id 
            WHERE cwb2.id = cwb.id)
    ELSE 0
  END) as blocks_with_relational_data
FROM client_workout_blocks cwb
WHERE cwb.block_parameters IS NOT NULL
  AND cwb.block_parameters != '{}'::jsonb
GROUP BY cwb.block_type
ORDER BY cwb.block_type;


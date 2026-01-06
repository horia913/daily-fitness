-- ============================================================
-- MIGRATION SCRIPT: Move data from block_parameters to correct tables
-- ============================================================
-- Run these queries to check current state and migrate data
-- BEFORE removing block_parameters code

-- ============================================================
-- 1. CHECK IF block_parameters COLUMN EXISTS
-- ============================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_blocks'
  AND column_name = 'block_parameters';

-- ============================================================
-- 2. CHECK CURRENT STATE OF ALL SPECIAL TABLES
-- ============================================================
-- Check workout_time_protocols structure
SELECT 
  'workout_time_protocols' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_time_protocols'
ORDER BY ordinal_position;

-- Check workout_cluster_sets structure
SELECT 
  'workout_cluster_sets' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_cluster_sets'
ORDER BY ordinal_position;

-- Check workout_drop_sets structure
SELECT 
  'workout_drop_sets' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_drop_sets'
ORDER BY ordinal_position;

-- Check workout_rest_pause_sets structure
SELECT 
  'workout_rest_pause_sets' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_rest_pause_sets'
ORDER BY ordinal_position;

-- Check workout_pyramid_sets structure
SELECT 
  'workout_pyramid_sets' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_pyramid_sets'
ORDER BY ordinal_position;

-- Check workout_ladder_sets structure
SELECT 
  'workout_ladder_sets' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_ladder_sets'
ORDER BY ordinal_position;

-- ============================================================
-- 3. CHECK IF block_parameters HAS DATA (if column exists)
-- ============================================================
-- Count blocks with block_parameters data
SELECT 
  block_type,
  COUNT(*) as blocks_with_params
FROM workout_blocks
WHERE block_parameters IS NOT NULL
  AND block_parameters::text != '{}'
GROUP BY block_type
ORDER BY block_type;

-- Sample block_parameters content by block type
SELECT 
  id,
  block_type,
  block_parameters
FROM workout_blocks
WHERE block_parameters IS NOT NULL
  AND block_parameters::text != '{}'
ORDER BY block_type, created_at DESC
LIMIT 20;

-- ============================================================
-- 4. CHECK CURRENT DATA IN SPECIAL TABLES
-- ============================================================
-- Count records in each special table
SELECT 'workout_time_protocols' as table_name, COUNT(*) as record_count FROM workout_time_protocols
UNION ALL
SELECT 'workout_cluster_sets', COUNT(*) FROM workout_cluster_sets
UNION ALL
SELECT 'workout_drop_sets', COUNT(*) FROM workout_drop_sets
UNION ALL
SELECT 'workout_rest_pause_sets', COUNT(*) FROM workout_rest_pause_sets
UNION ALL
SELECT 'workout_pyramid_sets', COUNT(*) FROM workout_pyramid_sets
UNION ALL
SELECT 'workout_ladder_sets', COUNT(*) FROM workout_ladder_sets;

-- ============================================================
-- 5. MIGRATION QUERIES - AMRAP blocks
-- ============================================================
-- Generate INSERT statements for AMRAP blocks
-- (Only if block_parameters column exists and has data)
SELECT 
  'INSERT INTO workout_time_protocols (block_id, exercise_id, exercise_order, protocol_type, total_duration_minutes, reps_per_round) VALUES (' ||
  '''' || wb.id || ''', ' ||
  COALESCE('''' || wbe.exercise_id || '''', 'NULL') || ', ' ||
  COALESCE(wbe.exercise_order::text, '1') || ', ' ||
  '''amrap'', ' ||
  COALESCE((wb.block_parameters->>'amrap_duration')::text, 'NULL') || ', ' ||
  COALESCE((wb.block_parameters->>'target_reps')::text, 'NULL') ||
  ');' as migration_sql
FROM workout_blocks wb
LEFT JOIN workout_block_exercises wbe ON wb.id = wbe.block_id AND wbe.exercise_order = 1
WHERE wb.block_type = 'amrap'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters::text != '{}'
  AND (wb.block_parameters->>'amrap_duration') IS NOT NULL
LIMIT 10;

-- ============================================================
-- 6. MIGRATION QUERIES - EMOM blocks
-- ============================================================
SELECT 
  'INSERT INTO workout_time_protocols (block_id, exercise_id, exercise_order, protocol_type, total_duration_minutes, work_seconds, rest_seconds) VALUES (' ||
  '''' || wb.id || ''', ' ||
  COALESCE('''' || wbe.exercise_id || '''', 'NULL') || ', ' ||
  COALESCE(wbe.exercise_order::text, '1') || ', ' ||
  '''emom'', ' ||
  COALESCE((wb.block_parameters->>'emom_duration')::text, 'NULL') || ', ' ||
  COALESCE((wb.block_parameters->>'work_seconds')::text, 'NULL') || ', ' ||
  COALESCE((wb.block_parameters->>'rest_after')::text, 'NULL') ||
  ');' as migration_sql
FROM workout_blocks wb
LEFT JOIN workout_block_exercises wbe ON wb.id = wbe.block_id AND wbe.exercise_order = 1
WHERE wb.block_type = 'emom'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters::text != '{}'
  AND (wb.block_parameters->>'emom_duration') IS NOT NULL
LIMIT 10;

-- ============================================================
-- 7. MIGRATION QUERIES - FOR_TIME blocks
-- ============================================================
SELECT 
  'INSERT INTO workout_time_protocols (block_id, exercise_id, exercise_order, protocol_type, total_duration_minutes, reps_per_round) VALUES (' ||
  '''' || wb.id || ''', ' ||
  COALESCE('''' || wbe.exercise_id || '''', 'NULL') || ', ' ||
  COALESCE(wbe.exercise_order::text, '1') || ', ' ||
  '''for_time'', ' ||
  COALESCE((wb.block_parameters->>'time_cap')::text, 'NULL') || ', ' ||
  COALESCE((wb.block_parameters->>'target_reps')::text, 'NULL') ||
  ');' as migration_sql
FROM workout_blocks wb
LEFT JOIN workout_block_exercises wbe ON wb.id = wbe.block_id AND wbe.exercise_order = 1
WHERE wb.block_type = 'for_time'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters::text != '{}'
  AND (wb.block_parameters->>'time_cap') IS NOT NULL
LIMIT 10;

-- ============================================================
-- 8. MIGRATION QUERIES - DROP_SET blocks
-- ============================================================
SELECT 
  'INSERT INTO workout_drop_sets (block_id, exercise_id, exercise_order, drop_order, weight_reduction_percentage, reps) VALUES (' ||
  '''' || wb.id || ''', ' ||
  COALESCE('''' || wbe.exercise_id || '''', 'NULL') || ', ' ||
  COALESCE(wbe.exercise_order::text, '1') || ', ' ||
  '1, ' ||
  COALESCE((wb.block_parameters->>'drop_percentage')::text, '30') || ', ' ||
  COALESCE('''' || (wb.block_parameters->>'drop_set_reps') || '''', 'NULL') ||
  ');' as migration_sql
FROM workout_blocks wb
LEFT JOIN workout_block_exercises wbe ON wb.id = wbe.block_id AND wbe.exercise_order = 1
WHERE wb.block_type = 'drop_set'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters::text != '{}'
  AND ((wb.block_parameters->>'drop_percentage') IS NOT NULL OR (wb.block_parameters->>'drop_set_reps') IS NOT NULL)
LIMIT 10;

-- ============================================================
-- 9. MIGRATION QUERIES - CIRCUIT blocks
-- ============================================================
-- For circuit, we need to create time_protocol records for EACH exercise
-- This is complex because circuit_sets is an array
-- First, let's see the structure:
SELECT 
  wb.id as block_id,
  wb.block_type,
  wb.block_parameters->'circuit_sets' as circuit_sets_array,
  jsonb_array_length(wb.block_parameters->'circuit_sets') as num_sets
FROM workout_blocks wb
WHERE wb.block_type = 'circuit'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters->'circuit_sets' IS NOT NULL
LIMIT 5;

-- ============================================================
-- 10. MIGRATION QUERIES - TABATA blocks
-- ============================================================
-- For tabata, we need to create time_protocol records for EACH exercise
SELECT 
  wb.id as block_id,
  wb.block_type,
  wb.block_parameters->'tabata_sets' as tabata_sets_array,
  wb.block_parameters->>'work_seconds' as work_seconds,
  wb.block_parameters->>'rest_after' as rest_after,
  wb.block_parameters->>'rounds' as rounds
FROM workout_blocks wb
WHERE wb.block_type = 'tabata'
  AND wb.block_parameters IS NOT NULL
  AND wb.block_parameters->'tabata_sets' IS NOT NULL
LIMIT 5;

-- ============================================================
-- 11. CHECK EXERCISES IN BLOCKS THAT NEED MIGRATION
-- ============================================================
-- Get all exercises for blocks that have block_parameters data
SELECT 
  wb.id as block_id,
  wb.block_type,
  wbe.id as block_exercise_id,
  wbe.exercise_id,
  wbe.exercise_order,
  e.name as exercise_name
FROM workout_blocks wb
LEFT JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
LEFT JOIN exercises e ON wbe.exercise_id = e.id
WHERE wb.block_parameters IS NOT NULL
  AND wb.block_parameters::text != '{}'
  AND wb.block_type IN ('amrap', 'emom', 'for_time', 'circuit', 'tabata', 'drop_set', 'cluster_set', 'rest_pause')
ORDER BY wb.block_type, wb.id, wbe.exercise_order
LIMIT 50;


-- ============================================================
-- DIAGNOSTIC: Check why data migration didn't work
-- ============================================================

-- 1. Check if there are any records in the special tables
SELECT 
  'workout_cluster_sets' as table_name,
  COUNT(*) as total_records,
  COUNT(block_exercise_id) as records_with_block_exercise_id,
  COUNT(block_id) as records_with_new_block_id,
  COUNT(exercise_id) as records_with_new_exercise_id
FROM workout_cluster_sets

UNION ALL

SELECT 
  'workout_drop_sets',
  COUNT(*),
  COUNT(block_exercise_id),
  COUNT(block_id),
  COUNT(exercise_id)
FROM workout_drop_sets

UNION ALL

SELECT 
  'workout_rest_pause_sets',
  COUNT(*),
  COUNT(block_exercise_id),
  COUNT(block_id),
  COUNT(exercise_id)
FROM workout_rest_pause_sets

UNION ALL

SELECT 
  'workout_pyramid_sets',
  COUNT(*),
  COUNT(block_exercise_id),
  COUNT(block_id),
  COUNT(exercise_id)
FROM workout_pyramid_sets

UNION ALL

SELECT 
  'workout_ladder_sets',
  COUNT(*),
  COUNT(block_exercise_id),
  COUNT(block_id),
  COUNT(exercise_id)
FROM workout_ladder_sets;

-- 2. Check if block_exercise_id values exist in workout_block_exercises
-- For cluster_sets
SELECT 
  'cluster_sets' as table_name,
  cs.id,
  cs.block_exercise_id,
  CASE WHEN wbe.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as block_exercise_exists,
  wbe.block_id as found_block_id,
  wbe.exercise_id as found_exercise_id,
  wbe.exercise_order as found_exercise_order
FROM workout_cluster_sets cs
LEFT JOIN workout_block_exercises wbe ON cs.block_exercise_id = wbe.id
WHERE cs.block_exercise_id IS NOT NULL
LIMIT 10;

-- For drop_sets
SELECT 
  'drop_sets' as table_name,
  ds.id,
  ds.block_exercise_id,
  CASE WHEN wbe.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as block_exercise_exists,
  wbe.block_id as found_block_id,
  wbe.exercise_id as found_exercise_id,
  wbe.exercise_order as found_exercise_order
FROM workout_drop_sets ds
LEFT JOIN workout_block_exercises wbe ON ds.block_exercise_id = wbe.id
WHERE ds.block_exercise_id IS NOT NULL
LIMIT 10;

-- For rest_pause_sets
SELECT 
  'rest_pause_sets' as table_name,
  rps.id,
  rps.block_exercise_id,
  CASE WHEN wbe.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as block_exercise_exists,
  wbe.block_id as found_block_id,
  wbe.exercise_id as found_exercise_id,
  wbe.exercise_order as found_exercise_order
FROM workout_rest_pause_sets rps
LEFT JOIN workout_block_exercises wbe ON rps.block_exercise_id = wbe.id
WHERE rps.block_exercise_id IS NOT NULL
LIMIT 10;

-- For pyramid_sets
SELECT 
  'pyramid_sets' as table_name,
  ps.id,
  ps.block_exercise_id,
  CASE WHEN wbe.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as block_exercise_exists,
  wbe.block_id as found_block_id,
  wbe.exercise_id as found_exercise_id,
  wbe.exercise_order as found_exercise_order
FROM workout_pyramid_sets ps
LEFT JOIN workout_block_exercises wbe ON ps.block_exercise_id = wbe.id
WHERE ps.block_exercise_id IS NOT NULL
LIMIT 10;

-- For ladder_sets
SELECT 
  'ladder_sets' as table_name,
  ls.id,
  ls.block_exercise_id,
  CASE WHEN wbe.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as block_exercise_exists,
  wbe.block_id as found_block_id,
  wbe.exercise_id as found_exercise_id,
  wbe.exercise_order as found_exercise_order
FROM workout_ladder_sets ls
LEFT JOIN workout_block_exercises wbe ON ls.block_exercise_id = wbe.id
WHERE ls.block_exercise_id IS NOT NULL
LIMIT 10;


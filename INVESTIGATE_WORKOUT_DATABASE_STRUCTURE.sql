-- ============================================================
-- COMPREHENSIVE DATABASE INVESTIGATION FOR WORKOUT SYSTEM
-- ============================================================
-- Run these queries to understand the database structure
-- before making any changes to the workout display logic

-- ============================================================
-- 1. PROGRAM ASSIGNMENT PROGRESS TABLE STRUCTURE
-- ============================================================
-- Check all columns in program_assignment_progress table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'program_assignment_progress'
ORDER BY ordinal_position;

-- Check foreign keys and relationships
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'program_assignment_progress';

-- Sample data from program_assignment_progress
SELECT * FROM program_assignment_progress LIMIT 5;

-- ============================================================
-- 2. WORKOUT BLOCKS TABLE STRUCTURE
-- ============================================================
-- Check all columns in workout_blocks
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_blocks'
ORDER BY ordinal_position;

-- Sample workout_blocks data with block_parameters
SELECT 
  id,
  template_id,
  block_type,
  block_order,
  block_name,
  total_sets,
  reps_per_set,
  rest_seconds,
  duration_seconds,
  block_parameters,
  created_at
FROM workout_blocks
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- 3. WORKOUT BLOCK EXERCISES TABLE STRUCTURE
-- ============================================================
-- Check all columns in workout_block_exercises
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_block_exercises'
ORDER BY ordinal_position;

-- Sample workout_block_exercises data
SELECT 
  id,
  block_id,
  exercise_id,
  exercise_order,
  exercise_letter,
  sets,
  reps,
  rest_seconds,
  weight_kg,
  tempo,
  rir,
  notes,
  created_at
FROM workout_block_exercises
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- 4. CLUSTER SETS TABLE STRUCTURE AND DATA
-- ============================================================
-- Check all columns in workout_cluster_sets
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_cluster_sets'
ORDER BY ordinal_position;

-- Check if cluster sets table has any data
SELECT COUNT(*) as total_cluster_sets FROM workout_cluster_sets;

-- Sample cluster sets data
SELECT 
  cs.*,
  wbe.block_id,
  wbe.exercise_id,
  wb.block_type,
  wb.template_id
FROM workout_cluster_sets cs
LEFT JOIN workout_block_exercises wbe ON cs.block_exercise_id = wbe.id
LEFT JOIN workout_blocks wb ON wbe.block_id = wb.id
ORDER BY cs.created_at DESC
LIMIT 10;

-- Check which blocks have cluster_set type but no cluster_sets records
SELECT 
  wb.id as block_id,
  wb.block_type,
  wb.template_id,
  COUNT(cs.id) as cluster_set_count
FROM workout_blocks wb
LEFT JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
LEFT JOIN workout_cluster_sets cs ON wbe.id = cs.block_exercise_id
WHERE wb.block_type = 'cluster_set'
GROUP BY wb.id, wb.block_type, wb.template_id
HAVING COUNT(cs.id) = 0
LIMIT 10;

-- ============================================================
-- 5. REST PAUSE SETS TABLE STRUCTURE AND DATA
-- ============================================================
-- Check all columns in workout_rest_pause_sets
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_rest_pause_sets'
ORDER BY ordinal_position;

-- Check if rest pause sets table has any data
SELECT COUNT(*) as total_rest_pause_sets FROM workout_rest_pause_sets;

-- Sample rest pause sets data
SELECT 
  rps.*,
  wbe.block_id,
  wbe.exercise_id,
  wb.block_type,
  wb.template_id
FROM workout_rest_pause_sets rps
LEFT JOIN workout_block_exercises wbe ON rps.block_exercise_id = wbe.id
LEFT JOIN workout_blocks wb ON wbe.block_id = wb.id
ORDER BY rps.created_at DESC
LIMIT 10;

-- Check which blocks have rest_pause type but no rest_pause_sets records
SELECT 
  wb.id as block_id,
  wb.block_type,
  wb.template_id,
  COUNT(rps.id) as rest_pause_count
FROM workout_blocks wb
LEFT JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
LEFT JOIN workout_rest_pause_sets rps ON wbe.id = rps.block_exercise_id
WHERE wb.block_type = 'rest_pause'
GROUP BY wb.id, wb.block_type, wb.template_id
HAVING COUNT(rps.id) = 0
LIMIT 10;

-- ============================================================
-- 6. DROP SETS TABLE STRUCTURE AND DATA
-- ============================================================
-- Check all columns in workout_drop_sets
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_drop_sets'
ORDER BY ordinal_position;

-- Check if drop sets table has any data
SELECT COUNT(*) as total_drop_sets FROM workout_drop_sets;

-- Sample drop sets data
SELECT 
  ds.*,
  wbe.block_id,
  wbe.exercise_id,
  wb.block_type,
  wb.template_id
FROM workout_drop_sets ds
LEFT JOIN workout_block_exercises wbe ON ds.block_exercise_id = wbe.id
LEFT JOIN workout_blocks wb ON wbe.block_id = wb.id
ORDER BY ds.created_at DESC
LIMIT 10;

-- ============================================================
-- 7. TIME PROTOCOLS TABLE STRUCTURE AND DATA
-- ============================================================
-- Check all columns in workout_time_protocols
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_time_protocols'
ORDER BY ordinal_position;

-- Check foreign keys and relationships for workout_time_protocols
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'workout_time_protocols';

-- Check if time protocols table has any data
SELECT COUNT(*) as total_time_protocols FROM workout_time_protocols;

-- Sample time protocols data with full relationships
SELECT 
  tp.*,
  wb.id as block_id_from_join,
  wb.block_type,
  wb.template_id,
  wb.block_parameters,
  wbe.id as block_exercise_id,
  wbe.exercise_id,
  wbe.exercise_order,
  e.name as exercise_name
FROM workout_time_protocols tp
LEFT JOIN workout_blocks wb ON tp.block_id = wb.id
LEFT JOIN workout_block_exercises wbe ON tp.block_exercise_id = wbe.id
LEFT JOIN exercises e ON wbe.exercise_id = e.id
ORDER BY tp.created_at DESC
LIMIT 20;

-- For circuit/tabata blocks: Show how many time_protocol records exist per block
-- This will show if it's one per block or one per exercise
SELECT 
  wb.id as block_id,
  wb.block_type,
  wb.template_id,
  COUNT(DISTINCT wbe.id) as exercise_count,
  COUNT(DISTINCT tp.id) as time_protocol_count,
  COUNT(DISTINCT CASE WHEN tp.block_exercise_id IS NOT NULL THEN tp.id END) as time_protocols_with_exercise_id,
  COUNT(DISTINCT CASE WHEN tp.block_id IS NOT NULL THEN tp.id END) as time_protocols_with_block_id
FROM workout_blocks wb
LEFT JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
LEFT JOIN workout_time_protocols tp ON (
  tp.block_id = wb.id OR 
  tp.block_exercise_id = wbe.id
)
WHERE wb.block_type IN ('circuit', 'tabata')
GROUP BY wb.id, wb.block_type, wb.template_id
ORDER BY wb.created_at DESC
LIMIT 20;

-- Detailed view: For one circuit/tabata block, show all exercises and their time_protocol records
SELECT 
  wb.id as block_id,
  wb.block_type,
  wbe.id as block_exercise_id,
  wbe.exercise_order,
  e.name as exercise_name,
  tp.id as time_protocol_id,
  tp.protocol_type,
  tp.work_seconds,
  tp.rest_seconds,
  tp.rounds,
  tp.reps_per_round,
  tp.total_duration_minutes,
  tp.rest_after_round_seconds
FROM workout_blocks wb
LEFT JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
LEFT JOIN exercises e ON wbe.exercise_id = e.id
LEFT JOIN workout_time_protocols tp ON (
  tp.block_exercise_id = wbe.id OR 
  tp.block_id = wb.id
)
WHERE wb.block_type IN ('circuit', 'tabata')
ORDER BY wb.id, wbe.exercise_order, tp.id
LIMIT 50;

-- ============================================================
-- 8. CHECK BLOCK_PARAMETERS JSON CONTENT
-- ============================================================
-- Check what's actually stored in block_parameters for different block types
SELECT 
  block_type,
  COUNT(*) as count,
  jsonb_object_keys(block_parameters) as parameter_keys
FROM workout_blocks
WHERE block_parameters IS NOT NULL
  AND block_type IN ('cluster_set', 'rest_pause', 'drop_set', 'circuit', 'amrap', 'emom', 'tabata', 'for_time')
GROUP BY block_type, jsonb_object_keys(block_parameters)
ORDER BY block_type, parameter_keys;

-- Sample block_parameters content for cluster_set
SELECT 
  id,
  block_type,
  block_parameters
FROM workout_blocks
WHERE block_type = 'cluster_set'
  AND block_parameters IS NOT NULL
LIMIT 5;

-- Sample block_parameters content for rest_pause
SELECT 
  id,
  block_type,
  block_parameters
FROM workout_blocks
WHERE block_type = 'rest_pause'
  AND block_parameters IS NOT NULL
LIMIT 5;

-- Sample block_parameters content for circuit
SELECT 
  id,
  block_type,
  block_parameters
FROM workout_blocks
WHERE block_type = 'circuit'
  AND block_parameters IS NOT NULL
LIMIT 5;

-- ============================================================
-- 9. COMPLETE WORKOUT BLOCK DATA FLOW
-- ============================================================
-- Get a complete picture of one workout block with all related data
SELECT 
  wb.id as block_id,
  wb.template_id,
  wb.block_type,
  wb.block_order,
  wb.block_name,
  wb.total_sets,
  wb.reps_per_set,
  wb.rest_seconds,
  wb.duration_seconds,
  wb.block_parameters,
  COUNT(DISTINCT wbe.id) as exercise_count,
  COUNT(DISTINCT cs.id) as cluster_set_count,
  COUNT(DISTINCT rps.id) as rest_pause_count,
  COUNT(DISTINCT ds.id) as drop_set_count,
  COUNT(DISTINCT tp.id) as time_protocol_count
FROM workout_blocks wb
LEFT JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
LEFT JOIN workout_cluster_sets cs ON wbe.id = cs.block_exercise_id
LEFT JOIN workout_rest_pause_sets rps ON wbe.id = rps.block_exercise_id
LEFT JOIN workout_drop_sets ds ON wbe.id = ds.block_exercise_id
LEFT JOIN workout_time_protocols tp ON wb.id = tp.block_id
WHERE wb.block_type IN ('cluster_set', 'rest_pause', 'drop_set', 'circuit')
GROUP BY wb.id, wb.template_id, wb.block_type, wb.block_order, wb.block_name, 
         wb.total_sets, wb.reps_per_set, wb.rest_seconds, wb.duration_seconds, wb.block_parameters
ORDER BY wb.created_at DESC
LIMIT 10;

-- ============================================================
-- 10. CHECK WORKOUT ASSIGNMENT LINKING
-- ============================================================
-- Check how workout_assignments link to workout_templates
SELECT 
  wa.id as assignment_id,
  wa.client_id,
  wa.workout_template_id,
  wa.scheduled_date,
  wa.status,
  wt.name as template_name,
  COUNT(DISTINCT wb.id) as block_count
FROM workout_assignments wa
LEFT JOIN workout_templates wt ON wa.workout_template_id = wt.id
LEFT JOIN workout_blocks wb ON wt.id = wb.template_id
GROUP BY wa.id, wa.client_id, wa.workout_template_id, wa.scheduled_date, wa.status, wt.name
ORDER BY wa.created_at DESC
LIMIT 10;

-- ============================================================
-- 11. CHECK PROGRAM ASSIGNMENT PROGRESS LINKING
-- ============================================================
-- Check how program_assignment_progress links to programs and clients
SELECT 
  pap.id,
  pap.client_id,
  pap.program_id,
  pap.current_week,
  pap.current_day,
  pap.days_completed_this_week,
  pap.is_program_completed,
  wp.name as program_name
FROM program_assignment_progress pap
LEFT JOIN workout_programs wp ON pap.program_id = wp.id
ORDER BY pap.created_at DESC
LIMIT 10;


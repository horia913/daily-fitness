-- ============================================================
-- DELETE DUPLICATE WORKOUT BLOCKS (KEEP NEWEST)
-- ============================================================
-- This script deletes duplicate blocks, keeping only the newest one
-- based on block_type, block_order, and first exercise_id

-- IMPORTANT: Review IDENTIFY_DUPLICATE_BLOCKS.sql first to see what will be deleted!
-- IMPORTANT: Replace 'd462af11-dfa9-4185-ae28-d68789a55218' below with your template ID

-- Step 1: Create a temporary table with blocks to delete
-- (CTEs can't be reused across multiple statements)
-- NOTE: We use DISTINCT ON to ensure each block_id appears only once
CREATE TEMP TABLE blocks_to_delete_temp AS
WITH block_first_exercise_ids AS (
  -- Get the first exercise_id for each block (using DISTINCT ON to handle multi-exercise blocks)
  SELECT DISTINCT ON (wb.id)
    wb.id as block_id,
    wb.template_id,
    wb.block_type,
    wb.block_order,
    wbe.exercise_id as first_exercise_id,
    wb.created_at
  FROM workout_blocks wb
  INNER JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
  WHERE wb.template_id = 'd462af11-dfa9-4185-ae28-d68789a55218'  -- REPLACE THIS UUID
    AND wbe.exercise_order = 1  -- Only look at first exercise for matching
  ORDER BY wb.id, wbe.exercise_order
),
block_duplicates AS (
  SELECT 
    block_id,
    template_id,
    block_type,
    block_order,
    first_exercise_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY template_id, block_type, block_order, first_exercise_id
      ORDER BY created_at DESC
    ) as rn
  FROM block_first_exercise_ids
)
SELECT block_id
FROM block_duplicates
WHERE rn > 1;  -- Keep rn=1 (newest), delete rn>1 (older duplicates)

-- Step 2: Delete related data first (to satisfy foreign key constraints)
-- Delete special table data
DELETE FROM workout_time_protocols
WHERE block_id IN (SELECT block_id FROM blocks_to_delete_temp);

DELETE FROM workout_rest_pause_sets
WHERE block_id IN (SELECT block_id FROM blocks_to_delete_temp);

DELETE FROM workout_cluster_sets
WHERE block_id IN (SELECT block_id FROM blocks_to_delete_temp);

DELETE FROM workout_drop_sets
WHERE block_id IN (SELECT block_id FROM blocks_to_delete_temp);

DELETE FROM workout_pyramid_sets
WHERE block_id IN (SELECT block_id FROM blocks_to_delete_temp);

DELETE FROM workout_ladder_sets
WHERE block_id IN (SELECT block_id FROM blocks_to_delete_temp);

-- Delete exercises
DELETE FROM workout_block_exercises
WHERE block_id IN (SELECT block_id FROM blocks_to_delete_temp);

-- Step 3: Delete the duplicate blocks themselves
DELETE FROM workout_blocks
WHERE id IN (SELECT block_id FROM blocks_to_delete_temp);

-- Step 4: Return count of deleted blocks
SELECT 
  COUNT(*) as deleted_blocks_count
FROM blocks_to_delete_temp;

-- Clean up temporary table
DROP TABLE blocks_to_delete_temp;


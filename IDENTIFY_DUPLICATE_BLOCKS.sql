-- ============================================================
-- IDENTIFY DUPLICATE WORKOUT BLOCKS
-- ============================================================
-- This script helps identify duplicate blocks in a template
-- Run this for a specific template_id to see duplicates

-- IMPORTANT: Replace 'd462af11-dfa9-4185-ae28-d68789a55218' below with your template ID

-- Find blocks with duplicate block_type, block_order, and same first exercise
-- NOTE: We DISTINCT by block_id first to handle multi-exercise blocks correctly
WITH block_first_exercise_ids AS (
  -- Get the first exercise_id for each block (to identify duplicates)
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
    AND wbe.exercise_order = 1  -- Only look at first exercise to identify duplicate blocks
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
    ) as rn,
    COUNT(*) OVER (
      PARTITION BY template_id, block_type, block_order, first_exercise_id
    ) as duplicate_count
  FROM block_first_exercise_ids
)
SELECT 
  block_id,
  template_id,
  block_type,
  block_order,
  first_exercise_id,
  created_at,
  duplicate_count,
  CASE WHEN rn = 1 THEN 'KEEP (newest)' ELSE 'DELETE (duplicate)' END as action
FROM block_duplicates
WHERE duplicate_count > 1  -- Only show blocks that have duplicates
ORDER BY block_type, block_order, created_at DESC;

-- ============================================================
-- SAFE DELETE DUPLICATE BLOCKS (KEEP NEWEST)
-- ============================================================
-- WARNING: Review the query above first before running this!
-- This will delete duplicate blocks, keeping only the newest one

-- Uncomment and run this AFTER reviewing the results above:

/*
WITH duplicates_to_delete AS (
  SELECT 
    wb.id as block_id,
    ROW_NUMBER() OVER (
      PARTITION BY wb.template_id, wb.block_type, wb.block_order, wbe.exercise_id, wbe.exercise_order
      ORDER BY wb.created_at DESC
    ) as rn
  FROM workout_blocks wb
  INNER JOIN workout_block_exercises wbe ON wb.id = wbe.block_id
  WHERE wb.template_id = 'd462af11-dfa9-4185-ae28-d68789a55218'  -- REPLACE THIS UUID
)
DELETE FROM workout_blocks
WHERE id IN (
  SELECT block_id 
  FROM duplicates_to_delete 
  WHERE rn > 1
);
*/


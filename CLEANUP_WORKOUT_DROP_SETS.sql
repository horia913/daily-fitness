-- ============================================================
-- CLEANUP workout_drop_sets table
-- ============================================================
-- This script:
-- 1. Adds drop_percentage column (to store the percentage reduction from previous weight)
-- 2. Adds load_percentage column (to store % of 1RM for this drop - coach configures this)
-- 3. Keeps drop_order column (allows multiple drops per exercise)
-- 4. Keeps weight_kg column (for manual weight entry or calculated from load_percentage)
-- 5. Drops rest_seconds column (rest is stored in workout_blocks.rest_seconds)

-- ============================================================
-- 1. Add drop_percentage column
-- ============================================================
ALTER TABLE workout_drop_sets
ADD COLUMN IF NOT EXISTS drop_percentage INTEGER;

-- ============================================================
-- 2. Add load_percentage column
-- ============================================================
ALTER TABLE workout_drop_sets
ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2);

-- Migrate drop_percentage from block_parameters if it exists
UPDATE workout_drop_sets ds
SET drop_percentage = (
  SELECT (wb.block_parameters->>'drop_percentage')::integer
  FROM workout_blocks wb
  WHERE wb.id = ds.block_id
    AND wb.block_parameters IS NOT NULL
    AND wb.block_parameters->>'drop_percentage' IS NOT NULL
    AND wb.block_parameters->>'drop_percentage' != ''
)
WHERE ds.drop_percentage IS NULL;

-- Migrate load_percentage from workout_block_exercises if it exists
-- (This assumes the exercise's load_percentage should be used for the drop)
UPDATE workout_drop_sets ds
SET load_percentage = (
  SELECT wbe.load_percentage
  FROM workout_block_exercises wbe
  WHERE wbe.block_id = ds.block_id
    AND wbe.exercise_id = ds.exercise_id
    AND wbe.exercise_order = ds.exercise_order
    AND wbe.load_percentage IS NOT NULL
)
WHERE ds.load_percentage IS NULL;

-- ============================================================
-- 2. Drop unused columns
-- ============================================================
-- Keep drop_order to allow multiple drops per exercise
-- Keep weight_kg (may be needed for multiple drops or manual overrides)
ALTER TABLE workout_drop_sets DROP COLUMN IF EXISTS rest_seconds CASCADE;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Check final structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_drop_sets'
ORDER BY ordinal_position;

-- Expected columns:
-- - id
-- - block_id
-- - exercise_id
-- - exercise_order
-- - drop_order (kept for multiple drops per exercise)
-- - weight_kg (kept - for manual weight entry or calculated from load_percentage)
-- - reps
-- - drop_percentage (new - percentage reduction from previous weight)
-- - load_percentage (new - % of 1RM for this drop, coach configures this)
-- - created_at
-- - updated_at


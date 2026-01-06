-- ============================================================
-- ADD load_percentage to all special block tables
-- ============================================================
-- This adds load_percentage column to all special tables so coaches
-- can configure % of 1RM for each exercise/block type.
-- 
-- The load_percentage is used with e1RM from user_exercise_metrics
-- to calculate suggested weight: suggested_weight = e1rm × (load_percentage / 100)
--
-- e1RM is stored in: user_exercise_metrics.estimated_1rm
-- (one record per user_id + exercise_id, stores highest e1RM)

-- ============================================================
-- 1. workout_block_exercises
-- ============================================================
ALTER TABLE workout_block_exercises
ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2);

-- Add comment for documentation
COMMENT ON COLUMN workout_block_exercises.load_percentage IS 'Percentage of estimated 1RM to use for this exercise. Used to calculate suggested weight (e.g., 70 = 70% of 1RM).';

-- ============================================================
-- 2. workout_drop_sets
-- ============================================================
ALTER TABLE workout_drop_sets
ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2);

-- Migrate from workout_block_exercises if it exists
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
-- 3. workout_cluster_sets
-- ============================================================
ALTER TABLE workout_cluster_sets
ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2);

-- Migrate from workout_block_exercises if it exists
UPDATE workout_cluster_sets cs
SET load_percentage = (
  SELECT wbe.load_percentage
  FROM workout_block_exercises wbe
  WHERE wbe.block_id = cs.block_id
    AND wbe.exercise_id = cs.exercise_id
    AND wbe.exercise_order = cs.exercise_order
    AND wbe.load_percentage IS NOT NULL
)
WHERE cs.load_percentage IS NULL;

-- ============================================================
-- 4. workout_rest_pause_sets
-- ============================================================
ALTER TABLE workout_rest_pause_sets
ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2);

-- Migrate from workout_block_exercises if it exists
UPDATE workout_rest_pause_sets rps
SET load_percentage = (
  SELECT wbe.load_percentage
  FROM workout_block_exercises wbe
  WHERE wbe.block_id = rps.block_id
    AND wbe.exercise_id = rps.exercise_id
    AND wbe.exercise_order = rps.exercise_order
    AND wbe.load_percentage IS NOT NULL
)
WHERE rps.load_percentage IS NULL;

-- ============================================================
-- 5. workout_pyramid_sets
-- ============================================================
ALTER TABLE workout_pyramid_sets
ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2);

-- Migrate from workout_block_exercises if it exists
UPDATE workout_pyramid_sets ps
SET load_percentage = (
  SELECT wbe.load_percentage
  FROM workout_block_exercises wbe
  WHERE wbe.block_id = ps.block_id
    AND wbe.exercise_id = ps.exercise_id
    AND wbe.exercise_order = ps.exercise_order
    AND wbe.load_percentage IS NOT NULL
)
WHERE ps.load_percentage IS NULL;

-- ============================================================
-- 6. workout_ladder_sets
-- ============================================================
ALTER TABLE workout_ladder_sets
ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2);

-- Migrate from workout_block_exercises if it exists
UPDATE workout_ladder_sets ls
SET load_percentage = (
  SELECT wbe.load_percentage
  FROM workout_block_exercises wbe
  WHERE wbe.block_id = ls.block_id
    AND wbe.exercise_id = ls.exercise_id
    AND wbe.exercise_order = ls.exercise_order
    AND wbe.load_percentage IS NOT NULL
)
WHERE ls.load_percentage IS NULL;

-- ============================================================
-- 7. workout_time_protocols
-- ============================================================
ALTER TABLE workout_time_protocols
ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2);

-- Migrate from workout_block_exercises if it exists
UPDATE workout_time_protocols tp
SET load_percentage = (
  SELECT wbe.load_percentage
  FROM workout_block_exercises wbe
  WHERE wbe.block_id = tp.block_id
    AND wbe.exercise_id = tp.exercise_id
    AND wbe.exercise_order = tp.exercise_order
    AND wbe.load_percentage IS NOT NULL
)
WHERE tp.load_percentage IS NULL;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Check that load_percentage was added to all tables
SELECT 
  'workout_block_exercises' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_block_exercises'
  AND column_name = 'load_percentage'

UNION ALL

SELECT 
  'workout_drop_sets',
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_drop_sets'
  AND column_name = 'load_percentage'

UNION ALL

SELECT 
  'workout_cluster_sets' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_cluster_sets'
  AND column_name = 'load_percentage'

UNION ALL

SELECT 
  'workout_rest_pause_sets',
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_rest_pause_sets'
  AND column_name = 'load_percentage'

UNION ALL

SELECT 
  'workout_pyramid_sets',
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_pyramid_sets'
  AND column_name = 'load_percentage'

UNION ALL

SELECT 
  'workout_ladder_sets',
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_ladder_sets'
  AND column_name = 'load_percentage'

UNION ALL

SELECT 
  'workout_time_protocols',
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_time_protocols'
  AND column_name = 'load_percentage'

UNION ALL

SELECT 
  'workout_drop_sets',
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_drop_sets'
  AND column_name = 'load_percentage';

-- Expected: All 7 tables should show load_percentage with data_type = 'numeric' and is_nullable = 'YES'
-- - workout_block_exercises
-- - workout_drop_sets
-- - workout_cluster_sets
-- - workout_rest_pause_sets
-- - workout_pyramid_sets
-- - workout_ladder_sets
-- - workout_time_protocols


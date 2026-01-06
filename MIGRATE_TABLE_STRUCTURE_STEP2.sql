-- ============================================================
-- STEP 2: Make columns NOT NULL and drop old columns
-- ============================================================
-- ONLY RUN THIS AFTER:
-- 1. You've run MIGRATE_TABLE_STRUCTURE.sql (Step 1)
-- 2. You've verified the migration worked (check verification queries)
-- 3. You're sure all data migrated correctly

-- ============================================================
-- 1. workout_time_protocols - Make columns NOT NULL
-- ============================================================
-- Only run this if you're sure all existing records have exercise_id and exercise_order
ALTER TABLE workout_time_protocols
ALTER COLUMN exercise_id SET NOT NULL,
ALTER COLUMN exercise_order SET NOT NULL;

-- ============================================================
-- 2. workout_cluster_sets - Make columns NOT NULL
-- ============================================================
ALTER TABLE workout_cluster_sets
ALTER COLUMN block_id SET NOT NULL,
ALTER COLUMN exercise_id SET NOT NULL,
ALTER COLUMN exercise_order SET NOT NULL;

-- Drop old column
ALTER TABLE workout_cluster_sets DROP COLUMN block_exercise_id;

-- ============================================================
-- 3. workout_drop_sets - Make columns NOT NULL
-- ============================================================
ALTER TABLE workout_drop_sets
ALTER COLUMN block_id SET NOT NULL,
ALTER COLUMN exercise_id SET NOT NULL,
ALTER COLUMN exercise_order SET NOT NULL;

-- Drop old column
ALTER TABLE workout_drop_sets DROP COLUMN block_exercise_id;

-- ============================================================
-- 4. workout_rest_pause_sets - Make columns NOT NULL
-- ============================================================
ALTER TABLE workout_rest_pause_sets
ALTER COLUMN block_id SET NOT NULL,
ALTER COLUMN exercise_id SET NOT NULL,
ALTER COLUMN exercise_order SET NOT NULL;

-- Drop old column
ALTER TABLE workout_rest_pause_sets DROP COLUMN block_exercise_id;

-- ============================================================
-- 5. workout_pyramid_sets - Make columns NOT NULL
-- ============================================================
ALTER TABLE workout_pyramid_sets
ALTER COLUMN block_id SET NOT NULL,
ALTER COLUMN exercise_id SET NOT NULL,
ALTER COLUMN exercise_order SET NOT NULL;

-- Drop old column
ALTER TABLE workout_pyramid_sets DROP COLUMN block_exercise_id;

-- ============================================================
-- 6. workout_ladder_sets - Make columns NOT NULL
-- ============================================================
ALTER TABLE workout_ladder_sets
ALTER COLUMN block_id SET NOT NULL,
ALTER COLUMN exercise_id SET NOT NULL,
ALTER COLUMN exercise_order SET NOT NULL;

-- Drop old column
ALTER TABLE workout_ladder_sets DROP COLUMN block_exercise_id;

-- ============================================================
-- FINAL VERIFICATION
-- ============================================================
-- After running the above, verify the structure is correct:
SELECT 
  'workout_time_protocols' as table_name,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_time_protocols'
  AND column_name IN ('block_id', 'exercise_id', 'exercise_order')
ORDER BY column_name

UNION ALL

SELECT 
  'workout_cluster_sets',
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_cluster_sets'
  AND column_name IN ('block_id', 'exercise_id', 'exercise_order', 'block_exercise_id')
ORDER BY column_name

UNION ALL

SELECT 
  'workout_drop_sets',
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_drop_sets'
  AND column_name IN ('block_id', 'exercise_id', 'exercise_order', 'block_exercise_id')
ORDER BY column_name

UNION ALL

SELECT 
  'workout_rest_pause_sets',
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_rest_pause_sets'
  AND column_name IN ('block_id', 'exercise_id', 'exercise_order', 'block_exercise_id')
ORDER BY column_name

UNION ALL

SELECT 
  'workout_pyramid_sets',
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_pyramid_sets'
  AND column_name IN ('block_id', 'exercise_id', 'exercise_order', 'block_exercise_id')
ORDER BY column_name

UNION ALL

SELECT 
  'workout_ladder_sets',
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_ladder_sets'
  AND column_name IN ('block_id', 'exercise_id', 'exercise_order', 'block_exercise_id')
ORDER BY column_name;

-- Expected results:
-- - block_id, exercise_id, exercise_order should all show is_nullable = 'NO'
-- - block_exercise_id should NOT appear in the results (it was dropped)


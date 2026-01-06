-- ============================================================
-- MIGRATION: Update table structure for special block types
-- ============================================================
-- This script adds block_id, exercise_id, exercise_order columns
-- and removes block_exercise_id where needed

-- ============================================================
-- 1. UPDATE workout_time_protocols
-- ============================================================
-- Add exercise_id and exercise_order columns
ALTER TABLE workout_time_protocols
ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES exercises(id),
ADD COLUMN IF NOT EXISTS exercise_order INTEGER DEFAULT 1;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_workout_time_protocols_exercise 
ON workout_time_protocols(exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_time_protocols_block_exercise 
ON workout_time_protocols(block_id, exercise_id, exercise_order);

-- Make columns NOT NULL after migration (uncomment after verifying migration)
-- Note: Only set NOT NULL if you're sure all existing records have these values
-- ALTER TABLE workout_time_protocols
-- ALTER COLUMN exercise_id SET NOT NULL,
-- ALTER COLUMN exercise_order SET NOT NULL;

-- ============================================================
-- 2. UPDATE workout_cluster_sets
-- ============================================================
-- Add new columns
ALTER TABLE workout_cluster_sets
ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES workout_blocks(id),
ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES exercises(id),
ADD COLUMN IF NOT EXISTS exercise_order INTEGER DEFAULT 1;

-- Migrate data from block_exercise_id to new columns
UPDATE workout_cluster_sets cs
SET 
  block_id = wbe.block_id,
  exercise_id = wbe.exercise_id,
  exercise_order = wbe.exercise_order
FROM workout_block_exercises wbe
WHERE cs.block_exercise_id = wbe.id
  AND cs.block_id IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workout_cluster_sets_block_exercise 
ON workout_cluster_sets(block_id, exercise_id, exercise_order);

-- Make columns NOT NULL after migration (uncomment after verifying migration)
-- ALTER TABLE workout_cluster_sets
-- ALTER COLUMN block_id SET NOT NULL,
-- ALTER COLUMN exercise_id SET NOT NULL,
-- ALTER COLUMN exercise_order SET NOT NULL;

-- Drop old column (after verifying data migration and setting NOT NULL)
-- ALTER TABLE workout_cluster_sets DROP COLUMN block_exercise_id;

-- ============================================================
-- 3. UPDATE workout_drop_sets
-- ============================================================
-- Add new columns
ALTER TABLE workout_drop_sets
ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES workout_blocks(id),
ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES exercises(id),
ADD COLUMN IF NOT EXISTS exercise_order INTEGER DEFAULT 1;

-- Migrate data from block_exercise_id to new columns
UPDATE workout_drop_sets ds
SET 
  block_id = wbe.block_id,
  exercise_id = wbe.exercise_id,
  exercise_order = wbe.exercise_order
FROM workout_block_exercises wbe
WHERE ds.block_exercise_id = wbe.id
  AND ds.block_id IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workout_drop_sets_block_exercise 
ON workout_drop_sets(block_id, exercise_id, exercise_order);

-- Make columns NOT NULL after migration (uncomment after verifying migration)
-- ALTER TABLE workout_drop_sets
-- ALTER COLUMN block_id SET NOT NULL,
-- ALTER COLUMN exercise_id SET NOT NULL,
-- ALTER COLUMN exercise_order SET NOT NULL;

-- Drop old column (after verifying data migration and setting NOT NULL)
-- ALTER TABLE workout_drop_sets DROP COLUMN block_exercise_id;

-- ============================================================
-- 4. UPDATE workout_rest_pause_sets
-- ============================================================
-- Add new columns
ALTER TABLE workout_rest_pause_sets
ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES workout_blocks(id),
ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES exercises(id),
ADD COLUMN IF NOT EXISTS exercise_order INTEGER DEFAULT 1;

-- Migrate data from block_exercise_id to new columns
UPDATE workout_rest_pause_sets rps
SET 
  block_id = wbe.block_id,
  exercise_id = wbe.exercise_id,
  exercise_order = wbe.exercise_order
FROM workout_block_exercises wbe
WHERE rps.block_exercise_id = wbe.id
  AND rps.block_id IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workout_rest_pause_sets_block_exercise 
ON workout_rest_pause_sets(block_id, exercise_id, exercise_order);

-- Make columns NOT NULL after migration (uncomment after verifying migration)
-- ALTER TABLE workout_rest_pause_sets
-- ALTER COLUMN block_id SET NOT NULL,
-- ALTER COLUMN exercise_id SET NOT NULL,
-- ALTER COLUMN exercise_order SET NOT NULL;

-- Drop old column (after verifying data migration and setting NOT NULL)
-- ALTER TABLE workout_rest_pause_sets DROP COLUMN block_exercise_id;

-- ============================================================
-- 5. UPDATE workout_pyramid_sets
-- ============================================================
-- Add new columns
ALTER TABLE workout_pyramid_sets
ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES workout_blocks(id),
ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES exercises(id),
ADD COLUMN IF NOT EXISTS exercise_order INTEGER DEFAULT 1;

-- Migrate data from block_exercise_id to new columns
UPDATE workout_pyramid_sets ps
SET 
  block_id = wbe.block_id,
  exercise_id = wbe.exercise_id,
  exercise_order = wbe.exercise_order
FROM workout_block_exercises wbe
WHERE ps.block_exercise_id = wbe.id
  AND ps.block_id IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workout_pyramid_sets_block_exercise 
ON workout_pyramid_sets(block_id, exercise_id, exercise_order);

-- Make columns NOT NULL after migration (uncomment after verifying migration)
-- ALTER TABLE workout_pyramid_sets
-- ALTER COLUMN block_id SET NOT NULL,
-- ALTER COLUMN exercise_id SET NOT NULL,
-- ALTER COLUMN exercise_order SET NOT NULL;

-- Drop old column (after verifying data migration and setting NOT NULL)
-- ALTER TABLE workout_pyramid_sets DROP COLUMN block_exercise_id;

-- ============================================================
-- 6. UPDATE workout_ladder_sets
-- ============================================================
-- Add new columns
ALTER TABLE workout_ladder_sets
ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES workout_blocks(id),
ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES exercises(id),
ADD COLUMN IF NOT EXISTS exercise_order INTEGER DEFAULT 1;

-- Migrate data from block_exercise_id to new columns
UPDATE workout_ladder_sets ls
SET 
  block_id = wbe.block_id,
  exercise_id = wbe.exercise_id,
  exercise_order = wbe.exercise_order
FROM workout_block_exercises wbe
WHERE ls.block_exercise_id = wbe.id
  AND ls.block_id IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workout_ladder_sets_block_exercise 
ON workout_ladder_sets(block_id, exercise_id, exercise_order);

-- Make columns NOT NULL after migration (uncomment after verifying migration)
-- ALTER TABLE workout_ladder_sets
-- ALTER COLUMN block_id SET NOT NULL,
-- ALTER COLUMN exercise_id SET NOT NULL,
-- ALTER COLUMN exercise_order SET NOT NULL;

-- Drop old column (after verifying data migration and setting NOT NULL)
-- ALTER TABLE workout_ladder_sets DROP COLUMN block_exercise_id;

-- ============================================================
-- 7. VERIFICATION QUERIES
-- ============================================================
-- Check if all records were migrated successfully
SELECT 
  'workout_cluster_sets' as table_name,
  COUNT(*) as total_records,
  COUNT(block_id) as records_with_block_id,
  COUNT(exercise_id) as records_with_exercise_id,
  COUNT(block_exercise_id) as records_with_old_column
FROM workout_cluster_sets
UNION ALL
SELECT 
  'workout_drop_sets',
  COUNT(*),
  COUNT(block_id),
  COUNT(exercise_id),
  COUNT(block_exercise_id)
FROM workout_drop_sets
UNION ALL
SELECT 
  'workout_rest_pause_sets',
  COUNT(*),
  COUNT(block_id),
  COUNT(exercise_id),
  COUNT(block_exercise_id)
FROM workout_rest_pause_sets
UNION ALL
SELECT 
  'workout_pyramid_sets',
  COUNT(*),
  COUNT(block_id),
  COUNT(exercise_id),
  COUNT(block_exercise_id)
FROM workout_pyramid_sets
UNION ALL
SELECT 
  'workout_ladder_sets',
  COUNT(*),
  COUNT(block_id),
  COUNT(exercise_id),
  COUNT(block_exercise_id)
FROM workout_ladder_sets;

-- Check for any records that failed to migrate
SELECT 'workout_cluster_sets' as table_name, id, block_exercise_id 
FROM workout_cluster_sets 
WHERE block_id IS NULL AND block_exercise_id IS NOT NULL
UNION ALL
SELECT 'workout_drop_sets', id::text, block_exercise_id::text 
FROM workout_drop_sets 
WHERE block_id IS NULL AND block_exercise_id IS NOT NULL
UNION ALL
SELECT 'workout_rest_pause_sets', id::text, block_exercise_id::text 
FROM workout_rest_pause_sets 
WHERE block_id IS NULL AND block_exercise_id IS NOT NULL
UNION ALL
SELECT 'workout_pyramid_sets', id::text, block_exercise_id::text 
FROM workout_pyramid_sets 
WHERE block_id IS NULL AND block_exercise_id IS NOT NULL
UNION ALL
SELECT 'workout_ladder_sets', id::text, block_exercise_id::text 
FROM workout_ladder_sets 
WHERE block_id IS NULL AND block_exercise_id IS NOT NULL;


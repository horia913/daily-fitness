-- ============================================================================
-- Delete Duplicate Exercises
-- Purpose: Remove duplicate exercises, keeping the oldest one of each group
-- WARNING: This will delete duplicate exercises from the database
-- ============================================================================
-- 
-- IMPORTANT: This script:
-- 1. Identifies duplicates by name and coach_id
-- 2. Keeps the oldest exercise (by created_at) in each duplicate group
-- 3. Deletes all newer duplicates
-- 
-- Before running, check for foreign key constraints:
-- - workout_block_exercises
-- - workout_drop_sets
-- - workout_cluster_sets
-- - workout_rest_pause_sets
-- - workout_pyramid_sets
-- - workout_ladder_sets
-- - workout_time_protocols
-- - exercise_alternatives
-- - workout_exercise_logs
-- 
-- If duplicates are referenced in workouts, you may need to update those references
-- to point to the kept exercise before deleting.
-- ============================================================================

BEGIN;

-- Step 1: Create a temporary table with exercises to keep
-- (the oldest one in each duplicate group)
CREATE TEMP TABLE exercises_to_keep AS
WITH duplicates AS (
  SELECT 
    name,
    coach_id,
    COUNT(*) as duplicate_count
  FROM exercises
  GROUP BY name, coach_id
  HAVING COUNT(*) > 1
),
ranked_exercises AS (
  SELECT 
    e.id,
    e.name,
    e.coach_id,
    e.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY e.name, e.coach_id 
      ORDER BY e.created_at ASC
    ) as keep_priority
  FROM exercises e
  INNER JOIN duplicates d ON e.name = d.name AND e.coach_id = d.coach_id
)
SELECT id
FROM ranked_exercises
WHERE keep_priority = 1;

-- Step 2: Show what will be deleted (for verification)
SELECT 
  e.id,
  e.name,
  e.coach_id,
  e.created_at,
  'WILL BE DELETED' as action
FROM exercises e
INNER JOIN (
  SELECT name, coach_id
  FROM exercises
  GROUP BY name, coach_id
  HAVING COUNT(*) > 1
) d ON e.name = d.name AND e.coach_id = d.coach_id
WHERE e.id NOT IN (SELECT id FROM exercises_to_keep)
ORDER BY e.name, e.created_at;

-- Step 3: Delete duplicate exercises (keeping the oldest ones)
-- First, we need to handle foreign key constraints
-- Delete from dependent tables first, then delete exercises

-- Delete exercise alternatives for duplicates
DELETE FROM exercise_alternatives
WHERE primary_exercise_id IN (
  SELECT e.id
  FROM exercises e
  INNER JOIN (
    SELECT name, coach_id
    FROM exercises
    GROUP BY name, coach_id
    HAVING COUNT(*) > 1
  ) d ON e.name = d.name AND e.coach_id = d.coach_id
  WHERE e.id NOT IN (SELECT id FROM exercises_to_keep)
)
OR alternative_exercise_id IN (
  SELECT e.id
  FROM exercises e
  INNER JOIN (
    SELECT name, coach_id
    FROM exercises
    GROUP BY name, coach_id
    HAVING COUNT(*) > 1
  ) d ON e.name = d.name AND e.coach_id = d.coach_id
  WHERE e.id NOT IN (SELECT id FROM exercises_to_keep)
);

-- Delete from workout block exercises
DELETE FROM workout_block_exercises
WHERE exercise_id IN (
  SELECT e.id
  FROM exercises e
  INNER JOIN (
    SELECT name, coach_id
    FROM exercises
    GROUP BY name, coach_id
    HAVING COUNT(*) > 1
  ) d ON e.name = d.name AND e.coach_id = d.coach_id
  WHERE e.id NOT IN (SELECT id FROM exercises_to_keep)
);

-- Delete from workout drop sets
DELETE FROM workout_drop_sets
WHERE exercise_id IN (
  SELECT e.id
  FROM exercises e
  INNER JOIN (
    SELECT name, coach_id
    FROM exercises
    GROUP BY name, coach_id
    HAVING COUNT(*) > 1
  ) d ON e.name = d.name AND e.coach_id = d.coach_id
  WHERE e.id NOT IN (SELECT id FROM exercises_to_keep)
);

-- Delete from workout cluster sets
DELETE FROM workout_cluster_sets
WHERE exercise_id IN (
  SELECT e.id
  FROM exercises e
  INNER JOIN (
    SELECT name, coach_id
    FROM exercises
    GROUP BY name, coach_id
    HAVING COUNT(*) > 1
  ) d ON e.name = d.name AND e.coach_id = d.coach_id
  WHERE e.id NOT IN (SELECT id FROM exercises_to_keep)
);

-- Delete from workout rest pause sets
DELETE FROM workout_rest_pause_sets
WHERE exercise_id IN (
  SELECT e.id
  FROM exercises e
  INNER JOIN (
    SELECT name, coach_id
    FROM exercises
    GROUP BY name, coach_id
    HAVING COUNT(*) > 1
  ) d ON e.name = d.name AND e.coach_id = d.coach_id
  WHERE e.id NOT IN (SELECT id FROM exercises_to_keep)
);

-- Delete from workout pyramid sets
DELETE FROM workout_pyramid_sets
WHERE exercise_id IN (
  SELECT e.id
  FROM exercises e
  INNER JOIN (
    SELECT name, coach_id
    FROM exercises
    GROUP BY name, coach_id
    HAVING COUNT(*) > 1
  ) d ON e.name = d.name AND e.coach_id = d.coach_id
  WHERE e.id NOT IN (SELECT id FROM exercises_to_keep)
);

-- Delete from workout ladder sets
DELETE FROM workout_ladder_sets
WHERE exercise_id IN (
  SELECT e.id
  FROM exercises e
  INNER JOIN (
    SELECT name, coach_id
    FROM exercises
    GROUP BY name, coach_id
    HAVING COUNT(*) > 1
  ) d ON e.name = d.name AND e.coach_id = d.coach_id
  WHERE e.id NOT IN (SELECT id FROM exercises_to_keep)
);

-- Delete from workout time protocols
DELETE FROM workout_time_protocols
WHERE exercise_id IN (
  SELECT e.id
  FROM exercises e
  INNER JOIN (
    SELECT name, coach_id
    FROM exercises
    GROUP BY name, coach_id
    HAVING COUNT(*) > 1
  ) d ON e.name = d.name AND e.coach_id = d.coach_id
  WHERE e.id NOT IN (SELECT id FROM exercises_to_keep)
);

-- Finally, delete the duplicate exercises themselves
DELETE FROM exercises
WHERE id IN (
  SELECT e.id
  FROM exercises e
  INNER JOIN (
    SELECT name, coach_id
    FROM exercises
    GROUP BY name, coach_id
    HAVING COUNT(*) > 1
  ) d ON e.name = d.name AND e.coach_id = d.coach_id
  WHERE e.id NOT IN (SELECT id FROM exercises_to_keep)
);

-- Step 4: Verification - Count remaining exercises
SELECT 
  COUNT(*) as total_exercises_remaining,
  COUNT(DISTINCT name || '|' || coach_id::text) as unique_exercise_names
FROM exercises;

-- Step 5: Verify no duplicates remain
SELECT 
  name,
  coach_id,
  COUNT(*) as count
FROM exercises
GROUP BY name, coach_id
HAVING COUNT(*) > 1;
-- Should return 0 rows

COMMIT;

-- ============================================================================
-- Summary Query (run after deletion to verify)
-- ============================================================================
SELECT 
  'Total exercises' as metric,
  COUNT(*)::text as value
FROM exercises
UNION ALL
SELECT 
  'Unique exercise names',
  COUNT(DISTINCT name || '|' || coach_id::text)::text
FROM exercises;

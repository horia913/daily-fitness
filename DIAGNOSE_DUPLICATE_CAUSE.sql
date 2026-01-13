-- ============================================================================
-- Diagnose Why Duplicates Were Created
-- Purpose: Investigate the root cause of duplicate exercises
-- ============================================================================
-- 
-- This script helps identify:
-- 1. If bulk inserts were run multiple times (same created_at timestamps)
-- 2. If duplicates were created manually at different times
-- 3. If there's a pattern in how duplicates were created
-- ============================================================================

-- Step 1: Check if duplicates have the same created_at timestamp
-- (This would indicate bulk insert scripts were run multiple times)
WITH duplicates AS (
  SELECT 
    name,
    coach_id,
    COUNT(*) as duplicate_count
  FROM exercises
  GROUP BY name, coach_id
  HAVING COUNT(*) > 1
),
timestamp_counts AS (
  SELECT 
    name,
    coach_id,
    COUNT(DISTINCT created_at) as unique_timestamps,
    COUNT(*) as total_duplicates
  FROM exercises
  WHERE (name, coach_id) IN (SELECT name, coach_id FROM duplicates)
  GROUP BY name, coach_id
)
SELECT 
  e.name,
  e.coach_id,
  e.id,
  e.created_at,
  tc.unique_timestamps,
  tc.total_duplicates,
  CASE 
    WHEN tc.unique_timestamps = 1 
    THEN 'BULK_INSERT_MULTIPLE_RUNS' 
    ELSE 'MANUAL_OR_DIFFERENT_TIMES' 
  END as likely_cause
FROM exercises e
INNER JOIN duplicates d ON e.name = d.name AND e.coach_id = d.coach_id
INNER JOIN timestamp_counts tc ON e.name = tc.name AND e.coach_id = tc.coach_id
ORDER BY e.name, e.created_at;

-- Step 2: Check if there are exercises with identical created_at timestamps
-- (This would confirm bulk insert was run multiple times)
SELECT 
  name,
  coach_id,
  created_at,
  COUNT(*) as count_at_same_time,
  ARRAY_AGG(id ORDER BY id) as exercise_ids
FROM exercises
GROUP BY name, coach_id, created_at
HAVING COUNT(*) > 1
ORDER BY created_at DESC, count_at_same_time DESC;

-- Step 3: Check the distribution of created_at timestamps for duplicates
-- (Shows if duplicates were created in batches or spread over time)
WITH duplicates AS (
  SELECT 
    name,
    coach_id,
    COUNT(*) as duplicate_count
  FROM exercises
  GROUP BY name, coach_id
  HAVING COUNT(*) > 1
)
SELECT 
  DATE_TRUNC('hour', e.created_at) as hour_bucket,
  COUNT(*) as duplicates_created_in_hour,
  COUNT(DISTINCT e.name) as unique_exercise_names,
  MIN(e.created_at) as first_in_bucket,
  MAX(e.created_at) as last_in_bucket
FROM exercises e
INNER JOIN duplicates d ON e.name = d.name AND e.coach_id = d.coach_id
WHERE e.id NOT IN (
  -- Exclude the ones we'll keep (oldest)
  SELECT DISTINCT ON (name, coach_id) id
  FROM exercises
  WHERE (name, coach_id) IN (SELECT name, coach_id FROM duplicates)
  ORDER BY name, coach_id, created_at ASC
)
GROUP BY DATE_TRUNC('hour', e.created_at)
ORDER BY hour_bucket DESC;

-- Step 4: Check if there's a unique constraint on (name, coach_id)
-- (This query will show if the constraint exists)
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'exercises'::regclass
  AND contype IN ('u', 'p')  -- unique or primary key
ORDER BY contype, conname;

-- Step 5: Summary - Most likely cause
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM exercises e1
      INNER JOIN exercises e2 ON e1.name = e2.name AND e1.coach_id = e2.coach_id
      WHERE e1.id != e2.id 
        AND e1.created_at = e2.created_at
    ) THEN 'BULK_INSERT_SCRIPTS_RUN_MULTIPLE_TIMES'
    WHEN EXISTS (
      SELECT 1
      FROM exercises
      GROUP BY name, coach_id, created_at
      HAVING COUNT(*) > 1
    ) THEN 'BULK_INSERT_SCRIPTS_RUN_MULTIPLE_TIMES'
    ELSE 'MANUAL_CREATION_OR_OTHER_ISSUE'
  END as most_likely_root_cause,
  (SELECT COUNT(*) FROM exercises) as total_exercises,
  (SELECT COUNT(DISTINCT name || '|' || coach_id::text) FROM exercises) as unique_exercise_names,
  (SELECT COUNT(*) - COUNT(DISTINCT name || '|' || coach_id::text) FROM exercises) as duplicate_count;

-- ============================================================================
-- Find Duplicate Exercises
-- Purpose: Identify duplicate exercises by name and coach_id
-- ============================================================================
-- 
-- This query finds exercises with the same name and coach_id
-- It shows which ones to keep (oldest) and which to delete (newer duplicates)
-- ============================================================================

-- Step 1: Find all duplicate exercises grouped by name and coach_id
SELECT 
  name,
  coach_id,
  COUNT(*) as duplicate_count,
  MIN(created_at) as oldest_created,
  MAX(created_at) as newest_created,
  ARRAY_AGG(id ORDER BY created_at ASC) as exercise_ids,
  ARRAY_AGG(created_at ORDER BY created_at ASC) as created_dates
FROM exercises
GROUP BY name, coach_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, name;

-- Step 2: Show detailed information about duplicates
-- This shows which specific exercises are duplicates
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
  e.id,
  e.name,
  e.coach_id,
  e.category,
  e.created_at,
  e.updated_at,
  d.duplicate_count,
  ROW_NUMBER() OVER (
    PARTITION BY e.name, e.coach_id 
    ORDER BY e.created_at ASC
  ) as keep_priority
FROM exercises e
INNER JOIN duplicates d ON e.name = d.name AND e.coach_id = d.coach_id
ORDER BY e.name, e.coach_id, e.created_at ASC;

-- Step 3: Count total duplicates to delete
WITH duplicates AS (
  SELECT 
    name,
    coach_id,
    COUNT(*) as duplicate_count
  FROM exercises
  GROUP BY name, coach_id
  HAVING COUNT(*) > 1
),
exercise_ranks AS (
  SELECT 
    e.id,
    e.name,
    e.coach_id,
    ROW_NUMBER() OVER (
      PARTITION BY e.name, e.coach_id 
      ORDER BY e.created_at ASC
    ) as keep_priority
  FROM exercises e
  INNER JOIN duplicates d ON e.name = d.name AND e.coach_id = d.coach_id
)
SELECT 
  COUNT(*) as total_duplicates_to_delete,
  COUNT(DISTINCT name || '|' || coach_id::text) as unique_duplicate_groups
FROM exercise_ranks
WHERE keep_priority > 1;

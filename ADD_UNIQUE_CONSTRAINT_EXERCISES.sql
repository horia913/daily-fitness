-- ============================================================================
-- Add Unique Constraint to Prevent Duplicate Exercises
-- Purpose: Prevent duplicate exercises with same name for same coach
-- ============================================================================
-- 
-- This adds a database-level rule that prevents creating duplicate exercises.
-- If someone tries to create an exercise with the same name for the same coach,
-- the database will automatically reject it with an error.
-- ============================================================================

-- Add unique constraint on (name, coach_id)
-- This ensures each coach can only have one exercise with each name
ALTER TABLE exercises 
ADD CONSTRAINT unique_exercise_name_per_coach 
UNIQUE (name, coach_id);

-- Verify the constraint was added
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'exercises'::regclass
  AND conname = 'unique_exercise_name_per_coach';

-- Test query to verify no duplicates exist (should return 0 rows)
SELECT 
  name,
  coach_id,
  COUNT(*) as count
FROM exercises
GROUP BY name, coach_id
HAVING COUNT(*) > 1;
-- Should return 0 rows - if it returns rows, duplicates still exist

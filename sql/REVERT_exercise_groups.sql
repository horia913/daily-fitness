-- =====================================================
-- REVERT: Remove Exercise Groups Implementation
-- =====================================================
-- USE THIS ONLY IF YOU NEED TO ROLL BACK THE CHANGES
-- Run this to completely remove the exercise groups feature
-- =====================================================

-- IMPORTANT: This will REMOVE the exercise groups table
-- and all columns added to workout_template_exercises
-- You will lose any data saved with the new structure!

-- Step 1: DROP the new table
DROP TABLE IF EXISTS public.workout_exercise_groups CASCADE;

-- Step 2: REMOVE columns added to existing table
ALTER TABLE public.workout_template_exercises
  DROP COLUMN IF EXISTS group_id,
  DROP COLUMN IF EXISTS group_letter,
  DROP COLUMN IF EXISTS work_seconds,
  DROP COLUMN IF EXISTS weight_kg;

-- Step 3: DROP indexes created for exercise groups
DROP INDEX IF EXISTS idx_workout_exercise_groups_template;
DROP INDEX IF EXISTS idx_workout_exercise_groups_order;
DROP INDEX IF EXISTS idx_workout_template_exercises_group;

-- Success message
SELECT 'Exercise groups schema reverted successfully! Database is back to original state.' as message;


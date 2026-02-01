-- ============================================================================
-- Migration: Add indexes for workout special tables
-- Date: 2026-01-31
-- 
-- Purpose:
-- Improve query performance for workout_block_exercises and special block type
-- tables (cluster_sets, drop_sets, etc.) which are frequently queried by block_id.
-- These queries were causing statement timeouts.
-- ============================================================================

-- Index for workout_block_exercises
CREATE INDEX IF NOT EXISTS idx_workout_block_exercises_block_id
ON public.workout_block_exercises (block_id);

-- Index for workout_cluster_sets
CREATE INDEX IF NOT EXISTS idx_workout_cluster_sets_block_id
ON public.workout_cluster_sets (block_id);

-- Index for workout_drop_sets
CREATE INDEX IF NOT EXISTS idx_workout_drop_sets_block_id
ON public.workout_drop_sets (block_id);

-- Index for workout_rest_pause_sets
CREATE INDEX IF NOT EXISTS idx_workout_rest_pause_sets_block_id
ON public.workout_rest_pause_sets (block_id);

-- Index for workout_time_protocols
CREATE INDEX IF NOT EXISTS idx_workout_time_protocols_block_id
ON public.workout_time_protocols (block_id);

-- Index for workout_hr_sets
CREATE INDEX IF NOT EXISTS idx_workout_hr_sets_block_id
ON public.workout_hr_sets (block_id);

-- Index for workout_pyramid_sets
CREATE INDEX IF NOT EXISTS idx_workout_pyramid_sets_block_id
ON public.workout_pyramid_sets (block_id);

-- Index for workout_ladder_sets
CREATE INDEX IF NOT EXISTS idx_workout_ladder_sets_block_id
ON public.workout_ladder_sets (block_id);

-- Also add indexes on exercise_id for faster joins
CREATE INDEX IF NOT EXISTS idx_workout_block_exercises_exercise_id
ON public.workout_block_exercises (exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_cluster_sets_exercise_id
ON public.workout_cluster_sets (exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_drop_sets_exercise_id
ON public.workout_drop_sets (exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_rest_pause_sets_exercise_id
ON public.workout_rest_pause_sets (exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_time_protocols_exercise_id
ON public.workout_time_protocols (exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_hr_sets_exercise_id
ON public.workout_hr_sets (exercise_id);

-- Verify indexes were created
DO $$
BEGIN
  RAISE NOTICE 'Workout special tables indexes created successfully';
END $$;

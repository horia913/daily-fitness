-- ============================================================
-- DROP block_exercise_id from all special block tables
-- ============================================================
-- This removes block_exercise_id column from tables that have it
-- Use CASCADE to handle any constraints

-- Drop from workout_cluster_sets
ALTER TABLE workout_cluster_sets DROP COLUMN IF EXISTS block_exercise_id CASCADE;

-- Drop from workout_drop_sets
ALTER TABLE workout_drop_sets DROP COLUMN IF EXISTS block_exercise_id CASCADE;

-- Drop from workout_rest_pause_sets
ALTER TABLE workout_rest_pause_sets DROP COLUMN IF EXISTS block_exercise_id CASCADE;

-- Drop from workout_pyramid_sets
ALTER TABLE workout_pyramid_sets DROP COLUMN IF EXISTS block_exercise_id CASCADE;

-- Drop from workout_ladder_sets
ALTER TABLE workout_ladder_sets DROP COLUMN IF EXISTS block_exercise_id CASCADE;

-- Note: workout_time_protocols may not have block_exercise_id, but if it does:
ALTER TABLE workout_time_protocols DROP COLUMN IF EXISTS block_exercise_id CASCADE;


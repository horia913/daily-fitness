-- ============================================================
-- CLEANUP: workout_cluster_sets
-- ============================================================
-- DROP: intra_set_rest (not needed)
-- ADD: weight_kg (missing)
ALTER TABLE workout_cluster_sets DROP COLUMN IF EXISTS intra_set_rest CASCADE;
ALTER TABLE workout_cluster_sets ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10, 2);

-- ============================================================
-- CLEANUP: workout_drop_sets
-- ============================================================
-- DROP: rest_seconds (rest is stored in workout_blocks.rest_seconds)
-- ADD: drop_percentage (percentage reduction from previous weight)
ALTER TABLE workout_drop_sets DROP COLUMN IF EXISTS rest_seconds CASCADE;
ALTER TABLE workout_drop_sets ADD COLUMN IF NOT EXISTS drop_percentage INTEGER;

-- ============================================================
-- CLEANUP: workout_rest_pause_sets
-- ============================================================
-- RENAME: initial_weight_kg → weight_kg (to match naming convention)
-- DROP: initial_reps (reps are tracked in workout_blocks table, rest pauses are always to failure)
ALTER TABLE workout_rest_pause_sets RENAME COLUMN initial_weight_kg TO weight_kg;
ALTER TABLE workout_rest_pause_sets DROP COLUMN IF EXISTS initial_reps CASCADE;


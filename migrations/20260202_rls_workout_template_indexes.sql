-- ============================================================================
-- Migration: RLS join-path indexes for workout_template / workout_blocks / workout_block_exercises
-- Purpose: Make coach RLS policies cheap without changing security.
--
-- Failing request: SELECT from workout_block_exercises WHERE block_id IN (...).
-- Coach SELECT policy: EXISTS (workout_blocks wb JOIN workout_templates wt ON wb.template_id = wt.id
--   WHERE wb.id = workout_block_exercises.block_id AND wt.coach_id = auth.uid()).
-- So the RLS subquery joins: block_id -> workout_blocks.id -> workout_blocks.template_id -> workout_templates.id, filter wt.coach_id = auth.uid().
-- ============================================================================

-- Index so "templates owned by this coach" is an index scan (used in RLS and in coach template list).
CREATE INDEX IF NOT EXISTS idx_workout_templates_coach_id
ON workout_templates (coach_id);

-- workout_blocks(template_id) already exists as idx_workout_blocks_template (template_id, block_order) in 20260202_perf_indexes.
-- workout_block_exercises(block_id) already exists (idx_workout_block_exercises_block).
-- No change to RLS policies; security unchanged.

-- ============================================================================
-- Unique partial index: prevent duplicate incomplete workout logs per assignment
-- Run in Supabase SQL editor.
--
-- NOTE: One in-progress session per program day is already enforced by
-- idx_unique_in_progress_session (see 20260303_unique_in_progress_session.sql).
-- ============================================================================

-- Prevent two incomplete workout logs for the same assignment
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_logs_one_incomplete_per_assignment
  ON workout_logs(client_id, workout_assignment_id)
  WHERE completed_at IS NULL;

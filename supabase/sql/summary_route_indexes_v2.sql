-- Indexes for /api/client/workouts/summary EXPLAIN findings (Seq Scan + Sort)

-- workout_assignments: filter client_id, order scheduled_date desc
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_assignments_client_scheduled_date_desc
  ON public.workout_assignments (client_id, scheduled_date DESC);

-- program_assignment_progress: filter client_id + is_program_completed, order created_at desc, limit 1
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_assignment_progress_client_completed_created_desc
  ON public.program_assignment_progress (client_id, is_program_completed, created_at DESC);

-- program_assignments: filter client_id, order created_at desc
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_assignments_client_created_desc
  ON public.program_assignments (client_id, created_at DESC);

-- workout_logs: filter client_id + completed_at IS NOT NULL, order completed_at desc, limit 100
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_logs_client_completed_at_desc_not_null
  ON public.workout_logs (client_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

-- Rollback
DROP INDEX CONCURRENTLY IF EXISTS idx_workout_logs_client_completed_at_desc_not_null;
DROP INDEX CONCURRENTLY IF EXISTS idx_program_assignments_client_created_desc;
DROP INDEX CONCURRENTLY IF EXISTS idx_program_assignment_progress_client_completed_created_desc;
DROP INDEX CONCURRENTLY IF EXISTS idx_workout_assignments_client_scheduled_date_desc;

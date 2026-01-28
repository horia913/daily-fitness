-- Summary route index plan (run each statement separately; CREATE INDEX CONCURRENTLY cannot run inside a transaction)

-- program_workout_completions: assignment_progress_id + week_number
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_workout_completions_assignment_week
  ON public.program_workout_completions (assignment_progress_id, week_number);

-- workout_assignments: client_id + scheduled_date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_assignments_client_scheduled_date
  ON public.workout_assignments (client_id, scheduled_date);

-- program_assignment_progress: client_id + is_program_completed + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_assignment_progress_client_completed_created
  ON public.program_assignment_progress (client_id, is_program_completed, created_at);

-- workout_logs: client_id + completed_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_logs_client_completed_at
  ON public.workout_logs (client_id, completed_at);

-- program_assignments: client_id + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_assignments_client_created_at
  ON public.program_assignments (client_id, created_at);

-- workout_blocks: template_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_blocks_template_id
  ON public.workout_blocks (template_id);

-- client_program_progression_rules: program_assignment_id + week_number + block_id + block_order + exercise_order
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_program_rules_assignment_week_block_order
  ON public.client_program_progression_rules (
    program_assignment_id,
    week_number,
    block_id,
    block_order,
    exercise_order
  );

-- program_schedule: program_id + week_number + day_of_week
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_schedule_program_week_day
  ON public.program_schedule (program_id, week_number, day_of_week);

-- program_assignments: program_id + client_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_assignments_program_client
  ON public.program_assignments (program_id, client_id);

-- Rollback
DROP INDEX CONCURRENTLY IF EXISTS idx_program_workout_completions_assignment_week;
DROP INDEX CONCURRENTLY IF EXISTS idx_workout_assignments_client_scheduled_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_program_assignment_progress_client_completed_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_workout_logs_client_completed_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_program_assignments_client_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_workout_blocks_template_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_client_program_rules_assignment_week_block_order;
DROP INDEX CONCURRENTLY IF EXISTS idx_program_schedule_program_week_day;
DROP INDEX CONCURRENTLY IF EXISTS idx_program_assignments_program_client;

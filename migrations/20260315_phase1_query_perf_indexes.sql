-- ============================================================================
-- Phase 1 Query Performance: Missing indexes
-- Run in Supabase SQL editor. All use IF NOT EXISTS for idempotency.
-- ============================================================================

-- body_metrics: heavily filtered by client_id
CREATE INDEX IF NOT EXISTS idx_body_metrics_client_date
  ON body_metrics(client_id, measured_date DESC);

-- workout_set_entry_exercises: filtered by set_entry_id
CREATE INDEX IF NOT EXISTS idx_wse_exercises_set_entry
  ON workout_set_entry_exercises(set_entry_id);

-- workout_set_entries: filtered by template_id
CREATE INDEX IF NOT EXISTS idx_wse_template
  ON workout_set_entries(template_id, set_order);

-- program_schedule: queried 14 times
CREATE INDEX IF NOT EXISTS idx_program_schedule_program
  ON program_schedule(program_id, week_number, day_number);

-- program_day_completions: queried frequently
CREATE INDEX IF NOT EXISTS idx_pdc_assignment
  ON program_day_completions(program_assignment_id);

-- daily_wellness_logs: date ranges
CREATE INDEX IF NOT EXISTS idx_wellness_client_date
  ON daily_wellness_logs(client_id, log_date DESC);

-- personal_records: joined with exercises, current records
CREATE INDEX IF NOT EXISTS idx_pr_client_current
  ON personal_records(client_id, is_current_record) WHERE is_current_record = true;

-- meal_food_items: joined with foods
CREATE INDEX IF NOT EXISTS idx_meal_food_items_meal
  ON meal_food_items(meal_id);

-- workout_logs: heavily filtered
CREATE INDEX IF NOT EXISTS idx_workout_logs_client_completed
  ON workout_logs(client_id, completed_at DESC);

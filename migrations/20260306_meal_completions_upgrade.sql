-- Migration: 20260306_meal_completions_upgrade.sql
-- Phase N3: Add columns and constraints for option-aware, date-scoped meal completions.

-- Add meal_option_id (which option the client chose)
ALTER TABLE meal_completions
  ADD COLUMN IF NOT EXISTS meal_option_id UUID REFERENCES meal_options(id);

-- Add date for per-day queries and unique constraint
ALTER TABLE meal_completions
  ADD COLUMN IF NOT EXISTS date DATE;

-- Add assignment reference for tracking which plan this completion belongs to
ALTER TABLE meal_completions
  ADD COLUMN IF NOT EXISTS meal_plan_assignment_id UUID REFERENCES meal_plan_assignments(id);

-- Backfill date from completed_at for existing rows
UPDATE meal_completions
SET date = (completed_at AT TIME ZONE 'UTC')::date
WHERE date IS NULL AND completed_at IS NOT NULL;

-- Unique constraint: one completion per client per meal per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_completions_unique_per_day
  ON meal_completions (client_id, meal_id, date);

-- Index for efficient daily lookups
CREATE INDEX IF NOT EXISTS idx_meal_completions_client_date
  ON meal_completions (client_id, date);

-- Index for assignment-level queries
CREATE INDEX IF NOT EXISTS idx_meal_completions_assignment
  ON meal_completions (meal_plan_assignment_id);

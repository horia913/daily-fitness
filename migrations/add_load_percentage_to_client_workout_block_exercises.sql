-- Add load_percentage column to client_workout_block_exercises
-- This field stores the percentage of 1RM to use for the exercise
-- Used to calculate suggested weight based on user's estimated 1RM

ALTER TABLE client_workout_block_exercises
  ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2);

-- Add comment for documentation
COMMENT ON COLUMN client_workout_block_exercises.load_percentage IS 'Percentage of estimated 1RM to use for this exercise. Used to calculate suggested weight (e.g., 70 = 70% of 1RM).';


-- Add load_percentage column to program_progression_rules
-- This field stores the percentage of 1RM to use for the exercise
-- Used to calculate suggested weight based on user's estimated 1RM

ALTER TABLE program_progression_rules
  ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2);

-- Add comment for documentation
COMMENT ON COLUMN program_progression_rules.load_percentage IS 'Percentage of estimated 1RM to use for this exercise. Used to calculate suggested weight (e.g., 70 = 70% of 1RM).';


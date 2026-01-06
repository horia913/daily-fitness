-- Add missing columns to client_program_progression_rules
-- Based on verification findings: table exists but missing load_percentage and block_name columns

-- Add load_percentage column (code inserts this value at programProgressionService.ts line 391)
ALTER TABLE client_program_progression_rules
  ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2);

-- Add block_name column (exists in program_progression_rules, may be needed for consistency)
ALTER TABLE client_program_progression_rules
  ADD COLUMN IF NOT EXISTS block_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN client_program_progression_rules.load_percentage IS 'Percentage of estimated 1RM to use for this exercise. Used to calculate suggested weight (e.g., 70 = 70% of 1RM).';
COMMENT ON COLUMN client_program_progression_rules.block_name IS 'Optional name for the workout block (e.g., "Warm-up", "Main Set", "Finisher").';


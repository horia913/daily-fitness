-- Add rest_after_set column to workout_time_protocols table
-- This column stores the rest time after completing all exercises in a set
-- Only used by circuit and tabata protocol types

ALTER TABLE workout_time_protocols
ADD COLUMN IF NOT EXISTS rest_after_set INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN workout_time_protocols.rest_after_set IS 'Rest time in seconds after completing all exercises in the set. Only used for circuit and tabata protocol types. Same value for all exercises in the same set.';

-- Create index for faster queries when filtering by set
CREATE INDEX IF NOT EXISTS idx_workout_time_protocols_rest_after_set 
ON workout_time_protocols(block_id, set, rest_after_set) 
WHERE rest_after_set IS NOT NULL;


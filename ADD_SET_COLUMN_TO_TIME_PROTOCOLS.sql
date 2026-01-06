-- Add set column to workout_time_protocols table
-- This column stores the set number for Tabata and Circuit exercises
-- Only used by tabata and circuit protocol types

ALTER TABLE workout_time_protocols
ADD COLUMN IF NOT EXISTS set INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN workout_time_protocols.set IS 'Set number for Tabata/Circuit exercises. All exercises in the same set have the same set number.';

-- Create index for faster queries when filtering by set
CREATE INDEX IF NOT EXISTS idx_workout_time_protocols_set 
ON workout_time_protocols(block_id, set) 
WHERE set IS NOT NULL;


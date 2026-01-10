-- Add missing columns to workout_time_protocols table

-- Add target_reps column (for for_time and amrap blocks)
ALTER TABLE workout_time_protocols
ADD COLUMN IF NOT EXISTS target_reps INTEGER;

-- Add time_cap_minutes column (for for_time blocks)
ALTER TABLE workout_time_protocols
ADD COLUMN IF NOT EXISTS time_cap_minutes INTEGER;

-- Add emom_mode column (for emom blocks - stores 'target_reps' or 'target_time')
ALTER TABLE workout_time_protocols
ADD COLUMN IF NOT EXISTS emom_mode VARCHAR(50);

-- Add comments to explain the columns
COMMENT ON COLUMN workout_time_protocols.target_reps IS 'Target rep count for for_time and amrap protocol types';
COMMENT ON COLUMN workout_time_protocols.time_cap_minutes IS 'Time cap in minutes for for_time protocol type';
COMMENT ON COLUMN workout_time_protocols.emom_mode IS 'EMOM mode: target_reps or target_time';

-- Verify the columns were added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_time_protocols'
  AND column_name IN ('target_reps', 'time_cap_minutes', 'emom_mode')
ORDER BY column_name;

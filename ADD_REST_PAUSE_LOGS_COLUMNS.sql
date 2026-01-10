-- Add missing columns to workout_set_logs for rest_pause logging
-- These columns should match what workout_rest_pause_sets stores

-- Check if columns already exist before adding
DO $$
BEGIN
    -- Add rest_pause_duration column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workout_set_logs' 
        AND column_name = 'rest_pause_duration'
    ) THEN
        ALTER TABLE workout_set_logs 
        ADD COLUMN rest_pause_duration INTEGER;
        
        RAISE NOTICE 'Added rest_pause_duration column';
    ELSE
        RAISE NOTICE 'rest_pause_duration column already exists';
    END IF;

    -- Add max_rest_pauses column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workout_set_logs' 
        AND column_name = 'max_rest_pauses'
    ) THEN
        ALTER TABLE workout_set_logs 
        ADD COLUMN max_rest_pauses INTEGER;
        
        RAISE NOTICE 'Added max_rest_pauses column';
    ELSE
        RAISE NOTICE 'max_rest_pauses column already exists';
    END IF;
END $$;

-- Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_set_logs'
  AND column_name IN ('rest_pause_duration', 'max_rest_pauses')
ORDER BY column_name;

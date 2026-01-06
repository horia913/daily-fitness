-- Check if block_parameters column exists in workout_blocks table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_blocks'
  AND column_name = 'block_parameters';

-- Check all columns in workout_blocks to see what exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_blocks'
ORDER BY ordinal_position;

-- Check if there's a JSON or JSONB column in workout_blocks
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workout_blocks'
  AND (data_type = 'json' OR data_type = 'jsonb');


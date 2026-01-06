-- Check actual column names in program_workout_completions table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'program_workout_completions'
ORDER BY ordinal_position;


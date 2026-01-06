-- Check assignment_progress table (your program assignments)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'assignment_progress'
ORDER BY ordinal_position;

-- Also check program_schedule if it exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'program_schedule'
ORDER BY ordinal_position;


-- Check assignment_progress table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'assignment_progress'
ORDER BY ordinal_position;


-- Check program_assignments
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'program_assignments'
ORDER BY ordinal_position;

-- Separator
SELECT '---SEPARATOR---' as separator;

-- Check program_assignment_progress
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'program_assignment_progress'
ORDER BY ordinal_position;


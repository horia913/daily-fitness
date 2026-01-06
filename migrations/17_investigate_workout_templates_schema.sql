-- Investigate workout_templates table schema
-- Find out what columns actually exist and how categories are linked

-- Step 1: Check all columns in workout_templates table
-- ============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_templates'
ORDER BY ordinal_position;

-- Step 2: Check if category_id column exists
-- ============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_templates'
  AND column_name LIKE '%categor%';

-- Step 3: Check foreign key relationships
-- ============================================================================

SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'workout_templates';

-- Step 4: Check RLS policies on workout_templates
-- ============================================================================

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'workout_templates'
ORDER BY cmd, policyname;

-- Step 5: Sample data to see actual structure
-- ============================================================================

SELECT 
  id,
  name,
  coach_id,
  category_id,
  category,
  is_active,
  created_at
FROM workout_templates
LIMIT 5;


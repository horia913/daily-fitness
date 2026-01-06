-- ============================================================================
-- Investigation: Other JSON Columns Across the App
-- Purpose: Find and analyze JSON columns in meal plans, nutrition, challenges, etc.
-- ============================================================================

-- Step 1: Find all remaining JSON columns
-- ============================================================================

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (data_type = 'json' OR data_type = 'jsonb')
  AND table_name NOT IN (
    'exercises',
    'workout_blocks',
    'client_workout_blocks',
    'workout_block_assignments',
    'client_workout_block_exercises',
    'workout_exercise_logs',
    'workout_set_logs',
    'daily_workout_cache'
  )
ORDER BY table_name, column_name;

-- Step 2: Analyze daily_workout_cache (cache table - may be acceptable as JSON)
-- ============================================================================

SELECT 
  'daily_workout_cache' as table_name,
  COUNT(*) as total_rows,
  COUNT(workout_data) as rows_with_json,
  jsonb_typeof(workout_data) as json_type,
  jsonb_object_keys(workout_data) as sample_keys
FROM daily_workout_cache
WHERE workout_data IS NOT NULL
LIMIT 5;

-- Decision: Cache tables are typically acceptable to keep as JSON for performance
-- However, we should verify if this can be replaced with proper relational queries

-- Step 3: Check meal-related tables for JSON
-- ============================================================================

SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (data_type = 'json' OR data_type = 'jsonb')
  AND (
    table_name LIKE '%meal%'
    OR table_name LIKE '%food%'
    OR table_name LIKE '%nutrition%'
  )
ORDER BY table_name, column_name;

-- Step 4: Check challenge-related tables for JSON
-- ============================================================================

SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (data_type = 'json' OR data_type = 'jsonb')
  AND (
    table_name LIKE '%challenge%'
    OR table_name LIKE '%goal%'
    OR table_name LIKE '%habit%'
  )
ORDER BY table_name, column_name;

-- Step 5: Check other feature tables
-- ============================================================================

SELECT 
  table_name,
  column_name,
  data_type,
  (SELECT COUNT(*) FROM information_schema.columns c2 
   WHERE c2.table_name = c.table_name 
   AND c2.table_schema = 'public') as total_columns
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND (c.data_type = 'json' OR c.data_type = 'jsonb')
  AND c.table_name NOT LIKE '%workout%'
  AND c.table_name NOT LIKE '%exercise%'
  AND c.table_name NOT LIKE '%meal%'
  AND c.table_name NOT LIKE '%food%'
  AND c.table_name NOT LIKE '%challenge%'
  AND c.table_name NOT LIKE '%goal%'
  AND c.table_name NOT LIKE '%habit%'
  AND c.table_name NOT LIKE '%cache%'
ORDER BY c.table_name, c.column_name;

-- Step 6: Summary report
-- ============================================================================

-- Generate summary of all JSON columns found
SELECT 
  table_name,
  COUNT(*) as json_column_count,
  STRING_AGG(column_name, ', ' ORDER BY column_name) as json_columns,
  CASE 
    WHEN table_name LIKE '%cache%' THEN 'CACHE - May be acceptable as JSON'
    WHEN table_name LIKE '%log%' THEN 'LOG - May need migration'
    WHEN table_name LIKE '%assignment%' THEN 'ASSIGNMENT - May need migration'
    ELSE 'FEATURE - Needs analysis'
  END as category
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (data_type = 'json' OR data_type = 'jsonb')
GROUP BY table_name
ORDER BY 
  CASE 
    WHEN table_name LIKE '%cache%' THEN 1
    WHEN table_name LIKE '%log%' THEN 2
    WHEN table_name LIKE '%assignment%' THEN 3
    ELSE 4
  END,
  table_name;


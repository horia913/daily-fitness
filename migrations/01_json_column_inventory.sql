-- ============================================================================
-- JSON Column Inventory - Complete Database Scan
-- Purpose: Identify ALL JSON/JSONB columns across the entire database
-- ============================================================================

-- Query 1: Find all JSON/JSONB columns across entire database
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (data_type = 'json' OR data_type = 'jsonb')
ORDER BY table_name, column_name;

-- Query 2: Count JSON columns per table
SELECT 
  table_name,
  COUNT(*) as json_column_count,
  STRING_AGG(column_name, ', ' ORDER BY column_name) as json_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (data_type = 'json' OR data_type = 'jsonb')
GROUP BY table_name
ORDER BY json_column_count DESC, table_name;

-- Query 3: Check for tables with both JSON and non-JSON columns (to understand context)
SELECT 
  t.table_name,
  COUNT(DISTINCT CASE WHEN c.data_type IN ('json', 'jsonb') THEN c.column_name END) as json_cols,
  COUNT(DISTINCT CASE WHEN c.data_type NOT IN ('json', 'jsonb') THEN c.column_name END) as non_json_cols,
  COUNT(DISTINCT c.column_name) as total_cols
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND c.table_schema = 'public'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
HAVING COUNT(DISTINCT CASE WHEN c.data_type IN ('json', 'jsonb') THEN c.column_name END) > 0
ORDER BY json_cols DESC, t.table_name;

-- Query 4: Sample row counts for tables with JSON columns (to understand data volume)
SELECT 
  table_name,
  CASE table_name
    WHEN 'exercises' THEN (SELECT COUNT(*) FROM exercises)
    WHEN 'workout_blocks' THEN (SELECT COUNT(*) FROM workout_blocks)
    WHEN 'client_workout_blocks' THEN (SELECT COUNT(*) FROM client_workout_blocks)
    WHEN 'workout_block_assignments' THEN (SELECT COUNT(*) FROM workout_block_assignments)
    WHEN 'client_workout_block_exercises' THEN (SELECT COUNT(*) FROM client_workout_block_exercises)
    WHEN 'workout_exercise_logs' THEN (SELECT COUNT(*) FROM workout_exercise_logs)
    WHEN 'workout_set_logs' THEN (SELECT COUNT(*) FROM workout_set_logs)
    WHEN 'daily_workout_cache' THEN (SELECT COUNT(*) FROM daily_workout_cache)
    ELSE NULL
  END as row_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (data_type = 'json' OR data_type = 'jsonb')
GROUP BY table_name
ORDER BY table_name;


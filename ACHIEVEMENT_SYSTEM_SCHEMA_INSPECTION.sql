-- ============================================================================
-- ACHIEVEMENT SYSTEM SCHEMA INSPECTION
-- Purpose: Understand current achievement table structures
-- Run these queries and share results to design the achievement system
-- ============================================================================

-- 1. ACHIEVEMENTS TABLE STRUCTURE (may be templates or client achievements)
-- ============================================================================
SELECT 
    'achievements' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'achievements'
ORDER BY ordinal_position;

-- 2. CHECK FOR USER_ACHIEVEMENTS TABLE (or similar)
-- ============================================================================
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%achievement%' 
       OR table_name LIKE '%user_achievement%'
       OR table_name LIKE '%client_achievement%')
ORDER BY table_name;

-- 3. CHECK FOR ACHIEVEMENT_TEMPLATES TABLE
-- ============================================================================
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%template%'
ORDER BY table_name;

-- 4. SAMPLE DATA FROM ACHIEVEMENTS TABLE
-- ============================================================================
SELECT 
    'Sample achievements data' as info,
    id,
    client_id,
    title,
    description,
    achievement_type,
    metric_type,
    metric_value,
    metric_unit,
    achieved_date,
    is_public,
    goal_id,
    workout_id,
    created_at
FROM achievements
LIMIT 5;

-- 5. CHECK FOREIGN KEY RELATIONSHIPS FOR ACHIEVEMENTS
-- ============================================================================
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name LIKE '%achievement%'
       OR ccu.table_name LIKE '%achievement%')
ORDER BY tc.table_name, kcu.column_name;

-- 6. CHECK IF ACHIEVEMENTS TABLE HAS client_id OR IS FOR TEMPLATES
-- ============================================================================
-- If client_id exists and is NOT NULL, it's for client achievements
-- If client_id doesn't exist or is NULL, it might be templates
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'achievements' 
            AND column_name = 'client_id'
        ) THEN 'Has client_id column - likely stores client achievements'
        ELSE 'No client_id column - might be templates'
    END as table_purpose,
    COUNT(*) as total_records,
    COUNT(DISTINCT client_id) as unique_clients,
    COUNT(*) FILTER (WHERE client_id IS NULL) as null_client_records,
    COUNT(*) FILTER (WHERE client_id IS NOT NULL) as client_records
FROM achievements;

-- 7. CHECK DATA DISTRIBUTION (if client_id exists)
-- ============================================================================
SELECT 
    client_id,
    COUNT(*) as achievement_count,
    MIN(achieved_date) as first_achievement,
    MAX(achieved_date) as latest_achievement
FROM achievements
WHERE client_id IS NOT NULL
GROUP BY client_id
ORDER BY achievement_count DESC
LIMIT 10;

-- 8. CHECK FOR UNIQUE CONSTRAINTS OR INDEXES
-- ============================================================================
SELECT
    t.relname AS table_name,
    i.relname AS index_name,
    a.attname AS column_name,
    ix.indisunique AS is_unique,
    ix.indisprimary AS is_primary
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relkind = 'r'
  AND t.relname LIKE '%achievement%'
ORDER BY t.relname, i.relname;

-- 9. CHECK IF THERE ARE JSON/JSONB COLUMNS (CRITICAL - user wants NO JSON)
-- ============================================================================
SELECT 
    table_name,
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'json' OR data_type = 'jsonb' THEN '⚠️ JSON COLUMN FOUND - NEEDS FLATTENING'
        ELSE 'OK'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name LIKE '%achievement%' 
       OR table_name LIKE '%user_achievement%'
       OR table_name LIKE '%client_achievement%')
  AND (data_type = 'json' OR data_type = 'jsonb')
ORDER BY table_name, column_name;

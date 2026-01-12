-- ============================================================================
-- CHECK USER_ACHIEVEMENTS TABLE STRUCTURE
-- Purpose: Understand the existing user_achievements table structure
-- ============================================================================

-- 1. USER_ACHIEVEMENTS TABLE STRUCTURE
-- ============================================================================
SELECT 
    'user_achievements' as table_name,
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
  AND table_name = 'user_achievements'
ORDER BY ordinal_position;

-- 2. CHECK FOREIGN KEY RELATIONSHIPS FOR USER_ACHIEVEMENTS
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
  AND tc.table_name = 'user_achievements'
ORDER BY kcu.column_name;

-- 3. SAMPLE DATA FROM USER_ACHIEVEMENTS (if any)
-- ============================================================================
SELECT *
FROM user_achievements
LIMIT 5;

-- 4. CHECK FOR JSON/JSONB COLUMNS IN USER_ACHIEVEMENTS (CRITICAL)
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
  AND table_name = 'user_achievements'
  AND (data_type = 'json' OR data_type = 'jsonb')
ORDER BY column_name;

-- 5. CHECK DATA DISTRIBUTION
-- ============================================================================
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT achievement_id) as unique_achievements
FROM user_achievements;

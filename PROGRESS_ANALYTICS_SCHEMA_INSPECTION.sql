-- ============================================================================
-- PROGRESS & ANALYTICS DATABASE SCHEMA INSPECTION
-- Purpose: Understand exact table structures for progress tracking
-- Run these queries and share results for comprehensive analysis
-- ============================================================================

-- 1. WORKOUT SESSIONS TABLE STRUCTURE
-- ============================================================================
-- Purpose: Understand workout_sessions table (session lifecycle)
SELECT 
    'workout_sessions' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_sessions'
ORDER BY ordinal_position;

-- 2. WORKOUT LOGS TABLE STRUCTURE
-- ============================================================================
-- Purpose: Understand workout_logs table (performance data: sets/reps/weight)
SELECT 
    'workout_logs' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_logs'
ORDER BY ordinal_position;

-- 3. WORKOUT SET LOGS TABLE STRUCTURE
-- ============================================================================
-- Purpose: Individual set records with weight/reps
SELECT 
    'workout_set_logs' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_set_logs'
ORDER BY ordinal_position;

-- 4. WORKOUT ASSIGNMENTS TABLE STRUCTURE
-- ============================================================================
-- Purpose: Understand how workouts are assigned to clients
SELECT 
    'workout_assignments' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_assignments'
ORDER BY ordinal_position;

-- 5. PROGRAMS TABLE STRUCTURE
-- ============================================================================
-- Purpose: Understand program structure for weekly goal calculation
SELECT 
    'workout_programs' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_programs'
ORDER BY ordinal_position;

-- 6. PROGRAM WEEKS/WORKOUTS RELATIONSHIP
-- ============================================================================
-- Purpose: Understand how programs have weeks and workouts configured
-- Check for program_weeks or similar tables
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%program%' 
       OR table_name LIKE '%week%'
       OR table_name LIKE '%schedule%')
ORDER BY table_name;

-- 7. BODY METRICS TABLE STRUCTURE
-- ============================================================================
SELECT 
    'body_metrics' as table_name,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'body_metrics'
ORDER BY ordinal_position;

-- 8. GOALS TABLE STRUCTURE
-- ============================================================================
SELECT 
    'goals' as table_name,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'goals'
ORDER BY ordinal_position;

-- 9. ACHIEVEMENTS TABLE STRUCTURE
-- ============================================================================
SELECT 
    'achievements' as table_name,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'achievements'
ORDER BY ordinal_position;

-- 10. PERFORMANCE TESTS TABLE STRUCTURE
-- ============================================================================
SELECT 
    'performance_tests' as table_name,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'performance_tests'
ORDER BY ordinal_position;

-- 11. PERSONAL RECORDS TABLE STRUCTURE
-- ============================================================================
SELECT 
    'personal_records' as table_name,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'personal_records'
ORDER BY ordinal_position;

-- 12. LEADERBOARD ENTRIES TABLE STRUCTURE
-- ============================================================================
SELECT 
    'leaderboard_entries' as table_name,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leaderboard_entries'
ORDER BY ordinal_position;

-- 13. MOBILITY TESTS TABLE STRUCTURE
-- ============================================================================
SELECT 
    'mobility_tests' as table_name,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mobility_tests'
ORDER BY ordinal_position;

-- 14. CHECK FOREIGN KEY RELATIONSHIPS
-- ============================================================================
-- Purpose: Verify relationships between workout_sessions, workout_logs, workout_assignments
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
  AND (tc.table_name IN ('workout_sessions', 'workout_logs', 'workout_set_logs', 'workout_assignments')
       OR ccu.table_name IN ('workout_sessions', 'workout_logs', 'workout_set_logs', 'workout_assignments'))
ORDER BY tc.table_name, kcu.column_name;

-- 15. SAMPLE DATA QUERIES - Check actual data structure
-- ============================================================================
-- Get sample workout_session to understand relationships
SELECT 
    'Sample workout_sessions' as info,
    id,
    client_id,
    assignment_id,
    status,
    started_at,
    completed_at,
    created_at
FROM workout_sessions
LIMIT 1;

-- Get sample workout_logs to understand relationships
SELECT 
    'Sample workout_logs' as info,
    id,
    client_id,
    workout_assignment_id,
    workout_session_id,
    started_at,
    completed_at,
    total_duration_minutes,
    total_sets_completed,
    total_reps_completed,
    total_weight_lifted,
    created_at
FROM workout_logs
LIMIT 1;

-- Check if workout_logs links to workout_sessions
SELECT 
    COUNT(*) as total_logs,
    COUNT(workout_session_id) as logs_with_session_id,
    COUNT(*) - COUNT(workout_session_id) as logs_without_session_id
FROM workout_logs;

-- 16. PROGRAM ASSIGNMENTS TABLE STRUCTURE
-- ============================================================================
-- Purpose: Understand how programs are assigned to clients
SELECT 
    'program_assignments' as table_name,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'program_assignments'
ORDER BY ordinal_position;

-- 17. PROGRAM DAYS TABLE STRUCTURE
-- ============================================================================
-- Purpose: Understand program days structure (how weeks/workouts are configured)
SELECT 
    'program_days' as table_name,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'program_days'
ORDER BY ordinal_position;

-- 18. PROGRAM DAY ASSIGNMENTS TABLE STRUCTURE
-- ============================================================================
-- Purpose: Understand how program days link to workout assignments
SELECT 
    'program_day_assignments' as table_name,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'program_day_assignments'
ORDER BY ordinal_position;

-- 19. SAMPLE PROGRAM STRUCTURE QUERIES
-- ============================================================================
-- Get sample program assignment to understand structure
SELECT 
    'Sample program_assignments' as info,
    id,
    program_id,
    client_id,
    start_date,
    total_days,
    current_day_number,
    completed_days,
    status,
    duration_weeks
FROM program_assignments
WHERE status = 'active'
LIMIT 1;

-- Get sample program days to understand structure
-- NOTE: week_number does NOT exist in program_days - weeks calculated from day_number
SELECT 
    'Sample program_days' as info,
    id,
    program_id,
    day_number,
    day_type,
    workout_template_id,
    name
FROM program_days
ORDER BY program_id, day_number
LIMIT 5;

-- Get sample program day assignments to understand relationships
-- NOTE: week_number does NOT exist - weeks must be calculated from day_number
SELECT 
    'Sample program_day_assignments' as info,
    id,
    program_assignment_id,
    program_day_id,
    workout_assignment_id,
    day_number,
    is_completed,
    completed_date,
    program_day
FROM program_day_assignments
ORDER BY program_assignment_id, day_number
LIMIT 5;

-- 20. UNDERSTAND WEEK CALCULATION LOGIC
-- ============================================================================
-- Calculate workouts per week from program_assignments
-- Example: 16 total_days, 8 duration_weeks = 2 workouts per week
SELECT 
    'Workouts per week calculation' as info,
    id,
    client_id,
    program_id,
    total_days,
    duration_weeks,
    CASE 
        WHEN duration_weeks > 0 THEN ROUND(total_days::numeric / duration_weeks, 2)
        ELSE NULL
    END as workouts_per_week,
    start_date,
    status
FROM program_assignments
WHERE status = 'active'
LIMIT 3;

-- Get program day assignments grouped by week (calculated)
-- Week = CEIL(day_number / workouts_per_week)
-- FIX: Handle division by zero when total_days = 0 or duration_weeks = 0
SELECT 
    'Program day assignments with calculated week' as info,
    pda.id,
    pda.program_assignment_id,
    pda.day_number,
    pa.total_days,
    pa.duration_weeks,
    CASE 
        WHEN pa.total_days > 0 AND pa.duration_weeks > 0 THEN 
            CEIL(pda.day_number::numeric / NULLIF((pa.total_days::numeric / pa.duration_weeks), 0))
        ELSE NULL
    END as calculated_week,
    pda.is_completed,
    pda.completed_date,
    pda.workout_assignment_id
FROM program_day_assignments pda
JOIN program_assignments pa ON pa.id = pda.program_assignment_id
WHERE pa.status = 'active'
ORDER BY pda.program_assignment_id, pda.day_number
LIMIT 10;

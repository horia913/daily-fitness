-- ============================================================
-- SQL Verification Queries for Training Program Tables
-- ============================================================
-- Run these queries in Supabase SQL Editor to verify table structures
-- ============================================================

-- ============================================================
-- 1. CHECK IF TABLES EXIST
-- ============================================================

-- Check all program-related tables
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN (
        'workout_programs',
        'program_schedule',
        'program_assignments',
        'program_progression_rules',
        'client_program_progression_rules'
    )
ORDER BY table_name;

-- ============================================================
-- 2. VERIFY workout_programs TABLE STRUCTURE
-- ============================================================

-- Get all columns for workout_programs
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'workout_programs'
ORDER BY ordinal_position;

-- ============================================================
-- 3. VERIFY program_schedule TABLE STRUCTURE
-- ============================================================

-- Get all columns for program_schedule
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'program_schedule'
ORDER BY ordinal_position;

-- ============================================================
-- 4. VERIFY program_assignments TABLE STRUCTURE
-- ============================================================

-- Get all columns for program_assignments
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'program_assignments'
ORDER BY ordinal_position;

-- ============================================================
-- 5. VERIFY program_progression_rules TABLE STRUCTURE
-- ============================================================

-- Get all columns for program_progression_rules
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'program_progression_rules'
ORDER BY ordinal_position;

-- Count total columns (should be 40+)
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'program_progression_rules';

-- Check if load_percentage column exists
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'program_progression_rules'
    AND column_name = 'load_percentage';

-- ============================================================
-- 6. VERIFY client_program_progression_rules TABLE STRUCTURE
-- ============================================================

-- CRITICAL: Check if client_program_progression_rules exists
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'client_program_progression_rules'
ORDER BY ordinal_position;

-- Count columns in client_program_progression_rules (if exists)
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'client_program_progression_rules';

-- Check for client_id and program_assignment_id columns (should exist)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'client_program_progression_rules'
    AND column_name IN ('client_id', 'program_assignment_id');

-- ============================================================
-- 7. VERIFY FOREIGN KEY RELATIONSHIPS
-- ============================================================

-- Foreign keys for program_progression_rules
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'program_progression_rules'
ORDER BY tc.table_name, kcu.column_name;

-- Foreign keys for client_program_progression_rules (if exists)
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'client_program_progression_rules'
ORDER BY tc.table_name, kcu.column_name;

-- Foreign keys for program_schedule
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'program_schedule'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================
-- 8. VERIFY RLS POLICIES
-- ============================================================

-- Check if RLS is enabled on program tables
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'workout_programs',
        'program_schedule',
        'program_assignments',
        'program_progression_rules',
        'client_program_progression_rules'
    )
ORDER BY tablename;

-- Get RLS policies for program_progression_rules
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'program_progression_rules'
ORDER BY policyname;

-- Get RLS policies for program_schedule
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'program_schedule'
ORDER BY policyname;

-- Get RLS policies for client_program_progression_rules (if exists)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'client_program_progression_rules'
ORDER BY policyname;

-- ============================================================
-- 9. VERIFY INDEXES
-- ============================================================

-- Indexes on program_progression_rules
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'program_progression_rules'
ORDER BY indexname;

-- Indexes on client_program_progression_rules (if exists)
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'client_program_progression_rules'
ORDER BY indexname;

-- ============================================================
-- 10. COMPARE COLUMNS: program_progression_rules vs client_program_progression_rules
-- ============================================================

-- Compare column lists (if client_program_progression_rules exists)
SELECT 
    'program_progression_rules' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'program_progression_rules'
    AND column_name NOT IN ('id', 'created_at', 'updated_at', 'program_id', 'program_schedule_id', 'week_number')

UNION ALL

SELECT 
    'client_program_progression_rules' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'client_program_progression_rules'
    AND column_name NOT IN ('id', 'created_at', 'updated_at', 'client_id', 'program_assignment_id', 'week_number')

ORDER BY column_name, table_name;

-- Find columns in program_progression_rules but NOT in client_program_progression_rules
SELECT 
    ppr.column_name,
    ppr.data_type
FROM information_schema.columns ppr
LEFT JOIN information_schema.columns cppr 
    ON ppr.column_name = cppr.column_name
    AND cppr.table_name = 'client_program_progression_rules'
    AND cppr.table_schema = 'public'
WHERE ppr.table_schema = 'public'
    AND ppr.table_name = 'program_progression_rules'
    AND cppr.column_name IS NULL
    AND ppr.column_name NOT IN ('id', 'created_at', 'updated_at', 'program_id', 'program_schedule_id')
ORDER BY ppr.column_name;

-- ============================================================
-- 11. CHECK FOR MISSING COLUMNS (based on code usage)
-- ============================================================

-- Check if is_public column exists in workout_programs (interface says it doesn't)
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'workout_programs'
    AND column_name = 'is_public';

-- Check if is_optional column exists in program_schedule (interface says it doesn't)
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'program_schedule'
    AND column_name = 'is_optional';

-- ============================================================
-- SUMMARY QUERY: Quick overview of all tables
-- ============================================================

SELECT 
    t.table_name,
    COUNT(c.column_name) as column_count,
    CASE WHEN t.rowsecurity THEN 'Yes' ELSE 'No' END as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = 'public') as policy_count
FROM pg_tables t
LEFT JOIN information_schema.columns c
    ON c.table_schema = t.schemaname
    AND c.table_name = t.tablename
WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'workout_programs',
        'program_schedule',
        'program_assignments',
        'program_progression_rules',
        'client_program_progression_rules'
    )
GROUP BY t.table_name, t.rowsecurity
ORDER BY t.table_name;


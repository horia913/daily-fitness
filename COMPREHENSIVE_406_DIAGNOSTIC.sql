-- =====================================================
-- COMPREHENSIVE 406 ERROR DIAGNOSTIC
-- =====================================================
-- This script gathers all information about the 406 error

-- 1. EXACT SQL QUERY ANALYSIS
-- =====================================================
SELECT 
    'EXACT FAILING QUERY' as section,
    'The query causing 406 error:' as description,
    'GET /rest/v1/workout_assignments?select=*&id=eq.7529d313-d23d-40ca-9927-01739e25824c&client_id=eq.af9325e2-76e7-4df6-8ed7-9effd9c764d8' as failing_query;

-- Convert to actual SQL:
SELECT 
    'CONVERTED SQL QUERY' as section,
    'Equivalent SQL query:' as description,
    'SELECT * FROM public.workout_assignments WHERE id = ''7529d313-d23d-40ca-9927-01739e25824c'' AND client_id = ''af9325e2-76e7-4df6-8ed7-9effd9c764d8''' as sql_query;

-- 2. TEST THE EXACT QUERY
-- =====================================================
SELECT 
    'QUERY TEST RESULT' as section,
    CASE 
        WHEN EXISTS (
            SELECT * FROM public.workout_assignments 
            WHERE id = '7529d313-d23d-40ca-9927-01739e25824c' 
            AND client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
        ) THEN 'SUCCESS - Query returns data'
        ELSE 'FAILED - No data returned'
    END as result,
    (SELECT COUNT(*) FROM public.workout_assignments 
     WHERE id = '7529d313-d23d-40ca-9927-01739e25824c' 
     AND client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8') as record_count;

-- 3. RLS STATUS ON ALL RELEVANT TABLES
-- =====================================================
SELECT 
    'RLS STATUS' as section,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED'
        ELSE 'RLS DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'workout_assignments', 'workout_templates', 'workout_categories', 
    'workout_template_exercises', 'exercises', 'profiles', 
    'workout_programs', 'program_assignment_progress', 
    'program_workout_completions', 'workout_sessions'
)
ORDER BY tablename;

-- 4. ALL RLS POLICIES ON RELEVANT TABLES
-- =====================================================
SELECT 
    'RLS POLICIES' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as condition,
    with_check as with_check_condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'workout_assignments', 'workout_templates', 'workout_categories', 
    'workout_template_exercises', 'exercises', 'profiles', 
    'workout_programs', 'program_assignment_progress', 
    'program_workout_completions', 'workout_sessions'
)
ORDER BY tablename, policyname;

-- 5. TABLE PERMISSIONS FOR AUTHENTICATED ROLE
-- =====================================================
SELECT 
    'TABLE PERMISSIONS' as section,
    schemaname,
    tablename,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE grantee = 'authenticated'
AND table_schema = 'public'
AND table_name IN (
    'workout_assignments', 'workout_templates', 'workout_categories', 
    'workout_template_exercises', 'exercises', 'profiles', 
    'workout_programs', 'program_assignment_progress', 
    'program_workout_completions', 'workout_sessions'
)
ORDER BY table_name, privilege_type;

-- 6. RECORD EXISTENCE VERIFICATION
-- =====================================================
SELECT 
    'RECORD VERIFICATION' as section,
    'workout_assignments' as table_name,
    id,
    client_id,
    template_id,
    status,
    created_at
FROM public.workout_assignments 
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c';

-- 7. FOREIGN KEY RELATIONSHIPS
-- =====================================================
SELECT 
    'FOREIGN KEY RELATIONSHIPS' as section,
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
AND tc.table_schema = 'public'
AND tc.table_name IN (
    'workout_assignments', 'workout_templates', 'workout_categories', 
    'workout_template_exercises', 'exercises', 'profiles', 
    'workout_programs', 'program_assignment_progress', 
    'program_workout_completions', 'workout_sessions'
)
ORDER BY tc.table_name;

-- 8. CURRENT USER CONTEXT
-- =====================================================
SELECT 
    'USER CONTEXT' as section,
    current_user as current_user,
    session_user as session_user,
    current_setting('role') as current_role,
    current_setting('request.jwt.claims') as jwt_claims;

-- 9. POLICY EVALUATION TEST
-- =====================================================
-- Test if policies would allow the query
SELECT 
    'POLICY EVALUATION' as section,
    'Testing if policies allow the query...' as description;

-- Try to simulate the query with current user context
SET LOCAL ROLE authenticated;
SELECT 
    'POLICY TEST AS AUTHENTICATED' as section,
    COUNT(*) as accessible_records
FROM public.workout_assignments 
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c' 
AND client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

RESET ROLE;

SELECT 'Comprehensive diagnostic complete! Check all sections above.' as message;

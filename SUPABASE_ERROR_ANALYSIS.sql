-- =====================================================
-- SUPABASE ERROR ANALYSIS
-- =====================================================
-- This script helps identify specific error causes

-- 1. CHECK IF THE RECORD EXISTS AND IS ACCESSIBLE
-- =====================================================
SELECT 
    'RECORD ACCESS TEST' as test_type,
    wa.id,
    wa.client_id,
    wa.template_id,
    wa.status,
    CASE 
        WHEN wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8' 
        THEN '✅ Client ID matches'
        ELSE '❌ Client ID mismatch'
    END as client_match,
    CASE 
        WHEN wa.id = '7529d313-d23d-40ca-9927-01739e25824c' 
        THEN '✅ ID matches'
        ELSE '❌ ID mismatch'
    END as id_match
FROM public.workout_assignments wa
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c';

-- 2. CHECK ALL POLICIES ON WORKOUT_ASSIGNMENTS TABLE
-- =====================================================
SELECT 
    'WORKOUT_ASSIGNMENTS POLICIES' as section,
    policyname,
    cmd as command,
    qual as condition,
    with_check as with_check_condition,
    permissive,
    roles
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments'
ORDER BY policyname;

-- 3. CHECK IF RLS IS ENABLED ON WORKOUT_ASSIGNMENTS
-- =====================================================
SELECT 
    'WORKOUT_ASSIGNMENTS RLS STATUS' as section,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS ENABLED (could cause 406)'
        ELSE '✅ RLS DISABLED (should work)'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'workout_assignments';

-- 4. CHECK PERMISSIONS ON WORKOUT_ASSIGNMENTS
-- =====================================================
SELECT 
    'WORKOUT_ASSIGNMENTS PERMISSIONS' as section,
    privilege_type,
    is_grantable,
    grantor,
    CASE 
        WHEN privilege_type = 'SELECT' THEN '✅ SELECT permission granted'
        ELSE privilege_type || ' permission'
    END as permission_status
FROM information_schema.table_privileges 
WHERE grantee = 'authenticated'
AND table_schema = 'public'
AND table_name = 'workout_assignments'
ORDER BY privilege_type;

-- 5. TEST DIFFERENT QUERY VARIATIONS
-- =====================================================
-- Test 1: Simple select without WHERE
SELECT 
    'SIMPLE SELECT TEST' as test_type,
    COUNT(*) as total_records,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Can access table'
        ELSE '❌ Cannot access table'
    END as access_status
FROM public.workout_assignments;

-- Test 2: Select with only ID filter
SELECT 
    'ID ONLY FILTER TEST' as test_type,
    COUNT(*) as matching_records,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Can filter by ID'
        ELSE '❌ Cannot filter by ID'
    END as filter_status
FROM public.workout_assignments 
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c';

-- Test 3: Select with only client_id filter
SELECT 
    'CLIENT_ID ONLY FILTER TEST' as test_type,
    COUNT(*) as matching_records,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Can filter by client_id'
        ELSE '❌ Cannot filter by client_id'
    END as filter_status
FROM public.workout_assignments 
WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- Test 4: Exact failing query
SELECT 
    'EXACT FAILING QUERY TEST' as test_type,
    COUNT(*) as matching_records,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Exact query works'
        ELSE '❌ Exact query fails'
    END as query_status
FROM public.workout_assignments 
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c' 
AND client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- 6. CHECK FOR CONSTRAINT VIOLATIONS
-- =====================================================
SELECT 
    'CONSTRAINT CHECK' as section,
    'Checking for any constraints that might block the query...' as description;

-- Check if there are any check constraints
SELECT 
    'CHECK CONSTRAINTS' as constraint_type,
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name = 'workout_assignments'
AND tc.constraint_type = 'CHECK';

-- 7. CURRENT SESSION INFO
-- =====================================================
SELECT 
    'SESSION INFO' as section,
    current_database() as database_name,
    current_schema() as current_schema,
    current_user as current_user,
    session_user as session_user,
    inet_server_addr() as server_address,
    inet_server_port() as server_port;

SELECT 'Error analysis complete! Check results above.' as message;

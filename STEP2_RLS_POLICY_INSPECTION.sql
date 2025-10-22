-- =====================================================
-- STEP 2: DETAILED RLS POLICY INSPECTION AND TEST
-- =====================================================
-- This script inspects the RLS policy and tests it with simulated user context

-- 1. GET CURRENT RLS POLICY DEFINITION
-- =====================================================
SELECT 
    'CURRENT_RLS_POLICY' as section,
    'Getting exact definition of current RLS policy' as description;

-- Get the exact policy definition
SELECT 
    'POLICY_DEFINITION' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command_type,
    qual as using_condition,
    with_check as with_check_condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments'
ORDER BY policyname;

-- 2. CHECK RLS STATUS ON TABLE
-- =====================================================
SELECT 
    'RLS_STATUS_CHECK' as section,
    'Checking if RLS is enabled on the table' as description;

-- Check RLS status
SELECT 
    'TABLE_RLS_STATUS' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS IS ENABLED'
        ELSE '❌ RLS IS DISABLED'
    END as rls_status,
    'If RLS is disabled, policies have no effect' as note
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'workout_assignments';

-- 3. CHECK ALL POLICIES ON THE TABLE
-- =====================================================
SELECT 
    'ALL_POLICIES_CHECK' as section,
    'Checking all policies that might affect the table' as description;

-- Get all policies (there should only be one for SELECT)
SELECT 
    'ALL_POLICIES' as check_type,
    policyname,
    permissive,
    cmd as command,
    roles,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ SELECT POLICY'
        WHEN cmd = 'INSERT' THEN '📝 INSERT POLICY'
        WHEN cmd = 'UPDATE' THEN '✏️ UPDATE POLICY'
        WHEN cmd = 'DELETE' THEN '🗑️ DELETE POLICY'
        WHEN cmd = 'ALL' THEN '🔄 ALL COMMANDS POLICY'
        ELSE '❓ OTHER: ' || cmd
    END as policy_type,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments'
ORDER BY policyname;

-- 4. TEST POLICY CONDITION SYNTAX
-- =====================================================
SELECT 
    'POLICY_CONDITION_SYNTAX_TEST' as section,
    'Testing if the policy condition syntax is valid' as description;

-- Test the policy condition syntax by trying to evaluate it
-- This will help identify if there are syntax issues
SELECT 
    'CONDITION_SYNTAX_TEST' as check_type,
    'Testing: auth.uid() = client_id' as condition_tested,
    CASE 
        WHEN auth.uid() IS NULL THEN '⚠️ AUTH.UID() IS NULL - This will cause policy to fail'
        ELSE '✅ AUTH.UID() IS NOT NULL - Syntax should work'
    END as syntax_check,
    'If auth.uid() is NULL, the policy condition will always be false' as note;

-- 5. SIMULATE AUTHENTICATED USER CONTEXT
-- =====================================================
SELECT 
    'SIMULATED_AUTH_CONTEXT' as section,
    'Simulating authenticated user context for testing' as description;

-- Note: We cannot actually SET ROLE in this context, but we can test the logic
-- with the current auth context
SELECT 
    'AUTH_CONTEXT_SIMULATION' as check_type,
    auth.uid() as current_auth_uid,
    auth.role() as current_auth_role,
    CASE 
        WHEN auth.role() = 'authenticated' THEN '✅ AUTHENTICATED ROLE'
        WHEN auth.role() = 'anon' THEN '❌ ANONYMOUS ROLE'
        WHEN auth.role() IS NULL THEN '❌ NO ROLE'
        ELSE '❓ UNKNOWN ROLE: ' || auth.role()
    END as role_status;

-- 6. TEST THE EXACT QUERY THAT FAILS
-- =====================================================
SELECT 
    'FAILING_QUERY_TEST' as section,
    'Testing the exact query that fails in the application' as description;

-- Test the exact query from the error log
-- This simulates what the application is trying to do
SELECT 
    'APPLICATION_QUERY_SIMULATION' as check_type,
    wa.id,
    wa.client_id,
    wa.template_id,
    wa.status,
    wa.notes,
    wa.created_at,
    wa.updated_at,
    auth.uid() as current_auth_uid,
    CASE 
        WHEN auth.uid() = wa.client_id THEN '✅ POLICY WOULD ALLOW'
        ELSE '❌ POLICY WOULD BLOCK'
    END as rls_prediction
FROM public.workout_assignments wa
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c' 
AND wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- 7. CHECK FOR POLICY CONFLICTS
-- =====================================================
SELECT 
    'POLICY_CONFLICT_CHECK' as section,
    'Checking for conflicting policies or permissions' as description;

-- Check if there are multiple SELECT policies (which could conflict)
SELECT 
    'SELECT_POLICIES_COUNT' as check_type,
    COUNT(*) as select_policies_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ NO SELECT POLICIES - RLS will block all access'
        WHEN COUNT(*) = 1 THEN '✅ SINGLE SELECT POLICY - Should work correctly'
        WHEN COUNT(*) > 1 THEN '⚠️ MULTIPLE SELECT POLICIES - Could cause conflicts'
    END as policy_count_status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments'
AND cmd = 'SELECT';

-- 8. CHECK TABLE PERMISSIONS
-- =====================================================
SELECT 
    'TABLE_PERMISSIONS_CHECK' as section,
    'Checking table-level permissions for authenticated role' as description;

-- Check permissions for the authenticated role
SELECT 
    'AUTHENTICATED_PERMISSIONS' as check_type,
    privilege_type,
    is_grantable,
    grantor,
    CASE 
        WHEN privilege_type = 'SELECT' THEN '✅ SELECT PERMISSION EXISTS'
        WHEN privilege_type = 'INSERT' THEN '📝 INSERT PERMISSION EXISTS'
        WHEN privilege_type = 'UPDATE' THEN '✏️ UPDATE PERMISSION EXISTS'
        WHEN privilege_type = 'DELETE' THEN '🗑️ DELETE PERMISSION EXISTS'
        ELSE privilege_type || ' PERMISSION EXISTS'
    END as permission_status
FROM information_schema.table_privileges 
WHERE grantee = 'authenticated'
AND table_schema = 'public'
AND table_name = 'workout_assignments'
ORDER BY privilege_type;

-- 9. DETAILED POLICY ANALYSIS
-- =====================================================
SELECT 
    'DETAILED_POLICY_ANALYSIS' as section,
    'Detailed analysis of the policy condition' as description;

-- Analyze the policy condition in detail
WITH auth_data AS (
    SELECT auth.uid() as current_auth_uid
),
record_data AS (
    SELECT client_id as record_client_id
    FROM public.workout_assignments 
    WHERE id = '7529d313-d23d-40ca-9927-01739e25824c'
)
SELECT 
    'POLICY_CONDITION_ANALYSIS' as check_type,
    a.current_auth_uid,
    r.record_client_id,
    (a.current_auth_uid = r.record_client_id) as condition_result,
    CASE 
        WHEN a.current_auth_uid IS NULL THEN '❌ AUTH.UID() IS NULL - Policy will always fail'
        WHEN r.record_client_id IS NULL THEN '❌ CLIENT_ID IS NULL - Policy will always fail'
        WHEN (a.current_auth_uid = r.record_client_id) THEN '✅ CONDITION IS TRUE - Access should be allowed'
        ELSE '❌ CONDITION IS FALSE - Access will be blocked'
    END as detailed_analysis;

SELECT 'Step 2 RLS policy inspection complete. Review results for policy issues.' as message;

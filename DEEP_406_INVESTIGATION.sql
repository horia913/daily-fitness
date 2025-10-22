-- =====================================================
-- DEEP 406 INVESTIGATION
-- =====================================================
-- Since policy conflicts were fixed but 406 error persists, we need deeper investigation

-- 1. CHECK CURRENT AUTHENTICATION STATE
-- =====================================================
SELECT 
    'AUTH STATE CHECK' as section,
    auth.uid() as auth_uid,
    auth.role() as auth_role,
    current_user as current_user,
    session_user as session_user;

-- 2. CHECK IF THE RECORD EXISTS AND IS ACCESSIBLE
-- =====================================================
SELECT 
    'RECORD ACCESSIBILITY' as section,
    COUNT(*) as record_count,
    'Should be 1 if record exists' as expected
FROM public.workout_assignments 
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c';

-- 3. CHECK THE EXACT CLIENT_ID VALUE
-- =====================================================
SELECT 
    'CLIENT_ID VALUE' as section,
    client_id as actual_client_id,
    client_id::text as client_id_text,
    length(client_id::text) as client_id_length
FROM public.workout_assignments 
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c';

-- 4. TEST THE EXACT POLICY CONDITION
-- =====================================================
SELECT 
    'POLICY CONDITION TEST' as section,
    auth.role() as current_role,
    (auth.role() = 'authenticated') as policy_condition_result,
    CASE 
        WHEN auth.role() = 'authenticated' THEN '✅ POLICY CONDITION SHOULD PASS'
        ELSE '❌ POLICY CONDITION WILL FAIL - ROLE: ' || auth.role()
    END as policy_status;

-- 5. CHECK IF RLS IS ACTUALLY ENABLED
-- =====================================================
SELECT 
    'RLS STATUS' as section,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS IS ENABLED'
        ELSE '❌ RLS IS DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'workout_assignments';

-- 6. VERIFY CURRENT POLICIES
-- =====================================================
SELECT 
    'CURRENT POLICIES' as section,
    policyname,
    cmd as command,
    permissive,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments'
ORDER BY cmd, policyname;

-- 7. TEST WITH EXPLICIT ROLE SETTING
-- =====================================================
-- This simulates what PostgREST might be doing
SELECT 
    'ROLE SIMULATION' as section,
    'Attempting to simulate PostgREST behavior' as note;

-- Test if we can access the record with current context
SELECT 
    'ACCESS TEST' as test_type,
    wa.id,
    wa.client_id,
    'SUCCESS: Can access record' as result
FROM public.workout_assignments wa
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c'
LIMIT 1;

-- 8. CHECK PERMISSIONS FOR AUTHENTICATED ROLE
-- =====================================================
SELECT 
    'PERMISSIONS CHECK' as section,
    privilege_type,
    is_grantable,
    grantor,
    grantee
FROM information_schema.table_privileges 
WHERE table_schema = 'public'
AND table_name = 'workout_assignments'
AND grantee = 'authenticated'
ORDER BY privilege_type;

-- 9. FINAL DIAGNOSIS
-- =====================================================
SELECT 
    'FINAL DIAGNOSIS' as section,
    CASE 
        WHEN auth.uid() IS NULL THEN 'PROBLEM: AUTH.UID() IS NULL'
        WHEN auth.role() != 'authenticated' THEN 'PROBLEM: NOT AUTHENTICATED ROLE'
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments' AND cmd = 'SELECT') = 0 THEN 'PROBLEM: NO SELECT POLICY'
        WHEN (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_assignments') = false THEN 'PROBLEM: RLS DISABLED'
        ELSE 'UNKNOWN PROBLEM - Need to check PostgREST context'
    END as diagnosis;

SELECT 'Deep investigation complete. Check results for the root cause.' as message;

-- =====================================================
-- TEMPORARY RLS DISABLE TEST
-- =====================================================
-- This temporarily disables RLS to test if that's the root cause

-- 1. CHECK CURRENT RLS STATUS
-- =====================================================
SELECT 
    'BEFORE RLS DISABLE' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'workout_assignments';

-- 2. TEMPORARILY DISABLE RLS
-- =====================================================
SELECT 'DISABLING RLS TEMPORARILY' as action;

ALTER TABLE public.workout_assignments DISABLE ROW LEVEL SECURITY;

-- 3. VERIFY RLS IS DISABLED
-- =====================================================
SELECT 
    'AFTER RLS DISABLE' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS STILL ENABLED'
        ELSE '✅ RLS DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'workout_assignments';

-- 4. TEST THE QUERY WITH RLS DISABLED
-- =====================================================
SELECT 'TESTING QUERY WITH RLS DISABLED' as action;

-- This should work now if RLS was the problem
SELECT 
    'QUERY TEST RESULT' as test,
    wa.id,
    wa.client_id,
    wa.template_id,
    wa.status,
    'SUCCESS: Query works with RLS disabled' as result
FROM public.workout_assignments wa
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c' 
AND wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- 5. PROVIDE NEXT STEPS
-- =====================================================
SELECT 
    'NEXT STEPS' as section,
    '1. Test your app now - 406 error should be gone' as step_1,
    '2. If app works, RLS was the problem' as step_2,
    '3. Run DEEP_406_INVESTIGATION.sql to find the RLS issue' as step_3,
    '4. Re-enable RLS with proper policy once issue is found' as step_4;

SELECT 'RLS temporarily disabled for testing. Test your app now!' as message;

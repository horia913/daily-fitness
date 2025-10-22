-- =====================================================
-- Simple Query Test
-- =====================================================
-- Test the exact query your app is making

-- 1. Check if the record exists at all
SELECT 
    'Record Exists Check' as test_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Record exists'
        ELSE '❌ Record not found'
    END as status
FROM public.workout_assignments 
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c';

-- 2. Check if client_id matches
SELECT 
    'Client ID Check' as test_type,
    client_id,
    CASE 
        WHEN client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8' THEN '✅ Client ID matches'
        ELSE '❌ Client ID does not match'
    END as status
FROM public.workout_assignments 
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c';

-- 3. Check RLS status
SELECT 
    'RLS Status Check' as test_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'workout_assignments';

-- 4. Try the exact query your app is making
SELECT 
    'App Query Test' as test_type,
    *
FROM public.workout_assignments 
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c'
AND client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- 5. Check current user context
SELECT 
    'User Context' as test_type,
    current_user,
    session_user,
    current_setting('role') as current_role;

SELECT 'Simple query test complete!' as message;

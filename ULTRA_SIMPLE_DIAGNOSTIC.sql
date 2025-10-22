-- =====================================================
-- ULTRA SIMPLE DIAGNOSTIC - ONE QUERY AT A TIME
-- =====================================================

-- Query 1: Check auth context
SELECT 
    'AUTH CHECK' as test,
    auth.uid() as auth_uid,
    auth.role() as auth_role;

-- Query 2: Check the failing record
SELECT 
    'RECORD CHECK' as test,
    id as assignment_id,
    client_id as record_client_id
FROM public.workout_assignments 
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c';

-- Query 3: Check if profile exists
SELECT 
    'PROFILE CHECK' as test,
    id as profile_id,
    email,
    role
FROM public.profiles 
WHERE id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- Query 4: Check RLS policy
SELECT 
    'POLICY CHECK' as test,
    policyname,
    cmd as command
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments';

-- Query 5: Test the failing query
SELECT 
    'QUERY TEST' as test,
    wa.id,
    wa.client_id,
    auth.uid() as current_auth
FROM public.workout_assignments wa
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c';

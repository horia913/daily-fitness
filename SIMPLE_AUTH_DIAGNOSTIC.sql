-- =====================================================
-- SIMPLE AUTH DIAGNOSTIC - QUICK CHECK
-- =====================================================
-- This is a simplified version to quickly identify the 406 error cause

-- 1. CHECK CURRENT AUTH CONTEXT
SELECT 
    'AUTH CONTEXT' as check_type,
    auth.uid() as auth_uid,
    auth.role() as auth_role,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ AUTH.UID() IS NULL'
        WHEN auth.role() = 'authenticated' THEN '✅ AUTHENTICATED USER'
        ELSE '❌ NOT AUTHENTICATED: ' || auth.role()
    END as auth_status;

-- 2. GET THE FAILING RECORD'S CLIENT_ID
SELECT 
    'FAILING RECORD' as check_type,
    id as assignment_id,
    client_id as record_client_id,
    template_id,
    status,
    'This is the client_id from the failing workout_assignment' as note
FROM public.workout_assignments 
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c';

-- 3. COMPARE AUTH.UID() WITH CLIENT_ID
SELECT 
    'COMPARISON' as check_type,
    auth.uid() as current_auth_uid,
    (SELECT client_id FROM public.workout_assignments WHERE id = '7529d313-d23d-40ca-9927-01739e25824c') as record_client_id,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ AUTH.UID() IS NULL - This is the problem!'
        WHEN (SELECT client_id FROM public.workout_assignments WHERE id = '7529d313-d23d-40ca-9927-01739e25824c') IS NULL THEN '❌ CLIENT_ID IS NULL - This is the problem!'
        WHEN auth.uid()::text = (SELECT client_id FROM public.workout_assignments WHERE id = '7529d313-d23d-40ca-9927-01739e25824c')::text THEN '✅ PERFECT MATCH - RLS should work'
        ELSE '❌ MISMATCH - AUTH: ' || auth.uid()::text || ' vs CLIENT_ID: ' || (SELECT client_id FROM public.workout_assignments WHERE id = '7529d313-d23d-40ca-9927-01739e25824c')::text
    END as comparison_result;

-- 4. CHECK IF PROFILE EXISTS FOR CLIENT_ID
SELECT 
    'PROFILE CHECK' as check_type,
    p.id as profile_id,
    p.email,
    p.role,
    CASE 
        WHEN p.id IS NULL THEN '❌ NO PROFILE FOR CLIENT_ID - This is the problem!'
        WHEN p.role = 'client' THEN '✅ CLIENT PROFILE EXISTS'
        ELSE '⚠️ PROFILE EXISTS BUT ROLE IS: ' || p.role
    END as profile_status
FROM public.profiles p
WHERE p.id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- 5. TEST THE EXACT QUERY THAT FAILS
SELECT 
    'QUERY TEST' as check_type,
    wa.id,
    wa.client_id,
    auth.uid() as current_auth_uid,
    CASE 
        WHEN auth.uid() = wa.client_id THEN '✅ QUERY SHOULD WORK'
        ELSE '❌ QUERY WILL FAIL - RLS will block'
    END as query_prediction
FROM public.workout_assignments wa
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c' 
AND wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- 6. CHECK RLS POLICY
SELECT 
    'RLS POLICY' as check_type,
    policyname,
    cmd as command,
    qual as condition,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ SELECT POLICY EXISTS'
        ELSE '❌ NO SELECT POLICY'
    END as policy_status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments'
AND cmd = 'SELECT';

SELECT 'Simple diagnostic complete! Look for ❌ symbols to identify the problem.' as message;

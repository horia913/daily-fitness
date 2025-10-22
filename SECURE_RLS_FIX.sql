-- =====================================================
-- SECURE RLS CONFIGURATION FOR WORKOUT_ASSIGNMENTS
-- =====================================================
-- This implements the systematic plan to fix 406 errors securely

-- STEP 1: VERIFY auth.uid() AND client_id CONSISTENCY
-- =====================================================
SELECT 
    'STEP 1: AUTH.UID() AND CLIENT_ID VERIFICATION' as step,
    'Checking consistency between profiles.id and workout_assignments.client_id' as description;

-- Check profiles table structure
SELECT 
    'PROFILES TABLE CHECK' as check_type,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN id IS NOT NULL THEN 1 END) as profiles_with_id,
    COUNT(CASE WHEN id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8' THEN 1 END) as target_profile_exists
FROM public.profiles;

-- Check workout_assignments table structure
SELECT 
    'WORKOUT_ASSIGNMENTS TABLE CHECK' as check_type,
    COUNT(*) as total_assignments,
    COUNT(CASE WHEN client_id IS NOT NULL THEN 1 END) as assignments_with_client_id,
    COUNT(CASE WHEN client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8' THEN 1 END) as target_client_assignments
FROM public.workout_assignments;

-- Verify the specific record we're trying to access
SELECT 
    'SPECIFIC RECORD VERIFICATION' as check_type,
    wa.id,
    wa.client_id,
    p.id as profile_id,
    CASE 
        WHEN wa.client_id = p.id THEN '✅ CONSISTENT - client_id matches profile.id'
        ELSE '❌ INCONSISTENT - client_id does not match profile.id'
    END as consistency_check
FROM public.workout_assignments wa
LEFT JOIN public.profiles p ON p.id = wa.client_id
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c';

-- Check current auth.uid() context (this will show the current user)
SELECT 
    'CURRENT AUTH CONTEXT' as check_type,
    auth.uid() as current_auth_uid,
    'af9325e2-76e7-4df6-8ed7-9effd9c764d8' as expected_client_id,
    CASE 
        WHEN auth.uid()::text = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8' THEN '✅ AUTH.UID() MATCHES EXPECTED CLIENT_ID'
        ELSE '❌ AUTH.UID() DOES NOT MATCH EXPECTED CLIENT_ID'
    END as auth_verification;

-- STEP 2: ENSURE SELECT PERMISSION FOR AUTHENTICATED ROLE
-- =====================================================
SELECT 
    'STEP 2: GRANTING SELECT PERMISSION' as step,
    'Granting SELECT permission to authenticated role' as description;

-- Grant SELECT permission
GRANT SELECT ON public.workout_assignments TO authenticated;

-- Verify the permission was granted
SELECT 
    'PERMISSION VERIFICATION' as check_type,
    privilege_type,
    is_grantable,
    CASE 
        WHEN privilege_type = 'SELECT' THEN '✅ SELECT PERMISSION GRANTED'
        ELSE privilege_type || ' permission'
    END as permission_status
FROM information_schema.table_privileges 
WHERE grantee = 'authenticated'
AND table_schema = 'public'
AND table_name = 'workout_assignments'
AND privilege_type = 'SELECT';

-- STEP 3: CORRECT AND ENABLE RLS POLICY
-- =====================================================
SELECT 
    'STEP 3: CONFIGURING RLS POLICY' as step,
    'Enabling RLS and creating secure policy' as description;

-- Enable RLS on the table
ALTER TABLE public.workout_assignments ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS policy_client_can_view_own_assignments ON public.workout_assignments;
DROP POLICY IF EXISTS "Allow all authenticated access to workout assignments" ON public.workout_assignments;
DROP POLICY IF EXISTS "Authenticated users can view workout assignments" ON public.workout_assignments;

-- Create the secure RLS policy
CREATE POLICY policy_client_can_view_own_assignments
  ON public.workout_assignments FOR SELECT
  USING (auth.uid() = client_id);

-- Verify RLS is enabled and policy is created
SELECT 
    'RLS POLICY VERIFICATION' as check_type,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'workout_assignments';

SELECT 
    'POLICY VERIFICATION' as check_type,
    policyname,
    cmd as command,
    qual as condition,
    CASE 
        WHEN policyname = 'policy_client_can_view_own_assignments' THEN '✅ SECURE POLICY CREATED'
        ELSE '❌ POLICY NOT FOUND'
    END as policy_status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments';

-- STEP 4: TEST THE FIX
-- =====================================================
SELECT 
    'STEP 4: TESTING THE FIX' as step,
    'Testing the exact query that was failing' as description;

-- Test the exact query that was causing 406 error
SELECT 
    'EXACT QUERY TEST' as test_type,
    wa.id,
    wa.client_id,
    wa.template_id,
    wa.status,
    wa.notes,
    wa.created_at,
    CASE 
        WHEN wa.client_id = auth.uid() THEN '✅ QUERY SUCCESS - Policy allows access'
        ELSE '❌ QUERY BLOCKED - Policy denies access'
    END as query_result
FROM public.workout_assignments wa
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c' 
AND wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- Test if the policy condition works
SELECT 
    'POLICY CONDITION TEST' as test_type,
    auth.uid() as current_auth_uid,
    'af9325e2-76e7-4df6-8ed7-9effd9c764d8' as expected_client_id,
    CASE 
        WHEN auth.uid()::text = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8' THEN '✅ POLICY CONDITION WILL PASS'
        ELSE '❌ POLICY CONDITION WILL FAIL - auth.uid() does not match client_id'
    END as policy_condition_result;

-- FINAL VERIFICATION
-- =====================================================
SELECT 
    'FINAL VERIFICATION' as section,
    'Secure RLS configuration complete!' as message,
    'Check the results above to verify each step was successful.' as next_steps;

-- Summary of what was done
SELECT 
    'CONFIGURATION SUMMARY' as section,
    '1. Verified auth.uid() and client_id consistency' as step_1,
    '2. Granted SELECT permission to authenticated role' as step_2,
    '3. Enabled RLS and created secure policy' as step_3,
    '4. Tested the fix with exact failing query' as step_4,
    'Your app should now work without 406 errors!' as result;

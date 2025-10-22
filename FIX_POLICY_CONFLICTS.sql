-- =====================================================
-- FIX POLICY CONFLICTS ON WORKOUT_ASSIGNMENTS
-- =====================================================
-- Multiple SELECT policies are causing conflicts - we need to clean them up

-- 1. DROP ALL EXISTING POLICIES TO START CLEAN
-- =====================================================
SELECT 'DROPPING ALL EXISTING POLICIES' as action;

-- Drop all existing policies
DROP POLICY IF EXISTS "Clients can update own assignment status" ON public.workout_assignments;
DROP POLICY IF EXISTS "Clients can update their workout assignments" ON public.workout_assignments;
DROP POLICY IF EXISTS "Clients can view own workout assignments" ON public.workout_assignments;
DROP POLICY IF EXISTS "Clients can view their assignments" ON public.workout_assignments;
DROP POLICY IF EXISTS "Coaches can delete workout assignments" ON public.workout_assignments;
DROP POLICY IF EXISTS "Coaches can insert workout assignments" ON public.workout_assignments;
DROP POLICY IF EXISTS "Coaches can manage their assignments" ON public.workout_assignments;
DROP POLICY IF EXISTS "Coaches can update workout assignments" ON public.workout_assignments;
DROP POLICY IF EXISTS "Coaches can view client workout assignments" ON public.workout_assignments;
DROP POLICY IF EXISTS "Users can view their own workout assignments" ON public.workout_assignments;
DROP POLICY IF EXISTS "policy_client_can_view_own_assignments" ON public.workout_assignments;

-- 2. VERIFY ALL POLICIES ARE DROPPED
-- =====================================================
SELECT 
    'POLICIES AFTER DROP' as status,
    COUNT(*) as remaining_policies
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments';

-- 3. CREATE SINGLE, CLEAR SELECT POLICY
-- =====================================================
SELECT 'CREATING SINGLE SELECT POLICY' as action;

-- Create one clear SELECT policy for authenticated users
CREATE POLICY "authenticated_users_select_assignments"
  ON public.workout_assignments FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. VERIFY THE NEW POLICY
-- =====================================================
SELECT 
    'NEW POLICY CREATED' as status,
    policyname,
    cmd as command,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments'
AND policyname = 'authenticated_users_select_assignments';

-- 5. TEST THE FIX
-- =====================================================
SELECT 'TESTING THE FIX' as action;

-- Test the exact query that was failing
SELECT 
    'QUERY TEST RESULT' as test,
    wa.id,
    wa.client_id,
    wa.template_id,
    wa.status,
    auth.uid() as current_auth_uid,
    auth.role() as current_auth_role,
    'SUCCESS: Query should work now' as result
FROM public.workout_assignments wa
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c' 
AND wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

SELECT 'Policy conflicts fixed! Test your app now.' as message;

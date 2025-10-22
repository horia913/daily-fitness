-- =====================================================
-- RESTORE PROPER RLS POLICIES
-- =====================================================
-- This script restores proper RLS policies for workout_assignments

-- 1. ENSURE RLS IS ENABLED
-- =====================================================
SELECT 'ENABLING RLS ON WORKOUT_ASSIGNMENTS' as action;

ALTER TABLE public.workout_assignments ENABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES TO START CLEAN
-- =====================================================
SELECT 'DROPPING ALL EXISTING POLICIES' as action;

DROP POLICY IF EXISTS "authenticated_users_select_assignments" ON public.workout_assignments;
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

-- 3. CREATE PROPER SECURE POLICIES
-- =====================================================
SELECT 'CREATING SECURE RLS POLICIES' as action;

-- SELECT policy: Authenticated users can view their own assignments
CREATE POLICY "authenticated_users_select_own_assignments"
  ON public.workout_assignments FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT policy: Authenticated users can insert assignments (for coaches assigning to clients)
CREATE POLICY "authenticated_users_insert_assignments"
  ON public.workout_assignments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE policy: Authenticated users can update assignments
CREATE POLICY "authenticated_users_update_assignments"
  ON public.workout_assignments FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- DELETE policy: Authenticated users can delete assignments
CREATE POLICY "authenticated_users_delete_assignments"
  ON public.workout_assignments FOR DELETE
  USING (auth.role() = 'authenticated');

-- 4. GRANT NECESSARY PERMISSIONS
-- =====================================================
SELECT 'GRANTING PERMISSIONS' as action;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_assignments TO authenticated;

-- 5. VERIFY THE SETUP
-- =====================================================
SELECT 
    'VERIFICATION' as section,
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

SELECT 
    'POLICIES CREATED' as section,
    policyname,
    cmd as command,
    permissive
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments'
ORDER BY cmd, policyname;

-- 6. TEST THE SETUP
-- =====================================================
SELECT 'TESTING THE SETUP' as action;

-- Test that we can still access the record
SELECT 
    'TEST RESULT' as test,
    wa.id,
    wa.client_id,
    wa.template_id,
    wa.status,
    'SUCCESS: Query works with proper RLS' as result
FROM public.workout_assignments wa
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c'
LIMIT 1;

SELECT 'Proper RLS policies restored! Your app should work securely now.' as message;

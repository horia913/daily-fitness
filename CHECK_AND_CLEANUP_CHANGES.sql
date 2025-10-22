-- =====================================================
-- CHECK AND CLEANUP CHANGES FROM DIAGNOSTIC SCRIPTS
-- =====================================================
-- This script checks what changes were made and cleans up if needed

-- 1. CHECK CURRENT RLS STATUS ON WORKOUT_ASSIGNMENTS
-- =====================================================
SELECT 
    'RLS STATUS CHECK' as section,
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

-- 2. CHECK CURRENT POLICIES ON WORKOUT_ASSIGNMENTS
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

-- 3. CHECK IF WE NEED TO RESTORE PROPER POLICIES
-- =====================================================
SELECT 
    'POLICY ASSESSMENT' as section,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
    CASE 
        WHEN COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) = 0 THEN '❌ NO SELECT POLICIES - Need to add proper policies'
        WHEN COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) = 1 THEN '✅ SINGLE SELECT POLICY - Good'
        WHEN COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) > 1 THEN '⚠️ MULTIPLE SELECT POLICIES - May cause conflicts'
    END as policy_status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments';

-- 4. RESTORE PROPER RLS POLICIES IF NEEDED
-- =====================================================
-- Only run this section if the assessment above shows issues

-- Check if we need to restore proper policies
SELECT 
    'POLICY RESTORATION NEEDED' as assessment,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments' AND cmd = 'SELECT') = 0 THEN 'YES - Need to add SELECT policy'
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments' AND cmd = 'SELECT') > 1 THEN 'YES - Need to clean up multiple policies'
        ELSE 'NO - Policies look good'
    END as restoration_needed;

-- 5. SUGGESTED CLEANUP ACTIONS
-- =====================================================
SELECT 
    'CLEANUP RECOMMENDATIONS' as section,
    CASE 
        WHEN (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_assignments') = false THEN '1. Re-enable RLS on workout_assignments'
        ELSE '1. RLS is properly enabled'
    END as action_1,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments' AND cmd = 'SELECT') = 0 THEN '2. Add proper SELECT policy for authenticated users'
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments' AND cmd = 'SELECT') > 1 THEN '2. Clean up multiple SELECT policies'
        ELSE '2. SELECT policies are properly configured'
    END as action_2,
    '3. Test app functionality to ensure everything works' as action_3;

SELECT 'Assessment complete. Review recommendations above.' as message;

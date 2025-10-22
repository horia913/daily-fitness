-- =====================================================
-- SINGLE STATUS QUERY - ALL INFO IN ONE RESULT
-- =====================================================

SELECT 
    'DATABASE STATUS' as section,
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_assignments') as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments') as total_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments' AND cmd = 'SELECT') as select_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments' AND cmd = 'INSERT') as insert_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments' AND cmd = 'UPDATE') as update_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments' AND cmd = 'DELETE') as delete_policies,
    (SELECT COUNT(*) FROM information_schema.table_privileges WHERE table_schema = 'public' AND table_name = 'workout_assignments' AND grantee = 'authenticated') as permissions_count,
    CASE 
        WHEN (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_assignments') = false THEN 'ISSUE: RLS DISABLED'
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments' AND cmd = 'SELECT') = 0 THEN 'ISSUE: NO SELECT POLICY'
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments' AND cmd = 'SELECT') > 1 THEN 'ISSUE: MULTIPLE SELECT POLICIES'
        ELSE 'STATUS: LOOKS GOOD'
    END as overall_status;

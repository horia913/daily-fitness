-- =====================================================
-- SIMPLE STATUS CHECK - ONE QUERY AT A TIME
-- =====================================================

-- Query 1: Check RLS status
SELECT 
    'RLS STATUS' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'workout_assignments';

-- Query 2: Count policies
SELECT 
    'POLICY COUNT' as check_type,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments';

-- Query 3: List all policies
SELECT 
    'POLICY LIST' as check_type,
    policyname,
    cmd as command
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments'
ORDER BY cmd, policyname;

-- Query 4: Check permissions
SELECT 
    'PERMISSIONS' as check_type,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_schema = 'public'
AND table_name = 'workout_assignments'
AND grantee = 'authenticated'
ORDER BY privilege_type;

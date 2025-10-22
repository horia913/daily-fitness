-- =====================================================
-- Diagnostic Script for 406 Errors
-- =====================================================
-- Run this to check what's causing the 406 Not Acceptable errors

-- 1. Check if all required tables exist
SELECT 
    'Table Check' as check_type,
    table_name,
    CASE 
        WHEN table_name IN ('workout_assignments', 'workout_templates', 'workout_categories', 'program_assignment_progress', 'program_workout_completions', 'profiles', 'workout_programs')
        THEN '✅ Required table exists'
        ELSE '❌ Missing required table'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('workout_assignments', 'workout_templates', 'workout_categories', 'program_assignment_progress', 'program_workout_completions', 'profiles', 'workout_programs')
ORDER BY table_name;

-- 2. Check RLS status on all tables
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('workout_assignments', 'workout_templates', 'workout_categories', 'program_assignment_progress', 'program_workout_completions', 'profiles', 'workout_programs')
ORDER BY tablename;

-- 3. Check all policies on these tables
SELECT 
    'Policy Check' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.role() = ''authenticated''%' THEN '✅ Authenticated user policy'
        ELSE '⚠️ Other policy type'
    END as policy_type
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('workout_assignments', 'workout_templates', 'workout_categories', 'program_assignment_progress', 'program_workout_completions', 'profiles', 'workout_programs')
ORDER BY tablename, policyname;

-- 4. Test direct table access (this should work if policies are correct)
SELECT 
    'Direct Access Test' as check_type,
    COUNT(*) as workout_assignments_count
FROM public.workout_assignments;

-- 5. Test the specific query that's failing
SELECT 
    'Specific Query Test' as check_type,
    wa.id,
    wt.name as template_name,
    wc.name as category_name
FROM public.workout_assignments wa
LEFT JOIN public.workout_templates wt ON wt.id = wa.template_id
LEFT JOIN public.workout_categories wc ON wc.id = wt.category_id
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c'
AND wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
LIMIT 1;

-- 6. Check if there are any missing policies
SELECT 
    'Missing Policies Check' as check_type,
    'workout_assignments' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'workout_assignments'
            AND cmd = 'SELECT'
        ) THEN '✅ Has SELECT policy'
        ELSE '❌ Missing SELECT policy'
    END as status
UNION ALL
SELECT 
    'Missing Policies Check' as check_type,
    'workout_templates' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'workout_templates'
            AND cmd = 'SELECT'
        ) THEN '✅ Has SELECT policy'
        ELSE '❌ Missing SELECT policy'
    END as status
UNION ALL
SELECT 
    'Missing Policies Check' as check_type,
    'workout_categories' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'workout_categories'
            AND cmd = 'SELECT'
        ) THEN '✅ Has SELECT policy'
        ELSE '❌ Missing SELECT policy'
    END as status;

-- Success message
SELECT 'Diagnostic complete! Check the results above to identify the issue.' as message;

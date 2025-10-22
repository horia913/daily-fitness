-- =====================================================
-- Diagnostic Check for Database Issues
-- =====================================================
-- Run this in your Supabase SQL Editor to check what's happening

-- 1. Check if tables exist
SELECT 
    'Tables Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'program_assignment_progress') 
        THEN '✅ program_assignment_progress exists'
        ELSE '❌ program_assignment_progress missing'
    END as status;

SELECT 
    'Tables Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'program_workout_completions') 
        THEN '✅ program_workout_completions exists'
        ELSE '❌ program_workout_completions missing'
    END as status;

-- 2. Check if functions exist
SELECT 
    'Functions Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_next_due_workout') 
        THEN '✅ get_next_due_workout exists'
        ELSE '❌ get_next_due_workout missing'
    END as status;

SELECT 
    'Functions Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_completed_programs') 
        THEN '✅ get_completed_programs exists'
        ELSE '❌ get_completed_programs missing'
    END as status;

-- 3. Check if user has any program assignments
SELECT 
    'Data Check' as check_type,
    COUNT(*) as program_assignments_count
FROM public.program_assignments;

-- 4. Check if user has any program assignment progress
SELECT 
    'Data Check' as check_type,
    COUNT(*) as progress_records_count
FROM public.program_assignment_progress;

-- 5. Test the function with a sample UUID (replace with your actual client ID)
-- SELECT get_next_due_workout('af9325e2-76e7-4df6-8ed7-9effd9c764d8'::UUID);

-- 6. Check RLS policies
SELECT 
    'RLS Check' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('program_assignment_progress', 'program_workout_completions');

-- =====================================================
-- Fix RLS Policies for Better Access
-- =====================================================
-- This fixes the 406 Not Acceptable errors

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Clients can view their own progress" ON public.program_assignment_progress;
DROP POLICY IF EXISTS "Authenticated users can insert progress records" ON public.program_assignment_progress;
DROP POLICY IF EXISTS "Authenticated users can update progress records" ON public.program_assignment_progress;

-- 2. Create more permissive policies for authenticated users
CREATE POLICY "Authenticated users can manage progress records" ON public.program_assignment_progress
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Drop and recreate policies for workout completions
DROP POLICY IF EXISTS "Clients can view their own completions" ON public.program_workout_completions;
DROP POLICY IF EXISTS "Authenticated users can insert completion records" ON public.program_workout_completions;

CREATE POLICY "Authenticated users can manage completion records" ON public.program_workout_completions
    FOR ALL USING (auth.role() = 'authenticated');

-- 4. Test access to the tables
SELECT 
    'Testing table access' as test_type,
    COUNT(*) as record_count
FROM public.program_assignment_progress;

-- 5. Test with your specific client ID
SELECT 
    'Testing client access' as test_type,
    COUNT(*) as record_count
FROM public.program_assignment_progress
WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- Success message
SELECT 'RLS policies fixed for better access! 🔓' as message;

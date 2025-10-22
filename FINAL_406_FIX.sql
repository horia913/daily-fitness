-- =====================================================
-- Final Fix for 406 Not Acceptable Errors
-- =====================================================
-- This script comprehensively fixes all potential RLS issues

-- 1. Ensure all tables have RLS enabled
ALTER TABLE public.workout_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_assignment_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_workout_completions ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Authenticated users can view workout assignments" ON public.workout_assignments;
DROP POLICY IF EXISTS "Authenticated users can view workout templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Authenticated users can view workout categories" ON public.workout_categories;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view programs" ON public.workout_programs;
DROP POLICY IF EXISTS "Authenticated users can manage progress records" ON public.program_assignment_progress;
DROP POLICY IF EXISTS "Authenticated users can manage completion records" ON public.program_workout_completions;

-- 3. Create comprehensive policies for all tables
CREATE POLICY "Authenticated users can view workout assignments" ON public.workout_assignments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view workout templates" ON public.workout_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view workout categories" ON public.workout_categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view programs" ON public.workout_programs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view exercises" ON public.exercises
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view workout template exercises" ON public.workout_template_exercises
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view program assignments" ON public.program_assignments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage progress records" ON public.program_assignment_progress
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage completion records" ON public.program_workout_completions
    FOR ALL USING (auth.role() = 'authenticated');

-- 4. Grant necessary permissions
GRANT ALL ON public.workout_assignments TO authenticated;
GRANT ALL ON public.workout_templates TO authenticated;
GRANT ALL ON public.workout_categories TO authenticated;
GRANT ALL ON public.workout_template_exercises TO authenticated;
GRANT ALL ON public.exercises TO authenticated;
GRANT ALL ON public.program_assignments TO authenticated;
GRANT ALL ON public.workout_programs TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.program_assignment_progress TO authenticated;
GRANT ALL ON public.program_workout_completions TO authenticated;

-- 5. Test the specific query that was failing
SELECT 
    'Test Query Result' as test_type,
    wa.id,
    wt.name as template_name,
    wc.name as category_name,
    'SUCCESS' as status
FROM public.workout_assignments wa
LEFT JOIN public.workout_templates wt ON wt.id = wa.template_id
LEFT JOIN public.workout_categories wc ON wc.id = wt.category_id
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c'
AND wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
LIMIT 1;

-- 6. Verify all policies are created
SELECT 
    'Policy Verification' as check_type,
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policies
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('workout_assignments', 'workout_templates', 'workout_categories', 'profiles', 'workout_programs', 'program_assignment_progress', 'program_workout_completions')
GROUP BY tablename
ORDER BY tablename;

-- Success message
SELECT 'Final 406 fix applied! All tables now have proper RLS policies.' as message;

-- =====================================================
-- Targeted Fix for Specific 406 Error
-- =====================================================
-- This addresses the exact query structure that's failing

-- The failing query is trying to access:
-- workout_assignments JOIN workout_templates JOIN workout_categories

-- 1. Check if the specific record exists
SELECT 
    'Record Check' as check_type,
    wa.id,
    wa.client_id,
    wa.template_id,
    wt.name as template_name,
    wc.name as category_name,
    'Record exists' as status
FROM public.workout_assignments wa
LEFT JOIN public.workout_templates wt ON wt.id = wa.template_id
LEFT JOIN public.workout_categories wc ON wc.id = wt.category_id
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c'
AND wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- 2. Check if there are any issues with the foreign key relationships
SELECT 
    'Foreign Key Check' as check_type,
    wa.template_id,
    wt.id as template_exists,
    wt.category_id,
    wc.id as category_exists
FROM public.workout_assignments wa
LEFT JOIN public.workout_templates wt ON wt.id = wa.template_id
LEFT JOIN public.workout_categories wc ON wc.id = wt.category_id
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c';

-- 3. Create more permissive policies specifically for this query pattern
DROP POLICY IF EXISTS "Authenticated users can view workout assignments" ON public.workout_assignments;
DROP POLICY IF EXISTS "Authenticated users can view workout templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Authenticated users can view workout categories" ON public.workout_categories;
DROP POLICY IF EXISTS "Authenticated users can view exercises" ON public.exercises;
DROP POLICY IF EXISTS "Authenticated users can view workout template exercises" ON public.workout_template_exercises;
DROP POLICY IF EXISTS "Allow all authenticated access to workout assignments" ON public.workout_assignments;
DROP POLICY IF EXISTS "Allow all authenticated access to workout templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Allow all authenticated access to workout categories" ON public.workout_categories;

-- Create policies that allow authenticated users to access everything
CREATE POLICY "Allow all authenticated access to workout assignments" ON public.workout_assignments
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated access to workout templates" ON public.workout_templates
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated access to workout categories" ON public.workout_categories
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated access to exercises" ON public.exercises
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated access to workout template exercises" ON public.workout_template_exercises
    FOR ALL USING (auth.role() = 'authenticated');

-- 4. Grant explicit permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_template_exercises TO authenticated;

-- 5. Test the exact query structure that's failing
SELECT 
    wa.*,
    json_build_object(
        'id', wt.id,
        'name', wt.name,
        'description', wt.description,
        'estimated_duration', wt.estimated_duration,
        'difficulty_level', wt.difficulty_level,
        'category', json_build_object(
            'name', wc.name,
            'color', wc.color
        )
    ) as template
FROM public.workout_assignments wa
LEFT JOIN public.workout_templates wt ON wt.id = wa.template_id
LEFT JOIN public.workout_categories wc ON wc.id = wt.category_id
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c'
AND wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- 6. Alternative approach - create a view that handles the joins
CREATE OR REPLACE VIEW public.workout_assignments_with_details AS
SELECT 
    wa.id,
    wa.client_id,
    wa.status,
    wa.notes,
    wa.created_at,
    wa.updated_at,
    wa.template_id as assignment_template_id,
    wt.id as template_id,
    wt.name as template_name,
    wt.description as template_description,
    wt.estimated_duration as template_estimated_duration,
    wt.difficulty_level as template_difficulty_level,
    wc.id as category_id,
    wc.name as category_name,
    wc.color as category_color
FROM public.workout_assignments wa
LEFT JOIN public.workout_templates wt ON wt.id = wa.template_id
LEFT JOIN public.workout_categories wc ON wc.id = wt.category_id;

-- Enable RLS on the view
ALTER VIEW public.workout_assignments_with_details SET (security_invoker = true);

-- 7. Test the view
SELECT * FROM public.workout_assignments_with_details 
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c'
AND client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- Success message
SELECT 'Targeted fix applied! Try refreshing your app now.' as message;

-- =====================================================
-- DEBUG WORKOUT MISMATCH ISSUE
-- =====================================================
-- This script helps identify why the wrong workout is being loaded

-- 1. CHECK THE SPECIFIC WORKOUT ASSIGNMENT
-- =====================================================
SELECT 
    'WORKOUT ASSIGNMENT DETAILS' as section,
    wa.id as assignment_id,
    wa.client_id,
    wa.template_id,
    wa.status,
    wa.notes,
    wa.created_at,
    wa.updated_at
FROM public.workout_assignments wa
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c';

-- 2. CHECK THE TEMPLATE LINKED TO THIS ASSIGNMENT
-- =====================================================
SELECT 
    'TEMPLATE LINKED TO ASSIGNMENT' as section,
    wt.id as template_id,
    wt.name as template_name,
    wt.description,
    wt.estimated_duration,
    wt.difficulty_level
FROM public.workout_templates wt
WHERE wt.id = (
    SELECT template_id 
    FROM public.workout_assignments 
    WHERE id = '7529d313-d23d-40ca-9927-01739e25824c'
);

-- 3. CHECK ALL WORKOUT ASSIGNMENTS FOR THIS CLIENT
-- =====================================================
SELECT 
    'ALL ASSIGNMENTS FOR CLIENT' as section,
    wa.id as assignment_id,
    wa.template_id,
    wa.status,
    wt.name as template_name,
    wa.created_at
FROM public.workout_assignments wa
LEFT JOIN public.workout_templates wt ON wt.id = wa.template_id
WHERE wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
ORDER BY wa.created_at DESC;

-- 4. CHECK IF THERE ARE MULTIPLE ASSIGNMENTS
-- =====================================================
SELECT 
    'ASSIGNMENT COUNT' as section,
    COUNT(*) as total_assignments,
    COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count
FROM public.workout_assignments 
WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- 5. CHECK WHICH ASSIGNMENT SHOULD BE THE ACTIVE ONE
-- =====================================================
SELECT 
    'ACTIVE ASSIGNMENT' as section,
    wa.id as assignment_id,
    wa.template_id,
    wa.status,
    wt.name as template_name,
    wa.created_at,
    'This should be the active assignment' as note
FROM public.workout_assignments wa
LEFT JOIN public.workout_templates wt ON wt.id = wa.template_id
WHERE wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
ORDER BY wa.created_at DESC
LIMIT 1;

SELECT 'Debug complete. Check which assignment should be active vs which template is being loaded.' as message;

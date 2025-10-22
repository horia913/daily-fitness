-- =====================================================
-- COMPARE WORKOUT SOURCES
-- =====================================================
-- This compares what getNextDueWorkout returns vs what workout_assignments contains

-- 1. CHECK WHAT get_next_due_workout FUNCTION RETURNS
-- =====================================================
SELECT 
    'get_next_due_workout FUNCTION RESULT' as section,
    'This simulates what the workout list shows' as note;

-- Call the function that the workout list uses
SELECT * FROM get_next_due_workout('af9325e2-76e7-4df6-8ed7-9effd9c764d8');

-- 2. CHECK WHAT workout_assignments CONTAINS
-- =====================================================
SELECT 
    'workout_assignments TABLE RESULT' as section,
    'This is what the workout start page loads' as note;

-- Check what the assignment contains
SELECT 
    wa.id as assignment_id,
    wa.template_id,
    wa.client_id,
    wa.status,
    wt.name as template_name,
    wt.description,
    'This is what gets loaded when starting workout' as note
FROM public.workout_assignments wa
LEFT JOIN public.workout_templates wt ON wt.id = wa.template_id
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c';

-- 3. CHECK PROGRAM ASSIGNMENT PROGRESS
-- =====================================================
SELECT 
    'PROGRAM ASSIGNMENT PROGRESS' as section,
    pap.client_id,
    pap.program_id,
    pap.current_week,
    pap.days_completed_this_week,
    pap.is_program_completed,
    'This affects what get_next_due_workout returns' as note
FROM public.program_assignment_progress pap
WHERE pap.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
AND pap.is_program_completed = false
ORDER BY pap.created_at DESC
LIMIT 1;

-- 4. CHECK PROGRAM SCHEDULE
-- =====================================================
SELECT 
    'PROGRAM SCHEDULE' as section,
    ps.program_id,
    ps.week_number,
    ps.day_of_week,
    ps.template_id,
    wt.name as template_name,
    'This determines which workout get_next_due_workout returns' as note
FROM public.program_schedule ps
LEFT JOIN public.workout_templates wt ON wt.id = ps.template_id
WHERE ps.program_id = (
    SELECT program_id 
    FROM public.program_assignment_progress 
    WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
    AND is_program_completed = false
    ORDER BY created_at DESC
    LIMIT 1
)
ORDER BY ps.week_number, ps.day_of_week;

SELECT 'Comparison complete. Check if get_next_due_workout and workout_assignments point to different templates.' as message;

-- =====================================================
-- Fix Program Progress Initialization
-- =====================================================
-- This creates missing program_assignment_progress records for existing assignments

-- 1. Check existing program assignments without progress records
SELECT 
    pa.id as assignment_id,
    pa.client_id,
    pa.program_id,
    pa.start_date,
    wp.name as program_name,
    wp.duration_weeks
FROM public.program_assignments pa
JOIN public.workout_programs wp ON wp.id = pa.program_id
WHERE pa.status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM public.program_assignment_progress pap 
    WHERE pap.assignment_id = pa.id
);

-- 2. Create missing program_assignment_progress records
INSERT INTO public.program_assignment_progress (
    assignment_id,
    client_id,
    program_id,
    current_week,
    current_day,
    days_completed_this_week,
    cycle_start_date,
    last_workout_date,
    total_weeks_completed,
    is_program_completed
)
SELECT 
    pa.id as assignment_id,
    pa.client_id,
    pa.program_id,
    1 as current_week, -- Start at week 1
    1 as current_day,  -- Start at day 1
    0 as days_completed_this_week,
    COALESCE(pa.start_date, CURRENT_DATE) as cycle_start_date,
    NULL as last_workout_date,
    0 as total_weeks_completed,
    false as is_program_completed
FROM public.program_assignments pa
WHERE pa.status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM public.program_assignment_progress pap 
    WHERE pap.assignment_id = pa.id
);

-- 3. Verify the fix worked
SELECT 
    'Progress Records Created' as status,
    COUNT(*) as count
FROM public.program_assignment_progress;

-- 4. Test the function with your client ID
SELECT get_next_due_workout('af9325e2-76e7-4df6-8ed7-9effd9c764d8'::UUID);

-- Success message
SELECT 'Program progress initialization completed! 🎯' as message;

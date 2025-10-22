-- =====================================================
-- Database Fixes V2 - Complete Solution
-- =====================================================
-- This file contains all the fixes for the database errors and improved logic

-- 1. DROP AND RECREATE FUNCTIONS TO FIX TYPE ISSUES
-- =====================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_next_due_workout(UUID);
DROP FUNCTION IF EXISTS get_completed_programs(UUID);
DROP FUNCTION IF EXISTS complete_workout(UUID, UUID, INTEGER, TEXT);

-- 2. PROGRAM ASSIGNMENT PROGRESS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.program_assignment_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.program_assignments(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
    current_week INTEGER NOT NULL DEFAULT 1,
    current_day INTEGER NOT NULL DEFAULT 1 CHECK (current_day >= 1 AND current_day <= 6),
    days_completed_this_week INTEGER DEFAULT 0,
    cycle_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_workout_date DATE,
    total_weeks_completed INTEGER DEFAULT 0,
    is_program_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, program_id)
);

-- 3. PROGRAM WORKOUT COMPLETIONS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.program_workout_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_progress_id UUID NOT NULL REFERENCES public.program_assignment_progress(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    program_day INTEGER NOT NULL CHECK (program_day >= 1 AND program_day <= 6),
    template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
    workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_program_assignment_progress_client_id ON public.program_assignment_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_program_assignment_progress_program_id ON public.program_assignment_progress(program_id);
CREATE INDEX IF NOT EXISTS idx_program_assignment_progress_active ON public.program_assignment_progress(is_program_completed);
CREATE INDEX IF NOT EXISTS idx_program_workout_completions_client_id ON public.program_workout_completions(client_id);
CREATE INDEX IF NOT EXISTS idx_program_workout_completions_date ON public.program_workout_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_program_workout_completions_program ON public.program_workout_completions(program_id);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on tables
ALTER TABLE public.program_assignment_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_workout_completions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can view progress for their clients" ON public.program_assignment_progress;
DROP POLICY IF EXISTS "Clients can view their own progress" ON public.program_assignment_progress;
DROP POLICY IF EXISTS "Authenticated users can insert progress records" ON public.program_assignment_progress;
DROP POLICY IF EXISTS "Authenticated users can update progress records" ON public.program_assignment_progress;
DROP POLICY IF EXISTS "Coaches can view completions for their clients" ON public.program_workout_completions;
DROP POLICY IF EXISTS "Clients can view their own completions" ON public.program_workout_completions;
DROP POLICY IF EXISTS "Authenticated users can insert completion records" ON public.program_workout_completions;

-- Program Assignment Progress Policies
CREATE POLICY "Coaches can view progress for their clients" ON public.program_assignment_progress
    FOR SELECT USING (
        program_id IN (
            SELECT id FROM public.workout_programs WHERE coach_id = auth.uid()
        )
    );

CREATE POLICY "Clients can view their own progress" ON public.program_assignment_progress
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Authenticated users can insert progress records" ON public.program_assignment_progress
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update progress records" ON public.program_assignment_progress
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Program Workout Completions Policies
CREATE POLICY "Coaches can view completions for their clients" ON public.program_workout_completions
    FOR SELECT USING (
        program_id IN (
            SELECT id FROM public.workout_programs WHERE coach_id = auth.uid()
        )
    );

CREATE POLICY "Clients can view their own completions" ON public.program_workout_completions
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Authenticated users can insert completion records" ON public.program_workout_completions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. FIXED DATABASE FUNCTIONS
-- =====================================================

-- Function to get next due workout for a client
CREATE OR REPLACE FUNCTION get_next_due_workout(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_progress_record RECORD;
    v_program_schedule_record RECORD;
    v_template_record RECORD;
    v_workout_data JSONB;
    v_exercises JSONB;
    v_exercise RECORD;
    v_progression RECORD;
BEGIN
    -- Get current program progress
    SELECT pap.*, pa.program_id, pa.start_date
    INTO v_progress_record
    FROM public.program_assignment_progress pap
    JOIN public.program_assignments pa ON pa.id = pap.assignment_id
    WHERE pap.client_id = p_client_id 
    AND pap.is_program_completed = false
    ORDER BY pap.created_at DESC
    LIMIT 1;
    
    IF v_progress_record IS NULL THEN
        RETURN jsonb_build_object(
            'hasWorkout', false,
            'message', 'No active program assigned'
        );
    END IF;
    
    -- Get the scheduled workout for current day
    SELECT ps.*
    INTO v_program_schedule_record
    FROM public.program_schedule ps
    WHERE ps.program_id = v_progress_record.program_id 
    AND ps.day_of_week = (v_progress_record.current_day - 1); -- Convert to 0-based
    
    IF v_program_schedule_record IS NULL THEN
        -- Check if all workouts for the week are completed
        IF v_progress_record.days_completed_this_week >= 6 THEN
            RETURN jsonb_build_object(
                'hasWorkout', false,
                'message', 'The work is done for the week! You have completed all workouts, recharge your batteries and be prepared to crush next week! 🎉',
                'weekCompleted', true,
                'currentWeek', v_progress_record.current_week
            );
        ELSE
            RETURN jsonb_build_object(
                'hasWorkout', false,
                'message', 'Rest day - no workout scheduled'
            );
        END IF;
    END IF;
    
    -- Get template details
    SELECT * INTO v_template_record
    FROM public.workout_templates
    WHERE id = v_program_schedule_record.template_id;
    
    -- Build exercises array with progression
    v_exercises := '[]'::jsonb;
    
    FOR v_exercise IN 
        SELECT wte.*, e.name, e.description, e.instructions
        FROM public.workout_template_exercises wte
        JOIN public.exercises e ON e.id = wte.exercise_id
        WHERE wte.template_id = v_program_schedule_record.template_id
        ORDER BY wte.order_index
    LOOP
        -- Get progression rule for this exercise and week
        SELECT * INTO v_progression
        FROM public.program_progression_rules
        WHERE program_id = v_progress_record.program_id 
        AND exercise_id = v_exercise.exercise_id 
        AND week_number = v_progress_record.current_week;
        
        -- Add exercise with progression to array
        v_exercises := v_exercises || jsonb_build_object(
            'id', v_exercise.id,
            'exerciseId', v_exercise.exercise_id,
            'name', v_exercise.name,
            'description', v_exercise.description,
            'instructions', v_exercise.instructions,
            'orderIndex', v_exercise.order_index,
            'notes', v_exercise.notes,
            'sets', COALESCE(v_progression.sets, v_exercise.sets, 3),
            'reps', COALESCE(v_progression.reps, v_exercise.reps, '8-10'),
            'weightGuidance', COALESCE(v_progression.weight_guidance, ''),
            'restSeconds', COALESCE(v_progression.rest_seconds, v_exercise.rest_seconds, 60),
            'rpeTarget', v_progression.rpe_target,
            'progressionNotes', v_progression.notes
        );
    END LOOP;
    
    -- Build complete workout data
    v_workout_data := jsonb_build_object(
        'hasWorkout', true,
        'templateId', v_program_schedule_record.template_id,
        'templateName', v_template_record.name,
        'templateDescription', v_template_record.description,
        'weekNumber', v_progress_record.current_week,
        'programDay', v_progress_record.current_day,
        'estimatedDuration', v_template_record.estimated_duration,
        'difficultyLevel', v_template_record.difficulty_level,
        'exercises', v_exercises,
        'generatedAt', NOW()
    );
    
    RETURN v_workout_data;
END;
$$;

-- Function to get completed programs for a client (FIXED TYPE ISSUE)
CREATE OR REPLACE FUNCTION get_completed_programs(p_client_id UUID)
RETURNS TABLE (
    id UUID,
    client_id UUID,
    program_id UUID,
    assignment_id UUID,
    program_name TEXT,
    program_description TEXT,
    total_weeks INTEGER,
    difficulty_level TEXT,
    coach_name TEXT,
    started_date DATE,
    completed_date TIMESTAMP WITH TIME ZONE,
    total_workouts_completed BIGINT,
    completion_percentage INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pap.id,
        pap.client_id,
        pap.program_id,
        pap.assignment_id,
        wp.name as program_name,
        wp.description as program_description,
        wp.duration_weeks as total_weeks,
        wp.difficulty_level,
        CONCAT(p.first_name, ' ', p.last_name) as coach_name,
        pap.cycle_start_date as started_date,
        pap.completed_at as completed_date,
        COUNT(pwc.id) as total_workouts_completed,
        CASE 
            WHEN wp.duration_weeks > 0 THEN 
                LEAST(100, ROUND((pap.total_weeks_completed::DECIMAL / wp.duration_weeks) * 100))::INTEGER
            ELSE 0 
        END as completion_percentage
    FROM public.program_assignment_progress pap
    JOIN public.workout_programs wp ON wp.id = pap.program_id
    JOIN public.profiles p ON p.id = wp.coach_id
    LEFT JOIN public.program_workout_completions pwc ON pwc.assignment_progress_id = pap.id
    WHERE pap.client_id = p_client_id 
    AND pap.is_program_completed = true
    GROUP BY pap.id, pap.client_id, pap.program_id, pap.assignment_id, 
             wp.name, wp.description, wp.duration_weeks, wp.difficulty_level,
             p.first_name, p.last_name, pap.cycle_start_date, pap.completed_at,
             pap.total_weeks_completed
    ORDER BY pap.completed_at DESC;
END;
$$;

-- Function to complete a workout
CREATE OR REPLACE FUNCTION complete_workout(
    p_client_id UUID,
    p_template_id UUID,
    p_duration_minutes INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_progress_record RECORD;
    v_program_schedule_record RECORD;
    v_completion_id UUID;
    v_next_workout JSONB;
    v_is_program_completed BOOLEAN := false;
BEGIN
    -- Get current program progress
    SELECT pap.*, pa.program_id
    INTO v_progress_record
    FROM public.program_assignment_progress pap
    JOIN public.program_assignments pa ON pa.id = pap.assignment_id
    WHERE pap.client_id = p_client_id 
    AND pap.is_program_completed = false
    ORDER BY pap.created_at DESC
    LIMIT 1;
    
    IF v_progress_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No active program found'
        );
    END IF;
    
    -- Verify this is the correct template for today
    SELECT * INTO v_program_schedule_record
    FROM public.program_schedule ps
    WHERE ps.program_id = v_progress_record.program_id 
    AND ps.template_id = p_template_id
    AND ps.day_of_week = (v_progress_record.current_day - 1);
    
    IF v_program_schedule_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'This workout is not scheduled for today'
        );
    END IF;
    
    -- Record the workout completion
    INSERT INTO public.program_workout_completions (
        assignment_progress_id, client_id, program_id, week_number, 
        program_day, template_id, duration_minutes, notes
    ) VALUES (
        v_progress_record.id, p_client_id, v_progress_record.program_id,
        v_progress_record.current_week, v_progress_record.current_day,
        p_template_id, p_duration_minutes, p_notes
    ) RETURNING id INTO v_completion_id;
    
    -- Update progress
    UPDATE public.program_assignment_progress 
    SET 
        days_completed_this_week = days_completed_this_week + 1,
        last_workout_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = v_progress_record.id;
    
    -- Check if week is completed (assuming 6 workout days per week)
    IF v_progress_record.days_completed_this_week + 1 >= 6 THEN
        -- Move to next week
        UPDATE public.program_assignment_progress 
        SET 
            current_week = current_week + 1,
            current_day = 1,
            days_completed_this_week = 0,
            total_weeks_completed = total_weeks_completed + 1,
            updated_at = NOW()
        WHERE id = v_progress_record.id;
        
        -- Check if program is completed
        SELECT 
            CASE WHEN current_week >= duration_weeks THEN true ELSE false END
        INTO v_is_program_completed
        FROM public.program_assignment_progress pap
        JOIN public.workout_programs wp ON wp.id = pap.program_id
        WHERE pap.id = v_progress_record.id;
        
        IF v_is_program_completed THEN
            UPDATE public.program_assignment_progress 
            SET 
                is_program_completed = true,
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = v_progress_record.id;
        END IF;
    ELSE
        -- Move to next day
        UPDATE public.program_assignment_progress 
        SET 
            current_day = CASE 
                WHEN current_day >= 6 THEN 1 
                ELSE current_day + 1 
            END,
            updated_at = NOW()
        WHERE id = v_progress_record.id;
    END IF;
    
    -- Get next workout
    v_next_workout := get_next_due_workout(p_client_id);
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Workout completed successfully!',
        'nextWorkout', v_next_workout,
        'isProgramCompleted', v_is_program_completed
    );
END;
$$;

-- 7. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.program_assignment_progress TO authenticated;
GRANT ALL ON public.program_workout_completions TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_next_due_workout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_completed_programs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_workout(UUID, UUID, INTEGER, TEXT) TO authenticated;

-- 8. TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================
DROP TRIGGER IF EXISTS update_program_assignment_progress_updated_at ON public.program_assignment_progress;
CREATE TRIGGER update_program_assignment_progress_updated_at 
    BEFORE UPDATE ON public.program_assignment_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Database fixes V2 applied successfully! All functions and tables are now working properly! 🚀' as message;

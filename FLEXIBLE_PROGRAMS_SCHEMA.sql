-- =====================================================
-- Flexible Programs System - Database Schema Updates
-- =====================================================
-- This implements the new flexible program system where:
-- 1. Programs use Day 1-6 instead of Monday-Sunday
-- 2. Smart progression tracks next due workout
-- 3. 7-day cycles reset automatically
-- 4. Completed programs move to "completed programs" section

-- 1. UPDATE PROGRAM SCHEDULE TABLE
-- =====================================================
-- Change day_of_week to support Day 1-6 instead of 0-6 (Monday-Sunday)
-- Add week_number column for multi-week programs

-- First, let's add new columns for the flexible system
ALTER TABLE public.program_schedule 
ADD COLUMN IF NOT EXISTS program_day INTEGER CHECK (program_day >= 1 AND program_day <= 6),
ADD COLUMN IF NOT EXISTS week_number INTEGER DEFAULT 1 CHECK (week_number >= 1),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for the new flexible system
CREATE INDEX IF NOT EXISTS idx_program_schedule_program_day ON public.program_schedule(program_day);
CREATE INDEX IF NOT EXISTS idx_program_schedule_week_number ON public.program_schedule(week_number);

-- 2. CREATE PROGRAM ASSIGNMENT PROGRESSION TABLE
-- =====================================================
-- Tracks individual client progress through their assigned programs
CREATE TABLE IF NOT EXISTS public.program_assignment_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.program_assignments(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
    
    -- Current progression state
    current_week INTEGER NOT NULL DEFAULT 1,
    current_day INTEGER NOT NULL DEFAULT 1, -- Day 1-6 of current week
    days_completed_this_week INTEGER NOT NULL DEFAULT 0,
    
    -- Cycle tracking
    cycle_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_workout_date DATE,
    
    -- Program completion tracking
    total_weeks_completed INTEGER NOT NULL DEFAULT 0,
    is_program_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(assignment_id, client_id)
);

-- 3. CREATE COMPLETED PROGRAMS TABLE
-- =====================================================
-- Stores completed programs for the "Completed Programs" section
CREATE TABLE IF NOT EXISTS public.completed_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES public.program_assignments(id) ON DELETE CASCADE,
    
    -- Program details
    program_name TEXT NOT NULL,
    program_description TEXT,
    total_weeks INTEGER NOT NULL,
    difficulty_level TEXT NOT NULL,
    coach_name TEXT NOT NULL,
    
    -- Completion details
    started_date DATE NOT NULL,
    completed_date DATE NOT NULL,
    total_workouts_completed INTEGER NOT NULL DEFAULT 0,
    completion_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CREATE WORKOUT COMPLETION TRACKING TABLE
-- =====================================================
-- Tracks individual workout completions within programs
CREATE TABLE IF NOT EXISTS public.program_workout_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_progress_id UUID NOT NULL REFERENCES public.program_assignment_progress(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
    
    -- Workout details
    week_number INTEGER NOT NULL,
    program_day INTEGER NOT NULL,
    template_id UUID NOT NULL REFERENCES public.workout_templates(id),
    workout_date DATE NOT NULL,
    
    -- Completion details
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_minutes INTEGER,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(assignment_progress_id, week_number, program_day)
);

-- 5. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_program_assignment_progress_client ON public.program_assignment_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_program_assignment_progress_assignment ON public.program_assignment_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_program_assignment_progress_program ON public.program_assignment_progress(program_id);
CREATE INDEX IF NOT EXISTS idx_program_assignment_progress_current_state ON public.program_assignment_progress(current_week, current_day);
CREATE INDEX IF NOT EXISTS idx_program_assignment_progress_completed ON public.program_assignment_progress(is_program_completed);

CREATE INDEX IF NOT EXISTS idx_completed_programs_client ON public.completed_programs(client_id);
CREATE INDEX IF NOT EXISTS idx_completed_programs_program ON public.completed_programs(program_id);
CREATE INDEX IF NOT EXISTS idx_completed_programs_completion_date ON public.completed_programs(completed_date);

CREATE INDEX IF NOT EXISTS idx_workout_completions_client ON public.program_workout_completions(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_completions_progress ON public.program_workout_completions(assignment_progress_id);
CREATE INDEX IF NOT EXISTS idx_workout_completions_workout_date ON public.program_workout_completions(workout_date);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.program_assignment_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_workout_completions ENABLE ROW LEVEL SECURITY;

-- Program Assignment Progress Policies
CREATE POLICY "Clients can read their own program progress" ON public.program_assignment_progress
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Coaches can read their clients' program progress" ON public.program_assignment_progress
    FOR SELECT USING (
        program_id IN (
            SELECT id FROM public.workout_programs WHERE coach_id = auth.uid()
        )
    );

CREATE POLICY "System can manage program progress" ON public.program_assignment_progress
    FOR ALL USING (true); -- Restricted by application logic

-- Completed Programs Policies
CREATE POLICY "Clients can read their completed programs" ON public.completed_programs
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Coaches can read their clients' completed programs" ON public.completed_programs
    FOR SELECT USING (
        program_id IN (
            SELECT id FROM public.workout_programs WHERE coach_id = auth.uid()
        )
    );

CREATE POLICY "System can manage completed programs" ON public.completed_programs
    FOR ALL USING (true); -- Restricted by application logic

-- Workout Completions Policies
CREATE POLICY "Clients can read their workout completions" ON public.program_workout_completions
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Coaches can read their clients' workout completions" ON public.program_workout_completions
    FOR SELECT USING (
        program_id IN (
            SELECT id FROM public.workout_programs WHERE coach_id = auth.uid()
        )
    );

CREATE POLICY "System can manage workout completions" ON public.program_workout_completions
    FOR ALL USING (true); -- Restricted by application logic

-- 7. FUNCTIONS FOR FLEXIBLE PROGRAM SYSTEM
-- =====================================================

-- Function to get next due workout for a client
CREATE OR REPLACE FUNCTION get_next_due_workout(
    p_client_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_assignment_id UUID;
    v_progress_record RECORD;
    v_program_schedule RECORD;
    v_template_record RECORD;
    v_workout_data JSONB;
    v_exercises JSONB;
    v_exercise RECORD;
    v_progression RECORD;
    v_current_date DATE := CURRENT_DATE;
    v_days_since_start INTEGER;
    v_week_number INTEGER;
    v_program_day INTEGER;
BEGIN
    -- Get active program assignment
    SELECT id INTO v_assignment_id
    FROM public.program_assignments
    WHERE client_id = p_client_id 
    AND status = 'active'
    ORDER BY start_date DESC
    LIMIT 1;
    
    IF v_assignment_id IS NULL THEN
        RETURN jsonb_build_object(
            'hasWorkout', false,
            'message', 'No active program assigned'
        );
    END IF;
    
    -- Get or create progress record
    SELECT * INTO v_progress_record
    FROM public.program_assignment_progress
    WHERE assignment_id = v_assignment_id AND client_id = p_client_id;
    
    -- If no progress record exists, create one
    IF v_progress_record IS NULL THEN
        INSERT INTO public.program_assignment_progress (
            assignment_id, client_id, program_id, current_week, current_day,
            cycle_start_date, created_at, updated_at
        )
        SELECT 
            v_assignment_id, p_client_id, program_id, 1, 1,
            start_date, NOW(), NOW()
        FROM public.program_assignments
        WHERE id = v_assignment_id;
        
        -- Get the newly created record
        SELECT * INTO v_progress_record
        FROM public.program_assignment_progress
        WHERE assignment_id = v_assignment_id AND client_id = p_client_id;
    END IF;
    
    -- Check if program is completed
    IF v_progress_record.is_program_completed THEN
        RETURN jsonb_build_object(
            'hasWorkout', false,
            'message', 'Program completed - check completed programs section'
        );
    END IF;
    
    -- Calculate current program day based on cycle
    v_days_since_start := v_current_date - v_progress_record.cycle_start_date;
    v_week_number := FLOOR(v_days_since_start / 7) + 1;
    v_program_day := (v_days_since_start % 7) + 1;
    
    -- If we've completed a full week, reset to day 1
    IF v_program_day > 6 THEN
        v_program_day := 1;
        v_week_number := v_week_number + 1;
        
        -- Update cycle start date for new week
        UPDATE public.program_assignment_progress
        SET cycle_start_date = v_current_date,
            current_week = v_week_number,
            current_day = 1,
            days_completed_this_week = 0,
            updated_at = NOW()
        WHERE id = v_progress_record.id;
        
        v_program_day := 1;
    END IF;
    
    -- Get program schedule for current week and day
    SELECT ps.*, wt.name as template_name, wt.description as template_description,
           wt.estimated_duration, wt.difficulty_level
    INTO v_program_schedule
    FROM public.program_schedule ps
    JOIN public.workout_templates wt ON wt.id = ps.template_id
    WHERE ps.program_id = v_progress_record.program_id
    AND ps.program_day = v_program_day
    AND ps.week_number = v_week_number
    AND ps.is_active = true;
    
    IF v_program_schedule IS NULL THEN
        RETURN jsonb_build_object(
            'hasWorkout', false,
            'message', 'Rest day - no workout scheduled for Day ' || v_program_day
        );
    END IF;
    
    -- Build exercises array with progression
    v_exercises := '[]'::jsonb;
    
    FOR v_exercise IN 
        SELECT wte.*, e.name, e.description, e.instructions
        FROM public.workout_template_exercises wte
        JOIN public.exercises e ON e.id = wte.exercise_id
        WHERE wte.template_id = v_program_schedule.template_id
        ORDER BY wte.order_index
    LOOP
        -- Get progression rule for this exercise and week
        SELECT * INTO v_progression
        FROM public.program_progression_rules
        WHERE program_id = v_progress_record.program_id 
        AND exercise_id = v_exercise.exercise_id 
        AND week_number = v_week_number;
        
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
            'weightGuidance', v_progression.weight_guidance,
            'restSeconds', COALESCE(v_progression.rest_seconds, v_exercise.rest_seconds, 60),
            'rpeTarget', v_progression.rpe_target,
            'progressionNotes', v_progression.notes
        );
    END LOOP;
    
    -- Build complete workout data
    v_workout_data := jsonb_build_object(
        'hasWorkout', true,
        'templateId', v_program_schedule.template_id,
        'templateName', v_program_schedule.template_name,
        'templateDescription', v_program_schedule.template_description,
        'weekNumber', v_week_number,
        'programDay', v_program_day,
        'estimatedDuration', v_program_schedule.estimated_duration,
        'difficultyLevel', v_program_schedule.difficulty_level,
        'exercises', v_exercises,
        'generatedAt', NOW()
    );
    
    RETURN v_workout_data;
END;
$$;

-- Function to mark workout as completed
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
    v_assignment_id UUID;
    v_progress_record RECORD;
    v_program_schedule RECORD;
    v_completion_id UUID;
    v_total_weeks INTEGER;
    v_is_program_completed BOOLEAN := false;
    v_result JSONB;
BEGIN
    -- Get active program assignment
    SELECT id INTO v_assignment_id
    FROM public.program_assignments
    WHERE client_id = p_client_id 
    AND status = 'active'
    ORDER BY start_date DESC
    LIMIT 1;
    
    IF v_assignment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active program assigned');
    END IF;
    
    -- Get progress record
    SELECT * INTO v_progress_record
    FROM public.program_assignment_progress
    WHERE assignment_id = v_assignment_id AND client_id = p_client_id;
    
    IF v_progress_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Progress record not found');
    END IF;
    
    -- Get program schedule for current workout
    SELECT ps.*
    INTO v_program_schedule
    FROM public.program_schedule ps
    WHERE ps.program_id = v_progress_record.program_id
    AND ps.template_id = p_template_id
    AND ps.week_number = v_progress_record.current_week
    AND ps.program_day = v_progress_record.current_day
    AND ps.is_active = true;
    
    IF v_program_schedule IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Workout not found in current program');
    END IF;
    
    -- Record workout completion
    INSERT INTO public.program_workout_completions (
        assignment_progress_id, client_id, program_id,
        week_number, program_day, template_id, workout_date,
        duration_minutes, notes
    ) VALUES (
        v_progress_record.id, p_client_id, v_progress_record.program_id,
        v_progress_record.current_week, v_progress_record.current_day, p_template_id, CURRENT_DATE,
        p_duration_minutes, p_notes
    ) RETURNING id INTO v_completion_id;
    
    -- Update progress
    UPDATE public.program_assignment_progress
    SET 
        days_completed_this_week = days_completed_this_week + 1,
        current_day = CASE 
            WHEN current_day >= 6 THEN 1  -- Reset to day 1 after day 6
            ELSE current_day + 1
        END,
        current_week = CASE 
            WHEN current_day >= 6 THEN current_week + 1
            ELSE current_week
        END,
        last_workout_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = v_progress_record.id;
    
    -- Check if program is completed
    SELECT duration_weeks INTO v_total_weeks
    FROM public.workout_programs
    WHERE id = v_progress_record.program_id;
    
    -- Get updated progress record
    SELECT * INTO v_progress_record
    FROM public.program_assignment_progress
    WHERE id = v_progress_record.id;
    
    IF v_progress_record.current_week > v_total_weeks THEN
        -- Program completed! Move to completed programs
        v_is_program_completed := true;
        
        -- Mark as completed
        UPDATE public.program_assignment_progress
        SET 
            is_program_completed = true,
            completed_at = NOW(),
            total_weeks_completed = v_total_weeks,
            updated_at = NOW()
        WHERE id = v_progress_record.id;
        
        -- Add to completed programs
        INSERT INTO public.completed_programs (
            client_id, program_id, assignment_id,
            program_name, program_description, total_weeks, difficulty_level, coach_name,
            started_date, completed_date, total_workouts_completed, completion_percentage
        )
        SELECT 
            p_client_id, wp.id, pa.id,
            wp.name, wp.description, wp.duration_weeks, wp.difficulty_level, 
            p.first_name || ' ' || p.last_name as coach_name,
            pa.start_date, CURRENT_DATE,
            COUNT(pwc.id) as total_workouts_completed,
            100.00 as completion_percentage
        FROM public.workout_programs wp
        JOIN public.program_assignments pa ON pa.program_id = wp.id
        JOIN public.profiles p ON p.id = wp.coach_id
        LEFT JOIN public.program_workout_completions pwc ON pwc.assignment_progress_id = v_progress_record.id
        WHERE wp.id = v_progress_record.program_id AND pa.id = v_assignment_id
        GROUP BY wp.id, pa.id, p.first_name, p.last_name;
        
        -- Deactivate the program assignment
        UPDATE public.program_assignments
        SET status = 'completed', end_date = CURRENT_DATE, updated_at = NOW()
        WHERE id = v_assignment_id;
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Workout completed successfully',
        'completionId', v_completion_id,
        'isProgramCompleted', v_is_program_completed,
        'nextWorkout', CASE 
            WHEN v_is_program_completed THEN jsonb_build_object(
                'hasWorkout', false,
                'message', 'Program completed! Check your completed programs.'
            )
            ELSE get_next_due_workout(p_client_id)
        END
    );
    
    RETURN v_result;
END;
$$;

-- Function to get completed programs for a client
CREATE OR REPLACE FUNCTION get_completed_programs(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_completed_programs JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', cp.id,
            'programId', cp.program_id,
            'programName', cp.program_name,
            'programDescription', cp.program_description,
            'totalWeeks', cp.total_weeks,
            'difficultyLevel', cp.difficulty_level,
            'coachName', cp.coach_name,
            'startedDate', cp.started_date,
            'completedDate', cp.completed_date,
            'totalWorkoutsCompleted', cp.total_workouts_completed,
            'completionPercentage', cp.completion_percentage
        )
    ) INTO v_completed_programs
    FROM public.completed_programs cp
    WHERE cp.client_id = p_client_id
    ORDER BY cp.completed_date DESC;
    
    RETURN COALESCE(v_completed_programs, '[]'::jsonb);
END;
$$;

-- 8. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.program_assignment_progress TO authenticated;
GRANT ALL ON public.completed_programs TO authenticated;
GRANT ALL ON public.program_workout_completions TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_next_due_workout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_workout(UUID, UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_completed_programs(UUID) TO authenticated;

-- 9. TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================
CREATE TRIGGER update_program_assignment_progress_updated_at 
    BEFORE UPDATE ON public.program_assignment_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_completed_programs_updated_at 
    BEFORE UPDATE ON public.completed_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Flexible Programs System schema setup completed successfully! 🚀' as message;

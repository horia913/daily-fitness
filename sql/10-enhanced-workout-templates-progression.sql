-- =====================================================
-- Enhanced Workout Templates and Progression System
-- =====================================================
-- This file restructures the workout system to separate templates from progression
-- Implements the new architecture for efficient program management

-- 1. DROP EXISTING CONSTRAINTS AND UPDATE WORKOUT TEMPLATES
-- =====================================================

-- First, let's update the existing workout_templates table to be template-only
-- Remove the sets, reps, rest from workout_template_exercises (these become progression rules)
DROP TABLE IF EXISTS public.workout_template_exercises CASCADE;

-- Recreate workout_template_exercises as template structure only
CREATE TABLE public.workout_template_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    sets INTEGER DEFAULT 3,
    reps TEXT DEFAULT '8-10',
    rest_seconds INTEGER DEFAULT 60,
    rir INTEGER DEFAULT 2, -- Reps in Reserve (0-5)
    tempo TEXT DEFAULT '2-0-1-0', -- Eccentric-Pause-Concentric-Pause
    notes TEXT, -- General exercise notes/instructions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, order_index)
);

-- 2. PROGRAM SCHEDULE TABLE
-- =====================================================
-- Links workout templates to specific days of the week for entire program duration
CREATE TABLE public.program_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Monday, 6=Sunday
    template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
    is_optional BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, day_of_week, template_id)
);

-- 3. PROGRESSION RULES TABLE
-- =====================================================
-- Defines week-by-week progression for each exercise within a program
CREATE TABLE public.program_progression_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL CHECK (week_number >= 1),
    sets INTEGER NOT NULL DEFAULT 3,
    reps TEXT NOT NULL DEFAULT '8-10', -- Can be range like "8-10" or specific like "12"
    weight_guidance TEXT, -- e.g., "75% 1RM", "RPE 7-8", "Bodyweight", "15kg"
    rest_seconds INTEGER DEFAULT 60,
    rpe_target DECIMAL(3,1), -- Rate of Perceived Exertion (1.0-10.0)
    notes TEXT, -- Week-specific notes for this exercise
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, exercise_id, week_number)
);

-- 4. EXERCISE ALTERNATIVES TABLE
-- =====================================================
-- Stores alternative exercises for equipment substitution
CREATE TABLE public.exercise_alternatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    alternative_exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('equipment', 'difficulty', 'injury', 'preference')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(primary_exercise_id, alternative_exercise_id)
);

-- 5. DAILY WORKOUT CACHE TABLE
-- =====================================================
-- Caches dynamically generated daily workouts for performance
CREATE TABLE public.daily_workout_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    program_assignment_id UUID NOT NULL REFERENCES public.program_assignments(id) ON DELETE CASCADE,
    workout_date DATE NOT NULL,
    template_id UUID NOT NULL REFERENCES public.workout_templates(id),
    week_number INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    workout_data JSONB NOT NULL, -- Complete workout with exercises, sets, reps, etc.
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(client_id, program_assignment_id, workout_date)
);

-- 6. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_workout_template_exercises_template_id ON public.workout_template_exercises(template_id);
CREATE INDEX idx_workout_template_exercises_exercise_id ON public.workout_template_exercises(exercise_id);
CREATE INDEX idx_program_schedule_program_id ON public.program_schedule(program_id);
CREATE INDEX idx_program_schedule_day_of_week ON public.program_schedule(day_of_week);
CREATE INDEX idx_program_schedule_template_id ON public.program_schedule(template_id);
CREATE INDEX idx_program_progression_rules_program_id ON public.program_progression_rules(program_id);
CREATE INDEX idx_program_progression_rules_exercise_id ON public.program_progression_rules(exercise_id);
CREATE INDEX idx_program_progression_rules_week ON public.program_progression_rules(week_number);
CREATE INDEX idx_exercise_alternatives_primary ON public.exercise_alternatives(primary_exercise_id);
CREATE INDEX idx_exercise_alternatives_alternative ON public.exercise_alternatives(alternative_exercise_id);
CREATE INDEX idx_daily_workout_cache_client_date ON public.daily_workout_cache(client_id, workout_date);
CREATE INDEX idx_daily_workout_cache_expires ON public.daily_workout_cache(expires_at);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_workout_cache ENABLE ROW LEVEL SECURITY;

-- Workout Template Exercises Policies
CREATE POLICY "Coaches can manage exercises in their templates" ON public.workout_template_exercises
    FOR ALL USING (
        template_id IN (
            SELECT id FROM public.workout_templates WHERE coach_id = auth.uid()
        )
    );

CREATE POLICY "Clients can read exercises in assigned templates" ON public.workout_template_exercises
    FOR SELECT USING (
        template_id IN (
            SELECT wt.id FROM public.workout_templates wt
            JOIN public.program_schedule ps ON ps.template_id = wt.id
            JOIN public.program_assignments pa ON pa.program_id = ps.program_id
            WHERE pa.client_id = auth.uid()
        )
    );

-- Program Schedule Policies
CREATE POLICY "Coaches can manage their program schedules" ON public.program_schedule
    FOR ALL USING (
        program_id IN (
            SELECT id FROM public.workout_programs WHERE coach_id = auth.uid()
        )
    );

CREATE POLICY "Clients can read their program schedules" ON public.program_schedule
    FOR SELECT USING (
        program_id IN (
            SELECT program_id FROM public.program_assignments WHERE client_id = auth.uid()
        )
    );

-- Progression Rules Policies
CREATE POLICY "Coaches can manage progression rules for their programs" ON public.program_progression_rules
    FOR ALL USING (
        program_id IN (
            SELECT id FROM public.workout_programs WHERE coach_id = auth.uid()
        )
    );

CREATE POLICY "Clients can read progression rules for their programs" ON public.program_progression_rules
    FOR SELECT USING (
        program_id IN (
            SELECT program_id FROM public.program_assignments WHERE client_id = auth.uid()
        )
    );

-- Exercise Alternatives Policies (read-only for all authenticated users)
CREATE POLICY "Anyone can read exercise alternatives" ON public.exercise_alternatives
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Coaches can manage exercise alternatives" ON public.exercise_alternatives
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Daily Workout Cache Policies
CREATE POLICY "Clients can read their own cached workouts" ON public.daily_workout_cache
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "System can manage workout cache" ON public.daily_workout_cache
    FOR ALL USING (true); -- This will be restricted by application logic

-- 8. FUNCTIONS FOR DYNAMIC WORKOUT GENERATION
-- =====================================================

-- Function to generate daily workout for a client
CREATE OR REPLACE FUNCTION generate_daily_workout(
    p_client_id UUID,
    p_program_assignment_id UUID,
    p_workout_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_program_id UUID;
    v_start_date DATE;
    v_week_number INTEGER;
    v_day_of_week INTEGER;
    v_template_id UUID;
    v_template_record RECORD;
    v_workout_data JSONB;
    v_exercises JSONB;
    v_exercise RECORD;
    v_progression RECORD;
BEGIN
    -- Get program assignment details
    SELECT program_id, start_date 
    INTO v_program_id, v_start_date
    FROM public.program_assignments 
    WHERE id = p_program_assignment_id AND client_id = p_client_id;
    
    IF v_program_id IS NULL THEN
        RAISE EXCEPTION 'Program assignment not found';
    END IF;
    
    -- Calculate week number (1-based)
    v_week_number := FLOOR((p_workout_date - v_start_date) / 7) + 1;
    
    -- Calculate day of week (0=Monday, 6=Sunday)
    v_day_of_week := EXTRACT(DOW FROM p_workout_date) - 1;
    IF v_day_of_week = -1 THEN v_day_of_week := 6; END IF; -- Sunday handling
    
    -- Get template for this day
    SELECT template_id INTO v_template_id
    FROM public.program_schedule
    WHERE program_id = v_program_id AND day_of_week = v_day_of_week;
    
    IF v_template_id IS NULL THEN
        -- No workout scheduled for this day
        RETURN jsonb_build_object(
            'hasWorkout', false,
            'message', 'Rest day - no workout scheduled'
        );
    END IF;
    
    -- Get template details
    SELECT * INTO v_template_record
    FROM public.workout_templates
    WHERE id = v_template_id;
    
    -- Build exercises array with progression
    v_exercises := '[]'::jsonb;
    
    FOR v_exercise IN 
        SELECT wte.*, e.name, e.description, e.instructions
        FROM public.workout_template_exercises wte
        JOIN public.exercises e ON e.id = wte.exercise_id
        WHERE wte.template_id = v_template_id
        ORDER BY wte.order_index
    LOOP
        -- Get progression rule for this exercise and week
        SELECT * INTO v_progression
        FROM public.program_progression_rules
        WHERE program_id = v_program_id 
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
            'sets', COALESCE(v_progression.sets, 3),
            'reps', COALESCE(v_progression.reps, '8-10'),
            'weightGuidance', v_progression.weight_guidance,
            'restSeconds', COALESCE(v_progression.rest_seconds, 60),
            'rpeTarget', v_progression.rpe_target,
            'progressionNotes', v_progression.notes
        );
    END LOOP;
    
    -- Build complete workout data
    v_workout_data := jsonb_build_object(
        'hasWorkout', true,
        'templateId', v_template_id,
        'templateName', v_template_record.name,
        'templateDescription', v_template_record.description,
        'weekNumber', v_week_number,
        'dayOfWeek', v_day_of_week,
        'estimatedDuration', v_template_record.estimated_duration,
        'difficultyLevel', v_template_record.difficulty_level,
        'exercises', v_exercises,
        'generatedAt', NOW()
    );
    
    -- Cache the workout
    INSERT INTO public.daily_workout_cache (
        client_id, program_assignment_id, workout_date, 
        template_id, week_number, day_of_week, workout_data
    ) VALUES (
        p_client_id, p_program_assignment_id, p_workout_date,
        v_template_id, v_week_number, v_day_of_week, v_workout_data
    ) ON CONFLICT (client_id, program_assignment_id, workout_date) 
    DO UPDATE SET 
        workout_data = EXCLUDED.workout_data,
        generated_at = NOW(),
        expires_at = NOW() + INTERVAL '7 days';
    
    RETURN v_workout_data;
END;
$$;

-- Function to get cached or generate daily workout
CREATE OR REPLACE FUNCTION get_daily_workout(
    p_client_id UUID,
    p_workout_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_assignment_id UUID;
    v_cached_workout JSONB;
BEGIN
    -- Get active program assignment
    SELECT id INTO v_assignment_id
    FROM public.program_assignments
    WHERE client_id = p_client_id 
    AND status = 'active'
    AND start_date <= p_workout_date
    AND (end_date IS NULL OR end_date >= p_workout_date)
    ORDER BY start_date DESC
    LIMIT 1;
    
    IF v_assignment_id IS NULL THEN
        RETURN jsonb_build_object(
            'hasWorkout', false,
            'message', 'No active program assigned'
        );
    END IF;
    
    -- Check cache first
    SELECT workout_data INTO v_cached_workout
    FROM public.daily_workout_cache
    WHERE client_id = p_client_id 
    AND program_assignment_id = v_assignment_id
    AND workout_date = p_workout_date
    AND expires_at > NOW();
    
    IF v_cached_workout IS NOT NULL THEN
        RETURN v_cached_workout;
    END IF;
    
    -- Generate new workout
    RETURN generate_daily_workout(p_client_id, v_assignment_id, p_workout_date);
END;
$$;

-- Function to clear expired cache entries
CREATE OR REPLACE FUNCTION cleanup_workout_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.daily_workout_cache
    WHERE expires_at <= NOW();
END;
$$;

-- 9. TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================
CREATE TRIGGER update_workout_template_exercises_updated_at 
    BEFORE UPDATE ON public.workout_template_exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_schedule_updated_at 
    BEFORE UPDATE ON public.program_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_progression_rules_updated_at 
    BEFORE UPDATE ON public.program_progression_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.workout_template_exercises TO authenticated;
GRANT ALL ON public.program_schedule TO authenticated;
GRANT ALL ON public.program_progression_rules TO authenticated;
GRANT ALL ON public.exercise_alternatives TO authenticated;
GRANT ALL ON public.daily_workout_cache TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION generate_daily_workout(UUID, UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_workout(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_workout_cache() TO authenticated;

-- 11. SAMPLE DATA
-- =====================================================
-- Insert some sample exercise alternatives
INSERT INTO public.exercise_alternatives (primary_exercise_id, alternative_exercise_id, reason, notes)
SELECT 
    e1.id as primary_exercise_id,
    e2.id as alternative_exercise_id,
    'equipment' as reason,
    'Equipment substitution alternative' as notes
FROM public.exercises e1, public.exercises e2
WHERE e1.name ILIKE '%barbell%' AND e2.name ILIKE '%dumbbell%'
AND e1.id != e2.id
LIMIT 5
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Enhanced workout templates and progression system setup completed successfully! 🚀' as message;

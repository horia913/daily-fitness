-- =====================================================
-- Workout Programs System
-- =====================================================
-- This file contains the workout programs table and related functionality

-- 1. WORKOUT PROGRAMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workout_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    difficulty_level TEXT DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    duration_weeks INTEGER DEFAULT 4,
    target_audience TEXT DEFAULT 'general_fitness' CHECK (target_audience IN ('general_fitness', 'weight_loss', 'muscle_gain', 'strength', 'endurance', 'athletic_performance')),
    is_public BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    category_id UUID REFERENCES public.exercise_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PROGRAM WEEKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.program_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    focus_area TEXT DEFAULT 'strength' CHECK (focus_area IN ('strength', 'cardio', 'flexibility', 'balance', 'sports')),
    is_deload BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, week_number)
);

-- 3. PROGRAM WEEK WORKOUTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.program_week_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id UUID NOT NULL REFERENCES public.program_weeks(id) ON DELETE CASCADE,
    workout_template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
    order_index INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week_id, day_number, order_index)
);

-- 4. PROGRAM ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.program_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, client_id)
);

-- 5. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_workout_programs_coach_id ON public.workout_programs(coach_id);
CREATE INDEX IF NOT EXISTS idx_workout_programs_active ON public.workout_programs(is_active);
CREATE INDEX IF NOT EXISTS idx_program_weeks_program_id ON public.program_weeks(program_id);
CREATE INDEX IF NOT EXISTS idx_program_week_workouts_week_id ON public.program_week_workouts(week_id);
CREATE INDEX IF NOT EXISTS idx_program_assignments_client_id ON public.program_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_program_assignments_coach_id ON public.program_assignments(coach_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_week_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_assignments ENABLE ROW LEVEL SECURITY;

-- Workout Programs Policies
CREATE POLICY "Coaches can view their own programs" ON public.workout_programs
    FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY "Coaches can create programs" ON public.workout_programs
    FOR INSERT WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can update their own programs" ON public.workout_programs
    FOR UPDATE USING (coach_id = auth.uid());

CREATE POLICY "Coaches can delete their own programs" ON public.workout_programs
    FOR DELETE USING (coach_id = auth.uid());

-- Program Weeks Policies
CREATE POLICY "Coaches can manage weeks of their programs" ON public.program_weeks
    FOR ALL USING (
        program_id IN (
            SELECT id FROM public.workout_programs WHERE coach_id = auth.uid()
        )
    );

-- Program Week Workouts Policies
CREATE POLICY "Coaches can manage workouts in their program weeks" ON public.program_week_workouts
    FOR ALL USING (
        week_id IN (
            SELECT pw.id FROM public.program_weeks pw
            JOIN public.workout_programs wp ON pw.program_id = wp.id
            WHERE wp.coach_id = auth.uid()
        )
    );

-- Program Assignments Policies
CREATE POLICY "Coaches can view assignments they created" ON public.program_assignments
    FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY "Coaches can create assignments" ON public.program_assignments
    FOR INSERT WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can update their assignments" ON public.program_assignments
    FOR UPDATE USING (coach_id = auth.uid());

CREATE POLICY "Coaches can delete their assignments" ON public.program_assignments
    FOR DELETE USING (coach_id = auth.uid());

-- Clients can view their own assignments
CREATE POLICY "Clients can view their own assignments" ON public.program_assignments
    FOR SELECT USING (client_id = auth.uid());

-- 7. FUNCTIONS FOR AUTOMATIC TIMESTAMPS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_workout_programs_updated_at BEFORE UPDATE ON public.workout_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_weeks_updated_at BEFORE UPDATE ON public.program_weeks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_week_workouts_updated_at BEFORE UPDATE ON public.program_week_workouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_assignments_updated_at BEFORE UPDATE ON public.program_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DailyFitness Workout System
-- =====================================================
-- This file contains all workout-related tables and functionality

-- 1. EXERCISE CATEGORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.exercise_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO public.exercise_categories (name, description, icon, color) VALUES
('Strength', 'Weight training and resistance exercises', 'Dumbbell', '#3B82F6'),
('Cardio', 'Cardiovascular and endurance exercises', 'Heart', '#EF4444'),
('Flexibility', 'Stretching and mobility exercises', 'Zap', '#10B981'),
('Balance', 'Balance and stability exercises', 'Target', '#F59E0B'),
('Sports', 'Sport-specific exercises', 'Trophy', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;

-- 2. EXERCISES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    tips TEXT,
    category_id UUID REFERENCES public.exercise_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. WORKOUT TEMPLATES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workout_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    coach_id UUID NOT NULL,
    difficulty_level TEXT DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    estimated_duration INTEGER DEFAULT 60, -- in minutes
    category TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. WORKOUT TEMPLATE EXERCISES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workout_template_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    sets INTEGER DEFAULT 3,
    reps TEXT DEFAULT '10-12',
    rest_seconds INTEGER DEFAULT 60,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. WORKOUT ASSIGNMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workout_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'skipped')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. WORKOUT SESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID NOT NULL,
    client_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES
-- =====================================================

-- Exercise Categories (read-only for all authenticated users)
DROP POLICY IF EXISTS "Anyone can read exercise categories" ON public.exercise_categories;
CREATE POLICY "Anyone can read exercise categories" ON public.exercise_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Exercises (read-only for all authenticated users)
DROP POLICY IF EXISTS "Anyone can read exercises" ON public.exercises;
CREATE POLICY "Anyone can read exercises" ON public.exercises
    FOR SELECT USING (auth.role() = 'authenticated');

-- Workout Templates (coaches can manage their own, clients can read assigned)
DROP POLICY IF EXISTS "Coaches can manage their workout templates" ON public.workout_templates;
CREATE POLICY "Coaches can manage their workout templates" ON public.workout_templates
    FOR ALL USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Clients can read assigned workout templates" ON public.workout_templates;
CREATE POLICY "Clients can read assigned workout templates" ON public.workout_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workout_assignments 
            WHERE workout_assignments.workout_template_id = workout_templates.id 
            AND workout_assignments.client_id = auth.uid()
        )
    );

-- Workout Template Exercises (coaches can manage, clients can read assigned)
DROP POLICY IF EXISTS "Coaches can manage workout template exercises" ON public.workout_template_exercises;
CREATE POLICY "Coaches can manage workout template exercises" ON public.workout_template_exercises
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workout_templates 
            WHERE workout_templates.id = workout_template_exercises.template_id 
            AND workout_templates.coach_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Clients can read assigned workout template exercises" ON public.workout_template_exercises;
CREATE POLICY "Clients can read assigned workout template exercises" ON public.workout_template_exercises
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workout_templates 
            JOIN public.workout_assignments ON workout_assignments.workout_template_id = workout_templates.id
            WHERE workout_templates.id = workout_template_exercises.template_id 
            AND workout_assignments.client_id = auth.uid()
        )
    );

-- Workout Assignments (coaches can manage, clients can read their own)
DROP POLICY IF EXISTS "Coaches can manage workout assignments" ON public.workout_assignments;
CREATE POLICY "Coaches can manage workout assignments" ON public.workout_assignments
    FOR ALL USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Clients can read their workout assignments" ON public.workout_assignments;
CREATE POLICY "Clients can read their workout assignments" ON public.workout_assignments
    FOR SELECT USING (client_id = auth.uid());

-- Sessions (coaches can manage, clients can read their own)
DROP POLICY IF EXISTS "Coaches can manage sessions" ON public.sessions;
CREATE POLICY "Coaches can manage sessions" ON public.sessions
    FOR ALL USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Clients can read their sessions" ON public.sessions;
CREATE POLICY "Clients can read their sessions" ON public.sessions
    FOR SELECT USING (client_id = auth.uid());

-- 9. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_exercises_category_id ON public.exercises(category_id);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON public.exercises(name);
CREATE INDEX IF NOT EXISTS idx_workout_templates_coach_id ON public.workout_templates(coach_id);
CREATE INDEX IF NOT EXISTS idx_workout_templates_is_active ON public.workout_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_workout_template_exercises_template_id ON public.workout_template_exercises(template_id);
CREATE INDEX IF NOT EXISTS idx_workout_template_exercises_exercise_id ON public.workout_template_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_client_id ON public.workout_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_coach_id ON public.workout_assignments(coach_id);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_scheduled_date ON public.workout_assignments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_status ON public.workout_assignments(status);
CREATE INDEX IF NOT EXISTS idx_sessions_coach_id ON public.sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON public.sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_at ON public.sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);

-- 10. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.exercise_categories TO authenticated;
GRANT ALL ON public.exercises TO authenticated;
GRANT ALL ON public.workout_templates TO authenticated;
GRANT ALL ON public.workout_template_exercises TO authenticated;
GRANT ALL ON public.workout_assignments TO authenticated;
GRANT ALL ON public.sessions TO authenticated;

-- Success message
SELECT 'Workout system setup completed successfully! 🏋️‍♂️' as message;

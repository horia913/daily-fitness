-- =====================================================
-- Exercise Groups Schema - Minimal Fix
-- =====================================================
-- This implements proper grouping for supersets, circuits, etc.
-- Solves the messy JSON-in-notes problem with clean relational structure
-- =====================================================

-- 1. CREATE EXERCISE GROUPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workout_exercise_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
    
    -- Group identity
    group_type TEXT NOT NULL CHECK (group_type IN (
        'straight_set', 'superset', 'giant_set', 'circuit', 'tabata',
        'amrap', 'emom', 'drop_set', 'cluster_set', 'rest_pause',
        'pyramid_set', 'pre_exhaustion', 'for_time', 'ladder'
    )),
    group_order INTEGER NOT NULL,
    
    -- Rest information
    rest_after_seconds INTEGER DEFAULT 60,
    
    -- Protocol-specific parameters (many will be NULL)
    rounds INTEGER,
    work_seconds INTEGER,
    rest_seconds INTEGER,
    duration_seconds INTEGER,
    reps_per_minute INTEGER,
    drop_percentage DECIMAL(5,2),
    target_reps INTEGER,
    time_cap INTEGER,
    rest_pause_duration INTEGER,
    max_rest_pauses INTEGER,
    clusters_per_set INTEGER,
    intra_cluster_rest INTEGER,
    inter_set_rest INTEGER,
    
    -- Flexible storage for complex protocols
    group_parameters JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ADD COLUMNS TO EXISTING TABLE
-- =====================================================
ALTER TABLE public.workout_template_exercises
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.workout_exercise_groups(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS group_letter TEXT,
    ADD COLUMN IF NOT EXISTS work_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(8,2);

-- 3. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_workout_exercise_groups_template 
    ON public.workout_exercise_groups(template_id);
    
CREATE INDEX IF NOT EXISTS idx_workout_exercise_groups_order 
    ON public.workout_exercise_groups(template_id, group_order);
    
CREATE INDEX IF NOT EXISTS idx_workout_template_exercises_group 
    ON public.workout_template_exercises(group_id);

-- 4. ENABLE RLS
-- =====================================================
ALTER TABLE public.workout_exercise_groups ENABLE ROW LEVEL SECURITY;

-- 5. CREATE RLS POLICIES
-- =====================================================

-- Coaches can manage their exercise groups
DROP POLICY IF EXISTS "Coaches can manage exercise groups" ON public.workout_exercise_groups;
CREATE POLICY "Coaches can manage exercise groups" ON public.workout_exercise_groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workout_templates 
            WHERE workout_templates.id = workout_exercise_groups.template_id 
            AND workout_templates.coach_id = auth.uid()
        )
    );

-- Clients can read assigned exercise groups
DROP POLICY IF EXISTS "Clients can read assigned exercise groups" ON public.workout_exercise_groups;
CREATE POLICY "Clients can read assigned exercise groups" ON public.workout_exercise_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workout_templates 
            JOIN public.workout_assignments ON workout_assignments.workout_template_id = workout_templates.id
            WHERE workout_templates.id = workout_exercise_groups.template_id 
            AND workout_assignments.client_id = auth.uid()
        )
    );

-- 6. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.workout_exercise_groups TO authenticated;

-- 7. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.workout_exercise_groups IS 'Groups exercises together (supersets, circuits, etc.)';
COMMENT ON COLUMN public.workout_exercise_groups.group_type IS 'Type of exercise group: superset, circuit, tabata, etc.';
COMMENT ON COLUMN public.workout_exercise_groups.group_order IS 'Order of this group within the workout';
COMMENT ON COLUMN public.workout_exercise_groups.rest_after_seconds IS 'Rest time after completing all exercises in this group';

COMMENT ON COLUMN public.workout_template_exercises.group_id IS 'Links exercise to its group (for supersets, circuits, etc.)';
COMMENT ON COLUMN public.workout_template_exercises.group_letter IS 'Letter (A, B, C) for exercises within a group (e.g., superset A and B)';
COMMENT ON COLUMN public.workout_template_exercises.work_seconds IS 'Work duration for time-based exercises (tabata, AMRAP, etc.)';
COMMENT ON COLUMN public.workout_template_exercises.weight_kg IS 'Weight for drop sets, pyramid sets, etc.';

-- Success message
SELECT 'Exercise groups schema setup completed successfully! 🎉' as message;


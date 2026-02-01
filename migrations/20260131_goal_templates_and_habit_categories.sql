-- ============================================================================
-- MIGRATION: Goal Templates & Habit Categories
-- Date: 2026-01-31
-- Purpose: 
--   1. Create goal_templates table to replace hardcoded PRESET_GOALS (CLIENT-ONLY)
--   2. Add goal_template_id FK to goals table
--   3. Create habit_categories table (code expects it but doesn't exist)
--   4. Add missing columns to habits table (icon, color, category_id, unit, is_public)
--   5. Seed system templates for goals
--   6. Seed default habit categories
--
-- NOTE: Goals and Habits are CLIENT-EXCLUSIVE features. 
--       Coaches do NOT set or customize goals/habits - only system templates exist.
-- ============================================================================

-- ============================================================================
-- PART 1: GOAL TEMPLATES (System-only, no coach customization)
-- ============================================================================

-- 1A. Create goal_templates table
CREATE TABLE IF NOT EXISTS public.goal_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template metadata
    title text NOT NULL,
    description text,
    emoji text DEFAULT '🎯',
    
    -- Categorization
    category text NOT NULL, -- 'body_composition', 'strength', 'consistency', 'endurance', 'flexibility'
    subcategory text, -- 'Body Composition', 'Strength & Performance', etc.
    
    -- Unit configuration
    default_unit text NOT NULL, -- 'kg', '%', 'workouts/week', 'minutes', etc.
    suggested_unit_display text, -- 'per week', 'kilograms', etc. (for UI)
    
    -- Auto-tracking configuration
    is_auto_tracked boolean DEFAULT false,
    auto_track_source text, -- 'workout_logs_weekly', 'body_metrics_weight', 'body_metrics_body_fat', etc.
    
    -- Status
    is_active boolean DEFAULT true,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 1B. Add goal_template_id FK to existing goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS goal_template_id uuid REFERENCES public.goal_templates(id) ON DELETE SET NULL;

-- 1C. Create indexes for goal_templates
CREATE INDEX IF NOT EXISTS idx_goal_templates_category ON public.goal_templates(category);
CREATE INDEX IF NOT EXISTS idx_goal_templates_active ON public.goal_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_goals_template_id ON public.goals(goal_template_id);

-- 1D. Enable RLS on goal_templates
ALTER TABLE public.goal_templates ENABLE ROW LEVEL SECURITY;

-- 1E. RLS Policies for goal_templates (read-only for all authenticated users)
-- All authenticated users can read active goal templates
CREATE POLICY "Authenticated users can view goal templates"
ON public.goal_templates FOR SELECT
TO authenticated
USING (is_active = true);

-- ============================================================================
-- PART 2: HABIT CATEGORIES (System-only, no coach customization)
-- ============================================================================

-- 2A. Create habit_categories table
CREATE TABLE IF NOT EXISTS public.habit_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category metadata
    name text NOT NULL,
    description text,
    icon text DEFAULT '📋',
    color text DEFAULT '#8B5CF6',
    
    -- Ordering
    sort_order integer DEFAULT 0,
    
    -- Status
    is_active boolean DEFAULT true,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2B. Add missing columns to habits table
ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS icon text DEFAULT '🎯';

ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS color text DEFAULT '#8B5CF6';

ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.habit_categories(id) ON DELETE SET NULL;

ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS unit text;

ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS target_value integer;

-- 2C. Create indexes for habit_categories
CREATE INDEX IF NOT EXISTS idx_habit_categories_active ON public.habit_categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_habit_categories_sort ON public.habit_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_habits_category_id ON public.habits(category_id);

-- 2D. Enable RLS on habit_categories
ALTER TABLE public.habit_categories ENABLE ROW LEVEL SECURITY;

-- 2E. RLS Policies for habit_categories (read-only for all authenticated users)
-- All authenticated users can read active habit categories
CREATE POLICY "Authenticated users can view habit categories"
ON public.habit_categories FOR SELECT
TO authenticated
USING (is_active = true);

-- ============================================================================
-- PART 3: SEED DATA - GOAL TEMPLATES (System templates only)
-- ============================================================================

INSERT INTO public.goal_templates (
    title, description, emoji, category, subcategory, 
    default_unit, suggested_unit_display, is_auto_tracked, auto_track_source, is_active
) VALUES
-- BODY COMPOSITION GOALS
('Fat Loss', 'Reduce body fat percentage', '🔥', 'body_composition', 'Body Composition', 
 '%', '%', true, 'body_metrics_body_fat', true),

('Muscle Gain', 'Increase muscle mass', '💪', 'body_composition', 'Body Composition', 
 'kg', 'kg', true, 'body_metrics_muscle_mass', true),

('Weight Loss', 'Reduce body weight', '⚖️', 'body_composition', 'Body Composition', 
 'kg', 'kg', true, 'body_metrics_weight', true),

('Body Recomposition', 'Increase muscle + decrease fat %', '🔄', 'body_composition', 'Body Composition', 
 'combined', 'kg muscle / % fat', false, NULL, true),

-- STRENGTH & PERFORMANCE GOALS
('Increase Bench Press', 'Improve upper body strength', '💥', 'strength', 'Strength & Performance', 
 'kg', 'kg', true, 'personal_records_bench_press', true),

('Increase Squat', 'Build leg strength', '🦵', 'strength', 'Strength & Performance', 
 'kg', 'kg', true, 'personal_records_squat', true),

('Increase Deadlift', 'Develop posterior chain strength', '🏋️', 'strength', 'Strength & Performance', 
 'kg', 'kg', true, 'personal_records_deadlift', true),

('Increase Hip Thrust', 'Build glute and posterior chain strength', '🍑', 'strength', 'Strength & Performance', 
 'kg', 'kg', true, 'personal_records_hip_thrust', true),

-- CONSISTENCY & ADHERENCE GOALS
('Workout Consistency', 'Complete X workouts per week', '📅', 'consistency', 'Consistency & Adherence', 
 'workouts/week', 'per week', true, 'workout_logs_weekly', true),

('Nutrition Tracking', 'Log meals X days per week', '🥗', 'consistency', 'Consistency & Adherence', 
 'days/week', 'days per week', false, NULL, true),

('Water Intake Goal', 'Drink X liters per day', '💧', 'consistency', 'Consistency & Adherence', 
 'liters', 'liters per day', false, NULL, true)

ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 4: SEED DATA - HABIT CATEGORIES (System categories only)
-- ============================================================================

INSERT INTO public.habit_categories (
    name, description, icon, color, sort_order, is_active
) VALUES
('Fitness', 'Exercise and physical activity habits', '🏃', '#10B981', 1, true),
('Nutrition', 'Diet and eating habits', '🥗', '#F59E0B', 2, true),
('Hydration', 'Water and fluid intake habits', '💧', '#3B82F6', 3, true),
('Sleep', 'Rest and recovery habits', '😴', '#6366F1', 4, true),
('Wellness', 'Mental health and mindfulness habits', '🧘', '#8B5CF6', 5, true),
('Recovery', 'Stretching, mobility, and recovery habits', '🔄', '#EC4899', 6, true),
('Supplements', 'Vitamin and supplement habits', '💊', '#14B8A6', 7, true),
('Other', 'Miscellaneous habits', '📋', '#6B7280', 99, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 5: UPDATE TRIGGER FOR updated_at
-- ============================================================================

-- Trigger function (create if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for goal_templates
DROP TRIGGER IF EXISTS update_goal_templates_updated_at ON public.goal_templates;
CREATE TRIGGER update_goal_templates_updated_at
    BEFORE UPDATE ON public.goal_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for habit_categories
DROP TRIGGER IF EXISTS update_habit_categories_updated_at ON public.habit_categories;
CREATE TRIGGER update_habit_categories_updated_at
    BEFORE UPDATE ON public.habit_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Verify goal_templates created and seeded:
-- SELECT id, title, category, subcategory, default_unit, is_auto_tracked FROM public.goal_templates ORDER BY category, title;

-- Verify habit_categories created and seeded:
-- SELECT id, name, icon, color, sort_order FROM public.habit_categories ORDER BY sort_order;

-- Verify habits table has new columns:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'habits' AND table_schema = 'public';

-- Verify goals table has goal_template_id:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'goal_template_id';

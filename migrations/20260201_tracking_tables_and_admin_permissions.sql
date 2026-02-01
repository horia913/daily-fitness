-- ============================================================================
-- MIGRATION: Tracking Tables & Admin Permissions
-- Date: 2026-02-01
-- Purpose:
--   1. Add new tracking tables (water, sleep, steps, wellness, supplements)
--   2. Add RPE column to workout_set_logs
--   3. Update RLS to allow admin CRUD on goal_templates, habit_categories, achievement_templates
--   4. Create admin helper function
-- ============================================================================

-- ============================================================================
-- PART 1: ADMIN HELPER FUNCTION
-- ============================================================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Harden SECURITY DEFINER function: set safe search_path and restrict access
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================================
-- PART 2: NEW TRACKING TABLES
-- ============================================================================

-- 2A. Water Intake Logs
CREATE TABLE IF NOT EXISTS public.water_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date date NOT NULL DEFAULT CURRENT_DATE,
    amount_ml integer NOT NULL, -- milliliters
    logged_at timestamp with time zone DEFAULT now(),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    
    -- Prevent duplicate entries for same date (allow multiple entries per day)
    CONSTRAINT water_logs_amount_positive CHECK (amount_ml > 0)
);

-- 2B. Sleep Logs
CREATE TABLE IF NOT EXISTS public.sleep_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date date NOT NULL DEFAULT CURRENT_DATE,
    hours_slept numeric(4,2), -- e.g., 7.5 hours
    quality_rating integer, -- 1-5 or 1-10
    bedtime time,
    wake_time time,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    
    -- NULL-safe constraints: allow NULL or valid range
    CONSTRAINT sleep_logs_hours_range CHECK (hours_slept IS NULL OR (hours_slept >= 0 AND hours_slept <= 24)),
    CONSTRAINT sleep_logs_quality_range CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 10))
);

-- 2C. Step Count Logs
CREATE TABLE IF NOT EXISTS public.step_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date date NOT NULL DEFAULT CURRENT_DATE,
    steps integer NOT NULL,
    distance_meters integer, -- optional, can be calculated or from device
    source text, -- 'manual', 'apple_health', 'google_fit', 'fitbit', etc.
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT step_logs_steps_positive CHECK (steps >= 0),
    UNIQUE (client_id, log_date) -- one entry per day per client
);

-- 2D. Daily Wellness Logs (mood, energy, stress)
CREATE TABLE IF NOT EXISTS public.daily_wellness_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date date NOT NULL DEFAULT CURRENT_DATE,
    energy_level integer, -- 1-10
    mood_rating integer, -- 1-10
    stress_level integer, -- 1-10
    motivation_level integer, -- 1-10
    soreness_level integer, -- 1-10 (DOMS)
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT wellness_energy_range CHECK (energy_level >= 1 AND energy_level <= 10),
    CONSTRAINT wellness_mood_range CHECK (mood_rating >= 1 AND mood_rating <= 10),
    CONSTRAINT wellness_stress_range CHECK (stress_level >= 1 AND stress_level <= 10),
    CONSTRAINT wellness_motivation_range CHECK (motivation_level >= 1 AND motivation_level <= 10),
    CONSTRAINT wellness_soreness_range CHECK (soreness_level >= 1 AND soreness_level <= 10),
    UNIQUE (client_id, log_date) -- one entry per day per client
);

-- 2E. Supplement Logs
CREATE TABLE IF NOT EXISTS public.supplement_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date date NOT NULL DEFAULT CURRENT_DATE,
    supplement_name text NOT NULL,
    dosage text, -- e.g., "5g", "1 capsule", "2 tablets"
    taken_at timestamp with time zone DEFAULT now(),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- 2F. Nutrition Summary Logs (daily totals - simplified)
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date date NOT NULL DEFAULT CURRENT_DATE,
    calories integer,
    protein_g numeric(6,1),
    carbs_g numeric(6,1),
    fat_g numeric(6,1),
    fiber_g numeric(6,1),
    water_ml integer, -- can be synced from water_logs
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    UNIQUE (client_id, log_date) -- one summary per day
);

-- ============================================================================
-- PART 3: ADD RPE TO WORKOUT_SET_LOGS
-- ============================================================================

-- Add RPE column (Rate of Perceived Exertion, 1-10)
ALTER TABLE public.workout_set_logs
ADD COLUMN IF NOT EXISTS rpe integer;

-- Add constraint for RPE range (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'workout_set_logs_rpe_range'
    ) THEN
        ALTER TABLE public.workout_set_logs
        ADD CONSTRAINT workout_set_logs_rpe_range 
        CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10));
    END IF;
END $$;

-- ============================================================================
-- PART 4: INDEXES FOR NEW TABLES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_water_logs_client_date ON public.water_logs(client_id, log_date);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_client_date ON public.sleep_logs(client_id, log_date);
CREATE INDEX IF NOT EXISTS idx_step_logs_client_date ON public.step_logs(client_id, log_date);
CREATE INDEX IF NOT EXISTS idx_wellness_logs_client_date ON public.daily_wellness_logs(client_id, log_date);
CREATE INDEX IF NOT EXISTS idx_supplement_logs_client_date ON public.supplement_logs(client_id, log_date);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_client_date ON public.nutrition_logs(client_id, log_date);

-- Index to support coach RLS lookups on clients table (used in all coach SELECT policies)
CREATE INDEX IF NOT EXISTS idx_clients_coach_client_status 
ON public.clients (coach_id, client_id, status);

-- ============================================================================
-- PART 5: RLS FOR NEW TRACKING TABLES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_wellness_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

-- Water Logs RLS
CREATE POLICY "Clients can manage own water logs"
ON public.water_logs FOR ALL
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coaches can view client water logs"
ON public.water_logs FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.client_id = water_logs.client_id
    AND c.coach_id = auth.uid()
    AND c.status = 'active'
));

CREATE POLICY "Admin can manage all water logs"
ON public.water_logs FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Sleep Logs RLS
CREATE POLICY "Clients can manage own sleep logs"
ON public.sleep_logs FOR ALL
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coaches can view client sleep logs"
ON public.sleep_logs FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.client_id = sleep_logs.client_id
    AND c.coach_id = auth.uid()
    AND c.status = 'active'
));

CREATE POLICY "Admin can manage all sleep logs"
ON public.sleep_logs FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Step Logs RLS
CREATE POLICY "Clients can manage own step logs"
ON public.step_logs FOR ALL
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coaches can view client step logs"
ON public.step_logs FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.client_id = step_logs.client_id
    AND c.coach_id = auth.uid()
    AND c.status = 'active'
));

CREATE POLICY "Admin can manage all step logs"
ON public.step_logs FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Daily Wellness Logs RLS
CREATE POLICY "Clients can manage own wellness logs"
ON public.daily_wellness_logs FOR ALL
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coaches can view client wellness logs"
ON public.daily_wellness_logs FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.client_id = daily_wellness_logs.client_id
    AND c.coach_id = auth.uid()
    AND c.status = 'active'
));

CREATE POLICY "Admin can manage all wellness logs"
ON public.daily_wellness_logs FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Supplement Logs RLS
CREATE POLICY "Clients can manage own supplement logs"
ON public.supplement_logs FOR ALL
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coaches can view client supplement logs"
ON public.supplement_logs FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.client_id = supplement_logs.client_id
    AND c.coach_id = auth.uid()
    AND c.status = 'active'
));

CREATE POLICY "Admin can manage all supplement logs"
ON public.supplement_logs FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Nutrition Logs RLS
CREATE POLICY "Clients can manage own nutrition logs"
ON public.nutrition_logs FOR ALL
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coaches can view client nutrition logs"
ON public.nutrition_logs FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.client_id = nutrition_logs.client_id
    AND c.coach_id = auth.uid()
    AND c.status = 'active'
));

CREATE POLICY "Admin can manage all nutrition logs"
ON public.nutrition_logs FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================================
-- PART 6: ADMIN CRUD PERMISSIONS FOR TEMPLATE TABLES
-- ============================================================================

-- Goal Templates - Admin can manage
CREATE POLICY "Admin can manage goal templates"
ON public.goal_templates FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Habit Categories - Admin can manage
CREATE POLICY "Admin can manage habit categories"
ON public.habit_categories FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Achievement Templates - Admin can manage (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'achievement_templates' 
        AND policyname = 'Admin can manage achievement templates'
    ) THEN
        CREATE POLICY "Admin can manage achievement templates"
        ON public.achievement_templates FOR ALL
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;
END $$;

-- Also ensure achievement_templates has a read policy for all users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'achievement_templates' 
        AND policyname = 'Authenticated users can view achievement templates'
    ) THEN
        CREATE POLICY "Authenticated users can view achievement templates"
        ON public.achievement_templates FOR SELECT
        TO authenticated
        USING (is_active = true);
    END IF;
END $$;

-- ============================================================================
-- PART 7: UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================================================

-- NOTE: Requires public.update_updated_at_column() to exist from earlier migrations.
-- This function is defined in 20260131_goal_templates_and_habit_categories.sql

-- Nutrition logs trigger
DROP TRIGGER IF EXISTS update_nutrition_logs_updated_at ON public.nutrition_logs;
CREATE TRIGGER update_nutrition_logs_updated_at
    BEFORE UPDATE ON public.nutrition_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PART 8: AUTO-TRACKING SOURCE REFERENCE TABLE
-- ============================================================================

-- This table documents what can be auto-tracked for goals/achievements
CREATE TABLE IF NOT EXISTS public.tracking_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_key text NOT NULL UNIQUE, -- 'workout_logs_weekly', 'body_metrics_weight', etc.
    display_name text NOT NULL,
    description text,
    source_table text NOT NULL, -- The actual table name
    aggregation_type text, -- 'count', 'sum', 'max', 'min', 'avg', 'latest', 'custom', 'count_distinct'
    value_column text, -- Which column to aggregate
    filter_column text, -- Optional filter column (e.g., 'exercise_id' for PRs)
    unit text, -- 'workouts', 'kg', '%', 'minutes', etc.
    category text, -- 'fitness', 'body', 'habits', 'wellness', etc.
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- Add constraint for valid aggregation types (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tracking_sources_agg_type_check'
    ) THEN
        ALTER TABLE public.tracking_sources
        ADD CONSTRAINT tracking_sources_agg_type_check
        CHECK (aggregation_type IN ('count', 'sum', 'max', 'min', 'avg', 'latest', 'custom', 'count_distinct'));
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.tracking_sources ENABLE ROW LEVEL SECURITY;

-- Everyone can read tracking sources
CREATE POLICY "Authenticated users can view tracking sources"
ON public.tracking_sources FOR SELECT
TO authenticated
USING (is_active = true);

-- Admin can manage tracking sources
CREATE POLICY "Admin can manage tracking sources"
ON public.tracking_sources FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Seed tracking sources
INSERT INTO public.tracking_sources (source_key, display_name, description, source_table, aggregation_type, value_column, unit, category) VALUES
-- Workout tracking
('workout_logs_count', 'Total Workouts Completed', 'Count of all completed workouts', 'workout_logs', 'count', 'id', 'workouts', 'fitness'),
('workout_logs_weekly', 'Workouts This Week', 'Workouts completed in current calendar week', 'workout_logs', 'count', 'id', 'workouts/week', 'fitness'),
('workout_logs_duration', 'Total Workout Time', 'Sum of all workout durations', 'workout_logs', 'sum', 'total_duration_minutes', 'minutes', 'fitness'),
('workout_logs_streak', 'Workout Streak', 'Consecutive days with workouts', 'workout_logs', 'custom', 'completed_at', 'days', 'fitness'),

-- Body metrics tracking
('body_metrics_weight', 'Current Weight', 'Latest body weight measurement', 'body_metrics', 'latest', 'weight_kg', 'kg', 'body'),
('body_metrics_body_fat', 'Body Fat Percentage', 'Latest body fat measurement', 'body_metrics', 'latest', 'body_fat_percentage', '%', 'body'),
('body_metrics_muscle_mass', 'Muscle Mass', 'Latest muscle mass measurement', 'body_metrics', 'latest', 'muscle_mass_kg', 'kg', 'body'),
('body_metrics_waist', 'Waist Circumference', 'Latest waist measurement', 'body_metrics', 'latest', 'waist_circumference', 'cm', 'body'),

-- Strength tracking (PRs)
('personal_records_any', 'Personal Records', 'Count of all-time PRs', 'workout_set_logs', 'count_distinct', 'exercise_id', 'PRs', 'fitness'),
('personal_records_weight', 'Max Weight Lifted', 'Heaviest weight lifted (any exercise)', 'workout_set_logs', 'max', 'weight', 'kg', 'fitness'),

-- Habit tracking
('habit_logs_streak', 'Habit Streak', 'Consecutive days completing habits', 'habit_logs', 'custom', 'log_date', 'days', 'habits'),
('habit_logs_weekly', 'Habits Completed This Week', 'Habit completions in current week', 'habit_logs', 'count', 'id', 'completions', 'habits'),

-- Wellness tracking
('water_logs_daily', 'Daily Water Intake', 'Total water consumed today', 'water_logs', 'sum', 'amount_ml', 'ml', 'wellness'),
('sleep_logs_avg', 'Average Sleep', 'Average hours slept (last 7 days)', 'sleep_logs', 'avg', 'hours_slept', 'hours', 'wellness'),
('step_logs_daily', 'Daily Steps', 'Steps walked today', 'step_logs', 'latest', 'steps', 'steps', 'wellness'),
('wellness_energy_avg', 'Average Energy Level', 'Average energy (last 7 days)', 'daily_wellness_logs', 'avg', 'energy_level', '1-10', 'wellness'),

-- Program tracking
('program_weeks_completed', 'Program Weeks Completed', 'Weeks completed in current program', 'program_day_completions', 'count_distinct', 'week_index', 'weeks', 'fitness'),
('program_days_completed', 'Program Days Completed', 'Total program days completed', 'program_day_completions', 'count', 'id', 'days', 'fitness'),

-- Nutrition tracking
('nutrition_protein_daily', 'Daily Protein', 'Protein consumed today', 'nutrition_logs', 'latest', 'protein_g', 'g', 'nutrition'),
('nutrition_calories_daily', 'Daily Calories', 'Calories consumed today', 'nutrition_logs', 'latest', 'calories', 'kcal', 'nutrition')

ON CONFLICT (source_key) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Verify new tables created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('water_logs', 'sleep_logs', 'step_logs', 'daily_wellness_logs', 'supplement_logs', 'nutrition_logs', 'tracking_sources');

-- 2. Verify RPE column added to workout_set_logs:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workout_set_logs' AND column_name = 'rpe';

-- 3. Verify tracking sources seeded:
-- SELECT source_key, display_name, source_table, unit, category FROM tracking_sources ORDER BY category, display_name;

-- 4. Verify admin function is secure (SECURITY DEFINER with safe search_path):
-- SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname = 'is_admin';
-- Expected: prosecdef = true, proconfig should include search_path=public, pg_temp

-- 5. Verify admin function works:
-- SELECT public.is_admin();

-- 6. Verify tracking_sources aggregation constraint exists:
-- SELECT conname FROM pg_constraint WHERE conname = 'tracking_sources_agg_type_check';

-- 7. Verify coach RLS index exists:
-- SELECT indexname FROM pg_indexes WHERE indexname = 'idx_clients_coach_client_status';

-- 8. Verify sleep_logs constraints are NULL-safe:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.sleep_logs'::regclass AND contype = 'c';

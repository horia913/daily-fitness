-- =============================================================================
-- Migration: 20260307_supabase_security_advisor_fixes.sql
-- Purpose: Fix 8 Supabase Security Advisor issues (4 SECURITY DEFINER views + 4 tables with RLS disabled)
-- =============================================================================
--
-- PART 0: CURRENT VIEW DEFINITIONS (for your records)
-- -----------------------------------------------------------------------------
-- Before applying, you can capture the current view definitions in Supabase SQL:
--
--   SELECT pg_get_viewdef('public.monthly_body_metrics_summary'::regclass, true);
--   SELECT pg_get_viewdef('public.latest_body_metrics'::regclass, true);
--   SELECT pg_get_viewdef('public.habit_tracking_summary'::regclass, true);
--   SELECT pg_get_viewdef('public.current_champions'::regclass, true);
--
-- If any recreated view below fails or returns different columns, replace its
-- SELECT query with the output of the corresponding pg_get_viewdef above.
--
-- CODEBASE USAGE CHECK (done):
--   - None of the 4 views are queried directly from TypeScript (.from('...')).
--   - The 4 tables (muscle_groups, progression_guidelines, rp_volume_landmarks,
--     volume_guidelines) ARE used: WorkoutTemplateForm (muscle_groups),
--     coachGuidelinesService (all three guidelines tables). Enabling RLS with
--     "Anyone can read" keeps the app working; only admins/coaches can write.
-- =============================================================================

-- =============================================================================
-- PART 1: Fix 4 SECURITY DEFINER views → SECURITY INVOKER
-- =============================================================================
-- Views run with the calling user's permissions so RLS on underlying tables is respected.
-- PostgreSQL 15+: WITH (security_invoker = on). On PG < 15 omit that clause; new views
-- are SECURITY INVOKER by default when SECURITY DEFINER is not specified.

-- -----------------------------------------------------------------------------
-- 1. monthly_body_metrics_summary (definition from pg_get_viewdef)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.monthly_body_metrics_summary CASCADE;

CREATE VIEW public.monthly_body_metrics_summary
WITH (security_invoker = on)
AS
WITH monthly_data AS (
  SELECT
    body_metrics.client_id,
    date_trunc('month'::text, body_metrics.measured_date::timestamp with time zone) AS month,
    body_metrics.measured_date,
    body_metrics.weight_kg,
    body_metrics.waist_circumference,
    body_metrics.body_fat_percentage,
    body_metrics.muscle_mass_kg,
    body_metrics.visceral_fat_level,
    first_value(body_metrics.weight_kg) OVER (PARTITION BY body_metrics.client_id, (date_trunc('month'::text, body_metrics.measured_date::timestamp with time zone)) ORDER BY body_metrics.measured_date) AS first_weight_kg,
    last_value(body_metrics.weight_kg) OVER (PARTITION BY body_metrics.client_id, (date_trunc('month'::text, body_metrics.measured_date::timestamp with time zone)) ORDER BY body_metrics.measured_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_weight_kg,
    first_value(body_metrics.waist_circumference) OVER (PARTITION BY body_metrics.client_id, (date_trunc('month'::text, body_metrics.measured_date::timestamp with time zone)) ORDER BY body_metrics.measured_date) AS first_waist_cm,
    last_value(body_metrics.waist_circumference) OVER (PARTITION BY body_metrics.client_id, (date_trunc('month'::text, body_metrics.measured_date::timestamp with time zone)) ORDER BY body_metrics.measured_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_waist_cm,
    min(body_metrics.measured_date) OVER (PARTITION BY body_metrics.client_id, (date_trunc('month'::text, body_metrics.measured_date::timestamp with time zone))) AS first_measurement,
    max(body_metrics.measured_date) OVER (PARTITION BY body_metrics.client_id, (date_trunc('month'::text, body_metrics.measured_date::timestamp with time zone))) AS last_measurement
  FROM public.body_metrics
)
SELECT DISTINCT
  client_id,
  month,
  count(*) OVER (PARTITION BY client_id, month) AS measurement_count,
  avg(weight_kg) OVER (PARTITION BY client_id, month) AS avg_weight_kg,
  avg(waist_circumference) OVER (PARTITION BY client_id, month) AS avg_waist_cm,
  avg(body_fat_percentage) OVER (PARTITION BY client_id, month) AS avg_body_fat_pct,
  avg(muscle_mass_kg) OVER (PARTITION BY client_id, month) AS avg_muscle_mass_kg,
  avg(visceral_fat_level) OVER (PARTITION BY client_id, month) AS avg_visceral_fat,
  first_measurement,
  last_measurement,
  last_weight_kg - first_weight_kg AS weight_change_kg,
  last_waist_cm - first_waist_cm AS waist_change_cm
FROM monthly_data
ORDER BY month DESC, client_id;

-- -----------------------------------------------------------------------------
-- 2. latest_body_metrics (definition from pg_get_viewdef)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.latest_body_metrics CASCADE;

CREATE VIEW public.latest_body_metrics
WITH (security_invoker = on)
AS
SELECT DISTINCT ON (client_id)
  id,
  client_id,
  coach_id,
  measured_date,
  weight_kg,
  waist_circumference,
  body_fat_percentage,
  muscle_mass_kg,
  visceral_fat_level,
  left_arm_circumference,
  right_arm_circumference,
  torso_circumference,
  hips_circumference,
  left_thigh_circumference,
  right_thigh_circumference,
  left_calf_circumference,
  right_calf_circumference,
  measurement_method,
  notes,
  created_at,
  updated_at
FROM public.body_metrics
ORDER BY client_id, measured_date DESC, created_at DESC;

-- -----------------------------------------------------------------------------
-- 3. habit_tracking_summary (definition from pg_get_viewdef)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.habit_tracking_summary CASCADE;

CREATE VIEW public.habit_tracking_summary
WITH (security_invoker = on)
AS
SELECT
  ha.id AS assignment_id,
  ha.client_id,
  h.name AS habit_name,
  h.description AS habit_description,
  h.frequency_type,
  h.target_days,
  ha.start_date,
  ha.end_date,
  ha.is_active AS assignment_active,
  count(hl.id) AS total_completions,
  CASE
    WHEN h.frequency_type::text = 'daily'::text THEN (CURRENT_DATE - ha.start_date + 1)::numeric
    WHEN h.frequency_type::text = 'weekly'::text THEN ceil((CURRENT_DATE - ha.start_date)::numeric / 7.0)
    ELSE NULL::numeric
  END AS expected_completions,
  CASE
    WHEN h.frequency_type::text = 'daily'::text THEN round(count(hl.id)::numeric / (CURRENT_DATE - ha.start_date + 1)::numeric * 100::numeric, 2)
    WHEN h.frequency_type::text = 'weekly'::text THEN round(count(hl.id)::numeric / ceil((CURRENT_DATE - ha.start_date)::numeric / 7.0) * 100::numeric, 2)
    ELSE NULL::numeric
  END AS completion_percentage
FROM public.habit_assignments ha
JOIN public.habits h ON h.id = ha.habit_id
LEFT JOIN public.habit_logs hl ON hl.assignment_id = ha.id
WHERE ha.is_active = true AND h.is_active = true
GROUP BY ha.id, ha.client_id, h.name, h.description, h.frequency_type, h.target_days, ha.start_date, ha.end_date, ha.is_active;

-- -----------------------------------------------------------------------------
-- 4. current_champions (definition from pg_get_viewdef)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.current_champions CASCADE;

CREATE VIEW public.current_champions
WITH (security_invoker = on)
AS
SELECT
  lr.category,
  lr.sex_filter,
  p.id AS client_id,
  (p.first_name || ' '::text) || p.last_name AS name,
  p.sex,
  p.bodyweight,
  lr.score,
  lr.title,
  lr.calculated_at
FROM public.leaderboard_rankings lr
JOIN public.profiles p ON p.id = lr.client_id
WHERE lr.rank = 1
ORDER BY lr.category, lr.sex_filter;

-- =============================================================================
-- PART 2: Enable RLS on 4 reference tables + add policies
-- =============================================================================
-- Reference/lookup tables: readable by everyone, writable only by admins/coaches.

-- -----------------------------------------------------------------------------
-- muscle_groups
-- -----------------------------------------------------------------------------
ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read muscle_groups"
  ON public.muscle_groups
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and coaches can manage muscle_groups"
  ON public.muscle_groups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = ANY (ARRAY['admin'::text, 'coach'::text])
    )
  );

-- -----------------------------------------------------------------------------
-- progression_guidelines
-- -----------------------------------------------------------------------------
ALTER TABLE public.progression_guidelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read progression_guidelines"
  ON public.progression_guidelines
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and coaches can manage progression_guidelines"
  ON public.progression_guidelines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = ANY (ARRAY['admin'::text, 'coach'::text])
    )
  );

-- -----------------------------------------------------------------------------
-- rp_volume_landmarks
-- -----------------------------------------------------------------------------
ALTER TABLE public.rp_volume_landmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rp_volume_landmarks"
  ON public.rp_volume_landmarks
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and coaches can manage rp_volume_landmarks"
  ON public.rp_volume_landmarks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = ANY (ARRAY['admin'::text, 'coach'::text])
    )
  );

-- -----------------------------------------------------------------------------
-- volume_guidelines
-- -----------------------------------------------------------------------------
ALTER TABLE public.volume_guidelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read volume_guidelines"
  ON public.volume_guidelines
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and coaches can manage volume_guidelines"
  ON public.volume_guidelines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = ANY (ARRAY['admin'::text, 'coach'::text])
    )
  );

-- =============================================================================
-- PART 3: Verification (run these after applying the migration)
-- =============================================================================
-- Run in Supabase SQL editor to confirm:
--
-- 1) View options (reloptions should show security_invoker=on for the 4 views):
--    SELECT c.relname, c.relkind, c.reloptions
--    FROM pg_catalog.pg_class c
--    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'public' AND c.relname IN (
--      'monthly_body_metrics_summary', 'latest_body_metrics', 'habit_tracking_summary', 'current_champions'
--    );
--
-- 2) Views exist:
--    SELECT viewname, viewowner FROM pg_views WHERE schemaname = 'public'
--      AND viewname IN ('monthly_body_metrics_summary', 'latest_body_metrics', 'habit_tracking_summary', 'current_champions');
--
-- 3) RLS enabled on all 4 tables:
--    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'
--      AND tablename IN ('muscle_groups', 'progression_guidelines', 'rp_volume_landmarks', 'volume_guidelines');
--
-- 4) Policies exist:
--    SELECT tablename, policyname, cmd FROM pg_policies
--      WHERE tablename IN ('muscle_groups', 'progression_guidelines', 'rp_volume_landmarks', 'volume_guidelines')
--      ORDER BY tablename, policyname;

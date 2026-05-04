BEGIN;

-- ============================================================================
-- Phase 3c (Part 1): habit_templates + habits.template_id / habits.target,
-- wipe Phase 3b habits data, drop legacy habit columns, goals category pivot.
-- Part 2 seeds habit_templates (separate migration).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) habit_templates (platform-curated library)
-- ----------------------------------------------------------------------------
CREATE TABLE public.habit_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL
    CHECK (category IN (
      'hydration',
      'nutrition',
      'movement',
      'sleep_recovery',
      'mindfulness',
      'lifestyle',
      'checkin'
    )),
  source_type text NOT NULL
    CHECK (source_type IN (
      'water_log',
      'nutrition_field',
      'meal_completion_count',
      'workout_logged',
      'wellness_field',
      'wellness_check',
      'body_metric_count',
      'manual'
    )),
  source_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_target jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_configurable_keys text[] NOT NULL DEFAULT '{}'::text[],
  icon text,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habit_templates_category_sort
  ON public.habit_templates (category, sort_order)
  WHERE is_active = true;

ALTER TABLE public.habit_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active templates" ON public.habit_templates;

CREATE POLICY "Authenticated users can view active templates"
  ON public.habit_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

GRANT SELECT ON public.habit_templates TO authenticated;
GRANT SELECT ON public.habit_templates TO service_role;

COMMENT ON TABLE public.habit_templates IS
  'Platform-curated habit library; habits rows link via habits.template_id.';

-- ----------------------------------------------------------------------------
-- 2) Link habits to templates + per-habit target JSON (before NOT NULL)
-- ----------------------------------------------------------------------------
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.habit_templates (id);

ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS target jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Allow inserts without legacy name (display comes from habit_templates in app).
ALTER TABLE public.habits
  ALTER COLUMN name DROP NOT NULL;

-- ----------------------------------------------------------------------------
-- 3) Wipe Phase 3b client habit data
-- ----------------------------------------------------------------------------
DELETE FROM public.habit_logs;
DELETE FROM public.habits;

-- ----------------------------------------------------------------------------
-- 4) Require template for every habit going forward
-- ----------------------------------------------------------------------------
ALTER TABLE public.habits
  ALTER COLUMN template_id SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 5) Drop columns now owned by habit_templates (IF EXISTS for mixed envs)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_habits_category_id;

ALTER TABLE public.habits
  DROP CONSTRAINT IF EXISTS habits_category_id_fkey;

ALTER TABLE public.habits DROP COLUMN IF EXISTS is_public;
ALTER TABLE public.habits DROP COLUMN IF EXISTS target_value;
ALTER TABLE public.habits DROP COLUMN IF EXISTS category_id;
ALTER TABLE public.habits DROP COLUMN IF EXISTS unit;
ALTER TABLE public.habits DROP COLUMN IF EXISTS icon;
ALTER TABLE public.habits DROP COLUMN IF EXISTS color;
ALTER TABLE public.habits DROP COLUMN IF EXISTS frequency_type;
ALTER TABLE public.habits DROP COLUMN IF EXISTS target_days;

CREATE INDEX IF NOT EXISTS idx_habits_client_id_active
  ON public.habits (client_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_habits_template_id
  ON public.habits (template_id);

-- ----------------------------------------------------------------------------
-- 6) Goals: remove behavioral pillar (map to outcome, tighten CHECK)
-- ----------------------------------------------------------------------------
UPDATE public.goals
SET category = 'outcome'
WHERE category = 'behavioral';

ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_category_check;

ALTER TABLE public.goals
  ADD CONSTRAINT goals_category_check
  CHECK (category IN ('body_composition', 'performance', 'outcome', 'nutrition'));

-- ----------------------------------------------------------------------------
-- 7) Post-migration notices
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_templates integer;
  v_habits integer;
  v_habit_logs integer;
BEGIN
  SELECT COUNT(*) INTO v_templates FROM public.habit_templates WHERE is_active = true;
  SELECT COUNT(*) INTO v_habits FROM public.habits;
  SELECT COUNT(*) INTO v_habit_logs FROM public.habit_logs;
  RAISE NOTICE '[habits_phase3c] active habit_templates: % (seed Part 2 expects 23)', v_templates;
  RAISE NOTICE '[habits_phase3c] habits row count: %', v_habits;
  RAISE NOTICE '[habits_phase3c] habit_logs row count: %', v_habit_logs;
END $$;

COMMIT;

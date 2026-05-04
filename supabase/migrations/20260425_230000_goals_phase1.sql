BEGIN;

-- ============================================================================
-- Phase 1: Goals architecture rework (schema + source-linking engine foundation)
-- 1) Create goal_source_links table
-- 2) Backfill goals.category to 5 new pillars
-- 3) Add/replace goals category constraint
-- 4) RLS + policies for goal_source_links
-- 5) Heuristic backfill of goal_source_links for existing goals
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Create goal_source_links
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goal_source_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  direction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT goal_source_links_source_type_check
    CHECK (source_type IN ('body_metric','personal_record','workout_count','wellness_field','meal_plan','manual')),
  CONSTRAINT goal_source_links_direction_check
    CHECK (direction IN ('increase','decrease','maintain')),
  CONSTRAINT goal_source_links_goal_id_key UNIQUE (goal_id)
);

COMMENT ON TABLE public.goal_source_links IS
  'Maps each goal to one canonical data source for progress sync, replacing title-based heuristics.';

-- updated_at trigger pattern used across app tables
DROP TRIGGER IF EXISTS update_goal_source_links_updated_at ON public.goal_source_links;
CREATE TRIGGER update_goal_source_links_updated_at
  BEFORE UPDATE ON public.goal_source_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Rework goals.category to 5 pillars
-- ----------------------------------------------------------------------------
-- Drop old category constraint and replace with new values
ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_category_check;

-- Single UPDATE statement (required): backfill existing rows
UPDATE public.goals
SET category = CASE category
  WHEN 'weight_loss' THEN 'body_composition'
  WHEN 'muscle_gain' THEN 'body_composition'
  WHEN 'body_composition' THEN 'body_composition'
  WHEN 'strength' THEN 'performance'
  WHEN 'endurance' THEN 'performance'
  WHEN 'mobility' THEN 'performance'
  WHEN 'performance' THEN 'performance'
  WHEN 'other' THEN 'behavioral'
  ELSE 'behavioral'
END;

ALTER TABLE public.goals
  ADD CONSTRAINT goals_category_check
  CHECK (category IN ('body_composition', 'performance', 'behavioral', 'outcome', 'nutrition'));

-- ----------------------------------------------------------------------------
-- RLS for goal_source_links (mirror goals policy structure)
-- ----------------------------------------------------------------------------
ALTER TABLE public.goal_source_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view their own goal source links" ON public.goal_source_links;
CREATE POLICY "Clients can view their own goal source links"
ON public.goal_source_links
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.goals g
    WHERE g.id = goal_source_links.goal_id
      AND g.client_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Clients can insert their own goal source links" ON public.goal_source_links;
CREATE POLICY "Clients can insert their own goal source links"
ON public.goal_source_links
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.goals g
    WHERE g.id = goal_source_links.goal_id
      AND g.client_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Clients can update their own goal source links" ON public.goal_source_links;
CREATE POLICY "Clients can update their own goal source links"
ON public.goal_source_links
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.goals g
    WHERE g.id = goal_source_links.goal_id
      AND g.client_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.goals g
    WHERE g.id = goal_source_links.goal_id
      AND g.client_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Clients can delete their own goal source links" ON public.goal_source_links;
CREATE POLICY "Clients can delete their own goal source links"
ON public.goal_source_links
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.goals g
    WHERE g.id = goal_source_links.goal_id
      AND g.client_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Coaches can view client goal source links" ON public.goal_source_links;
CREATE POLICY "Coaches can view client goal source links"
ON public.goal_source_links
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.goals g
    WHERE g.id = goal_source_links.goal_id
      AND g.coach_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- Heuristic backfill for existing goals -> goal_source_links
-- ----------------------------------------------------------------------------
WITH exercise_candidates AS (
  SELECT
    e.id,
    e.name,
    CASE
      WHEN lower(e.name) LIKE '%bench%' THEN 'bench'
      WHEN lower(e.name) LIKE '%squat%' THEN 'squat'
      WHEN lower(e.name) LIKE '%deadlift%' THEN 'deadlift'
      WHEN lower(e.name) LIKE '%hip thrust%' THEN 'hip_thrust'
      ELSE NULL
    END AS pattern_key
  FROM public.exercises e
  WHERE
    lower(e.name) LIKE '%bench%'
    OR lower(e.name) LIKE '%squat%'
    OR lower(e.name) LIKE '%deadlift%'
    OR lower(e.name) LIKE '%hip thrust%'
),
best_exercise_match AS (
  SELECT DISTINCT ON (pattern_key)
    pattern_key,
    id AS exercise_id
  FROM exercise_candidates
  WHERE pattern_key IS NOT NULL
  ORDER BY pattern_key, length(name) ASC, name ASC
),
goal_heuristics AS (
  SELECT
    g.id AS goal_id,
    g.title,
    g.target_value,
    g.target_unit,
    CASE
      WHEN lower(g.title) LIKE '%body fat%' THEN 'body_metric'
      WHEN lower(g.title) LIKE '%fat loss%' THEN 'body_metric'
      WHEN lower(g.title) LIKE '%weight loss%' THEN 'body_metric'
      WHEN lower(g.title) LIKE '%lose weight%' THEN 'body_metric'
      WHEN lower(g.title) LIKE '%lose fat%' THEN 'body_metric'
      WHEN lower(g.title) LIKE '%muscle gain%' THEN 'body_metric'
      WHEN lower(g.title) LIKE '%body recomp%' THEN 'body_metric'
      WHEN lower(g.title) LIKE '%recomposition%' THEN 'body_metric'
      WHEN lower(g.title) LIKE '%weight%' AND coalesce(g.target_unit, '') IN ('kg', 'lbs', '%') THEN 'body_metric'

      WHEN lower(g.title) LIKE '%workout consistency%' THEN 'workout_count'
      WHEN lower(g.title) LIKE '%workouts per week%' THEN 'workout_count'
      WHEN lower(g.title) LIKE '%workout%' AND lower(coalesce(g.target_unit, '')) LIKE '%week%' THEN 'workout_count'

      WHEN lower(g.title) LIKE '%bench%' THEN 'personal_record_bench'
      WHEN lower(g.title) LIKE '%squat%' THEN 'personal_record_squat'
      WHEN lower(g.title) LIKE '%deadlift%' THEN 'personal_record_deadlift'
      WHEN lower(g.title) LIKE '%hip thrust%' THEN 'personal_record_hip_thrust'
      WHEN lower(g.title) LIKE '%personal record%' THEN 'manual'
      WHEN lower(g.title) LIKE '%pr%' AND lower(g.title) NOT LIKE '%protein%' THEN 'manual'
      ELSE 'manual'
    END AS inferred_source,
    CASE
      WHEN lower(g.title) LIKE '%maintain%' OR lower(g.title) LIKE '%maintenance%' THEN 'maintain'
      WHEN lower(g.title) LIKE '%lose%' THEN 'decrease'
      WHEN lower(g.title) LIKE '%loss%' THEN 'decrease'
      WHEN lower(g.title) LIKE '%decrease%' THEN 'decrease'
      WHEN lower(g.title) LIKE '%reduce%' THEN 'decrease'
      WHEN lower(g.title) LIKE '%body fat%' THEN 'decrease'
      ELSE 'increase'
    END AS inferred_direction
  FROM public.goals g
),
resolved_links AS (
  SELECT
    gh.goal_id,
    CASE
      WHEN gh.inferred_source LIKE 'personal_record_%' AND bem.exercise_id IS NULL THEN 'manual'
      WHEN gh.inferred_source = 'personal_record_bench' THEN 'personal_record'
      WHEN gh.inferred_source = 'personal_record_squat' THEN 'personal_record'
      WHEN gh.inferred_source = 'personal_record_deadlift' THEN 'personal_record'
      WHEN gh.inferred_source = 'personal_record_hip_thrust' THEN 'personal_record'
      WHEN gh.inferred_source = 'body_metric' THEN 'body_metric'
      WHEN gh.inferred_source = 'workout_count' THEN 'workout_count'
      ELSE 'manual'
    END AS source_type,
    CASE
      WHEN gh.inferred_source = 'body_metric'
        AND (
          lower(gh.title) LIKE '%body fat%'
          OR lower(gh.title) LIKE '%fat loss%'
          OR lower(gh.title) LIKE '%lose fat%'
        )
        THEN jsonb_build_object('metric_field', 'body_fat_percentage')
      WHEN gh.inferred_source = 'body_metric'
        AND lower(gh.title) LIKE '%muscle gain%'
        THEN jsonb_build_object('metric_field', 'muscle_mass_kg')
      WHEN gh.inferred_source = 'body_metric'
        THEN jsonb_build_object('metric_field', 'weight_kg')

      WHEN gh.inferred_source = 'personal_record_bench' AND bem.exercise_id IS NOT NULL
        THEN jsonb_build_object('exercise_id', bem.exercise_id)
      WHEN gh.inferred_source = 'personal_record_squat' AND bem.exercise_id IS NOT NULL
        THEN jsonb_build_object('exercise_id', bem.exercise_id)
      WHEN gh.inferred_source = 'personal_record_deadlift' AND bem.exercise_id IS NOT NULL
        THEN jsonb_build_object('exercise_id', bem.exercise_id)
      WHEN gh.inferred_source = 'personal_record_hip_thrust' AND bem.exercise_id IS NOT NULL
        THEN jsonb_build_object('exercise_id', bem.exercise_id)

      WHEN gh.inferred_source = 'workout_count'
        THEN jsonb_build_object('window', 'weekly', 'target', gh.target_value)

      ELSE '{}'::jsonb
    END AS source_config,
    gh.inferred_direction AS direction
  FROM goal_heuristics gh
  LEFT JOIN best_exercise_match bem
    ON bem.pattern_key = CASE
      WHEN gh.inferred_source = 'personal_record_bench' THEN 'bench'
      WHEN gh.inferred_source = 'personal_record_squat' THEN 'squat'
      WHEN gh.inferred_source = 'personal_record_deadlift' THEN 'deadlift'
      WHEN gh.inferred_source = 'personal_record_hip_thrust' THEN 'hip_thrust'
      ELSE NULL
    END
)
INSERT INTO public.goal_source_links (goal_id, source_type, source_config, direction)
SELECT
  rl.goal_id,
  rl.source_type,
  rl.source_config,
  rl.direction
FROM resolved_links rl
ON CONFLICT (goal_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Migration notices for review
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  src_row RECORD;
  v_total integer;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.goal_source_links;
  RAISE NOTICE '[goals_phase1] goal_source_links total rows: %', v_total;

  FOR src_row IN
    SELECT source_type, COUNT(*)::int AS cnt
    FROM public.goal_source_links
    GROUP BY source_type
    ORDER BY source_type
  LOOP
    RAISE NOTICE '[goals_phase1] source_type=% count=%', src_row.source_type, src_row.cnt;
  END LOOP;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT g.id, g.title, g.category, gsl.source_type, gsl.source_config, gsl.direction
    FROM public.goals g
    LEFT JOIN public.goal_source_links gsl ON gsl.goal_id = g.id
    ORDER BY g.created_at
  LOOP
    RAISE NOTICE 'goal: id=% title=% category=% source=% config=% direction=%',
      r.id, r.title, r.category, r.source_type, r.source_config, r.direction;
  END LOOP;
END $$;

COMMIT;

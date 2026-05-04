BEGIN;

-- ============================================================================
-- Phase 1 corrections: fix PR source_config (exercise_id), demote unknown PRs,
-- fix "Lose 5kg" body_metric, demote "Learn proper squat form" to manual.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Resolve exercise_name_match → exercise_id for valid PR rows
--    (bench, squat, deadlift, hip_thrust — same CTE pattern as phase1)
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
)
UPDATE public.goal_source_links gsl
SET
  source_config = jsonb_build_object('exercise_id', bem.exercise_id),
  updated_at = now()
FROM best_exercise_match bem
WHERE gsl.source_type = 'personal_record'
  AND gsl.source_config ? 'exercise_name_match'
  AND gsl.source_config->>'exercise_name_match' IN ('bench', 'squat', 'deadlift', 'hip_thrust')
  AND bem.pattern_key = gsl.source_config->>'exercise_name_match';

-- ----------------------------------------------------------------------------
-- 2) Demote unresolvable PR rows to manual (exercise_name_match = unknown)
-- ----------------------------------------------------------------------------
UPDATE public.goal_source_links
SET
  source_type = 'manual',
  source_config = '{}'::jsonb,
  updated_at = now()
WHERE source_type = 'personal_record'
  AND source_config ? 'exercise_name_match'
  AND source_config->>'exercise_name_match' = 'unknown';

-- ----------------------------------------------------------------------------
-- 3) Fix "Lose 5kg" — exact title match → body_metric weight_kg, decrease
-- ----------------------------------------------------------------------------
UPDATE public.goal_source_links gsl
SET
  source_type = 'body_metric',
  source_config = '{"metric_field": "weight_kg"}'::jsonb,
  direction = 'decrease',
  updated_at = now()
FROM public.goals g
WHERE gsl.goal_id = g.id
  AND g.title = 'Lose 5kg';

-- ----------------------------------------------------------------------------
-- 4) Demote "Learn proper squat form" — exact title match → manual
-- ----------------------------------------------------------------------------
UPDATE public.goal_source_links gsl
SET
  source_type = 'manual',
  source_config = '{}'::jsonb,
  updated_at = now()
FROM public.goals g
WHERE gsl.goal_id = g.id
  AND g.title = 'Learn proper squat form';

COMMIT;

-- ----------------------------------------------------------------------------
-- Run after migration for manual review (do not execute inside a transaction):
-- ----------------------------------------------------------------------------
-- SELECT g.id, g.title, g.category, gsl.source_type, gsl.source_config, gsl.direction
-- FROM public.goals g
-- LEFT JOIN public.goal_source_links gsl ON gsl.goal_id = g.id
-- ORDER BY g.created_at;

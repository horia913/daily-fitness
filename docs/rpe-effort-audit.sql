-- =============================================================================
-- RPE / Effort audit — read-only inspection queries for Supabase SQL editor
-- Based on code audit: workout_set_logs (set logs); prescribed RPE lives in column `rir` on
-- workout_set_entry_exercises (current app + your production DB). Some exports still mention
-- workout_block_exercises — that table may not exist; use Q2 to confirm table names.
-- Also: program_progression_rules / client copies, workout_logs.perceived_effort, workout_set_details (legacy).
-- Default schema: public.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Q1) Full column list for the primary set log table: workout_set_logs
--     What to look for: column name, data_type, is_nullable, column_default;
--     confirm `rpe` exists on the live DB even if an older CSV export omitted it.
-- -----------------------------------------------------------------------------
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_set_logs'
ORDER BY ordinal_position;

-- -----------------------------------------------------------------------------
-- Q2) All public tables whose columns match effort / RPE / intensity / difficulty
--     (column name ILIKE). What to look for: which tables actually carry these fields.
-- -----------------------------------------------------------------------------
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name ILIKE '%rpe%'
    OR column_name ILIKE '%effort%'
    OR column_name ILIKE '%intensity%'
    OR column_name ILIKE '%difficulty%'
    OR column_name ILIKE '%perceived%'
    OR column_name = 'rir'
  )
ORDER BY table_name, ordinal_position;

-- -----------------------------------------------------------------------------
-- Q3) Sample 10 rows from workout_set_logs with id, timestamps, and RPE / effort-related columns
--     What to look for: whether rpe is populated; HR columns used as intensity for some blocks.
-- -----------------------------------------------------------------------------
SELECT
  id,
  workout_log_id,
  client_id,
  set_entry_id,
  set_type,
  set_number,
  exercise_id,
  weight,
  reps,
  rpe,
  completed_at,
  created_at,
  hr_zone,
  hr_percentage,
  hr_average_percentage
FROM public.workout_set_logs
ORDER BY completed_at DESC NULLS LAST, created_at DESC NULLS LAST
LIMIT 10;

-- -----------------------------------------------------------------------------
-- Q4) Distinct values for each main effort / RPE / prescription-intensity column
--     What to look for: which values are actually stored; NULL bucket size.
-- -----------------------------------------------------------------------------

-- Per-set logged RPE (primary)
SELECT
  'workout_set_logs.rpe'::text AS column_ref,
  rpe::text AS value,
  COUNT(*) AS row_count
FROM public.workout_set_logs
GROUP BY rpe
ORDER BY rpe NULLS LAST;

-- Session-level perceived effort (workout_logs)
SELECT
  'workout_logs.perceived_effort'::text AS column_ref,
  perceived_effort::text AS value,
  COUNT(*) AS row_count
FROM public.workout_logs
GROUP BY perceived_effort
ORDER BY perceived_effort NULLS LAST;

-- Prescribed RPE stored in column `rir` (set-entry exercises — matches workoutSetEntryService)
SELECT
  'workout_set_entry_exercises.rir'::text AS column_ref,
  rir::text AS value,
  COUNT(*) AS row_count
FROM public.workout_set_entry_exercises
GROUP BY rir
ORDER BY rir NULLS LAST;

-- -----------------------------------------------------------------------------
-- Q5) Sample 10 prescription rows: workout_set_entry_exercises (`rir` = prescribed RPE in app)
--     What to look for: whether coaches populate `rir`; compare to client_logged rpe in Q3/Q4.
-- -----------------------------------------------------------------------------
SELECT
  id,
  set_entry_id,
  exercise_id,
  exercise_order,
  exercise_letter,
  sets,
  reps,
  weight_kg,
  rir,
  created_at
FROM public.workout_set_entry_exercises
ORDER BY created_at DESC NULLS LAST
LIMIT 10;

-- Optional: client-specific copies (same `rir` semantics in codebase)
-- SELECT id, client_id, set_entry_id, exercise_id, rir, created_at
-- FROM public.client_workout_block_exercises
-- ORDER BY created_at DESC NULLS LAST
-- LIMIT 10;

-- -----------------------------------------------------------------------------
-- Q6) "Orphan" signal: share of NULLs for effort-related columns on set logs
--     What to look for: rpe_null_ratio near 1.0 suggests column unused or optional-only;
--     compare to row volume.
-- -----------------------------------------------------------------------------
SELECT
  COUNT(*)::bigint AS total_rows,
  COUNT(*) FILTER (WHERE rpe IS NULL)::bigint AS rpe_nulls,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE rpe IS NULL)::numeric / NULLIF(COUNT(*)::numeric, 0),
    2
  ) AS rpe_null_pct
FROM public.workout_set_logs;

-- Session-level: workout_logs perceived_effort (not per-set)
SELECT
  COUNT(*)::bigint AS total_rows,
  COUNT(*) FILTER (WHERE perceived_effort IS NULL)::bigint AS perceived_effort_nulls,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE perceived_effort IS NULL)::numeric / NULLIF(COUNT(*)::numeric, 0),
    2
  ) AS perceived_effort_null_pct
FROM public.workout_logs;

-- Prescription: rir on workout_set_entry_exercises
SELECT
  COUNT(*)::bigint AS total_rows,
  COUNT(*) FILTER (WHERE rir IS NULL)::bigint AS rir_nulls,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE rir IS NULL)::numeric / NULLIF(COUNT(*)::numeric, 0),
    2
  ) AS rir_null_pct
FROM public.workout_set_entry_exercises;

-- Legacy set detail table (if still populated)
SELECT
  COUNT(*)::bigint AS total_rows,
  COUNT(*) FILTER (WHERE rpe IS NULL)::bigint AS rpe_nulls,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE rpe IS NULL)::numeric / NULLIF(COUNT(*)::numeric, 0),
    2
  ) AS rpe_null_pct
FROM public.workout_set_details;

-- -----------------------------------------------------------------------------
-- Q7) RPC functions whose definition references workout_set_logs (read paths in migrations)
--     What to look for: proname list matches deployed DB; prosrc shows SELECT from workout_set_logs.
--     Note: set writes go through API/PostgREST in this app, not these RPCs.
-- -----------------------------------------------------------------------------
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_args,
  l.lanname AS language
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND l.lanname = 'plpgsql'
  AND p.prokind = 'f'
  AND pg_get_functiondef(p.oid) ILIKE '%workout_set_logs%'
ORDER BY p.proname;

-- ============================================================================
-- Fix duplicate / missing workout_set_entry_exercises on template save
-- ============================================================================
-- 1) Remove duplicate rows (same set_entry_id + exercise_id), keep oldest id.
-- 2) UNIQUE (set_entry_id, exercise_id) — NOT (set_entry_id, exercise_order):
--    supersets and giant sets intentionally use the same exercise_order for
--    multiple rows; duplicate bug was same exercise_id twice.
-- 3) RPC delete_workout_set_entry_children — single transaction, all child
--    tables cleared before save re-inserts (SECURITY INVOKER = RLS applies).
-- ============================================================================

-- Step 1: dedupe (keep one row per set_entry_id + exercise_id)
DELETE FROM public.workout_set_entry_exercises w
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY set_entry_id, exercise_id
        ORDER BY created_at NULLS LAST, id
      ) AS rn
    FROM public.workout_set_entry_exercises
  ) x
  WHERE x.rn > 1
) d
WHERE w.id = d.id;

-- Step 2: unique index
DROP INDEX IF EXISTS public.idx_wse_unique_set_entry_exercise;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wse_unique_set_entry_exercise
  ON public.workout_set_entry_exercises (set_entry_id, exercise_id);

COMMENT ON INDEX public.idx_wse_unique_set_entry_exercise IS
'Prevents duplicate exercise rows per set entry (template save bug). '
'Supersedes UNIQUE(set_entry_id, exercise_order) which would break supersets/giant sets.';

-- Step 3: atomic delete of all rows tied to a set entry (one transaction)
DROP FUNCTION IF EXISTS public.delete_workout_set_entry_children(uuid);

CREATE OR REPLACE FUNCTION public.delete_workout_set_entry_children(p_set_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.workout_set_entry_exercises WHERE set_entry_id = p_set_entry_id;
  DELETE FROM public.workout_drop_sets WHERE set_entry_id = p_set_entry_id;
  DELETE FROM public.workout_cluster_sets WHERE set_entry_id = p_set_entry_id;
  DELETE FROM public.workout_rest_pause_sets WHERE set_entry_id = p_set_entry_id;
  DELETE FROM public.workout_time_protocols WHERE set_entry_id = p_set_entry_id;
  DELETE FROM public.workout_hr_sets WHERE set_entry_id = p_set_entry_id;
END;
$$;

COMMENT ON FUNCTION public.delete_workout_set_entry_children(uuid) IS
'Deletes all child rows for one workout_set_entries row in one transaction. '
'Used before template save re-inserts; RLS enforced (SECURITY INVOKER).';

GRANT EXECUTE ON FUNCTION public.delete_workout_set_entry_children(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_workout_set_entry_children(uuid) TO service_role;

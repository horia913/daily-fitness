-- ============================================================================
-- Remove hr_sets set type from app-facing DB surface
-- ============================================================================

-- 1) Safety cleanup: remove any orphan/legacy hr_sets set entries first.
DELETE FROM public.workout_set_entries
WHERE set_type = 'hr_sets';

-- 2) Drop legacy special table (unused).
DROP TABLE IF EXISTS public.workout_hr_sets CASCADE;

-- 3) Rebuild set_type CHECK without hr_sets.
ALTER TABLE public.workout_set_entries
  DROP CONSTRAINT IF EXISTS workout_set_entries_set_type_check;

ALTER TABLE public.workout_set_entries
  ADD CONSTRAINT workout_set_entries_set_type_check
  CHECK (
    set_type IN (
      'straight_set',
      'superset',
      'giant_set',
      'drop_set',
      'cluster_set',
      'rest_pause',
      'pre_exhaustion',
      'amrap',
      'emom',
      'tabata',
      'for_time',
      'speed_work',
      'endurance'
    )
  );

-- 4) Update get_workout_blocks RPC: remove hr_sets payload section.
CREATE OR REPLACE FUNCTION public.get_workout_blocks(p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM workout_templates wt WHERE wt.id = p_template_id AND wt.coach_id = v_caller
  ) AND NOT EXISTS (
    SELECT 1 FROM workout_assignments wa
    WHERE wa.workout_template_id = p_template_id AND wa.client_id = v_caller
  ) AND NOT EXISTS (
    SELECT 1
    FROM program_assignments pa
    JOIN program_schedule ps ON ps.program_id = pa.program_id
    WHERE pa.client_id = v_caller
      AND pa.status = 'active'
      AND ps.template_id = p_template_id
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN (
    SELECT COALESCE(
      jsonb_agg(block_json ORDER BY (block_json->>'set_order')::int NULLS LAST),
      '[]'::jsonb
    )
    FROM (
      SELECT
        to_jsonb(wse) ||
        jsonb_build_object(
          'exercises', COALESCE(
            (SELECT jsonb_agg(
               row_to_json(wsee)::jsonb || jsonb_build_object('exercise', row_to_json(e))
               ORDER BY wsee.exercise_order
             )
             FROM workout_set_entry_exercises wsee
             JOIN exercises e ON e.id = wsee.exercise_id
             WHERE wsee.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'drop_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(ds) ORDER BY ds.exercise_order, ds.drop_order)
             FROM workout_drop_sets ds
             WHERE ds.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'cluster_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(cs) ORDER BY cs.exercise_order)
             FROM workout_cluster_sets cs
             WHERE cs.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'rest_pause_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(rp) ORDER BY rp.exercise_order)
             FROM workout_rest_pause_sets rp
             WHERE rp.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'time_protocols', COALESCE(
            (SELECT jsonb_agg(row_to_json(tp) ORDER BY tp.exercise_order)
             FROM workout_time_protocols tp
             WHERE tp.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'speed_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(s) ORDER BY s.exercise_order, s.id)
             FROM workout_speed_sets s
             WHERE s.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'endurance_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(en) ORDER BY en.exercise_order, en.id)
             FROM workout_endurance_sets en
             WHERE en.set_entry_id = wse.id),
            '[]'::jsonb
          )
        ) AS block_json
      FROM workout_set_entries wse
      WHERE wse.template_id = p_template_id
      ORDER BY wse.set_order
    ) sub
  );
END;
$$;

COMMENT ON FUNCTION public.get_workout_blocks(uuid) IS
'Returns workout set entries for a template with nested exercises and child tables. Restricted to template coach, client with assignment, or client with template on active program schedule.';

GRANT EXECUTE ON FUNCTION public.get_workout_blocks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_blocks(uuid) TO service_role;

-- 5) Update delete_workout_set_entry_children RPC: remove workout_hr_sets delete.
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
  DELETE FROM public.workout_speed_sets WHERE set_entry_id = p_set_entry_id;
  DELETE FROM public.workout_endurance_sets WHERE set_entry_id = p_set_entry_id;
END;
$$;

COMMENT ON FUNCTION public.delete_workout_set_entry_children(uuid) IS
'Deletes all child rows for one workout_set_entries row (hr_sets removed).';

GRANT EXECUTE ON FUNCTION public.delete_workout_set_entry_children(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_workout_set_entry_children(uuid) TO service_role;

-- 6) Enum note:
-- If workout_set_type exists as an enum elsewhere, we intentionally do NOT recreate it
-- in this migration. The active enforcement is workout_set_entries_set_type_check.

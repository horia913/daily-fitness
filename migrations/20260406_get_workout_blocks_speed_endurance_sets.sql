-- Add workout_speed_sets + workout_endurance_sets to get_workout_blocks JSON (client start + RPC mapper).
-- Extend delete_workout_set_entry_children so template smart-update clears these tables.

CREATE OR REPLACE FUNCTION public.get_workout_blocks(p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
          'hr_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(hr) ORDER BY hr.exercise_order, hr.id)
             FROM workout_hr_sets hr
             WHERE hr.set_entry_id = wse.id),
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
'Returns workout set entries for a template with nested exercises, drop_sets, cluster_sets, rest_pause_sets, time_protocols, hr_sets, speed_sets, endurance_sets.';

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
  DELETE FROM public.workout_speed_sets WHERE set_entry_id = p_set_entry_id;
  DELETE FROM public.workout_endurance_sets WHERE set_entry_id = p_set_entry_id;
END;
$$;

COMMENT ON FUNCTION public.delete_workout_set_entry_children(uuid) IS
'Deletes all child rows for one workout_set_entries row (incl. speed_sets, endurance_sets).';

GRANT EXECUTE ON FUNCTION public.delete_workout_set_entry_children(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_workout_set_entry_children(uuid) TO service_role;

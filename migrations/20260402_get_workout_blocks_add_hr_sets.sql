-- ============================================================================
-- Extend get_workout_blocks: include workout_hr_sets for hr_sets set entries
-- ============================================================================
-- App mapper (workoutBlocksRpcMapper) expects hr_sets on each block JSON so
-- exercise_id can be resolved for names. Column must match DB (set_entry_id
-- after Phase-1 rename; if your DB still has block_id, change the WHERE clause).
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_workout_blocks(uuid);

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
            (SELECT jsonb_agg(row_to_json(ds) ORDER BY ds.drop_order)
             FROM workout_drop_sets ds
             WHERE ds.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'cluster_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(cs))
             FROM workout_cluster_sets cs
             WHERE cs.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'rest_pause_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(rps))
             FROM workout_rest_pause_sets rps
             WHERE rps.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'pyramid_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(ps) ORDER BY ps.pyramid_order)
             FROM workout_pyramid_sets ps
             WHERE ps.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'ladder_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(ls) ORDER BY ls.ladder_order)
             FROM workout_ladder_sets ls
             WHERE ls.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'time_protocols', COALESCE(
            (SELECT jsonb_agg(row_to_json(tp))
             FROM workout_time_protocols tp
             WHERE tp.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'hr_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(hr) ORDER BY hr.exercise_order, hr.id)
             FROM workout_hr_sets hr
             WHERE hr.set_entry_id = wse.id),
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
'Returns workout set entries for a template with nested exercises, drop_sets, cluster_sets, rest_pause_sets, pyramid_sets, ladder_sets, time_protocols, hr_sets.';

GRANT EXECUTE ON FUNCTION public.get_workout_blocks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_blocks(uuid) TO service_role;

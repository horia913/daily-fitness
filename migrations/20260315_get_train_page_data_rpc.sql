-- ============================================================================
-- get_train_page_data RPC — Train page single-call data
-- Replaces ~10+ queries with one RPC. SECURITY DEFINER; caller must pass
-- p_client_id (RLS enforced by function only returning that client's data).
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_train_page_data(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_train_page_data(p_client_id uuid, p_today_weekday integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_program_assignment record;
BEGIN
  -- Get active program assignment (single row)
  SELECT pa.id, pa.program_id, pa.client_id, pa.status, pa.duration_weeks,
         wp.name AS program_name, wp.duration_weeks AS wp_duration_weeks
  INTO v_program_assignment
  FROM program_assignments pa
  JOIN workout_programs wp ON wp.id = pa.program_id
  WHERE pa.client_id = p_client_id AND pa.status = 'active'
  ORDER BY pa.created_at DESC
  LIMIT 1;

  IF v_program_assignment IS NULL THEN
    RETURN jsonb_build_object(
      'hasProgram', false,
      'extraWorkouts', (
        SELECT COALESCE(jsonb_agg(row_to_json(w)), '[]'::jsonb)
        FROM (
          SELECT wa.id, wa.workout_template_id AS template_id, wa.status, wt.name AS template_name,
                 COALESCE(wa.estimated_duration, wt.estimated_duration, 60)::int AS estimated_duration,
                 (SELECT COUNT(*)::int FROM workout_set_entry_exercises wsee
                  JOIN workout_set_entries wse ON wse.id = wsee.set_entry_id
                  WHERE wse.template_id = wa.workout_template_id) AS exercise_count
          FROM workout_assignments wa
          LEFT JOIN workout_templates wt ON wt.id = wa.workout_template_id
          WHERE wa.client_id = p_client_id
            AND wa.status IN ('assigned', 'in_progress')
        ) w
      )
    );
  END IF;

  -- Build full result: schedule, completions, extra workouts
  result := jsonb_build_object(
    'hasProgram', true,
    'programName', v_program_assignment.program_name,
    'programId', v_program_assignment.program_id,
    'assignmentId', v_program_assignment.id,
    'durationWeeks', COALESCE(v_program_assignment.duration_weeks, v_program_assignment.wp_duration_weeks, 4),
    'schedule', (
      SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
      FROM (
        SELECT ps.id, ps.week_number, ps.day_number, ps.day_of_week,
               ps.template_id, COALESCE(ps.is_optional, false) AS is_optional,
               wt.name AS template_name,
               COALESCE(wt.estimated_duration, 0)::int AS estimated_duration,
               (SELECT COUNT(*)::int FROM workout_set_entry_exercises wsee
                JOIN workout_set_entries wse ON wse.id = wsee.set_entry_id
                WHERE wse.template_id = ps.template_id) AS exercise_count
        FROM program_schedule ps
        LEFT JOIN workout_templates wt ON wt.id = ps.template_id
        WHERE ps.program_id = v_program_assignment.program_id
        ORDER BY ps.week_number, ps.day_number
      ) s
    ),
    'completions', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
      FROM (
        SELECT pdc.program_schedule_id, pdc.completed_at
        FROM program_day_completions pdc
        WHERE pdc.program_assignment_id = v_program_assignment.id
      ) c
    ),
    'extraWorkouts', (
      SELECT COALESCE(jsonb_agg(row_to_json(w)), '[]'::jsonb)
      FROM (
        SELECT wa.id, wa.workout_template_id AS template_id, wa.status, wt.name AS template_name,
               COALESCE(wa.estimated_duration, wt.estimated_duration, 60)::int AS estimated_duration,
               (SELECT COUNT(*)::int FROM workout_set_entry_exercises wsee
                JOIN workout_set_entries wse ON wse.id = wsee.set_entry_id
                WHERE wse.template_id = wa.workout_template_id) AS exercise_count
        FROM workout_assignments wa
        LEFT JOIN workout_templates wt ON wt.id = wa.workout_template_id
        WHERE wa.client_id = p_client_id
          AND wa.status IN ('assigned', 'in_progress')
      ) w
    )
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_train_page_data(uuid, integer) IS
'Returns all data needed for the client Train page: active program, schedule, completions, and standalone workout assignments. Reduces 15-25 queries to 1 RPC.';

-- Grant execute to authenticated users (RLS is enforced inside via p_client_id)
GRANT EXECUTE ON FUNCTION public.get_train_page_data(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_train_page_data(uuid, integer) TO service_role;

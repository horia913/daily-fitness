-- ============================================================================
-- get_gym_console_status RPC — Batch status for gym console (replaces N× getProgramState)
-- Returns per-client: active_session, program_name, next_workout, status, current_week, current_day.
-- SECURITY DEFINER; callable with p_client_ids belonging to p_coach_id.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_gym_console_status(uuid, uuid[]);

CREATE OR REPLACE FUNCTION public.get_gym_console_status(
  p_coach_id uuid,
  p_client_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(client_status)), '[]'::jsonb)
    FROM (
      SELECT
        cl.client_id,
        p.first_name,
        p.last_name,
        -- Active session (in_progress) with template name and sets_logged
        (SELECT row_to_json(s) FROM (
          SELECT
            ws.id AS session_id,
            ws.status,
            ws.started_at,
            ws.assignment_id AS workout_assignment_id,
            wl.id AS workout_log_id,
            wt.name AS template_name,
            (SELECT COUNT(*)::int FROM workout_set_logs wsl WHERE wsl.workout_log_id = wl.id) AS sets_logged,
            (SELECT MAX(wsl.completed_at) FROM workout_set_logs wsl WHERE wsl.workout_log_id = wl.id) AS last_set_logged_at
          FROM workout_sessions ws
          LEFT JOIN workout_logs wl ON wl.workout_session_id = ws.id AND wl.completed_at IS NULL
          LEFT JOIN workout_assignments wa ON wa.id = ws.assignment_id
          LEFT JOIN workout_templates wt ON wt.id = wa.workout_template_id
          WHERE ws.client_id = cl.client_id AND ws.status = 'in_progress'
          ORDER BY ws.started_at DESC
          LIMIT 1
        ) s) AS active_session,
        -- Active program name and assignment id
        (SELECT wp.name FROM program_assignments pa
         JOIN workout_programs wp ON wp.id = pa.program_id
         WHERE pa.client_id = cl.client_id AND pa.status = 'active'
         ORDER BY pa.updated_at DESC NULLS LAST, pa.created_at DESC
         LIMIT 1) AS program_name,
        (SELECT pa.id FROM program_assignments pa
         WHERE pa.client_id = cl.client_id AND pa.status = 'active'
         ORDER BY pa.updated_at DESC NULLS LAST, pa.created_at DESC
         LIMIT 1) AS program_assignment_id,
        -- Next slot: first schedule slot not completed (for next workout)
        (SELECT row_to_json(nw) FROM (
          SELECT
            ps.id AS schedule_id,
            ps.template_id,
            wt.name AS template_name,
            pa.id AS program_assignment_id,
            (SELECT COUNT(*)::int FROM workout_blocks wb WHERE wb.template_id = ps.template_id) AS block_count,
            (SELECT COUNT(*)::int FROM workout_blocks wb
             JOIN workout_block_exercises wbe ON wbe.block_id = wb.id
             WHERE wb.template_id = ps.template_id) AS exercise_count
          FROM program_assignments pa
          JOIN program_schedule ps ON ps.program_id = pa.program_id
          LEFT JOIN program_day_completions pdc ON pdc.program_assignment_id = pa.id AND pdc.program_schedule_id = ps.id
          LEFT JOIN program_progress pp ON pp.program_assignment_id = pa.id
          LEFT JOIN workout_templates wt ON wt.id = ps.template_id
          WHERE pa.client_id = cl.client_id AND pa.status = 'active'
            AND pdc.id IS NULL
          ORDER BY ps.week_number ASC, ps.day_of_week ASC
          LIMIT 1
        ) nw) AS next_workout,
        -- Current week/day from program_progress or next slot
        (SELECT pp.current_week_number FROM program_progress pp
         JOIN program_assignments pa ON pa.id = pp.program_assignment_id
         WHERE pa.client_id = cl.client_id AND pa.status = 'active'
         ORDER BY pa.updated_at DESC NULLS LAST LIMIT 1) AS current_week,
        (SELECT pp.current_day_number FROM program_progress pp
         JOIN program_assignments pa ON pa.id = pp.program_assignment_id
         WHERE pa.client_id = cl.client_id AND pa.status = 'active'
         ORDER BY pa.updated_at DESC NULLS LAST LIMIT 1) AS current_day,
        -- Derived status: no_program | program_completed | no_session | idle_session | active_session
        CASE
          WHEN NOT EXISTS (SELECT 1 FROM program_assignments pa WHERE pa.client_id = cl.client_id AND pa.status = 'active')
            THEN 'no_program'::text
          WHEN EXISTS (
            SELECT 1 FROM program_assignments pa
            JOIN program_schedule ps ON ps.program_id = pa.program_id
            LEFT JOIN program_day_completions pdc ON pdc.program_assignment_id = pa.id AND pdc.program_schedule_id = ps.id
            WHERE pa.client_id = cl.client_id AND pa.status = 'active' AND pdc.id IS NULL
          ) = false
            THEN 'program_completed'::text
          WHEN EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.client_id = cl.client_id AND ws.status = 'in_progress') = false
            THEN 'no_session'::text
          ELSE 'active_session'::text
        END AS status
      FROM clients cl
      JOIN profiles p ON p.id = cl.client_id
      WHERE cl.coach_id = p_coach_id
        AND cl.client_id = ANY(p_client_ids)
        AND cl.status = 'active'
    ) client_status
  );
END;
$$;

COMMENT ON FUNCTION public.get_gym_console_status(uuid, uuid[]) IS
'Returns gym console status for multiple clients in one call: active_session, program_name, next_workout, status, current_week, current_day. Replaces per-client getProgramState calls.';

GRANT EXECUTE ON FUNCTION public.get_gym_console_status(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_gym_console_status(uuid, uuid[]) TO service_role;

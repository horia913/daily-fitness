-- ============================================================================
-- get_workout_session_data(p_client_id, p_assignment_id)
-- Returns session, activeLog, setLogs, blockCompletions, dayCompletions, coachId in one call.
-- Replaces 20+ sequential queries on workout start page.
-- SECURITY DEFINER; restricts to p_client_id.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_workout_session_data(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_workout_session_data(
  p_client_id uuid,
  p_assignment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_prog_assignment_id uuid;
BEGIN
  -- Resolve active incomplete log for this assignment
  SELECT id, program_assignment_id
  INTO v_log_id, v_prog_assignment_id
  FROM workout_logs
  WHERE client_id = p_client_id
    AND workout_assignment_id = p_assignment_id
    AND completed_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    -- Active in-progress session for this assignment
    'session', (
      SELECT row_to_json(s)
      FROM (
        SELECT id, status, started_at, assignment_id, program_assignment_id, program_schedule_id
        FROM workout_sessions
        WHERE client_id = p_client_id
          AND assignment_id = p_assignment_id
          AND status = 'in_progress'
        ORDER BY started_at DESC
        LIMIT 1
      ) s
    ),
    -- Incomplete workout log for this assignment
    'activeLog', (
      SELECT row_to_json(l)
      FROM (
        SELECT id, started_at, workout_session_id, program_assignment_id, program_schedule_id
        FROM workout_logs
        WHERE client_id = p_client_id
          AND workout_assignment_id = p_assignment_id
          AND completed_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1
      ) l
    ),
    -- Set logs for resume (empty array if no active log)
    'setLogs', (
      SELECT COALESCE(
        jsonb_agg(row_to_json(sl) ORDER BY (sl).completed_at NULLS LAST),
        '[]'::jsonb
      )
      FROM (
        SELECT id, set_entry_id, exercise_id, set_number, round_number, set_type, weight, reps,
               completed_at, amrap_total_reps, amrap_duration_seconds, emom_minute_number,
               emom_total_reps_this_min, fortime_total_reps, fortime_time_taken_sec,
               preexhaust_isolation_exercise_id, preexhaust_isolation_weight, preexhaust_isolation_reps,
               preexhaust_compound_exercise_id, preexhaust_compound_weight, preexhaust_compound_reps
        FROM workout_set_logs
        WHERE workout_log_id = v_log_id
          AND client_id = p_client_id
      ) sl
    ),
    -- Block (set entry) completions for resume
    'blockCompletions', (
      SELECT COALESCE(jsonb_agg(row_to_json(bc)), '[]'::jsonb)
      FROM (
        SELECT workout_log_id, workout_set_entry_id, completed_at, completion_type
        FROM workout_set_entry_completions
        WHERE workout_log_id = v_log_id
      ) bc
    ),
    -- Program day completions (schedule IDs already completed) for this program
    'dayCompletions', (
      SELECT COALESCE(jsonb_agg(program_schedule_id), '[]'::jsonb)
      FROM program_day_completions
      WHERE program_assignment_id = v_prog_assignment_id
    ),
    -- Coach ID for this client
    'coachId', (
      SELECT coach_id FROM clients WHERE client_id = p_client_id LIMIT 1
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_workout_session_data(uuid, uuid) IS
'Returns all session/log/progress data for the workout start page: session, activeLog, setLogs, blockCompletions, dayCompletions, coachId. One RPC replaces 20+ queries.';

GRANT EXECUTE ON FUNCTION public.get_workout_session_data(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_session_data(uuid, uuid) TO service_role;

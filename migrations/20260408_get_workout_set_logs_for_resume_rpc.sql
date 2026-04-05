-- ============================================================================
-- Resume path for workout_set_logs without PostgREST OpenAPI column validation.
-- PostgREST can return 400 for valid columns until its schema cache matches
-- the DB; this RPC reads from the live catalog (same column list as the app).
--
-- Also extends get_workout_session_data setLogs to include rpe + speed/endurance
-- so prefetched resume matches the fallback.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_workout_set_logs_for_resume(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_workout_set_logs_for_resume(
  p_client_id uuid,
  p_workout_log_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM workout_logs wl
    WHERE wl.id = p_workout_log_id
      AND wl.client_id = p_client_id
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN (
    SELECT COALESCE(
      jsonb_agg(row_to_json(sl) ORDER BY sl.completed_at NULLS LAST),
      '[]'::jsonb
    )
    FROM (
      SELECT
        id,
        set_entry_id,
        exercise_id,
        set_number,
        round_number,
        set_type,
        weight,
        reps,
        rpe,
        completed_at,
        amrap_total_reps,
        amrap_duration_seconds,
        emom_minute_number,
        emom_total_reps_this_min,
        fortime_total_reps,
        fortime_time_taken_sec,
        preexhaust_isolation_exercise_id,
        preexhaust_isolation_weight,
        preexhaust_isolation_reps,
        preexhaust_compound_exercise_id,
        preexhaust_compound_weight,
        preexhaust_compound_reps,
        actual_time_seconds,
        actual_distance_meters,
        actual_hr_avg,
        actual_speed_kmh
      FROM workout_set_logs
      WHERE workout_log_id = p_workout_log_id
        AND client_id = p_client_id
    ) sl
  );
END;
$$;

COMMENT ON FUNCTION public.get_workout_set_logs_for_resume(uuid, uuid) IS
  'Returns workout_set_logs rows for resume (ordered by completed_at). Uses live DB catalog; bypasses PostgREST select validation.';

GRANT EXECUTE ON FUNCTION public.get_workout_set_logs_for_resume(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_set_logs_for_resume(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- get_workout_session_data: include rpe + speed/endurance on setLogs
-- ---------------------------------------------------------------------------

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
  SELECT id, program_assignment_id
  INTO v_log_id, v_prog_assignment_id
  FROM workout_logs
  WHERE client_id = p_client_id
    AND workout_assignment_id = p_assignment_id
    AND completed_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
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
    'setLogs', (
      SELECT COALESCE(
        jsonb_agg(row_to_json(sl) ORDER BY (sl).completed_at NULLS LAST),
        '[]'::jsonb
      )
      FROM (
        SELECT
          id,
          set_entry_id,
          exercise_id,
          set_number,
          round_number,
          set_type,
          weight,
          reps,
          rpe,
          completed_at,
          amrap_total_reps,
          amrap_duration_seconds,
          emom_minute_number,
          emom_total_reps_this_min,
          fortime_total_reps,
          fortime_time_taken_sec,
          preexhaust_isolation_exercise_id,
          preexhaust_isolation_weight,
          preexhaust_isolation_reps,
          preexhaust_compound_exercise_id,
          preexhaust_compound_weight,
          preexhaust_compound_reps,
          actual_time_seconds,
          actual_distance_meters,
          actual_hr_avg,
          actual_speed_kmh
        FROM workout_set_logs
        WHERE workout_log_id = v_log_id
          AND client_id = p_client_id
      ) sl
    ),
    'blockCompletions', (
      SELECT COALESCE(jsonb_agg(row_to_json(bc)), '[]'::jsonb)
      FROM (
        SELECT workout_log_id, workout_set_entry_id, completed_at, completion_type
        FROM workout_set_entry_completions
        WHERE workout_log_id = v_log_id
      ) bc
    ),
    'dayCompletions', (
      SELECT COALESCE(jsonb_agg(program_schedule_id), '[]'::jsonb)
      FROM program_day_completions
      WHERE program_assignment_id = v_prog_assignment_id
    ),
    'coachId', (
      SELECT coach_id FROM clients WHERE client_id = p_client_id LIMIT 1
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_workout_session_data(uuid, uuid) IS
  'Returns session/log/progress for workout start: session, activeLog, setLogs (incl. rpe + speed/endurance), blockCompletions, dayCompletions, coachId.';

GRANT EXECUTE ON FUNCTION public.get_workout_session_data(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_session_data(uuid, uuid) TO service_role;

-- Instance program workouts use program_instance_set_entries.id as block ids at
-- train time. workout_set_entry_completions.workout_set_entry_id FKs to
-- workout_set_entries only, so block-complete upserts fail for instance blocks.

ALTER TABLE public.workout_set_entry_completions
  ADD COLUMN IF NOT EXISTS program_instance_set_entry_id uuid NULL
    REFERENCES public.program_instance_set_entries(id) ON DELETE CASCADE;

ALTER TABLE public.workout_set_entry_completions
  ALTER COLUMN workout_set_entry_id DROP NOT NULL;

ALTER TABLE public.workout_set_entry_completions
  DROP CONSTRAINT IF EXISTS workout_set_entry_completions_entry_id_check;

ALTER TABLE public.workout_set_entry_completions
  ADD CONSTRAINT workout_set_entry_completions_entry_id_check
  CHECK (
    workout_set_entry_id IS NOT NULL
    OR program_instance_set_entry_id IS NOT NULL
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_wsec_log_instance_set_entry
  ON public.workout_set_entry_completions (workout_log_id, program_instance_set_entry_id)
  WHERE program_instance_set_entry_id IS NOT NULL;

-- get_workout_session_data: include instance key in blockCompletions bundle
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
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller IS DISTINCT FROM p_client_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

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
        SELECT id, status, started_at, assignment_id, program_assignment_id, program_day_assignment_id
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
        SELECT id, started_at, workout_session_id, program_assignment_id, program_day_assignment_id
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
          id, set_entry_id, exercise_id, set_number, round_number, set_type,
          weight, reps, rpe, completed_at,
          amrap_total_reps, amrap_duration_seconds,
          emom_minute_number, emom_total_reps_this_min,
          fortime_total_reps, fortime_time_taken_sec,
          preexhaust_isolation_exercise_id, preexhaust_isolation_weight, preexhaust_isolation_reps,
          preexhaust_compound_exercise_id, preexhaust_compound_weight, preexhaust_compound_reps,
          actual_time_seconds, actual_distance_meters, actual_hr_avg, actual_speed_kmh
        FROM workout_set_logs
        WHERE workout_log_id = v_log_id
          AND client_id = p_client_id
      ) sl
    ),
    'blockCompletions', (
      SELECT COALESCE(jsonb_agg(row_to_json(bc)), '[]'::jsonb)
      FROM (
        SELECT
          workout_log_id,
          workout_set_entry_id,
          program_instance_set_entry_id,
          completed_at,
          completion_type
        FROM workout_set_entry_completions
        WHERE workout_log_id = v_log_id
      ) bc
    ),
    'dayCompletions', (
      SELECT COALESCE(jsonb_agg(program_day_assignment_id), '[]'::jsonb)
      FROM program_day_completions
      WHERE program_assignment_id = v_prog_assignment_id
        AND program_day_assignment_id IS NOT NULL
    ),
    'coachId', (
      SELECT coach_id FROM clients WHERE client_id = p_client_id LIMIT 1
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_workout_session_data(uuid, uuid) IS
  'Workout start/resume bundle. blockCompletions includes program_instance_set_entry_id for instance workouts.';

GRANT EXECUTE ON FUNCTION public.get_workout_session_data(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_session_data(uuid, uuid) TO service_role;

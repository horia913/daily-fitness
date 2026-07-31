-- ============================================================================
-- discard_workout_session — atomic "erase an unfinished session as if it never
-- happened" (destructive half of the discard action; recompute is done in TS).
--
-- One transaction:
--   1. Re-validate ownership (auth.uid() = workout_logs.client_id) AND that the
--      session is unfinished (completed_at IS NULL). Defense-in-depth on top of
--      the API endpoint's validateApiAuth check.
--   2. Delete this session's personal_records rows by id. The FK
--      personal_records.workout_set_log_id -> workout_set_logs is ON DELETE SET
--      NULL, so a plain cascade would leave stale "current" PR rows behind — we
--      must remove them explicitly here.
--   3. Delete the workout_logs row. ON DELETE CASCADE then removes:
--        workout_set_logs, workout_exercise_logs, workout_set_entry_completions,
--        and (via the set-log cascade) workout_giant_set_exercise_logs.
--   4. Conditionally delete the workout_sessions row — only when the log carried
--      a workout_session_id AND no other UNFINISHED (completed_at IS NULL) log
--      still references that session. Leaving it would strand a phantom
--      status='in_progress' session pointing at a deleted log.
--
-- Returns the distinct affected exercise_id[] (across straight/superset/
-- preexhaust/giant variants) so the TS orchestrator can recompute metrics/PRs.
--
-- NOTE: relies on auth.uid(), so it MUST be called with the authenticated
-- client (not the service-role key, under which auth.uid() is NULL).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.discard_workout_session(p_workout_log_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_client_id uuid;
  v_completed_at timestamptz;
  v_session_id uuid;
  v_exercise_ids uuid[];
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Load + lock the target log (guards against a concurrent discard/complete).
  SELECT client_id, completed_at, workout_session_id
  INTO v_client_id, v_completed_at, v_session_id
  FROM workout_logs
  WHERE id = p_workout_log_id
  FOR UPDATE;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Workout log not found';
  END IF;

  IF v_client_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Workout already completed; cannot discard';
  END IF;

  -- Collect affected exercise ids from every set-type variant BEFORE deletion.
  SELECT ARRAY(
    SELECT DISTINCT eid
    FROM (
      SELECT exercise_id AS eid
        FROM workout_set_logs WHERE workout_log_id = p_workout_log_id
      UNION
      SELECT superset_exercise_a_id
        FROM workout_set_logs WHERE workout_log_id = p_workout_log_id
      UNION
      SELECT superset_exercise_b_id
        FROM workout_set_logs WHERE workout_log_id = p_workout_log_id
      UNION
      SELECT preexhaust_isolation_exercise_id
        FROM workout_set_logs WHERE workout_log_id = p_workout_log_id
      UNION
      SELECT preexhaust_compound_exercise_id
        FROM workout_set_logs WHERE workout_log_id = p_workout_log_id
      UNION
      SELECT (elem->>'exercise_id')::uuid
        FROM workout_set_logs wsl
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(wsl.giant_set_exercises) = 'array'
               THEN wsl.giant_set_exercises
               ELSE '[]'::jsonb END
        ) AS elem
        WHERE wsl.workout_log_id = p_workout_log_id
    ) s
    WHERE eid IS NOT NULL
  ) INTO v_exercise_ids;

  -- 1) PR rows earned by this session (FK is SET NULL → not removed by cascade).
  DELETE FROM personal_records
  WHERE client_id = v_client_id
    AND workout_set_log_id IN (
      SELECT id FROM workout_set_logs WHERE workout_log_id = p_workout_log_id
    );

  -- 2) The log itself → cascade removes set_logs / exercise_logs /
  --    set_entry_completions / giant_set children.
  DELETE FROM workout_logs WHERE id = p_workout_log_id;

  -- 3) The session row, only if nothing unfinished still points at it.
  IF v_session_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM workout_logs
      WHERE workout_session_id = v_session_id
        AND completed_at IS NULL
    ) THEN
      DELETE FROM workout_sessions
      WHERE id = v_session_id
        AND client_id = v_client_id;
    END IF;
  END IF;

  RETURN COALESCE(v_exercise_ids, ARRAY[]::uuid[]);
END;
$$;

COMMENT ON FUNCTION public.discard_workout_session(uuid) IS
'Atomically erases an unfinished workout session (PR rows by id, the workout_logs row via cascade, and the orphaned workout_sessions row). Restricted to the owning client (auth.uid() = client_id) and unfinished logs only. Returns affected exercise_id[] for TS-side recompute. Call with the authenticated client (auth.uid() must be set).';

GRANT EXECUTE ON FUNCTION public.discard_workout_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discard_workout_session(uuid) TO service_role;

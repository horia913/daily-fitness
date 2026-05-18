-- =============================================================================
-- TEST FIXTURE ONLY — Popescu (profiles.email = 'client@test.com')
-- Week: Mon 2026-05-11 .. Sun 2026-05-17 (client-local dates via profiles.timezone)
-- Do NOT run against production. Touches only client@test.com rows.
-- =============================================================================
BEGIN;

DO $$
DECLARE
  v_cid uuid;
  v_tz  text;
  v_coach uuid;
  v_mp_id uuid;
  v_meal_id uuid;
  v_mpa_id uuid;
  d date;
BEGIN
  SELECT id, COALESCE(NULLIF(timezone, ''), 'UTC')
  INTO v_cid, v_tz
  FROM profiles
  WHERE email = 'client@test.com';

  IF v_cid IS NULL THEN
    RAISE EXCEPTION 'Fixture aborted: no profile with email client@test.com';
  END IF;

  SELECT coach_id INTO v_coach
  FROM clients
  WHERE client_id = v_cid
  ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'Fixture aborted: no clients row for client@test.com (coach_id required for meal_plan_assignments)';
  END IF;

  -- Zero training: remove completions in the target week (interpreted in client TZ).
  DELETE FROM workout_logs wl
  WHERE wl.client_id = v_cid
    AND wl.completed_at IS NOT NULL
    AND (wl.completed_at AT TIME ZONE v_tz)::date BETWEEN DATE '2026-05-11' AND DATE '2026-05-17';

  -- Idempotent cleanup of prior fixture rows for this week / client.
  DELETE FROM meal_completions mc
  WHERE mc.client_id = v_cid AND mc.notes = '__AS_V2_FIXTURE__';

  DELETE FROM client_activities ca
  WHERE ca.client_id = v_cid
    AND ca.activity_date BETWEEN DATE '2026-05-11' AND DATE '2026-05-17'
    AND ca.notes = '__AS_V2_FIXTURE__';

  DELETE FROM daily_wellness_logs dwl
  WHERE dwl.client_id = v_cid
    AND dwl.log_date BETWEEN DATE '2026-05-11' AND DATE '2026-05-17';

  -- Perfect recovery: one wellness row per calendar day (Mon–Sun).
  FOR d IN
    SELECT generate_series(DATE '2026-05-11', DATE '2026-05-17', INTERVAL '1 day')::date
  LOOP
    INSERT INTO daily_wellness_logs (client_id, log_date, sleep_hours, steps)
    VALUES (v_cid, d, 8, 10000);
  END LOOP;

  -- Perfect nutrition: single active meal_plan_assignment + one meal + 7 completions (fixture-tagged).
  UPDATE meal_plan_assignments
  SET is_active = false, updated_at = now()
  WHERE client_id = v_cid;

  INSERT INTO meal_plans (coach_id, name, is_active)
  VALUES (v_coach, 'Athlete score v2 fixture (do not use in prod)', true)
  RETURNING id INTO v_mp_id;

  INSERT INTO meals (meal_plan_id, name, meal_type, order_index)
  VALUES (v_mp_id, 'Fixture breakfast', 'breakfast', 0)
  RETURNING id INTO v_meal_id;

  INSERT INTO meal_plan_assignments (
    coach_id, client_id, meal_plan_id, start_date, end_date, is_active, notes
  )
  VALUES (
    v_coach, v_cid, v_mp_id, DATE '2026-05-01', NULL, true,
    'Athlete score v2 fixture — safe to delete with meal_plan / meals'
  )
  RETURNING id INTO v_mpa_id;

  FOR d IN
    SELECT generate_series(DATE '2026-05-11', DATE '2026-05-17', INTERVAL '1 day')::date
  LOOP
    INSERT INTO meal_completions (meal_id, client_id, completed_at, notes)
    VALUES (
      v_meal_id,
      v_cid,
      (to_char(d, 'YYYY-MM-DD') || ' 12:00:00')::timestamp AT TIME ZONE v_tz,
      '__AS_V2_FIXTURE__'
    );
  END LOOP;

  -- Perfect extras: 3 × 30 min vigorous within the week (fixture-tagged).
  INSERT INTO client_activities (
    client_id, activity_type, duration_minutes, intensity, activity_date, notes
  )
  VALUES
    (v_cid, 'running', 30, 'vigorous', DATE '2026-05-11', '__AS_V2_FIXTURE__'),
    (v_cid, 'running', 30, 'vigorous', DATE '2026-05-13', '__AS_V2_FIXTURE__'),
    (v_cid, 'running', 30, 'vigorous', DATE '2026-05-15', '__AS_V2_FIXTURE__');

  RAISE NOTICE 'Popescu athlete score v2 fixture applied for client_id=% meal_plan_assignment=%', v_cid, v_mpa_id;
END $$;

COMMIT;

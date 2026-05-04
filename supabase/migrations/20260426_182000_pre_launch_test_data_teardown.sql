-- Pre-launch teardown for test personas + Popescu fixture data.
-- IMPORTANT:
--   1) This migration intentionally does NOT delete from auth.users.
--      Remove auth identities manually in Supabase dashboard/admin tools.
--   2) Coach Horica (b6014e58-f696-4606-bc63-d7707a21d5f1) is NOT a target.

BEGIN;

CREATE TEMP TABLE _teardown_targets (
  client_id uuid PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO _teardown_targets (client_id) VALUES
  ('7aa53694-5bcd-4319-aa09-eda750c19f80'), -- Alice Persona
  ('893bded4-1a0f-444a-9d23-9f857929748f'), -- Bob Persona
  ('f1e6b33b-2cc1-4d35-bbfe-67c49800c104'), -- Carol Persona
  ('6afabab9-9965-4d4e-b047-b4e0a392685b'), -- Dan Persona
  ('562fe8d3-9089-424e-8bf7-60b477c7d847'), -- Eve Persona
  ('af9325e2-76e7-4df6-8ed7-9effd9c764d8'); -- Client Popescu

-- Optional include only if explicitly approved:
-- ('0048aff5-61df-4460-9292-11d89b478b99'); -- Roxana Micu

-- Cache assignment ids for dependent deletes
CREATE TEMP TABLE _target_program_assignments (
  id uuid PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO _target_program_assignments (id)
SELECT pa.id
FROM public.program_assignments pa
JOIN _teardown_targets t ON t.client_id = pa.client_id;

-- =========================
-- Deepest dependent deletes
-- =========================

DO $$
BEGIN
  IF to_regclass('public.habit_logs') IS NOT NULL THEN
    DELETE FROM public.habit_logs
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.habits') IS NOT NULL THEN
    DELETE FROM public.habits
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.goal_source_links') IS NOT NULL THEN
    DELETE FROM public.goal_source_links
    WHERE goal_id IN (
      SELECT g.id
      FROM public.goals g
      WHERE g.client_id IN (SELECT client_id FROM _teardown_targets)
    );
  END IF;

  IF to_regclass('public.goals') IS NOT NULL THEN
    DELETE FROM public.goals
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.meal_completions') IS NOT NULL THEN
    DELETE FROM public.meal_completions
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.nutrition_logs') IS NOT NULL THEN
    DELETE FROM public.nutrition_logs
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.food_log_entries') IS NOT NULL THEN
    DELETE FROM public.food_log_entries
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.client_daily_plan_selection') IS NOT NULL THEN
    DELETE FROM public.client_daily_plan_selection
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.meal_plan_assignments') IS NOT NULL THEN
    DELETE FROM public.meal_plan_assignments
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.daily_wellness_logs') IS NOT NULL THEN
    DELETE FROM public.daily_wellness_logs
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.body_metrics') IS NOT NULL THEN
    DELETE FROM public.body_metrics
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.progress_photos') IS NOT NULL THEN
    DELETE FROM public.progress_photos
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.client_measurements') IS NOT NULL THEN
    DELETE FROM public.client_measurements
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.personal_records') IS NOT NULL THEN
    DELETE FROM public.personal_records
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.workout_logs') IS NOT NULL THEN
    DELETE FROM public.workout_logs
    WHERE client_id IN (SELECT client_id FROM _teardown_targets)
       OR program_assignment_id IN (SELECT id FROM _target_program_assignments);
  END IF;

  IF to_regclass('public.program_day_completions') IS NOT NULL THEN
    DELETE FROM public.program_day_completions
    WHERE client_id IN (SELECT client_id FROM _teardown_targets)
       OR program_assignment_id IN (SELECT id FROM _target_program_assignments);
  END IF;

  IF to_regclass('public.program_day_assignments') IS NOT NULL THEN
    DELETE FROM public.program_day_assignments
    WHERE program_assignment_id IN (SELECT id FROM _target_program_assignments);
  END IF;

  IF to_regclass('public.client_program_progression_rules') IS NOT NULL THEN
    DELETE FROM public.client_program_progression_rules
    WHERE client_id IN (SELECT client_id FROM _teardown_targets)
       OR program_assignment_id IN (SELECT id FROM _target_program_assignments);
  END IF;

  IF to_regclass('public.program_progress') IS NOT NULL THEN
    DELETE FROM public.program_progress
    WHERE client_id IN (SELECT client_id FROM _teardown_targets)
       OR program_assignment_id IN (SELECT id FROM _target_program_assignments);
  END IF;

  IF to_regclass('public.program_workout_completions') IS NOT NULL THEN
    DELETE FROM public.program_workout_completions
    WHERE client_id IN (SELECT client_id FROM _teardown_targets)
       OR program_assignment_id IN (SELECT id FROM _target_program_assignments);
  END IF;

  IF to_regclass('public.program_assignments') IS NOT NULL THEN
    DELETE FROM public.program_assignments
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.clients') IS NOT NULL THEN
    DELETE FROM public.clients
    WHERE client_id IN (SELECT client_id FROM _teardown_targets);
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    DELETE FROM public.profiles
    WHERE id IN (SELECT client_id FROM _teardown_targets);
  END IF;
END $$;

-- Post-delete report per target persona/profile id.
DO $$
DECLARE
  r record;
  v_profile int;
  v_clients int;
  v_prog_assign int;
  v_client_rules int;
  v_workout_logs int;
  v_personal_records int;
BEGIN
  FOR r IN SELECT client_id FROM _teardown_targets ORDER BY client_id LOOP
    SELECT COUNT(*) INTO v_profile FROM public.profiles WHERE id = r.client_id;
    SELECT COUNT(*) INTO v_clients FROM public.clients WHERE client_id = r.client_id;
    SELECT COUNT(*) INTO v_prog_assign FROM public.program_assignments WHERE client_id = r.client_id;
    SELECT COUNT(*) INTO v_client_rules FROM public.client_program_progression_rules WHERE client_id = r.client_id;
    SELECT COUNT(*) INTO v_workout_logs FROM public.workout_logs WHERE client_id = r.client_id;
    SELECT COUNT(*) INTO v_personal_records FROM public.personal_records WHERE client_id = r.client_id;

    RAISE NOTICE
      'teardown check % -> profiles:% clients:% program_assignments:% client_program_progression_rules:% workout_logs:% personal_records:%',
      r.client_id, v_profile, v_clients, v_prog_assign, v_client_rules, v_workout_logs, v_personal_records;
  END LOOP;
END $$;

COMMIT;

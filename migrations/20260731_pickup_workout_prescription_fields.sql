-- =============================================================================
-- get_coach_pickup_workout: add load_percentage, rir, tempo, notes per exercise
-- Additive only — same signature/logic as 20260704 live definition.
-- Source tables (both paths):
--   program_instance_set_entry_exercises
--   workout_set_entry_exercises
-- Both have: load_percentage, rir, tempo, notes (verified live 2026-07-31).
-- =============================================================================
--
-- DRY-RUN IN SUPABASE SQL EDITOR:
--   1) Paste everything below starting at BEGIN;
--   2) Run; then verify with the SELECT at the end (still inside the txn);
--   3) COMMIT;  -- or ROLLBACK; if anything looks wrong
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_coach_pickup_workout(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id uuid;
  v_result jsonb;
  v_coach_profile record;
  v_client_profile record;
  v_client_relation record;
  v_active_assignment record;
  v_slot record;
  v_pda record;
  v_resolver record;
  v_blocks jsonb;
  v_week_label text;
  v_day_label text;
  v_days_in_current_week int;
  v_schedule_count int;
BEGIN
  v_coach_id := auth.uid();
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, role, first_name, last_name
  INTO v_coach_profile
  FROM profiles
  WHERE id = v_coach_id;

  IF v_coach_profile.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_coach_profile.role NOT IN ('coach', 'admin') THEN
    RAISE EXCEPTION 'Not authorized - must be coach or admin';
  END IF;

  SELECT client_id, status
  INTO v_client_relation
  FROM clients
  WHERE coach_id = v_coach_id
    AND client_id = p_client_id;

  IF v_client_relation.client_id IS NULL THEN
    RAISE EXCEPTION 'Client not found or does not belong to this coach';
  END IF;

  SELECT id, first_name, last_name, avatar_url
  INTO v_client_profile
  FROM profiles
  WHERE id = p_client_id;

  SELECT
    pa.id,
    pa.program_id,
    pa.client_id,
    pa.coach_id,
    pa.name,
    pa.status,
    pa.total_days,
    pa.created_at
  INTO v_active_assignment
  FROM program_assignments pa
  WHERE pa.client_id = p_client_id
    AND pa.status = 'active'
  ORDER BY pa.created_at DESC
  LIMIT 1;

  IF v_active_assignment.id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'no_program',
      'message', 'Client has no active program assignment',
      'client_id', p_client_id,
      'client_name', TRIM(COALESCE(v_client_profile.first_name, '') || ' ' || COALESCE(v_client_profile.last_name, ''))
    );
  END IF;

  SELECT COUNT(*)::int
  INTO v_schedule_count
  FROM program_day_assignments pda
  WHERE pda.program_assignment_id = v_active_assignment.id;

  IF v_schedule_count = 0 THEN
    RETURN jsonb_build_object(
      'error', 'Program schedule not configured',
      'message', 'No training days found in program_day_assignments for this assignment.',
      'program_assignment_id', v_active_assignment.id
    );
  END IF;

  SELECT
    s.schedule_id,
    s.template_id,
    s.week_number,
    s.program_day,
    s.template_name,
    s.template_description,
    s.estimated_duration
  INTO v_slot
  FROM get_next_incomplete_program_slot(v_active_assignment.id) s
  LIMIT 1;

  SELECT w.current_week, w.total_weeks
  INTO v_resolver
  FROM get_program_instance_week(v_active_assignment.id, NULL) w
  LIMIT 1;

  IF v_slot.schedule_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'completed',
      'message', 'Program completed',
      'client_id', p_client_id,
      'client_name', TRIM(COALESCE(v_client_profile.first_name, '') || ' ' || COALESCE(v_client_profile.last_name, '')),
      'program_assignment_id', v_active_assignment.id,
      'program_id', v_active_assignment.program_id,
      'program_name', COALESCE(v_active_assignment.name, 'Program'),
      'current_week_index', GREATEST(COALESCE(v_resolver.current_week, 1) - 1, 0),
      'current_day_index', 0,
      'is_completed', true,
      'total_weeks', COALESCE(v_resolver.total_weeks, 0)
    );
  END IF;

  IF v_slot.template_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Program schedule not configured',
      'message', 'Next program slot has no workout template configured.',
      'program_assignment_id', v_active_assignment.id,
      'schedule_id', v_slot.schedule_id
    );
  END IF;

  SELECT
    pda.program_instance_workout_id,
    pda.workout_template_id
  INTO v_pda
  FROM program_day_assignments pda
  WHERE pda.id = v_slot.schedule_id;

  IF v_pda.program_instance_workout_id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', wb.id,
        'block_type', wb.set_type,
        'block_name', wb.set_name,
        'block_order', wb.set_order,
        'exercises', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id', wbe.id,
              'exercise_id', wbe.exercise_id,
              'exercise_name', e.name,
              'exercise_order', wbe.exercise_order,
              'sets', wbe.sets,
              'reps', wbe.reps,
              'weight_kg', wbe.weight_kg,
              'rest_seconds', wbe.rest_seconds,
              'load_percentage', wbe.load_percentage,
              'rir', wbe.rir,
              'tempo', wbe.tempo,
              'notes', wbe.notes
            ) ORDER BY wbe.exercise_order
          ), '[]'::jsonb)
          FROM program_instance_set_entry_exercises wbe
          LEFT JOIN exercises e ON e.id = wbe.exercise_id
          WHERE wbe.program_instance_set_entry_id = wb.id
        )
      ) ORDER BY wb.set_order
    ), '[]'::jsonb)
    INTO v_blocks
    FROM program_instance_set_entries wb
    WHERE wb.program_instance_workout_id = v_pda.program_instance_workout_id;
  ELSE
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', wb.id,
        'block_type', wb.set_type,
        'block_name', wb.set_name,
        'block_order', wb.set_order,
        'exercises', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id', wbe.id,
              'exercise_id', wbe.exercise_id,
              'exercise_name', e.name,
              'exercise_order', wbe.exercise_order,
              'sets', wbe.sets,
              'reps', wbe.reps,
              'weight_kg', wbe.weight_kg,
              'rest_seconds', wbe.rest_seconds,
              'load_percentage', wbe.load_percentage,
              'rir', wbe.rir,
              'tempo', wbe.tempo,
              'notes', wbe.notes
            ) ORDER BY wbe.exercise_order
          ), '[]'::jsonb)
          FROM workout_set_entry_exercises wbe
          LEFT JOIN exercises e ON e.id = wbe.exercise_id
          WHERE wbe.set_entry_id = wb.id
        )
      ) ORDER BY wb.set_order
    ), '[]'::jsonb)
    INTO v_blocks
    FROM workout_set_entries wb
    WHERE wb.template_id = v_pda.workout_template_id;
  END IF;

  SELECT COUNT(*)::int
  INTO v_days_in_current_week
  FROM program_day_assignments pda
  WHERE pda.program_assignment_id = v_active_assignment.id
    AND pda.week_number = v_slot.week_number;

  v_week_label := 'Week ' || v_slot.week_number;
  v_day_label := 'Day ' || v_slot.program_day;

  v_result := jsonb_build_object(
    'status', 'active',
    'client_id', p_client_id,
    'client_name', TRIM(COALESCE(v_client_profile.first_name, '') || ' ' || COALESCE(v_client_profile.last_name, '')),
    'client_avatar_url', v_client_profile.avatar_url,
    'program_assignment_id', v_active_assignment.id,
    'program_id', v_active_assignment.program_id,
    'program_name', COALESCE(v_active_assignment.name, 'Program'),
    'current_week_index', GREATEST(v_slot.week_number - 1, 0),
    'current_day_index', GREATEST(v_slot.program_day - 1, 0),
    'is_completed', false,
    'week_label', v_week_label,
    'day_label', v_day_label,
    'position_label', v_week_label || ' • ' || v_day_label,
    'total_weeks', COALESCE(v_resolver.total_weeks, 0),
    'days_in_current_week', v_days_in_current_week,
    'template_id', v_slot.template_id,
    'workout_name', COALESCE(v_slot.template_name, 'Workout'),
    'workout_description', COALESCE(v_slot.template_description, ''),
    'estimated_duration', v_slot.estimated_duration,
    'blocks', v_blocks
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coach_pickup_workout(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_coach_pickup_workout(uuid) IS
  'Coach gym-console next workout. Ledger-derived slot via get_next_incomplete_program_slot; no program_progress. Exercise objects include sets/reps/weight_kg/rest_seconds/load_percentage/rir/tempo/notes.';

NOTIFY pgrst, 'reload schema';

-- Verify (still inside the transaction): exercise jsonb keys must include the new fields
SELECT
  CASE
    WHEN pg_get_functiondef('public.get_coach_pickup_workout(uuid)'::regprocedure)
      LIKE '%''load_percentage'', wbe.load_percentage%'
     AND pg_get_functiondef('public.get_coach_pickup_workout(uuid)'::regprocedure)
      LIKE '%''rir'', wbe.rir%'
     AND pg_get_functiondef('public.get_coach_pickup_workout(uuid)'::regprocedure)
      LIKE '%''tempo'', wbe.tempo%'
     AND pg_get_functiondef('public.get_coach_pickup_workout(uuid)'::regprocedure)
      LIKE '%''notes'', wbe.notes%'
    THEN 'OK: prescription fields present in function body'
    ELSE 'FAIL: expected prescription fields missing from function body'
  END AS verification;

-- Then either:
--   COMMIT;
-- or:
--   ROLLBACK;

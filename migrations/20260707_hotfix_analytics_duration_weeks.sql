-- =============================================================================
-- Step 12 hotfix round 2 — analytics RPCs off workout_programs.duration_weeks
-- Prerequisite: 20260705 drop + 20260706 hotfix. Resolver: get_program_instance_week.
-- If CREATE fails on signature mismatch, run:
--   SELECT proname, pg_get_function_identity_arguments(oid), pg_get_function_result(oid)
--   FROM pg_proc WHERE proname IN (
--     'calculate_adherence','check_and_complete_program',
--     'get_weekly_breakdown','get_completed_programs'
--   );
-- =============================================================================

-- ---------------------------------------------------------------------
-- 1) check_and_complete_program(uuid) — ledger + resolver (no program_progress table)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.check_and_complete_program(uuid);

CREATE OR REPLACE FUNCTION public.check_and_complete_program(p_program_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment record;
  v_total_weeks int;
  v_current_week int;
  v_has_slots boolean;
  v_next_schedule_id uuid;
  v_is_completed boolean;
BEGIN
  SELECT pa.id, pa.client_id, pa.program_id, pa.status, pa.start_date, pa.created_at, pa.updated_at
  INTO v_assignment
  FROM program_assignments pa
  WHERE pa.id = p_program_assignment_id;

  IF v_assignment.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'assignment_not_found');
  END IF;

  IF v_assignment.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;

  SELECT w.current_week, w.total_weeks
  INTO v_current_week, v_total_weeks
  FROM public.get_program_instance_week(p_program_assignment_id, NULL) w;

  v_current_week := COALESCE(v_current_week, 1);
  v_total_weeks := COALESCE(v_total_weeks, public.program_instance_total_weeks(p_program_assignment_id), 0);

  SELECT EXISTS (
    SELECT 1 FROM program_day_assignments pda
    WHERE pda.program_assignment_id = p_program_assignment_id
  ) INTO v_has_slots;

  SELECT s.schedule_id
  INTO v_next_schedule_id
  FROM public.get_next_incomplete_program_slot(p_program_assignment_id) s
  LIMIT 1;

  v_is_completed := v_has_slots AND v_next_schedule_id IS NULL;

  IF v_is_completed OR (v_total_weeks > 0 AND v_current_week >= v_total_weeks AND v_next_schedule_id IS NULL) THEN
    UPDATE program_assignments
    SET status = 'completed', updated_at = now()
    WHERE id = p_program_assignment_id
      AND status <> 'completed';

    RETURN jsonb_build_object(
      'success', true,
      'completed', true,
      'current_week', v_current_week,
      'total_weeks', v_total_weeks
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'completed', false,
    'current_week', v_current_week,
    'total_weeks', v_total_weeks
  );
END;
$$;

COMMENT ON FUNCTION public.check_and_complete_program(uuid) IS
  'Marks assignment completed when ledger has no incomplete slots. Week gate uses resolver total_weeks (not dropped wp/pa duration_weeks).';

-- ---------------------------------------------------------------------
-- 2) calculate_adherence(uuid) — duration_weeks from resolver
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.calculate_adherence(uuid);

CREATE OR REPLACE FUNCTION public.calculate_adherence(p_program_assignment_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment record;
  v_duration_weeks numeric;
  v_actual_weeks_taken numeric;
  v_start date;
  v_end date;
BEGIN
  SELECT pa.id, pa.start_date, pa.created_at, pa.updated_at, pa.status
  INTO v_assignment
  FROM program_assignments pa
  WHERE pa.id = p_program_assignment_id;

  IF v_assignment.id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(w.total_weeks, public.program_instance_total_weeks(p_program_assignment_id), 0)::numeric
  INTO v_duration_weeks
  FROM public.get_program_instance_week(p_program_assignment_id, NULL) w;

  v_start := COALESCE(v_assignment.start_date, v_assignment.created_at::date);
  v_end := CASE
    WHEN v_assignment.status = 'completed' THEN COALESCE(v_assignment.updated_at::date, CURRENT_DATE)
    ELSE CURRENT_DATE
  END;

  v_actual_weeks_taken := GREATEST(1::numeric, ceil(((v_end - v_start) + 1)::numeric / 7.0));

  IF v_duration_weeks <= 0 OR v_actual_weeks_taken <= 0 THEN
    RETURN 0;
  END IF;

  RETURN LEAST(100, ROUND((v_duration_weeks / v_actual_weeks_taken) * 100, 1));
END;
$$;

COMMENT ON FUNCTION public.calculate_adherence(uuid) IS
  'Program adherence pace: resolver total_weeks (N) over elapsed calendar weeks. No workout_programs.duration_weeks.';

-- ---------------------------------------------------------------------
-- 3) get_weekly_breakdown(uuid)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_weekly_breakdown(uuid);

CREATE OR REPLACE FUNCTION public.get_weekly_breakdown(p_program_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment record;
  v_total_weeks int;
  v_week int;
  v_weeks jsonb := '[]'::jsonb;
  v_adh record;
BEGIN
  SELECT pa.id, pa.client_id, pa.program_id, pa.status
  INTO v_assignment
  FROM program_assignments pa
  WHERE pa.id = p_program_assignment_id;

  IF v_assignment.id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(w.total_weeks, public.program_instance_total_weeks(p_program_assignment_id), 0)
  INTO v_total_weeks
  FROM public.get_program_instance_week(p_program_assignment_id, NULL) w;

  IF v_total_weeks < 1 THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR v_week IN 1..v_total_weeks LOOP
    SELECT required, completed
    INTO v_adh
    FROM public.instance_adherence_for_week(p_program_assignment_id, v_week);

    v_weeks := v_weeks || jsonb_build_array(
      jsonb_build_object(
        'week_number', v_week,
        'required', COALESCE(v_adh.required, 0),
        'completed', COALESCE(v_adh.completed, 0),
        'adherence_pct', CASE
          WHEN COALESCE(v_adh.required, 0) > 0 THEN
            ROUND((COALESCE(v_adh.completed, 0)::numeric / v_adh.required::numeric) * 100, 1)
          ELSE 0
        END
      )
    );
  END LOOP;

  RETURN v_weeks;
END;
$$;

COMMENT ON FUNCTION public.get_weekly_breakdown(uuid) IS
  'Per-week required/completed breakdown. total_weeks from resolver (instance phases).';

-- ---------------------------------------------------------------------
-- 4) get_completed_programs(uuid)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_completed_programs(uuid);

CREATE OR REPLACE FUNCTION public.get_completed_programs(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(
    jsonb_agg(row_to_json(t) ORDER BY t.completed_date DESC NULLS LAST),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT
      pa.id,
      pa.client_id,
      pa.program_id,
      pa.id AS assignment_id,
      COALESCE(pa.name, wp.name, 'Program') AS program_name,
      COALESCE(pa.description, wp.description) AS program_description,
      COALESCE(wk.total_weeks, public.program_instance_total_weeks(pa.id), 0) AS total_weeks,
      COALESCE(wp.difficulty_level, 'intermediate') AS difficulty_level,
      COALESCE(NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''), 'Coach') AS coach_name,
      pa.start_date AS started_date,
      COALESCE(pa.updated_at, pa.created_at) AS completed_date,
      (
        SELECT COUNT(DISTINCT pdc.program_day_assignment_id)::int
        FROM program_day_completions pdc
        WHERE pdc.program_assignment_id = pa.id
          AND pdc.program_day_assignment_id IS NOT NULL
          AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%'
      ) AS total_workouts_completed,
      LEAST(
        100,
        ROUND(
          CASE
            WHEN COALESCE(wk.total_weeks, public.program_instance_total_weeks(pa.id), 0) > 0 THEN
              (
                SELECT COUNT(DISTINCT pdc.program_day_assignment_id)::numeric
                FROM program_day_completions pdc
                WHERE pdc.program_assignment_id = pa.id
                  AND pdc.program_day_assignment_id IS NOT NULL
                  AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%'
              )
              / NULLIF(
                (
                  SELECT COUNT(*)::numeric
                  FROM program_day_assignments pda
                  WHERE pda.program_assignment_id = pa.id
                    AND COALESCE(pda.is_optional, false) = false
                ),
                0
              )
              * 100
            ELSE 0
          END,
          1
        )
      ) AS completion_percentage,
      pa.created_at,
      pa.updated_at
    FROM program_assignments pa
    LEFT JOIN workout_programs wp ON wp.id = pa.program_id
    LEFT JOIN profiles p ON p.id = pa.coach_id
    LEFT JOIN LATERAL public.get_program_instance_week(pa.id, NULL) wk ON true
    WHERE pa.client_id = p_client_id
      AND pa.status = 'completed'
  ) t;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_completed_programs(uuid) IS
  'Completed programs for client. total_weeks from get_program_instance_week / program_instance_total_weeks.';

GRANT EXECUTE ON FUNCTION public.check_and_complete_program(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_complete_program(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_adherence(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_adherence(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_weekly_breakdown(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_breakdown(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_completed_programs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_completed_programs(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';

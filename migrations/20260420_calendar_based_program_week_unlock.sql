-- =============================================================================
-- 20260420_calendar_based_program_week_unlock.sql
--
-- Calendar-based program week unlock: single source of truth.
--
-- Introduces compute_program_current_week(...) as the canonical week-derivation
-- function, and rewrites get_coach_client_training and get_train_page_data to
-- use it. Stops reading program_progress.current_week_number and
-- program_assignments.coach_unlocked_week for unlock decisions.
--
-- LEGACY COLUMNS PRESERVED:
--   - program_assignments.coach_unlocked_week
--   - program_assignments.progression_mode
--   - program_progress.current_week_number
-- These are no longer authoritative but remain in the schema for:
--   (a) backward compatibility with app code that inspects them
--   (b) future reintroduction of coach-managed mode
-- Dropping them is a separate decision for Horica.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Canonical week-derivation helper
-- -----------------------------------------------------------------------------
-- Mirrors the TS function computeProgramWeekForCalendarYmd exactly:
--   effective_start = start_date + pause_accumulated_days
--   target = today_in_client_tz, but frozen at paused_at if currently paused
--   elapsed = max(0, target - effective_start)
--   week = floor(elapsed / 7) + 1   (start-inclusive)
--
-- Caller is responsible for clamping to [1, duration_weeks] for display.

CREATE OR REPLACE FUNCTION public.compute_program_current_week(
  p_start_date date,
  p_pause_accumulated_days integer,
  p_pause_status text,
  p_paused_at timestamptz,
  p_client_timezone text,
  p_target_date date DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_tz text := COALESCE(NULLIF(p_client_timezone, ''), 'UTC');
  v_pause_accum integer := GREATEST(0, COALESCE(p_pause_accumulated_days, 0));
  v_effective_start date;
  v_target date;
  v_paused_date date;
  v_elapsed integer;
BEGIN
  IF p_start_date IS NULL THEN
    RETURN 1;
  END IF;

  v_effective_start := p_start_date + v_pause_accum;

  IF p_target_date IS NOT NULL THEN
    v_target := p_target_date;
  ELSE
    v_target := (now() AT TIME ZONE v_tz)::date;
  END IF;

  -- If currently paused, freeze target at the paused date.
  IF p_pause_status = 'paused' AND p_paused_at IS NOT NULL THEN
    v_paused_date := (p_paused_at AT TIME ZONE v_tz)::date;
    IF v_target > v_paused_date THEN
      v_target := v_paused_date;
    END IF;
  END IF;

  v_elapsed := GREATEST(0, v_target - v_effective_start);
  RETURN (v_elapsed / 7) + 1;
END;
$$;

COMMENT ON FUNCTION public.compute_program_current_week(date, integer, text, timestamptz, text, date) IS
  'Canonical current-week derivation. Start-inclusive: same-day=week 1. Frozen at paused_at while pause_status=paused. Callers clamp to [1, duration_weeks] for display.';

GRANT EXECUTE ON FUNCTION public.compute_program_current_week(date, integer, text, timestamptz, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_program_current_week(date, integer, text, timestamptz, text, date) TO service_role;

-- -----------------------------------------------------------------------------
-- 2) Rewrite get_coach_client_training
-- -----------------------------------------------------------------------------
-- displayWeek now comes from compute_program_current_week, clamped to
-- duration_weeks. Stops reading program_progress.current_week_number and
-- coach_unlocked_week for the week decision. coachUnlockedWeek is still
-- returned in the payload for legacy consumers but is not authoritative.

CREATE OR REPLACE FUNCTION public.get_coach_client_training(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach uuid := auth.uid();
  v_ok int;
  v_pa record;
  v_week int;
  v_week_raw int;
  v_clamped boolean := false;
  v_required int := 0;
  v_completed int := 0;
  v_program_name text;
  v_duration_weeks int;
  v_client_tz text;
  v_week_days jsonb := '[]'::jsonb;
  v_week_schedule jsonb := '[]'::jsonb;
  v_d int;
  v_slot_ids uuid[];
  v_need int;
  v_done int;
  v_recent jsonb;
BEGIN
  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT 1 INTO v_ok
  FROM public.clients c
  WHERE c.coach_id = v_coach AND c.client_id = p_client_id
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT pa.* INTO v_pa
  FROM public.program_assignments pa
  WHERE pa.client_id = p_client_id AND pa.status = 'active'
  ORDER BY pa.updated_at DESC NULLS LAST, pa.created_at DESC
  LIMIT 1;

  IF v_pa.id IS NOT NULL THEN
    SELECT wp.name, wp.duration_weeks
    INTO v_program_name, v_duration_weeks
    FROM public.workout_programs wp
    WHERE wp.id = v_pa.program_id
    LIMIT 1;

    -- Resolve client timezone: assignment snapshot -> profile -> UTC
    v_client_tz := COALESCE(
      NULLIF(v_pa.timezone_snapshot, ''),
      (SELECT NULLIF(p.timezone, '') FROM public.profiles p WHERE p.id = p_client_id LIMIT 1),
      'UTC'
    );

    v_week_raw := public.compute_program_current_week(
      v_pa.start_date,
      v_pa.pause_accumulated_days,
      v_pa.pause_status,
      v_pa.paused_at,
      v_client_tz,
      NULL
    );

    v_week := GREATEST(1, v_week_raw);
    IF v_duration_weeks IS NOT NULL AND v_week > v_duration_weeks THEN
      v_week := v_duration_weeks;
      v_clamped := true;
    END IF;

    SELECT COUNT(*)::int INTO v_required
    FROM public.program_schedule ps
    WHERE ps.program_id = v_pa.program_id
      AND ps.week_number = v_week
      AND COALESCE(ps.is_optional, false) = false;

    SELECT COUNT(*)::int INTO v_completed
    FROM public.program_day_completions pdc
    JOIN public.program_schedule ps ON ps.id = pdc.program_schedule_id
    WHERE pdc.program_assignment_id = v_pa.id
      AND ps.week_number = v_week
      AND COALESCE(ps.is_optional, false) = false
      AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%';

    FOR v_d IN 0..6 LOOP
      SELECT array_agg(ps.id) INTO v_slot_ids
      FROM public.program_schedule ps
      WHERE ps.program_id = v_pa.program_id
        AND ps.week_number = v_week
        AND COALESCE(ps.is_optional, false) = false
        AND ps.day_of_week = v_d;

      IF v_slot_ids IS NULL OR cardinality(v_slot_ids) = 0 THEN
        v_week_days := v_week_days || jsonb_build_array(
          jsonb_build_object('dow', v_d, 'hasSlot', false, 'done', false)
        );
      ELSE
        v_need := cardinality(v_slot_ids);
        SELECT COUNT(DISTINCT pdc.program_schedule_id)::int INTO v_done
        FROM public.program_day_completions pdc
        WHERE pdc.program_assignment_id = v_pa.id
          AND pdc.program_schedule_id = ANY(v_slot_ids)
          AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%';
        v_week_days := v_week_days || jsonb_build_array(
          jsonb_build_object(
            'dow', v_d,
            'hasSlot', true,
            'done', (v_done >= v_need)
          )
        );
      END IF;
    END LOOP;

    SELECT COALESCE(
      jsonb_agg(q.row_json ORDER BY q.sort_dow, q.sort_dn, q.sort_id),
      '[]'::jsonb
    ) INTO v_week_schedule
    FROM (
      SELECT
        ps.day_of_week AS sort_dow,
        ps.day_number AS sort_dn,
        ps.id AS sort_id,
        jsonb_build_object(
          'scheduleId', ps.id,
          'dayOfWeek', ps.day_of_week,
          'dayNumber', ps.day_number,
          'templateId', ps.template_id,
          'isOptional', COALESCE(ps.is_optional, false),
          'templateName', COALESCE(wt.name, 'Workout'),
          'isCompleted', EXISTS (
            SELECT 1 FROM public.program_day_completions pdc
            WHERE pdc.program_schedule_id = ps.id
              AND pdc.program_assignment_id = v_pa.id
              AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%'
          )
        ) AS row_json
      FROM public.program_schedule ps
      LEFT JOIN public.workout_templates wt ON wt.id = ps.template_id
      WHERE ps.program_id = v_pa.program_id
        AND ps.week_number = v_week
    ) q;
  END IF;

  SELECT COALESCE(
    jsonb_agg(q.obj ORDER BY q.completed_at DESC),
    '[]'::jsonb
  ) INTO v_recent
  FROM (
    SELECT
      wl.completed_at,
      jsonb_build_object(
        'logId', wl.id,
        'completedAt', wl.completed_at,
        'workoutName', COALESCE(wt.name, 'Workout'),
        'durationMinutes', wl.total_duration_minutes,
        'setsCompleted', wl.total_sets_completed,
        'weightLifted', wl.total_weight_lifted,
        'templateId', wt.id
      ) AS obj
    FROM public.workout_logs wl
    LEFT JOIN public.workout_assignments wa ON wa.id = wl.workout_assignment_id
    LEFT JOIN public.workout_templates wt ON wt.id = wa.workout_template_id
    WHERE wl.client_id = p_client_id
      AND wl.completed_at IS NOT NULL
    ORDER BY wl.completed_at DESC
    LIMIT 5
  ) q;

  RETURN jsonb_build_object(
    'clientId', p_client_id,
    'activeProgram', CASE WHEN v_pa.id IS NULL THEN NULL ELSE jsonb_build_object(
      'assignmentId', v_pa.id,
      'programId', v_pa.program_id,
      'programName', COALESCE(v_program_name, 'Program'),
      'durationWeeks', v_duration_weeks,
      'displayWeek', v_week,
      'displayWeekClamped', v_clamped,
      'progressionMode', COALESCE(v_pa.progression_mode, 'auto'),
      'coachUnlockedWeek', v_pa.coach_unlocked_week,
      'startDate', v_pa.start_date,
      'pauseStatus', v_pa.pause_status,
      'pausedAt', v_pa.paused_at,
      'pauseAccumulatedDays', COALESCE(v_pa.pause_accumulated_days, 0),
      'timezoneSnapshot', v_client_tz,
      'requiredSlotsThisWeek', v_required,
      'completedRequiredThisWeek', v_completed,
      'weekDays', v_week_days,
      'weekSchedule', COALESCE(v_week_schedule, '[]'::jsonb)
    ) END,
    'recentSessions', COALESCE(v_recent, '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.get_coach_client_training(uuid) IS
  'Returns coach-facing client training state. displayWeek is calendar-derived via compute_program_current_week (start_date + pause_accumulated_days, clamped to duration_weeks). coachUnlockedWeek retained in payload for legacy callers but not authoritative.';

REVOKE ALL ON FUNCTION public.get_coach_client_training(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_coach_client_training(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3) Rewrite get_train_page_data
-- -----------------------------------------------------------------------------
-- Changes from previous version:
--   - assignmentStartDate now uses pa.start_date (fallback created_at::date)
--   - currentProgramWeek is computed via compute_program_current_week and
--     returned in the payload (authoritative source for TS mapper)
--   - coachReviewNotes lookup uses the calendar-derived current week rather
--     than coach_unlocked_week
--   - pauseStatus, pauseAccumulatedDays, pausedAt, timezoneSnapshot added to
--     payload so TS can re-derive locally if needed

CREATE OR REPLACE FUNCTION public.get_train_page_data(p_client_id uuid, p_today_weekday integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_program_assignment record;
  v_coach_review record;
  v_caller uuid := auth.uid();
  v_is_coach boolean;
  v_client_tz text;
  v_effective_start_date date;
  v_total_weeks int;
  v_current_week_raw int;
  v_current_week int;
  v_week_clamped boolean := false;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller IS DISTINCT FROM p_client_id THEN
    SELECT EXISTS (
      SELECT 1
      FROM clients
      WHERE client_id = p_client_id
        AND coach_id = v_caller
    ) INTO v_is_coach;
    IF NOT v_is_coach THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  SELECT pa.id, pa.program_id, pa.client_id, pa.status, pa.duration_weeks, pa.created_at,
         pa.start_date, pa.progression_mode, pa.coach_unlocked_week,
         pa.pause_status, pa.paused_at, pa.pause_accumulated_days,
         pa.timezone_snapshot,
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

  v_client_tz := COALESCE(
    NULLIF(v_program_assignment.timezone_snapshot, ''),
    (SELECT NULLIF(p.timezone, '') FROM public.profiles p WHERE p.id = p_client_id LIMIT 1),
    'UTC'
  );

  v_effective_start_date := COALESCE(
    v_program_assignment.start_date,
    v_program_assignment.created_at::date
  );

  v_total_weeks := COALESCE(
    v_program_assignment.duration_weeks,
    v_program_assignment.wp_duration_weeks,
    4
  );

  v_current_week_raw := public.compute_program_current_week(
    v_effective_start_date,
    v_program_assignment.pause_accumulated_days,
    v_program_assignment.pause_status,
    v_program_assignment.paused_at,
    v_client_tz,
    NULL
  );

  v_current_week := GREATEST(1, v_current_week_raw);
  IF v_total_weeks IS NOT NULL AND v_current_week > v_total_weeks THEN
    v_current_week := v_total_weeks;
    v_week_clamped := true;
  END IF;

  -- Coach review notes for the calendar-derived current week
  SELECT cwr.coach_notes, cwr.reviewed_at
  INTO v_coach_review
  FROM coach_week_reviews cwr
  WHERE cwr.program_assignment_id = v_program_assignment.id
    AND cwr.week_number = v_current_week
  ORDER BY cwr.reviewed_at DESC
  LIMIT 1;

  result := jsonb_build_object(
    'hasProgram', true,
    'programName', v_program_assignment.program_name,
    'programId', v_program_assignment.program_id,
    'assignmentId', v_program_assignment.id,
    'assignmentStartDate', v_effective_start_date,
    'durationWeeks', v_total_weeks,
    'progressionMode', COALESCE(v_program_assignment.progression_mode, 'auto'),
    'coachUnlockedWeek', v_program_assignment.coach_unlocked_week,
    'currentProgramWeek', v_current_week,
    'currentProgramWeekClamped', v_week_clamped,
    'pauseStatus', v_program_assignment.pause_status,
    'pauseAccumulatedDays', COALESCE(v_program_assignment.pause_accumulated_days, 0),
    'pausedAt', v_program_assignment.paused_at,
    'timezoneSnapshot', v_client_tz,
    'coachReviewNotes', v_coach_review.coach_notes,
    'coachReviewDate', v_coach_review.reviewed_at,
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
  'Returns Train page data. assignmentStartDate uses pa.start_date (fallback created_at::date). currentProgramWeek is calendar-derived via compute_program_current_week and is authoritative for week unlock. coachUnlockedWeek retained in payload for legacy callers but not authoritative.';

GRANT EXECUTE ON FUNCTION public.get_train_page_data(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_train_page_data(uuid, integer) TO service_role;

-- =============================================================================
-- End of migration 20260420_calendar_based_program_week_unlock.sql
-- =============================================================================

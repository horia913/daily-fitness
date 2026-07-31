-- =====================================================================
-- PROGRAM SPINE REBUILD — STEP 6 (part A): coach-skip-aware instance
-- adherence. Run manually in the Supabase SQL editor.
--
-- Updates public.instance_adherence_for_week to EXCLUDE coach-skipped
-- slots from the denominator entirely (a coach-skip is NOT a miss).
--
-- This keeps the SQL function in lock-step with the TS
-- computeInstanceAdherenceForWeek / instanceAdherenceForWeek
-- (src/lib/programInstanceResolver.ts), which apply the identical rule.
--
-- Coach-skip signal (legacy, still canonical): a program_day_completions
-- row whose notes begin with 'Skipped by coach'.
--
-- Semantics:
--   slots     = non-optional instance schedule slots for the week
--   skipped   = slots that have a coach-skip completion
--   required  = slots MINUS skipped
--   completed = distinct required slots with a NON-skip completion
-- =====================================================================

CREATE OR REPLACE FUNCTION public.instance_adherence_for_week(
  p_assignment_id uuid,
  p_week integer
)
RETURNS TABLE(required integer, completed integer)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH slots AS (
    SELECT pda.id
    FROM public.program_day_assignments pda
    WHERE pda.program_assignment_id = p_assignment_id
      AND pda.week_number = p_week
      AND COALESCE(pda.is_optional, false) = false
  ),
  comps AS (
    SELECT pdc.program_day_assignment_id AS slot_id,
           bool_or(COALESCE(pdc.notes, '') LIKE 'Skipped by coach%')     AS is_skip,
           bool_or(COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%') AS has_real
    FROM public.program_day_completions pdc
    WHERE pdc.program_assignment_id = p_assignment_id
      AND pdc.program_day_assignment_id IN (SELECT id FROM slots)
    GROUP BY pdc.program_day_assignment_id
  ),
  skipped AS (
    SELECT slot_id FROM comps WHERE is_skip
  ),
  req AS (
    SELECT s.id
    FROM slots s
    WHERE s.id NOT IN (SELECT slot_id FROM skipped)
  )
  SELECT
    (SELECT COUNT(*)::int FROM req) AS required,
    (SELECT COUNT(DISTINCT c.slot_id)::int
       FROM comps c
      WHERE c.has_real
        AND c.slot_id IN (SELECT id FROM req)) AS completed;
$$;

COMMENT ON FUNCTION public.instance_adherence_for_week(uuid, integer) IS
  'Instance adherence for a week. required = non-optional instance schedule slots MINUS coach-skipped slots; completed = distinct required slots with a non-skip instance-keyed completion (program_day_assignment_id). Coach-skips (notes LIKE ''Skipped by coach%'') are excluded from the denominator. Mirrors TS computeInstanceAdherenceForWeek.';

GRANT EXECUTE ON FUNCTION public.instance_adherence_for_week(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.instance_adherence_for_week(uuid, integer) TO service_role;

-- =====================================================================
-- STEP 6 (part B): re-point client/coach RPCs to the canonical resolver.
-- N = SUM(instance phases) via program_instance_total_weeks; X via
-- get_program_instance_week (calendar/pause in client tz, clamped to N).
-- Adherence is instance-keyed with coach-skip excluded from the denominator
-- via instance_adherence_for_week.
-- =====================================================================

-- ---------------------------------------------------------------------
-- get_train_page_data: only the Week X of N computation changes. The
-- schedule/completions/extraWorkouts payload is byte-identical to
-- 20260531 (master program_schedule display is reworked in step 8).
-- ---------------------------------------------------------------------
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
  v_current_week int;
  v_week_clamped boolean := false;
  v_week_row record;
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
            AND wa.program_assignment_id IS NULL
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

  -- Canonical Week X of N: N = SUM(instance phases), X = resolver clamped to N.
  SELECT current_week, total_weeks, clamped
  INTO v_week_row
  FROM public.get_program_instance_week(v_program_assignment.id, NULL);

  v_current_week := COALESCE(v_week_row.current_week, 1);
  v_total_weeks  := COALESCE(v_week_row.total_weeks, 0);
  v_week_clamped := COALESCE(v_week_row.clamped, false);

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
          AND wa.program_assignment_id IS NULL
      ) w
    )
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_train_page_data(uuid, integer) IS
  'Train page data. durationWeeks (N) = SUM(instance phases); currentProgramWeek (X) = get_program_instance_week (calendar/pause in client tz, clamped to N). schedule/completions/extraWorkouts unchanged from 20260531.';

GRANT EXECUTE ON FUNCTION public.get_train_page_data(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_train_page_data(uuid, integer) TO service_role;

-- ---------------------------------------------------------------------
-- get_coach_client_training: N/X via resolver; adherence + weekDays +
-- weekSchedule re-keyed to the per-client instance schedule
-- (program_day_assignments) and instance-keyed completions, with
-- coach-skip excluded from the denominator.
-- ---------------------------------------------------------------------
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
  v_week_row record;
  v_adh record;
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
    SELECT wp.name INTO v_program_name
    FROM public.workout_programs wp
    WHERE wp.id = v_pa.program_id
    LIMIT 1;

    v_client_tz := COALESCE(
      NULLIF(v_pa.timezone_snapshot, ''),
      (SELECT NULLIF(p.timezone, '') FROM public.profiles p WHERE p.id = p_client_id LIMIT 1),
      'UTC'
    );

    -- Canonical Week X of N (N = instance phases, X = resolver clamped to N).
    SELECT current_week, total_weeks, clamped
    INTO v_week_row
    FROM public.get_program_instance_week(v_pa.id, NULL);
    v_week := COALESCE(v_week_row.current_week, 1);
    v_duration_weeks := COALESCE(v_week_row.total_weeks, 0);
    v_clamped := COALESCE(v_week_row.clamped, false);

    -- Instance-keyed adherence (coach-skip excluded from denominator).
    SELECT required, completed INTO v_adh
    FROM public.instance_adherence_for_week(v_pa.id, v_week);
    v_required := COALESCE(v_adh.required, 0);
    v_completed := COALESCE(v_adh.completed, 0);

    -- Per-weekday strip from the instance schedule. day index = program_day - 1.
    FOR v_d IN 0..6 LOOP
      SELECT array_agg(pda.id) INTO v_slot_ids
      FROM public.program_day_assignments pda
      WHERE pda.program_assignment_id = v_pa.id
        AND pda.week_number = v_week
        AND COALESCE(pda.is_optional, false) = false
        AND GREATEST(0, LEAST(6, COALESCE(pda.program_day, 1) - 1)) = v_d;

      IF v_slot_ids IS NULL OR cardinality(v_slot_ids) = 0 THEN
        v_week_days := v_week_days || jsonb_build_array(
          jsonb_build_object('dow', v_d, 'hasSlot', false, 'done', false)
        );
      ELSE
        v_need := cardinality(v_slot_ids);
        SELECT COUNT(DISTINCT pdc.program_day_assignment_id)::int INTO v_done
        FROM public.program_day_completions pdc
        WHERE pdc.program_assignment_id = v_pa.id
          AND pdc.program_day_assignment_id = ANY(v_slot_ids)
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
        GREATEST(0, LEAST(6, COALESCE(pda.program_day, 1) - 1)) AS sort_dow,
        pda.day_number AS sort_dn,
        pda.id AS sort_id,
        jsonb_build_object(
          'scheduleId', pda.id,
          'dayOfWeek', GREATEST(0, LEAST(6, COALESCE(pda.program_day, 1) - 1)),
          'dayNumber', pda.program_day,
          'templateId', pda.program_instance_workout_id,
          'isOptional', COALESCE(pda.is_optional, false),
          'templateName', COALESCE(piw.name, pda.name, 'Workout'),
          'isCompleted', EXISTS (
            SELECT 1 FROM public.program_day_completions pdc
            WHERE pdc.program_day_assignment_id = pda.id
              AND pdc.program_assignment_id = v_pa.id
              AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%'
          )
        ) AS row_json
      FROM public.program_day_assignments pda
      LEFT JOIN public.program_instance_workouts piw ON piw.id = pda.program_instance_workout_id
      WHERE pda.program_assignment_id = v_pa.id
        AND pda.week_number = v_week
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
  'Coach-facing client training state. displayWeek (X)/durationWeeks (N) via get_program_instance_week (N = instance phases). Adherence + weekDays + weekSchedule are instance-keyed (program_day_assignments + program_day_assignment_id) with coach-skip excluded from the denominator.';

GRANT EXECUTE ON FUNCTION public.get_coach_client_training(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_client_training(uuid) TO service_role;

-- ---------------------------------------------------------------------
-- get_client_dashboard: re-point Week X of N, weeklyProgress, and
-- programProgress to the canonical resolver + instance-keyed adherence.
-- Streak (date-based) is unchanged. todaysWorkout uses the resolver week
-- (day pointer still from program_progress until step 8). Otherwise
-- identical to 20260515_get_client_dashboard_athlete_score_v2.sql.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_client_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_result JSONB;
  v_avatar_url TEXT;
  v_first_name TEXT;
  v_client_type TEXT;
  v_monday DATE;
  v_sunday DATE;
  v_monday_ts TIMESTAMPTZ;
  v_sunday_ts TIMESTAMPTZ;
  v_streak INT := 0;
  v_weekly_current INT := 0;
  v_weekly_goal INT := 0;
  v_weekly_volume NUMERIC := 0;
  v_weekly_time INT := 0;
  v_prs_count INT := 0;
  v_body_weight_current NUMERIC;
  v_body_weight_change NUMERIC;
  v_next_session JSONB;
  v_todays_workout JSONB;
  v_workout_days JSONB;
  v_today_wellness JSONB;
  v_checkin_streak INT := 0;
  v_prs_this_month INT := 0;
  v_latest_achievement JSONB;
  v_best_leaderboard JSONB;
  v_athlete_score JSONB;
  v_score_history JSONB;
  v_first_day DATE;
  v_last_day DATE;
  v_prog_total_slots INT;
  v_prog_completed_count INT;
  v_program_progress JSONB;
  -- canonical resolver state (computed once, reused everywhere)
  v_active_pa_id UUID;
  v_active_prog_id UUID;
  v_resolver_week INT;
  v_resolver_total INT;
  v_adh RECORD;
BEGIN
  v_client_id := auth.uid();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_monday := date_trunc('week', CURRENT_DATE)::DATE;
  v_sunday := v_monday + INTERVAL '6 days';
  v_monday_ts := v_monday::TIMESTAMPTZ;
  v_sunday_ts := (v_sunday + INTERVAL '1 day')::TIMESTAMPTZ;
  v_first_day := date_trunc('month', CURRENT_DATE)::DATE;
  v_last_day := v_first_day + INTERVAL '1 month' - INTERVAL '1 day';

  SELECT avatar_url, first_name INTO v_avatar_url, v_first_name
  FROM profiles WHERE id = v_client_id;

  v_client_type := 'online';

  -- Canonical active assignment + Week X of N (single source of truth).
  SELECT pa.id, pa.program_id
  INTO v_active_pa_id, v_active_prog_id
  FROM program_assignments pa
  WHERE pa.client_id = v_client_id AND pa.status = 'active'
  ORDER BY pa.created_at DESC LIMIT 1;

  IF v_active_pa_id IS NOT NULL THEN
    SELECT current_week, total_weeks
    INTO v_resolver_week, v_resolver_total
    FROM public.get_program_instance_week(v_active_pa_id, NULL);
    v_resolver_week := COALESCE(v_resolver_week, 1);
    v_resolver_total := COALESCE(v_resolver_total, 0);
  END IF;

  IF v_client_type = 'in_gym' THEN
    SELECT jsonb_build_object(
      'id', s.id, 'scheduled_at', s.scheduled_at, 'duration_minutes', s.duration_minutes,
      'title', s.title, 'coach_name', TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
    ) INTO v_next_session
    FROM sessions s
    LEFT JOIN profiles p ON p.id = s.coach_id
    WHERE s.client_id = v_client_id AND s.status = 'scheduled' AND s.scheduled_at > NOW()
    ORDER BY s.scheduled_at ASC LIMIT 1;
  END IF;

  -- weeklyProgress X/Y = instance-keyed adherence for the resolver week
  -- (coach-skip excluded from the denominator). Streak stays date-based.
  IF v_active_pa_id IS NULL THEN
    v_streak := 0;
    v_weekly_current := 0;
    v_weekly_goal := 0;
  ELSE
    SELECT required, completed INTO v_adh
    FROM public.instance_adherence_for_week(v_active_pa_id, v_resolver_week);
    v_weekly_goal := COALESCE(v_adh.required, 0);
    v_weekly_current := COALESCE(v_adh.completed, 0);

    WITH workout_dates AS (
      SELECT DISTINCT DATE(ws.completed_at) AS workout_date
      FROM workout_sessions ws
      WHERE ws.client_id = v_client_id
        AND ws.status = 'completed'
        AND ws.completed_at IS NOT NULL
        AND ws.program_assignment_id = v_active_pa_id
        AND ws.program_schedule_id IS NOT NULL
    ),
    streak_calc AS (
      SELECT workout_date,
             workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::INT AS grp
      FROM workout_dates
      WHERE workout_date >= CURRENT_DATE - INTERVAL '365 days'
    )
    SELECT COUNT(*) INTO v_streak
    FROM streak_calc
    WHERE grp = (SELECT grp FROM streak_calc WHERE workout_date = CURRENT_DATE OR workout_date = CURRENT_DATE - 1 LIMIT 1);
    v_streak := COALESCE(v_streak, 0);
  END IF;

  WITH weekly_logs AS (
    SELECT id, total_duration_minutes FROM workout_logs
    WHERE client_id = v_client_id
      AND completed_at >= v_monday_ts AND completed_at < v_sunday_ts
      AND completed_at IS NOT NULL
  )
  SELECT
    COALESCE(SUM(total_duration_minutes), 0),
    (SELECT COALESCE(SUM((wsl.weight * wsl.reps)::NUMERIC), 0)
     FROM workout_set_logs wsl
     WHERE wsl.client_id = v_client_id AND wsl.workout_log_id IN (SELECT id FROM weekly_logs)
       AND wsl.weight IS NOT NULL AND wsl.reps IS NOT NULL)
  INTO v_weekly_time, v_weekly_volume FROM weekly_logs;
  v_weekly_volume := ROUND(v_weekly_volume / 1000, 1);

  WITH weekly_workout_days AS (
    SELECT DISTINCT
      CASE EXTRACT(DOW FROM completed_at) WHEN 0 THEN 6 ELSE EXTRACT(DOW FROM completed_at)::INT - 1 END AS day_index
    FROM workout_logs
    WHERE client_id = v_client_id
      AND completed_at >= v_monday_ts AND completed_at < v_sunday_ts
      AND completed_at IS NOT NULL
  )
  SELECT jsonb_agg(day_index ORDER BY day_index) INTO v_workout_days FROM weekly_workout_days;
  v_workout_days := COALESCE(v_workout_days, '[]'::jsonb);

  SELECT COUNT(DISTINCT exercise_id) INTO v_prs_count
  FROM user_exercise_metrics
  WHERE user_id = v_client_id AND (best_weight IS NOT NULL OR best_volume IS NOT NULL);
  v_prs_count := COALESCE(v_prs_count, 0);

  WITH recent_weights AS (
    SELECT weight_kg, measured_date FROM body_metrics
    WHERE client_id = v_client_id AND weight_kg IS NOT NULL
    ORDER BY measured_date DESC LIMIT 2
  )
  SELECT
    (SELECT weight_kg FROM recent_weights ORDER BY measured_date DESC LIMIT 1),
    (SELECT weight_kg FROM recent_weights ORDER BY measured_date DESC LIMIT 1) -
    COALESCE((SELECT weight_kg FROM recent_weights ORDER BY measured_date DESC OFFSET 1 LIMIT 1),
             (SELECT weight_kg FROM recent_weights ORDER BY measured_date DESC LIMIT 1))
  INTO v_body_weight_current, v_body_weight_change;

  SELECT row_to_json(dwl) INTO v_today_wellness
  FROM daily_wellness_logs dwl
  WHERE dwl.client_id = v_client_id AND dwl.log_date = CURRENT_DATE
  LIMIT 1;

  WITH wellness_dates AS (
    SELECT log_date
    FROM daily_wellness_logs
    WHERE client_id = v_client_id
      AND log_date <= CURRENT_DATE
      AND sleep_hours IS NOT NULL AND sleep_quality IS NOT NULL
      AND stress_level IS NOT NULL AND soreness_level IS NOT NULL
    ORDER BY log_date DESC
    LIMIT 365
  ),
  streak_grp AS (
    SELECT log_date,
           log_date - (ROW_NUMBER() OVER (ORDER BY log_date DESC))::INT AS grp
    FROM wellness_dates
  ),
  current_grp AS (
    SELECT grp FROM streak_grp WHERE log_date >= CURRENT_DATE - 1 LIMIT 1
  )
  SELECT COUNT(*)::INT INTO v_checkin_streak
  FROM streak_grp
  WHERE grp = (SELECT grp FROM current_grp);
  v_checkin_streak := COALESCE(v_checkin_streak, 0);

  SELECT COUNT(*)::INT INTO v_prs_this_month
  FROM personal_records
  WHERE client_id = v_client_id
    AND achieved_date >= v_first_day AND achieved_date <= v_last_day;

  SELECT jsonb_build_object(
    'name', COALESCE(at.name, 'Achievement'),
    'icon', at.icon,
    'tier', ua.tier
  ) INTO v_latest_achievement
  FROM user_achievements ua
  LEFT JOIN achievement_templates at ON at.id = ua.achievement_template_id
  WHERE ua.client_id = v_client_id
  ORDER BY ua.achieved_date DESC, ua.earned_at DESC NULLS LAST
  LIMIT 1;

  SELECT jsonb_build_object(
    'rank', le.rank,
    'exerciseName', e.name
  ) INTO v_best_leaderboard
  FROM (
    SELECT rank, exercise_id
    FROM leaderboard_entries
    WHERE client_id = v_client_id AND rank <= 10
    ORDER BY rank ASC
    LIMIT 1
  ) le
  LEFT JOIN exercises e ON e.id = le.exercise_id;

  SELECT jsonb_build_object(
    'id', s.id,
    'score', s.score,
    'tier', s.tier,
    'trainingScore', s.training_score,
    'trainingCompletionScore', s.training_completion_score,
    'trainingExecutionScore', s.training_execution_score,
    'recoveryScore', s.recovery_score,
    'recoverySleepScore', s.recovery_sleep_score,
    'recoveryStepsScore', s.recovery_steps_score,
    'nutritionScore', s.nutrition_score,
    'extrasScore', s.extras_score,
    'windowStart', s.window_start::text,
    'windowEnd', s.window_end::text,
    'calculatedAt', s.calculated_at::text
  ) INTO v_athlete_score
  FROM (
    SELECT id, score, tier, training_score, training_completion_score, training_execution_score,
           recovery_score, recovery_sleep_score, recovery_steps_score,
           nutrition_score, extras_score, window_start, window_end, calculated_at
    FROM athlete_scores
    WHERE client_id = v_client_id
    ORDER BY calculated_at DESC
    LIMIT 1
  ) s;

  SELECT COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('date', (t.calculated_at::date)::text, 'score', t.score) ORDER BY t.calculated_at ASC)
     FROM (
       SELECT calculated_at, score
       FROM (
         SELECT calculated_at, score
         FROM athlete_scores
         WHERE client_id = v_client_id
         ORDER BY window_start DESC NULLS LAST, calculated_at DESC
         LIMIT 4
       ) sub
       ORDER BY calculated_at ASC
     ) t),
    '[]'::jsonb
  ) INTO v_score_history;

  -- todaysWorkout: week from resolver; day pointer still from program_progress
  -- (display schedule reworked in step 8).
  DECLARE
    v_program_assignment RECORD;
    v_program_progress RECORD;
    v_schedule_row RECORD;
  BEGIN
    SELECT pa.id, pa.program_id, pa.name AS program_name INTO v_program_assignment
    FROM program_assignments pa
    WHERE pa.client_id = v_client_id AND pa.status = 'active'
    ORDER BY pa.created_at DESC LIMIT 1;

    IF v_program_assignment.id IS NOT NULL THEN
      SELECT pp.current_day_number, pp.is_completed INTO v_program_progress
      FROM program_progress pp WHERE pp.program_assignment_id = v_program_assignment.id;

      IF NOT COALESCE(v_program_progress.is_completed, false) THEN
        WITH week_numbers AS (
          SELECT DISTINCT week_number FROM program_schedule
          WHERE program_id = v_program_assignment.program_id ORDER BY week_number
        ),
        indexed_weeks AS (
          SELECT week_number, ROW_NUMBER() OVER (ORDER BY week_number) - 1 AS week_index FROM week_numbers
        ),
        current_week AS (
          SELECT week_number FROM indexed_weeks WHERE week_index = (v_resolver_week - 1)
        ),
        days_in_week AS (
          SELECT ps.id, ps.template_id, ps.week_number,
                 ROW_NUMBER() OVER (ORDER BY ps.day_of_week) - 1 AS day_index
          FROM program_schedule ps
          WHERE ps.program_id = v_program_assignment.program_id
            AND ps.week_number = (SELECT week_number FROM current_week)
        )
        SELECT diw.id AS schedule_id, diw.template_id, diw.week_number, diw.day_index,
               wt.name AS template_name, wt.estimated_duration,
               (SELECT COUNT(*) FROM workout_set_entries WHERE template_id = diw.template_id) AS total_sets
        INTO v_schedule_row
        FROM days_in_week diw
        LEFT JOIN workout_templates wt ON wt.id = diw.template_id
        WHERE diw.day_index = COALESCE(v_program_progress.current_day_number - 1, 0);

        IF v_schedule_row IS NOT NULL THEN
          v_todays_workout := jsonb_build_object(
            'hasWorkout', true, 'type', 'program',
            'templateId', v_schedule_row.template_id, 'scheduleId', v_schedule_row.schedule_id,
            'name', COALESCE(v_schedule_row.template_name, v_program_assignment.program_name),
            'weekNumber', v_schedule_row.week_number, 'dayNumber', v_schedule_row.day_index + 1,
            'totalSets', COALESCE(v_schedule_row.total_sets, 0),
            'estimatedDuration', COALESCE(v_schedule_row.estimated_duration, 45)
          );
        END IF;
      END IF;
    END IF;

    IF v_todays_workout IS NULL THEN
      SELECT jsonb_build_object(
        'hasWorkout', true, 'type', 'assignment', 'assignmentId', wa.id,
        'templateId', wa.workout_template_id, 'name', COALESCE(wa.name, wt.name, 'Workout'),
        'totalSets', (SELECT COUNT(*) FROM workout_set_entries WHERE template_id = wa.workout_template_id),
        'estimatedDuration', COALESCE(wt.estimated_duration, 45)
      ) INTO v_todays_workout
      FROM workout_assignments wa
      LEFT JOIN workout_templates wt ON wt.id = wa.workout_template_id
      WHERE wa.client_id = v_client_id AND wa.status IN ('assigned', 'active')
      ORDER BY wa.scheduled_date DESC NULLS LAST, wa.created_at DESC LIMIT 1;
    END IF;

    IF v_todays_workout IS NULL THEN
      v_todays_workout := jsonb_build_object('hasWorkout', false, 'message', 'No workout assigned');
    END IF;
  END;

  -- programProgress: X/N from resolver (N = instance phases). Slots +
  -- completions are instance-keyed (coach-skips excluded from completed).
  IF v_active_pa_id IS NOT NULL AND v_active_prog_id IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO v_prog_total_slots
    FROM program_day_assignments
    WHERE program_assignment_id = v_active_pa_id
      AND COALESCE(is_optional, false) = false;
    SELECT COUNT(DISTINCT pdc.program_day_assignment_id)::INT INTO v_prog_completed_count
    FROM program_day_completions pdc
    WHERE pdc.program_assignment_id = v_active_pa_id
      AND pdc.program_day_assignment_id IS NOT NULL
      AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%';
    v_prog_total_slots := COALESCE(v_prog_total_slots, 0);
    v_prog_completed_count := COALESCE(v_prog_completed_count, 0);
    v_program_progress := jsonb_build_object(
      'currentWeek', COALESCE(v_resolver_week, 1),
      'totalWeeks', COALESCE(v_resolver_total, 0),
      'completedCount', v_prog_completed_count,
      'totalSlots', v_prog_total_slots,
      'percent', CASE WHEN v_prog_total_slots > 0 THEN ROUND((v_prog_completed_count::NUMERIC / v_prog_total_slots) * 100)::INT ELSE 0 END
    );
  ELSE
    v_program_progress := NULL;
  END IF;

  v_result := jsonb_build_object(
    'avatarUrl', v_avatar_url, 'firstName', v_first_name, 'clientType', v_client_type,
    'nextSession', v_next_session, 'streak', v_streak,
    'weeklyProgress', jsonb_build_object('current', v_weekly_current, 'goal', v_weekly_goal),
    'weeklyStats', jsonb_build_object('volume', v_weekly_volume, 'time', v_weekly_time, 'prsCount', v_prs_count),
    'workoutDays', v_workout_days,
    'bodyWeight', CASE WHEN v_body_weight_current IS NOT NULL THEN
      jsonb_build_object('current', v_body_weight_current, 'change', COALESCE(v_body_weight_change, 0)) ELSE NULL END,
    'todaysWorkout', v_todays_workout,
    'todayWellnessLog', v_today_wellness,
    'checkinStreak', v_checkin_streak,
    'highlights', jsonb_build_object(
      'prsThisMonth', COALESCE(v_prs_this_month, 0),
      'latestAchievement', v_latest_achievement,
      'bestLeaderboardRank', v_best_leaderboard
    ),
    'athleteScore', v_athlete_score,
    'scoreHistory', v_score_history,
    'programProgress', v_program_progress
  );
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_dashboard() TO authenticated;
COMMENT ON FUNCTION public.get_client_dashboard() IS
'Client dashboard. weeklyProgress + programProgress X/N from get_program_instance_week (N = instance phases) and instance_adherence_for_week (instance-keyed, coach-skip excluded). Streak stays date-based. todaysWorkout week from resolver.';

-- ---------------------------------------------------------------------
-- get_gym_console_status: current_week from the resolver; next_workout +
-- program_completed re-keyed to the instance schedule
-- (program_day_assignments + program_day_assignment_id, coach-skip
-- excluded). Counts come from the instance group model (no workout_blocks,
-- which also removes the old 42P01 fallback path). current_day stays a
-- pointer from program_progress.
-- ---------------------------------------------------------------------
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
DECLARE
  v_coach_id uuid := auth.uid();
BEGIN
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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
        (SELECT wp.name FROM workout_programs wp WHERE wp.id = apa.program_id) AS program_name,
        apa.id AS program_assignment_id,
        -- Next slot: first INSTANCE slot with no non-skip completion.
        (SELECT row_to_json(nw) FROM (
          SELECT
            pda.id AS schedule_id,
            pda.program_instance_workout_id AS template_id,
            COALESCE(piw.name, pda.name, 'Workout') AS template_name,
            apa.id AS program_assignment_id,
            (SELECT COUNT(*)::int FROM program_instance_set_entries pise
              WHERE pise.program_instance_workout_id = pda.program_instance_workout_id) AS block_count,
            (SELECT COUNT(*)::int FROM program_instance_set_entry_exercises pisee
               JOIN program_instance_set_entries pise2 ON pise2.id = pisee.program_instance_set_entry_id
              WHERE pise2.program_instance_workout_id = pda.program_instance_workout_id) AS exercise_count
          FROM program_day_assignments pda
          LEFT JOIN program_instance_workouts piw ON piw.id = pda.program_instance_workout_id
          WHERE pda.program_assignment_id = apa.id
            AND NOT EXISTS (
              SELECT 1 FROM program_day_completions pdc
              WHERE pdc.program_day_assignment_id = pda.id
                AND pdc.program_assignment_id = apa.id
                AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%'
            )
          ORDER BY pda.week_number ASC, pda.program_day ASC
          LIMIT 1
        ) nw) AS next_workout,
        -- Current week from the canonical resolver (N = instance phases).
        rw.current_week AS current_week,
        -- Current day pointer (until step 8).
        (SELECT pp.current_day_number FROM program_progress pp
         WHERE pp.program_assignment_id = apa.id LIMIT 1) AS current_day,
        CASE
          WHEN apa.id IS NULL THEN 'no_program'::text
          WHEN NOT EXISTS (
            SELECT 1 FROM program_day_assignments pda
            WHERE pda.program_assignment_id = apa.id
              AND NOT EXISTS (
                SELECT 1 FROM program_day_completions pdc
                WHERE pdc.program_day_assignment_id = pda.id
                  AND pdc.program_assignment_id = apa.id
                  AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%'
              )
          ) THEN 'program_completed'::text
          WHEN NOT EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.client_id = cl.client_id AND ws.status = 'in_progress')
            THEN 'no_session'::text
          ELSE 'active_session'::text
        END AS status
      FROM clients cl
      JOIN profiles p ON p.id = cl.client_id
      LEFT JOIN LATERAL (
        SELECT pa.id, pa.program_id
        FROM program_assignments pa
        WHERE pa.client_id = cl.client_id AND pa.status = 'active'
        ORDER BY pa.updated_at DESC NULLS LAST, pa.created_at DESC
        LIMIT 1
      ) apa ON true
      LEFT JOIN LATERAL (
        SELECT current_week, total_weeks
        FROM public.get_program_instance_week(apa.id, NULL)
      ) rw ON true
      WHERE cl.coach_id = v_coach_id
        AND cl.client_id = ANY(p_client_ids)
        AND cl.status = 'active'
    ) client_status
  );
END;
$$;

COMMENT ON FUNCTION public.get_gym_console_status(uuid, uuid[]) IS
'Gym console status. current_week from get_program_instance_week (N = instance phases). next_workout + program_completed are instance-keyed (program_day_assignments + program_day_assignment_id, coach-skip excluded). Counts from the instance group model. current_day is a pointer from program_progress. Coach scope bound to auth.uid().';

GRANT EXECUTE ON FUNCTION public.get_gym_console_status(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_gym_console_status(uuid, uuid[]) TO service_role;

-- ---------------------------------------------------------------------
-- get_client_workout_summary: currentProgram + weeklyProgress re-pointed
-- to the canonical resolver + instance-keyed adherence. todaysWorkout week
-- from the resolver (day pointer still from program_progress until step 8).
-- Everything else identical to 20260202_client_summary_rpc.sql.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_client_workout_summary();

CREATE OR REPLACE FUNCTION public.get_client_workout_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_result JSONB;
  v_avatar_url TEXT;
  v_todays_workout JSONB;
  v_current_program JSONB;
  v_weekly_progress JSONB;
  v_weekly_stats JSONB;
  v_all_time_volume NUMERIC;
  v_workout_history JSONB;
  v_all_assigned_workouts JSONB;
  v_this_week_assignments JSONB;
  v_completed_programs JSONB;
  v_assignment_id_by_template JSONB;
  v_schedule_id_by_template JSONB;
  v_monday DATE;
  v_sunday DATE;
  v_active_program_assignment RECORD;
  v_program_progress RECORD;
  v_current_schedule_row RECORD;
  -- canonical resolver state
  v_resolver_week INT;
  v_resolver_total INT;
  v_adh RECORD;
BEGIN
  v_client_id := auth.uid();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_monday := date_trunc('week', CURRENT_DATE)::DATE;
  v_sunday := v_monday + INTERVAL '6 days';

  SELECT avatar_url INTO v_avatar_url FROM profiles WHERE id = v_client_id;

  SELECT
    pa.id, pa.program_id, pa.coach_id, pa.name, pa.description, pa.status,
    pa.start_date, pa.duration_weeks,
    wp.name AS program_name, wp.description AS program_description,
    wp.difficulty_level, wp.duration_weeks AS program_duration_weeks
  INTO v_active_program_assignment
  FROM program_assignments pa
  LEFT JOIN workout_programs wp ON wp.id = pa.program_id
  WHERE pa.client_id = v_client_id AND pa.status = 'active'
  ORDER BY pa.created_at DESC
  LIMIT 1;

  -- Canonical Week X of N (N = instance phases).
  IF v_active_program_assignment.id IS NOT NULL THEN
    SELECT current_week, total_weeks
    INTO v_resolver_week, v_resolver_total
    FROM public.get_program_instance_week(v_active_program_assignment.id, NULL);
    v_resolver_week := COALESCE(v_resolver_week, 1);
    v_resolver_total := COALESCE(v_resolver_total, 0);

    SELECT pp.id, pp.current_week_index, pp.current_day_index, pp.is_completed
    INTO v_program_progress
    FROM program_progress pp
    WHERE pp.program_assignment_id = v_active_program_assignment.id;

    -- todaysWorkout schedule row: resolver week + program_progress day pointer.
    IF NOT COALESCE(v_program_progress.is_completed, false) THEN
      WITH week_numbers AS (
        SELECT DISTINCT week_number FROM program_schedule
        WHERE program_id = v_active_program_assignment.program_id ORDER BY week_number
      ),
      indexed_weeks AS (
        SELECT week_number, ROW_NUMBER() OVER (ORDER BY week_number) - 1 AS week_index FROM week_numbers
      ),
      current_week AS (
        SELECT week_number FROM indexed_weeks WHERE week_index = (v_resolver_week - 1)
      ),
      days_in_week AS (
        SELECT ps.id, ps.template_id, ps.week_number, ps.day_of_week,
               ROW_NUMBER() OVER (ORDER BY ps.day_of_week) - 1 AS day_index
        FROM program_schedule ps
        WHERE ps.program_id = v_active_program_assignment.program_id
          AND ps.week_number = (SELECT week_number FROM current_week)
      )
      SELECT diw.id AS schedule_id, diw.template_id, diw.week_number, diw.day_of_week,
             diw.day_index, wt.name AS template_name, wt.description AS template_description,
             wt.estimated_duration
      INTO v_current_schedule_row
      FROM days_in_week diw
      LEFT JOIN workout_templates wt ON wt.id = diw.template_id
      WHERE diw.day_index = COALESCE(v_program_progress.current_day_index, 0);
    END IF;
  END IF;

  IF v_current_schedule_row.schedule_id IS NOT NULL THEN
    v_todays_workout := jsonb_build_object(
      'hasWorkout', true,
      'templateId', v_current_schedule_row.template_id,
      'scheduleId', v_current_schedule_row.schedule_id,
      'templateName', COALESCE(v_active_program_assignment.program_name, 'Program'),
      'templateDescription', '',
      'weekNumber', v_current_schedule_row.week_number,
      'programDay', v_current_schedule_row.day_index + 1,
      'estimatedDuration', COALESCE(v_current_schedule_row.estimated_duration, 45),
      'message', 'Week ' || v_resolver_week || ' • Day ' || (v_current_schedule_row.day_index + 1) || ' ready!',
      'weekLabel', 'Week ' || v_resolver_week,
      'dayLabel', 'Day ' || (v_current_schedule_row.day_index + 1),
      'currentWeekIndex', GREATEST(0, v_resolver_week - 1),
      'currentDayIndex', COALESCE(v_program_progress.current_day_index, 0)
    );
  ELSE
    SELECT jsonb_build_object(
      'hasWorkout', true,
      'templateId', wa.workout_template_id,
      'templateName', COALESCE(wa.name, 'Workout'),
      'templateDescription', COALESCE(wa.description, ''),
      'weekNumber', 1,
      'programDay', 1,
      'message', 'Workout ready!'
    ) INTO v_todays_workout
    FROM workout_assignments wa
    WHERE wa.client_id = v_client_id AND wa.status IN ('assigned', 'active')
    ORDER BY wa.scheduled_date DESC NULLS LAST, wa.created_at DESC
    LIMIT 1;

    IF v_todays_workout IS NULL THEN
      v_todays_workout := jsonb_build_object(
        'hasWorkout', false,
        'message', 'No active workout assigned. Contact your coach to get started!'
      );
    END IF;
  END IF;

  -- currentProgram: X/N from resolver, progress from instance slots/completions.
  IF v_active_program_assignment.id IS NOT NULL THEN
    DECLARE
      v_total_days INT;
      v_completed_days INT;
      v_progress_pct NUMERIC;
      v_coach_name TEXT;
    BEGIN
      SELECT COUNT(*) INTO v_total_days
      FROM program_day_assignments
      WHERE program_assignment_id = v_active_program_assignment.id
        AND COALESCE(is_optional, false) = false;

      SELECT COUNT(DISTINCT pdc.program_day_assignment_id) INTO v_completed_days
      FROM program_day_completions pdc
      WHERE pdc.program_assignment_id = v_active_program_assignment.id
        AND pdc.program_day_assignment_id IS NOT NULL
        AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%';

      IF v_total_days > 0 THEN
        v_progress_pct := ROUND((v_completed_days::NUMERIC / v_total_days) * 100, 1);
      ELSE
        v_progress_pct := 0;
      END IF;

      SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
      INTO v_coach_name FROM profiles WHERE id = v_active_program_assignment.coach_id;

      v_current_program := jsonb_build_object(
        'id', v_active_program_assignment.program_id,
        'name', COALESCE(v_active_program_assignment.program_name, 'Program'),
        'description', v_active_program_assignment.program_description,
        'current_week', v_resolver_week,
        'total_weeks', v_resolver_total,
        'progress_percentage', v_progress_pct,
        'difficulty_level', v_active_program_assignment.difficulty_level,
        'coach_name', COALESCE(NULLIF(v_coach_name, ''), 'Your Coach')
      );
    END;
  ELSE
    v_current_program := NULL;
  END IF;

  -- weeklyProgress = instance-keyed adherence for the resolver week
  -- (coach-skip excluded). weeklyStats from logs (calendar week).
  DECLARE
    v_weekly_goal INT := 0;
    v_weekly_completed INT := 0;
    v_weekly_volume NUMERIC := 0;
    v_weekly_time INT := 0;
  BEGIN
    SELECT
      COALESCE(SUM(wl.total_duration_minutes) FILTER (WHERE wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day'), 0)::INT,
      COALESCE(SUM(wl.total_weight_lifted) FILTER (WHERE wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day'), 0)::NUMERIC
    INTO v_weekly_time, v_weekly_volume
    FROM workout_logs wl
    WHERE wl.client_id = v_client_id AND wl.completed_at IS NOT NULL;

    IF v_active_program_assignment.id IS NOT NULL THEN
      SELECT required, completed INTO v_adh
      FROM public.instance_adherence_for_week(v_active_program_assignment.id, v_resolver_week);
      v_weekly_goal := COALESCE(v_adh.required, 0);
      v_weekly_completed := COALESCE(v_adh.completed, 0);
    END IF;

    IF v_weekly_goal = 0 AND v_active_program_assignment.id IS NULL THEN
      SELECT COUNT(*) INTO v_weekly_goal
      FROM workout_assignments
      WHERE client_id = v_client_id
        AND scheduled_date >= v_monday AND scheduled_date <= v_sunday;
      SELECT COUNT(*) INTO v_weekly_completed
      FROM workout_logs wl
      WHERE wl.client_id = v_client_id AND wl.completed_at IS NOT NULL
        AND wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day';
    END IF;

    v_weekly_progress := jsonb_build_object('current', v_weekly_completed, 'goal', v_weekly_goal);
    v_weekly_stats := jsonb_build_object('totalVolume', ROUND(v_weekly_volume), 'activeTime', v_weekly_time);
  END;

  SELECT COALESCE(SUM(total_weight_lifted), 0)::NUMERIC
  INTO v_all_time_volume
  FROM workout_logs
  WHERE client_id = v_client_id AND completed_at IS NOT NULL;

  SELECT COALESCE(jsonb_agg(history_row ORDER BY completed_at DESC), '[]'::jsonb)
  INTO v_workout_history
  FROM (
    SELECT jsonb_build_object(
      'hasWorkout', true,
      'templateId', wa.workout_template_id,
      'templateName', COALESCE(wa.name, 'Completed Workout'),
      'templateDescription', '',
      'weekNumber', 0,
      'programDay', 0,
      'estimatedDuration', wl.total_duration_minutes,
      'difficultyLevel', 'intermediate',
      'exercises', '[]'::jsonb,
      'generatedAt', wl.completed_at,
      'message', 'Workout completed',
      'completed', true,
      'completedAt', wl.completed_at
    ) AS history_row,
    wl.completed_at
    FROM workout_logs wl
    LEFT JOIN workout_assignments wa ON wa.id = wl.workout_assignment_id
    WHERE wl.client_id = v_client_id AND wl.completed_at IS NOT NULL
    ORDER BY wl.completed_at DESC
    LIMIT 7
  ) sub;

  WITH workout_assignments_enriched AS (
    SELECT wa.id, wa.workout_template_id, wa.scheduled_date, wa.assigned_date, wa.status,
      wa.name, wa.description, wa.coach_id, wa.created_at, 'workout' AS type,
      jsonb_build_object('id', wa.workout_template_id, 'name', COALESCE(wa.name, 'Workout'), 'description', wa.description) AS workout_templates,
      jsonb_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name, 'avatar_url', p.avatar_url) AS profiles
    FROM workout_assignments wa
    LEFT JOIN profiles p ON p.id = wa.coach_id
    WHERE wa.client_id = v_client_id AND wa.status IN ('assigned', 'active', 'in_progress')
  ),
  program_assignments_enriched AS (
    SELECT pa.id, pa.program_id AS workout_template_id, pa.start_date AS scheduled_date,
      pa.start_date AS assigned_date, pa.status, COALESCE(pa.name, wp.name) AS name,
      COALESCE(pa.description, wp.description) AS description, pa.coach_id, pa.created_at, 'program' AS type,
      jsonb_build_object('id', pa.program_id, 'name', COALESCE(pa.name, wp.name, 'Program'),
        'description', COALESCE(pa.description, wp.description),
        'duration_weeks', COALESCE(pa.duration_weeks, wp.duration_weeks)) AS workout_templates,
      jsonb_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name, 'avatar_url', p.avatar_url) AS profiles
    FROM program_assignments pa
    LEFT JOIN workout_programs wp ON wp.id = pa.program_id
    LEFT JOIN profiles p ON p.id = pa.coach_id
    WHERE pa.client_id = v_client_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', id, 'workout_template_id', workout_template_id, 'scheduled_date', scheduled_date,
      'assigned_date', assigned_date, 'status', status, 'name', name, 'description', description,
      'coach_id', coach_id, 'created_at', created_at, 'type', type,
      'workout_templates', workout_templates, 'profiles', profiles) ORDER BY created_at DESC
  ), '[]'::jsonb)
  INTO v_all_assigned_workouts
  FROM (SELECT * FROM workout_assignments_enriched UNION ALL SELECT * FROM program_assignments_enriched) combined;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', wa.id, 'workout_template_id', wa.workout_template_id, 'scheduled_date', wa.scheduled_date,
      'status', wa.status, 'name', wa.name, 'completed', wl.id IS NOT NULL,
      'completed_at', wl.completed_at, 'duration_minutes', wl.total_duration_minutes)
  ), '[]'::jsonb)
  INTO v_this_week_assignments
  FROM workout_assignments wa
  LEFT JOIN workout_logs wl ON wl.workout_assignment_id = wa.id
    AND wl.completed_at IS NOT NULL AND wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day'
  WHERE wa.client_id = v_client_id AND wa.scheduled_date >= v_monday AND wa.scheduled_date <= v_sunday;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', pa.id, 'program_id', pa.program_id, 'name', COALESCE(pa.name, wp.name), 'completed_at', pa.updated_at)
  ), '[]'::jsonb)
  INTO v_completed_programs
  FROM program_assignments pa
  LEFT JOIN workout_programs wp ON wp.id = pa.program_id
  WHERE pa.client_id = v_client_id AND pa.status = 'completed';

  SELECT COALESCE(jsonb_object_agg(workout_template_id, id), '{}'::jsonb)
  INTO v_assignment_id_by_template
  FROM workout_assignments
  WHERE client_id = v_client_id AND status IN ('assigned', 'active', 'in_progress');

  IF v_current_schedule_row.schedule_id IS NOT NULL THEN
    v_schedule_id_by_template := jsonb_build_object(
      v_current_schedule_row.template_id::TEXT, v_current_schedule_row.schedule_id
    );
  ELSE
    v_schedule_id_by_template := '{}'::jsonb;
  END IF;

  v_result := jsonb_build_object(
    'avatarUrl', v_avatar_url,
    'todaysWorkout', v_todays_workout,
    'currentProgram', v_current_program,
    'workoutHistory', v_workout_history,
    'completedPrograms', v_completed_programs,
    'upcomingWorkouts', '[]'::jsonb,
    'allAssignedWorkouts', v_all_assigned_workouts,
    'weeklyProgress', v_weekly_progress,
    'weeklyStats', v_weekly_stats,
    'allTimeVolume', ROUND(v_all_time_volume),
    'thisWeekAssignments', v_this_week_assignments,
    'assignmentIdByTemplate', v_assignment_id_by_template,
    'scheduleIdByTemplate', v_schedule_id_by_template
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_workout_summary() TO authenticated;
COMMENT ON FUNCTION public.get_client_workout_summary() IS
'Client workout summary. currentProgram + weeklyProgress X/N from get_program_instance_week (N = instance phases) and instance_adherence_for_week (instance-keyed, coach-skip excluded). todaysWorkout week from resolver, day pointer from program_progress.';

-- ---------------------------------------------------------------------
-- Smoke test (replace with a real active assignment id):
--   SELECT * FROM public.instance_adherence_for_week('<assignment-uuid>'::uuid, 1);
--   SELECT public.get_train_page_data('<client-uuid>'::uuid, 1);
--   SELECT public.get_coach_client_training('<client-uuid>'::uuid);
--   SELECT public.get_client_dashboard();             -- run as the client (auth.uid())
--   SELECT public.get_client_workout_summary();       -- run as the client (auth.uid())
--   SELECT public.get_gym_console_status(auth.uid(), ARRAY['<client-uuid>']::uuid[]);
-- ---------------------------------------------------------------------

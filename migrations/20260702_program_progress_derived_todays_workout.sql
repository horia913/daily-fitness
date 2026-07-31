-- =============================================================================
-- Step 12 — program_progress migration Part 2 (ONE-PASTE for Supabase SQL editor)
-- Derive "today's workout" from the global next incomplete slot (option a).
-- Stops reading/writing program_progress; table retained for gated drop.
-- Prerequisite: get_program_instance_week, instance_adherence_for_week (20260701).
-- =============================================================================

-- ---------------------------------------------------------------------
-- Shared helper: first incomplete program_day_assignments row
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_next_incomplete_program_slot(p_assignment_id uuid)
RETURNS TABLE (
  schedule_id uuid,
  template_id uuid,
  week_number integer,
  program_day integer,
  template_name text,
  template_description text,
  estimated_duration integer,
  total_sets bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pda.id AS schedule_id,
    COALESCE(pda.workout_template_id, pda.program_instance_workout_id) AS template_id,
    pda.week_number,
    pda.program_day,
    COALESCE(wt.name, piw.name, pda.name) AS template_name,
    COALESCE(wt.description, piw.description, '') AS template_description,
    COALESCE(wt.estimated_duration, piw.estimated_duration)::integer AS estimated_duration,
    CASE
      WHEN pda.program_instance_workout_id IS NOT NULL THEN (
        SELECT COUNT(*)
        FROM program_instance_set_entries pise
        WHERE pise.program_instance_workout_id = pda.program_instance_workout_id
      )
      ELSE (
        SELECT COUNT(*)
        FROM workout_set_entries wse
        WHERE wse.template_id = pda.workout_template_id
      )
    END AS total_sets
  FROM program_day_assignments pda
  LEFT JOIN workout_templates wt ON wt.id = pda.workout_template_id
  LEFT JOIN program_instance_workouts piw ON piw.id = pda.program_instance_workout_id
  WHERE p_assignment_id IS NOT NULL
    AND pda.program_assignment_id = p_assignment_id
    AND NOT EXISTS (
      SELECT 1
      FROM program_day_completions pdc
      WHERE pdc.program_day_assignment_id = pda.id
        AND pdc.program_assignment_id = p_assignment_id
        AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%'
    )
  ORDER BY pda.week_number ASC, pda.program_day ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_incomplete_program_slot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_incomplete_program_slot(uuid) TO service_role;
COMMENT ON FUNCTION public.get_next_incomplete_program_slot(uuid) IS
  'Next due program slot: first program_day_assignments row with no non-coach-skip completion, ordered by week_number, program_day.';
-- ---------------------------------------------------------------------
-- 6) get_client_dashboard — streak + todaysWorkout instance-keyed
--    (Base: step-6 body; streak filter + todaysWorkout from program_day_assignments)
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
        AND ws.program_day_assignment_id IS NOT NULL
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

  -- todaysWorkout: global next incomplete instance slot (no program_progress pointer).
  DECLARE
    v_program_assignment RECORD;
    v_schedule_row RECORD;
  BEGIN
    SELECT pa.id, pa.program_id, pa.name AS program_name INTO v_program_assignment
    FROM program_assignments pa
    WHERE pa.client_id = v_client_id AND pa.status = 'active'
    ORDER BY pa.created_at DESC LIMIT 1;

    IF v_program_assignment.id IS NOT NULL THEN
      SELECT
        slot.schedule_id,
        slot.template_id,
        slot.week_number,
        slot.program_day AS day_number,
        slot.template_name,
        slot.estimated_duration,
        slot.total_sets
      INTO v_schedule_row
      FROM public.get_next_incomplete_program_slot(v_program_assignment.id) slot;

      IF v_schedule_row.schedule_id IS NOT NULL THEN
        v_todays_workout := jsonb_build_object(
          'hasWorkout', true, 'type', 'program',
          'templateId', v_schedule_row.template_id, 'scheduleId', v_schedule_row.schedule_id,
          'name', COALESCE(v_schedule_row.template_name, v_program_assignment.program_name),
          'weekNumber', v_schedule_row.week_number, 'dayNumber', v_schedule_row.day_number,
          'totalSets', COALESCE(v_schedule_row.total_sets, 0),
          'estimatedDuration', COALESCE(v_schedule_row.estimated_duration, 45)
        );
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
  'Client dashboard. weeklyProgress + programProgress from get_program_instance_week and instance_adherence_for_week. todaysWorkout = get_next_incomplete_program_slot (ledger-derived).';
--     (Base: step-6 body; only todaysWorkout slot migrated off program_schedule)
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
  v_current_schedule_row RECORD;
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
    pa.start_date,
    wp.name AS program_name, wp.description AS program_description,
    wp.difficulty_level
  INTO v_active_program_assignment
  FROM program_assignments pa
  LEFT JOIN workout_programs wp ON wp.id = pa.program_id
  WHERE pa.client_id = v_client_id AND pa.status = 'active'
  ORDER BY pa.created_at DESC
  LIMIT 1;

  IF v_active_program_assignment.id IS NOT NULL THEN
    SELECT current_week, total_weeks
    INTO v_resolver_week, v_resolver_total
    FROM public.get_program_instance_week(v_active_program_assignment.id, NULL);
    v_resolver_week := COALESCE(v_resolver_week, 1);
    v_resolver_total := COALESCE(v_resolver_total, 0);

    SELECT
      slot.schedule_id,
      slot.template_id,
      slot.week_number,
      slot.program_day AS day_of_week,
      (slot.program_day - 1) AS day_index,
      slot.template_name,
      slot.template_description,
      slot.estimated_duration
    INTO v_current_schedule_row
    FROM public.get_next_incomplete_program_slot(v_active_program_assignment.id) slot;
  END IF;

  IF v_current_schedule_row.schedule_id IS NOT NULL THEN
    v_todays_workout := jsonb_build_object(
      'hasWorkout', true,
      'templateId', v_current_schedule_row.template_id,
      'scheduleId', v_current_schedule_row.schedule_id,
      'templateName', COALESCE(v_active_program_assignment.program_name, 'Program'),
      'templateDescription', '',
      'weekNumber', v_current_schedule_row.week_number,
      'programDay', v_current_schedule_row.day_of_week,
      'estimatedDuration', COALESCE(v_current_schedule_row.estimated_duration, 45),
      'message', 'Week ' || v_current_schedule_row.week_number || ' • Day ' || v_current_schedule_row.day_of_week || ' ready!',
      'weekLabel', 'Week ' || v_current_schedule_row.week_number,
      'dayLabel', 'Day ' || v_current_schedule_row.day_of_week,
      'currentWeekIndex', GREATEST(0, v_current_schedule_row.week_number - 1),
      'currentDayIndex', GREATEST(0, v_current_schedule_row.day_of_week - 1)
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
        'duration_weeks', COALESCE(wk.total_weeks, 0)) AS workout_templates,
      jsonb_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name, 'avatar_url', p.avatar_url) AS profiles
    FROM program_assignments pa
    LEFT JOIN workout_programs wp ON wp.id = pa.program_id
    LEFT JOIN profiles p ON p.id = pa.coach_id
    CROSS JOIN LATERAL public.get_program_instance_week(pa.id, NULL) wk
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
  'Client workout summary. todaysWorkout = get_next_incomplete_program_slot. currentProgram/weeklyProgress instance-keyed via resolver.';

-- ---------------------------------------------------------------------
-- get_gym_console_status — current_day from next incomplete slot
-- ---------------------------------------------------------------------
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
        (SELECT row_to_json(nw) FROM (
          SELECT
            next_slot.schedule_id,
            next_slot.template_id,
            next_slot.template_name,
            apa.id AS program_assignment_id,
            next_slot.program_day,
            (SELECT COUNT(*)::int FROM program_instance_set_entries pise
             INNER JOIN program_day_assignments pda_i ON pda_i.id = next_slot.schedule_id
             WHERE pise.program_instance_workout_id = pda_i.program_instance_workout_id) AS block_count,
            (SELECT COUNT(*)::int FROM program_instance_set_entry_exercises pisee
             JOIN program_instance_set_entries pise2 ON pise2.id = pisee.program_instance_set_entry_id
             INNER JOIN program_day_assignments pda_i2 ON pda_i2.id = next_slot.schedule_id
             WHERE pise2.program_instance_workout_id = pda_i2.program_instance_workout_id) AS exercise_count
        ) nw) AS next_workout,
        rw.current_week AS current_week,
        next_slot.program_day AS current_day,
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
      LEFT JOIN LATERAL (
        SELECT *
        FROM public.get_next_incomplete_program_slot(apa.id)
      ) next_slot ON apa.id IS NOT NULL
      WHERE cl.coach_id = v_coach_id
        AND cl.client_id = ANY(p_client_ids)
        AND cl.status = 'active'
    ) client_status
  );
END;
$$;

COMMENT ON FUNCTION public.get_gym_console_status(uuid, uuid[]) IS
  'Gym console status. current_week from get_program_instance_week. next_workout + current_day from get_next_incomplete_program_slot. program_completed derived from ledger.';

GRANT EXECUTE ON FUNCTION public.get_gym_console_status(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_gym_console_status(uuid, uuid[]) TO service_role;


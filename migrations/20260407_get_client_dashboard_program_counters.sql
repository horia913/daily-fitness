-- ============================================================================
-- Option C: Dashboard workout streak + weeklyProgress from program_schedule
-- and program-linked completed workout_sessions only (no calendar-week
-- workout_assignments fallback for Y; extras excluded from X/Y and streak).
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_client_dashboard();

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
  v_prog_assignment_id UUID;
  v_prog_program_id UUID;
  v_prog_current_week INT;
  v_prog_total_weeks INT;
  v_prog_total_slots INT;
  v_prog_completed_count INT;
  v_program_progress JSONB;
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

  -- Option C: streak + weekly X/Y — active program only; program-linked sessions only
  DECLARE
    v_pa_id UUID;
    v_prog_id UUID;
    v_pp_week INT;
  BEGIN
    SELECT pa.id, pa.program_id, pp.current_week_number
    INTO v_pa_id, v_prog_id, v_pp_week
    FROM program_assignments pa
    LEFT JOIN program_progress pp ON pp.program_assignment_id = pa.id
    WHERE pa.client_id = v_client_id AND pa.status = 'active'
    ORDER BY pa.created_at DESC LIMIT 1;

    IF v_pa_id IS NULL OR v_prog_id IS NULL THEN
      v_streak := 0;
      v_weekly_current := 0;
      v_weekly_goal := 0;
    ELSE
      WITH week_numbers AS (
        SELECT DISTINCT week_number FROM program_schedule
        WHERE program_id = v_prog_id ORDER BY week_number
      ),
      indexed_weeks AS (
        SELECT week_number, ROW_NUMBER() OVER (ORDER BY week_number) - 1 AS week_index FROM week_numbers
      ),
      current_week AS (
        SELECT week_number FROM indexed_weeks WHERE week_index = COALESCE(v_pp_week - 1, 0)
      ),
      goal_cnt AS (
        SELECT COUNT(*)::INT AS c FROM program_schedule ps
        WHERE ps.program_id = v_prog_id
          AND ps.week_number = (SELECT week_number FROM current_week)
      ),
      cur_cnt AS (
        SELECT COUNT(*)::INT AS c FROM workout_sessions ws
        WHERE ws.client_id = v_client_id
          AND ws.status = 'completed'
          AND ws.completed_at IS NOT NULL
          AND ws.program_assignment_id = v_pa_id
          AND ws.program_schedule_id IS NOT NULL
          AND ws.program_schedule_id IN (
            SELECT ps.id FROM program_schedule ps
            WHERE ps.program_id = v_prog_id
              AND ps.week_number = (SELECT week_number FROM current_week)
          )
      )
      SELECT (SELECT c FROM goal_cnt), (SELECT c FROM cur_cnt)
      INTO v_weekly_goal, v_weekly_current;

      v_weekly_goal := COALESCE(v_weekly_goal, 0);
      v_weekly_current := COALESCE(v_weekly_current, 0);

      WITH workout_dates AS (
        SELECT DISTINCT DATE(ws.completed_at) AS workout_date
        FROM workout_sessions ws
        WHERE ws.client_id = v_client_id
          AND ws.status = 'completed'
          AND ws.completed_at IS NOT NULL
          AND ws.program_assignment_id = v_pa_id
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
  END;

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

  SELECT row_to_json(as_row) INTO v_athlete_score
  FROM (
    SELECT score, tier, calculated_at, workout_completion_score, program_adherence_score,
           checkin_completion_score, goal_progress_score, nutrition_compliance_score
    FROM athlete_scores
    WHERE client_id = v_client_id
    ORDER BY calculated_at DESC
    LIMIT 1
  ) as_row;

  SELECT COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('date', (t.calculated_at::date)::text, 'score', t.score) ORDER BY t.calculated_at ASC)
     FROM (
       SELECT calculated_at, score
       FROM (
         SELECT calculated_at, score
         FROM athlete_scores
         WHERE client_id = v_client_id
         ORDER BY calculated_at DESC
         LIMIT 12
       ) sub
       ORDER BY calculated_at ASC
     ) t),
    '[]'::jsonb
  ) INTO v_score_history;

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
      SELECT pp.current_week_number, pp.current_day_number, pp.is_completed INTO v_program_progress
      FROM program_progress pp WHERE pp.program_assignment_id = v_program_assignment.id;

      IF v_program_progress IS NOT NULL AND NOT COALESCE(v_program_progress.is_completed, false) THEN
        WITH week_numbers AS (
          SELECT DISTINCT week_number FROM program_schedule
          WHERE program_id = v_program_assignment.program_id ORDER BY week_number
        ),
        indexed_weeks AS (
          SELECT week_number, ROW_NUMBER() OVER (ORDER BY week_number) - 1 AS week_index FROM week_numbers
        ),
        current_week AS (
          SELECT week_number FROM indexed_weeks WHERE week_index = COALESCE(v_program_progress.current_week_number - 1, 0)
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

  SELECT pa.id, pa.program_id, pp.current_week_number, COALESCE(pa.duration_weeks, wp.duration_weeks, 1)
  INTO v_prog_assignment_id, v_prog_program_id, v_prog_current_week, v_prog_total_weeks
  FROM program_assignments pa
  LEFT JOIN workout_programs wp ON wp.id = pa.program_id
  LEFT JOIN program_progress pp ON pp.program_assignment_id = pa.id
  WHERE pa.client_id = v_client_id AND pa.status = 'active'
  ORDER BY pa.created_at DESC LIMIT 1;

  IF v_prog_assignment_id IS NOT NULL AND v_prog_program_id IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO v_prog_total_slots FROM program_schedule WHERE program_id = v_prog_program_id;
    SELECT COUNT(*)::INT INTO v_prog_completed_count FROM program_day_completions WHERE program_assignment_id = v_prog_assignment_id;
    v_prog_total_slots := COALESCE(v_prog_total_slots, 0);
    v_prog_completed_count := COALESCE(v_prog_completed_count, 0);
    v_prog_current_week := COALESCE(v_prog_current_week, 1);
    v_prog_total_weeks := COALESCE(v_prog_total_weeks, 1);
    v_program_progress := jsonb_build_object(
      'currentWeek', v_prog_current_week,
      'totalWeeks', v_prog_total_weeks,
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
'Client dashboard: profile, streak + weeklyProgress from program_schedule and program-linked workout_sessions (Option C), weeklyStats from logs, programProgress, wellness, athlete score.';

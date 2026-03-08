-- ============================================================================
-- Migration: Fix dashboard and coach RPCs after workout_blocks → workout_set_entries rename
-- Date: 2026-03-11
-- Purpose:
--   After 20260228_phase1_block_to_set_entry_rename.sql, the table is
--   workout_set_entries (not workout_blocks) and columns are set_type, set_name,
--   set_order. workout_block_exercises → workout_set_entry_exercises, block_id → set_entry_id.
--   This migration updates get_client_dashboard and get_coach_pickup_workout
--   to use the new table and column names so they work on the current schema.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. get_client_dashboard: use workout_set_entries for total_sets counts
-- ----------------------------------------------------------------------------
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
BEGIN
  v_client_id := auth.uid();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_monday := date_trunc('week', CURRENT_DATE)::DATE;
  v_sunday := v_monday + INTERVAL '6 days';
  v_monday_ts := v_monday::TIMESTAMPTZ;
  v_sunday_ts := (v_sunday + INTERVAL '1 day')::TIMESTAMPTZ;

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

  WITH workout_dates AS (
    SELECT DISTINCT DATE(completed_at) AS workout_date
    FROM workout_logs
    WHERE client_id = v_client_id AND completed_at IS NOT NULL
    ORDER BY workout_date DESC
  ),
  streak_calc AS (
    SELECT workout_date,
           workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::INT AS grp
    FROM workout_dates
    WHERE workout_date >= CURRENT_DATE - INTERVAL '30 days'
  )
  SELECT COUNT(*) INTO v_streak
  FROM streak_calc
  WHERE grp = (SELECT grp FROM streak_calc WHERE workout_date = CURRENT_DATE OR workout_date = CURRENT_DATE - 1 LIMIT 1);
  v_streak := COALESCE(v_streak, 0);

  SELECT COUNT(*) INTO v_weekly_current
  FROM workout_logs
  WHERE client_id = v_client_id
    AND completed_at >= v_monday_ts AND completed_at < v_sunday_ts
    AND completed_at IS NOT NULL;

  DECLARE
    v_active_program_id UUID;
    v_current_week_number INT;
  BEGIN
    SELECT pa.program_id, pp.current_week_number INTO v_active_program_id, v_current_week_number
    FROM program_assignments pa
    LEFT JOIN program_progress pp ON pp.program_assignment_id = pa.id
    WHERE pa.client_id = v_client_id AND pa.status = 'active'
    ORDER BY pa.created_at DESC LIMIT 1;

    IF v_active_program_id IS NOT NULL THEN
      WITH week_numbers AS (
        SELECT DISTINCT week_number FROM program_schedule
        WHERE program_id = v_active_program_id ORDER BY week_number
      ),
      indexed_weeks AS (
        SELECT week_number, ROW_NUMBER() OVER (ORDER BY week_number) - 1 AS week_index FROM week_numbers
      ),
      current_week AS (
        SELECT week_number FROM indexed_weeks WHERE week_index = COALESCE(v_current_week_number - 1, 0)
      )
      SELECT COUNT(*) INTO v_weekly_goal FROM program_schedule
      WHERE program_id = v_active_program_id AND week_number = (SELECT week_number FROM current_week);
    END IF;

    IF v_weekly_goal = 0 OR v_weekly_goal IS NULL THEN
      SELECT COUNT(*) INTO v_weekly_goal FROM workout_assignments
      WHERE client_id = v_client_id AND scheduled_date >= v_monday AND scheduled_date <= v_sunday
        AND status IN ('assigned', 'active');
    END IF;
    v_weekly_goal := COALESCE(v_weekly_goal, 0);
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

  v_result := jsonb_build_object(
    'avatarUrl', v_avatar_url, 'firstName', v_first_name, 'clientType', v_client_type,
    'nextSession', v_next_session, 'streak', v_streak,
    'weeklyProgress', jsonb_build_object('current', v_weekly_current, 'goal', v_weekly_goal),
    'weeklyStats', jsonb_build_object('volume', v_weekly_volume, 'time', v_weekly_time, 'prsCount', v_prs_count),
    'workoutDays', v_workout_days,
    'bodyWeight', CASE WHEN v_body_weight_current IS NOT NULL THEN
      jsonb_build_object('current', v_body_weight_current, 'change', COALESCE(v_body_weight_change, 0)) ELSE NULL END,
    'todaysWorkout', v_todays_workout
  );
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_dashboard() TO authenticated;
COMMENT ON FUNCTION public.get_client_dashboard() IS
'Client dashboard data. Uses workout_set_entries (post-20260228 rename).';

-- ----------------------------------------------------------------------------
-- 2. get_coach_pickup_workout: use workout_set_entries, workout_set_entry_exercises, new column names
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_coach_pickup_workout(UUID);

CREATE OR REPLACE FUNCTION public.get_coach_pickup_workout(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id UUID;
  v_result JSONB;
  v_coach_profile RECORD;
  v_client_profile RECORD;
  v_client_relation RECORD;
  v_active_assignment RECORD;
  v_program_progress RECORD;
  v_current_schedule_row RECORD;
  v_template RECORD;
  v_blocks JSONB;
  v_week_label TEXT;
  v_day_label TEXT;
  v_total_weeks INT;
  v_days_in_current_week INT;
BEGIN
  v_coach_id := auth.uid();
  IF v_coach_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, role, first_name, last_name INTO v_coach_profile FROM profiles WHERE id = v_coach_id;
  IF v_coach_profile.id IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_coach_profile.role NOT IN ('coach', 'admin') THEN RAISE EXCEPTION 'Not authorized - must be coach or admin'; END IF;

  SELECT client_id, status INTO v_client_relation FROM clients WHERE coach_id = v_coach_id AND client_id = p_client_id;
  IF v_client_relation.client_id IS NULL THEN RAISE EXCEPTION 'Client not found or does not belong to this coach'; END IF;

  SELECT id, first_name, last_name, avatar_url INTO v_client_profile FROM profiles WHERE id = p_client_id;

  SELECT pa.id, pa.program_id, pa.client_id, pa.coach_id, pa.name, pa.status, pa.duration_weeks, pa.total_days, pa.created_at
  INTO v_active_assignment FROM program_assignments pa
  WHERE pa.client_id = p_client_id AND pa.status = 'active' ORDER BY pa.created_at DESC LIMIT 1;

  IF v_active_assignment.id IS NULL THEN
    RETURN jsonb_build_object('status', 'no_program', 'message', 'Client has no active program assignment', 'client_id', p_client_id,
      'client_name', TRIM(COALESCE(v_client_profile.first_name, '') || ' ' || COALESCE(v_client_profile.last_name, '')));
  END IF;

  SELECT program_assignment_id AS id, current_week_number, current_day_number, is_completed INTO v_program_progress
  FROM program_progress WHERE program_assignment_id = v_active_assignment.id;

  IF v_program_progress.id IS NULL THEN
    INSERT INTO program_progress (program_assignment_id, current_week_number, current_day_number, is_completed)
    VALUES (v_active_assignment.id, 1, 1, false)
    RETURNING program_assignment_id AS id, current_week_number, current_day_number, is_completed INTO v_program_progress;
  END IF;

  IF v_program_progress.is_completed THEN
    RETURN jsonb_build_object('status', 'completed', 'message', 'Program completed', 'client_id', p_client_id,
      'client_name', TRIM(COALESCE(v_client_profile.first_name, '') || ' ' || COALESCE(v_client_profile.last_name, '')),
      'program_assignment_id', v_active_assignment.id, 'program_id', v_active_assignment.program_id,
      'program_name', COALESCE(v_active_assignment.name, 'Program'),
      'current_week_index', COALESCE(v_program_progress.current_week_number - 1, 0),
      'current_day_index', COALESCE(v_program_progress.current_day_number - 1, 0), 'is_completed', true);
  END IF;

  WITH week_numbers AS (
    SELECT DISTINCT week_number FROM program_schedule WHERE program_id = v_active_assignment.program_id ORDER BY week_number
  ),
  indexed_weeks AS (SELECT week_number, ROW_NUMBER() OVER (ORDER BY week_number) - 1 AS week_index FROM week_numbers),
  current_week AS (SELECT week_number FROM indexed_weeks WHERE week_index = COALESCE(v_program_progress.current_week_number - 1, 0)),
  days_in_week AS (
    SELECT ps.id AS schedule_id, ps.program_id, ps.week_number, ps.day_of_week, ps.template_id,
           ROW_NUMBER() OVER (ORDER BY ps.day_of_week) - 1 AS day_index
    FROM program_schedule ps
    WHERE ps.program_id = v_active_assignment.program_id AND ps.week_number = (SELECT week_number FROM current_week)
  )
  SELECT diw.schedule_id, diw.program_id, diw.week_number, diw.day_of_week, diw.template_id, diw.day_index,
         (SELECT COUNT(*) FROM indexed_weeks) AS total_weeks, (SELECT COUNT(*) FROM days_in_week) AS days_in_week
  INTO v_current_schedule_row FROM days_in_week diw
  WHERE diw.day_index = COALESCE(v_program_progress.current_day_number - 1, 0);

  IF v_current_schedule_row.schedule_id IS NULL THEN
    DECLARE v_schedule_count INT;
    BEGIN
      SELECT COUNT(*) INTO v_schedule_count FROM program_schedule WHERE program_id = v_active_assignment.program_id;
      IF v_schedule_count = 0 THEN
        RETURN jsonb_build_object('error', 'Program schedule not configured', 'message', 'No training days found in program_schedule for this program.', 'program_id', v_active_assignment.program_id);
      ELSE
        RETURN jsonb_build_object('error', 'Invalid progress state', 'message', 'week_number=' || v_program_progress.current_week_number || ', day_number=' || v_program_progress.current_day_number || ' is out of bounds', 'total_weeks', v_current_schedule_row.total_weeks);
      END IF;
    END;
  END IF;

  v_total_weeks := v_current_schedule_row.total_weeks;
  v_days_in_current_week := v_current_schedule_row.days_in_week;

  SELECT id, name, description, estimated_duration INTO v_template FROM workout_templates WHERE id = v_current_schedule_row.template_id;

  -- Use workout_set_entries and workout_set_entry_exercises (post-20260228 rename); output keys stay block_type/block_name/block_order for API compatibility
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', wb.id, 'block_type', wb.set_type, 'block_name', wb.set_name, 'block_order', wb.set_order,
      'exercises', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object('id', wbe.id, 'exercise_id', wbe.exercise_id, 'exercise_name', e.name,
            'exercise_order', wbe.exercise_order, 'sets', wbe.sets, 'reps', wbe.reps,
            'weight_kg', wbe.weight_kg, 'rest_seconds', wbe.rest_seconds) ORDER BY wbe.exercise_order
        ), '[]'::jsonb)
        FROM workout_set_entry_exercises wbe
        LEFT JOIN exercises e ON e.id = wbe.exercise_id
        WHERE wbe.set_entry_id = wb.id
      )
    ) ORDER BY wb.set_order
  ), '[]'::jsonb)
  INTO v_blocks
  FROM workout_set_entries wb WHERE wb.template_id = v_current_schedule_row.template_id;

  v_week_label := 'Week ' || v_current_schedule_row.week_number;
  v_day_label := 'Day ' || (v_current_schedule_row.day_index + 1);

  v_result := jsonb_build_object(
    'status', 'active', 'client_id', p_client_id,
    'client_name', TRIM(COALESCE(v_client_profile.first_name, '') || ' ' || COALESCE(v_client_profile.last_name, '')),
    'client_avatar_url', v_client_profile.avatar_url, 'program_assignment_id', v_active_assignment.id,
    'program_id', v_active_assignment.program_id, 'program_name', COALESCE(v_active_assignment.name, 'Program'),
    'current_week_index', COALESCE(v_program_progress.current_week_number - 1, 0),
    'current_day_index', COALESCE(v_program_progress.current_day_number - 1, 0), 'is_completed', false,
    'week_label', v_week_label, 'day_label', v_day_label, 'position_label', v_week_label || ' • ' || v_day_label,
    'total_weeks', v_total_weeks, 'days_in_current_week', v_days_in_current_week,
    'template_id', v_current_schedule_row.template_id, 'workout_name', COALESCE(v_template.name, 'Workout'),
    'workout_description', v_template.description, 'estimated_duration', v_template.estimated_duration,
    'blocks', v_blocks
  );
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coach_pickup_workout(UUID) TO authenticated;
COMMENT ON FUNCTION public.get_coach_pickup_workout(UUID) IS
'Coach pickup workout. Uses workout_set_entries / workout_set_entry_exercises (post-20260228 rename).';

-- =============================================================================
-- SUPERSEDED — use migrations/20260702_program_progress_derived_todays_workout.sql
-- (includes duration fix + program_progress removal). Do not run this file.
-- =============================================================================
-- Step 12 Part 2 — ONE-PASTE (Supabase SQL editor)
-- Replaces get_client_workout_summary: program_assignments_enriched.duration_weeks
-- uses get_program_instance_week(pa.id, NULL).total_weeks (instance phase sum).
-- Prerequisite: get_program_instance_week() from 20260701 RPC migration.
-- =============================================================================
-- 6b) get_client_workout_summary â€” todaysWorkout from instance schedule
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
  v_program_progress RECORD;
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

    SELECT pp.current_week_number, pp.current_day_number, pp.is_completed
    INTO v_program_progress
    FROM program_progress pp
    WHERE pp.program_assignment_id = v_active_program_assignment.id;

    -- todaysWorkout: resolver week + instance schedule row (program_day_assignments.id).
    IF NOT COALESCE(v_program_progress.is_completed, false) THEN
      SELECT
        pda.id AS schedule_id,
        COALESCE(pda.workout_template_id, pda.program_instance_workout_id) AS template_id,
        pda.week_number,
        pda.program_day AS day_of_week,
        (pda.program_day - 1) AS day_index,
        COALESCE(wt.name, piw.name, pda.name) AS template_name,
        COALESCE(wt.description, piw.description, '') AS template_description,
        COALESCE(wt.estimated_duration, piw.estimated_duration) AS estimated_duration
      INTO v_current_schedule_row
      FROM program_day_assignments pda
      LEFT JOIN workout_templates wt ON wt.id = pda.workout_template_id
      LEFT JOIN program_instance_workouts piw ON piw.id = pda.program_instance_workout_id
      WHERE pda.program_assignment_id = v_active_program_assignment.id
        AND pda.week_number = v_resolver_week
        AND pda.program_day = COALESCE(v_program_progress.current_day_number, 1);
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
      'programDay', v_current_schedule_row.day_of_week,
      'estimatedDuration', COALESCE(v_current_schedule_row.estimated_duration, 45),
      'message', 'Week ' || v_resolver_week || ' â€¢ Day ' || v_current_schedule_row.day_of_week || ' ready!',
      'weekLabel', 'Week ' || v_resolver_week,
      'dayLabel', 'Day ' || v_current_schedule_row.day_of_week,
      'currentWeekIndex', GREATEST(0, v_resolver_week - 1),
      'currentDayIndex', GREATEST(0, COALESCE(v_program_progress.current_day_number, 1) - 1)
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
  'Client workout summary. todaysWorkout from program_day_assignments (instance id) at resolver week. currentProgram/weeklyProgress instance-keyed.';

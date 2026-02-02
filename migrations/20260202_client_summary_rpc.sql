-- ============================================================================
-- Migration: Client Workout Summary RPC
-- Purpose: Replace 20-25 individual queries with a single optimized RPC call
-- Target: /api/client/workouts/summary endpoint
-- Security: Uses auth.uid() internally - NO user ID parameter accepted
-- ============================================================================

-- Drop existing function if it exists (for idempotent migration)
DROP FUNCTION IF EXISTS public.get_client_workout_summary();

-- Create the comprehensive summary RPC
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
  
  -- Week boundaries (Monday-Sunday)
  v_monday DATE;
  v_sunday DATE;
  
  -- Program info
  v_active_program_assignment RECORD;
  v_program_progress RECORD;
  v_current_schedule_row RECORD;
BEGIN
  -- ========================================
  -- SECURITY: Get client ID from auth context
  -- ========================================
  v_client_id := auth.uid();
  
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- ========================================
  -- Calculate week boundaries (Monday-Sunday)
  -- ========================================
  v_monday := date_trunc('week', CURRENT_DATE)::DATE;
  v_sunday := v_monday + INTERVAL '6 days';
  
  -- ========================================
  -- 1. Get client avatar
  -- ========================================
  SELECT avatar_url INTO v_avatar_url
  FROM profiles
  WHERE id = v_client_id;
  
  -- ========================================
  -- 2. Get active program assignment (most recent)
  -- ========================================
  SELECT 
    pa.id,
    pa.program_id,
    pa.coach_id,
    pa.name,
    pa.description,
    pa.status,
    pa.start_date,
    pa.duration_weeks,
    wp.name AS program_name,
    wp.description AS program_description,
    wp.difficulty_level,
    wp.duration_weeks AS program_duration_weeks
  INTO v_active_program_assignment
  FROM program_assignments pa
  LEFT JOIN workout_programs wp ON wp.id = pa.program_id
  WHERE pa.client_id = v_client_id
    AND pa.status = 'active'
  ORDER BY pa.created_at DESC
  LIMIT 1;
  
  -- ========================================
  -- 3. Get program progress (if active program exists)
  -- ========================================
  IF v_active_program_assignment.id IS NOT NULL THEN
    SELECT 
      pp.id,
      pp.current_week_index,
      pp.current_day_index,
      pp.is_completed
    INTO v_program_progress
    FROM program_progress pp
    WHERE pp.program_assignment_id = v_active_program_assignment.id;
    
    -- Get current schedule row for the program
    IF v_program_progress.id IS NOT NULL AND NOT v_program_progress.is_completed THEN
      -- Get sorted week numbers and find current week_number
      WITH week_numbers AS (
        SELECT DISTINCT week_number
        FROM program_schedule
        WHERE program_id = v_active_program_assignment.program_id
        ORDER BY week_number
      ),
      indexed_weeks AS (
        SELECT week_number, ROW_NUMBER() OVER (ORDER BY week_number) - 1 AS week_index
        FROM week_numbers
      ),
      current_week AS (
        SELECT week_number FROM indexed_weeks
        WHERE week_index = v_program_progress.current_week_index
      ),
      days_in_week AS (
        SELECT ps.id, ps.template_id, ps.week_number, ps.day_of_week,
               ROW_NUMBER() OVER (ORDER BY ps.day_of_week) - 1 AS day_index
        FROM program_schedule ps
        WHERE ps.program_id = v_active_program_assignment.program_id
          AND ps.week_number = (SELECT week_number FROM current_week)
      )
      SELECT 
        diw.id AS schedule_id,
        diw.template_id,
        diw.week_number,
        diw.day_of_week,
        diw.day_index,
        wt.name AS template_name,
        wt.description AS template_description,
        wt.estimated_duration
      INTO v_current_schedule_row
      FROM days_in_week diw
      LEFT JOIN workout_templates wt ON wt.id = diw.template_id
      WHERE diw.day_index = v_program_progress.current_day_index;
    END IF;
  END IF;
  
  -- ========================================
  -- 4. Build today's workout info
  -- ========================================
  IF v_current_schedule_row.schedule_id IS NOT NULL THEN
    -- Program workout
    v_todays_workout := jsonb_build_object(
      'hasWorkout', true,
      'templateId', v_current_schedule_row.template_id,
      'scheduleId', v_current_schedule_row.schedule_id,
      'templateName', COALESCE(v_active_program_assignment.program_name, 'Program'),
      'templateDescription', '',
      'weekNumber', v_current_schedule_row.week_number,
      'programDay', v_current_schedule_row.day_index + 1,
      'estimatedDuration', COALESCE(v_current_schedule_row.estimated_duration, 45),
      'message', 'Week ' || v_current_schedule_row.week_number || ' • Day ' || (v_current_schedule_row.day_index + 1) || ' ready!',
      'weekLabel', 'Week ' || v_current_schedule_row.week_number,
      'dayLabel', 'Day ' || (v_current_schedule_row.day_index + 1),
      'currentWeekIndex', v_program_progress.current_week_index,
      'currentDayIndex', v_program_progress.current_day_index
    );
  ELSE
    -- Check for standalone workout assignments
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
    WHERE wa.client_id = v_client_id
      AND wa.status IN ('assigned', 'active')
    ORDER BY wa.scheduled_date DESC NULLS LAST, wa.created_at DESC
    LIMIT 1;
    
    IF v_todays_workout IS NULL THEN
      v_todays_workout := jsonb_build_object(
        'hasWorkout', false,
        'message', 'No active workout assigned. Contact your coach to get started!'
      );
    END IF;
  END IF;
  
  -- ========================================
  -- 5. Build current program info
  -- ========================================
  IF v_active_program_assignment.id IS NOT NULL THEN
    -- Calculate completion percentage from program_day_completions
    DECLARE
      v_total_days INT;
      v_completed_days INT;
      v_progress_pct NUMERIC;
      v_coach_name TEXT;
    BEGIN
      SELECT COUNT(*) INTO v_total_days
      FROM program_schedule
      WHERE program_id = v_active_program_assignment.program_id;
      
      SELECT COUNT(*) INTO v_completed_days
      FROM program_day_completions pdc
      WHERE pdc.program_assignment_id = v_active_program_assignment.id;
      
      IF v_total_days > 0 THEN
        v_progress_pct := ROUND((v_completed_days::NUMERIC / v_total_days) * 100, 1);
      ELSE
        v_progress_pct := 0;
      END IF;
      
      -- Get coach name
      SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
      INTO v_coach_name
      FROM profiles
      WHERE id = v_active_program_assignment.coach_id;
      
      v_current_program := jsonb_build_object(
        'id', v_active_program_assignment.program_id,
        'name', COALESCE(v_active_program_assignment.program_name, 'Program'),
        'description', v_active_program_assignment.program_description,
        'current_week', COALESCE(v_program_progress.current_week_index, 0) + 1,
        'total_weeks', COALESCE(v_active_program_assignment.program_duration_weeks, v_active_program_assignment.duration_weeks),
        'progress_percentage', v_progress_pct,
        'difficulty_level', v_active_program_assignment.difficulty_level,
        'coach_name', COALESCE(NULLIF(v_coach_name, ''), 'Your Coach')
      );
    END;
  ELSE
    v_current_program := NULL;
  END IF;
  
  -- ========================================
  -- 6. Get weekly progress and stats
  -- ========================================
  SELECT 
    COUNT(*) FILTER (WHERE wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day'),
    COALESCE(SUM(wl.total_duration_minutes) FILTER (WHERE wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day'), 0),
    COALESCE(SUM(wl.total_weight_lifted) FILTER (WHERE wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day'), 0),
    COALESCE(SUM(wl.total_weight_lifted), 0)
  INTO 
    v_weekly_progress,
    v_weekly_stats,
    v_all_time_volume
  FROM workout_logs wl
  WHERE wl.client_id = v_client_id
    AND wl.completed_at IS NOT NULL;
  
  -- Calculate weekly goal (from program schedule or assignments)
  DECLARE
    v_weekly_goal INT := 0;
    v_weekly_completed INT;
    v_weekly_volume NUMERIC;
    v_weekly_time INT;
  BEGIN
    -- Get counts from the query above
    SELECT 
      COUNT(*) FILTER (WHERE wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day'),
      COALESCE(SUM(wl.total_duration_minutes) FILTER (WHERE wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day'), 0)::INT,
      COALESCE(SUM(wl.total_weight_lifted) FILTER (WHERE wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day'), 0)::NUMERIC
    INTO v_weekly_completed, v_weekly_time, v_weekly_volume
    FROM workout_logs wl
    WHERE wl.client_id = v_client_id
      AND wl.completed_at IS NOT NULL;
    
    -- Get weekly goal from program schedule
    IF v_active_program_assignment.id IS NOT NULL AND v_program_progress.current_week_index IS NOT NULL THEN
      WITH week_numbers AS (
        SELECT DISTINCT week_number
        FROM program_schedule
        WHERE program_id = v_active_program_assignment.program_id
        ORDER BY week_number
      ),
      indexed_weeks AS (
        SELECT week_number, ROW_NUMBER() OVER (ORDER BY week_number) - 1 AS week_index
        FROM week_numbers
      ),
      current_week AS (
        SELECT week_number FROM indexed_weeks
        WHERE week_index = v_program_progress.current_week_index
      )
      SELECT COUNT(*) INTO v_weekly_goal
      FROM program_schedule ps
      WHERE ps.program_id = v_active_program_assignment.program_id
        AND ps.week_number = (SELECT week_number FROM current_week);
    END IF;
    
    -- Fallback to scheduled assignments count
    IF v_weekly_goal = 0 THEN
      SELECT COUNT(*) INTO v_weekly_goal
      FROM workout_assignments
      WHERE client_id = v_client_id
        AND scheduled_date >= v_monday
        AND scheduled_date <= v_sunday;
    END IF;
    
    v_weekly_progress := jsonb_build_object(
      'current', v_weekly_completed,
      'goal', v_weekly_goal
    );
    
    v_weekly_stats := jsonb_build_object(
      'totalVolume', ROUND(v_weekly_volume),
      'activeTime', v_weekly_time
    );
  END;
  
  -- Get all-time volume
  SELECT COALESCE(SUM(total_weight_lifted), 0)::NUMERIC
  INTO v_all_time_volume
  FROM workout_logs
  WHERE client_id = v_client_id
    AND completed_at IS NOT NULL;
  
  -- ========================================
  -- 7. Get workout history (last 7 completed)
  -- ========================================
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
    WHERE wl.client_id = v_client_id
      AND wl.completed_at IS NOT NULL
    ORDER BY wl.completed_at DESC
    LIMIT 7
  ) sub;
  
  -- ========================================
  -- 8. Get all assigned workouts (workouts + programs)
  -- ========================================
  WITH workout_assignments_enriched AS (
    SELECT 
      wa.id,
      wa.workout_template_id,
      wa.scheduled_date,
      wa.assigned_date,
      wa.status,
      wa.name,
      wa.description,
      wa.coach_id,
      wa.created_at,
      'workout' AS type,
      jsonb_build_object(
        'id', wa.workout_template_id,
        'name', COALESCE(wa.name, 'Workout'),
        'description', wa.description
      ) AS workout_templates,
      jsonb_build_object(
        'id', p.id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'avatar_url', p.avatar_url
      ) AS profiles
    FROM workout_assignments wa
    LEFT JOIN profiles p ON p.id = wa.coach_id
    WHERE wa.client_id = v_client_id
      AND wa.status IN ('assigned', 'active', 'in_progress')
  ),
  program_assignments_enriched AS (
    SELECT 
      pa.id,
      pa.program_id AS workout_template_id,
      pa.start_date AS scheduled_date,
      pa.start_date AS assigned_date,
      pa.status,
      COALESCE(pa.name, wp.name) AS name,
      COALESCE(pa.description, wp.description) AS description,
      pa.coach_id,
      pa.created_at,
      'program' AS type,
      jsonb_build_object(
        'id', pa.program_id,
        'name', COALESCE(pa.name, wp.name, 'Program'),
        'description', COALESCE(pa.description, wp.description),
        'duration_weeks', COALESCE(pa.duration_weeks, wp.duration_weeks)
      ) AS workout_templates,
      jsonb_build_object(
        'id', p.id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'avatar_url', p.avatar_url
      ) AS profiles
    FROM program_assignments pa
    LEFT JOIN workout_programs wp ON wp.id = pa.program_id
    LEFT JOIN profiles p ON p.id = pa.coach_id
    WHERE pa.client_id = v_client_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'workout_template_id', workout_template_id,
      'scheduled_date', scheduled_date,
      'assigned_date', assigned_date,
      'status', status,
      'name', name,
      'description', description,
      'coach_id', coach_id,
      'created_at', created_at,
      'type', type,
      'workout_templates', workout_templates,
      'profiles', profiles
    )
    ORDER BY created_at DESC
  ), '[]'::jsonb)
  INTO v_all_assigned_workouts
  FROM (
    SELECT * FROM workout_assignments_enriched
    UNION ALL
    SELECT * FROM program_assignments_enriched
  ) combined;
  
  -- ========================================
  -- 9. Get this week's assignments with completion status
  -- ========================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', wa.id,
      'workout_template_id', wa.workout_template_id,
      'scheduled_date', wa.scheduled_date,
      'status', wa.status,
      'name', wa.name,
      'completed', wl.id IS NOT NULL,
      'completed_at', wl.completed_at,
      'duration_minutes', wl.total_duration_minutes
    )
  ), '[]'::jsonb)
  INTO v_this_week_assignments
  FROM workout_assignments wa
  LEFT JOIN workout_logs wl ON wl.workout_assignment_id = wa.id 
    AND wl.completed_at IS NOT NULL
    AND wl.completed_at >= v_monday
    AND wl.completed_at <= v_sunday + INTERVAL '1 day'
  WHERE wa.client_id = v_client_id
    AND wa.scheduled_date >= v_monday
    AND wa.scheduled_date <= v_sunday;
  
  -- ========================================
  -- 10. Get completed programs
  -- ========================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', pa.id,
      'program_id', pa.program_id,
      'name', COALESCE(pa.name, wp.name),
      'completed_at', pa.updated_at
    )
  ), '[]'::jsonb)
  INTO v_completed_programs
  FROM program_assignments pa
  LEFT JOIN workout_programs wp ON wp.id = pa.program_id
  WHERE pa.client_id = v_client_id
    AND pa.status = 'completed';
  
  -- ========================================
  -- 11. Build lookup maps
  -- ========================================
  SELECT COALESCE(jsonb_object_agg(workout_template_id, id), '{}'::jsonb)
  INTO v_assignment_id_by_template
  FROM workout_assignments
  WHERE client_id = v_client_id
    AND status IN ('assigned', 'active', 'in_progress');
  
  -- Schedule ID by template (for program workouts)
  IF v_current_schedule_row.schedule_id IS NOT NULL THEN
    v_schedule_id_by_template := jsonb_build_object(
      v_current_schedule_row.template_id::TEXT, v_current_schedule_row.schedule_id
    );
  ELSE
    v_schedule_id_by_template := '{}'::jsonb;
  END IF;
  
  -- ========================================
  -- Build final result
  -- ========================================
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_client_workout_summary() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_client_workout_summary() IS 
'Returns comprehensive workout summary for the authenticated client.
Uses auth.uid() internally - no parameters accepted.
Replaces 20-25 individual queries with a single optimized call.
Returns: todaysWorkout, currentProgram, weeklyProgress, weeklyStats, workoutHistory, etc.';

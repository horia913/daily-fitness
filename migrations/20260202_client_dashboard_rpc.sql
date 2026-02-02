-- ============================================================================
-- Migration: Client Dashboard RPC
-- Purpose: Replace 10+ sequential queries with a single optimized RPC call
-- Target: /client page (Client Dashboard)
-- Security: Uses auth.uid() internally - NO user ID parameter accepted
-- ============================================================================

-- Drop existing function if it exists (for idempotent migration)
DROP FUNCTION IF EXISTS public.get_client_dashboard();

-- Create the dashboard RPC
CREATE OR REPLACE FUNCTION public.get_client_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_result JSONB;
  
  -- Profile info
  v_avatar_url TEXT;
  v_first_name TEXT;
  v_client_type TEXT;
  
  -- Week boundaries (Monday-Sunday)
  v_monday DATE;
  v_sunday DATE;
  v_monday_ts TIMESTAMPTZ;
  v_sunday_ts TIMESTAMPTZ;
  
  -- Stats
  v_streak INT := 0;
  v_weekly_current INT := 0;
  v_weekly_goal INT := 0;
  v_weekly_volume NUMERIC := 0;
  v_weekly_time INT := 0;
  v_prs_count INT := 0;
  
  -- Body metrics
  v_body_weight_current NUMERIC;
  v_body_weight_change NUMERIC;
  
  -- Next session
  v_next_session JSONB;
  
  -- Today's workout
  v_todays_workout JSONB;
  
  -- Weekly activity (which days have workouts)
  v_workout_days JSONB;
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
  v_monday_ts := v_monday::TIMESTAMPTZ;
  v_sunday_ts := (v_sunday + INTERVAL '1 day')::TIMESTAMPTZ;
  
  -- ========================================
  -- 1. Get profile info
  -- ========================================
  SELECT avatar_url, first_name
  INTO v_avatar_url, v_first_name
  FROM profiles
  WHERE id = v_client_id;
  
  -- ========================================
  -- 2. Get client type from clients table
  -- ========================================
  SELECT c.client_type
  INTO v_client_type
  FROM clients c
  WHERE c.client_id = v_client_id
    AND c.status = 'active'
  LIMIT 1;
  
  -- Default to online if not found
  v_client_type := COALESCE(v_client_type, 'online');
  
  -- ========================================
  -- 3. Get next session (if in_gym client)
  -- ========================================
  IF v_client_type = 'in_gym' THEN
    SELECT jsonb_build_object(
      'id', s.id,
      'scheduled_at', s.scheduled_at,
      'duration_minutes', s.duration_minutes,
      'title', s.title,
      'coach_name', TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
    )
    INTO v_next_session
    FROM sessions s
    LEFT JOIN profiles p ON p.id = s.coach_id
    WHERE s.client_id = v_client_id
      AND s.status = 'scheduled'
      AND s.scheduled_at > NOW()
    ORDER BY s.scheduled_at ASC
    LIMIT 1;
  END IF;
  
  -- ========================================
  -- 4. Calculate streak (consecutive days with workouts)
  -- ========================================
  WITH workout_dates AS (
    SELECT DISTINCT DATE(completed_at) AS workout_date
    FROM workout_logs
    WHERE client_id = v_client_id
      AND completed_at IS NOT NULL
    ORDER BY workout_date DESC
  ),
  streak_calc AS (
    SELECT 
      workout_date,
      workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::INT AS grp
    FROM workout_dates
    WHERE workout_date >= CURRENT_DATE - INTERVAL '30 days'
  )
  SELECT COUNT(*)
  INTO v_streak
  FROM streak_calc
  WHERE grp = (SELECT grp FROM streak_calc WHERE workout_date = CURRENT_DATE OR workout_date = CURRENT_DATE - 1 LIMIT 1);
  
  v_streak := COALESCE(v_streak, 0);
  
  -- ========================================
  -- 5. Get weekly progress and stats
  -- ========================================
  -- Count completed workouts this week
  SELECT COUNT(*)
  INTO v_weekly_current
  FROM workout_logs
  WHERE client_id = v_client_id
    AND completed_at >= v_monday_ts
    AND completed_at < v_sunday_ts
    AND completed_at IS NOT NULL;
  
  -- Calculate weekly goal from active program or assignments
  -- First check if there's an active program
  DECLARE
    v_active_program_id UUID;
    v_current_week_index INT;
  BEGIN
    SELECT pa.program_id, pp.current_week_index
    INTO v_active_program_id, v_current_week_index
    FROM program_assignments pa
    LEFT JOIN program_progress pp ON pp.program_assignment_id = pa.id
    WHERE pa.client_id = v_client_id
      AND pa.status = 'active'
    ORDER BY pa.created_at DESC
    LIMIT 1;
    
    IF v_active_program_id IS NOT NULL THEN
      -- Get workouts for current week from program_schedule
      WITH week_numbers AS (
        SELECT DISTINCT week_number
        FROM program_schedule
        WHERE program_id = v_active_program_id
        ORDER BY week_number
      ),
      indexed_weeks AS (
        SELECT week_number, ROW_NUMBER() OVER (ORDER BY week_number) - 1 AS week_index
        FROM week_numbers
      ),
      current_week AS (
        SELECT week_number FROM indexed_weeks
        WHERE week_index = COALESCE(v_current_week_index, 0)
      )
      SELECT COUNT(*) INTO v_weekly_goal
      FROM program_schedule
      WHERE program_id = v_active_program_id
        AND week_number = (SELECT week_number FROM current_week);
    END IF;
    
    -- Fallback to scheduled assignments count
    IF v_weekly_goal = 0 OR v_weekly_goal IS NULL THEN
      SELECT COUNT(*) INTO v_weekly_goal
      FROM workout_assignments
      WHERE client_id = v_client_id
        AND scheduled_date >= v_monday
        AND scheduled_date <= v_sunday
        AND status IN ('assigned', 'active');
    END IF;
    
    v_weekly_goal := COALESCE(v_weekly_goal, 0);
  END;
  
  -- ========================================
  -- 6. Get weekly time and volume
  -- ========================================
  WITH weekly_logs AS (
    SELECT id, total_duration_minutes
    FROM workout_logs
    WHERE client_id = v_client_id
      AND completed_at >= v_monday_ts
      AND completed_at < v_sunday_ts
      AND completed_at IS NOT NULL
  )
  SELECT 
    COALESCE(SUM(total_duration_minutes), 0),
    (
      SELECT COALESCE(SUM((wsl.weight * wsl.reps)::NUMERIC), 0)
      FROM workout_set_logs wsl
      WHERE wsl.client_id = v_client_id
        AND wsl.workout_log_id IN (SELECT id FROM weekly_logs)
        AND wsl.weight IS NOT NULL
        AND wsl.reps IS NOT NULL
    )
  INTO v_weekly_time, v_weekly_volume
  FROM weekly_logs;
  
  -- Convert volume to display format (kg to "k" representation)
  v_weekly_volume := ROUND(v_weekly_volume / 1000, 1);
  
  -- ========================================
  -- 7. Get workout days array (Mon=0 to Sun=6)
  -- ========================================
  WITH weekly_workout_days AS (
    SELECT DISTINCT 
      CASE EXTRACT(DOW FROM completed_at)
        WHEN 0 THEN 6  -- Sunday = 6
        ELSE EXTRACT(DOW FROM completed_at)::INT - 1  -- Mon=0, Tue=1, etc
      END AS day_index
    FROM workout_logs
    WHERE client_id = v_client_id
      AND completed_at >= v_monday_ts
      AND completed_at < v_sunday_ts
      AND completed_at IS NOT NULL
  )
  SELECT jsonb_agg(day_index ORDER BY day_index)
  INTO v_workout_days
  FROM weekly_workout_days;
  
  v_workout_days := COALESCE(v_workout_days, '[]'::jsonb);
  
  -- ========================================
  -- 8. Get PRs count
  -- ========================================
  SELECT COUNT(DISTINCT exercise_id)
  INTO v_prs_count
  FROM user_exercise_metrics
  WHERE user_id = v_client_id
    AND (best_weight IS NOT NULL OR best_volume IS NOT NULL);
  
  v_prs_count := COALESCE(v_prs_count, 0);
  
  -- ========================================
  -- 9. Get body weight (current and change)
  -- ========================================
  WITH recent_weights AS (
    SELECT weight_kg, measured_date
    FROM body_metrics
    WHERE client_id = v_client_id
      AND weight_kg IS NOT NULL
    ORDER BY measured_date DESC
    LIMIT 2
  )
  SELECT 
    (SELECT weight_kg FROM recent_weights ORDER BY measured_date DESC LIMIT 1),
    (SELECT weight_kg FROM recent_weights ORDER BY measured_date DESC LIMIT 1) -
    COALESCE((SELECT weight_kg FROM recent_weights ORDER BY measured_date DESC OFFSET 1 LIMIT 1),
             (SELECT weight_kg FROM recent_weights ORDER BY measured_date DESC LIMIT 1))
  INTO v_body_weight_current, v_body_weight_change;
  
  -- ========================================
  -- 10. Get today's workout (simplified)
  -- ========================================
  -- Check for active program workout first
  DECLARE
    v_program_assignment RECORD;
    v_program_progress RECORD;
    v_schedule_row RECORD;
  BEGIN
    SELECT pa.id, pa.program_id, pa.name AS program_name
    INTO v_program_assignment
    FROM program_assignments pa
    WHERE pa.client_id = v_client_id
      AND pa.status = 'active'
    ORDER BY pa.created_at DESC
    LIMIT 1;
    
    IF v_program_assignment.id IS NOT NULL THEN
      -- Get progress
      SELECT pp.current_week_index, pp.current_day_index, pp.is_completed
      INTO v_program_progress
      FROM program_progress pp
      WHERE pp.program_assignment_id = v_program_assignment.id;
      
      IF v_program_progress IS NOT NULL AND NOT COALESCE(v_program_progress.is_completed, false) THEN
        -- Get current schedule row
        WITH week_numbers AS (
          SELECT DISTINCT week_number
          FROM program_schedule
          WHERE program_id = v_program_assignment.program_id
          ORDER BY week_number
        ),
        indexed_weeks AS (
          SELECT week_number, ROW_NUMBER() OVER (ORDER BY week_number) - 1 AS week_index
          FROM week_numbers
        ),
        current_week AS (
          SELECT week_number FROM indexed_weeks
          WHERE week_index = COALESCE(v_program_progress.current_week_index, 0)
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
               (SELECT COUNT(*) FROM workout_blocks WHERE template_id = diw.template_id) AS total_sets
        INTO v_schedule_row
        FROM days_in_week diw
        LEFT JOIN workout_templates wt ON wt.id = diw.template_id
        WHERE diw.day_index = COALESCE(v_program_progress.current_day_index, 0);
        
        IF v_schedule_row IS NOT NULL THEN
          v_todays_workout := jsonb_build_object(
            'hasWorkout', true,
            'type', 'program',
            'templateId', v_schedule_row.template_id,
            'scheduleId', v_schedule_row.schedule_id,
            'name', COALESCE(v_schedule_row.template_name, v_program_assignment.program_name),
            'weekNumber', v_schedule_row.week_number,
            'dayNumber', v_schedule_row.day_index + 1,
            'totalSets', COALESCE(v_schedule_row.total_sets, 0),
            'estimatedDuration', COALESCE(v_schedule_row.estimated_duration, 45)
          );
        END IF;
      END IF;
    END IF;
    
    -- If no program workout, check for standalone assignment
    IF v_todays_workout IS NULL THEN
      SELECT jsonb_build_object(
        'hasWorkout', true,
        'type', 'assignment',
        'assignmentId', wa.id,
        'templateId', wa.workout_template_id,
        'name', COALESCE(wa.name, wt.name, 'Workout'),
        'totalSets', (SELECT COUNT(*) FROM workout_blocks WHERE template_id = wa.workout_template_id),
        'estimatedDuration', COALESCE(wt.estimated_duration, 45)
      )
      INTO v_todays_workout
      FROM workout_assignments wa
      LEFT JOIN workout_templates wt ON wt.id = wa.workout_template_id
      WHERE wa.client_id = v_client_id
        AND wa.status IN ('assigned', 'active')
      ORDER BY wa.scheduled_date DESC NULLS LAST, wa.created_at DESC
      LIMIT 1;
    END IF;
    
    -- Default if no workout found
    IF v_todays_workout IS NULL THEN
      v_todays_workout := jsonb_build_object(
        'hasWorkout', false,
        'message', 'No workout assigned'
      );
    END IF;
  END;
  
  -- ========================================
  -- Build final result
  -- ========================================
  v_result := jsonb_build_object(
    'avatarUrl', v_avatar_url,
    'firstName', v_first_name,
    'clientType', v_client_type,
    'nextSession', v_next_session,
    'streak', v_streak,
    'weeklyProgress', jsonb_build_object(
      'current', v_weekly_current,
      'goal', v_weekly_goal
    ),
    'weeklyStats', jsonb_build_object(
      'volume', v_weekly_volume,
      'time', v_weekly_time,
      'prsCount', v_prs_count
    ),
    'workoutDays', v_workout_days,
    'bodyWeight', CASE 
      WHEN v_body_weight_current IS NOT NULL THEN 
        jsonb_build_object('current', v_body_weight_current, 'change', COALESCE(v_body_weight_change, 0))
      ELSE NULL
    END,
    'todaysWorkout', v_todays_workout
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_client_dashboard() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_client_dashboard() IS 
'Returns comprehensive dashboard data for the authenticated client.
Uses auth.uid() internally - no parameters accepted.
Replaces 10+ individual queries with a single optimized call.
Returns: avatarUrl, streak, weeklyProgress, weeklyStats, workoutDays, bodyWeight, todaysWorkout, etc.';

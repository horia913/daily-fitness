-- ============================================================================
-- Migration: Coach Pickup Workout RPC
-- Purpose: Replace 15-20 individual queries with a single optimized RPC call
-- Target: /api/coach/pickup/next-workout endpoint
-- Security: Uses auth.uid() internally, validates coach owns the client
-- ============================================================================

-- Drop existing function if it exists (for idempotent migration)
DROP FUNCTION IF EXISTS public.get_coach_pickup_workout(UUID);

-- Create the coach pickup RPC
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
  -- ========================================
  -- SECURITY: Get coach ID from auth context
  -- ========================================
  v_coach_id := auth.uid();
  
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- ========================================
  -- Validate coach role
  -- ========================================
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
  
  -- ========================================
  -- Validate client belongs to coach
  -- ========================================
  SELECT client_id, status
  INTO v_client_relation
  FROM clients
  WHERE coach_id = v_coach_id
    AND client_id = p_client_id;
  
  IF v_client_relation.client_id IS NULL THEN
    RAISE EXCEPTION 'Client not found or does not belong to this coach';
  END IF;
  
  -- ========================================
  -- Get client profile
  -- ========================================
  SELECT id, first_name, last_name, avatar_url
  INTO v_client_profile
  FROM profiles
  WHERE id = p_client_id;
  
  -- ========================================
  -- Find active program assignment (most recent)
  -- ========================================
  SELECT 
    pa.id,
    pa.program_id,
    pa.client_id,
    pa.coach_id,
    pa.name,
    pa.status,
    pa.duration_weeks,
    pa.total_days,
    pa.created_at
  INTO v_active_assignment
  FROM program_assignments pa
  WHERE pa.client_id = p_client_id
    AND pa.status = 'active'
  ORDER BY pa.created_at DESC
  LIMIT 1;
  
  -- No active program
  IF v_active_assignment.id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'no_program',
      'message', 'Client has no active program assignment',
      'client_id', p_client_id,
      'client_name', TRIM(COALESCE(v_client_profile.first_name, '') || ' ' || COALESCE(v_client_profile.last_name, ''))
    );
  END IF;
  
  -- ========================================
  -- Get or create program_progress
  -- ========================================
  SELECT id, current_week_index, current_day_index, is_completed
  INTO v_program_progress
  FROM program_progress
  WHERE program_assignment_id = v_active_assignment.id;
  
  -- Create progress row if it doesn't exist
  IF v_program_progress.id IS NULL THEN
    INSERT INTO program_progress (program_assignment_id, current_week_index, current_day_index, is_completed)
    VALUES (v_active_assignment.id, 0, 0, false)
    RETURNING id, current_week_index, current_day_index, is_completed
    INTO v_program_progress;
  END IF;
  
  -- Program completed
  IF v_program_progress.is_completed THEN
    RETURN jsonb_build_object(
      'status', 'completed',
      'message', 'Program completed',
      'client_id', p_client_id,
      'client_name', TRIM(COALESCE(v_client_profile.first_name, '') || ' ' || COALESCE(v_client_profile.last_name, '')),
      'program_assignment_id', v_active_assignment.id,
      'program_id', v_active_assignment.program_id,
      'program_name', COALESCE(v_active_assignment.name, 'Program'),
      'current_week_index', v_program_progress.current_week_index,
      'current_day_index', v_program_progress.current_day_index,
      'is_completed', true
    );
  END IF;
  
  -- ========================================
  -- Get current schedule row (handles gaps in weeks/days)
  -- ========================================
  WITH week_numbers AS (
    SELECT DISTINCT week_number
    FROM program_schedule
    WHERE program_id = v_active_assignment.program_id
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
    SELECT 
      ps.id AS schedule_id,
      ps.program_id,
      ps.week_number,
      ps.day_of_week,
      ps.template_id,
      ROW_NUMBER() OVER (ORDER BY ps.day_of_week) - 1 AS day_index
    FROM program_schedule ps
    WHERE ps.program_id = v_active_assignment.program_id
      AND ps.week_number = (SELECT week_number FROM current_week)
  )
  SELECT 
    diw.schedule_id,
    diw.program_id,
    diw.week_number,
    diw.day_of_week,
    diw.template_id,
    diw.day_index,
    (SELECT COUNT(*) FROM indexed_weeks) AS total_weeks,
    (SELECT COUNT(*) FROM days_in_week) AS days_in_week
  INTO v_current_schedule_row
  FROM days_in_week diw
  WHERE diw.day_index = v_program_progress.current_day_index;
  
  -- No schedule found
  IF v_current_schedule_row.schedule_id IS NULL THEN
    -- Count total schedule rows to check if program is configured
    DECLARE
      v_schedule_count INT;
    BEGIN
      SELECT COUNT(*) INTO v_schedule_count
      FROM program_schedule
      WHERE program_id = v_active_assignment.program_id;
      
      IF v_schedule_count = 0 THEN
        RETURN jsonb_build_object(
          'error', 'Program schedule not configured',
          'message', 'No training days found in program_schedule for this program. Please configure the program schedule first.',
          'program_id', v_active_assignment.program_id
        );
      ELSE
        RETURN jsonb_build_object(
          'error', 'Invalid progress state',
          'message', 'week_index=' || v_program_progress.current_week_index || ', day_index=' || v_program_progress.current_day_index || ' is out of bounds',
          'total_weeks', v_current_schedule_row.total_weeks
        );
      END IF;
    END;
  END IF;
  
  v_total_weeks := v_current_schedule_row.total_weeks;
  v_days_in_current_week := v_current_schedule_row.days_in_week;
  
  -- ========================================
  -- Get workout template
  -- ========================================
  SELECT id, name, description, estimated_duration
  INTO v_template
  FROM workout_templates
  WHERE id = v_current_schedule_row.template_id;
  
  -- ========================================
  -- Get workout blocks with exercises (simplified preview)
  -- ========================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', wb.id,
      'block_type', wb.block_type,
      'block_name', wb.block_name,
      'block_order', wb.block_order,
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
            'rest_seconds', wbe.rest_seconds
          )
          ORDER BY wbe.exercise_order
        ), '[]'::jsonb)
        FROM workout_block_exercises wbe
        LEFT JOIN exercises e ON e.id = wbe.exercise_id
        WHERE wbe.block_id = wb.id
      )
    )
    ORDER BY wb.block_order
  ), '[]'::jsonb)
  INTO v_blocks
  FROM workout_blocks wb
  WHERE wb.template_id = v_current_schedule_row.template_id;
  
  -- ========================================
  -- Build labels
  -- ========================================
  v_week_label := 'Week ' || v_current_schedule_row.week_number;
  v_day_label := 'Day ' || (v_current_schedule_row.day_index + 1);
  
  -- ========================================
  -- Build final result
  -- ========================================
  v_result := jsonb_build_object(
    'status', 'active',
    'client_id', p_client_id,
    'client_name', TRIM(COALESCE(v_client_profile.first_name, '') || ' ' || COALESCE(v_client_profile.last_name, '')),
    'client_avatar_url', v_client_profile.avatar_url,
    
    'program_assignment_id', v_active_assignment.id,
    'program_id', v_active_assignment.program_id,
    'program_name', COALESCE(v_active_assignment.name, 'Program'),
    
    'current_week_index', v_program_progress.current_week_index,
    'current_day_index', v_program_progress.current_day_index,
    'is_completed', false,
    
    'week_label', v_week_label,
    'day_label', v_day_label,
    'position_label', v_week_label || ' • ' || v_day_label,
    
    'total_weeks', v_total_weeks,
    'days_in_current_week', v_days_in_current_week,
    
    'template_id', v_current_schedule_row.template_id,
    'workout_name', COALESCE(v_template.name, 'Workout'),
    'workout_description', v_template.description,
    'estimated_duration', v_template.estimated_duration,
    
    'blocks', v_blocks
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_coach_pickup_workout(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_coach_pickup_workout(UUID) IS 
'Returns next workout info for a client in Coach Pickup Mode.
Validates that auth.uid() is the coach for the specified client.
Replaces 15-20 individual queries with a single optimized call.
Returns: client info, program progress, current workout template, blocks preview.';

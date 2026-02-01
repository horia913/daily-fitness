-- ============================================================================
-- Migration: advance_program_progress RPC
-- Date: 2026-01-31
-- Description: Creates an RPC function to advance program progression.
--              Used by BOTH client and coach completion flows.
--              Uses DB-level idempotency with INSERT ON CONFLICT DO NOTHING.
--              Includes explicit authorization checks inside the function.
-- ============================================================================

-- Drop if exists (for re-running during development)
DROP FUNCTION IF EXISTS public.advance_program_progress(uuid, uuid, text);

-- Create the RPC function
-- SECURITY DEFINER: runs as function owner (bypasses RLS for internal queries)
-- BUT we add explicit authorization checks to ensure only valid callers can execute
CREATE OR REPLACE FUNCTION public.advance_program_progress(
  p_client_id uuid,
  p_completed_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_is_authorized boolean := false;
  v_assignment_id uuid;
  v_program_id uuid;
  v_assignment_name text;
  v_progress_id uuid;
  v_current_week_index integer;
  v_current_day_index integer;
  v_is_completed boolean;
  v_week_numbers integer[];
  v_days_in_current_week integer;
  v_current_week_number integer;
  v_next_week_index integer;
  v_next_day_index integer;
  v_next_is_completed boolean;
  v_inserted_row_count integer;
  v_status text;
BEGIN
  -- ========================================================================
  -- STEP 0: AUTHORIZATION CHECK (CRITICAL - DO NOT BYPASS)
  -- ========================================================================
  -- Get the calling user's ID from auth context
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error', 'not_authenticated',
      'message', 'User is not authenticated'
    );
  END IF;
  
  -- p_completed_by MUST equal the caller (prevent spoofing completed_by)
  IF p_completed_by != v_caller_id THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error', 'invalid_completed_by',
      'message', 'p_completed_by must match the authenticated user'
    );
  END IF;
  
  -- Authorization: Either:
  -- (a) Client completing their own workout: p_client_id = auth.uid()
  -- (b) Coach completing for their client: exists active coach-client relationship
  
  IF p_client_id = v_caller_id THEN
    -- Case (a): Client completing their own workout
    v_is_authorized := true;
  ELSE
    -- Case (b): Check if caller is coach of this client
    SELECT EXISTS (
      SELECT 1 FROM clients
      WHERE coach_id = v_caller_id
        AND client_id = p_client_id
        AND status = 'active'
    ) INTO v_is_authorized;
  END IF;
  
  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error', 'forbidden',
      'message', 'You are not authorized to advance this client''s program'
    );
  END IF;

  -- ========================================================================
  -- STEP 1: Find active program assignment (most recent if multiple)
  -- ========================================================================
  SELECT id, program_id, name
  INTO v_assignment_id, v_program_id, v_assignment_name
  FROM program_assignments
  WHERE client_id = p_client_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_assignment_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error', 'no_active_assignment',
      'message', 'Client has no active program assignment'
    );
  END IF;

  -- ========================================================================
  -- STEP 2: Get or create program_progress row
  -- ========================================================================
  SELECT id, current_week_index, current_day_index, is_completed
  INTO v_progress_id, v_current_week_index, v_current_day_index, v_is_completed
  FROM program_progress
  WHERE program_assignment_id = v_assignment_id;
  
  IF v_progress_id IS NULL THEN
    -- Create progress row starting at week 0, day 0
    INSERT INTO program_progress (
      program_assignment_id,
      current_week_index,
      current_day_index,
      is_completed,
      created_at,
      updated_at
    ) VALUES (
      v_assignment_id,
      0,
      0,
      false,
      now(),
      now()
    )
    RETURNING id, current_week_index, current_day_index, is_completed
    INTO v_progress_id, v_current_week_index, v_current_day_index, v_is_completed;
  END IF;

  -- ========================================================================
  -- STEP 3: Check if program is already completed
  -- ========================================================================
  IF v_is_completed = true THEN
    RETURN jsonb_build_object(
      'status', 'completed',
      'message', 'Program already completed - no further advancement possible',
      'program_assignment_id', v_assignment_id,
      'program_id', v_program_id,
      'program_name', v_assignment_name,
      'current_week_index', v_current_week_index,
      'current_day_index', v_current_day_index,
      'is_completed', true
    );
  END IF;

  -- ========================================================================
  -- STEP 4: Insert completion record with DB-level idempotency
  --         ON CONFLICT DO NOTHING ensures no duplicate insertions
  -- ========================================================================
  INSERT INTO program_day_completions (
    program_assignment_id,
    week_index,
    day_index,
    completed_by,
    notes,
    completed_at
  ) VALUES (
    v_assignment_id,
    v_current_week_index,
    v_current_day_index,
    p_completed_by,
    p_notes,
    now()
  )
  ON CONFLICT (program_assignment_id, week_index, day_index) DO NOTHING;
  
  GET DIAGNOSTICS v_inserted_row_count = ROW_COUNT;
  
  IF v_inserted_row_count = 0 THEN
    -- Conflict occurred - day was already completed
    RETURN jsonb_build_object(
      'status', 'already_completed',
      'message', format('Day already completed: Week %s, Day %s', v_current_week_index, v_current_day_index),
      'program_assignment_id', v_assignment_id,
      'program_id', v_program_id,
      'program_name', v_assignment_name,
      'current_week_index', v_current_week_index,
      'current_day_index', v_current_day_index,
      'is_completed', v_is_completed
    );
  END IF;

  -- ========================================================================
  -- STEP 5: Load program schedule and build week_numbers array
  --         week_numbers = sorted distinct week_number values
  -- ========================================================================
  SELECT ARRAY_AGG(DISTINCT week_number ORDER BY week_number)
  INTO v_week_numbers
  FROM program_schedule
  WHERE program_id = v_program_id;
  
  IF v_week_numbers IS NULL OR array_length(v_week_numbers, 1) IS NULL THEN
    -- No schedule configured - mark as completed
    UPDATE program_progress
    SET is_completed = true, updated_at = now()
    WHERE id = v_progress_id;
    
    RETURN jsonb_build_object(
      'status', 'advanced',
      'message', 'No program schedule found - marked as completed',
      'program_assignment_id', v_assignment_id,
      'program_id', v_program_id,
      'program_name', v_assignment_name,
      'current_week_index', v_current_week_index,
      'current_day_index', v_current_day_index,
      'is_completed', true,
      'week_numbers', '[]'::jsonb,
      'days_in_week_count', 0
    );
  END IF;

  -- ========================================================================
  -- STEP 6: Get current week number and count days in current week
  --         current_week_index is an index into week_numbers array (0-based)
  -- ========================================================================
  
  -- Bounds check for week index
  IF v_current_week_index < 0 OR v_current_week_index >= array_length(v_week_numbers, 1) THEN
    -- Invalid state - mark as completed
    UPDATE program_progress
    SET is_completed = true, updated_at = now()
    WHERE id = v_progress_id;
    
    RETURN jsonb_build_object(
      'status', 'advanced',
      'message', 'Invalid week index - marked as completed',
      'program_assignment_id', v_assignment_id,
      'current_week_index', v_current_week_index,
      'current_day_index', v_current_day_index,
      'is_completed', true
    );
  END IF;
  
  -- Get actual week_number from index (arrays are 1-based in PostgreSQL)
  v_current_week_number := v_week_numbers[v_current_week_index + 1];
  
  -- Count days in current week (ordered by day_of_week)
  SELECT COUNT(*)
  INTO v_days_in_current_week
  FROM program_schedule
  WHERE program_id = v_program_id
    AND week_number = v_current_week_number;

  -- ========================================================================
  -- STEP 7: Compute next position according to advancement rules
  --         1. If more days in current week → day_index += 1
  --         2. Else if more weeks → week_index += 1, day_index = 0
  --         3. Else → is_completed = true (STOP, no looping)
  -- ========================================================================
  
  IF v_current_day_index + 1 < v_days_in_current_week THEN
    -- More days in current week
    v_next_week_index := v_current_week_index;
    v_next_day_index := v_current_day_index + 1;
    v_next_is_completed := false;
    v_status := 'advanced';
  ELSIF v_current_week_index + 1 < array_length(v_week_numbers, 1) THEN
    -- More weeks exist
    v_next_week_index := v_current_week_index + 1;
    v_next_day_index := 0;
    v_next_is_completed := false;
    v_status := 'advanced';
  ELSE
    -- No more weeks - program is complete
    v_next_week_index := v_current_week_index;
    v_next_day_index := v_current_day_index;
    v_next_is_completed := true;
    v_status := 'advanced';
  END IF;

  -- ========================================================================
  -- STEP 8: Update program_progress with new position
  -- ========================================================================
  UPDATE program_progress
  SET 
    current_week_index = v_next_week_index,
    current_day_index = v_next_day_index,
    is_completed = v_next_is_completed,
    updated_at = now()
  WHERE id = v_progress_id;

  -- ========================================================================
  -- STEP 9: Build debug info for next position
  -- ========================================================================
  DECLARE
    v_next_week_number integer;
    v_next_day_of_week integer;
    v_days_in_next_week integer;
  BEGIN
    IF NOT v_next_is_completed THEN
      v_next_week_number := v_week_numbers[v_next_week_index + 1];
      
      -- Get the day_of_week for the next day
      SELECT day_of_week, COUNT(*) OVER ()
      INTO v_next_day_of_week, v_days_in_next_week
      FROM (
        SELECT day_of_week, ROW_NUMBER() OVER (ORDER BY day_of_week) - 1 as day_idx
        FROM program_schedule
        WHERE program_id = v_program_id
          AND week_number = v_next_week_number
      ) sub
      WHERE day_idx = v_next_day_index;
    END IF;
    
    -- Return success response
    RETURN jsonb_build_object(
      'status', v_status,
      'message', CASE 
        WHEN v_next_is_completed THEN 'Program completed! All training days finished.'
        ELSE format('Advanced to Week %s (index %s), Day %s (index %s)', 
                    v_next_week_number, v_next_week_index, v_next_day_index + 1, v_next_day_index)
      END,
      'program_assignment_id', v_assignment_id,
      'program_id', v_program_id,
      'program_name', v_assignment_name,
      'current_week_index', v_next_week_index,
      'current_day_index', v_next_day_index,
      'is_completed', v_next_is_completed,
      -- Debug info
      'completed_week_index', v_current_week_index,
      'completed_day_index', v_current_day_index,
      'week_numbers', to_jsonb(v_week_numbers),
      'days_in_week_count', v_days_in_current_week,
      'next_week_number', v_next_week_number,
      'next_day_of_week', v_next_day_of_week
    );
  END;
END;
$$;

-- Grant execute to authenticated users (both clients and coaches)
-- The function itself performs authorization checks
GRANT EXECUTE ON FUNCTION public.advance_program_progress(uuid, uuid, text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.advance_program_progress IS 
'Advances program progression for a client. 
Used by both client and coach completion flows.
Returns status: "advanced", "already_completed", "completed", or "error".
Uses DB-level idempotency via INSERT ON CONFLICT DO NOTHING.
Includes explicit authorization checks:
- p_completed_by must equal auth.uid()
- p_client_id must be either auth.uid() (self) or a client of the calling coach';

-- ============================================================================
-- VERIFICATION QUERIES (run after applying migration)
-- ============================================================================
-- Check that the function exists:
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'advance_program_progress';

-- Test the function (replace UUIDs with real values):
-- SELECT advance_program_progress(
--   'client-uuid-here'::uuid,
--   'completed-by-uuid-here'::uuid,
--   'Test completion'
-- );

-- Verify results:
-- SELECT * FROM program_day_completions ORDER BY completed_at DESC LIMIT 10;
-- SELECT * FROM program_progress ORDER BY updated_at DESC LIMIT 10;

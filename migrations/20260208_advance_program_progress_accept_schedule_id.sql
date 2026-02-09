-- ============================================================================
-- Migration: advance_program_progress — accept completed program day (schedule id)
-- Date: 2026-02-08
-- Description: Extends advance_program_progress to accept optional
--              p_program_assignment_id and p_program_schedule_id. When both
--              are provided (client completion with program day on workout_log),
--              the RPC records that specific day, enforces "no Week N+1 until
--              Week N is complete", allows any order within a week, and sets
--              program_progress to the next incomplete slot. When not provided
--              (coach mark-complete or legacy), behavior unchanged: advance
--              from current pointer.
-- ============================================================================

-- Drop existing function (3-arg version)
DROP FUNCTION IF EXISTS public.advance_program_progress(uuid, uuid, text);

-- Create extended function (5 args; new params optional for backward compatibility)
CREATE OR REPLACE FUNCTION public.advance_program_progress(
  p_client_id uuid,
  p_completed_by uuid,
  p_notes text DEFAULT NULL,
  p_program_assignment_id uuid DEFAULT NULL,
  p_program_schedule_id uuid DEFAULT NULL
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
  -- For "completed day" path (when schedule id provided)
  v_use_schedule_id boolean := (p_program_assignment_id IS NOT NULL AND p_program_schedule_id IS NOT NULL);
  v_schedule_week_number integer;
  v_schedule_day_of_week integer;
  v_completed_week_index integer;
  v_completed_day_index integer;
  v_weeks_before_me integer;
  v_days_in_prior_weeks integer;
  v_completions_in_prior_weeks integer;
  v_incomplete_prior_week integer;
BEGIN
  -- ========================================================================
  -- STEP 0: AUTHORIZATION CHECK (unchanged)
  -- ========================================================================
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error', 'not_authenticated', 'message', 'User is not authenticated');
  END IF;
  IF p_completed_by != v_caller_id THEN
    RETURN jsonb_build_object('status', 'error', 'error', 'invalid_completed_by', 'message', 'p_completed_by must match the authenticated user');
  END IF;
  IF p_client_id = v_caller_id THEN
    v_is_authorized := true;
  ELSE
    SELECT EXISTS (SELECT 1 FROM clients WHERE coach_id = v_caller_id AND client_id = p_client_id AND status = 'active') INTO v_is_authorized;
  END IF;
  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('status', 'error', 'error', 'forbidden', 'message', 'You are not authorized to advance this client''s program');
  END IF;

  -- ========================================================================
  -- STEP 1: Find active program assignment
  -- ========================================================================
  SELECT id, program_id, name
  INTO v_assignment_id, v_program_id, v_assignment_name
  FROM program_assignments
  WHERE client_id = p_client_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_assignment_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error', 'no_active_assignment', 'message', 'Client has no active program assignment');
  END IF;

  -- When schedule id path is used, assignment must match
  IF v_use_schedule_id AND p_program_assignment_id IS DISTINCT FROM v_assignment_id THEN
    RETURN jsonb_build_object('status', 'error', 'error', 'assignment_mismatch', 'message', 'program_assignment_id does not match client''s active assignment');
  END IF;

  -- ========================================================================
  -- STEP 2: Get or create program_progress row
  -- ========================================================================
  SELECT id, current_week_index, current_day_index, is_completed
  INTO v_progress_id, v_current_week_index, v_current_day_index, v_is_completed
  FROM program_progress
  WHERE program_assignment_id = v_assignment_id;

  IF v_progress_id IS NULL THEN
    INSERT INTO program_progress (program_assignment_id, current_week_index, current_day_index, is_completed, created_at, updated_at)
    VALUES (v_assignment_id, 0, 0, false, now(), now())
    RETURNING id, current_week_index, current_day_index, is_completed
    INTO v_progress_id, v_current_week_index, v_current_day_index, v_is_completed;
  END IF;

  -- ========================================================================
  -- STEP 3: If program already completed, return
  -- ========================================================================
  IF v_is_completed = true THEN
    RETURN jsonb_build_object(
      'status', 'completed',
      'message', 'Program already completed - no further advancement possible',
      'program_assignment_id', v_assignment_id, 'program_id', v_program_id, 'program_name', v_assignment_name,
      'current_week_index', v_current_week_index, 'current_day_index', v_current_day_index, 'is_completed', true
    );
  END IF;

  -- ========================================================================
  -- BRANCH A: Completed day known (p_program_schedule_id provided)
  -- ========================================================================
  IF v_use_schedule_id THEN
    -- Resolve schedule row and ensure it belongs to this program
    SELECT week_number, day_of_week INTO v_schedule_week_number, v_schedule_day_of_week
    FROM program_schedule
    WHERE id = p_program_schedule_id AND program_id = v_program_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 'error', 'error', 'invalid_schedule', 'message', 'program_schedule_id not found or does not belong to this program');
    END IF;

    -- Compute 0-based week_index (same logic as app: index into sorted distinct weeks)
    SELECT idx INTO v_completed_week_index
    FROM (
      SELECT week_number, ROW_NUMBER() OVER (ORDER BY week_number) - 1 AS idx
      FROM (SELECT DISTINCT week_number FROM program_schedule WHERE program_id = v_program_id) x
    ) ordered
    WHERE week_number = v_schedule_week_number;

    -- Compute 0-based day_index within week (order by day_of_week, id)
    SELECT idx INTO v_completed_day_index
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY day_of_week, id) - 1 AS idx
      FROM program_schedule
      WHERE program_id = v_program_id AND week_number = v_schedule_week_number
    ) days_in_week
    WHERE id = p_program_schedule_id;

    -- Enforce: no Week N+1 until Week N is complete (all days in prior weeks must be completed)
    FOR v_incomplete_prior_week IN
      SELECT w.idx
      FROM (
        SELECT week_number, ROW_NUMBER() OVER (ORDER BY week_number) - 1 AS idx
        FROM (SELECT DISTINCT week_number FROM program_schedule WHERE program_id = v_program_id) x
      ) w
      JOIN LATERAL (
        SELECT COUNT(*) AS cnt FROM program_schedule ps
        WHERE ps.program_id = v_program_id AND ps.week_number = w.week_number
      ) need ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt FROM program_day_completions pdc
        WHERE pdc.program_assignment_id = v_assignment_id AND pdc.week_index = w.idx
      ) done ON true
      WHERE w.idx < v_completed_week_index AND COALESCE(done.cnt, 0) < need.cnt
    LOOP
      RETURN jsonb_build_object(
        'status', 'error',
        'error', 'week_order',
        'message', format('Cannot complete a day in week %s until all days in prior weeks are completed', v_completed_week_index + 1)
      );
    END LOOP;

    -- Insert this specific day (idempotent)
    INSERT INTO program_day_completions (program_assignment_id, week_index, day_index, completed_by, notes, completed_at)
    VALUES (v_assignment_id, v_completed_week_index, v_completed_day_index, p_completed_by, p_notes, now())
    ON CONFLICT (program_assignment_id, week_index, day_index) DO NOTHING;

    GET DIAGNOSTICS v_inserted_row_count = ROW_COUNT;
    IF v_inserted_row_count = 0 THEN
      RETURN jsonb_build_object(
        'status', 'already_completed',
        'message', format('Day already completed: Week %s, Day %s', v_completed_week_index, v_completed_day_index),
        'program_assignment_id', v_assignment_id, 'program_id', v_program_id, 'program_name', v_assignment_name,
        'current_week_index', v_completed_week_index, 'current_day_index', v_completed_day_index, 'is_completed', v_is_completed
      );
    END IF;

    -- Compute next slot: first (week_index, day_index) not in program_day_completions (same ordering as schedule)
    SELECT swi.week_index, swi.day_index INTO v_next_week_index, v_next_day_index
    FROM (
      SELECT
        (SELECT COUNT(*) FROM (SELECT DISTINCT week_number FROM program_schedule WHERE program_id = v_program_id AND week_number < ps.week_number) x)::integer AS week_index,
        (SELECT COUNT(*) FROM program_schedule WHERE program_id = v_program_id AND week_number = ps.week_number AND (day_of_week < ps.day_of_week OR (day_of_week = ps.day_of_week AND id < ps.id)))::integer AS day_index
      FROM program_schedule ps
      WHERE ps.program_id = v_program_id
    ) swi
    LEFT JOIN program_day_completions pdc
      ON pdc.program_assignment_id = v_assignment_id AND pdc.week_index = swi.week_index AND pdc.day_index = swi.day_index
    WHERE pdc.week_index IS NULL
    ORDER BY swi.week_index, swi.day_index
    LIMIT 1;

    IF NOT FOUND THEN
      v_next_is_completed := true;
      v_next_week_index := v_completed_week_index;
      v_next_day_index := v_completed_day_index;
    ELSE
      v_next_is_completed := false;
    END IF;

    UPDATE program_progress
    SET current_week_index = v_next_week_index, current_day_index = v_next_day_index, is_completed = v_next_is_completed, updated_at = now()
    WHERE id = v_progress_id;

    -- Return (reuse same response shape as branch B)
    RETURN jsonb_build_object(
      'status', 'advanced',
      'message', CASE WHEN v_next_is_completed THEN 'Program completed! All training days finished.'
        ELSE format('Recorded completion for Week %s, Day %s. Next: Week %s, Day %s', v_completed_week_index, v_completed_day_index, v_next_week_index, v_next_day_index) END,
      'program_assignment_id', v_assignment_id, 'program_id', v_program_id, 'program_name', v_assignment_name,
      'current_week_index', v_next_week_index, 'current_day_index', v_next_day_index, 'is_completed', v_next_is_completed,
      'completed_week_index', v_completed_week_index, 'completed_day_index', v_completed_day_index
    );
  END IF;

  -- ========================================================================
  -- BRANCH B: Legacy/coach path — assume current pointer = just completed
  -- ========================================================================
  INSERT INTO program_day_completions (program_assignment_id, week_index, day_index, completed_by, notes, completed_at)
  VALUES (v_assignment_id, v_current_week_index, v_current_day_index, p_completed_by, p_notes, now())
  ON CONFLICT (program_assignment_id, week_index, day_index) DO NOTHING;

  GET DIAGNOSTICS v_inserted_row_count = ROW_COUNT;
  IF v_inserted_row_count = 0 THEN
    RETURN jsonb_build_object(
      'status', 'already_completed',
      'message', format('Day already completed: Week %s, Day %s', v_current_week_index, v_current_day_index),
      'program_assignment_id', v_assignment_id, 'program_id', v_program_id, 'program_name', v_assignment_name,
      'current_week_index', v_current_week_index, 'current_day_index', v_current_day_index, 'is_completed', v_is_completed
    );
  END IF;

  SELECT ARRAY_AGG(DISTINCT week_number ORDER BY week_number) INTO v_week_numbers
  FROM program_schedule WHERE program_id = v_program_id;

  IF v_week_numbers IS NULL OR array_length(v_week_numbers, 1) IS NULL THEN
    UPDATE program_progress SET is_completed = true, updated_at = now() WHERE id = v_progress_id;
    RETURN jsonb_build_object('status', 'advanced', 'message', 'No program schedule found - marked as completed',
      'program_assignment_id', v_assignment_id, 'program_id', v_program_id, 'program_name', v_assignment_name,
      'current_week_index', v_current_week_index, 'current_day_index', v_current_day_index, 'is_completed', true);
  END IF;

  IF v_current_week_index < 0 OR v_current_week_index >= array_length(v_week_numbers, 1) THEN
    UPDATE program_progress SET is_completed = true, updated_at = now() WHERE id = v_progress_id;
    RETURN jsonb_build_object('status', 'advanced', 'message', 'Invalid week index - marked as completed',
      'program_assignment_id', v_assignment_id, 'current_week_index', v_current_week_index, 'current_day_index', v_current_day_index, 'is_completed', true);
  END IF;

  v_current_week_number := v_week_numbers[v_current_week_index + 1];
  SELECT COUNT(*) INTO v_days_in_current_week
  FROM program_schedule WHERE program_id = v_program_id AND week_number = v_current_week_number;

  IF v_current_day_index + 1 < v_days_in_current_week THEN
    v_next_week_index := v_current_week_index;
    v_next_day_index := v_current_day_index + 1;
    v_next_is_completed := false;
  ELSIF v_current_week_index + 1 < array_length(v_week_numbers, 1) THEN
    v_next_week_index := v_current_week_index + 1;
    v_next_day_index := 0;
    v_next_is_completed := false;
  ELSE
    v_next_week_index := v_current_week_index;
    v_next_day_index := v_current_day_index;
    v_next_is_completed := true;
  END IF;

  UPDATE program_progress
  SET current_week_index = v_next_week_index, current_day_index = v_next_day_index, is_completed = v_next_is_completed, updated_at = now()
  WHERE id = v_progress_id;

  RETURN jsonb_build_object(
    'status', 'advanced',
    'message', CASE WHEN v_next_is_completed THEN 'Program completed! All training days finished.'
      ELSE format('Advanced to Week %s (index %s), Day %s (index %s)', v_week_numbers[v_next_week_index + 1], v_next_week_index, v_next_day_index + 1, v_next_day_index) END,
    'program_assignment_id', v_assignment_id, 'program_id', v_program_id, 'program_name', v_assignment_name,
    'current_week_index', v_next_week_index, 'current_day_index', v_next_day_index, 'is_completed', v_next_is_completed,
    'completed_week_index', v_current_week_index, 'completed_day_index', v_current_day_index
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_program_progress(uuid, uuid, text, uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.advance_program_progress(uuid, uuid, text, uuid, uuid) IS
'Advances program progression. When p_program_assignment_id and p_program_schedule_id are provided, records that specific day (enforces week order; allows any order within a week). Otherwise advances from current pointer (coach/legacy). Returns: advanced | already_completed | completed | error.';

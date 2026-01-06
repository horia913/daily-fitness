-- ============================================================================
-- CRITICAL ARCHITECTURE FIXES - Program Progression & Meal Photos
-- Date: 2025-12-29
-- Purpose: Fix program progression logic and meal photo accountability
-- ============================================================================

-- ============================================================================
-- PART 1: Add Uniqueness Constraint (Prevent Duplicate Completions)
-- ============================================================================

ALTER TABLE program_workout_completions
ADD CONSTRAINT unique_slot_completion 
UNIQUE (program_assignment_id, program_schedule_id);

CREATE INDEX IF NOT EXISTS idx_program_completions_assignment_schedule
ON program_workout_completions(program_assignment_id, program_schedule_id);

COMMENT ON TABLE program_workout_completions IS 
'Tracks which specific program schedule slots have been completed. 
UNIQUE constraint prevents duplicate completions of same slot.';

-- ============================================================================
-- PART 2: Rewrite get_next_due_workout Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_due_workout(p_client_id UUID)
RETURNS JSON AS $$
DECLARE
  v_assignment RECORD;
  v_schedule RECORD;
  v_total_workouts_this_week INT;
  v_result JSON;
BEGIN
  -- Get active program assignment
  SELECT * INTO v_assignment
  FROM program_assignments
  WHERE client_id = p_client_id
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY start_date DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'status', 'no_active_program',
      'message', 'No active program assigned'
    );
  END IF;

  -- Count total workouts in current week (variable schedule)
  SELECT COUNT(*) INTO v_total_workouts_this_week
  FROM program_schedule
  WHERE program_id = v_assignment.program_id
    AND week_number = v_assignment.current_week;

  -- Check if all workouts in current week are completed
  IF v_assignment.days_completed_this_week >= v_total_workouts_this_week THEN
    -- Week is complete
    RETURN json_build_object(
      'status', 'week_complete',
      'message', 'Week ' || v_assignment.current_week || ' complete!',
      'current_week', v_assignment.current_week,
      'next_week', v_assignment.current_week + 1,
      'next_week_start_date', v_assignment.week_start_date + INTERVAL '7 days'
    );
  END IF;

  -- Find FIRST INCOMPLETE workout in current week
  SELECT ps.* INTO v_schedule
  FROM program_schedule ps
  WHERE ps.program_id = v_assignment.program_id
    AND ps.week_number = v_assignment.current_week
    AND NOT EXISTS (
      -- Check if this slot is already completed
      SELECT 1 FROM program_workout_completions pwc
      WHERE pwc.program_assignment_id = v_assignment.id
        AND pwc.program_schedule_id = ps.id
    )
  ORDER BY ps.day_of_week
  LIMIT 1;

  IF NOT FOUND THEN
    -- Should not happen (caught above), but safety check
    RETURN json_build_object(
      'status', 'week_complete',
      'message', 'All workouts in current week completed'
    );
  END IF;

  -- Build result with workout details
  SELECT json_build_object(
    'status', 'workout_due',
    'program_assignment_id', v_assignment.id,
    'program_schedule_id', v_schedule.id,
    'workout_template_id', v_schedule.workout_template_id,
    'week_number', v_schedule.week_number,
    'day_of_week', v_schedule.day_of_week,
    'week_progress', json_build_object(
      'completed', v_assignment.days_completed_this_week,
      'total', v_total_workouts_this_week
    ),
    'workout_details', (
      SELECT row_to_json(wt.*) FROM workout_templates wt WHERE wt.id = v_schedule.workout_template_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_next_due_workout IS 
'Returns next incomplete workout in current week for a client. 
Supports variable workouts/week. No rest days. Client can complete in any order.';

-- ============================================================================
-- PART 3: Rewrite complete_workout Function
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_workout(
  p_program_assignment_id UUID,
  p_program_schedule_id UUID,
  p_workout_log_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_assignment RECORD;
  v_schedule RECORD;
  v_total_workouts_this_week INT;
  v_new_days_completed INT;
  v_week_complete BOOLEAN;
BEGIN
  -- Get assignment
  SELECT * INTO v_assignment
  FROM program_assignments
  WHERE id = p_program_assignment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Program assignment not found');
  END IF;

  -- Get schedule slot
  SELECT * INTO v_schedule
  FROM program_schedule
  WHERE id = p_program_schedule_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Schedule slot not found');
  END IF;

  -- Verify slot belongs to current week
  IF v_schedule.week_number != v_assignment.current_week THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot complete workout from week ' || v_schedule.week_number || 
               '. You are currently on week ' || v_assignment.current_week
    );
  END IF;

  -- Insert completion (will fail if duplicate due to UNIQUE constraint)
  BEGIN
    INSERT INTO program_workout_completions (
      program_assignment_id,
      program_schedule_id,
      workout_log_id,
      completed_at
    ) VALUES (
      p_program_assignment_id,
      p_program_schedule_id,
      p_workout_log_id,
      NOW()
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This workout has already been completed'
    );
  END;

  -- Increment days_completed_this_week
  UPDATE program_assignments
  SET days_completed_this_week = days_completed_this_week + 1,
      last_workout_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE id = p_program_assignment_id
  RETURNING days_completed_this_week INTO v_new_days_completed;

  -- Count total workouts in this week
  SELECT COUNT(*) INTO v_total_workouts_this_week
  FROM program_schedule
  WHERE program_id = v_assignment.program_id
    AND week_number = v_assignment.current_week;

  -- Check if week is now complete
  v_week_complete := (v_new_days_completed >= v_total_workouts_this_week);

  -- If week complete, advance to next week
  IF v_week_complete THEN
    UPDATE program_assignments
    SET current_week = current_week + 1,
        days_completed_this_week = 0,
        week_start_date = week_start_date + INTERVAL '7 days',
        updated_at = NOW()
    WHERE id = p_program_assignment_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'days_completed', v_new_days_completed,
    'total_workouts_this_week', v_total_workouts_this_week,
    'week_complete', v_week_complete,
    'next_week', CASE WHEN v_week_complete THEN v_assignment.current_week + 1 ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION complete_workout IS 
'Completes a specific program schedule slot. Supports any-order completion. 
Advances week only when ALL workouts in current week are done. Prevents duplicates.';

-- ============================================================================
-- PART 4: Lock Down Meal Photo Policies (Client Cannot Edit/Delete)
-- ============================================================================

-- Drop policies that allow client UPDATE/DELETE
DROP POLICY IF EXISTS "meal_photos_update_own" ON meal_photo_logs;
DROP POLICY IF EXISTS "meal_photos_delete_own" ON meal_photo_logs;

-- Update table comment to clarify intent
COMMENT ON TABLE meal_photo_logs IS 
'Meal photo proof - clients can INSERT once per meal per day (enforced by unique constraint). 
NO UPDATE or DELETE allowed by clients. Photos are for coach accountability tracking only.';

-- Verify INSERT policy exists (should already exist from Slice 12)
-- If not, create it:
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meal_photo_logs' 
    AND policyname = 'meal_photos_insert_own'
  ) THEN
    CREATE POLICY "meal_photos_insert_own" ON meal_photo_logs 
    FOR INSERT 
    WITH CHECK (auth.uid() = client_id);
  END IF;
END $$;

-- Verify coaches can SELECT (should already exist from Slice 12)
-- If not, create it:
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meal_photo_logs' 
    AND policyname = 'meal_photos_select_coach'
  ) THEN
    CREATE POLICY "meal_photos_select_coach" ON meal_photo_logs 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('coach', 'admin', 'super_coach', 'supercoach')
      )
      OR auth.uid() = client_id
    );
  END IF;
END $$;

-- Add coach UPDATE/DELETE policies (for admin purposes only)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meal_photo_logs' 
    AND policyname = 'meal_photos_update_coach'
  ) THEN
    CREATE POLICY "meal_photos_update_coach" ON meal_photo_logs 
    FOR UPDATE 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('coach', 'admin', 'super_coach', 'supercoach')
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meal_photo_logs' 
    AND policyname = 'meal_photos_delete_coach'
  ) THEN
    CREATE POLICY "meal_photos_delete_coach" ON meal_photo_logs 
    FOR DELETE 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('coach', 'admin', 'super_coach', 'supercoach')
      )
    );
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify)
-- ============================================================================

-- Verify uniqueness constraint was added
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'program_workout_completions'::regclass
  AND conname = 'unique_slot_completion';
-- Expected: 1 row with contype = 'u' (unique)

-- Verify functions were created/updated
SELECT 
  proname AS function_name,
  pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname IN ('get_next_due_workout', 'complete_workout')
ORDER BY proname;
-- Expected: 2 rows

-- Verify meal photo policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'meal_photo_logs'
ORDER BY policyname;
-- Expected: 
-- - meal_photos_insert_own (INSERT)
-- - meal_photos_select_coach (SELECT)
-- - meal_photos_update_coach (UPDATE)
-- - meal_photos_delete_coach (DELETE)
-- Should NOT have: meal_photos_update_own, meal_photos_delete_own

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================


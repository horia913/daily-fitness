-- ============================================================================
-- CRITICAL ARCHITECTURE FIXES - Program Progression & Meal Photos
-- Date: 2025-12-29
-- Purpose: Fix program progression logic and meal photo accountability
-- CORRECTED for actual schema
-- ============================================================================

-- ============================================================================
-- PART 1: Add Uniqueness Constraint (Prevent Duplicate Completions)
-- ============================================================================

-- Add unique constraint to prevent duplicate completions of same slot
ALTER TABLE program_workout_completions
ADD CONSTRAINT unique_week_day_completion 
UNIQUE (assignment_progress_id, week_number, program_day);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_program_completions_progress_week_day
ON program_workout_completions(assignment_progress_id, week_number, program_day);

COMMENT ON TABLE program_workout_completions IS 
'Tracks which specific program slots (week + day) have been completed. 
UNIQUE constraint prevents duplicate completions of same slot.';

-- ============================================================================
-- PART 2: Rewrite get_next_due_workout Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_due_workout(p_client_id UUID)
RETURNS JSON AS $$
DECLARE
  v_progress RECORD;
  v_schedule RECORD;
  v_total_workouts_this_week INT;
  v_result JSON;
BEGIN
  -- Get active program assignment progress
  SELECT * INTO v_progress
  FROM program_assignment_progress
  WHERE client_id = p_client_id
    AND is_program_completed = false
    AND (completed_at IS NULL)
  ORDER BY created_at DESC
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
  WHERE program_id = v_progress.program_id
    AND week_number = v_progress.current_week;

  -- Check if all workouts in current week are completed
  IF v_progress.days_completed_this_week >= v_total_workouts_this_week THEN
    -- Week is complete
    RETURN json_build_object(
      'status', 'week_complete',
      'message', 'Week ' || v_progress.current_week || ' complete!',
      'current_week', v_progress.current_week,
      'next_week', v_progress.current_week + 1,
      'days_completed', v_progress.days_completed_this_week,
      'total_workouts', v_total_workouts_this_week
    );
  END IF;

  -- Find FIRST INCOMPLETE workout in current week (any order)
  SELECT ps.* INTO v_schedule
  FROM program_schedule ps
  WHERE ps.program_id = v_progress.program_id
    AND ps.week_number = v_progress.current_week
    AND NOT EXISTS (
      -- Check if this slot is already completed
      SELECT 1 FROM program_workout_completions pwc
      WHERE pwc.assignment_progress_id = v_progress.id
        AND pwc.week_number = ps.week_number
        AND pwc.program_day = ps.day_of_week
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
    'assignment_progress_id', v_progress.id,
    'program_schedule_id', v_schedule.id,
    'workout_template_id', v_schedule.template_id,
    'week_number', v_schedule.week_number,
    'program_day', v_schedule.day_of_week,
    'week_progress', json_build_object(
      'completed', v_progress.days_completed_this_week,
      'total', v_total_workouts_this_week
    ),
    'workout_details', (
      SELECT row_to_json(wt.*) FROM workout_templates wt WHERE wt.id = v_schedule.template_id
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
  p_assignment_progress_id UUID,
  p_week_number INT,
  p_program_day INT,
  p_template_id UUID,
  p_duration_minutes INT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_progress RECORD;
  v_schedule RECORD;
  v_total_workouts_this_week INT;
  v_new_days_completed INT;
  v_week_complete BOOLEAN;
BEGIN
  -- Get assignment progress
  SELECT * INTO v_progress
  FROM program_assignment_progress
  WHERE id = p_assignment_progress_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Program assignment not found');
  END IF;

  -- Verify week matches current week
  IF p_week_number != v_progress.current_week THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot complete workout from week ' || p_week_number || 
               '. You are currently on week ' || v_progress.current_week
    );
  END IF;

  -- Verify schedule slot exists
  SELECT * INTO v_schedule
  FROM program_schedule
  WHERE program_id = v_progress.program_id
    AND week_number = p_week_number
    AND day_of_week = p_program_day
    AND template_id = p_template_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Workout not found in program schedule'
    );
  END IF;

  -- Insert completion (will fail if duplicate due to UNIQUE constraint)
  BEGIN
    INSERT INTO program_workout_completions (
      assignment_progress_id,
      client_id,
      program_id,
      week_number,
      program_day,
      template_id,
      workout_date,
      completed_at,
      duration_minutes,
      notes
    ) VALUES (
      p_assignment_progress_id,
      v_progress.client_id,
      v_progress.program_id,
      p_week_number,
      p_program_day,
      p_template_id,
      CURRENT_DATE,
      NOW(),
      p_duration_minutes,
      p_notes
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This workout has already been completed'
    );
  END;

  -- Increment days_completed_this_week
  UPDATE program_assignment_progress
  SET days_completed_this_week = days_completed_this_week + 1,
      last_workout_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE id = p_assignment_progress_id
  RETURNING days_completed_this_week INTO v_new_days_completed;

  -- Count total workouts in this week
  SELECT COUNT(*) INTO v_total_workouts_this_week
  FROM program_schedule
  WHERE program_id = v_progress.program_id
    AND week_number = v_progress.current_week;

  -- Check if week is now complete
  v_week_complete := (v_new_days_completed >= v_total_workouts_this_week);

  -- If week complete, advance to next week
  IF v_week_complete THEN
    UPDATE program_assignment_progress
    SET current_week = current_week + 1,
        current_day = 1,
        days_completed_this_week = 0,
        total_weeks_completed = total_weeks_completed + 1,
        cycle_start_date = cycle_start_date + INTERVAL '7 days',
        updated_at = NOW()
    WHERE id = p_assignment_progress_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'days_completed', v_new_days_completed,
    'total_workouts_this_week', v_total_workouts_this_week,
    'week_complete', v_week_complete,
    'current_week', v_progress.current_week,
    'next_week', CASE WHEN v_week_complete THEN v_progress.current_week + 1 ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION complete_workout IS 
'Completes a specific program slot (week + day). Supports any-order completion. 
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

-- Verify coaches can SELECT
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
  AND conname = 'unique_week_day_completion';
-- Expected: 1 row with contype = 'u' (unique)

-- Verify functions were created/updated
SELECT 
  proname AS function_name
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
-- Expected: 4 policies
-- Should NOT have: meal_photos_update_own, meal_photos_delete_own

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================


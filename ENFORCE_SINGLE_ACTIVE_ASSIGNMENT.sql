-- ============================================================================
-- Enforce Single Active Assignment Rules
-- ============================================================================
-- This script ensures:
-- 1. Only ONE program assignment per client (when new one assigned, old ones set to 'completed')
-- 2. Only ONE active meal plan per client (when new one set to active, others set to inactive)
-- ============================================================================

-- ============================================================================
-- 1. PROGRAM ASSIGNMENTS: Enforce single assignment per client
-- ============================================================================
-- When a new program is assigned (status='active'), set all other programs 
-- for that client to status='completed' to preserve progress history

CREATE OR REPLACE FUNCTION enforce_single_program_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status is 'active'
  IF NEW.status = 'active' THEN
    -- Set all other program assignments for this client to 'completed'
    UPDATE program_assignments
    SET status = 'completed',
        updated_at = NOW()
    WHERE client_id = NEW.client_id
      AND id != NEW.id
      AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_enforce_single_program_assignment ON program_assignments;

-- Create trigger
CREATE TRIGGER trigger_enforce_single_program_assignment
  BEFORE INSERT OR UPDATE ON program_assignments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_program_assignment();

-- ============================================================================
-- 2. MEAL PLAN ASSIGNMENTS: Enforce single active meal plan per client
-- ============================================================================
-- When a meal plan is set to is_active=true, set all other active meal plans
-- for that client to is_active=false

CREATE OR REPLACE FUNCTION enforce_single_active_meal_plan()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when is_active is set to true
  IF NEW.is_active = true THEN
    -- Set all other active meal plan assignments for this client to inactive
    UPDATE meal_plan_assignments
    SET is_active = false
    WHERE client_id = NEW.client_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_enforce_single_active_meal_plan ON meal_plan_assignments;

-- Create trigger
CREATE TRIGGER trigger_enforce_single_active_meal_plan
  BEFORE INSERT OR UPDATE ON meal_plan_assignments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_active_meal_plan();

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_enforce_single_program_assignment',
  'trigger_enforce_single_active_meal_plan'
)
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. Program assignments: Old assignments are set to 'completed' status to 
--    preserve progress history (coach can see completed programs)
-- 2. Meal plan assignments: Old active meal plans are set to is_active=false
--    but remain in the database (client can have multiple assigned, only one active)
-- 3. Triggers run BEFORE INSERT/UPDATE to ensure data integrity at database level
-- 4. This prevents race conditions and works even if application code has bugs
-- ============================================================================

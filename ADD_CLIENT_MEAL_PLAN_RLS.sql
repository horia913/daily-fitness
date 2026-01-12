-- Add RLS policy to allow clients to view their own meal plan assignments
-- This fixes the issue where clients cannot see their assigned meal plans

-- Drop existing client policy if it exists
DROP POLICY IF EXISTS "Clients can view their own meal plan assignments" ON meal_plan_assignments;

-- Policy: Clients can SELECT their own meal plan assignments
CREATE POLICY "Clients can view their own meal plan assignments"
ON meal_plan_assignments
FOR SELECT
TO public
USING (client_id = auth.uid());

-- Also ensure clients can view their assigned meal plans
DROP POLICY IF EXISTS "Clients can view assigned meal plans" ON meal_plans;

CREATE POLICY "Clients can view assigned meal plans"
ON meal_plans
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM meal_plan_assignments mpa
    WHERE mpa.meal_plan_id = meal_plans.id
    AND mpa.client_id = auth.uid()
  )
);

-- Fix existing meal plan assignments that don't have is_active set to true
-- This ensures assignments created before the fix will still be visible to clients

-- Update all assignments without an end_date (or future end_date) to be active
UPDATE meal_plan_assignments
SET is_active = true
WHERE is_active IS NULL 
   OR is_active = false
   AND (end_date IS NULL OR end_date >= CURRENT_DATE);

-- Also ensure assignments within date range are active
UPDATE meal_plan_assignments
SET is_active = true
WHERE start_date <= CURRENT_DATE
  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  AND (is_active IS NULL OR is_active = false);

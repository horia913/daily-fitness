-- ============================================================================
-- CLEANUP: Remove Old/Duplicate Meal Photo Policies
-- ============================================================================

-- Drop old policies with meal_photo_logs_* naming
DROP POLICY IF EXISTS "meal_photo_logs_delete_own" ON meal_photo_logs;
DROP POLICY IF EXISTS "meal_photo_logs_insert_own" ON meal_photo_logs;
DROP POLICY IF EXISTS "meal_photo_logs_select_own" ON meal_photo_logs;
DROP POLICY IF EXISTS "meal_photo_logs_update_own" ON meal_photo_logs;

-- Verify only the correct policies remain
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'meal_photo_logs'
ORDER BY policyname;

-- Expected result: 4 policies
-- meal_photos_delete_coach (DELETE)
-- meal_photos_insert_own (INSERT)
-- meal_photos_select_coach (SELECT)
-- meal_photos_update_coach (UPDATE)


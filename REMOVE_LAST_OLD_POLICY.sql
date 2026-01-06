-- Remove the last old policy with incorrect naming
DROP POLICY IF EXISTS "meal_photo_logs_select_coach" ON meal_photo_logs;

-- Verify only correct policies remain (should be 4)
SELECT 
  policyname, 
  cmd,
  '✅ Clean' as status
FROM pg_policies
WHERE tablename = 'meal_photo_logs'
ORDER BY cmd, policyname;

-- Expected result:
-- meal_photos_delete_coach (DELETE)
-- meal_photos_insert_own (INSERT)
-- meal_photos_select_coach (SELECT)
-- meal_photos_update_coach (UPDATE)


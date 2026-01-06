-- ============================================================================
-- VERIFICATION: Check All Critical Fixes Applied
-- ============================================================================

-- 1. Check uniqueness constraint exists
SELECT 
  'Uniqueness Constraint' as check_name,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_constraint
WHERE conrelid = 'program_workout_completions'::regclass
  AND conname = 'unique_week_day_completion';

-- 2. Check both functions exist
SELECT 
  'Functions Exist' as check_name,
  CASE WHEN COUNT(*) = 2 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_proc
WHERE proname IN ('get_next_due_workout', 'complete_workout');

-- 3. Check meal photo policies are correct (should be 4)
SELECT 
  'Meal Photo Policies' as check_name,
  CASE WHEN COUNT(*) = 4 THEN '✅ PASS' ELSE '⚠️  REVIEW (' || COUNT(*) || ' policies)' END as status
FROM pg_policies
WHERE tablename = 'meal_photo_logs'
  AND policyname IN (
    'meal_photos_insert_own',
    'meal_photos_select_coach', 
    'meal_photos_update_coach',
    'meal_photos_delete_coach'
  );

-- 4. Check no client UPDATE/DELETE policies exist
SELECT 
  'No Client Edit Policies' as check_name,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_policies
WHERE tablename = 'meal_photo_logs'
  AND policyname LIKE '%_own'
  AND cmd IN ('UPDATE', 'DELETE');

-- Show all current meal photo policies for review
SELECT '=== Current Meal Photo Policies ===' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'meal_photo_logs'
ORDER BY policyname;


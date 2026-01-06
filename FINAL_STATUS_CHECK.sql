-- ============================================================================
-- FINAL STATUS CHECK - All Critical Fixes
-- ============================================================================

-- 1. Uniqueness Constraint Status
SELECT 
  '1. UNIQUENESS CONSTRAINT' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'program_workout_completions'::regclass
        AND conname = 'unique_week_day_completion'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 2. Functions Status
SELECT 
  '2. FUNCTIONS' as check_item,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('get_next_due_workout', 'complete_workout')) = 2 
    THEN '✅ BOTH EXIST'
    ELSE '❌ MISSING'
  END as status;

-- 3. Meal Photo Policies - Final Count
SELECT 
  '3. MEAL PHOTO POLICIES' as check_item,
  COUNT(*) || ' policies (' || 
  CASE 
    WHEN COUNT(*) <= 5 THEN '✅ ACCEPTABLE'
    ELSE '⚠️ TOO MANY'
  END || ')' as status
FROM pg_policies
WHERE tablename = 'meal_photo_logs';

-- 4. Client Cannot Edit/Delete
SELECT 
  '4. CLIENT EDIT PROTECTION' as check_item,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'meal_photo_logs'
        AND policyname LIKE '%_own'
        AND cmd IN ('UPDATE', 'DELETE')
    ) THEN '✅ LOCKED DOWN'
    ELSE '❌ STILL EDITABLE'
  END as status;

-- Show current policies for reference
SELECT '═══════════════════════════════════════' as separator;
SELECT 'CURRENT MEAL PHOTO POLICIES:' as info;
SELECT policyname, cmd, 
  CASE 
    WHEN policyname LIKE 'meal_photos_%' THEN '✅ Correct naming'
    ELSE '⚠️ Old naming'
  END as naming_status
FROM pg_policies
WHERE tablename = 'meal_photo_logs'
ORDER BY cmd, policyname;


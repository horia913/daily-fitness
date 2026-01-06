-- Fix RLS policies for workout_categories table
-- This ensures coaches and admins can manage workout categories

-- Step 1: Drop existing policies (if they exist)
-- ============================================================================

DROP POLICY IF EXISTS "Coaches can insert workout categories" ON workout_categories;
DROP POLICY IF EXISTS "Coaches can update workout categories" ON workout_categories;
DROP POLICY IF EXISTS "Coaches can delete workout categories" ON workout_categories;
DROP POLICY IF EXISTS "Coaches can view workout categories" ON workout_categories;
DROP POLICY IF EXISTS "Anyone can read workout categories" ON workout_categories;

-- Step 2: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE workout_categories ENABLE ROW LEVEL SECURITY;

-- Step 3: Create proper RLS policies
-- ============================================================================

-- Policy: Coaches and admins can view their own workout categories
CREATE POLICY "Coaches can view workout categories"
ON workout_categories
FOR SELECT
TO public
USING (
  coach_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('coach', 'admin')
    AND profiles.id = workout_categories.coach_id
  )
);

-- Policy: Coaches and admins can insert workout categories
CREATE POLICY "Coaches can insert workout categories"
ON workout_categories
FOR INSERT
TO public
WITH CHECK (
  coach_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('coach', 'admin')
  )
);

-- Policy: Coaches and admins can update their own workout categories
CREATE POLICY "Coaches can update workout categories"
ON workout_categories
FOR UPDATE
TO public
USING (
  coach_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('coach', 'admin')
  )
)
WITH CHECK (
  coach_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('coach', 'admin')
  )
);

-- Policy: Coaches and admins can delete their own workout categories
CREATE POLICY "Coaches can delete workout categories"
ON workout_categories
FOR DELETE
TO public
USING (
  coach_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('coach', 'admin')
  )
);

-- Step 4: Verification
-- ============================================================================

-- Verify policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'workout_categories'
ORDER BY cmd, policyname;


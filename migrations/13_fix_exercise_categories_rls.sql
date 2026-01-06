-- Fix RLS policies for exercise_categories table
-- This ensures coaches can create, update, and delete exercise categories

-- Step 1: Drop existing policies (if they exist)
-- ============================================================================

DROP POLICY IF EXISTS "Coaches can insert exercise categories" ON exercise_categories;
DROP POLICY IF EXISTS "Coaches can update exercise categories" ON exercise_categories;
DROP POLICY IF EXISTS "Coaches can delete exercise categories" ON exercise_categories;
DROP POLICY IF EXISTS "Anyone can read exercise categories" ON exercise_categories;
DROP POLICY IF EXISTS "Everyone can view exercise categories" ON exercise_categories;

-- Step 2: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE exercise_categories ENABLE ROW LEVEL SECURITY;

-- Step 3: Create proper RLS policies
-- ============================================================================

-- Policy: Anyone authenticated can read exercise categories
CREATE POLICY "Anyone can read exercise categories"
ON exercise_categories
FOR SELECT
TO public
USING (auth.role() = 'authenticated');

-- Policy: Coaches and admins can insert exercise categories
-- WITH CHECK ensures the user is a coach or admin before allowing insert
CREATE POLICY "Coaches can insert exercise categories"
ON exercise_categories
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('coach', 'admin')
  )
);

-- Policy: Coaches and admins can update exercise categories
-- USING checks existing rows, WITH CHECK validates new row values
CREATE POLICY "Coaches can update exercise categories"
ON exercise_categories
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('coach', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('coach', 'admin')
  )
);

-- Policy: Coaches and admins can delete exercise categories
CREATE POLICY "Coaches can delete exercise categories"
ON exercise_categories
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('coach', 'admin')
  )
);

-- Step 4: Verification queries
-- ============================================================================

-- Check your current user role (run this first to verify you're a coach)
-- Replace 'YOUR_USER_ID' with your actual auth.uid() or run: SELECT auth.uid();
SELECT 
  id,
  email,
  role,
  first_name,
  last_name
FROM profiles
WHERE id = auth.uid();

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
WHERE tablename = 'exercise_categories'
ORDER BY cmd, policyname;


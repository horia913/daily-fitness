-- ============================================================================
-- Fix RLS Policies for exercise_alternatives Table
-- Purpose: Ensure coaches can only manage alternatives for exercises they own
-- ============================================================================

-- Step 1: Drop existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Coaches can insert exercise alternatives" ON exercise_alternatives;
DROP POLICY IF EXISTS "Coaches can update exercise alternatives" ON exercise_alternatives;
DROP POLICY IF EXISTS "Coaches can delete exercise alternatives" ON exercise_alternatives;
DROP POLICY IF EXISTS "Anyone can read exercise alternatives" ON exercise_alternatives;

-- Step 2: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE exercise_alternatives ENABLE ROW LEVEL SECURITY;

-- Step 3: Create proper RLS policies
-- ============================================================================

-- Policy: Anyone authenticated can read exercise alternatives
CREATE POLICY "Anyone can read exercise alternatives"
ON exercise_alternatives
FOR SELECT
TO public
USING (auth.role() = 'authenticated');

-- Policy: Coaches can insert alternatives for exercises they own
-- WITH CHECK ensures the coach owns both the primary and alternative exercises
CREATE POLICY "Coaches can insert exercise alternatives for their exercises"
ON exercise_alternatives
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'coach'
  )
  AND EXISTS (
    SELECT 1
    FROM exercises
    WHERE exercises.id = exercise_alternatives.primary_exercise_id
    AND exercises.coach_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM exercises
    WHERE exercises.id = exercise_alternatives.alternative_exercise_id
    AND exercises.coach_id = auth.uid()
  )
);

-- Policy: Coaches can update alternatives for exercises they own
CREATE POLICY "Coaches can update exercise alternatives for their exercises"
ON exercise_alternatives
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'coach'
  )
  AND EXISTS (
    SELECT 1
    FROM exercises
    WHERE exercises.id = exercise_alternatives.primary_exercise_id
    AND exercises.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'coach'
  )
  AND EXISTS (
    SELECT 1
    FROM exercises
    WHERE exercises.id = exercise_alternatives.primary_exercise_id
    AND exercises.coach_id = auth.uid()
  )
);

-- Policy: Coaches can delete alternatives for exercises they own
CREATE POLICY "Coaches can delete exercise alternatives for their exercises"
ON exercise_alternatives
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'coach'
  )
  AND EXISTS (
    SELECT 1
    FROM exercises
    WHERE exercises.id = exercise_alternatives.primary_exercise_id
    AND exercises.coach_id = auth.uid()
  )
);

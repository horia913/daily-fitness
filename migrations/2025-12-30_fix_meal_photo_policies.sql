-- Migration: Fix Meal Photo Policies - Remove Client UPDATE/DELETE
-- Date: 2025-12-30
-- Purpose: Enforce business rule - clients can only INSERT meal photos, never UPDATE or DELETE
-- This ensures accountability: once a photo is logged, it cannot be changed or removed by the client

-- ============================================================================
-- PART 1: Drop client UPDATE/DELETE policies if they exist
-- ============================================================================

-- Drop UPDATE policy for clients (if exists with any name variation)
DROP POLICY IF EXISTS "meal_photo_logs_update_own" ON meal_photo_logs;
DROP POLICY IF EXISTS "meal_photos_update_own" ON meal_photo_logs;
DROP POLICY IF EXISTS "meal_photos_update_client" ON meal_photo_logs;

-- Drop DELETE policy for clients (if exists with any name variation)
DROP POLICY IF EXISTS "meal_photo_logs_delete_own" ON meal_photo_logs;
DROP POLICY IF EXISTS "meal_photos_delete_own" ON meal_photo_logs;
DROP POLICY IF EXISTS "meal_photos_delete_client" ON meal_photo_logs;

-- ============================================================================
-- PART 2: Verify INSERT policy exists (clients can only INSERT)
-- ============================================================================

DO $$ 
BEGIN
  -- Ensure INSERT policy exists for clients
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meal_photo_logs' 
    AND policyname IN ('meal_photo_logs_insert_own', 'meal_photos_insert_own')
  ) THEN
    CREATE POLICY "meal_photos_insert_own" ON meal_photo_logs 
    FOR INSERT 
    WITH CHECK (auth.uid() = client_id);
  END IF;
END $$;

-- ============================================================================
-- PART 3: Verify SELECT policies exist
-- ============================================================================

-- Clients can SELECT their own photos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meal_photo_logs' 
    AND policyname IN ('meal_photo_logs_select_own', 'meal_photos_select_own')
  ) THEN
    CREATE POLICY "meal_photos_select_own" ON meal_photo_logs
    FOR SELECT
    USING (auth.uid() = client_id);
  END IF;
END $$;

-- Coaches can SELECT their clients' photos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meal_photo_logs' 
    AND policyname = 'meal_photos_select_coach'
  ) THEN
    CREATE POLICY "meal_photos_select_coach" ON meal_photo_logs
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('coach', 'admin', 'super_coach', 'supercoach')
      )
      OR auth.uid() = client_id
    );
  END IF;
END $$;

-- ============================================================================
-- PART 4: Ensure coach UPDATE/DELETE policies exist (for admin purposes)
-- ============================================================================

-- Coaches can UPDATE (for corrections/admin purposes)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meal_photo_logs' 
    AND policyname = 'meal_photos_update_coach'
  ) THEN
    CREATE POLICY "meal_photos_update_coach" ON meal_photo_logs 
    FOR UPDATE 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('coach', 'admin', 'super_coach', 'supercoach')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('coach', 'admin', 'super_coach', 'supercoach')
      )
    );
  END IF;
END $$;

-- Coaches can DELETE (for admin purposes)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meal_photo_logs' 
    AND policyname = 'meal_photos_delete_coach'
  ) THEN
    CREATE POLICY "meal_photos_delete_coach" ON meal_photo_logs 
    FOR DELETE 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('coach', 'admin', 'super_coach', 'supercoach')
      )
    );
  END IF;
END $$;

-- ============================================================================
-- PART 5: Update table comment to document the rule
-- ============================================================================

COMMENT ON TABLE meal_photo_logs IS 
'Meal photo proof - clients can INSERT once per meal per day (enforced by unique constraint). 
NO UPDATE or DELETE allowed by clients. Photos are for coach accountability tracking only.
Coaches can UPDATE/DELETE for admin purposes.';

-- ============================================================================
-- VERIFICATION QUERIES (run these after migration)
-- ============================================================================

-- Query 1: Verify no client UPDATE/DELETE policies exist
-- SELECT policyname, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'meal_photo_logs' 
-- AND (cmd = 'UPDATE' OR cmd = 'DELETE')
-- AND policyname NOT LIKE '%coach%';
-- Expected: 0 rows (no client UPDATE/DELETE policies)

-- Query 2: Verify INSERT policy exists for clients
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'meal_photo_logs' 
-- AND cmd = 'INSERT'
-- AND (qual LIKE '%client_id%' OR with_check LIKE '%client_id%');
-- Expected: 1 row with client_id check

-- Query 3: List all policies
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'meal_photo_logs'
-- ORDER BY cmd, policyname;
-- Expected: INSERT (client), SELECT (client + coach), UPDATE (coach only), DELETE (coach only)


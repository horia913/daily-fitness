-- Migration: Canonical Meal Photo Logging
-- Date: 2025-12-28
-- Purpose: Implement "1 photo per meal per day" constraint and DB-backed meal logging

-- ============================================================================
-- PART 1: Create meal_photo_logs table (if doesn't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS meal_photo_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  photo_url TEXT NOT NULL, -- Supabase storage URL
  photo_path TEXT NOT NULL, -- Storage bucket path for deletion
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PART 2: Add unique constraint (1 photo per meal per day)
-- ============================================================================

-- Only one photo per (client, meal, date)
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_photo_logs_unique_per_day
ON meal_photo_logs(client_id, meal_id, log_date);

-- ============================================================================
-- PART 3: Add indexes for common queries
-- ============================================================================

-- Index for client's meal logs (most common query)
CREATE INDEX IF NOT EXISTS idx_meal_photo_logs_client_date
ON meal_photo_logs(client_id, log_date DESC);

-- Index for meal history
CREATE INDEX IF NOT EXISTS idx_meal_photo_logs_meal
ON meal_photo_logs(meal_id, log_date DESC);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_meal_photo_logs_date
ON meal_photo_logs(log_date DESC);

-- ============================================================================
-- PART 4: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE meal_photo_logs IS 'Tracks client meal photo uploads - enforces 1 photo per meal per day';
COMMENT ON COLUMN meal_photo_logs.meal_id IS 'Links to meals table (from assigned meal plan)';
COMMENT ON COLUMN meal_photo_logs.log_date IS 'Date the meal was logged (not necessarily today)';
COMMENT ON COLUMN meal_photo_logs.photo_url IS 'Public URL from Supabase storage';
COMMENT ON COLUMN meal_photo_logs.photo_path IS 'Storage path for deletion: {client_id}/{meal_id}/{filename}';

-- ============================================================================
-- PART 5: RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE meal_photo_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can read their own meal logs
CREATE POLICY "meal_photo_logs_select_own" ON meal_photo_logs
  FOR SELECT
  USING (auth.uid() = client_id);

-- Policy: Clients can insert their own meal logs
CREATE POLICY "meal_photo_logs_insert_own" ON meal_photo_logs
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- Policy: Clients can update their own meal logs
-- (For replace functionality - deletes old, inserts new)
CREATE POLICY "meal_photo_logs_update_own" ON meal_photo_logs
  FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Policy: Clients can delete their own meal logs
CREATE POLICY "meal_photo_logs_delete_own" ON meal_photo_logs
  FOR DELETE
  USING (auth.uid() = client_id);

-- Policy: Coaches can read their clients' meal logs
-- (Checks if coach has assigned workouts/programs to this client)
CREATE POLICY "meal_photo_logs_select_coach" ON meal_photo_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('coach', 'admin', 'super_coach', 'supercoach')
      AND (
        -- Coach has assigned workouts to this client
        EXISTS (
          SELECT 1 FROM workout_assignments
          WHERE coach_id = auth.uid()
          AND client_id = meal_photo_logs.client_id
        )
        OR
        -- Coach has assigned programs to this client
        EXISTS (
          SELECT 1 FROM program_assignments
          WHERE coach_id = auth.uid()
          AND client_id = meal_photo_logs.client_id
        )
      )
    )
  );

-- ============================================================================
-- PART 6: Create storage bucket (if doesn't exist)
-- ============================================================================

-- Note: This must be run in Supabase Dashboard (Storage section), or via Supabase API
-- Bucket name: 'meal-photos'
-- Public: false (requires auth)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- RLS policies for storage bucket (in Supabase UI):
-- 1. SELECT: authenticated users can read their own photos OR their coach can read
-- 2. INSERT: authenticated users can upload to their own folder
-- 3. UPDATE: authenticated users can replace their own photos
-- 4. DELETE: authenticated users can delete their own photos

-- ============================================================================
-- VERIFICATION QUERIES (run these after migration)
-- ============================================================================

-- Query 1: Check table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'meal_photo_logs'
-- ORDER BY ordinal_position;

-- Query 2: Check unique constraint exists
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'meal_photo_logs' 
-- AND indexname LIKE '%unique%';

-- Query 3: Check RLS policies
-- SELECT policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'meal_photo_logs';

-- Query 4: Test uniqueness constraint (should fail on 2nd insert)
-- -- First insert (should succeed)
-- INSERT INTO meal_photo_logs (client_id, meal_id, log_date, photo_url, photo_path)
-- VALUES ('<test_client_id>', '<test_meal_id>', CURRENT_DATE, 'test_url', 'test_path');
--
-- -- Second insert same day (should fail with unique violation)
-- INSERT INTO meal_photo_logs (client_id, meal_id, log_date, photo_url, photo_path)
-- VALUES ('<test_client_id>', '<test_meal_id>', CURRENT_DATE, 'test_url2', 'test_path2');
--
-- -- Cleanup
-- DELETE FROM meal_photo_logs WHERE photo_path LIKE 'test_%';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- Storage Bucket Setup (Manual in Supabase Dashboard):
-- 1. Go to Storage → Create bucket "meal-photos"
-- 2. Set to Private (requires authentication)
-- 3. Set file size limit: 5MB
-- 4. Add RLS policy: 
--    SELECT: auth.uid() = (storage.foldername(name))[1]::uuid OR coach can access
--    INSERT: auth.uid() = (storage.foldername(name))[1]::uuid
--    UPDATE: auth.uid() = (storage.foldername(name))[1]::uuid
--    DELETE: auth.uid() = (storage.foldername(name))[1]::uuid

-- File Path Convention:
-- {client_id}/{meal_id}/{timestamp}_{filename}
-- Example: abc123.../def456.../1703872000_breakfast.jpg

-- Supabase Storage URL Format:
-- https://<project>.supabase.co/storage/v1/object/public/meal-photos/{path}
-- (Even though bucket is private, URL is generated with signed token when needed)


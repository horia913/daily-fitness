-- Migration: Canonical Meal Photo Logging (FIXED)
-- Date: 2025-12-28
-- Purpose: Implement "1 photo per meal per day" constraint and DB-backed meal logging

-- ============================================================================
-- PART 1: Create meal_photo_logs table (if doesn't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS meal_photo_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_id UUID, -- NULLABLE for now, will add FK after confirming meals table exists
  meal_name TEXT, -- Fallback: store meal name if meal_id not available
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
-- Using meal_id if available, otherwise meal_name
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_photo_logs_unique_per_day
ON meal_photo_logs(client_id, COALESCE(meal_id::text, meal_name), log_date);

-- ============================================================================
-- PART 3: Add indexes for common queries
-- ============================================================================

-- Index for client's meal logs (most common query)
CREATE INDEX IF NOT EXISTS idx_meal_photo_logs_client_date
ON meal_photo_logs(client_id, log_date DESC);

-- Index for meal history (if meal_id is used)
CREATE INDEX IF NOT EXISTS idx_meal_photo_logs_meal
ON meal_photo_logs(meal_id, log_date DESC)
WHERE meal_id IS NOT NULL;

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_meal_photo_logs_date
ON meal_photo_logs(log_date DESC);

-- ============================================================================
-- PART 4: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE meal_photo_logs IS 'Tracks client meal photo uploads - enforces 1 photo per meal per day';
COMMENT ON COLUMN meal_photo_logs.meal_id IS 'Links to meals table (nullable until meals table is confirmed)';
COMMENT ON COLUMN meal_photo_logs.meal_name IS 'Meal name as fallback if meal_id not available';
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
CREATE POLICY "meal_photo_logs_select_coach" ON meal_photo_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('coach', 'admin', 'super_coach', 'supercoach')
      AND EXISTS (
        SELECT 1 FROM profiles c
        WHERE c.id = meal_photo_logs.client_id
        AND c.coach_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- OPTIONAL: Add FK constraint after confirming meals table
-- ============================================================================

-- Run this later if you have a meals table:
-- ALTER TABLE meal_photo_logs 
-- ADD CONSTRAINT meal_photo_logs_meal_id_fkey 
-- FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE;

-- ============================================================================
-- VERIFICATION QUERIES (run these after migration)
-- ============================================================================

-- Query 1: Check table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'meal_photo_logs'
-- ORDER BY ordinal_position;

-- Query 2: Check unique constraint
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'meal_photo_logs' 
-- AND indexname LIKE '%unique%';

-- Query 3: Check RLS policies
-- SELECT policyname, permissive, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'meal_photo_logs';


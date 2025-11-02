-- ============================================
-- Progress Photos Storage Setup
-- ============================================
-- This migration sets up Supabase Storage for progress tracking photos
-- Bucket: progress-photos
-- Folders: body-metrics/{client_id}/{record_id}/
--         mobility/{client_id}/{record_id}/
--         fms/{client_id}/{record_id}/
-- ============================================

-- Note: Storage bucket creation and RLS policies must be set up in Supabase Dashboard
-- This file provides the SQL for RLS policies only
-- The bucket itself needs to be created via Supabase Dashboard or CLI

-- Step 1: RLS Policies for progress-photos bucket
-- These policies allow clients to upload their own photos
-- and coaches to access photos for their clients

-- Policy: Clients can upload photos for their own records
-- Note: This is a placeholder - actual storage RLS syntax may vary
-- You'll need to set these up in Supabase Dashboard > Storage > Policies

/*
Example RLS Policies (set up in Supabase Dashboard):

1. Upload Policy (INSERT):
   Name: Clients can upload their own photos
   Policy: 
   - Authenticated users can INSERT
   - Path must match: {record_type}/{user_id}/{record_id}/*
   - user_id must match auth.uid()

2. Read Policy (SELECT):
   Name: Clients and coaches can view photos
   Policy:
   - Authenticated users can SELECT
   - Path must match their client_id OR they must be the coach for that client

3. Delete Policy (DELETE):
   Name: Clients can delete their own photos
   Policy:
   - Authenticated users can DELETE
   - Path must match: {record_type}/{user_id}/{record_id}/*
   - user_id must match auth.uid()
*/

-- Step 2: Optional - Add photo metadata columns to related tables
-- (Already included in update_mobility_metrics_schema.sql for mobility_metrics)

-- For body_metrics table
ALTER TABLE body_metrics
ADD COLUMN IF NOT EXISTS photos TEXT[];

COMMENT ON COLUMN body_metrics.photos IS 'Array of photo URLs from Supabase Storage (progress-photos/body-metrics bucket)';

-- For fms_assessments table
ALTER TABLE fms_assessments
ADD COLUMN IF NOT EXISTS photos TEXT[];

COMMENT ON COLUMN fms_assessments.photos IS 'Array of photo URLs from Supabase Storage (progress-photos/fms bucket)';

-- Step 3: Verification queries
-- After setting up storage bucket and RLS policies, test with:
-- 
-- 1. Test upload (as authenticated client):
--    INSERT into storage.objects (bucket_id, name, ...)
--    
-- 2. Test read access
-- 3. Test delete access
--
-- Use Supabase Storage API or Dashboard for actual operations


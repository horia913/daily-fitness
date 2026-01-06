-- Migration: Add client_type to profiles table
-- Date: 2025-12-28
-- Purpose: Segment clients into 'online' and 'in_gym' types for feature gating

-- Step 1: Create enum type for client_type
DO $$ BEGIN
  CREATE TYPE client_type AS ENUM ('online', 'in_gym');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add client_type column to profiles table
-- Default to 'online' for all existing and new clients
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS client_type client_type NOT NULL DEFAULT 'online';

-- Step 3: Backfill existing gym clients (if you have a way to identify them)
-- Example: Update based on existing data patterns
-- UPDATE profiles 
-- SET client_type = 'in_gym' 
-- WHERE id IN (
--   SELECT DISTINCT client_id 
--   FROM session_bookings 
--   WHERE created_at IS NOT NULL
-- );

-- Or manually update specific clients:
-- UPDATE profiles SET client_type = 'in_gym' WHERE email IN ('client1@example.com', 'client2@example.com');

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_client_type ON profiles(client_type);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN profiles.client_type IS 'Client segment: online (no gym access) or in_gym (has gym sessions)';

-- Verification query (run after migration):
-- SELECT client_type, count(*) FROM profiles GROUP BY client_type;


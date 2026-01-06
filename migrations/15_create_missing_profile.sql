-- Create missing profile for user b6014e58-f696-4606-bc63-d7707a21d5f1
-- This fixes the exercise_categories RLS issue

-- Step 1: Check if profile exists and get user info from auth.users
-- ============================================================================

SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data,
  au.created_at,
  p.id as profile_exists
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.id = 'b6014e58-f696-4606-bc63-d7707a21d5f1';

-- Step 2: Create the profile
-- ============================================================================

-- Insert profile from auth.users data
-- This will only insert if profile doesn't already exist
INSERT INTO profiles (id, email, role, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(
    (raw_user_meta_data->>'role')::text,
    'coach'  -- Default to 'coach' since user is accessing coach pages
  ) as role,
  created_at,
  updated_at
FROM auth.users
WHERE id = 'b6014e58-f696-4606-bc63-d7707a21d5f1'
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
)
RETURNING id, email, role, created_at;

-- Step 3: Verify the profile was created
-- ============================================================================

SELECT 
  id,
  email,
  role,
  first_name,
  last_name,
  created_at
FROM profiles
WHERE id = 'b6014e58-f696-4606-bc63-d7707a21d5f1';

-- Step 4: Ensure RLS policies allow users to see their own profile
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy to ensure users can see their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO public
USING (id = auth.uid());


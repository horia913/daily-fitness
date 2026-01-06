-- Fix profiles table RLS policies and verify user profile exists
-- This ensures users can see their own profile, which is required for exercise_categories RLS

-- Step 1: Check if profiles table has RLS enabled and what policies exist
-- ============================================================================

-- View current RLS policies on profiles table
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
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- Step 2: Check if your profile exists (bypassing RLS using postgres role)
-- ============================================================================

-- First, get your auth.uid() - run this to see your user ID:
SELECT auth.uid() as current_user_id;

-- Then check if profile exists (this will work even with RLS):
-- Replace 'YOUR_USER_ID_HERE' with the result from above, or use:
SELECT 
  id,
  email,
  role,
  first_name,
  last_name,
  created_at
FROM profiles
WHERE id = auth.uid();

-- If no rows returned, your profile doesn't exist and needs to be created

-- Step 3: Ensure RLS policies allow users to see their own profile
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be blocking (if they exist)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO public
USING (id = auth.uid());

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO public
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy: Users can insert their own profile (for initial creation)
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO public
WITH CHECK (id = auth.uid());

-- Policy: Coaches can view all profiles (for coach dashboard, client management, etc.)
CREATE POLICY "Coaches can view all profiles"
ON profiles
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'coach'
  )
);

-- Step 4: Create missing profile (if needed)
-- ============================================================================

-- If your profile doesn't exist, run this to create it
-- Replace 'your-email@example.com' with your actual email
-- Replace 'coach' with your role ('coach' or 'client')

-- First, get your auth user info:
SELECT 
  id,
  email,
  raw_user_meta_data
FROM auth.users
WHERE id = auth.uid();

-- Then create profile (adjust role as needed):
-- INSERT INTO profiles (id, email, role, created_at, updated_at)
-- SELECT 
--   id,
--   email,
--   COALESCE((raw_user_meta_data->>'role')::text, 'client') as role,
--   created_at,
--   updated_at
-- FROM auth.users
-- WHERE id = auth.uid()
-- AND NOT EXISTS (
--   SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
-- );

-- Step 5: Verification
-- ============================================================================

-- After running the policies, verify you can see your profile:
SELECT 
  id,
  email,
  role,
  first_name,
  last_name,
  created_at
FROM profiles
WHERE id = auth.uid();

-- Verify policies are correct:
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;


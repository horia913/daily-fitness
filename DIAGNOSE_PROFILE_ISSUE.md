# Diagnose Profile Issue for Exercise Categories

## The Problem
When creating/editing exercise categories, you get: `new row violates row-level security policy for table "exercise_categories"`

This happens because the RLS policy checks if you're a coach by looking up your profile:
```sql
EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'coach'
)
```

## Step 1: Check Your Profile from Browser Console

Open your browser's Developer Console (F12) while logged into the app, and run:

```javascript
// Get your user ID
const { data: { user } } = await supabase.auth.getUser()
console.log('User ID:', user?.id)

// Check your profile
const { data: profile, error } = await supabase
  .from('profiles')
  .select('id, email, role, first_name, last_name')
  .eq('id', user?.id)
  .single()

console.log('Profile:', profile)
console.log('Profile Error:', error)
```

**What to look for:**
- If `profile` is `null` or `error` exists → Your profile doesn't exist or RLS is blocking access
- If `profile.role !== 'coach'` → Your role is not set to 'coach'

## Step 2: Fix Based on Results

### If Profile Doesn't Exist (profile is null):
Run this in Supabase SQL Editor (as postgres role):

```sql
-- First, get your user ID from auth.users
SELECT id, email, raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Find your user ID, then create profile:
-- Replace 'YOUR_USER_ID_HERE' with your actual ID from above
INSERT INTO profiles (id, email, role, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE((raw_user_meta_data->>'role')::text, 'coach') as role,
  created_at,
  updated_at
FROM auth.users
WHERE id = 'YOUR_USER_ID_HERE'
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
);
```

### If Profile Exists But Role is Wrong:
Run this in Supabase SQL Editor:

```sql
-- Update your role to 'coach'
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
UPDATE profiles
SET role = 'coach', updated_at = now()
WHERE id = 'YOUR_USER_ID_HERE';
```

### If Profile Exists But RLS is Blocking:
Run the migration: `migrations/14_fix_profiles_rls_and_verify.sql`

This ensures:
- Users can see their own profile
- Users can update their own profile
- Coaches can view all profiles

## Step 3: Verify It Works

After fixing, run this in browser console again:

```javascript
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('profiles')
  .select('id, email, role')
  .eq('id', user?.id)
  .single()

console.log('Profile role:', profile?.role) // Should be 'coach'
```

Then try creating an exercise category again.


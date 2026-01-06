# Slice 04: Manual Database Steps

## What was done automatically
- ✅ Created migration SQL file: `migrations/2025-12-28_add_profiles_client_type.sql`
- ✅ Updated `AuthContext` to fetch and expose `client_type` from profiles
- ✅ Added TypeScript types for `ClientType` ('online' | 'in_gym')

## What YOU need to do manually

### Step 1: Run the migration in Supabase SQL Editor
1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `migrations/2025-12-28_add_profiles_client_type.sql`
3. Paste and execute the SQL

### Step 2: Backfill existing clients (if needed)
If you have existing clients who should be marked as 'in_gym', update them:

```sql
-- Example: Update specific clients by email
UPDATE profiles 
SET client_type = 'in_gym' 
WHERE email IN (
  'client1@example.com',
  'client2@example.com'
);

-- Or update based on existing session data (if you have it)
UPDATE profiles 
SET client_type = 'in_gym' 
WHERE id IN (
  SELECT DISTINCT client_id 
  FROM session_bookings 
  WHERE created_at IS NOT NULL
);
```

### Step 3: Verify the migration
Run this query to confirm the column was added and data looks correct:

```sql
SELECT client_type, count(*) 
FROM profiles 
GROUP BY client_type;
```

Expected output:
```
client_type | count
------------+-------
online      | X
in_gym      | Y
```

### Step 4: Test in the app
1. Log in as a client
2. Open browser DevTools → Console
3. The profile object should now include `client_type`

## Next Steps
Once the migration is complete, proceed to **Slice 05** which will use `client_type` to gate navigation and features.


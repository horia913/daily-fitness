# Coach Dropdown Fix — Using Public-Safe Table

## Overview

The coach dropdown on signup pages now uses a dedicated `coaches_public` table instead of querying the `profiles` table directly. This approach:

- **Exposes minimal data**: Only `coach_id`, `first_name`, `last_name` (no email or other PII)
- **Works for anonymous users**: RLS policies allow `anon` role to read active coaches
- **Is secure by design**: No risk of accidentally exposing profile data

## Setup Instructions

### Step 1: Run the Migration (Create Table)

1. Open **Supabase Dashboard** → Select your **production project**
2. Go to **SQL Editor**
3. Copy the contents of `migrations/20260128_create_coaches_public.sql`
4. Click **Run**
5. Verify: Should see "Table created" and 3 policies listed

### Step 2: Seed the Data (Populate Coaches)

1. Still in **SQL Editor** (production)
2. Copy the contents of `migrations/20260128_seed_coaches_public.sql`
3. Click **Run**
4. Verify: Should see "Coaches synced" with count > 0

### Step 3: Test as Anonymous User

Run this in SQL Editor to verify anonymous access works:

```sql
SET ROLE anon;
SELECT coach_id, first_name, last_name 
FROM public.coaches_public 
WHERE is_active = true 
ORDER BY sort_order, last_name;
RESET ROLE;
```

**Expected**: Returns all active coaches without errors.

### Step 4: Deploy Frontend Changes

The frontend files have been updated:
- `src/components/hybrid/AuthWrapper.tsx`
- `src/app/create-user/page.tsx`

Push to GitHub and Vercel will auto-deploy.

### Step 5: Verify in Production

1. Open your Vercel app URL in an **incognito window**
2. Go to the signup page
3. Click the "Select a coach" dropdown
4. **Expected**: Shows list of coaches (First Name + Last Name)

## Files Changed

### Database (Run in Supabase SQL Editor)

| File | Purpose |
|------|---------|
| `migrations/20260128_create_coaches_public.sql` | Creates the `coaches_public` table with RLS |
| `migrations/20260128_seed_coaches_public.sql` | Populates table from `profiles` (manual sync) |

### Frontend (Auto-deployed via Vercel)

| File | Change |
|------|--------|
| `src/components/hybrid/AuthWrapper.tsx` | Queries `coaches_public` instead of `profiles` |
| `src/app/create-user/page.tsx` | Queries `coaches_public` instead of `profiles` |

## How It Works

### Table Structure

```sql
coaches_public (
  coach_id uuid PRIMARY KEY  -- References profiles.id
  first_name text NOT NULL
  last_name text NOT NULL
  is_active boolean DEFAULT true
  sort_order int DEFAULT 0   -- For custom ordering
  updated_at timestamptz
)
```

### RLS Policies

| Policy | Role | Access |
|--------|------|--------|
| `anon_can_read_active_coaches` | anon | SELECT where is_active=true |
| `authenticated_can_read_active_coaches` | authenticated | SELECT where is_active=true |
| `admins_can_manage_coaches_public` | admin | ALL (for sync) |

### Frontend Query

```typescript
const { data, error } = await supabase
  .from("coaches_public")
  .select("coach_id, first_name, last_name")
  .eq("is_active", true)
  .order("sort_order", { ascending: true })
  .order("last_name", { ascending: true });
```

## Maintenance

### Adding a New Coach

When you add a new coach to `profiles`, run the seed SQL again:

```sql
-- Run in Supabase SQL Editor
INSERT INTO public.coaches_public (coach_id, first_name, last_name, is_active, sort_order)
SELECT id, first_name, last_name, true, 2
FROM profiles
WHERE role IN ('coach', 'admin', 'super_coach', 'supercoach')
ON CONFLICT (coach_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = now();
```

### Deactivating a Coach

```sql
UPDATE public.coaches_public 
SET is_active = false, updated_at = now()
WHERE coach_id = 'coach-uuid-here';
```

### Custom Sort Order

```sql
UPDATE public.coaches_public 
SET sort_order = 1  -- Lower numbers appear first
WHERE coach_id = 'coach-uuid-here';
```

## Troubleshooting

### Dropdown is Empty

1. **Check table exists**: Run `SELECT COUNT(*) FROM coaches_public;`
2. **Check data exists**: Run the seed SQL again
3. **Check RLS**: Run the anonymous test query above
4. **Check browser console**: Look for error messages

### "relation coaches_public does not exist"

Run the migration SQL: `20260128_create_coaches_public.sql`

### "permission denied for table coaches_public"

RLS policies missing. Re-run the migration SQL.

### Coaches Not Showing After Adding New One

Run the seed SQL again to sync from profiles.

## Security Notes

- **No PII exposed**: Only names visible, no email/phone
- **Row-level security**: Anonymous users can only read active coaches
- **Minimal attack surface**: Separate table limits data exposure
- **Audit trail**: `updated_at` tracks changes

## Future Improvements (Optional)

1. **Auto-sync trigger**: Add a PostgreSQL trigger to sync when profiles change
2. **Admin UI**: Build an admin page to manage `coaches_public` directly
3. **Coach photos**: Add `avatar_url` column (optional public photo)

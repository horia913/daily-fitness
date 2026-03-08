# Check-in Form Fix Instructions

## CRITICAL: Database Migration Must Be Run First

The check-in form will crash until the database migration is run. The columns `sleep_hours`, `sleep_quality`, and `steps` do not exist in the `daily_wellness_logs` table yet.

### Step 1: Run the Migration

1. Go to your Supabase Dashboard: https://app.supabase.com/project/YOUR_PROJECT/sql
2. Open the SQL Editor
3. Copy and paste this SQL:

```sql
ALTER TABLE public.daily_wellness_logs
ADD COLUMN IF NOT EXISTS sleep_hours numeric,
ADD COLUMN IF NOT EXISTS sleep_quality integer CHECK (sleep_quality BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS steps integer;
```

4. Click "Run" to execute the migration
5. Verify the columns were added by running:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'daily_wellness_logs' 
AND column_name IN ('sleep_hours', 'sleep_quality', 'steps');
```

You should see 3 rows returned.

### Step 2: Verify the Fix

After running the migration:

1. **Refresh your app** - The check-in form should now work
2. **Check the browser console** - There should be ZERO 400 errors related to `sleep_hours`, `sleep_quality`, or `steps`
3. **Test saving a check-in** - Fill out the form and click "Save". It should succeed.
4. **Check Network tab** - You should see only 2-3 queries to `daily_wellness_logs` on page load (not 15+)

## What Was Fixed

### 1. Query Consolidation
- **Before:** Each component (form, history, calendar) made its own queries = 15+ requests
- **After:** Single consolidated fetch at page level = 2 requests total (today's log + 90-day range)
- **Result:** ~85% reduction in database queries

### 2. Column Reference Fixes
- Changed `getCheckinStreak()` and `getBestStreak()` to use `select("*")` instead of explicit column names
- This allows queries to work before AND after migration (gracefully handles missing columns)
- After migration, all columns will be available

### 3. Data Flow Optimization
- Page-level component (`check-ins/page.tsx`) fetches all data once
- Passes data down as props to child components
- Child components no longer make independent queries
- Streak calculations done in JavaScript from fetched data (no additional queries)

### 4. Component Updates
- `DailyWellnessForm` now accepts `initialTodayLog` prop (optional)
- `CheckInHistory` now accepts `initialLogRange`, `initialCurrentStreak`, `initialBestStreak`, `initialMonthlyStats` props
- Both components work with or without props (backward compatible)

## Files Modified

1. **migrations/20260218_add_checkin_columns.sql** - New migration file
2. **src/lib/wellnessService.ts** - Fixed queries to use `select("*")` for graceful column handling
3. **src/app/client/check-ins/page.tsx** - Consolidated all queries into single fetch
4. **src/components/client/DailyWellnessForm.tsx** - Accepts `initialTodayLog` prop, removed duplicate query
5. **src/components/client/CheckInHistory.tsx** - Accepts initial data props, removed all queries

## Expected Behavior After Migration

✅ Page loads with 2 queries: `getTodayLog()` and `getLogRange()` (90 days)
✅ Zero 400 errors in console
✅ Form saves successfully
✅ History/calendar displays correctly
✅ Streak calculations work
✅ Monthly stats calculate correctly

## Troubleshooting

If you still see errors after running the migration:

1. **Hard refresh the browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear browser cache** - The old queries might be cached
3. **Check Supabase logs** - Verify the columns actually exist
4. **Verify RLS policies** - Make sure your user can read/write to `daily_wellness_logs`

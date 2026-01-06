# Slice 07: Link Workout Containers - Manual Steps

## ✅ What Was Done Automatically

### Files Created

1. **`migrations/2025-12-28_link_workout_containers.sql`**
   - Complete migration SQL with backfill logic
   - Adds `workout_logs.workout_session_id` column
   - Creates indexes and constraints
   - Backfills existing data (best-effort matching)
   - Verification queries included

### Files Modified

1. **`src/lib/workoutAttemptService.ts`**
   - Updated `getActiveAttempt()` to use the new linkage
   - Now queries via `workout_logs.workout_session_id` FK (more efficient)
   - Includes fallback for legacy data

## ⚠️ What YOU Need to Do Manually

### Step 1: Run the Migration in Supabase

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `migrations/2025-12-28_link_workout_containers.sql`
3. **Review the backfill logic** (lines 35-48) - it matches logs to sessions within 5-minute window
4. Execute the SQL
5. **IMPORTANT**: Save the output - you'll need it for verification

### Step 2: Run Verification Queries

After migration, run these queries to verify success:

#### Query 1: Check for orphaned set logs

```sql
-- Should return 0 (or very close to 0)
SELECT count(*) as orphaned_set_logs
FROM workout_set_logs
WHERE workout_log_id IS NULL;
```

**Expected**: 0  
**If not**: Set logs exist without a parent workout_log (data integrity issue)

#### Query 2: Check for completed logs with no sets

```sql
-- Should return 0 or very small number (edge cases only)
SELECT count(*) as completed_logs_with_no_sets
FROM workout_logs wl
WHERE wl.completed_at IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM workout_set_logs sl
  WHERE sl.workout_log_id = wl.id
);
```

**Expected**: 0-5  
**If high**: Logs were marked complete but have no actual set data

#### Query 3: Check for multiple active logs per assignment

```sql
-- MUST return 0 (enforced by unique constraint)
SELECT workout_assignment_id, count(*)
FROM workout_logs
WHERE completed_at IS NULL
GROUP BY workout_assignment_id
HAVING count(*) > 1;
```

**Expected**: 0  
**If not**: Constraint failed to create (check migration errors)

#### Query 4: Backfill Success Rate

```sql
-- Shows how many logs were successfully linked to sessions
SELECT
  COUNT(*) as total_logs,
  COUNT(workout_session_id) as linked_logs,
  ROUND(100.0 * COUNT(workout_session_id) / NULLIF(COUNT(*), 0), 2) as link_percentage
FROM workout_logs;
```

**Expected**: 70-95% link_percentage  
**If <50%**: Backfill logic may need adjustment for your data

#### Query 5: Check for invalid links

```sql
-- Should return 0 (FK constraint prevents this)
SELECT count(*) as invalid_links
FROM workout_logs wl
WHERE workout_session_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM workout_sessions ws
  WHERE ws.id = wl.workout_session_id
);
```

**Expected**: 0  
**If not**: Data corruption (shouldn't be possible with FK)

### Step 3: Review Unlinked Logs

If Query 4 shows <80% link percentage, investigate:

```sql
-- Find logs that couldn't be linked
SELECT
  wl.id,
  wl.workout_assignment_id,
  wl.started_at,
  wl.completed_at,
  wa.scheduled_date
FROM workout_logs wl
LEFT JOIN workout_assignments wa ON wa.id = wl.workout_assignment_id
WHERE wl.workout_session_id IS NULL
ORDER BY wl.started_at DESC
LIMIT 20;
```

**Decision Points:**

- If these are old/legacy workouts: Leave unlinked (acceptable)
- If these are recent (<1 week): Investigate why session wasn't created

### Step 4: Optional - Manual Linking for Critical Logs

If specific important logs didn't link automatically:

```sql
-- Manually link a log to its session
UPDATE workout_logs
SET workout_session_id = '<session_id_here>'
WHERE id = '<workout_log_id_here>'
AND client_id = '<client_id_here>';
```

### Step 5: Test in the App

1. **Start a new workout** as a client
2. **Log some sets**
3. **Check database**:
   ```sql
   SELECT
     wl.id as log_id,
     wl.workout_session_id,
     ws.id as session_id,
     ws.status as session_status,
     wl.completed_at
   FROM workout_logs wl
   LEFT JOIN workout_sessions ws ON ws.id = wl.workout_session_id
   WHERE wl.client_id = '<your_test_client_id>'
   ORDER BY wl.started_at DESC
   LIMIT 5;
   ```
4. **Verify**: workout_session_id is populated for new workout
5. **Complete the workout**
6. **Verify**: session_status = 'completed' AND wl.completed_at is set

## 📊 What the Migration Does

### Part 1: Schema Changes

- Adds `workout_logs.workout_session_id UUID` (nullable)
- Creates FK constraint to `workout_sessions(id)` with `ON DELETE SET NULL`
- Creates index `idx_workout_logs_workout_session_id`

### Part 2: Data Integrity

- Creates unique index preventing multiple active logs per assignment
- Ensures `workout_set_logs.workout_log_id` is indexed

### Part 3: Backfill (Best-Effort)

- Matches logs to sessions by:
  - Same `assignment_id` and `client_id`
  - Started within 5 minutes of each other
  - Takes closest matching session if multiple candidates

**Why 5 minutes?**

- Normal workflow: session created → log created within seconds
- 5-minute window handles clock skew and edge cases
- Too large a window risks incorrect matches

## 🎯 Expected Outcomes

### Success Criteria

- [x] Migration runs without errors
- [x] All verification queries pass expectations
- [x] 70%+ backfill success rate
- [x] New workouts create linked logs
- [x] App still functions normally

### Acceptable Edge Cases

- Legacy logs (>3 months old) without sessions: **OK**
- Abandoned workouts with orphaned logs: **OK** (cleanup can happen later)
- Test data with incomplete records: **OK**

### Red Flags (Require Investigation)

- ❌ Migration fails with constraint violations
- ❌ <50% backfill success on recent data
- ❌ New workouts don't create linked logs
- ❌ App throws errors when completing workouts

## 🔄 Rollback Plan (If Needed)

If something goes wrong:

```sql
-- Remove the linkage (keeps data, removes constraint)
ALTER TABLE workout_logs DROP CONSTRAINT IF EXISTS workout_logs_workout_session_id_fkey;
DROP INDEX IF EXISTS idx_workout_logs_workout_session_id;
ALTER TABLE workout_logs DROP COLUMN IF EXISTS workout_session_id;

-- Remove unique constraint
DROP INDEX IF EXISTS idx_workout_logs_one_active_per_assignment;
```

**After rollback**: The app will continue functioning (backward compatible)

## ⏭️ Next Steps

### After Successful Migration:

**Immediate (Slice 08)**:

- Migrate all workout screens to use `useWorkoutAttempt` hook
- Remove old scattered status-checking code
- Verify consistent behavior across all pages

**Future (Later Slices)**:

- Update API routes to enforce linkage on INSERT (not just rely on backfill)
- Add monitoring for unlinked logs
- Cleanup legacy unlinked logs (data maintenance)

## 📝 Migration Checklist

Use this checklist to track your progress:

- [ ] **Pre-Migration**

  - [ ] Backed up database (or verified auto-backups are on)
  - [ ] Reviewed backfill logic in migration SQL
  - [ ] Identified test client account for post-migration testing

- [ ] **Migration**

  - [ ] Ran migration SQL in Supabase
  - [ ] No errors in SQL execution
  - [ ] Saved migration output/logs

- [ ] **Verification**

  - [ ] Query 1 (orphaned set logs): Result = **\_** (expect 0)
  - [ ] Query 2 (completed with no sets): Result = **\_** (expect 0-5)
  - [ ] Query 3 (multiple active): Result = 0 ✓
  - [ ] Query 4 (backfill %): **\_** % (expect >70%)
  - [ ] Query 5 (invalid links): Result = 0 ✓

- [ ] **Testing**

  - [ ] Started new workout as test client
  - [ ] Verified `workout_session_id` populated in database
  - [ ] Completed workout successfully
  - [ ] Verified workout shows in history
  - [ ] No errors in browser console

- [ ] **Cleanup**
  - [ ] Reviewed unlinked logs (Query 4 follow-up)
  - [ ] Decided: acceptable legacy data ✓ OR needs manual linking
  - [ ] Documented any issues encountered

---

## 🎉 Ready for Slice 08?

Once all checkboxes are ✓ and app is working normally, proceed to **Slice 08** which will migrate all workout screens to use the new linked queries via `useWorkoutAttempt` hook.

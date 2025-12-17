# Workout Logs Display Issues - Diagnosis Report

## Issues Identified

1. **All logs show 1 exercise and 1 set** - should show actual count
2. **Time not displayed** - should show duration or timestamps
3. **Data aggregation might be wrong** - need to verify calculations

---

## Query & Processing

### Current Select Query

**File:** `src/app/client/progress/workout-logs/page.tsx` (lines 77-102)

```typescript
const { data: workoutLogs, error } = await supabase
  .from("workout_logs")
  .select(`
    id,
    client_id,
    started_at,
    completed_at,
    total_duration_minutes,
    total_sets_completed,
    total_reps_completed,
    total_weight_lifted,
    workout_set_logs (
      id,
      weight,
      reps,
      exercise_id,
      exercises (
        id,
        name,
        category
      )
    )
  `)
  .eq("client_id", user.id)
  .order("started_at", { ascending: false })
  .limit(50);
```

**Columns being selected:**
- ✅ `total_duration_minutes` - YES, but likely NULL in database
- ✅ `total_sets_completed` - YES, but likely NULL/0 in database
- ✅ `total_reps_completed` - YES, but likely NULL/0 in database
- ✅ `total_weight_lifted` - YES, but likely NULL/0 in database
- ✅ `workout_set_logs` - Nested relationship join (may be failing)

### Processing Logic

**File:** `src/app/client/progress/workout-logs/page.tsx` (lines 115-134)

```typescript
const processedLogs: WorkoutLog[] = workoutLogs.map((log) => {
  const sets = (log.workout_set_logs || []) as WorkoutSet[];
  const totalSets = sets.length;  // ⚠️ Calculated from array length
  const totalWeight = sets.reduce(
    (sum, set) => sum + ((set.weight || 0) * (set.reps || 0)),
    0
  );  // ⚠️ Calculated from array
  const uniqueExercises = new Set(
    sets.map((set) => set.exercise_id).filter(Boolean)
  ).size;  // ⚠️ Calculated from array

  return {
    ...log,
    workout_set_logs: sets,
    totalSets,      // ⚠️ Uses calculated value, NOT database column
    totalWeight,    // ⚠️ Uses calculated value, NOT database column
    uniqueExercises, // ⚠️ Uses calculated value, NOT database column
  } as WorkoutLog;
});
```

**How exercises count is calculated:**
- Creates a `Set` from `sets.map((set) => set.exercise_id).filter(Boolean)`
- Returns `.size` of that Set
- **Problem:** If `workout_set_logs` relationship join fails or returns empty array, this will be 0 or 1

**How sets count is calculated:**
- `sets.length` - directly from the `workout_set_logs` array
- **Problem:** If relationship join fails, `sets` will be empty array `[]`, so `totalSets = 0`
- **But wait:** The display shows "1 set" - this suggests the array might have exactly 1 item, or there's a display issue

**How time/duration is calculated:**
- Uses `log.total_duration_minutes` from database (line 343)
- **Problem:** This column is **NEVER UPDATED** by the API, so it's always NULL
- Display only shows if `log.total_duration_minutes` is truthy (line 380)

---

## Display Code

### Component that renders each log

**File:** `src/app/client/progress/workout-logs/page.tsx` (lines 335-489)

**What it displays for exercises:**
```typescript
// Line 441
{log.uniqueExercises}
```
- Uses the **calculated** `uniqueExercises` value (from processing)
- If `workout_set_logs` array is empty or has 1 item, this shows 0 or 1

**What it displays for sets:**
```typescript
// Line 405
{log.totalSets} sets
```
- Uses the **calculated** `totalSets` value (from processing)
- If `workout_set_logs` array is empty, this shows 0
- If array has 1 item, this shows 1

**What it displays for time:**
```typescript
// Lines 343-345, 380-393
const duration = log.total_duration_minutes
  ? Math.round(log.total_duration_minutes)
  : null;

// Then conditionally:
{duration && (
  <div className="flex items-center gap-2">
    <Clock className="w-4 h-4" />
    <span className={theme.textSecondary}>
      {duration} min
    </span>
  </div>
)}
```
- Only displays if `total_duration_minutes` is NOT NULL
- **Problem:** This column is never populated, so duration never displays

**What it displays for date:**
```typescript
// Lines 340-378
const completedDate = log.completed_at
  ? new Date(log.completed_at)
  : null;

{completedDate && (
  <div className="flex items-center gap-2">
    <Calendar className="w-4 h-4" />
    <span className={theme.textSecondary}>
      {completedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </span>
  </div>
)}
```
- Only displays if `completed_at` is NOT NULL
- **Problem:** This column is never updated when workout completes

---

## API Update Logic

### Does `/api/log-set` update workout_logs totals?

**File:** `src/app/api/log-set/route.ts`

**Answer: NO ❌**

The API endpoint:
1. ✅ Creates/gets `workout_log_id` (lines 109-144)
2. ✅ Inserts into `workout_set_logs` (lines 382-393)
3. ✅ Updates `user_exercise_metrics` for e1RM (lines 420-521)
4. ❌ **NEVER updates `workout_logs` totals**
5. ❌ **NEVER sets `completed_at`**
6. ❌ **NEVER sets `total_duration_minutes`**

**Code reference:** `src/app/api/log-set/route.ts` - No update to `workout_logs` after line 393

### Does frontend calculate?

**Answer: YES, but incorrectly**

The frontend calculates from the `workout_set_logs` array in the query result, but:
- If the relationship join fails, the array is empty
- The database columns (`total_sets_completed`, etc.) are never populated, so they can't be used as fallback

---

## Database Status

**You need to run these SQL queries to confirm:**

```sql
-- Check if total_* columns are being populated
SELECT id, 
       total_sets_completed,
       total_reps_completed,
       total_weight_lifted,
       total_duration_minutes,
       started_at,
       completed_at
FROM workout_logs
WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
LIMIT 5;

-- Check if workout_set_logs have the right data
SELECT COUNT(*) as set_count,
       COUNT(DISTINCT exercise_id) as unique_exercises,
       SUM(weight * reps) as total_weight
FROM workout_set_logs
WHERE workout_log_id = 'd76a303d-6de6-4bc3-98b9-06518c1b7cda'
  AND client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- Check a sample workout_set_logs row
SELECT id, workout_log_id, exercise_id, weight, reps, block_type, completed_at
FROM workout_set_logs
WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
LIMIT 10;

-- Check if relationship exists (PostgREST foreign key)
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'workout_set_logs'
  AND ccu.table_name = 'workout_logs';
```

**Expected findings:**
- `total_sets_completed`, `total_reps_completed`, `total_weight_lifted` are likely **NULL or 0**
- `total_duration_minutes` is likely **NULL**
- `completed_at` is likely **NULL** (unless manually set)
- `workout_set_logs` rows exist, but the relationship join might not be working

---

## Likely Issues

### Issue 1: Relationship Join May Be Failing

**Problem:** The query uses nested select `workout_set_logs (...)` which relies on Supabase PostgREST relationships. If the foreign key relationship isn't properly configured or named, the join will return an empty array.

**Evidence:**
- Display shows "1 exercise" and "1 set" - suggests array has exactly 1 item OR the relationship is partially working
- If relationship completely failed, it would show 0

**Fix needed:**
1. Verify foreign key exists: `workout_set_logs.workout_log_id` → `workout_logs.id`
2. Verify relationship name matches (PostgREST auto-generates from FK)
3. Add fallback query if relationship fails

### Issue 2: Database Columns Never Updated

**Problem:** The `workout_logs` table has columns for totals (`total_sets_completed`, `total_reps_completed`, `total_weight_lifted`, `total_duration_minutes`, `completed_at`), but **NO CODE EVER UPDATES THEM**.

**Evidence:**
- `/api/log-set` only inserts into `workout_set_logs`, never updates `workout_logs`
- `markWorkoutComplete` in `complete/page.tsx` only updates `workout_assignments.status`, never touches `workout_logs`

**Fix needed:**
1. Add code to update `workout_logs` when workout completes:
   - Calculate totals from `workout_set_logs`
   - Set `completed_at` timestamp
   - Set `total_duration_minutes` (calculate from `started_at` to `completed_at`)
   - Update `total_sets_completed`, `total_reps_completed`, `total_weight_lifted`

### Issue 3: Time Display Depends on NULL Column

**Problem:** Duration only displays if `total_duration_minutes` is truthy, but this column is never set.

**Evidence:**
- Code checks `log.total_duration_minutes ? ... : null` (line 343)
- Display is conditional: `{duration && (...)}` (line 380)
- Since column is NULL, duration never displays

**Fix needed:**
1. Calculate duration from `started_at` and `completed_at` if `total_duration_minutes` is NULL
2. Or ensure `total_duration_minutes` is populated when workout completes

---

## Recommended Fixes

### Fix 1: Add Workout Completion API Endpoint

Create `/api/complete-workout` that:
1. Takes `workout_log_id` and optional `started_at` timestamp
2. Queries all `workout_set_logs` for that `workout_log_id`
3. Calculates totals:
   - `total_sets_completed = COUNT(*)`
   - `total_reps_completed = SUM(reps)`
   - `total_weight_lifted = SUM(weight * reps)`
   - `total_duration_minutes = (NOW() - started_at) / 60`
4. Updates `workout_logs`:
   - `completed_at = NOW()`
   - `total_duration_minutes = calculated`
   - `total_sets_completed = calculated`
   - `total_reps_completed = calculated`
   - `total_weight_lifted = calculated`

### Fix 2: Update Query to Use Database Columns as Fallback

Modify processing logic to:
1. Try to use calculated values from `workout_set_logs` array
2. If array is empty or totals don't match, use database columns as fallback
3. Or: Always use database columns if they're populated (more reliable)

### Fix 3: Fix Time Display

Modify display logic to:
1. Use `total_duration_minutes` if available
2. Otherwise, calculate from `started_at` and `completed_at`
3. Or show `started_at` date if `completed_at` is NULL

### Fix 4: Verify Relationship Join

1. Check Supabase dashboard → Database → Relationships
2. Verify `workout_set_logs.workout_log_id` → `workout_logs.id` relationship exists
3. If missing, create it or use explicit join in query

---

## Next Steps

1. ✅ Run SQL queries above to confirm database state
2. ✅ Create `/api/complete-workout` endpoint
3. ✅ Call this endpoint when workout is marked complete
4. ✅ Update query processing to use database columns as fallback
5. ✅ Fix time display to calculate from timestamps if needed
6. ✅ Test with real workout data


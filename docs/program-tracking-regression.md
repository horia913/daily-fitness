# Program Tracking Regression Checklist

**Date:** 2026-02-09
**Purpose:** Verify the canonical program tracking system works correctly after refactoring.

---

## Test Scenarios

### 1. Client starts Day 4 before Day 1 (flex order)

**Steps:**
1. Assign a multi-day program to a client.
2. Client calls `POST /api/program-workouts/start-from-progress` with `program_schedule_id` = Day 4's schedule ID.
3. Client completes the workout via `POST /api/complete-workout`.

**Expected:**
- `program_day_completions` has exactly 1 row with `program_schedule_id` = Day 4's ID.
- `program_progress.current_week_number` / `current_day_number` points to the next uncompleted slot (Day 1, since Day 4 is now done).
- `getNextSlot()` returns Day 1 (first uncompleted in order).

---

### 2. Double-submit complete-workout (idempotency)

**Steps:**
1. Client completes a workout (first call to `POST /api/complete-workout`).
2. Client immediately sends the same request again (network retry / double-click).

**Expected:**
- First call: returns `{ success: true, alreadyCompleted: false }` with 200.
- Second call: returns `{ success: true, already_completed: true }` with 200 (no-op).
- `program_day_completions` has exactly 1 row for that slot (UNIQUE constraint prevents duplicates).
- `workout_logs.completed_at` is set only once — no overwrite on the second call.

---

### 3. Coach completes same workout (unified pipeline)

**Steps:**
1. A coach calls `POST /api/coach/pickup/mark-complete` with `{ clientId: <client_uuid> }`.

**Expected:**
- The endpoint uses `programStateService.getNextSlot()` to find the current slot.
- A `workout_log` is created (or reused if one exists) for that slot.
- `completeWorkout()` is called — the exact same function as client completion.
- `program_day_completions` gets exactly 1 row.
- `program_progress` is updated.
- Response includes the new state (current_week_number, current_day_number, is_completed).

---

### 4. Refresh/reload consistency

**Steps:**
1. Client completes Day 2.
2. Client refreshes the page or navigates away and back.

**Expected:**
- `getProgramState()` re-reads from `program_day_completions` ledger.
- `nextSlot` is the first uncompleted slot after Day 2 (e.g., Day 3).
- UI shows correct position — no stale data from cache.

---

### 5. All slots completed (program finished)

**Steps:**
1. Complete every slot in the program one by one.

**Expected:**
- After the last slot: `program_progress.is_completed = true`.
- `getNextSlot()` returns `null`.
- `getProgramState().isCompleted = true`.
- `program_assignments.status` is updated to `'completed'`.
- Attempting to start a new workout returns 409 "Program completed".

---

### 6. One active program per client (partial unique index)

**Steps:**
1. Assign a new active program to a client who already has one.

**Expected:**
- The code in `workoutTemplateService` (or equivalent) sets the old program to 'completed'/'paused' before inserting.
- If that step is skipped and a raw INSERT is attempted, the DB rejects it with a unique violation on `uq_one_active_program_per_client`.

---

## SQL Verification Queries

Run these against the production (or staging) database after the migration.

### 1. Active assignment per client (should be max 1)

```sql
SELECT client_id, COUNT(*) 
FROM program_assignments
WHERE status = 'active' 
GROUP BY client_id 
HAVING COUNT(*) > 1;
```

**Expected:** 0 rows returned.

---

### 2. program_progress row exists per active assignment

```sql
SELECT pa.id 
FROM program_assignments pa
LEFT JOIN program_progress pp ON pp.program_assignment_id = pa.id
WHERE pa.status = 'active' AND pp.program_assignment_id IS NULL;
```

**Expected:** 0 rows returned (every active assignment has a progress row).

---

### 3. Completion count per assignment

```sql
SELECT 
  pdc.program_assignment_id, 
  COUNT(*) AS ledger_count
FROM program_day_completions pdc 
GROUP BY pdc.program_assignment_id;
```

**Expected:** Each row shows the number of completed days for that assignment.

---

### 4. Detect workout_logs completed with program IDs but no ledger entry

```sql
SELECT wl.id, wl.program_assignment_id, wl.program_schedule_id
FROM workout_logs wl
WHERE wl.completed_at IS NOT NULL
  AND wl.program_assignment_id IS NOT NULL
  AND wl.program_schedule_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM program_day_completions pdc
    WHERE pdc.program_assignment_id = wl.program_assignment_id
      AND pdc.program_schedule_id = wl.program_schedule_id
  );
```

**Expected:** 0 rows returned after the refactor is deployed and all completions go through the unified pipeline. Pre-existing rows (completed before migration) may appear here and can be backfilled.

**One-off backfill:** If query 4 returns rows, insert the missing ledger entries (use the workout_log’s `completed_at` and `client_id` as `completed_by` if you don’t have the original actor):

```sql
-- Backfill: insert program_day_completions for completed workout_logs that have no ledger row
INSERT INTO program_day_completions (
  program_assignment_id,
  program_schedule_id,
  completed_at,
  completed_by,
  notes
)
SELECT
  wl.program_assignment_id,
  wl.program_schedule_id,
  wl.completed_at,
  wl.client_id,  -- or the coach/client who completed it if known
  'Backfilled from workout_log (pre-refactor completion)'
FROM workout_logs wl
WHERE wl.completed_at IS NOT NULL
  AND wl.program_assignment_id IS NOT NULL
  AND wl.program_schedule_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM program_day_completions pdc
    WHERE pdc.program_assignment_id = wl.program_assignment_id
      AND pdc.program_schedule_id = wl.program_schedule_id
  )
ON CONFLICT (program_assignment_id, program_schedule_id) DO NOTHING;
```

After running this, re-run verification query 4; it should return 0 rows. Then run query 6 (or refresh `program_progress` if needed) so the progress cache matches the ledger.

---

### 5. Detect duplicate completions (should be 0 due to UNIQUE)

```sql
SELECT program_assignment_id, program_schedule_id, COUNT(*)
FROM program_day_completions
GROUP BY program_assignment_id, program_schedule_id 
HAVING COUNT(*) > 1;
```

**Expected:** 0 rows returned (UNIQUE constraint enforces this).

---

### 6. Stored progress vs computed nextSlot

```sql
-- For each active assignment, compare stored progress with ledger
WITH active_assignments AS (
  SELECT pa.id AS assignment_id, pa.program_id, pa.client_id
  FROM program_assignments pa
  WHERE pa.status = 'active'
),
slot_counts AS (
  SELECT 
    aa.assignment_id,
    COUNT(ps.id) AS total_slots,
    COUNT(pdc.id) AS completed_slots
  FROM active_assignments aa
  JOIN program_schedule ps ON ps.program_id = aa.program_id
  LEFT JOIN program_day_completions pdc 
    ON pdc.program_assignment_id = aa.assignment_id 
    AND pdc.program_schedule_id = ps.id
  GROUP BY aa.assignment_id
)
SELECT 
  sc.assignment_id,
  sc.total_slots,
  sc.completed_slots,
  pp.current_week_number,
  pp.current_day_number,
  pp.is_completed,
  CASE 
    WHEN sc.completed_slots = sc.total_slots AND pp.is_completed = false THEN 'MISMATCH: should be completed'
    WHEN sc.completed_slots < sc.total_slots AND pp.is_completed = true THEN 'MISMATCH: should not be completed'
    ELSE 'OK'
  END AS status_check
FROM slot_counts sc
LEFT JOIN program_progress pp ON pp.program_assignment_id = sc.assignment_id;
```

**Expected:** All rows show `status_check = 'OK'`.

---

## Legacy Tables (no longer used by app code)

The following tables/columns are still in the database but are NO LONGER read from or written to by the application:

| Table / Column | Status |
|---|---|
| `program_assignment_progress` | Legacy — no app code touches it |
| `program_workout_completions` | Legacy — no app code touches it |
| `program_day_assignments.is_completed` | Column remains — no app code writes it |
| `program_day_assignments.completed_date` | Column remains — no app code writes it |
| `program_progress_v1` | Renamed backup from migration |
| `program_day_completions_v1` | Renamed backup from migration |

These can be dropped in a future cleanup migration after confirming the system is stable.

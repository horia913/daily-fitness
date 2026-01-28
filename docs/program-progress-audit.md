# Program Progress Audit - Source of Truth Migration

## Task 1: Audit of Code Paths Using Legacy Tables

### Files Using `program_schedule` for Workout Selection

1. **src/app/api/client/workouts/summary/route.ts**

   - Function: `GET()` handler
   - Query: Lines 612-617, 670-676, 700-706
   - Usage: Determines next program workout by querying `program_schedule` with `current_week` from `program_assignment_progress`
   - Problem: Uses `program_schedule` + `program_workout_completions` instead of `program_day_assignments`

2. **src/app/client/workouts/[id]/start/page.tsx**

   - Function: `loadAssignment()`
   - Query: Lines 1639-1644, 1498-1503 (legacy fallback)
   - Usage: Legacy fallback when ID is not `program_day_assignments.id` - queries `program_schedule` to find next workout
   - Problem: Should be removed or updated to use `program_day_assignments`

3. **src/app/client/workouts/[id]/complete/page.tsx**

   - Function: `resolveWorkoutAssignmentId()`
   - Query: Lines 730-736
   - Usage: Legacy fallback - uses `program_assignment_progress.current_week/current_day` + `program_schedule` to resolve workout
   - Problem: Should use `program_day_assignments` instead

4. **src/app/api/log-set/route.ts**
   - Function: `POST()` handler
   - Query: Lines 325-340
   - Usage: For program workouts, gets template from `program_schedule` using `program_assignment_progress.current_week/current_day`
   - Problem: Should use `program_day_assignments` via `workout_assignment_id`

### Files Using `program_workout_completions` for Completion Tracking

1. **src/app/api/client/workouts/summary/route.ts**

   - Function: `GET()` handler
   - Query: Lines 631-639
   - Usage: Checks completed days in current week via `program_workout_completions`
   - Problem: Should use `program_day_assignments.is_completed` instead

2. **src/app/client/workouts/[id]/start/page.tsx**
   - Function: `loadAssignment()` (legacy fallback)
   - Query: Lines 1652-1660
   - Usage: Checks completed workouts via `program_workout_completions` to find next incomplete
   - Problem: Legacy code path, should be removed

### Files Using `program_assignment_progress.current_week/current_day` for Workout Selection

1. **src/app/api/client/workouts/summary/route.ts**

   - Function: `GET()` handler
   - Query: Lines 421-423 (gets progress), 607 (uses current_week)
   - Usage: Uses `current_week` to query `program_schedule` for that week's workouts
   - Problem: Should derive from `program_day_assignments` instead

2. **src/app/client/workouts/[id]/start/page.tsx**

   - Function: `loadAssignment()` (legacy fallback)
   - Query: Lines 1605-1627 (creates progress if missing), 1630-1631 (uses current_week)
   - Usage: Creates/uses `program_assignment_progress` to determine current week, then queries `program_schedule`
   - Problem: Legacy code path, should be removed

3. **src/app/client/workouts/[id]/complete/page.tsx**

   - Function: `resolveWorkoutAssignmentId()`
   - Query: Lines 722-727 (gets progress), 733-736 (uses current_week/current_day)
   - Usage: Uses progress to find template from `program_schedule`
   - Problem: Legacy fallback, should use `program_day_assignments`

4. **src/app/api/log-set/route.ts**

   - Function: `POST()` handler
   - Query: Lines 325-340
   - Usage: Gets `current_week/current_day` from progress, then queries `program_schedule` for template
   - Problem: Should use `program_day_assignments` via `workout_assignment_id`

5. **src/app/client/workouts/[id]/details/page.tsx**
   - Function: `load()` (useEffect)
   - Query: Lines 244-251
   - Usage: Gets `current_week` for display purposes only (not for workout selection)
   - Status: OK - informational only, but should derive from `program_day_assignments` for consistency

### Files That Write to `program_workout_completions`

**NONE FOUND** - The table exists but is empty. No code actively writes to it.

### Summary

**Primary Issues:**

1. ✅ FIXED: `/api/client/workouts/summary/route.ts` - Now uses `program_day_assignments` as source of truth
2. ✅ REMOVED: Legacy fallback code in start/complete pages - removed all `program_schedule` and `program_workout_completions` queries
3. ✅ FIXED: `log-set` route - removed `program_assignment_progress` + `program_schedule`, now uses `workout_assignments.workout_template_id` directly

**Files Already Using `program_day_assignments` (Correct):**

1. ✅ `src/components/client/EnhancedClientWorkouts.tsx` - Updated to use `program_day_assignments` for next workout and metrics
2. ✅ `src/app/client/workouts/[id]/start/page.tsx` - Primary path uses `program_day_assignments`
3. ✅ `src/app/client/workouts/[id]/complete/page.tsx` - Completion updates `program_day_assignments`
4. ✅ `src/lib/programService.ts` - Already uses `program_day_assignments` for `getCompleteWeeks()`

## Changes Made

### Task 1: Audit ✅

- Created comprehensive audit document listing all code paths
- Identified all uses of `program_schedule`, `program_workout_completions`, and `program_assignment_progress`

### Task 2: Summary Route ✅

**File**: `src/app/api/client/workouts/summary/route.ts`

- **Before**: Used `program_schedule` + `program_workout_completions` + `program_assignment_progress.current_week` to determine next workout
- **After**: Uses `program_day_assignments` query with `is_completed IS NOT true`, ordered by `day_number asc`
- **Change**: Lines 591-729 - Replaced all `program_schedule` queries with `program_day_assignments` query
- **Result**: Next workout now comes from `program_day_assignments.id` (stored in `scheduleId` field for routing)

### Task 3: Progress Metrics ✅

**Files**:

1. `src/lib/programMetricsService.ts` (NEW)

   - Created service to derive metrics from `program_day_assignments`
   - Functions: `getProgramMetrics()` - calculates completion count, total workouts, current day, completion percentage

2. `src/components/client/EnhancedClientWorkouts.tsx`
   - **Before**: Used `program_assignment_progress.current_week` for display
   - **After**: Uses `getProgramMetrics()` from `programMetricsService` to get completion percentage and estimated week
   - **Change**: Lines 625-686 - Replaced `programProgress.current_week` with metrics from `program_day_assignments`

### Task 4: Consistency Check ✅

**File**: `src/lib/programMetricsService.ts`

- Added `checkProgramProgressConsistency()` function
- Logs warnings if `program_assignment_progress` conflicts with `program_day_assignments`
- Dev-only, informational only (no DB writes)
- Can be called manually or integrated into debug flows

## Final Source of Truth

### Selection (Next Workout)

- **Source**: `program_day_assignments`
- **Query**: Earliest row where `is_completed IS NOT true`, ordered by `day_number asc`
- **Filter**: `program_assignment_id` = active program assignment, `day_type` = 'workout'
- **Routing**: Use `program_day_assignments.id` for `/client/workouts/[id]/start`

### Execution (Starting Workout)

- **Source**: `program_day_assignments` → `workout_assignments`
- **Flow**:
  1. If `program_day_assignments.workout_assignment_id` is null → create `workout_assignments` row
  2. Link `program_day_assignments.workout_assignment_id` to created/found `workout_assignments.id`
  3. Continue execution using `workout_assignments.id` and `workout_assignments.workout_template_id`

### Logging (Set Logs)

- **Source**: `workout_assignments.workout_template_id`
- **Flow**:
  1. Resolve `workout_assignment_id` from request or `workout_log_id`
  2. Query `workout_assignments` to get `workout_template_id`
  3. If `workout_template_id` is null → return 400 error
  4. Create/use `workout_logs` linked to `workout_assignment_id`
  5. Log sets to `workout_set_logs` with `workout_log_id`

### Completion (Finishing Workout)

- **Source**: `workout_assignments` + `program_day_assignments`
- **Flow**:
  1. Update `workout_assignments.status` = 'completed'
  2. Find `program_day_assignments` where `workout_assignment_id` = completed assignment
  3. Verify ownership via `program_assignments.client_id`
  4. Update `program_day_assignments.is_completed` = true
  5. Update `program_day_assignments.completed_date` = today (date only)

## Removed Legacy Code Paths

### ✅ Removed from `/api/log-set/route.ts`

- **Removed**: Lines 179-419 - All `program_schedule` and `program_assignment_progress` queries
- **Replaced with**: Direct `workout_assignments` query to get `workout_template_id`
- **Functions touched**: `POST()` handler
- **Result**: Simpler, more direct flow using only `workout_assignments`

### ✅ Removed from `/client/workouts/[id]/start/page.tsx`

- **Removed**: Lines 1491-1755 - Legacy fallback using `program_schedule` + `program_workout_completions` + `program_assignment_progress`
- **Replaced with**: Support for exactly two ID types: `program_day_assignments.id` OR `workout_assignments.id`
- **Functions touched**: `loadAssignment()`
- **Result**: Cleaner code, no legacy fallbacks, clear error handling for invalid IDs

### ✅ Removed from `/client/workouts/[id]/complete/page.tsx`

- **Removed**: Lines 667-776 - Legacy fallback using `program_schedule` + `program_assignment_progress`
- **Replaced with**: Direct resolution via `program_day_assignments.workout_assignment_id`
- **Functions touched**: `resolveWorkoutAssignmentId()`
- **Result**: Completion resolution only uses `program_day_assignments` → `workout_assignments` linkage

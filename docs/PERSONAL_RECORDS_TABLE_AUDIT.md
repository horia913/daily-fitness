# Personal Records Table Audit Report

**Date:** 2026-02-19  
**Status:** READ ONLY AUDIT — NO MODIFICATIONS MADE

---

## 1. DATABASE SCHEMA (ACTUAL)

### Table: `public.personal_records`

**Source:** Supabase Public Schema Column Inventory CSV files

#### Columns:
| Column Name | Type | Nullable | Default | Notes |
|------------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary Key |
| `client_id` | uuid | NO | null | FK → `profiles(id)` |
| `exercise_id` | uuid | NO | null | FK → `exercises(id)` |
| `record_type` | text | NO | null | CHECK constraint: `'weight'`, `'reps'`, `'distance'`, `'time'`, `'score'` |
| `record_value` | numeric | NO | null | The actual PR value |
| `record_unit` | text | NO | null | Unit of measurement (e.g., 'kg', 'reps', 'seconds') |
| `achieved_date` | date | NO | `CURRENT_DATE` | Date the PR was achieved |
| `workout_assignment_id` | uuid | YES | null | FK → `workout_assignments(id)` |
| `previous_record_value` | numeric | YES | null | Previous PR value that was beaten |
| `improvement_percentage` | numeric | YES | null | Percentage improvement |
| `is_current_record` | boolean | YES | `true` | Whether this is still the current PR |
| `notes` | text | YES | null | Optional notes |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Update timestamp |

#### Constraints:
- **PRIMARY KEY:** `id`
- **FOREIGN KEYS:**
  - `client_id` → `profiles(id)`
  - `exercise_id` → `exercises(id)`
  - `workout_assignment_id` → `workout_assignments(id)`
- **CHECK Constraints:**
  - `record_type` IN (`'weight'`, `'reps'`, `'distance'`, `'time'`, `'score'`)

#### Indexes:
- `idx_personal_records_client` (if exists) — on `client_id`
- `idx_personal_records_exercise` (if exists) — on `(client_id, exercise_id)`
- `idx_personal_records_date` (if exists) — on `(client_id, achieved_at DESC)`
- `idx_personal_records_type` (if exists) — on `(client_id, exercise_id, record_type)`

**Note:** Indexes listed in migration `20260219_personal_records_table.sql` may not exist if migration wasn't run.

#### RLS Policies:
1. **`personal_records_select`** (PERMISSIVE)
   - **Using:** `(client_id = auth.uid()) OR (EXISTS (SELECT 1 FROM clients WHERE clients.client_id = personal_records.client_id AND clients.coach_id = auth.uid())) OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))`
   - **For:** SELECT

2. **`personal_records_insert`** (PERMISSIVE)
   - **Using:** `(client_id = auth.uid())`
   - **For:** INSERT

3. **`personal_records_update`** (PERMISSIVE)
   - **Using:** `(client_id = auth.uid()) OR (EXISTS (SELECT 1 FROM clients WHERE clients.client_id = personal_records.client_id AND clients.coach_id = auth.uid())) OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))`
   - **For:** UPDATE

4. **`personal_records_delete`** (PERMISSIVE)
   - **Using:** `(client_id = auth.uid()) OR (EXISTS (SELECT 1 FROM clients WHERE clients.client_id = personal_records.client_id AND clients.coach_id = auth.uid())) OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))`
   - **For:** DELETE

#### RLS Status:
- **RLS Enabled:** YES (`rowsecurity = true`)

---

## 2. MIGRATION FILE SCHEMA (PROPOSED BUT NOT APPLIED)

### File: `migrations/20260219_personal_records_table.sql`

**⚠️ CRITICAL:** This migration file defines a **DIFFERENT schema** than what exists in the database.

#### Proposed Columns (NOT in actual database):
- `exercise_name` (text, NOT NULL) — **DOES NOT EXIST**
- `weight` (numeric, nullable) — **DOES NOT EXIST**
- `reps` (integer, nullable) — **DOES NOT EXIST**
- `estimated_1rm` (numeric, nullable) — **DOES NOT EXIST**
- `volume` (numeric, nullable) — **DOES NOT EXIST**
- `previous_value` (numeric, nullable) — **EXISTS** (but named `previous_record_value`)
- `improvement_percent` (numeric, nullable) — **EXISTS** (but named `improvement_percentage`)
- `set_log_id` (uuid, nullable) — **DOES NOT EXIST**
- `achieved_at` (timestamptz, NOT NULL) — **DOES NOT EXIST** (database has `achieved_date` date)

#### Missing from Proposed Schema (but EXISTS in database):
- `record_value` (numeric, NOT NULL) — **EXISTS**
- `record_unit` (text, NOT NULL) — **EXISTS**
- `achieved_date` (date, NOT NULL) — **EXISTS**
- `workout_assignment_id` (uuid, nullable) — **EXISTS**
- `is_current_record` (boolean, default true) — **EXISTS**
- `updated_at` (timestamptz) — **EXISTS**

#### Proposed CHECK Constraint:
- `record_type` IN (`'weight'`, `'reps'`, `'volume'`, `'estimated_1rm'`)

**Actual CHECK Constraint:**
- `record_type` IN (`'weight'`, `'reps'`, `'distance'`, `'time'`, `'score'`)

**Mismatch:** Proposed allows `'volume'` and `'estimated_1rm'`, but database only allows `'weight'`, `'reps'`, `'distance'`, `'time'`, `'score'`.

---

## 3. CODEBASE REFERENCES

### Files That READ from `personal_records`:

1. **`src/lib/personalRecords.ts`**
   - **Status:** ✅ Updated to read from stored table
   - **Query:** `SELECT * FROM personal_records WHERE client_id = ? ORDER BY achieved_at DESC LIMIT 50`
   - **Issue:** Uses `achieved_at` column which **DOES NOT EXIST** (should be `achieved_date`)
   - **Fallback:** Falls back to legacy computation from `workout_set_logs` if no stored PRs found

2. **`src/lib/metrics/pr.ts`**
   - **Query:** `SELECT id FROM personal_records WHERE client_id IN (?) AND achieved_date >= ? AND achieved_date < ?`
   - **Status:** ✅ Uses correct column names (`achieved_date`)

3. **`src/lib/progressTrackingService.ts`**
   - **Interface:** Defines `PersonalRecord` with old schema (`record_value`, `record_unit`, `achieved_date`)
   - **Queries:** 
     - `SELECT * FROM personal_records WHERE client_id = ? ORDER BY achieved_date DESC`
     - `SELECT * FROM personal_records WHERE client_id = ? AND exercise_id = ? ORDER BY achieved_date DESC`
   - **Status:** ✅ Uses correct column names

4. **`src/components/coach/OptimizedClientProgress.tsx`**
   - **Query:** `SELECT exercise_id, record_value, achieved_date, record_type FROM personal_records WHERE client_id = ? ORDER BY achieved_date DESC LIMIT 10`
   - **Status:** ✅ Uses correct column names

5. **`src/components/progress/WorkoutAnalytics.tsx`**
   - **Query:** `SELECT * FROM personal_records WHERE client_id = ?` (count only)
   - **Status:** ✅ Uses correct column names

6. **`src/lib/progressStatsService.ts`**
   - **Query:** `SELECT * FROM personal_records WHERE client_id = ?` (count only)
   - **Status:** ✅ Uses correct column names

7. **`src/lib/achievementService.ts`**
   - **Query:** `SELECT * FROM personal_records WHERE client_id = ?` (count only)
   - **Status:** ✅ Uses correct column names

8. **`src/lib/leaderboard.ts`**
   - **Query:** `SELECT * FROM personal_records WHERE client_id IN (?) AND achieved_at >= ? ORDER BY achieved_at DESC`
   - **Issue:** Uses `achieved_at` column which **DOES NOT EXIST** (should be `achieved_date`)

9. **`src/app/client/workouts/[id]/complete/page.tsx`**
   - **Query:** `SELECT *, exercise:exercises(id, name) FROM personal_records WHERE client_id = ? AND workout_assignment_id = ? ORDER BY achieved_date DESC`
   - **Status:** ✅ Uses correct column names

### Files That WRITE to `personal_records`:

1. **`src/lib/prService.ts`** ⚠️ **CRITICAL ISSUE**
   - **Status:** ❌ **WILL FAIL** — Uses NEW schema columns that don't exist
   - **Functions:**
     - `checkAndStorePR()` — Inserts with columns: `exercise_name`, `weight`, `reps`, `estimated_1rm`, `volume`, `previous_value`, `improvement_percent`, `set_log_id`, `achieved_at`
     - `backfillPRs()` — Inserts with same columns
   - **Problem:** All these columns **DO NOT EXIST** in the actual database schema

2. **`src/lib/progressTrackingService.ts`**
   - **Function:** `PersonalRecordsService.upsertPersonalRecord()`
   - **Status:** ✅ Uses correct column names (`record_value`, `record_unit`, `achieved_date`)
   - **Insert:** Uses `achieved_date` (correct), `record_value`, `record_unit` (correct)

3. **`src/app/api/log-set/route.ts`**
   - **Status:** ⚠️ Calls `checkAndStorePR()` from `prService.ts` — **WILL FAIL** due to schema mismatch

---

## 4. POPULATION STATUS

### How the Table is Currently Populated:

1. **`progressTrackingService.ts`** — `PersonalRecordsService.upsertPersonalRecord()`
   - **Status:** ✅ Works with actual schema
   - **Usage:** Called manually or from workout completion flows
   - **Columns Used:** `record_value`, `record_unit`, `achieved_date` (correct)

2. **`prService.ts`** — `checkAndStorePR()` and `backfillPRs()`
   - **Status:** ❌ **WILL FAIL** — Schema mismatch
   - **Called From:** `/api/log-set` route (after set logging)
   - **Issue:** Tries to insert columns that don't exist

### Current Population:
- **Unknown** — Cannot determine without database query
- **Likely:** Table may be empty or sparsely populated if `progressTrackingService` isn't called frequently
- **New Code:** `prService.ts` will fail silently (caught in try-catch) and won't populate the table

---

## 5. SCHEMA MISMATCH SUMMARY

### Critical Mismatches:

| New Code Expects | Actual Database Has | Status |
|------------------|---------------------|--------|
| `exercise_name` | ❌ Does not exist | **MISSING** |
| `weight` | ❌ Does not exist | **MISSING** |
| `reps` | ❌ Does not exist | **MISSING** |
| `estimated_1rm` | ❌ Does not exist | **MISSING** |
| `volume` | ❌ Does not exist | **MISSING** |
| `previous_value` | `previous_record_value` | **NAME MISMATCH** |
| `improvement_percent` | `improvement_percentage` | **NAME MISMATCH** |
| `set_log_id` | ❌ Does not exist | **MISSING** |
| `achieved_at` (timestamptz) | `achieved_date` (date) | **NAME + TYPE MISMATCH** |
| ❌ Does not exist | `record_value` | **MISSING IN NEW CODE** |
| ❌ Does not exist | `record_unit` | **MISSING IN NEW CODE** |
| ❌ Does not exist | `workout_assignment_id` | **MISSING IN NEW CODE** |
| ❌ Does not exist | `is_current_record` | **MISSING IN NEW CODE** |
| ❌ Does not exist | `updated_at` | **MISSING IN NEW CODE** |

### Record Type Mismatch:

| New Code Allows | Database Allows | Status |
|-----------------|-----------------|--------|
| `'weight'` | `'weight'` | ✅ Match |
| `'reps'` | `'reps'` | ✅ Match |
| `'volume'` | ❌ Not allowed | **MISMATCH** |
| `'estimated_1rm'` | ❌ Not allowed | **MISMATCH** |
| ❌ Not allowed | `'distance'` | **MISSING IN NEW CODE** |
| ❌ Not allowed | `'time'` | **MISSING IN NEW CODE** |
| ❌ Not allowed | `'score'` | **MISSING IN NEW CODE** |

---

## 6. FILES REFERENCING `personal_records`

### Complete List:

1. **`migrations/20260219_personal_records_table.sql`** — Migration file (not applied)
2. **`src/lib/prService.ts`** — New PR service (schema mismatch)
3. **`src/lib/personalRecords.ts`** — Legacy PR fetcher (partially updated, has bug)
4. **`src/app/api/log-set/route.ts`** — Calls `prService.checkAndStorePR()` (will fail)
5. **`src/app/client/progress/personal-records/page.tsx`** — PR page (uses `prService`, will fail)
6. **`src/lib/progressTrackingService.ts`** — Old PR service (works with actual schema)
7. **`src/lib/metrics/pr.ts`** — PR metrics (works with actual schema)
8. **`src/components/coach/OptimizedClientProgress.tsx`** — Coach view (works with actual schema)
9. **`src/components/progress/WorkoutAnalytics.tsx`** — Analytics (works with actual schema)
10. **`src/lib/progressStatsService.ts`** — Stats service (works with actual schema)
11. **`src/lib/achievementService.ts`** — Achievements (works with actual schema)
12. **`src/lib/leaderboard.ts`** — Leaderboard (has bug: uses `achieved_at`)
13. **`src/app/client/workouts/[id]/complete/page.tsx`** — Workout complete (works with actual schema)

---

## 7. FINDINGS

### ✅ What Works:
- **Old code** (`progressTrackingService.ts`) correctly uses the actual database schema
- Most read queries use correct column names (`achieved_date`, `record_value`, `record_unit`)
- RLS policies are properly configured

### ❌ Critical Issues:

1. **Migration File Never Applied**
   - `migrations/20260219_personal_records_table.sql` defines a different schema
   - The actual database has an older schema (likely from an earlier migration)

2. **New Code (`prService.ts`) Will Fail**
   - Tries to insert columns that don't exist
   - Uses `achieved_at` instead of `achieved_date`
   - Uses `improvement_percent` instead of `improvement_percentage`
   - Uses `previous_value` instead of `previous_record_value`
   - Tries to insert `exercise_name`, `weight`, `reps`, `estimated_1rm`, `volume`, `set_log_id` which don't exist

3. **Schema Mismatch in Read Code**
   - `src/lib/personalRecords.ts` uses `achieved_at` (should be `achieved_date`)
   - `src/lib/leaderboard.ts` uses `achieved_at` (should be `achieved_date`)

4. **Record Type Constraint Mismatch**
   - New code expects `'volume'` and `'estimated_1rm'` but database only allows `'weight'`, `'reps'`, `'distance'`, `'time'`, `'score'`

### ⚠️ Population Status:
- **Unknown** — Cannot determine without querying the database
- **Likely:** Table exists but may be empty or sparsely populated
- **New PR detection code will fail silently** (caught in try-catch blocks)

---

## 8. RECOMMENDATIONS

### Immediate Actions Required:

1. **Determine Actual Schema**
   - Query the database to confirm the exact schema
   - Check if migration `20260219_personal_records_table.sql` was ever run

2. **Fix Schema Mismatch**
   - Option A: Update `prService.ts` to use the actual database schema
   - Option B: Run a migration to update the database to match `prService.ts` expectations
   - Option C: Create a new migration that adds missing columns while preserving existing ones

3. **Fix Read Code Bugs**
   - Update `src/lib/personalRecords.ts` to use `achieved_date` instead of `achieved_at`
   - Update `src/lib/leaderboard.ts` to use `achieved_date` instead of `achieved_at`

4. **Verify Population**
   - Check if the table has any data
   - Verify which service is actually populating it

5. **Decide on Schema Direction**
   - Keep old schema and update new code?
   - Migrate to new schema and update old code?
   - Hybrid approach (add columns, keep old ones)?

---

## 9. VERIFICATION QUERIES

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check if table exists and get actual schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'personal_records'
ORDER BY ordinal_position;

-- Check record_type constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.personal_records'::regclass
AND contype = 'c';

-- Check if table has data
SELECT COUNT(*) FROM public.personal_records;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'personal_records';
```

---

**END OF AUDIT REPORT**

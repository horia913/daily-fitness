# Migration Execution Guide

## Overview

This guide provides step-by-step instructions for executing the JSON to relational refactoring migrations based on the investigation results.

## Pre-Migration Checklist

- [ ] Backup database
- [ ] Review investigation results in `INVESTIGATION_RESULTS_SUMMARY.md`
- [ ] Verify current data state
- [ ] Test migrations on staging/dev environment first

## Migration Execution Order

### Step 1: Run Investigation Queries (Already Done ✅)

These queries have been run and results documented:
- ✅ `01_json_column_inventory.sql` - Found 19 JSON columns
- ✅ `02_duplicate_table_investigation.sql` - Found clip_cards vs clipcards
- ✅ `03_sample_json_data_queries.sql` - Analyzed JSON structure

### Step 2: Migrate Exercise JSON Columns

**File:** `04_migrate_exercise_json_to_relational.sql`

**What it does:**
- Creates 4 new relational tables (exercise_muscle_groups, exercise_equipment, exercise_instructions, exercise_tips)
- Migrates data from JSON arrays (currently all empty, so no data migration)
- Adds indexes and RLS policies

**Expected result:**
- 4 new tables created
- 0 rows migrated (all JSON columns are empty arrays)
- Tables ready for future use

**Risk:** Low (no data to migrate)

**Execute:**
```sql
-- Run the entire migration file
\i migrations/04_migrate_exercise_json_to_relational.sql
```

### Step 3: Analyze block_parameters

**File:** `05_migrate_block_parameters.sql`

**What it does:**
- Analyzes block_parameters usage
- Verifies if data is redundant with relational tables
- Adds deprecation comments

**Action required:**
1. Run the analysis queries in the file
2. Compare block_parameters data with relational tables
3. If redundant: Proceed with deprecation comments
4. If missing data: Create additional migration to move data

**Expected result:**
- Deprecation comments added to columns
- Decision made on whether to migrate data

**Risk:** Medium (needs verification)

**Execute:**
```sql
-- Run analysis queries first
-- Then add deprecation comments
\i migrations/05_migrate_block_parameters.sql
```

### Step 4: Handle Client Workout JSON Columns

**File:** `06_migrate_client_workout_json.sql`

**What it does:**
- Adds deprecation comments (no migration needed - all NULL)

**Expected result:**
- Deprecation comments added
- No data migration

**Risk:** None (all columns are NULL)

**Execute:**
```sql
\i migrations/06_migrate_client_workout_json.sql
```

### Step 5: Migrate Workout Logs JSON

**File:** `07_migrate_workout_logs_json.sql`

**What it does:**
- Creates workout_set_details table (for completed_sets - currently empty)
- Creates workout_giant_set_exercise_logs table (for giant_set_exercises)
- Migrates 3 rows of giant_set_exercises data
- Adds indexes and RLS policies

**Expected result:**
- 2 new tables created
- 3 rows migrated from giant_set_exercises
- 0 rows migrated from completed_sets (table is empty)

**Risk:** Low (only 3 rows to migrate)

**Execute:**
```sql
\i migrations/07_migrate_workout_logs_json.sql
```

### Step 6: Investigate Other JSON Columns

**File:** `08_investigate_other_json_columns.sql`

**What it does:**
- Finds any remaining JSON columns
- Analyzes daily_workout_cache (acceptable as JSON - cache table)

**Expected result:**
- Confirmation that daily_workout_cache can stay as JSON
- No other JSON columns found

**Risk:** None (investigation only)

**Execute:**
```sql
\i migrations/08_investigate_other_json_columns.sql
```

### Step 7: Resolve Duplicate Tables

**File:** `09_resolve_duplicate_tables.sql`

**What it does:**
- Marks clip_cards as deprecated (clipcards is active)
- Keeps sessions/booked_sessions (different purposes)
- Keeps coach_availability/coach_time_slots (different purposes)

**Expected result:**
- clip_cards marked as deprecated
- Other tables kept with documentation

**Risk:** Low (just comments)

**Execute:**
```sql
\i migrations/09_resolve_duplicate_tables.sql
```

### Step 8: Verify All Migrations

**File:** `10_verification_queries.sql`

**What it does:**
- Verifies all migrations completed successfully
- Checks data integrity
- Verifies foreign keys, indexes, RLS policies

**Expected result:**
- All checks pass
- Data integrity confirmed

**Risk:** None (verification only)

**Execute:**
```sql
\i migrations/10_verification_queries.sql
```

## Post-Migration Steps

### 1. Update Code

Follow `PHASE_6_CODE_UPDATES_GUIDE.md` to:
- Update TypeScript types
- Update service functions
- Update components
- Add error handling

### 2. Test

- [ ] Test exercise creation with relational data
- [ ] Test exercise reading with relational data
- [ ] Test workout log creation with relational data
- [ ] Test all error handling paths
- [ ] Verify RLS policies work correctly

### 3. Monitor

- [ ] Monitor for any errors
- [ ] Check performance of new queries
- [ ] Verify no data loss

### 4. Future Cleanup

After code is fully updated and tested:
- [ ] Remove JSON columns (new migration)
- [ ] Remove deprecated tables (clip_cards)
- [ ] Update documentation

## Rollback Plan

If issues occur:

1. **Exercises migration**: Can rollback by dropping new tables (no data lost)
2. **Workout logs migration**: Can rollback by dropping new tables (3 rows in JSON, can restore)
3. **Deprecation comments**: Can be removed (no data changes)

## Data Migration Summary

| Migration | Rows to Migrate | Risk | Status |
|-----------|----------------|------|--------|
| Exercises JSON | 0 (all empty) | Low | ✅ Ready |
| block_parameters | TBD (needs verification) | Medium | ⚠️ Verify first |
| client_workout JSON | 0 (all NULL) | None | ✅ Ready |
| giant_set_exercises | 3 rows | Low | ✅ Ready |
| completed_sets | 0 (table empty) | None | ✅ Ready |

## Success Criteria

- ✅ All new tables created
- ✅ All data migrated (where applicable)
- ✅ All indexes created
- ✅ All RLS policies active
- ✅ No data loss
- ✅ Code updated to use relational structure
- ✅ All tests passing


# block_parameters Removal Guide

## Overview

This guide documents the safe removal of `block_parameters` JSONB columns from the database. These columns have been causing issues and all data is now stored in proper relational tables.

## Pre-Removal Checklist

- [ ] Run `11_verify_block_parameters_data_mapping.sql` to verify all data is in relational tables
- [ ] Review verification results - ensure no data is missing
- [ ] Backup database
- [ ] Update code to remove `block_parameters` fallbacks (see Code Updates section)
- [ ] Test updated code
- [ ] Run `12_remove_block_parameters.sql` migration

## Verification Results Summary

Based on investigation:
- **workout_blocks**: 43 rows with `block_parameters` data
- **client_workout_blocks**: 13 rows with `block_parameters` data
- **workout_block_assignments**: 0 rows (table empty)

All data should be in relational tables:
- `workout_time_protocols` (for amrap, emom, for_time, tabata, circuit)
- `workout_drop_sets` (for drop_set)
- `workout_cluster_sets` (for cluster_set)
- `workout_rest_pause_sets` (for rest_pause)
- `workout_pyramid_sets` (for pyramid_set)
- `workout_ladder_sets` (for ladder)
- `workout_block_exercises` (for straight_set, superset, giant_set, pre_exhaustion)

## Code Updates Required

### Files That Need Updates

1. **`src/lib/workoutBlockService.ts`**
   - Remove `block_parameters` from insert data (line 41-43)
   - Remove `block_parameters` from select queries

2. **`src/components/WorkoutTemplateForm.tsx`**
   - Remove all `block.block_parameters?.` fallbacks (lines 473, 477, 481, 485, 489, 493, 495, 497, 500, 505, 507, 540, 549, 555, 560, 601-602)
   - Use only relational table data

3. **`src/lib/workoutTemplateService.ts`**
   - Remove `block_parameters: block.block_parameters` (line 484)

4. **`src/types/workoutBlocks.ts`**
   - Remove `block_parameters?: Record<string, any>` from `WorkoutBlock` interface (line 37)

5. **All executor components** (if they use block_parameters):
   - `src/components/client/workout-execution/blocks/*.tsx`
   - Remove any `block_parameters` references

### Update Pattern

**Before:**
```typescript
// Fallback to block_parameters for old data
amrap_duration: timeProtocol?.total_duration_minutes?.toString() ||
  block.block_parameters?.amrap_duration?.toString() ||
  undefined,
```

**After:**
```typescript
// Use only relational table data
amrap_duration: timeProtocol?.total_duration_minutes?.toString() || undefined,
```

## Migration Execution

### Step 1: Verify Data Mapping

```sql
-- Run verification query
\i migrations/11_verify_block_parameters_data_mapping.sql
```

**Expected Result:** All blocks should show "EXISTS in relational table" status. If any show "MISSING", investigate before proceeding.

### Step 2: Update Code

Update all files listed above to remove `block_parameters` references.

### Step 3: Test Updated Code

- [ ] Test workout template creation
- [ ] Test workout template editing
- [ ] Test workout template loading
- [ ] Test all block types (amrap, emom, for_time, tabata, drop_set, etc.)
- [ ] Verify no errors in console
- [ ] Verify data displays correctly

### Step 4: Run Removal Migration

```sql
-- Run removal migration
\i migrations/12_remove_block_parameters.sql
```

**What it does:**
1. Creates backup tables with all `block_parameters` data
2. Exports backups to CSV (requires manual COPY commands)
3. Adds deprecation comments
4. Drops the columns
5. Verifies removal

### Step 5: Verify Removal

After migration:
- [ ] Verify columns are dropped (verification query should return 0 rows)
- [ ] Verify backup tables exist with data
- [ ] Test application - all features should work
- [ ] Check for any errors related to missing columns

## Backup Tables

The migration creates these backup tables:
- `workout_blocks_block_parameters_backup`
- `client_workout_blocks_block_parameters_backup`
- `workout_block_assignments_block_parameters_backup`

**Keep these tables until:**
- Code is fully updated
- All tests pass
- Production is stable
- At least 1 week has passed

Then you can drop them:
```sql
DROP TABLE IF EXISTS workout_blocks_block_parameters_backup;
DROP TABLE IF EXISTS client_workout_blocks_block_parameters_backup;
DROP TABLE IF EXISTS workout_block_assignments_block_parameters_backup;
```

## CSV Export Instructions

To export backups to CSV files:

### Option 1: Using psql \copy (recommended)

```bash
psql -d your_database -c "\copy (SELECT * FROM workout_blocks_block_parameters_backup) TO 'workout_blocks_block_parameters_backup.csv' WITH CSV HEADER;"
psql -d your_database -c "\copy (SELECT * FROM client_workout_blocks_block_parameters_backup) TO 'client_workout_blocks_block_parameters_backup.csv' WITH CSV HEADER;"
psql -d your_database -c "\copy (SELECT * FROM workout_block_assignments_block_parameters_backup) TO 'workout_block_assignments_block_parameters_backup.csv' WITH CSV HEADER;"
```

### Option 2: Using Supabase Dashboard

1. Go to Table Editor
2. Select backup table
3. Click "Export" → "CSV"
4. Save file

### Option 3: Using pgAdmin

1. Right-click on backup table
2. Select "Export/Import"
3. Choose CSV format
4. Export

## Rollback Plan

If issues occur after removal:

1. **Restore columns:**
   ```sql
   ALTER TABLE workout_blocks ADD COLUMN block_parameters JSONB DEFAULT '{}'::jsonb;
   ALTER TABLE client_workout_blocks ADD COLUMN block_parameters JSONB DEFAULT '{}'::jsonb;
   ALTER TABLE workout_block_assignments ADD COLUMN block_parameters JSONB DEFAULT '{}'::jsonb;
   ```

2. **Restore data from backup tables:**
   ```sql
   UPDATE workout_blocks wb
   SET block_parameters = backup.block_parameters
   FROM workout_blocks_block_parameters_backup backup
   WHERE wb.id = backup.id;
   
   -- Repeat for other tables
   ```

3. **Revert code changes** to use `block_parameters` again

## Success Criteria

- ✅ All `block_parameters` columns removed from database
- ✅ All code updated to use only relational tables
- ✅ All tests passing
- ✅ No errors in application
- ✅ Backup tables created and CSV files exported
- ✅ Data integrity maintained

## Notes

- The migration is **idempotent** - safe to run multiple times
- Uses `DROP COLUMN IF EXISTS` to prevent errors if columns already dropped
- Backup tables are kept for safety - can be dropped later
- CSV exports should be stored in a safe location


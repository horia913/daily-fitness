# Workout Database Investigation - Findings Report

## Summary

This document outlines the findings from investigating the workout database structure and identifies issues with data storage and retrieval.

## SQL Queries Created

I've created a comprehensive SQL file: `INVESTIGATE_WORKOUT_DATABASE_STRUCTURE.sql` that includes queries to:

1. Check `program_assignment_progress` table structure
2. Check `workout_blocks` table structure
3. Check `workout_block_exercises` table structure
4. Check `workout_cluster_sets`, `workout_rest_pause_sets`, `workout_drop_sets` tables
5. Check `workout_time_protocols` table
6. Analyze `block_parameters` JSON content
7. Check data flow and relationships
8. Verify if separate tables are being populated

## Initial Findings (Based on Code Analysis)

### 1. Database Structure (As Per User Description)

The database appears to follow this structure:

- **`workout_blocks`**: General block information (type, order, name, etc.)
- **`workout_block_exercises`**: Exercises for straight sets, supersets, giant sets, pre-exhaustion
- **`workout_time_protocols`**: Time-based blocks (tabata, circuit, amrap, emom, for_time)
- **`workout_cluster_sets`**: Cluster set specific data (linked via `block_exercise_id`)
- **`workout_rest_pause_sets`**: Rest pause specific data (linked via `block_exercise_id`)
- **`workout_drop_sets`**: Drop set specific data (linked via `block_exercise_id`)

### 2. Suspected Issues

#### Issue 1: Separate Tables Not Being Populated

**Finding**: The `WorkoutTemplateForm.tsx` does NOT call:

- `WorkoutBlockService.createClusterSet()`
- `WorkoutBlockService.createRestPauseSet()`
- `WorkoutBlockService.createDropSet()`

**Impact**: Data is likely only being saved to `block_parameters` JSON field, not to the dedicated tables.

**Evidence**:

- `WorkoutBlockService` has methods to create these records (`createClusterSet`, `createRestPauseSet`, `createDropSet`)
- These methods exist but are not being called from the form
- The form likely saves everything to `block_parameters` JSON

#### Issue 2: Display Logic Reading Wrong Source

**Current Implementation**: The display page (`workouts/[id]/details/page.tsx`) is reading from:

- `block.parameters` (JSON field) for cluster sets, rest pause, etc.

**Should Be Reading From**:

- `workout_cluster_sets` table (via `block_exercise_id`)
- `workout_rest_pause_sets` table (via `block_exercise_id`)
- `workout_drop_sets` table (via `block_exercise_id`)

#### Issue 3: Program Assignment Progress Table

**Finding**: The code is trying to query `program_assignments` table with `week_number` or `current_week` columns, but the actual table is `program_assignment_progress` with `current_week` column.

**Fix Needed**: Update query to use `program_assignment_progress` table.

#### Issue 4: Circuit Block Display

**Issue**: Circuit blocks are showing Sets/Reps/Rest cards when they should only show time-based parameters.

**Root Cause**: The `shouldShowSetsRepsRest()` function is checking if sets/reps exist, but for time-based blocks, we should never show Sets/Reps/Rest unless there are actual rep values (which circuit shouldn't have).

#### Issue 5: Rest Display for Multi-Exercise Blocks

**Issue**: Individual exercises in multi-exercise blocks are showing rest, but they shouldn't - only the block should show "Rest between sets".

**Root Cause**: The rest display logic is checking `exercise.restSeconds` for all exercises, but for multi-exercise blocks, individual exercises shouldn't have rest displayed.

## Questions to Answer (Via SQL Queries)

1. **Are the separate tables (`workout_cluster_sets`, `workout_rest_pause_sets`, etc.) empty?**

   - Query: `SELECT COUNT(*) FROM workout_cluster_sets;`
   - Query: `SELECT COUNT(*) FROM workout_rest_pause_sets;`

2. **Is data being stored in `block_parameters` JSON instead?**

   - Query: Check `block_parameters` content for cluster_set, rest_pause blocks

3. **What columns exist in `program_assignment_progress`?**

   - Query: `SELECT column_name FROM information_schema.columns WHERE table_name = 'program_assignment_progress';`

4. **How are time-based blocks structured?**

   - Query: Check `workout_time_protocols` table structure and data
   - Query: Check if `reps` column exists or if it's `reps_per_round`

5. **What's the relationship between workout_assignments and workout_templates?**
   - Query: Check foreign keys and sample data

## Recommended Next Steps

### Step 1: Run SQL Queries

Run all queries in `INVESTIGATE_WORKOUT_DATABASE_STRUCTURE.sql` to get complete picture.

### Step 2: Decision Point

Based on SQL results, decide:

- **Option A**: Fix the form to populate separate tables (better long-term solution)
- **Option B**: Update display logic to read from `block_parameters` JSON (quick fix, but less ideal)

### Step 3: Fix Display Logic

Regardless of Option A or B:

1. Fix `program_assignment_progress` query
2. Fix circuit block display (remove Sets/Reps/Rest)
3. Fix rest display for multi-exercise blocks (hide rest for individual exercises)
4. Update cluster set, rest pause, drop set display to read from correct source

### Step 4: Fix Form (If Option A)

If separate tables are the intended solution:

1. Update `WorkoutTemplateForm.tsx` to call `createClusterSet()`, `createRestPauseSet()`, etc.
2. Ensure data is saved to both `block_parameters` (for backward compatibility) AND separate tables

## Files That Need Changes

1. **`src/app/client/workouts/[id]/details/page.tsx`**

   - Fix `program_assignment_progress` query
   - Fix circuit block display
   - Fix rest display for multi-exercise blocks
   - Update to read from correct data source (separate tables or block_parameters)

2. **`src/components/WorkoutTemplateForm.tsx`** (If Option A)

   - Add calls to `WorkoutBlockService.createClusterSet()`
   - Add calls to `WorkoutBlockService.createRestPauseSet()`
   - Add calls to `WorkoutBlockService.createDropSet()`

3. **`src/lib/workoutBlockService.ts`**
   - Verify methods work correctly
   - May need to update to handle both creation paths

## Waiting for SQL Results

Before making any changes, I need you to run the SQL queries and share the results so I can:

1. Confirm the actual database structure
2. See what data exists where
3. Make informed decisions about the fix approach

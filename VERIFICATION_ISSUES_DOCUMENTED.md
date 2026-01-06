# Comprehensive Issue List - Workout Template & Training Program Verification

## Issue Categories

### Critical Issues (Blocking Functionality)

#### Issue #1: createPyramidSet() uses block_exercise_id instead of composite key

- **Category**: Critical
- **Phase**: 1.1, 1.2
- **Area**: Backend
- **File(s)**: `src/lib/workoutBlockService.ts` line 332
- **Description**: createPyramidSet() function uses `block_exercise_id` parameter and column instead of `block_id`, `exercise_id`, `exercise_order`
- **Expected Behavior**: Should use block_id, exercise_id, exercise_order like all other special table creation functions (drop_sets, cluster_sets, rest_pause_sets, time_protocols)
- **Current Behavior**: Uses block_exercise_id which violates the database hierarchy specification
- **Steps to Reproduce**:
  1. Attempt to create a pyramid_set block type
  2. Function will fail if block_exercise_id column doesn't exist in workout_pyramid_sets table
- **Related Issues**: Issue #2 (same problem in createLadderSet)

#### Issue #2: createLadderSet() uses block_exercise_id instead of composite key

- **Category**: Critical
- **Phase**: 1.1, 1.2
- **Area**: Backend
- **File(s)**: `src/lib/workoutBlockService.ts` line 431
- **Description**: createLadderSet() function uses `block_exercise_id` parameter and column instead of `block_id`, `exercise_id`, `exercise_order`
- **Expected Behavior**: Should use block_id, exercise_id, exercise_order like all other special table creation functions
- **Current Behavior**: Uses block_exercise_id which violates the database hierarchy specification
- **Steps to Reproduce**:
  1. Attempt to create a ladder block type
  2. Function will fail if block_exercise_id column doesn't exist in workout_ladder_sets table
- **Related Issues**: Issue #1 (same problem in createPyramidSet)

#### Issue #3: Display code uses wrong column name for rest_pause (initial_weight_kg)

- **Category**: Critical
- **Phase**: 1.1
- **Area**: Frontend
- **File(s)**: `src/app/client/workouts/[id]/details/page.tsx` line 911, 914
- **Description**: Display code references `initial_weight_kg` and `initial_reps` but schema uses `weight_kg` and no `initial_reps` column
- **Expected Behavior**: Should use `weight_kg` to match the WorkoutRestPauseSet interface and actual database schema
- **Current Behavior**: References `initial_weight_kg` and `initial_reps` which don't exist in the interface/schema
- **Steps to Reproduce**:
  1. View a workout template with a rest_pause block type
  2. Runtime error will occur when trying to access initial_weight_kg property
- **Related Issues**: Issue #4 (documentation also shows incorrect schema)

### High Priority Issues (Major Functionality Problems)

_None found during verification_

### Medium Priority Issues (Minor Functionality Problems)

#### Issue #4: Documentation outdated for workout_rest_pause_sets schema

- **Category**: Medium (Documentation)
- **Phase**: 1.1
- **Area**: Documentation
- **File(s)**: `BLOCK_STORAGE_SCHEMA.md` line 252-253
- **Description**: Documentation shows `initial_weight_kg` and `initial_reps` columns, but actual schema uses `weight_kg` and no `initial_reps` column
- **Expected Behavior**: Documentation should match actual schema (weight_kg, no initial_reps)
- **Current Behavior**: Documentation shows outdated column names
- **Steps to Reproduce**:
  1. Read BLOCK_STORAGE_SCHEMA.md section for REST-PAUSE
  2. Compare with WorkoutRestPauseSet interface in workoutBlocks.ts
  3. Mismatch is visible
- **Related Issues**: Issue #3 (code also uses wrong column name)

### Low Priority Issues (Cosmetic/Nice-to-Have)

#### Issue #5: workout_ladder_sets.reps type inconsistency

- **Category**: Low
- **Phase**: 1.1
- **Area**: Type Definitions
- **File(s)**: `src/types/workoutBlocks.ts` WorkoutLadderSet interface
- **Description**: `reps` field is type `number` in WorkoutLadderSet, but `string` in other special table interfaces (WorkoutDropSet, WorkoutPyramidSet)
- **Expected Behavior**: Should be consistent (probably string like others, or documented if intentional)
- **Current Behavior**: Type mismatch between interfaces
- **Impact**: Low - may be intentional, but should be documented
- **Steps to Reproduce**: Compare interface definitions
- **Related Issues**: None

## Issue Counts by Category

- **Critical**: 3 issues
- **High**: 0 issues
- **Medium**: 1 issue
- **Low**: 1 issue
- **Total**: 5 issues

## Recommended Fix Order

1. **Issue #1 & #2** (Critical): Fix createPyramidSet() and createLadderSet() - blocks functionality
2. **Issue #3** (Critical): Fix display code for rest_pause - blocks display
3. **Issue #4** (Medium): Update documentation - prevents confusion
4. **Issue #5** (Low): Verify/document type decision - minor cleanup

## Estimated Effort

- **Issue #1 & #2**: 30 minutes - Update function signatures and calls
- **Issue #3**: 15 minutes - Update property references
- **Issue #4**: 10 minutes - Update documentation
- **Issue #5**: 5 minutes - Verify and document
- **Total Estimated Effort**: ~1 hour

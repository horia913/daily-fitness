# Phase 1.1: Database Schema Verification Results

## Date: 2025-01-XX

## Build Status
✅ **Build passes** - Fixed `initial_reps` reference in programProgressionService.ts

## Verification Methodology
Since direct database access is not available, verification is based on:
1. TypeScript interface definitions
2. Service layer code that interacts with database
3. Documentation (BLOCK_STORAGE_SCHEMA.md)
4. Migration files

## Verification Checklist

### workout_templates table
- ✅ **Status**: Referenced in code, parent table for workout_blocks
- ⚠️ **Notes**: Schema not directly verified (no direct DB access)

### workout_blocks table
- ✅ **TypeScript interface exists**: WorkoutBlock interface in workoutBlocks.ts
- ✅ **Expected columns match interface**:
  - id (string/UUID) ✅
  - template_id (string) ✅
  - block_type (WorkoutBlockType enum) ✅
  - block_order (number) ✅
  - block_name? (optional string) ✅
  - block_notes? (optional string) ✅
  - duration_seconds? (optional number) ✅
  - rest_seconds? (optional number) ✅
  - total_sets? (optional number) ✅
  - reps_per_set? (optional string) ✅
  - block_parameters? (optional Record<string, any>) ✅
- ✅ **Service layer usage**: WorkoutBlockService.createWorkoutBlock() uses these fields correctly

### workout_block_exercises table
- ✅ **TypeScript interface exists**: WorkoutBlockExercise interface
- ✅ **Expected columns match interface**:
  - id (string) ✅
  - block_id (string) ✅
  - exercise_id (string) ✅
  - exercise_order (number) ✅
  - exercise_letter? (optional string) ✅
  - sets? (optional number) ✅
  - reps? (optional string) ✅
  - weight_kg? (optional number) ✅
  - load_percentage? (optional number) ✅
  - rir? (optional number) ✅
  - tempo? (optional string) ✅
  - rest_seconds? (optional number) ✅
  - notes? (optional string) ✅

### Special Tables

#### workout_drop_sets
- ✅ **TypeScript interface exists**: WorkoutDropSet interface
- ✅ **Expected columns match interface**:
  - id (string) ✅
  - block_id (string) ✅
  - exercise_id (string) ✅
  - exercise_order (number) ✅
  - drop_order (number) ✅
  - weight_kg? (optional number) ✅
  - reps? (optional string) ✅
  - rest_seconds? (optional number) ✅
- ⚠️ **Note**: Documentation says rest_seconds should be 0 for drop sets, but interface allows any number
- ✅ **Service code**: createDropSet() correctly uses block_id, exercise_id, exercise_order (NOT block_exercise_id)

#### workout_cluster_sets
- ✅ **TypeScript interface exists**: WorkoutClusterSet interface
- ✅ **Expected columns match interface**:
  - id (string) ✅
  - block_id (string) ✅
  - exercise_id (string) ✅
  - exercise_order (number) ✅
  - reps_per_cluster (number) ✅
  - clusters_per_set (number) ✅
  - intra_cluster_rest (number) ✅
  - inter_set_rest (number) ✅
- ✅ **Service code**: createClusterSet() correctly uses block_id, exercise_id, exercise_order

#### workout_rest_pause_sets
- ✅ **TypeScript interface exists**: WorkoutRestPauseSet interface
- ✅ **Expected columns match interface**:
  - id (string) ✅
  - block_id (string) ✅
  - exercise_id (string) ✅
  - exercise_order (number) ✅
  - weight_kg? (optional number) ✅ - **NOTE**: Interface shows weight_kg (NOT initial_weight_kg)
  - rest_pause_duration (number) ✅
  - max_rest_pauses (number) ✅
- ❌ **CRITICAL SCHEMA MISMATCH**: Documentation in BLOCK_STORAGE_SCHEMA.md shows `initial_weight_kg` and `initial_reps`, but:
  - TypeScript interface uses `weight_kg` (not `initial_weight_kg`)
  - TypeScript interface does NOT have `initial_reps` (comment says "initial_reps was dropped")
  - Service code comment says "Column renamed from initial_weight_kg to weight_kg"
  - Display code (page.tsx line 911) still references `initial_weight_kg` - **BUG**
- ✅ **Service code**: createRestPauseSet() correctly uses weight_kg (line 366)

#### workout_pyramid_sets
- ✅ **TypeScript interface exists**: WorkoutPyramidSet interface
- ✅ **Expected columns match interface**:
  - id (string) ✅
  - block_id (string) ✅
  - exercise_id (string) ✅
  - exercise_order (number) ✅
  - pyramid_order (number) ✅
  - weight_kg? (optional number) ✅
  - reps? (optional string) ✅
  - rest_seconds? (optional number) ✅
- ✅ **Service code**: createPyramidSet() correctly uses block_id, exercise_id, exercise_order

#### workout_ladder_sets
- ✅ **TypeScript interface exists**: WorkoutLadderSet interface
- ✅ **Expected columns match interface**:
  - id (string) ✅
  - block_id (string) ✅
  - exercise_id (string) ✅
  - exercise_order (number) ✅
  - ladder_order (number) ✅
  - weight_kg? (optional number) ✅
  - reps? (optional number) ✅ - **NOTE**: Type is number (not string like other tables)
  - rest_seconds? (optional number) ✅
- ❌ **CRITICAL BUG**: createLadderSet() uses `block_exercise_id` (line 431) instead of `block_id`, `exercise_id`, `exercise_order`
  - This violates the database hierarchy specification
  - Should use block_id, exercise_id, exercise_order like all other special tables

#### workout_time_protocols
- ✅ **TypeScript interface exists**: WorkoutTimeProtocol interface
- ✅ **Expected columns match interface**:
  - id (string) ✅
  - block_id (string) ✅
  - exercise_id (string) ✅
  - exercise_order (number) ✅
  - protocol_type ('amrap' | 'emom' | 'for_time' | 'tabata' | 'circuit') ✅
  - total_duration_minutes? (optional number) ✅
  - work_seconds? (optional number) ✅
  - rest_seconds? (optional number) ✅
  - rest_after_set? (optional number) ✅ - **NOTE**: Added for Circuit/Tabata
  - rounds? (optional number) ✅
  - target_reps? (optional number) ✅
  - time_cap_minutes? (optional number) ✅ - **NOTE**: For For Time blocks
  - reps_per_round? (optional number) ✅
  - set? (optional number) ✅
- ✅ **Migration file exists**: ADD_REST_AFTER_SET_TO_TIME_PROTOCOLS.sql confirms rest_after_set column
- ✅ **Service code**: createTimeProtocol() correctly uses block_id, exercise_id, exercise_order

### program_progression_rules table
- ✅ **TypeScript interface exists**: ProgramProgressionRule interface
- ✅ **Migration file exists**: create_program_progression_rules_schema.sql
- ✅ **Expected columns match interface**:
  - All common fields (sets, reps, rest_seconds, tempo, rir, weight_kg, load_percentage, notes) ✅
  - Block information fields ✅
  - Exercise information fields ✅
  - Type-specific fields (superset, drop_set, cluster_set, rest_pause, pre_exhaustion, time-based) ✅
- ✅ **Interface has load_percentage**: ProgramProgressionRule interface includes load_percentage field

### Foreign Key Relationships
- ✅ **Code references suggest relationships exist**:
  - workout_templates → workout_blocks (template_id) ✅
  - workout_blocks → workout_block_exercises (block_id) ✅
  - workout_blocks → special tables (block_id) ✅
  - workout_block_exercises → exercises (exercise_id) ✅
  - special tables → exercises (exercise_id) ✅
- ⚠️ **Note**: Cannot verify actual foreign key constraints without database access

### Indexes
- ⚠️ **Status**: Cannot verify without database access
- ✅ **Migration file exists**: create_program_progression_rules_schema.sql creates indexes

### RLS Policies
- ✅ **Migration file exists**: FIX_SPECIAL_TABLES_RLS.sql should have created RLS policies
- ⚠️ **Status**: Cannot verify actual policies without database access

## Findings

### Critical Issues

#### 1. workout_pyramid_sets and workout_ladder_sets: Uses block_exercise_id instead of composite key
- **Category**: Critical
- **Phase**: 1.1
- **Area**: Backend
- **Files**: 
  - `src/lib/workoutBlockService.ts` line 332 (createPyramidSet)
  - `src/lib/workoutBlockService.ts` line 431 (createLadderSet)
- **Description**: createPyramidSet() and createLadderSet() use `block_exercise_id` instead of `block_id`, `exercise_id`, `exercise_order`
- **Expected Behavior**: Should use block_id, exercise_id, exercise_order like all other special tables (drop_sets, cluster_sets, rest_pause_sets, time_protocols)
- **Current Behavior**: Uses block_exercise_id which violates the database hierarchy
- **Impact**: High - This will cause database errors if block_exercise_id column doesn't exist in these tables
- **Related Issues**: This is inconsistent with the documented database hierarchy. Note: getWorkoutBlocks() correctly queries by block_id (line 103-106), so the query logic is correct, only the insert logic is wrong

#### 2. workout_rest_pause_sets: Display code uses wrong column name
- **Category**: Critical
- **Phase**: 1.1
- **Area**: Frontend
- **File**: `src/app/client/workouts/[id]/details/page.tsx` line 911
- **Description**: Display code references `initial_weight_kg` but schema uses `weight_kg`
- **Expected Behavior**: Should use `weight_kg` to match the TypeScript interface and service code
- **Current Behavior**: References `initial_weight_kg` which doesn't exist in the interface
- **Impact**: High - This will cause runtime errors when displaying rest-pause blocks
- **Related Issues**: Documentation also incorrectly shows initial_weight_kg

### Schema Mismatches

#### 1. workout_rest_pause_sets: initial_weight_kg vs weight_kg (Documentation)
- **Location**: Documentation vs Code
- **Issue**: BLOCK_STORAGE_SCHEMA.md mentions `initial_weight_kg` and `initial_reps`, but:
  - TypeScript interface uses `weight_kg` (not `initial_weight_kg`)
  - TypeScript interface does NOT have `initial_reps` (comment says "initial_reps was dropped")
  - Service code comment says "Column renamed from initial_weight_kg to weight_kg"
- **Status**: Documentation is outdated
- **Impact**: Medium - Documentation confusion, but code is correct
- **Recommendation**: Update BLOCK_STORAGE_SCHEMA.md to reflect actual schema (weight_kg, no initial_reps)

### Type Mismatches

#### 1. workout_ladder_sets: reps type (number vs string)
- **Location**: WorkoutLadderSet interface
- **Issue**: `reps` is type `number` in WorkoutLadderSet, but `string` in other tables
- **Status**: TypeScript interface defines it as number
- **Impact**: Low - type mismatch between interfaces (may be intentional)
- **Recommendation**: Verify if this is intentional or should be string for consistency

### Build Errors Fixed
- ✅ Fixed `initial_reps` reference in programProgressionService.ts (line 596) - property doesn't exist in WorkoutRestPauseSet interface

## Next Steps
1. ✅ Complete Phase 1.1 verification (this document)
2. ✅ Build passes - ready for Phase 1.2
3. ⏭️ Proceed to Phase 1.2: Service Layer Verification

## Summary
- **Total Issues Found**: 3 issues (2 Critical, 1 Medium documentation issue)
- **Build Status**: ✅ Passes
- **Ready for Next Phase**: ✅ Yes (but critical issues should be fixed)

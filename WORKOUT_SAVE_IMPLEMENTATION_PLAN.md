# Workout Save Implementation Plan

## Overview
Update the workout creation system to save data to the correct tables instead of only `block_parameters` JSON.

## Current State
- All data is saved to `block_parameters` JSON
- Separate tables (`workout_cluster_sets`, `workout_rest_pause_sets`, `workout_drop_sets`, `workout_time_protocols`, etc.) are empty
- Display logic reads from `block_parameters` (which works for some blocks but not all)

## Required Changes

### 1. WorkoutTemplateForm.tsx - Update Save Logic

#### For Cluster Set Blocks:
- After creating block and exercise, call `WorkoutBlockService.createClusterSet()`
- Parameters needed:
  - `block_exercise_id`: The exercise ID from `addExerciseToBlock`
  - `reps_per_cluster`: From `exercise.cluster_reps` or `exercise.reps`
  - `clusters_per_set`: From `exercise.clusters_per_set`
  - `intra_cluster_rest`: From `exercise.intra_cluster_rest`
  - `inter_set_rest`: From `exercise.rest_seconds` or `block.rest_seconds`

#### For Rest Pause Blocks:
- After creating block and exercise, call `WorkoutBlockService.createRestPauseSet()`
- Parameters needed:
  - `block_exercise_id`: The exercise ID from `addExerciseToBlock`
  - `initial_weight_kg`: From `exercise.weight_kg` (optional)
  - `initial_reps`: From `exercise.reps` (parse to number)
  - `rest_pause_duration`: From `exercise.rest_pause_duration`
  - `max_rest_pauses`: From `exercise.max_rest_pauses`

#### For Drop Set Blocks:
- After creating block and exercise, call `WorkoutBlockService.createDropSet()`
- Parameters needed:
  - `block_exercise_id`: The exercise ID from `addExerciseToBlock`
  - `drop_order`: Usually 1 (first drop)
  - `weight_kg`: Calculate from initial weight and drop_percentage
  - `reps`: From `exercise.drop_set_reps`
  - `rest_seconds`: Usually 0 for drop sets

#### For Time-Based Blocks (Circuit, Tabata, AMRAP, EMOM, For Time):
- After creating block, call `WorkoutBlockService.createTimeProtocol()`
- Parameters needed:
  - `block_id`: The block ID
  - `protocol_type`: 'circuit' | 'tabata' | 'amrap' | 'emom' | 'for_time'
  - `total_duration_minutes`: From `exercise.amrap_duration` or `exercise.emom_duration`
  - `work_seconds`: From `exercise.work_seconds`
  - `rest_seconds`: From `exercise.rest_after` (for tabata)
  - `rounds`: From `exercise.rounds` (for tabata, circuit)
  - `reps_per_round`: For circuit/tabata exercises (need to check structure)

#### For Pyramid Set Blocks:
- After creating block and exercise, call `WorkoutBlockService.createPyramidSet()`
- Parameters needed:
  - `block_exercise_id`: The exercise ID
  - `pyramid_order`: Order in pyramid (1, 2, 3, etc.)
  - `weight_kg`: Weight for this step
  - `reps`: Reps for this step
  - `rest_seconds`: Rest for this step

#### For Ladder Set Blocks:
- After creating block and exercise, call `WorkoutBlockService.createLadderSet()`
- Parameters needed:
  - `block_exercise_id`: The exercise ID
  - `ladder_order`: Order in ladder (1, 2, 3, etc.)
  - `weight_kg`: Weight for this step
  - `reps`: Reps for this step (number)
  - `rest_seconds`: Rest for this step

### 2. Block Name Handling
- Option A: Remove `block_name` from being saved (set to null/undefined)
- Option B: Generate block name from exercises and save it
- **Decision**: User prefers Option A (remove column) or Option B (populate with actual names)

### 3. Display Logic Updates (workouts/[id]/details/page.tsx)

#### For Cluster Set:
- Read from `workout_cluster_sets` table (via `block_exercise_id`)
- Display: clusters_per_set, reps_per_cluster, intra_cluster_rest, inter_set_rest

#### For Rest Pause:
- Read from `workout_rest_pause_sets` table (via `block_exercise_id`)
- Display: rest_pause_duration, max_rest_pauses, rest_seconds (from block)

#### For Time-Based Blocks:
- Read from `workout_time_protocols` table (via `block_id`)
- For circuit/tabata: Also read exercise-specific rest from `workout_time_protocols` or `workout_block_exercises.rest_seconds`
- Display time-based parameters, not Sets/Reps/Rest

### 4. WorkoutBlockService Updates
- Update `createTimeProtocol` to accept 'circuit' and 'tabata' as protocol types
- Ensure all methods handle the data correctly

## Implementation Order
1. Update `WorkoutBlockService.createTimeProtocol` to support circuit/tabata
2. Update `WorkoutTemplateForm.tsx` save logic for each block type
3. Update display logic in `workouts/[id]/details/page.tsx`
4. Handle block_name (remove or populate)
5. Test with existing data (may need migration for old data)


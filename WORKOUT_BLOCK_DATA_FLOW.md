# Workout Block Data Flow Documentation

## Overview

This document maps the complete data flow for each workout block type:

1. **Form Fields** → What the user inputs
2. **Database Storage** → Where data is saved
3. **Display Fields** → What is shown to users
4. **Data Source** → Where display values come from

---

## 1. STRAIGHT SET

### Form Fields:

- `exercise_id` - Exercise selection
- `sets` - Number of sets
- `reps` - Reps per set
- `rest_seconds` - Rest between sets
- `weight_kg` - Weight (optional)
- `rir` - Reps in reserve (optional)
- `tempo` - Tempo notation (optional)
- `notes` - Exercise notes (optional)
- `load_percentage` - % of 1RM (optional)

### Database Storage:

- **workout_blocks**: `block_type = 'straight_set'`, `total_sets`, `reps_per_set`, `rest_seconds`
- **workout_block_exercises**: `exercise_id`, `sets`, `reps`, `rest_seconds`, `weight_kg`, `rir`, `tempo`, `notes`, `load_percentage`

### Display (Block Header):

- **Sets**: `workout_blocks.total_sets` or `workout_block_exercises.sets`
- **Reps**: `workout_blocks.reps_per_set` or `workout_block_exercises.reps`
- **Rest**: `workout_blocks.rest_seconds` or `workout_block_exercises.rest_seconds`

### Display (Exercise Card):

- **Sets**: `workout_block_exercises.sets` or `workout_blocks.total_sets`
- **Reps**: `workout_block_exercises.reps` or `workout_blocks.reps_per_set`
- **Rest**: `workout_block_exercises.rest_seconds` or `workout_blocks.rest_seconds`
- **Weight**: `workout_block_exercises.weight_kg`
- **RIR**: `workout_block_exercises.rir`
- **Tempo**: `workout_block_exercises.tempo`
- **Notes**: `workout_block_exercises.notes`

### Issues:

✅ All fields have clear database columns

---

## 2. SUPERSET

### Form Fields:

- `exercise_id` - First exercise
- `superset_exercise_id` - Second exercise
- `sets` - Number of sets
- `reps` - Reps for first exercise
- `superset_reps` - Reps for second exercise
- `rest_seconds` - Rest between sets (after completing both exercises)
- `weight_kg`, `rir`, `tempo`, `notes`, `load_percentage` (for first exercise)

### Database Storage:

- **workout_blocks**: `block_type = 'superset'`, `total_sets`, `reps_per_set`, `rest_seconds` (rest AFTER completing both exercises in the set)
- **workout_block_exercises**:
  - Exercise 1: `exercise_id`, `exercise_order = 1`, `sets`, `reps`, `weight_kg`, `rir`, `tempo`, `notes`, `load_percentage`
  - Exercise 2: `exercise_id = superset_exercise_id`, `exercise_order = 2`, `sets`, `reps = superset_reps`
  - **Note**: NO rest between exercises - exercises are performed back-to-back

### Display (Block Header):

- **Rest after set**: `workout_blocks.rest_seconds` (rest after completing both exercises)

### Display (Exercise Card):

- **Sets**: `workout_block_exercises.sets` or `workout_blocks.total_sets`
- **Reps**: `workout_block_exercises.reps`
- **Rest after set**: `workout_blocks.rest_seconds` (rest after completing both exercises)

### Issues:

✅ All fields have clear database columns

---

## 3. GIANT SET

### Form Fields:

- `giant_set_exercises[]` - Array of exercises, each with:
  - `exercise_id`
  - `sets`
  - `reps`
- `rest_seconds` - Rest between sets (after completing all exercises)
- `weight_kg`, `rir`, `tempo`, `notes`, `load_percentage` (per exercise)

### Database Storage:

- **workout_blocks**: `block_type = 'giant_set'`, `total_sets`, `rest_seconds` (rest AFTER completing all exercises in the set)
- **workout_block_exercises**: One row per exercise with `exercise_order` (1, 2, 3...), `sets`, `reps`, etc.
  - **Note**: NO rest between exercises - exercises are performed back-to-back

### Display (Block Header):

- **Rest after set**: `workout_blocks.rest_seconds` (rest after completing all exercises)

### Display (Exercise Card):

- **Sets**: `workout_block_exercises.sets` or `workout_blocks.total_sets`
- **Reps**: `workout_block_exercises.reps`
- **Rest after set**: `workout_blocks.rest_seconds` (rest after completing all exercises)

### Issues:

✅ All fields have clear database columns

---

## 4. DROP SET

### Form Fields:

- `exercise_id` - Exercise selection
- `sets` - Number of sets
- `reps` - Initial reps
- `weight_kg` - Initial weight
- `drop_percentage` - Weight reduction percentage
- `drop_set_reps` - Reps for drop sets
- `rest_seconds` - Rest between sets
- `rir`, `tempo`, `notes`, `load_percentage`

### Database Storage:

- **workout_blocks**: `block_type = 'drop_set'`, `total_sets`, `reps_per_set`, `rest_seconds` (rest AFTER completing all drops in the set)
- **workout_block_exercises**: `exercise_id`, `sets`, `reps`, `weight_kg`, `rest_seconds`, `rir`, `tempo`, `notes`, `load_percentage`
- **workout_drop_sets**: `block_id`, `exercise_id`, `exercise_order`, `drop_order`, `weight_kg`, `reps`, `rest_seconds`
  - **Note**: NO rest between drops - drops are performed back-to-back

### Display (Block Header):

- **Weight reduction**: Calculated from `workout_drop_sets[0].weight_kg` vs `workout_block_exercises.weight_kg`
- **Drop set reps**: `workout_drop_sets[0].reps`
- Fallback: `block_parameters.drop_percentage`, `block_parameters.drop_set_reps`

### Display (Exercise Card):

- **Sets**: `workout_block_exercises.sets` or `workout_blocks.total_sets`
- **Reps**: `workout_block_exercises.reps`
- **Rest**: `workout_block_exercises.rest_seconds` or `workout_blocks.rest_seconds`

### Issues:

✅ All fields have clear database columns

---

## 5. CLUSTER SET

### Form Fields:

- `exercise_id` - Exercise selection
- `sets` - Number of sets
- `cluster_reps` - Reps per cluster (or uses `reps` if not specified)
- `clusters_per_set` - Number of clusters per set
- `intra_cluster_rest` - Rest between clusters (seconds)
- `rest_seconds` - Rest between sets
- `weight_kg`, `rir`, `tempo`, `notes`, `load_percentage`

### Database Storage:

- **workout_blocks**: `block_type = 'cluster_set'`, `total_sets`, `rest_seconds`
- **workout_block_exercises**: `exercise_id`, `sets`, `reps`, `weight_kg`, `rest_seconds`, `rir`, `tempo`, `notes`, `load_percentage`
- **workout_cluster_sets**: `block_id`, `exercise_id`, `exercise_order`, `clusters_per_set`, `reps_per_cluster`, `intra_cluster_rest`, `rest_seconds`

### Display (Block Header):

- **Clusters per set**: `workout_cluster_sets[0].clusters_per_set`
- **Reps per cluster**: `workout_cluster_sets[0].reps_per_cluster`
- **Rest between clusters**: `workout_cluster_sets[0].intra_cluster_rest`
- **Rest between sets**: `workout_blocks.rest_seconds`
- Fallback: `block_parameters.clusters_per_set`, `block_parameters.reps_per_cluster`, `block_parameters.intra_cluster_rest`

### Display (Exercise Card):

- **Sets**: `workout_block_exercises.sets` or `workout_blocks.total_sets`
- **Reps**: `workout_block_exercises.reps`
- **Rest**: `workout_block_exercises.rest_seconds` or `workout_blocks.rest_seconds`

### Issues:

✅ All fields have clear database columns

---

## 6. REST-PAUSE

### Form Fields:

- `exercise_id` - Exercise selection
- `sets` - Number of sets
- `reps` - Initial reps
- `weight_kg` - Weight
- `rest_pause_duration` - Rest-pause duration (seconds)
- `max_rest_pauses` - Maximum rest-pause attempts
- `rest_seconds` - Rest between sets
- `rir`, `tempo`, `notes`, `load_percentage`

### Database Storage:

- **workout_blocks**: `block_type = 'rest_pause'`, `total_sets`, `rest_seconds`
- **workout_block_exercises**: `exercise_id`, `sets`, `reps`, `weight_kg`, `rest_seconds`, `rir`, `tempo`, `notes`, `load_percentage`
- **workout_rest_pause_sets**: `block_id`, `exercise_id`, `exercise_order`, `initial_weight_kg`, `initial_reps`, `rest_pause_duration`, `max_rest_pauses`

### Display (Block Header):

- **Rest-pause duration**: `workout_rest_pause_sets[0].rest_pause_duration`
- **Max rest-pauses**: `workout_rest_pause_sets[0].max_rest_pauses`
- **Rest between sets**: `workout_blocks.rest_seconds`
- Fallback: `block_parameters.rest_pause_duration`, `block_parameters.max_rest_pauses`

### Display (Exercise Card):

- **Sets**: `workout_block_exercises.sets` or `workout_blocks.total_sets`
- **Reps**: `workout_block_exercises.reps`
- **Rest**: `workout_block_exercises.rest_seconds` or `workout_blocks.rest_seconds`

### Issues:

✅ All fields have clear database columns

---

## 7. PYRAMID SET

### Form Fields:

- `exercise_id` - Exercise selection
- `sets` - Number of sets (used to calculate pyramid steps)
- `reps` - Base reps
- `weight_kg` - Base weight
- `rest_seconds` - Rest between sets
- `rir`, `tempo`, `notes`, `load_percentage`

### Database Storage:

- **workout_blocks**: `block_type = 'pyramid_set'`, `total_sets`, `rest_seconds`
- **workout_block_exercises**: `exercise_id`, `sets`, `reps`, `weight_kg`, `rest_seconds`, `rir`, `tempo`, `notes`, `load_percentage`
- **workout_pyramid_sets**: `block_id`, `exercise_id`, `exercise_order`, `pyramid_order`, `weight_kg`, `reps`, `rest_seconds`

### Display (Block Header):

- Currently shows Sets/Reps/Rest from `workout_blocks` or `workout_block_exercises`

### Display (Exercise Card):

- **Sets**: `workout_block_exercises.sets` or `workout_blocks.total_sets`
- **Reps**: `workout_block_exercises.reps`
- **Rest**: `workout_block_exercises.rest_seconds` or `workout_blocks.rest_seconds`

### Issues:

⚠️ **Pyramid-specific data not displayed** - `workout_pyramid_sets` contains pyramid steps but not shown in display

---

## 8. LADDER SET

### Form Fields:

- `exercise_id` - Exercise selection
- `sets` - Number of ladder steps
- `reps` - Base reps (usually 1 for ascending ladder)
- `weight_kg` - Weight
- `rest_seconds` - Rest between steps
- `rir`, `tempo`, `notes`, `load_percentage`

### Database Storage:

- **workout_blocks**: `block_type = 'ladder'`, `total_sets`, `rest_seconds`
- **workout_block_exercises**: `exercise_id`, `sets`, `reps`, `weight_kg`, `rest_seconds`, `rir`, `tempo`, `notes`, `load_percentage`
- **workout_ladder_sets**: `block_id`, `exercise_id`, `exercise_order`, `ladder_order`, `weight_kg`, `reps`, `rest_seconds`

### Display (Block Header):

- Currently shows Sets/Reps/Rest from `workout_blocks` or `workout_block_exercises`

### Display (Exercise Card):

- **Sets**: `workout_block_exercises.sets` or `workout_blocks.total_sets`
- **Reps**: `workout_block_exercises.reps`
- **Rest**: `workout_block_exercises.rest_seconds` or `workout_blocks.rest_seconds`

### Issues:

⚠️ **Ladder-specific data not displayed** - `workout_ladder_sets` contains ladder steps but not shown in display

---

## 9. PRE-EXHAUSTION

### Form Fields:

- `exercise_id` - Isolation exercise
- `compound_exercise_id` - Compound exercise
- `sets` - Number of sets
- `isolation_reps` - Reps for isolation exercise
- `compound_reps` - Reps for compound exercise
- `rest_seconds` - Rest between exercises (isolation → compound)
- `weight_kg`, `rir`, `tempo`, `notes`, `load_percentage` (per exercise)

### Database Storage:

- **workout_blocks**: `block_type = 'pre_exhaustion'`, `total_sets`, `rest_seconds` (rest AFTER completing both exercises in the set)
- **workout_block_exercises**:
  - Exercise 1 (isolation): `exercise_id`, `exercise_order = 1`, `sets`, `reps = isolation_reps`
  - Exercise 2 (compound): `exercise_id = compound_exercise_id`, `exercise_order = 2`, `sets`, `reps = compound_reps`
  - **Note**: Rest between isolation and compound exercises is minimal/back-to-back, then rest after completing both

### Display (Block Header):

- **Rest after set**: `workout_blocks.rest_seconds` or `block_parameters.rest_between` (rest after completing both exercises)

### Display (Exercise Card):

- **Sets**: `workout_block_exercises.sets` or `workout_blocks.total_sets`
- **Reps**: `workout_block_exercises.reps`
- **Rest after set**: `workout_blocks.rest_seconds` (rest after completing both exercises)

### Issues:

✅ All fields have clear database columns

---

## 10. AMRAP (As Many Rounds As Possible)

### Form Fields:

- `exercise_id` - Exercise selection
- `amrap_duration` - Duration in minutes
- `target_reps` - Target reps (optional)
- `rest_seconds` - Rest between rounds (optional)
- `weight_kg`, `rir`, `tempo`, `notes`, `load_percentage`

### Database Storage:

- **workout_blocks**: `block_type = 'amrap'`, `duration_seconds`, `rest_seconds`
- **workout_block_exercises**: `exercise_id`, `weight_kg`, `rir`, `tempo`, `notes`, `load_percentage`
- **workout_time_protocols**: `block_id`, `exercise_id`, `exercise_order`, `protocol_type = 'amrap'`, `total_duration_minutes`, `target_reps`

### Display (Block Header):

- **Duration**: `workout_time_protocols.total_duration_minutes` or `workout_blocks.duration_seconds / 60` or `block_parameters.amrap_duration`
- **Target reps**: `workout_time_protocols.target_reps` or `block_parameters.target_reps`

### Display (Exercise Card):

- **Duration**: `workout_time_protocols.total_duration_minutes` or `workout_blocks.duration_seconds / 60`
- **Target reps**: `workout_time_protocols.target_reps`

### Issues:

✅ All fields have clear database columns

---

## 11. EMOM (Every Minute On the Minute)

### Form Fields:

- `exercise_id` - Exercise selection
- `emom_duration` - Duration in minutes
- `work_seconds` - Work interval (seconds)
- `rest_after` - Rest after work (seconds)
- `emom_reps` - Reps per minute (optional)
- `weight_kg`, `rir`, `tempo`, `notes`, `load_percentage`

### Database Storage:

- **workout_blocks**: `block_type = 'emom'`, `duration_seconds`, `rest_seconds`
- **workout_block_exercises**: `exercise_id`, `weight_kg`, `rir`, `tempo`, `notes`, `load_percentage`
- **workout_time_protocols**: `block_id`, `exercise_id`, `exercise_order`, `protocol_type = 'emom'`, `total_duration_minutes`, `work_seconds`, `rest_seconds`, `reps_per_round`

### Display (Block Header):

- **Duration**: `workout_time_protocols.total_duration_minutes` or `workout_blocks.duration_seconds / 60` or `block_parameters.emom_duration`
- **Work interval**: `workout_time_protocols.work_seconds` or `block_parameters.work_seconds`
- **Reps per minute**: `workout_time_protocols.reps_per_round` or `block_parameters.emom_reps` (fallback for old data)

### Display (Exercise Card):

- **Duration**: `workout_time_protocols.total_duration_minutes` or `workout_blocks.duration_seconds / 60`
- **Work interval**: `workout_time_protocols.work_seconds`
- **Reps per minute**: `workout_time_protocols.reps_per_round`

### Issues:

✅ All fields have clear database columns

---

## 12. FOR TIME

### Form Fields:

- `exercise_id` - Exercise selection
- `time_cap` - Time cap in minutes
- `target_reps` - Target reps (optional)
- `weight_kg`, `rir`, `tempo`, `notes`, `load_percentage`

### Database Storage:

- **workout_blocks**: `block_type = 'for_time'`, `rest_seconds`
- **workout_block_exercises**: `exercise_id`, `weight_kg`, `rir`, `tempo`, `notes`, `load_percentage`
- **workout_time_protocols**: `block_id`, `exercise_id`, `exercise_order`, `protocol_type = 'for_time'`, `time_cap_minutes`, `target_reps`

### Display (Block Header):

- **Time cap**: `workout_time_protocols.time_cap_minutes` or `workout_time_protocols.total_duration_minutes` or `block_parameters.time_cap`
- **Target reps**: `workout_time_protocols.target_reps` or `block_parameters.target_reps`

### Display (Exercise Card):

- **Time cap**: `workout_time_protocols.time_cap_minutes` or `workout_time_protocols.total_duration_minutes`
- **Target reps**: `workout_time_protocols.target_reps`

### Issues:

✅ All fields have clear database columns

---

## 13. TABATA

### Form Fields:

- **Block-level**:
  - `work_seconds` - Work interval (seconds) - applies to all exercises
  - `rest_seconds` - Rest interval (seconds) - applies to all exercises
  - `rounds` - Rounds per set
- **Sets Array** (`tabata_sets[]`):
  - Each set contains:
    - `exercises[]` - Array of exercises, each with:
      - `exercise_id`
      - `work_seconds` - Override work time (optional, per exercise)
      - `rest_after` - Rest after this exercise (optional, per exercise)
    - `rest_between_sets` - Rest after completing all exercises in the set

### Database Storage:

- **workout_blocks**: `block_type = 'tabata'`, `total_sets` (number of sets)
- **workout_block_exercises**: One row per exercise with `exercise_order` (sequential across all sets)
- **workout_time_protocols**: One row per exercise with:
  - `block_id`, `exercise_id`, `exercise_order`
  - `protocol_type = 'tabata'`
  - `work_seconds` - Work time for this exercise
  - `rest_seconds` - Rest time after this exercise
  - `rounds` - Rounds per set
  - `set` - Set number (NEW - from ADD_SET_COLUMN_TO_TIME_PROTOCOLS.sql)

### Display (Block Header):

- **Rounds**: `workout_time_protocols[0].rounds` or `block_parameters.rounds`
- **Work interval**: `workout_time_protocols[0].work_seconds` or `block_parameters.work_seconds`
- **Rest after set**: `workout_time_protocols[0].rest_seconds` or `block_parameters.rest_after`

### Display (Exercise Card):

- **Work time**: `workout_time_protocols.find(exercise).work_seconds` or block-level default
- **Rest time**: `workout_time_protocols.find(exercise).rest_seconds` or block-level default
- **Set**: `workout_time_protocols.find(exercise).set` / `workout_blocks.total_sets`

### Issues:

✅ All fields have clear database columns (after adding `set` column)

---

## 14. CIRCUIT

### Form Fields:

- **Block-level**:
  - `sets` - Number of rounds
- **Sets Array** (`circuit_sets[]`):
  - Each set contains:
    - `exercises[]` - Array of exercises, each with:
      - `exercise_id`
      - `work_seconds` - Work time for this exercise (optional, per exercise)
      - `rest_after` - Rest after this exercise (optional, per exercise)
    - `rest_between_sets` - Rest after completing all exercises in the set (rest between rounds)

### Database Storage:

- **workout_blocks**: `block_type = 'circuit'`, `total_sets` (number of rounds)
- **workout_block_exercises**: One row per exercise with `exercise_order` (sequential across all sets)
- **workout_time_protocols**: One row per exercise with:
  - `block_id`, `exercise_id`, `exercise_order`
  - `protocol_type = 'circuit'`
  - `work_seconds` - Work time for this exercise
  - `rest_seconds` - Rest time after this exercise
  - `rounds` - Number of rounds (from `exercise.sets`)
  - `set` - Set number (NEW - from ADD_SET_COLUMN_TO_TIME_PROTOCOLS.sql)

### Display (Block Header):

- **Rounds**: `workout_time_protocols[0].rounds` or `workout_blocks.total_sets` or `block_parameters.rounds` or `block_parameters.circuit_sets.length`
- **Work interval**: `workout_time_protocols[0].work_seconds` or `block_parameters.work_seconds` (if circuit-wide)
- **Rest after exercise**: `workout_time_protocols[0].rest_seconds` or `block_parameters.rest_after_exercise`
- **Rest between rounds**: `workout_time_protocols[0].rest_seconds` or `block_parameters.rest_between_rounds` or `block_parameters.circuit_sets[0].rest_between_sets`
- **Exercises in circuit**: Count of `workout_block_exercises` for this block

### Display (Exercise Card):

- **Work time**: `workout_time_protocols.find(exercise).work_seconds` or block-level default
- **Rest time**: `workout_time_protocols.find(exercise).rest_seconds` or block-level default
- **Set**: `workout_time_protocols.find(exercise).set` / `workout_blocks.total_sets`

### Issues:

✅ All fields have clear database columns (after adding `set` column)

---

## SUMMARY OF ISSUES

### ⚠️ Fields without clear single-column storage:

1. **Pyramid Set**: Pyramid steps stored in `workout_pyramid_sets` but not displayed
2. **Ladder Set**: Ladder steps stored in `workout_ladder_sets` but not displayed

### ✅ All other fields have clear database columns

### 📝 Important Notes:

1. **Rest After Set vs Rest Between Exercises**:

   - For **Superset, Giant Set, Pre-Exhaustion**: `workout_blocks.rest_seconds` is rest AFTER completing all exercises in the set (not between exercises)
   - For **Drop Set**: `workout_blocks.rest_seconds` is rest AFTER completing all drops in the set (no rest between drops)
   - Exercises in these block types are performed back-to-back with no rest between them

2. **EMOM Reps**: Now stored in `workout_time_protocols.reps_per_round` column

---

## DISPLAY LOGIC SUMMARY

### Block Header Parameters:

- Read from special tables first (`workout_drop_sets`, `workout_cluster_sets`, `workout_rest_pause_sets`, `workout_time_protocols`)
- Fallback to `block_parameters` for old data
- Some values from `workout_blocks` (e.g., `rest_seconds`, `total_sets`)

### Exercise Card Parameters:

- **Time-based blocks** (AMRAP, EMOM, FOR_TIME, TABATA, CIRCUIT): Use `getTimeBasedParameters()` which reads from `workout_time_protocols`
- **Other blocks**: Use `shouldShowSetsRepsRest()` which shows Sets/Reps/Rest from `workout_block_exercises` or `workout_blocks`

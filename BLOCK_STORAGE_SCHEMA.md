# Block Storage Schema - Complete Breakdown

## Database Hierarchy

**IMPORTANT:** The database hierarchy for workouts is:

```
workout_templates
  └── workout_blocks (block-level data)
      └── [Optional] Special Tables (exercise-level data for specific block types only):
          ├── workout_block_exercises (for straight_set, superset, giant_set, pre_exhaustion blocks only)
          ├── workout_drop_sets (for drop_set blocks only)
          ├── workout_cluster_sets (for cluster_set blocks only)
          ├── workout_rest_pause_sets (for rest_pause blocks only)
          ├── workout_pyramid_sets (for pyramid_set blocks only)
          ├── workout_ladder_sets (for ladder blocks only)
          └── workout_time_protocols (for amrap, emom, for_time, tabata, circuit blocks only)
```

### Key Points:

1. **`workout_blocks`** stores block-level data (always present for every block).

2. **Special Tables** are OPTIONAL tables that store exercise-level data for specific block types:

   - `workout_block_exercises` - ONLY for straight_set, superset, giant_set, pre_exhaustion blocks
   - `workout_drop_sets` - ONLY for drop_set blocks
   - `workout_cluster_sets` - ONLY for cluster_set blocks
   - `workout_rest_pause_sets` - ONLY for rest_pause blocks
   - `workout_pyramid_sets` - ONLY for pyramid_set blocks
   - `workout_ladder_sets` - ONLY for ladder blocks
   - `workout_time_protocols` - ONLY for amrap, emom, for_time, tabata, circuit blocks

3. **Special tables link to exercises** using:

   - `block_id` - links to the workout block
   - `exercise_id` - links to the exercise from the exercise library
   - `exercise_order` - orders exercises within the block
   - **NOTE:** Special tables do NOT use `block_exercise_id` - they link directly via `block_id`, `exercise_id`, and `exercise_order`

4. **Display Logic:**
   - Block header shows: All USED fields from `workout_blocks` (except relational IDs)
   - Exercise cards show: All USED fields from the relevant special table for that block type

---

## workout_blocks Table Columns (All Block Types)

### Common Columns (All Blocks):

- `id` - UUID primary key
- `template_id` - References workout_templates
- `block_type` - Enum: 'straight_set', 'superset', 'giant_set', 'drop_set', 'cluster_set', 'rest_pause', 'pyramid_set', 'ladder', 'pre_exhaustion', 'amrap', 'emom', 'for_time', 'tabata', 'circuit'
- `block_order` - Integer (order within template)
- `block_name` - String (optional, block name)
- `block_notes` - String (optional, block notes)
- `duration_seconds` - Integer (optional, for time-based blocks)
- `rest_seconds` - Integer (optional, rest AFTER completing the set/block)
- `total_sets` - Integer (optional, number of sets/rounds)
- `reps_per_set` - String (optional, reps per set, can be range like "10-12")
- `block_parameters` - JSONB (optional, legacy/fallback data)

---

## 1. STRAIGHT SET

### workout_blocks:

- ✅ `block_type` = 'straight_set' (USED)
- ✅ `total_sets` = number of sets (USED - from exercise.sets)
- ✅ `reps_per_set` = reps per set (USED - from exercise.reps)
- ✅ `rest_seconds` = rest between sets (USED - from exercise.rest_seconds)
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `duration_seconds` (NOT SET)
- ❌ `block_parameters` (NOT SET for straight_set)

### workout_block_exercises (1 row):

- ✅ `block_id` (USED)
- ✅ `exercise_id` (USED)
- ✅ `exercise_order` = 1 (USED)
- ✅ `sets` = number of sets (USED - from exercise.sets)
- ✅ `reps` = reps per set (USED - from exercise.reps)
- ✅ `rest_seconds` = rest between sets (USED - from exercise.rest_seconds)
- ❌ `weight_kg` (NOT SET in save logic)
- ⚠️ `rir` (OPTIONAL - from exercise.rir)
- ⚠️ `tempo` (OPTIONAL - from exercise.tempo)
- ⚠️ `notes` (OPTIONAL - from exercise.notes)
- ❌ `load_percentage` (NOT SET in save logic)
- ❌ `exercise_letter` (NOT SET)

### Special Tables:

- **NONE**

---

## 2. SUPERSET

### workout_blocks:

- ✅ `block_type` = 'superset' (USED)
- ✅ `total_sets` = number of sets (USED - from exercise.sets)
- ✅ `rest_seconds` = rest AFTER completing both exercises (USED - from exercise.rest_seconds)
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `reps_per_set` (NOT SET)
- ❌ `duration_seconds` (NOT SET)
- ❌ `block_parameters` (NOT SET for superset)

### workout_block_exercises (2 rows):

- **Exercise 1:**

  - ✅ `block_id` (USED)
  - ✅ `exercise_id` = first exercise (USED)
  - ✅ `exercise_order` = 1 (USED)
  - ❌ `exercise_letter` (NOT SET in save logic)
  - ✅ `sets` = number of sets (USED - from exercise.sets)
  - ✅ `reps` = reps for first exercise (USED - from exercise.reps)
  - ❌ `weight_kg` (NOT SET in save logic)
  - ⚠️ `rir` (OPTIONAL - from exercise.rir)
  - ⚠️ `tempo` (OPTIONAL - from exercise.tempo)
  - ⚠️ `notes` (OPTIONAL - from exercise.notes)
  - ❌ `load_percentage` (NOT SET in save logic)
  - ✅ `rest_seconds` = rest between sets (USED - from exercise.rest_seconds, but represents rest AFTER both exercises)

- **Exercise 2:**
  - ✅ `block_id` (USED)
  - ✅ `exercise_id` = second exercise (USED - from exercise.superset_exercise_id)
  - ✅ `exercise_order` = 2 (USED)
  - ❌ `exercise_letter` (NOT SET in save logic)
  - ✅ `sets` = number of sets (USED - from exercise.sets)
  - ✅ `reps` = reps for second exercise (USED - from exercise.superset_reps || exercise.reps)
  - ❌ `weight_kg` (NOT SET in save logic)
  - ❌ `rir` (NOT SET)
  - ❌ `tempo` (NOT SET)
  - ❌ `notes` (NOT SET)
  - ❌ `load_percentage` (NOT SET)
  - ✅ `rest_seconds` = rest between sets (USED - from exercise.rest_seconds, but represents rest AFTER both exercises)

### Special Tables:

- **NONE**

---

## 3. GIANT SET

### workout_blocks:

- ✅ `block_type` = 'giant_set' (USED)
- ✅ `total_sets` = number of sets (USED - from exercise.sets or giantEx.sets)
- ✅ `rest_seconds` = rest AFTER completing all exercises (USED - from exercise.rest_seconds)
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `reps_per_set` (NOT SET)
- ❌ `duration_seconds` (NOT SET)
- ❌ `block_parameters` (NOT SET for giant_set)

### workout_block_exercises (N rows, one per exercise):

- Each exercise:
  - ✅ `block_id` (USED)
  - ✅ `exercise_id` (USED - from exercise.giant_set_exercises[].exercise_id)
  - ✅ `exercise_order` = 1, 2, 3, ... (USED - sequential from loop index j + 1)
  - ❌ `exercise_letter` (NOT SET in save logic)
  - ✅ `sets` = number of sets (USED - from giantEx.sets || exercise.sets)
  - ✅ `reps` = reps for this exercise (USED - from giantEx.reps || exercise.reps)
  - ❌ `weight_kg` (NOT SET in save logic)
  - ❌ `rir` (NOT SET)
  - ❌ `tempo` (NOT SET)
  - ❌ `notes` (NOT SET)
  - ❌ `load_percentage` (NOT SET)
  - ✅ `rest_seconds` = rest after set (USED - from exercise.rest_seconds, but represents rest AFTER all exercises)

### Special Tables:

- **NONE**

---

## 4. DROP SET

### workout_blocks:

- ✅ `block_type` = 'drop_set' (USED)
- ✅ `total_sets` = number of sets (USED - from exercise.sets)
- ✅ `reps_per_set` = base reps (USED - from exercise.reps)
- ✅ `rest_seconds` = rest AFTER completing all drops (USED - from exercise.rest_seconds)
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `duration_seconds` (NOT SET)
- ❌ `block_parameters` (NOT SET - drop_percentage and drop_set_reps removed from block_parameters)

### workout_drop_sets (N rows, one per drop):

- ✅ `block_id` (USED)
- ✅ `exercise_id` (USED)
- ✅ `exercise_order` = 1 (USED)
- ✅ `drop_order` = 1 (USED - currently only creates first drop)
- ✅ `weight_kg` = weight for this drop (USED - calculated: initialWeight \* (1 - dropPercentage/100))
- ✅ `reps` = reps for this drop (USED - from exercise.drop_set_reps || exercise.reps || "8-10")
- ✅ `rest_seconds` = 0 (USED - hardcoded to 0)

---

## 5. CLUSTER SET

### workout_blocks:

- ✅ `block_type` = 'cluster_set' (USED)
- ✅ `total_sets` = number of sets (USED - from exercise.sets)
- ✅ `rest_seconds` = rest AFTER completing all clusters (USED - from exercise.rest_seconds)
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `reps_per_set` (NOT SET)
- ❌ `duration_seconds` (NOT SET)
- ❌ `block_parameters` (NOT SET for cluster_set)

### workout_cluster_sets (1 row):

- ✅ `block_id` (USED)
- ✅ `exercise_id` (USED)
- ✅ `exercise_order` = 1 (USED)
- ✅ `reps_per_cluster` = reps in each cluster (USED - from exercise.cluster_reps || exercise.reps || "10")
- ✅ `clusters_per_set` = number of clusters per set (USED - from exercise.clusters_per_set || 3)
- ✅ `intra_cluster_rest` = rest between clusters (USED - from exercise.intra_cluster_rest || 15)
- ✅ `inter_set_rest` = rest AFTER completing all clusters (USED - from exercise.rest_seconds || 120)

---

## 6. REST-PAUSE

### workout_blocks:

- ✅ `block_type` = 'rest_pause' (USED)
- ✅ `total_sets` = number of sets (USED - from exercise.sets)
- ❌ `rest_seconds` (NOT SET in workout_blocks for rest_pause)
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `reps_per_set` (NOT SET)
- ❌ `duration_seconds` (NOT SET)
- ❌ `block_parameters` (NOT SET for rest_pause)

### workout_rest_pause_sets (1 row):

- ✅ `block_id` (USED)
- ✅ `exercise_id` (USED)
- ✅ `exercise_order` = 1 (USED)
- ✅ `initial_weight_kg` = initial weight (USED - from exercise.weight_kg || 0)
- ✅ `initial_reps` = initial reps (USED - from exercise.reps || 10)
- ✅ `rest_pause_duration` = duration of rest-pause (USED - from exercise.rest_pause_duration || 15)
- ✅ `max_rest_pauses` = maximum number of rest-pause attempts (USED - from exercise.max_rest_pauses || 3)

---

## 7. PYRAMID SET

### workout_blocks:

- ✅ `block_type` = 'pyramid_set' (USED)
- ✅ `total_sets` = number of sets (USED - from exercise.sets || 3)
- ✅ `reps_per_set` = base reps (USED - from exercise.reps)
- ✅ `rest_seconds` = rest between pyramid steps (USED - from exercise.rest_seconds || 60)
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `duration_seconds` (NOT SET)
- ❌ `block_parameters` (NOT SET for pyramid_set)

### workout_pyramid_sets (N rows, one per pyramid step):

- ✅ `block_id` (USED)
- ✅ `exercise_id` (USED)
- ✅ `exercise_order` = 1 (USED)
- ✅ `pyramid_order` = 1, 2, 3, ... (USED - step number, calculated as Math.ceil(totalSets / 2))
- ✅ `weight_kg` = weight for this step (USED - calculated: baseWeight + (step - 1) \* 5)
- ✅ `reps` = reps for this step (USED - from exercise.reps || "10")
- ✅ `rest_seconds` = rest after this step (USED - from exercise.rest_seconds || 60)

---

## 8. LADDER SET

### workout_blocks:

- ✅ `block_type` = 'ladder' (USED)
- ✅ `total_sets` = number of ladder steps (USED - from exercise.sets || 5)
- ✅ `rest_seconds` = rest between ladder steps (USED - from exercise.rest_seconds || 60)
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `reps_per_set` (NOT SET)
- ❌ `duration_seconds` (NOT SET)
- ❌ `block_parameters` (NOT SET for ladder)

### workout_ladder_sets (N rows, one per ladder step):

- ✅ `block_id` (USED)
- ✅ `exercise_id` (USED)
- ✅ `exercise_order` = 1 (USED)
- ✅ `ladder_order` = 1, 2, 3, ... (USED - step number, from loop)
- ✅ `weight_kg` = weight for this step (USED - from exercise.weight_kg || 0)
- ✅ `reps` = reps for this step (USED - ascending: step number itself, 1, 2, 3, ...)
- ✅ `rest_seconds` = rest after this step (USED - from exercise.rest_seconds || 60)

---

## 9. PRE-EXHAUSTION

### workout_blocks:

- ✅ `block_type` = 'pre_exhaustion' (USED)
- ✅ `total_sets` = number of sets (USED - from exercise.sets)
- ❌ `rest_seconds` (NOT SET in workout_blocks for pre_exhaustion)
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `reps_per_set` (NOT SET)
- ❌ `duration_seconds` (NOT SET)
- ❌ `block_parameters` (NOT SET for pre_exhaustion)

### workout_block_exercises (2 rows):

- **Exercise 1 (Isolation):**

  - ✅ `block_id` (USED)
  - ✅ `exercise_id` = isolation exercise (USED - from exercise.exercise_id)
  - ✅ `exercise_order` = 1 (USED)
  - ✅ `sets` = number of sets (USED - from exercise.sets)
  - ✅ `reps` = isolation reps (USED - from exercise.isolation_reps)
  - ❌ `weight_kg` (NOT SET in save logic)
  - ❌ `rir` (NOT SET)
  - ❌ `tempo` (NOT SET)
  - ❌ `notes` (NOT SET)
  - ❌ `load_percentage` (NOT SET)
  - ❌ `rest_seconds` (NOT SET - performed back-to-back with compound)

- **Exercise 2 (Compound):**
  - ✅ `block_id` (USED)
  - ✅ `exercise_id` = compound exercise (USED - from exercise.compound_exercise_id)
  - ✅ `exercise_order` = 2 (USED)
  - ✅ `sets` = number of sets (USED - from exercise.sets)
  - ✅ `reps` = compound reps (USED - from exercise.compound_reps)
  - ❌ `weight_kg` (NOT SET in save logic)
  - ❌ `rir` (NOT SET)
  - ❌ `tempo` (NOT SET)
  - ❌ `notes` (NOT SET)
  - ❌ `load_percentage` (NOT SET)
  - ❌ `rest_seconds` (NOT SET - performed back-to-back after isolation)

### Special Tables:

- **NONE**

---

## 10. AMRAP

### workout_blocks:

- ✅ `block_type` = 'amrap' (USED)
- ✅ `duration_seconds` = duration in seconds (USED - from exercise.amrap_duration \* 60)
- ❌ `rest_seconds` (NOT SET in workout_blocks for amrap)
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `total_sets` (NOT SET)
- ❌ `reps_per_set` (NOT SET)
- ❌ `block_parameters` (NOT SET - amrap_duration and target_reps removed from block_parameters)

### workout_time_protocols (1 row):

- ✅ `block_id` (USED)
- ✅ `exercise_id` (USED)
- ✅ `exercise_order` = 1 (USED)
- ✅ `protocol_type` = 'amrap' (USED)
- ✅ `total_duration_minutes` = duration in minutes (USED - from exercise.amrap_duration || 10)
- ⚠️ `target_reps` = target reps (OPTIONAL - from exercise.target_reps)
- ❌ `work_seconds` (NOT SET for amrap)
- ❌ `rest_seconds` (NOT SET for amrap)
- ❌ `rounds` (NOT SET for amrap)
- ❌ `time_cap_minutes` (NOT SET for amrap)
- ❌ `reps_per_round` (NOT SET for amrap)
- ❌ `set` (NOT SET for amrap)

---

## 11. EMOM

### workout_blocks:

- ✅ `block_type` = 'emom' (USED)
- ✅ `duration_seconds` = duration in seconds (USED - from exercise.emom_duration \* 60)
- ❌ `rest_seconds` (NOT SET in workout_blocks for emom)
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `total_sets` (NOT SET)
- ❌ `reps_per_set` (NOT SET)
- ❌ `block_parameters` (NOT SET - emom_duration, emom_reps, work_seconds, rest_after removed from block_parameters)

### workout_time_protocols (1 row):

- ✅ `block_id` (USED)
- ✅ `exercise_id` (USED)
- ✅ `exercise_order` = 1 (USED)
- ✅ `protocol_type` = 'emom' (USED)
- ✅ `total_duration_minutes` = duration in minutes (USED - from exercise.emom_duration || 10)
- ✅ `work_seconds` = work interval (USED - from exercise.work_seconds || 30)
- ✅ `rest_seconds` = rest after work (USED - from exercise.rest_after || 30)
- ⚠️ `reps_per_round` = reps per minute/round (OPTIONAL - from exercise.emom_reps)
- ❌ `target_reps` (NOT SET for emom)
- ❌ `rounds` (NOT SET for emom)
- ❌ `time_cap_minutes` (NOT SET for emom)
- ❌ `set` (NOT SET for emom)

---

## 12. FOR TIME

### workout_blocks:

- ✅ `block_type` = 'for_time' (USED)
- ❌ `duration_seconds` (NOT SET for for_time)
- ❌ `rest_seconds` (NOT SET in workout_blocks for for_time)
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `total_sets` (NOT SET)
- ❌ `reps_per_set` (NOT SET)
- ❌ `block_parameters` (NOT SET - time_cap and target_reps removed from block_parameters)

### workout_time_protocols (1 row):

- ✅ `block_id` (USED)
- ✅ `exercise_id` (USED)
- ✅ `exercise_order` = 1 (USED)
- ✅ `protocol_type` = 'for_time' (USED)
- ⚠️ `time_cap_minutes` = time cap in minutes (OPTIONAL - from exercise.time_cap)
- ⚠️ `target_reps` = target reps (OPTIONAL - from exercise.target_reps)
- ❌ `total_duration_minutes` (NOT SET for for_time)
- ❌ `work_seconds` (NOT SET for for_time)
- ❌ `rest_seconds` (NOT SET for for_time)
- ❌ `rounds` (NOT SET for for_time)
- ❌ `reps_per_round` (NOT SET for for_time)
- ❌ `set` (NOT SET for for_time)

---

## 13. TABATA

### workout_blocks:

- ✅ `block_type` = 'tabata' (USED)
- ✅ `total_sets` = number of sets (USED - from setsArray.length)
- ❌ `rest_seconds` (NOT SET in workout_blocks for tabata)
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `reps_per_set` (NOT SET)
- ❌ `duration_seconds` (NOT SET)
- ❌ `block_parameters` (NOT SET - tabata data removed from block_parameters)

### workout_time_protocols (N rows, one per exercise):

- Each exercise:
  - ✅ `block_id` (USED)
  - ✅ `exercise_id` (USED - from setEx.exercise_id)
  - ✅ `exercise_order` = 1, 2, 3, ... (USED - matches exercise order)
  - ✅ `protocol_type` = 'tabata' (USED)
  - ✅ `work_seconds` = work time (USED - from exercise.work_seconds || 20)
  - ✅ `rest_seconds` = rest time after this exercise (USED - typically 10s for tabata)
  - ⚠️ `rest_after_set` = rest time after completing all exercises in the set (OPTIONAL - from set.rest_between_sets || tabataRestAfter)
  - ✅ `rounds` = rounds per set (USED - from exercise.rounds || 8)
  - ✅ `set` = set number (USED - setIdx + 1, 1-indexed)
  - ❌ `total_duration_minutes` (NOT SET for tabata)
  - ❌ `target_reps` (NOT SET for tabata)
  - ❌ `time_cap_minutes` (NOT SET for tabata)
  - ❌ `reps_per_round` (NOT SET for tabata)

---

## 14. CIRCUIT

### workout_blocks:

- ✅ `block_type` = 'circuit' (USED)
- ✅ `total_sets` = number of rounds (USED - from setsArray.length)
- ⚠️ `rest_seconds` = rest between rounds (OPTIONAL - from circuitProtocol.rest_seconds || block.rest_seconds || "60")
- ⚠️ `block_name` (OPTIONAL - from exercise.block_name || exercise.notes)
- ⚠️ `block_notes` (OPTIONAL - from exercise.notes)
- ❌ `reps_per_set` (NOT SET)
- ❌ `duration_seconds` (NOT SET)
- ❌ `block_parameters` (NOT SET - circuit data removed from block_parameters)

### workout_time_protocols (N rows, one per exercise):

- Each exercise:
  - ✅ `block_id` (USED)
  - ✅ `exercise_id` (USED - from setEx.exercise_id)
  - ✅ `exercise_order` = 1, 2, 3, ... (USED - matches exercise order)
  - ✅ `protocol_type` = 'circuit' (USED)
  - ⚠️ `work_seconds` = work time for this exercise (OPTIONAL - from setEx.work_seconds || exercise.work_seconds)
  - ⚠️ `rest_seconds` = rest time after this exercise (OPTIONAL - from setEx.rest_after)
  - ⚠️ `rest_after_set` = rest time after completing all exercises in the set (OPTIONAL - from set.rest_between_sets)
  - ✅ `set` = set number (USED - setIdx + 1, 1-indexed)
  - ❌ `rounds` (NOT SET for circuit - rounds = total_sets in workout_blocks)
  - ❌ `total_duration_minutes` (NOT SET for circuit)
  - ❌ `target_reps` (NOT SET for circuit)
  - ❌ `time_cap_minutes` (NOT SET for circuit)
  - ❌ `reps_per_round` (NOT SET for circuit)

---

## KEY NOTES:

1. **rest_seconds in workout_blocks**: Always means rest AFTER completing the set/block (not between exercises within the set)

2. **rest_seconds in workout_block_exercises**:

   - For single-exercise blocks: rest between sets
   - For multi-exercise blocks (superset, giant_set, pre_exhaustion): Usually NOT SET (exercises performed back-to-back)

3. **rest_seconds in workout_time_protocols**:

   - For all time-based blocks: rest AFTER this exercise (per exercise)
   - For CIRCUIT: from setEx.rest_after (rest after each exercise)
   - For TABATA: typically 10s (short rest between exercises)
   - For other time-based blocks (AMRAP, EMOM, FOR_TIME): rest after work period

4. **rest_after_set in workout_time_protocols** (CIRCUIT/TABATA only):

   - Rest AFTER completing all exercises in the set (same value for all exercises in the same set)
   - For CIRCUIT: from set.rest_between_sets
   - For TABATA: from set.rest_between_sets || tabataRestAfter
   - Stored per exercise in the set (redundant but easier to query)

5. **Special tables link via**: `block_id` + `exercise_id` + `exercise_order` (NOT `block_exercise_id`)

6. **Time-based blocks**: Store time parameters in `workout_time_protocols`, one row per exercise

7. **Sets/Rounds**:
   - `workout_blocks.total_sets` = number of sets/rounds
   - For Tabata/Circuit: `workout_time_protocols.set` = which set the exercise belongs to

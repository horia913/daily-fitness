# Complete Field Reference for All Block Types

This document lists every field available in the workout template creation form for each block type, including their database storage locations.

## Common Block-Level Fields (All Block Types)

These fields apply to the entire block and are available for all block types:

- **Block Name** (`block_name`) - Optional text field for naming the block
  - **Database:** `workout_blocks.block_name` (TEXT)
- **Block Notes** (`block_notes`) - Optional textarea for block-level notes/instructions
  - **Database:** `workout_blocks.block_notes` (TEXT)
- **Total Sets** (`total_sets`) - Number of sets/rounds for the block (used differently per block type)
  - **Database:** `workout_blocks.total_sets` (INTEGER)
- **Rest Seconds** (`rest_seconds`) - Rest time in seconds (meaning varies by block type)
  - For `straight_set`: Rest between sets
  - For `superset`, `giant_set`, `pre_exhaustion`: Rest after completing all exercises in the set
  - For `cluster_set`, `drop_set`: Rest after completing the set
  - For `amrap`, `emom`: Duration stored in `duration_seconds` instead
  - For `tabata`: Block-level `rest_after_set` (applies to all sets, stored in `workout_time_protocols`)
  - For `for_time`, `rest_pause`: Not used at block level
  - **Database:** `workout_blocks.rest_seconds` (INTEGER)
- **Duration Seconds** (`duration_seconds`) - Total duration in seconds (for `amrap` and `emom` only)
  - **Database:** `workout_blocks.duration_seconds` (INTEGER)

## Load % vs Weight Toggle

**Important:** Most block types support a toggle between **Load %** and **Weight** fields:

- **Load %** is the **default/main field** (displayed automatically)
- **Toggle switches** between Load % and Weight (small switch button, mobile-first design)
- When **Load % is active** → populates `load_percentage` column, `weight_kg` is cleared
- When **Weight is active** → populates `weight_kg` column, `load_percentage` is cleared
- Only one field is visible/active at a time based on toggle state
- The toggle state is per exercise (for blocks with multiple exercises, each has its own toggle)
- **UI-only preference** (not persisted to database)
- Each block type shows **only one** Load %/Weight toggle (common field handles it for simple blocks)

---

## 1. STRAIGHT SET (`straight_set`)

### Exercise-Level Fields:

- **Exercise ID** (`exercise_id`) - Required, select exercise
  - **Database:** `workout_block_exercises.exercise_id` (UUID, FK to `exercises.id`)
- **Sets** (`sets`) - Number of sets
  - **Database:** `workout_block_exercises.sets` (INTEGER)
- **Reps** (`reps`) - Rep range (e.g., "10-12")
  - **Database:** `workout_block_exercises.reps` (TEXT)
- **Rest Seconds** (`rest_seconds`) - Rest between sets (individual per exercise)
  - **Database:** `workout_block_exercises.rest_seconds` (INTEGER)
- **RIR** (`rir`) - Reps in Reserve (0-5)
  - **Database:** `workout_block_exercises.rir` (INTEGER)
- **Tempo** (`tempo`) - Tempo notation (e.g., "2-0-1-0")
  - **Database:** `workout_block_exercises.tempo` (TEXT)
- **Load % / Weight Toggle** - Single toggle (shown once as common field):
  - **Load Percentage** (`load_percentage`) - Default, % of 1RM
    - **Database:** `workout_block_exercises.load_percentage` (NUMERIC)
  - **Weight (kg)** (`weight_kg`) - Specific weight in kg
    - **Database:** `workout_block_exercises.weight_kg` (NUMERIC)
- **Notes** (`notes`) - Optional exercise notes
  - **Database:** `workout_block_exercises.notes` (TEXT)

---

## 2. SUPERSET (`superset`)

**Database Hierarchy:** `workout_blocks` → `workout_block_exercises` (EACH exercise is a separate row)

### Block-Level Fields:

- **Rest After Set** (`rest_seconds`) - Rest after completing both exercises in the superset
  - **Database:** `workout_blocks.rest_seconds` (INTEGER)

### Exercise-Level Fields:

**IMPORTANT:** Each exercise in a superset has its OWN entry in `workout_block_exercises`. Use `exercise_letter` (A, B) to identify exercises within a block. Blocks use `exercise_order` (1, 2, 3, ...) and exercises use `exercise_letter` (A, B, C, ...).

#### First Exercise (`exercise_letter = "A"`):

- **Exercise ID** (`exercise_id`) - Required, first exercise
  - **Database:** `workout_block_exercises.exercise_id` (UUID, FK to `exercises.id`)
  - **Database:** `workout_block_exercises.exercise_letter` = "A"
- **Sets** (`sets`) - Number of supersets
  - **Database:** `workout_block_exercises.sets` (INTEGER)
- **Reps** (`reps`) - Reps for first exercise
  - **Database:** `workout_block_exercises.reps` (TEXT)
- **Load % / Weight Toggle** - Toggle between:
  - **Load Percentage** (`load_percentage`) - Default, % of 1RM
    - **Database:** `workout_block_exercises.load_percentage` (NUMERIC)
  - **Weight (kg)** (`weight_kg`) - Specific weight in kg
    - **Database:** `workout_block_exercises.weight_kg` (NUMERIC)
- **RIR** (`rir`) - Reps in Reserve
  - **Database:** `workout_block_exercises.rir` (INTEGER)
- **Tempo** (`tempo`) - Tempo notation
  - **Database:** `workout_block_exercises.tempo` (TEXT)
- **Notes** (`notes`) - Notes
  - **Database:** `workout_block_exercises.notes` (TEXT)

#### Second Exercise (`exercise_letter = "B"`):

- **Exercise ID** (`superset_exercise_id`) - Required, second exercise
  - **Database:** `workout_block_exercises.exercise_id` (UUID, FK to `exercises.id`)
  - **Database:** `workout_block_exercises.exercise_letter` = "B"
- **Sets** (`sets`) - Number of supersets (same as first exercise)
  - **Database:** `workout_block_exercises.sets` (INTEGER)
- **Reps** (`superset_reps`) - Reps for second exercise
  - **Database:** `workout_block_exercises.reps` (TEXT) - **SAME COLUMN as first exercise**
- **Load % / Weight Toggle** - Toggle between:
  - **Load Percentage** (`superset_load_percentage`) - Default, % of 1RM
    - **Database:** `workout_block_exercises.load_percentage` (NUMERIC) - **SAME COLUMN as first exercise**
  - **Weight (kg)** (`superset_weight_kg`) - Specific weight in kg
    - **Database:** `workout_block_exercises.weight_kg` (NUMERIC) - **SAME COLUMN as first exercise**
- **RIR** (`rir`) - Reps in Reserve (optional for second exercise)
  - **Database:** `workout_block_exercises.rir` (INTEGER)
- **Tempo** (`tempo`) - Tempo notation (optional for second exercise)
  - **Database:** `workout_block_exercises.tempo` (TEXT)
- **Notes** (`notes`) - Notes (optional for second exercise)
  - **Database:** `workout_block_exercises.notes` (TEXT)

**Note:** No rest between exercises in a superset - they're done back-to-back. Both exercises use the SAME columns (`reps`, `load_percentage`, `weight_kg`, `tempo`, `rir`, `notes`) but are stored as SEPARATE rows identified by `exercise_letter`.

---

## 3. GIANT SET (`giant_set`)

### Block-Level Fields:

- **Rest After Set** (`rest_seconds`) - Rest after completing all exercises in the giant set
  - **Database:** `workout_blocks.rest_seconds` (INTEGER)

### Exercise-Level Fields:

- **Sets** (`sets`) - Number of giant sets
  - **Database:** `workout_block_exercises.sets` (INTEGER, same for all exercises in the giant set)

### Per-Exercise Fields (Multiple exercises in array):

**IMPORTANT:** Each exercise in a giant set has its OWN entry in `workout_block_exercises`. Use `exercise_letter` (A, B, C, D) to identify exercises within a block.

For each exercise in the giant set (3-4 exercises, stored as separate rows with `exercise_letter`):

- **Exercise ID** (`exercise_id`) - Required
  - **Database:** `workout_block_exercises.exercise_id` (UUID, FK to `exercises.id`)
  - **Database:** `workout_block_exercises.exercise_letter` = "A", "B", "C", "D", etc.
- **Sets** (`sets`) - Number of giant sets (same for all exercises)
  - **Database:** `workout_block_exercises.sets` (INTEGER)
- **Reps** (`reps`) - Rep range for this exercise
  - **Database:** `workout_block_exercises.reps` (TEXT)
- **Load % / Weight Toggle** (per exercise) - Toggle between:
  - **Load Percentage** (`load_percentage`) - Default, % of 1RM
    - **Database:** `workout_block_exercises.load_percentage` (NUMERIC)
  - **Weight (kg)** (`weight_kg`) - Specific weight in kg
    - **Database:** `workout_block_exercises.weight_kg` (NUMERIC)
- **Tempo** (`tempo`) - Tempo notation (per exercise)
  - **Database:** `workout_block_exercises.tempo` (TEXT)
- **RIR** (`rir`) - Reps in Reserve (per exercise)
  - **Database:** `workout_block_exercises.rir` (INTEGER)
- **Notes** (`notes`) - Notes (per exercise)
  - **Database:** `workout_block_exercises.notes` (TEXT)

**Note:** Exercises are performed consecutively with no rest between them. Each exercise is stored as a SEPARATE row in `workout_block_exercises` identified by `exercise_letter`.

---

## 4. DROP SET (`drop_set`)

**Database Hierarchy:** `workout_blocks` → `workout_drop_sets` (NO `workout_block_exercises` for this block type)

### Block-Level Fields:

- **Rest After Set** (`rest_seconds`) - Rest after completing the drop set
  - **Database:** `workout_blocks.rest_seconds` (INTEGER)

### Exercise-Level Fields (Stored in `workout_drop_sets`):

- **Exercise ID** (`exercise_id`) - Required
  - **Database:** `workout_drop_sets.exercise_id` (UUID, FK to `exercises.id`)
- **Sets** (`sets`) - Number of drop sets
  - **Database:** `workout_blocks.total_sets` (INTEGER)
- **Main Reps** (`reps`) - Reps for initial/main set
  - **Database:** `workout_blocks.reps_per_set` (TEXT)
- **Drop Reps** (`drop_set_reps`) - Reps for drop set
  - **Database:** `workout_drop_sets.reps` (INTEGER)
- **Weight Drop %** (`drop_percentage`) - Percentage to reduce weight (e.g., 20 = 20% reduction)
  - **Database:** `workout_drop_sets.drop_percentage` (INTEGER)
  - **Note:** This is the percentage reduction stored directly (e.g., 20 means 20% reduction). Only the initial weight/load_percentage is stored. Drop weight is calculated during live workout: `drop_weight = initial_weight * (1 - drop_percentage / 100)`
- **Drop Order** (`drop_order`) - Order of the drop (1st drop, 2nd drop, etc.)
  - **Database:** `workout_drop_sets.drop_order` (INTEGER)
- **Load % / Weight Toggle** - Single toggle (shown once as common field):
  - **Load Percentage** (`load_percentage`) - Default, % of 1RM for initial set
    - **Database:** `workout_drop_sets.load_percentage` (NUMERIC)
    - **Note:** Only stores INITIAL load percentage. Drop weight is calculated based on client's actual weight during live workout.
  - **Weight (kg)** (`weight_kg`) - Specific initial weight in kg
    - **Database:** `workout_drop_sets.weight_kg` (NUMERIC)
    - **Note:** Only stores INITIAL weight. Drop weight is calculated during live workout using `drop_percentage`.

**Note:** Only initial weight/load_percentage and drop_percentage are stored. Drop weight is NOT stored because it varies based on each client's performance during the live workout and is calculated on-the-fly for UI convenience.

---

## 5. CLUSTER SET (`cluster_set`)

**Database Hierarchy:** `workout_blocks` → `workout_cluster_sets` (NO `workout_block_exercises` for this block type)

### Block-Level Fields:

- **Rest After Set** (`rest_seconds`) - Rest after completing the cluster set (Inter-Set Rest)
  - **Database:** `workout_blocks.rest_seconds` (INTEGER)

### Exercise-Level Fields (Stored in `workout_cluster_sets`):

- **Exercise ID** (`exercise_id`) - Required
  - **Database:** `workout_cluster_sets.exercise_id` (UUID, FK to `exercises.id`)
- **Sets** (`sets`) - Number of cluster sets
  - **Database:** `workout_blocks.total_sets` (INTEGER)
- **Reps per Cluster** (`cluster_reps` / `reps_per_cluster`) - Reps in each mini-set
  - **Database:** `workout_cluster_sets.reps_per_cluster` (INTEGER)
- **Clusters per Set** (`clusters_per_set`) - Number of mini-sets within one set
  - **Database:** `workout_cluster_sets.clusters_per_set` (INTEGER)
- **Intra-Cluster Rest** (`intra_cluster_rest`) - Rest between mini-sets (seconds)
  - **Database:** `workout_cluster_sets.intra_cluster_rest` (INTEGER)
- **Inter-Set Rest** - Stored in block-level `rest_seconds`
  - **Database:** `workout_blocks.rest_seconds` (INTEGER)
- **Load % / Weight Toggle** - Single toggle (shown once as common field):
  - **Load Percentage** (`load_percentage`) - Default, % of 1RM
    - **Database:** `workout_cluster_sets.load_percentage` (NUMERIC)
  - **Weight (kg)** (`weight_kg`) - Specific weight in kg
    - **Database:** `workout_cluster_sets.weight_kg` (NUMERIC)

---

## 6. REST-PAUSE (`rest_pause`)

**Database Hierarchy:** `workout_blocks` → `workout_rest_pause_sets` (NO `workout_block_exercises` for this block type)

### Exercise-Level Fields (Stored in `workout_rest_pause_sets`):

- **Exercise ID** (`exercise_id`) - Required
  - **Database:** `workout_rest_pause_sets.exercise_id` (UUID, FK to `exercises.id`)
- **Sets** (`sets`) - Number of rest-pause sets
  - **Database:** `workout_blocks.total_sets` (INTEGER)
- **Initial Reps** (`reps` / `reps_per_set`) - Reps for initial set
  - **Database:** `workout_blocks.reps_per_set` (INTEGER)
- **Rest-Pause Duration** (`rest_pause_duration`) - Rest time between pauses (seconds)
  - **Database:** `workout_rest_pause_sets.rest_pause_duration` (INTEGER)
- **Max Pauses** (`max_rest_pauses`) - Maximum number of rest-pause cycles
  - **Database:** `workout_rest_pause_sets.max_rest_pauses` (INTEGER)
- **Load % / Weight Toggle** - Single toggle (shown once as common field):
  - **Load Percentage** (`load_percentage`) - Default, % of 1RM for initial set
    - **Database:** `workout_rest_pause_sets.load_percentage` (NUMERIC)
  - **Weight (kg)** (`weight_kg`) - Specific weight for initial set
    - **Database:** `workout_rest_pause_sets.weight_kg` (NUMERIC)

---

## 7. PRE-EXHAUSTION (`pre_exhaustion`)

**Database Hierarchy:** `workout_blocks` → `workout_block_exercises` (EACH exercise is a separate row)

### Block-Level Fields:

- **Rest After Set** (`rest_seconds`) - Rest after completing both exercises
  - **Database:** `workout_blocks.rest_seconds` (INTEGER)

### Exercise-Level Fields:

**IMPORTANT:** Each exercise in pre-exhaustion has its OWN entry in `workout_block_exercises`. Use `exercise_letter` (A, B) to identify exercises within a block.

#### Isolation Exercise (First, `exercise_letter = "A"`):

- **Isolation Exercise ID** (`exercise_id`) - Required, isolation exercise
  - **Database:** `workout_block_exercises.exercise_id` (UUID, FK to `exercises.id`)
  - **Database:** `workout_block_exercises.exercise_letter` = "A"
- **Sets** (`sets`) - Number of pre-exhaustion sets
  - **Database:** `workout_block_exercises.sets` (INTEGER)
- **Reps** (`isolation_reps`) - Reps for isolation exercise
  - **Database:** `workout_block_exercises.reps` (TEXT) - **SAME COLUMN as compound exercise**
- **Load % / Weight Toggle** - Toggle between:
  - **Load Percentage** (`load_percentage`) - Default, % of 1RM
    - **Database:** `workout_block_exercises.load_percentage` (NUMERIC) - **SAME COLUMN as compound exercise**
  - **Weight (kg)** (`weight_kg`) - Specific weight in kg
    - **Database:** `workout_block_exercises.weight_kg` (NUMERIC) - **SAME COLUMN as compound exercise**
- **Tempo** (`tempo`) - Tempo notation
  - **Database:** `workout_block_exercises.tempo` (TEXT)
- **RIR** (`rir`) - Reps in Reserve
  - **Database:** `workout_block_exercises.rir` (INTEGER)
- **Notes** (`notes`) - Notes
  - **Database:** `workout_block_exercises.notes` (TEXT)

#### Compound Exercise (Second, `exercise_letter = "B"`):

- **Compound Exercise ID** (`compound_exercise_id`) - Required, compound exercise
  - **Database:** `workout_block_exercises.exercise_id` (UUID, FK to `exercises.id`)
  - **Database:** `workout_block_exercises.exercise_letter` = "B"
- **Sets** (`sets`) - Number of pre-exhaustion sets (same as isolation exercise)
  - **Database:** `workout_block_exercises.sets` (INTEGER)
- **Reps** (`compound_reps`) - Reps for compound exercise
  - **Database:** `workout_block_exercises.reps` (TEXT) - **SAME COLUMN as isolation exercise**
- **Load % / Weight Toggle** - Toggle between:
  - **Load Percentage** (`compound_load_percentage`) - Default, % of 1RM
    - **Database:** `workout_block_exercises.load_percentage` (NUMERIC) - **SAME COLUMN as isolation exercise**
  - **Weight (kg)** (`compound_weight_kg`) - Specific weight in kg
    - **Database:** `workout_block_exercises.weight_kg` (NUMERIC) - **SAME COLUMN as isolation exercise**
- **Tempo** (`tempo`) - Tempo notation
  - **Database:** `workout_block_exercises.tempo` (TEXT)
- **RIR** (`rir`) - Reps in Reserve
  - **Database:** `workout_block_exercises.rir` (INTEGER)
- **Notes** (`notes`) - Notes
  - **Database:** `workout_block_exercises.notes` (TEXT)

**Note:** Only 2 exercises: isolation (letter A) and compound (letter B). Both exercises use the SAME columns (`reps`, `load_percentage`, `weight_kg`, `tempo`, `rir`, `notes`) but are stored as SEPARATE rows identified by `exercise_letter`.

---

## 8. AMRAP (`amrap`)

**Database Hierarchy:** `workout_blocks` → `workout_time_protocols` (NO `workout_block_exercises` for this block type)

### Block-Level Fields:

- **Duration** (`duration_seconds`) - Total duration in seconds (converted from minutes)
  - **Database:** `workout_blocks.duration_seconds` (INTEGER)

### Exercise-Level Fields (Stored in `workout_time_protocols`):

- **Exercise ID** (`exercise_id`) - Required
  - **Database:** `workout_time_protocols.exercise_id` (UUID, FK to `exercises.id`)
- **Duration (minutes)** (`amrap_duration`) - Total time for AMRAP
  - **Database:** `workout_time_protocols.total_duration_minutes` (INTEGER)
- **Target Reps** (`target_reps`) - Optional, target rep count
  - **Database:** `workout_time_protocols.target_reps` (INTEGER)
- **Load % / Weight Toggle** - Single toggle (shown once as common field):
  - **Load Percentage** (`load_percentage`) - Default, % of 1RM
    - **Database:** `workout_time_protocols.load_percentage` (NUMERIC)
  - **Weight (kg)** (`weight_kg`) - Specific weight in kg
    - **Database:** `workout_time_protocols.weight_kg` (NUMERIC)

**Note:** Stored in `workout_time_protocols` table with `protocol_type = 'amrap'`.

---

## 9. EMOM (`emom`)

**Database Hierarchy:** `workout_blocks` → `workout_time_protocols` (NO `workout_block_exercises` for this block type)

### Block-Level Fields:

- **Duration** (`duration_seconds`) - Total duration in seconds (converted from minutes)
  - **Database:** `workout_blocks.duration_seconds` (INTEGER)

### Exercise-Level Fields (Stored in `workout_time_protocols`):

- **Exercise ID** (`exercise_id`) - Required
  - **Database:** `workout_time_protocols.exercise_id` (UUID, FK to `exercises.id`)
- **EMOM Mode** (`emom_mode`) - Required, either:
  - `"time_based"` - Work for X seconds, rest the remainder
  - `"rep_based"` - Complete X reps, rest the remainder
  - **Database:** `workout_time_protocols.emom_mode` (TEXT)
- **Total Duration (minutes)** (`emom_duration`) - Total time for EMOM
  - **Database:** `workout_time_protocols.total_duration_minutes` (INTEGER)
- **Work Duration (seconds)** (`work_seconds`) - Required if `time_based`, work interval length
  - **Database:** `workout_time_protocols.work_seconds` (INTEGER)
- **Reps per Minute** (`emom_reps` / `reps_per_round`) - Required if `rep_based`, target reps per minute
  - **Database:** `workout_time_protocols.reps_per_round` (INTEGER)
- **Rest Interval** (`rest_seconds` / `rest_after`) - Rest after work interval (calculated or set)
  - **Database:** `workout_time_protocols.rest_seconds` (INTEGER)
- **Load % / Weight Toggle** - Single toggle (shown once as common field):
  - **Load Percentage** (`load_percentage`) - Default, % of 1RM
    - **Database:** `workout_time_protocols.load_percentage` (NUMERIC)
  - **Weight (kg)** (`weight_kg`) - Specific weight in kg
    - **Database:** `workout_time_protocols.weight_kg` (NUMERIC)

**Note:** Stored in `workout_time_protocols` table with `protocol_type = 'emom'`.

---

## 10. TABATA (`tabata`)

**Database Hierarchy:** `workout_blocks` → `workout_time_protocols` (NO `workout_block_exercises` for this block type)

### Block-Level Fields:

- **Rounds** (`total_sets`) - Number of rounds (typically 6-8)
  - **Database:** `workout_blocks.total_sets` (INTEGER)
- **Rest After Set** (`rest_after_set`) - Rest after completing all exercises in a set (block-level, applies to all sets)
  - **Database:** `workout_time_protocols.rest_after_set` (INTEGER, same for all sets)

### Exercise-Level Fields (Per Exercise in Each Set, Stored in `workout_time_protocols`):

Tabata uses a nested structure: `tabata_sets` array, where each set contains multiple exercises.

**Per Set:**

- **No per-set "Rest After Set"** - The block-level `rest_after_set` applies to all sets (no individual per-set field)

**Per Exercise in Set:**

- **Exercise ID** (`exercise_id`) - Required
  - **Database:** `workout_time_protocols.exercise_id` (UUID, FK to `exercises.id`)
- **Work (seconds)** (`work_seconds`) - Work interval (individual per exercise)
  - **Database:** `workout_time_protocols.work_seconds` (INTEGER)
- **Rest (seconds)** (`rest_seconds` / `rest_after`) - Rest after this exercise (individual per exercise)
  - **Database:** `workout_time_protocols.rest_seconds` (INTEGER)
- **Set Number** (`set`) - Which set/round this exercise belongs to
  - **Database:** `workout_time_protocols.set` (INTEGER, 1-indexed)
- **Rounds** (`rounds`) - Number of rounds for this exercise
  - **Database:** `workout_time_protocols.rounds` (INTEGER)

**Note:**

- Stored in `workout_time_protocols` table with `protocol_type = 'tabata'`
- Each exercise in each set has its own time protocol entry
- `rest_after_set` is block-level (applies to all sets) and stored once in time_protocols
- **Load % is NOT used for Tabata** (removed from this block type)

---

## 11. FOR TIME (`for_time`)

**Database Hierarchy:** `workout_blocks` → `workout_time_protocols` (NO `workout_block_exercises` for this block type)

### Exercise-Level Fields (Stored in `workout_time_protocols`):

- **Exercise ID** (`exercise_id`) - Required
  - **Database:** `workout_time_protocols.exercise_id` (UUID, FK to `exercises.id`)
- **Target Reps** (`target_reps`) - Optional, target rep count
  - **Database:** `workout_time_protocols.target_reps` (INTEGER)
- **Time Cap (minutes)** (`time_cap` / `time_cap_minutes`) - Optional, maximum time to complete
  - **Database:** `workout_time_protocols.time_cap_minutes` (INTEGER)
- **Load % / Weight Toggle** - Single toggle (shown once as common field):
  - **Load Percentage** (`load_percentage`) - Default, % of 1RM
    - **Database:** `workout_time_protocols.load_percentage` (NUMERIC)
  - **Weight (kg)** (`weight_kg`) - Specific weight in kg
    - **Database:** `workout_time_protocols.weight_kg` (NUMERIC)

**Note:** Stored in `workout_time_protocols` table with `protocol_type = 'for_time'`.

---

## Field Storage Summary

### Database Hierarchy

**CRITICAL:** Follow this hierarchy when working with workout-related data:

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

### Stored in `workout_blocks` table (ALL block types):

- `block_name` (optional, TEXT)
- `block_notes` (optional, TEXT)
- `total_sets` (sets/rounds count, INTEGER)
- `rest_seconds` (block-level rest, INTEGER)
- `duration_seconds` (for amrap/emom, INTEGER)
- `reps_per_set` (for some block types, TEXT)

### Stored in `workout_block_exercises` table (ONLY for `straight_set`, `superset`, `giant_set`, `pre_exhaustion`):

- `exercise_id` (UUID, FK to `exercises.id`)
- `exercise_order` (INTEGER)
- `exercise_letter` (TEXT, for superset/giant_set)
- `sets` (INTEGER)
- `reps` (TEXT)
- `weight_kg` (NUMERIC)
- `load_percentage` (NUMERIC)
- `rir` (INTEGER)
- `tempo` (TEXT)
- `rest_seconds` (INTEGER, exercise-level rest)
- `notes` (TEXT)
- `superset_reps` (TEXT, for superset second exercise)
- `superset_load_percentage` (NUMERIC, for superset second exercise)
- `compound_reps` (TEXT, for pre-exhaustion compound exercise)
- `compound_load_percentage` (NUMERIC, for pre-exhaustion compound exercise)

### Stored in `workout_drop_sets` table (ONLY for `drop_set`):

- `exercise_id` (UUID, FK to `exercises.id`)
- `exercise_order` (INTEGER)
- `drop_order` (INTEGER)
- `weight_kg` (NUMERIC)
- `load_percentage` (NUMERIC)
- `reps` (INTEGER)

### Stored in `workout_cluster_sets` table (ONLY for `cluster_set`):

- `exercise_id` (UUID, FK to `exercises.id`)
- `exercise_order` (INTEGER)
- `reps_per_cluster` (INTEGER)
- `clusters_per_set` (INTEGER)
- `intra_cluster_rest` (INTEGER)
- `inter_set_rest` (INTEGER)
- `weight_kg` (NUMERIC)
- `load_percentage` (NUMERIC)

### Stored in `workout_rest_pause_sets` table (ONLY for `rest_pause`):

- `exercise_id` (UUID, FK to `exercises.id`)
- `exercise_order` (INTEGER)
- `weight_kg` (NUMERIC)
- `load_percentage` (NUMERIC)
- `rest_pause_duration` (INTEGER)
- `max_rest_pauses` (INTEGER)

### Stored in `workout_time_protocols` table (ONLY for `amrap`, `emom`, `for_time`, `tabata`, `circuit`):

- `exercise_id` (UUID, FK to `exercises.id`)
- `exercise_order` (INTEGER, 1-indexed order within block)
- `protocol_type` (TEXT: 'amrap', 'emom', 'for_time', 'tabata', 'circuit')
- `total_duration_minutes` (INTEGER, for amrap/emom)
- `work_seconds` (INTEGER, for emom/tabata)
- `rest_seconds` (INTEGER, for emom/tabata)
- `rest_after_set` (INTEGER, for tabata, block-level)
- `rounds` (INTEGER, for tabata)
- `reps_per_round` (INTEGER, for emom rep-based)
- `emom_mode` (TEXT, for emom)
- `target_reps` (INTEGER, for amrap/for_time)
- `time_cap_minutes` (INTEGER, for for_time)
- `set` (INTEGER, which set/round for tabata)
- `weight_kg` (NUMERIC)
- `load_percentage` (NUMERIC)

---

## Notes on Field Usage

1. **Load % / Weight Toggle**: Available for:

   - `straight_set` - Single toggle (common field)
   - `superset` - Per exercise (first and second, separate toggles)
   - `giant_set` - Per exercise (3-4 exercises, separate toggles)
   - `drop_set` - Single toggle (common field)
   - `cluster_set` - Single toggle (common field)
   - `rest_pause` - Single toggle (common field)
   - `pre_exhaustion` - Per exercise (isolation and compound, separate toggles)
   - `amrap` - Single toggle (common field)
   - `emom` - Single toggle (common field)
   - `for_time` - Single toggle (common field)
   - **NOT available for**: `tabata`

2. **Load % is Default**: The toggle defaults to Load % mode each time (UI-only preference, not persisted). When toggled to Weight, the field switches to weight_kg input.

3. **Toggle Behavior**:

   - Each block type shows **only one** Load %/Weight toggle (no duplicates)
   - For simple blocks (`straight_set`, `drop_set`, `cluster_set`, `rest_pause`, `amrap`, `emom`, `for_time`): Common field handles the toggle
   - For complex blocks (`superset`, `giant_set`, `pre_exhaustion`): Each exercise has its own toggle
   - When toggling from Load % to Weight: clears `load_percentage`, shows `weight_kg` input
   - When toggling from Weight to Load %: clears `weight_kg`, shows `load_percentage` input
   - Only one value is stored at a time (the active field)

4. **Storage**:

   - When Load % is active → saves to `load_percentage` column, clears `weight_kg`
   - When Weight is active → saves to `weight_kg` column, clears `load_percentage`
   - Only one value is stored at a time (not both)

5. **Rest Seconds**: Meaning varies:

   - Exercise-level: Rest after that specific exercise
   - Block-level: Rest after completing the entire set/block

6. **Sets vs Rounds**:

   - `total_sets` in `workout_blocks` represents:
     - Sets for most block types
     - Rounds for `tabata`

7. **Time Protocols**: For `tabata`, each exercise in each set has its own time protocol entry with individual `work_seconds` and `rest_seconds`.

8. **Individual vs Block-Level Rest**:

   - `tabata`: Individual `rest_seconds` per exercise + block-level `rest_after_set` (applies to all sets, no per-set field)
   - `superset`/`giant_set`/`pre_exhaustion`: No rest between exercises, only block-level rest after set
   - `straight_set`: Exercise-level rest between sets

9. **Deprecated Block Types**: The following block types have been completely removed from the app:
   - `pyramid_set` - Removed
   - `ladder` - Removed
   - `circuit` - Removed
   - All related tables, code, and UI elements should be deleted

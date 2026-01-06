# Block Type Analysis - Current State vs Required State

## Database Tables Available:

- `workout_blocks` - Main block table (block_id, block_type, etc.)
- `workout_block_exercises` - Exercises within blocks (block_exercise_id, exercise_id, etc.)
- `workout_cluster_sets` - Links via `block_exercise_id`
- `workout_rest_pause_sets` - Links via `block_exercise_id`
- `workout_drop_sets` - Links via `block_exercise_id`
- `workout_pyramid_sets` - Links via `block_exercise_id`
- `workout_ladder_sets` - Links via `block_exercise_id`
- `workout_time_protocols` - Links via `block_id` (NOT block_exercise_id)

---

## 1. STRAIGHT_SET

### Currently Using:

- `workout_blocks` - stores block_type, total_sets, reps_per_set, rest_seconds
- `workout_block_exercises` - stores exercise_id, sets, reps, rest_seconds, tempo, rir, notes
- `block_parameters` JSON - NOT used for straight_set

### Should Use:

- `workout_blocks` - stores block_type, total_sets, reps_per_set, rest_seconds
- `workout_block_exercises` - stores exercise_id, sets, reps, rest_seconds, tempo, rir, notes
- No special tables needed

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="straight_set"
2. Adds exercise to `workout_block_exercises` with sets, reps, rest_seconds, tempo, rir, notes
3. Does NOT call any special table creation methods

### Status: ✅ CORRECT (no changes needed)

---

## 2. SUPERSET

### Currently Using:

- `workout_blocks` - stores block_type, total_sets, reps_per_set, rest_seconds
- `workout_block_exercises` - stores TWO exercises (exercise_order 1 and 2), each with sets, reps, rest_seconds
- `block_parameters` JSON - NOT used for superset

### Should Use:

- `workout_blocks` - stores block_type, total_sets, rest_seconds (rest between pairs)
- `workout_block_exercises` - stores TWO exercises (exercise_order 1 and 2), each with sets, reps
- No special tables needed (rest_between_pairs is stored in block.rest_seconds)

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="superset"
2. Adds first exercise to `workout_block_exercises` (exercise_order=1)
3. Adds second exercise to `workout_block_exercises` (exercise_order=2)
4. Both exercises get the same rest_seconds (which should be rest between pairs)
5. Does NOT call any special table creation methods

### Status: ✅ CORRECT (no changes needed)

---

## 3. GIANT_SET

### Currently Using:

- `workout_blocks` - stores block_type, total_sets, reps_per_set, rest_seconds
- `workout_block_exercises` - stores MULTIPLE exercises (from giant_set_exercises array), each with sets, reps, rest_seconds
- `block_parameters` JSON - NOT used for giant_set

### Should Use:

- `workout_blocks` - stores block_type, total_sets, rest_seconds (rest between sets)
- `workout_block_exercises` - stores MULTIPLE exercises, each with sets, reps
- No special tables needed

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="giant_set"
2. Loops through `exercise.giant_set_exercises` array
3. Adds each exercise to `workout_block_exercises` with exercise_order incrementing
4. All exercises get the same rest_seconds (which should be rest between sets)
5. Does NOT call any special table creation methods

### Status: ✅ CORRECT (no changes needed)

---

## 4. PRE_EXHAUSTION

### Currently Using:

- `workout_blocks` - stores block_type, total_sets, reps_per_set, rest_seconds
- `workout_block_exercises` - stores TWO exercises:
  - Exercise 1: isolation exercise (exercise_order=1, reps=isolation_reps)
  - Exercise 2: compound exercise (exercise_order=2, reps=compound_reps)
- `block_parameters` JSON - NOT used for pre_exhaustion

### Should Use:

- `workout_blocks` - stores block_type, total_sets, rest_seconds
- `workout_block_exercises` - stores TWO exercises (isolation and compound)
- No special tables needed

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="pre_exhaustion"
2. Adds isolation exercise to `workout_block_exercises` (exercise_order=1, reps=isolation_reps)
3. Adds compound exercise to `workout_block_exercises` (exercise_order=2, reps=compound_reps)
4. Does NOT call any special table creation methods

### Status: ✅ CORRECT (no changes needed)

---

## 5. CLUSTER_SET

### Currently Using:

- `workout_blocks` - stores block_type, total_sets, reps_per_set, rest_seconds
- `workout_block_exercises` - stores exercise with sets, reps, rest_seconds
- `block_parameters` JSON - NOT used (but could have cluster data)
- `workout_cluster_sets` - **CODE EXISTS BUT IS CALLED** (lines 804-829)

### Should Use:

- `workout_blocks` - stores block_type, total_sets, rest_seconds (inter_set_rest)
- `workout_block_exercises` - stores exercise
- `workout_cluster_sets` - stores: reps_per_cluster, clusters_per_set, intra_cluster_rest, inter_set_rest (linked via block_exercise_id)

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="cluster_set"
2. Adds exercise to `workout_block_exercises` and gets mainExerciseId
3. **CALLS `WorkoutBlockService.createClusterSet()`** with:
   - block_exercise_id: mainExerciseId
   - reps_per_cluster: from exercise.cluster_reps or exercise.reps
   - clusters_per_set: from exercise.clusters_per_set
   - intra_cluster_rest: from exercise.intra_cluster_rest
   - inter_set_rest: from exercise.rest_seconds or block.rest_seconds

### Status: ✅ CORRECT (already implemented in my recent changes)

---

## 6. REST_PAUSE

### Currently Using:

- `workout_blocks` - stores block_type, total_sets, reps_per_set, rest_seconds
- `workout_block_exercises` - stores exercise with sets, reps, rest_seconds
- `block_parameters` JSON - NOT used (but could have rest_pause data)
- `workout_rest_pause_sets` - **CODE EXISTS BUT IS CALLED** (lines 832-856)

### Should Use:

- `workout_blocks` - stores block_type, total_sets, rest_seconds (rest between sets)
- `workout_block_exercises` - stores exercise
- `workout_rest_pause_sets` - stores: initial_weight_kg, initial_reps, rest_pause_duration, max_rest_pauses (linked via block_exercise_id)

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="rest_pause"
2. Adds exercise to `workout_block_exercises` and gets mainExerciseId
3. **CALLS `WorkoutBlockService.createRestPauseSet()`** with:
   - block_exercise_id: mainExerciseId
   - initial_weight_kg: from exercise.weight_kg
   - initial_reps: from exercise.reps
   - rest_pause_duration: from exercise.rest_pause_duration
   - max_rest_pauses: from exercise.max_rest_pauses

### Status: ✅ CORRECT (already implemented in my recent changes)

---

## 7. DROP_SET

### Currently Using:

- `workout_blocks` - stores block_type, total_sets, reps_per_set, rest_seconds
- `workout_block_exercises` - stores exercise with sets, reps, rest_seconds
- `block_parameters` JSON - stores drop_percentage, drop_set_reps
- `workout_drop_sets` - **CODE EXISTS BUT IS NOT CALLED** (lines 858-869)

### Should Use:

- `workout_blocks` - stores block_type, total_sets, rest_seconds
- `workout_block_exercises` - stores exercise
- `workout_drop_sets` - stores: drop_order, weight_kg, reps, rest_seconds (linked via block_exercise_id)

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="drop_set"
2. Adds exercise to `workout_block_exercises` and gets mainExerciseId
3. Saves drop_percentage and drop_set_reps to `block_parameters` JSON
4. **DOES NOT CALL `WorkoutBlockService.createDropSet()`**
5. Comment says "For now, save to block_parameters (this might need adjustment)"

### Status: ❌ INCORRECT - Should call createDropSet() but doesn't

---

## 8. PYRAMID_SET

### Currently Using:

- `workout_blocks` - stores block_type, total_sets, reps_per_set, rest_seconds
- `workout_block_exercises` - stores exercise
- `block_parameters` JSON - likely stores pyramid steps
- `workout_pyramid_sets` - **CODE EXISTS BUT IS NOT CALLED**

### Should Use:

- `workout_blocks` - stores block_type
- `workout_block_exercises` - stores exercise
- `workout_pyramid_sets` - stores: pyramid_order, weight_kg, reps, rest_seconds (linked via block_exercise_id) - ONE ROW PER PYRAMID STEP

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="pyramid_set"
2. Adds exercise to `workout_block_exercises`
3. **DOES NOT CALL `WorkoutBlockService.createPyramidSet()`**
4. Likely saves pyramid steps to `block_parameters` JSON

### Status: ❌ INCORRECT - Should call createPyramidSet() for each pyramid step but doesn't

---

## 9. LADDER

### Currently Using:

- `workout_blocks` - stores block_type, total_sets, reps_per_set, rest_seconds
- `workout_block_exercises` - stores exercise
- `block_parameters` JSON - likely stores ladder steps
- `workout_ladder_sets` - **CODE EXISTS BUT IS NOT CALLED**

### Should Use:

- `workout_blocks` - stores block_type
- `workout_block_exercises` - stores exercise
- `workout_ladder_sets` - stores: ladder_order, weight_kg, reps, rest_seconds (linked via block_exercise_id) - ONE ROW PER LADDER STEP

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="ladder"
2. Adds exercise to `workout_block_exercises`
3. **DOES NOT CALL `WorkoutBlockService.createLadderSet()`**
4. Likely saves ladder steps to `block_parameters` JSON

### Status: ❌ INCORRECT - Should call createLadderSet() for each ladder step but doesn't

---

## 10. AMRAP

### Currently Using:

- `workout_blocks` - stores block_type, duration_seconds, block_parameters (amrap_duration, target_reps)
- `workout_block_exercises` - stores exercise(s)
- `workout_time_protocols` - **CODE EXISTS AND IS CALLED** (lines 996-1013)

### Should Use:

- `workout_blocks` - stores block_type, duration_seconds
- `workout_block_exercises` - stores exercise(s)
- `workout_time_protocols` - stores: protocol_type="amrap", total_duration_minutes, target_reps (linked via block_id)

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="amrap", duration_seconds from amrap_duration
2. Adds exercise to `workout_block_exercises`
3. **CALLS `WorkoutBlockService.createTimeProtocol()`** with:
   - block_id: block.id
   - protocol_type: "amrap"
   - total_duration_minutes: from exercise.amrap_duration
   - target_reps: from exercise.target_reps

### Status: ❌ INCORRECT - Should NOT save to block_parameters, ONLY to workout_time_protocols

---

## 11. EMOM

### Currently Using:

- `workout_blocks` - stores block_type, duration_seconds, **block_parameters JSON (emom_duration, emom_reps, work_seconds, rest_after)** ❌
- `workout_block_exercises` - stores exercise(s)
- `workout_time_protocols` - **CODE EXISTS AND IS CALLED** (lines 1014-1034) ✅

### Should Use:

- `workout_blocks` - stores block_type, duration_seconds (NO block_parameters)
- `workout_block_exercises` - stores exercise(s)
- `workout_time_protocols` - stores: protocol_type="emom", total_duration_minutes, work_seconds, rest_seconds (linked via block_id) - **ONLY SOURCE**

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="emom", duration_seconds from emom_duration
2. **SAVES emom_duration, emom_reps, work_seconds, rest_after to block_parameters JSON** (lines 642-645, 636-639) ❌
3. Adds exercise to `workout_block_exercises`
4. **CALLS `WorkoutBlockService.createTimeProtocol()`** with:
   - block_id: block.id
   - protocol_type: "emom"
   - total_duration_minutes: from exercise.emom_duration
   - work_seconds: from exercise.work_seconds
   - rest_seconds: from exercise.rest_after

### Status: ❌ INCORRECT - Should NOT save to block_parameters, ONLY to workout_time_protocols

---

## 12. FOR_TIME

### Currently Using:

- `workout_blocks` - stores block_type, **block_parameters JSON (time_cap, target_reps)** ❌
- `workout_block_exercises` - stores exercise(s)
- `workout_time_protocols` - **CODE EXISTS AND IS CALLED** (lines 1035-1055) ✅

### Should Use:

- `workout_blocks` - stores block_type (NO block_parameters)
- `workout_block_exercises` - stores exercise(s)
- `workout_time_protocols` - stores: protocol_type="for_time", total_duration_minutes (time_cap), target_reps (linked via block_id) - **ONLY SOURCE**

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="for_time"
2. **SAVES time_cap and target_reps to block_parameters JSON** (lines 648-649, 646-647) ❌
3. Adds exercise to `workout_block_exercises`
4. **CALLS `WorkoutBlockService.createTimeProtocol()`** with:
   - block_id: block.id
   - protocol_type: "for_time"
   - total_duration_minutes: from exercise.time_cap
   - target_reps: from exercise.target_reps

### Status: ❌ INCORRECT - Should NOT save to block_parameters, ONLY to workout_time_protocols

---

## 13. CIRCUIT

### Currently Using:

- `workout_blocks` - stores block_type, block_parameters (circuit_sets array with exercises and rest_between_sets)
- `workout_block_exercises` - stores MULTIPLE exercises (one per exercise in circuit_sets), each with sets, reps, rest_seconds
- `workout_time_protocols` - **CODE EXISTS AND IS CALLED** (lines 962-965) - **BUT ONLY ONE RECORD PER BLOCK**

### Should Use:

- `workout_blocks` - stores block_type
- `workout_block_exercises` - stores MULTIPLE exercises (one per exercise in circuit)
- `workout_time_protocols` - stores: protocol_type="circuit", work_seconds, rounds, rest_after_round_seconds **SEPARATELY FOR EACH EXERCISE** (linked via ???)

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="circuit"
2. Loops through `exercise.circuit_sets` array
3. For each set in circuit_sets, loops through exercises in that set
4. Adds each exercise to `workout_block_exercises` with:
   - sets, reps from setEx or exercise
   - rest_seconds from setEx.rest_after or set.rest_between_sets or exercise.rest_seconds
5. **CALLS `WorkoutBlockService.createTimeProtocol()` ONCE** with:
   - block_id: block.id
   - protocol_type: "circuit"
   - work_seconds: from exercise.work_seconds
   - rounds: from setsArray.length
6. Saves circuit_sets array to `block_parameters` JSON

### Status: ❌ INCORRECT - Creates only ONE time_protocol record per block, but should create ONE PER EXERCISE

**PROBLEM**: `workout_time_protocols` only has `block_id`, not `block_exercise_id`. To store separate data per exercise, we need either:

- Add `block_exercise_id` column to `workout_time_protocols`, OR
- Create multiple time_protocol records with different data, but how to link them to exercises?

---

## 14. TABATA

### Currently Using:

- `workout_blocks` - stores block_type, block_parameters (tabata_sets array, rest_after, work_seconds, rounds)
- `workout_block_exercises` - stores MULTIPLE exercises (one per exercise in tabata_sets), each with sets, reps, rest_seconds (all get same rest_after)
- `workout_time_protocols` - **CODE EXISTS AND IS CALLED** (lines 956-961) - **BUT ONLY ONE RECORD PER BLOCK**

### Should Use:

- `workout_blocks` - stores block_type
- `workout_block_exercises` - stores MULTIPLE exercises (one per exercise in tabata)
- `workout_time_protocols` - stores: protocol_type="tabata", work_seconds, rest_seconds, rounds, reps_per_round **SEPARATELY FOR EACH EXERCISE** (linked via ???)

### Current Form Behavior:

1. Creates block in `workout_blocks` with block_type="tabata"
2. Loops through `exercise.tabata_sets` array
3. For each set in tabata_sets, loops through exercises in that set
4. Adds each exercise to `workout_block_exercises` with:
   - sets, reps from setEx or exercise
   - rest_seconds: ALL get the same tabataRestAfter value (consistent for tabata)
5. **CALLS `WorkoutBlockService.createTimeProtocol()` ONCE** with:
   - block_id: block.id
   - protocol_type: "tabata"
   - work_seconds: from exercise.work_seconds (default 20)
   - rest_seconds: from tabataRestAfter (default 10)
   - rounds: from exercise.rounds (default 8)
6. Saves tabata_sets array, rest_after, work_seconds, rounds to `block_parameters` JSON

### Status: ❌ INCORRECT - Creates only ONE time_protocol record per block, but should create ONE PER EXERCISE

**PROBLEM**: Same as circuit - `workout_time_protocols` only has `block_id`, not `block_exercise_id`. To store separate data per exercise, we need either:

- Add `block_exercise_id` column to `workout_time_protocols`, OR
- Create multiple time_protocol records with different data, but how to link them to exercises?

---

## SUMMARY OF ISSUES:

1. **AMRAP**: Saves to BOTH block_parameters JSON AND workout_time_protocols - should ONLY use workout_time_protocols
2. **EMOM**: Saves to BOTH block_parameters JSON AND workout_time_protocols - should ONLY use workout_time_protocols
3. **FOR_TIME**: Saves to BOTH block_parameters JSON AND workout_time_protocols - should ONLY use workout_time_protocols
4. **DROP_SET**: Code exists but is NOT called - should call createDropSet() instead of saving to block_parameters
5. **PYRAMID_SET**: Code exists but is NOT called - should call createPyramidSet() for each step instead of saving to block_parameters
6. **LADDER**: Code exists but is NOT called - should call createLadderSet() for each step instead of saving to block_parameters
7. **CIRCUIT**: Creates only ONE time_protocol per block, but needs ONE PER EXERCISE - **NEEDS `block_exercise_id` column?**
8. **TABATA**: Creates only ONE time_protocol per block, but needs ONE PER EXERCISE - **NEEDS `block_exercise_id` column?**

# Display Mismatches - Workout Details Page

## Current vs Expected Display

### 1. SUPERSET

#### Block Header - Currently Displaying:
- ❌ "Rest between pairs" (if `params.rest_between_pairs` exists)
- ✅ Should show: "Rest after set" from `workout_blocks.rest_seconds`

#### Exercise Card - Currently Displaying:
- ✅ Sets: `exercise.sets` or `block.rawBlock.total_sets`
- ✅ Reps: `exercise.reps` or `block.rawBlock.reps_per_set`
- ❌ Label: "Rest between sets" 
- ❌ Value: `block.rawBlock.rest_seconds`
- ✅ Should show: Label "Rest after set" (rest AFTER completing both exercises)

---

### 2. GIANT SET

#### Block Header - Currently Displaying:
- ❌ Nothing specific (no block parameters shown)
- ✅ Should show: "Rest after set" from `workout_blocks.rest_seconds`

#### Exercise Card - Currently Displaying:
- ✅ Sets: `exercise.sets` or `block.rawBlock.total_sets`
- ✅ Reps: `exercise.reps` or `block.rawBlock.reps_per_set`
- ❌ Label: "Rest between sets"
- ❌ Value: `block.rawBlock.rest_seconds`
- ✅ Should show: Label "Rest after set" (rest AFTER completing all exercises)

---

### 3. PRE-EXHAUSTION

#### Block Header - Currently Displaying:
- ❌ Label: "Rest between exercises"
- ❌ Value: `params.rest_between` or `block.rawBlock.rest_seconds`
- ✅ Should show: Label "Rest after set" (rest AFTER completing both exercises)

#### Exercise Card - Currently Displaying:
- ✅ Sets: `exercise.sets` or `block.rawBlock.total_sets`
- ✅ Reps: `exercise.reps` or `block.rawBlock.reps_per_set`
- ❌ Label: "Rest between sets"
- ❌ Value: `block.rawBlock.rest_seconds`
- ✅ Should show: Label "Rest after set" (rest AFTER completing both exercises)

---

### 4. DROP SET

#### Block Header - Currently Displaying:
- ✅ Weight reduction: Calculated from `dropSet.weight_kg` vs `firstExercise.weight_kg` OR `params.drop_percentage`
- ✅ Drop set reps: `dropSet.reps` OR `params.drop_set_reps`
- ❌ Missing: "Rest after set" from `workout_blocks.rest_seconds` (rest AFTER completing all drops)

#### Exercise Card - Currently Displaying:
- ✅ Sets: `exercise.sets` or `block.rawBlock.total_sets`
- ✅ Reps: `exercise.reps` or `block.rawBlock.reps_per_set`
- ✅ Rest: `exercise.restSeconds` or `block.rawBlock.rest_seconds`
- ⚠️ Note: This rest is AFTER completing all drops in the set (no rest between drops)

---

### 5. CLUSTER SET

#### Block Header - Currently Displaying:
- ✅ Clusters per set: `clusterSet.clusters_per_set` OR `params.clusters_per_set`
- ✅ Reps per cluster: `clusterSet.reps_per_cluster` OR `params.reps_per_cluster`
- ✅ Rest between clusters: `clusterSet.intra_cluster_rest` OR `params.intra_cluster_rest`
- ❌ Label: "Rest between sets" (should be "Rest after set")
- ✅ Value: `block.rawBlock.rest_seconds` (rest AFTER completing all clusters in the set)

#### Exercise Card - Currently Displaying:
- ✅ Sets: `exercise.sets` or `block.rawBlock.total_sets`
- ✅ Reps: `exercise.reps` or `block.rawBlock.reps_per_set`
- ✅ Rest: `exercise.restSeconds` or `block.rawBlock.rest_seconds` (rest AFTER completing all clusters)

---

### 6. REST-PAUSE

#### Block Header - Currently Displaying:
- ✅ Rest-pause duration: `restPauseSet.rest_pause_duration` OR `params.rest_pause_duration`
- ✅ Max rest-pauses: `restPauseSet.max_rest_pauses` OR `params.max_rest_pauses`
- ❌ Label: "Rest between sets" (should be "Rest after set")
- ✅ Value: `block.rawBlock.rest_seconds` (rest AFTER completing the rest-pause set)

#### Exercise Card - Currently Displaying:
- ✅ Sets: `exercise.sets` or `block.rawBlock.total_sets`
- ✅ Reps: `exercise.reps` or `block.rawBlock.reps_per_set`
- ✅ Rest: `exercise.restSeconds` or `block.rawBlock.rest_seconds` (rest AFTER completing the rest-pause set)

---

### 7. PYRAMID SET

#### Block Header - Currently Displaying:
- ❌ Nothing specific (no pyramid-specific data shown)
- ⚠️ Should show: Pyramid steps from `workout_pyramid_sets` (but this is not implemented)

#### Exercise Card - Currently Displaying:
- ✅ Sets: `exercise.sets` or `block.rawBlock.total_sets`
- ✅ Reps: `exercise.reps` or `block.rawBlock.reps_per_set`
- ✅ Rest: `exercise.restSeconds` or `block.rawBlock.rest_seconds`
- ⚠️ Missing: Individual pyramid step weights/reps from `workout_pyramid_sets`

---

### 8. LADDER SET

#### Block Header - Currently Displaying:
- ❌ Nothing specific (no ladder-specific data shown)
- ⚠️ Should show: Ladder steps from `workout_ladder_sets` (but this is not implemented)

#### Exercise Card - Currently Displaying:
- ✅ Sets: `exercise.sets` or `block.rawBlock.total_sets`
- ✅ Reps: `exercise.reps` or `block.rawBlock.reps_per_set`
- ✅ Rest: `exercise.restSeconds` or `block.rawBlock.rest_seconds`
- ⚠️ Missing: Individual ladder step reps from `workout_ladder_sets`

---

### 9. AMRAP

#### Block Header - Currently Displaying:
- ✅ Duration: `timeProtocol.total_duration_minutes` OR `params.amrap_duration` OR `block.rawBlock.duration_seconds / 60`
- ✅ Target reps: `timeProtocol.target_reps` OR `params.target_reps`

#### Exercise Card - Currently Displaying:
- ❌ Duration: Reads from `params.amrap_duration` OR `params.duration_minutes` OR `block.rawBlock.duration_seconds`
- ❌ Target reps: Reads from `params.target_reps`
- ✅ Should read from: `time_protocols` table (one per exercise) - `total_duration_minutes` and `target_reps`
- ⚠️ Issue: `getTimeBasedParameters()` reads from `block.parameters` instead of finding the exercise-specific `time_protocol`

---

### 10. EMOM

#### Block Header - Currently Displaying:
- ✅ Duration: `timeProtocol.total_duration_minutes` OR `params.emom_duration` OR `block.rawBlock.duration_seconds / 60`
- ✅ Work interval: `timeProtocol.work_seconds` OR `params.work_seconds`
- ✅ Reps per minute: `timeProtocol.reps_per_round` OR `params.emom_reps` (fallback)

#### Exercise Card - Currently Displaying:
- ❌ Duration: Reads from `params.emom_duration` OR `params.duration_minutes` OR `block.rawBlock.duration_seconds`
- ❌ Work interval: Reads from `params.work_seconds`
- ❌ Reps per minute: Reads from `params.emom_reps`
- ✅ Should read from: `time_protocols` table (one per exercise) - `total_duration_minutes`, `work_seconds`, `reps_per_round`
- ⚠️ Issue: `getTimeBasedParameters()` reads from `block.parameters` instead of finding the exercise-specific `time_protocol`

---

### 11. FOR TIME

#### Block Header - Currently Displaying:
- ✅ Time cap: `timeProtocol.time_cap_minutes` OR `timeProtocol.total_duration_minutes` OR `params.time_cap` OR `params.time_cap_minutes`
- ✅ Target reps: `timeProtocol.target_reps` OR `params.target_reps`

#### Exercise Card - Currently Displaying:
- ❌ Time cap: Reads from `params.time_cap` OR `params.time_cap_minutes`
- ❌ Target reps: Reads from `params.target_reps`
- ✅ Should read from: `time_protocols` table (one per exercise) - `time_cap_minutes` and `target_reps`
- ⚠️ Issue: `getTimeBasedParameters()` reads from `block.parameters` instead of finding the exercise-specific `time_protocol`

---

### 12. TABATA

#### Block Header - Currently Displaying:
- ✅ Rounds: `tabataProtocol.rounds` OR `params.rounds`
- ✅ Work interval: `tabataProtocol.work_seconds` OR `params.work_seconds`
- ✅ Rest after set: `tabataProtocol.rest_seconds` OR `params.rest_after` OR `params.rest_after_set`

#### Exercise Card - Currently Displaying:
- ✅ Work time: `exerciseProtocol.work_seconds` OR `params.work_seconds`
- ✅ Rest time: `exerciseProtocol.rest_seconds` OR `exercise.restSeconds` OR `params.rest_after` OR `params.rest_after_set` OR `tabataSets[0].rest_between_sets`
- ✅ Set: `exerciseProtocol.set` / `block.rawBlock.total_sets` (if multiple sets)
- ✅ Correctly reads from exercise-specific `time_protocol`

---

### 13. CIRCUIT

#### Block Header - Currently Displaying:
- ✅ Rounds: `circuitProtocol.rounds` OR `block.rawBlock.total_sets` OR `params.rounds` OR `circuitSets.length`
- ✅ Work interval: `circuitProtocol.work_seconds` OR `params.work_seconds` OR `firstCircuitSet.work_seconds`
- ✅ Rest after exercise: `allCircuitProtocols[0].rest_seconds` OR `params.rest_after_exercise` OR `params.rest_after_set` OR `params.rest_after` OR `firstCircuitSet.rest_between_sets`
- ✅ Rest between rounds: `circuitProtocol.rest_seconds` OR `params.rest_between_rounds` OR `params.rest_between_sets` OR `block.rawBlock.rest_seconds` OR `firstCircuitSet.rest_between_sets`
- ✅ Exercises in circuit: Count of exercises

#### Exercise Card - Currently Displaying:
- ✅ Work time: `exerciseProtocol.work_seconds` OR `params.work_seconds` OR `circuitSets[0].work_seconds`
- ✅ Rest time: `exerciseProtocol.rest_seconds` OR `exercise.restSeconds` OR `params.rest_after_exercise` OR `params.rest_after_set` OR `params.rest_after` OR `circuitSets[0].rest_between_sets`
- ✅ Set: `exerciseProtocol.set` / `block.rawBlock.total_sets` (if multiple sets)
- ✅ Correctly reads from exercise-specific `time_protocol`

---

## SUMMARY OF ISSUES

### Critical Issues (Data Source Wrong):

1. **AMRAP Exercise Card**: Reads from `block.parameters` instead of exercise-specific `time_protocols`
2. **EMOM Exercise Card**: Reads from `block.parameters` instead of exercise-specific `time_protocols`
3. **FOR TIME Exercise Card**: Reads from `block.parameters` instead of exercise-specific `time_protocols`

### Label Issues (Wrong Terminology):

1. **Superset Block Header**: Shows "Rest between pairs" instead of "Rest after set"
2. **Superset Exercise Card**: Label says "Rest between sets" instead of "Rest after set"
3. **Giant Set Block Header**: Missing "Rest after set" display
4. **Giant Set Exercise Card**: Label says "Rest between sets" instead of "Rest after set"
5. **Pre-Exhaustion Block Header**: Label says "Rest between exercises" instead of "Rest after set"
6. **Pre-Exhaustion Exercise Card**: Label says "Rest between sets" instead of "Rest after set"
7. **Cluster Set Block Header**: Label says "Rest between sets" instead of "Rest after set"
8. **Rest-Pause Block Header**: Label says "Rest between sets" instead of "Rest after set"
9. **Drop Set Block Header**: Missing "Rest after set" display

### Missing Features (Not Implemented):

1. **Pyramid Set**: Pyramid steps not displayed (data exists in `workout_pyramid_sets`)
2. **Ladder Set**: Ladder steps not displayed (data exists in `workout_ladder_sets`)

---

## FIXES NEEDED

### Priority 1: Fix Data Sources
- Update `getTimeBasedParameters()` to read from exercise-specific `time_protocols` for AMRAP, EMOM, FOR_TIME

### Priority 2: Fix Labels
- Change all "Rest between sets" to "Rest after set" for Superset, Giant Set, Pre-Exhaustion, Cluster Set, Rest-Pause
- Change "Rest between pairs" to "Rest after set" for Superset
- Change "Rest between exercises" to "Rest after set" for Pre-Exhaustion
- Add "Rest after set" to Drop Set block header

### Priority 3: Add Missing Features
- Display Pyramid Set steps (if needed)
- Display Ladder Set steps (if needed)


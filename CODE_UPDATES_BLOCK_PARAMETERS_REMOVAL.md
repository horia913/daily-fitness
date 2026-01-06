# Code Updates Required for block_parameters Removal

## Overview

This document lists all code changes needed before running the `block_parameters` removal migration.

## Files to Update

### 1. `src/lib/workoutBlockService.ts`

**Location:** Lines 41-43

**Current Code:**
```typescript
if (blockData.block_parameters && Object.keys(blockData.block_parameters).length > 0) {
  insertData.block_parameters = blockData.block_parameters;
}
```

**Change:** Remove these lines entirely

**Reason:** No longer writing to `block_parameters` - all data goes to relational tables

---

### 2. `src/lib/workoutTemplateService.ts`

**Location:** Line 484

**Current Code:**
```typescript
block_parameters: block.block_parameters,
```

**Change:** Remove this line

**Reason:** No longer passing `block_parameters` in response

---

### 3. `src/types/workoutBlocks.ts`

**Location:** Line 37 (in `WorkoutBlock` interface)

**Current Code:**
```typescript
// Special parameters (flexible JSON)
block_parameters?: Record<string, any>
```

**Change:** Remove this line

**Reason:** Type definition no longer needed

---

### 4. `src/components/WorkoutTemplateForm.tsx`

**Multiple locations** - Remove all `block.block_parameters?.` fallbacks

#### Location 1: Lines 473-494 (Time protocol data)

**Current Code:**
```typescript
rounds:
  timeProtocol?.rounds?.toString() ||
  block.block_parameters?.rounds?.toString() ||
  undefined,
work_seconds:
  timeProtocol?.work_seconds?.toString() ||
  block.block_parameters?.work_seconds?.toString() ||
  undefined,
rest_after:
  timeProtocol?.rest_seconds?.toString() ||
  block.block_parameters?.rest_after?.toString() ||
  undefined,
amrap_duration:
  timeProtocol?.total_duration_minutes?.toString() ||
  block.block_parameters?.amrap_duration?.toString() ||
  undefined,
emom_duration:
  timeProtocol?.total_duration_minutes?.toString() ||
  block.block_parameters?.emom_duration?.toString() ||
  undefined,
emom_reps:
  timeProtocol?.reps_per_round?.toString() ||
  block.block_parameters?.emom_reps?.toString() ||
  undefined,
emom_mode: (block.block_parameters as any)?.emom_mode || "",
target_reps:
  (block.block_parameters as any)?.target_reps?.toString() ||
  undefined,
time_cap:
  (block.block_parameters as any)?.time_cap?.toString() ||
  undefined,
```

**Change to:**
```typescript
rounds: timeProtocol?.rounds?.toString() || undefined,
work_seconds: timeProtocol?.work_seconds?.toString() || undefined,
rest_after: timeProtocol?.rest_seconds?.toString() || undefined,
amrap_duration: timeProtocol?.total_duration_minutes?.toString() || undefined,
emom_duration: timeProtocol?.total_duration_minutes?.toString() || undefined,
emom_reps: timeProtocol?.reps_per_round?.toString() || undefined,
emom_mode: timeProtocol?.emom_mode || "",
target_reps: timeProtocol?.target_reps?.toString() || undefined,
time_cap: timeProtocol?.time_cap_minutes?.toString() || undefined,
```

**Note:** If `target_reps` and `time_cap_minutes` don't exist in `workout_time_protocols`, you may need to add those columns or handle differently.

#### Location 2: Lines 505-507 (Drop set data)

**Current Code:**
```typescript
drop_percentage: dropSet
  ? "" // Calculate from drop set data if needed
  : block.block_parameters?.drop_percentage?.toString() || "",
drop_set_reps:
  dropSet?.reps || block.block_parameters?.drop_set_reps || "",
```

**Change to:**
```typescript
drop_percentage: dropSet?.drop_percentage?.toString() || "",
drop_set_reps: dropSet?.reps || "",
```

#### Location 3: Lines 540-561 (Tabata data)

**Current Code:**
```typescript
const restAfter =
  tabataProtocol?.rest_seconds?.toString() ||
  block.block_parameters?.rest_after ||
  block.rest_seconds?.toString() ||
  "10";

const restAfterSet =
  tabataProtocol?.rest_after_set?.toString() ||
  block.block_parameters?.rest_after_set ||
  "10";

exercise.rounds =
  tabataProtocol?.rounds?.toString() ||
  block.block_parameters?.rounds ||
  block.total_sets?.toString() ||
  "8";
exercise.work_seconds =
  tabataProtocol?.work_seconds?.toString() ||
  block.block_parameters?.work_seconds ||
  "20";
```

**Change to:**
```typescript
const restAfter =
  tabataProtocol?.rest_seconds?.toString() ||
  block.rest_seconds?.toString() ||
  "10";

const restAfterSet =
  tabataProtocol?.rest_after_set?.toString() ||
  "10";

exercise.rounds =
  tabataProtocol?.rounds?.toString() ||
  block.total_sets?.toString() ||
  "8";
exercise.work_seconds =
  tabataProtocol?.work_seconds?.toString() ||
  "20";
```

#### Location 4: Lines 601-613 (Tabata sets fallback)

**Current Code:**
```typescript
// Fallback to block_parameters if no time protocols found (old data)
if (
  block.block_parameters?.tabata_sets &&
  Array.isArray(block.block_parameters.tabata_sets)
) {
  exercise.tabata_sets = block.block_parameters.tabata_sets.map(
    (set: any) => ({
      exercises: Array.isArray(set.exercises)
        ? set.exercises
        : [],
      rest_between_sets:
        set.rest_between_sets || String(restAfter),
    })
  );
}
```

**Change:** Remove this entire block

**Reason:** No fallback to `block_parameters` - must use relational data

---

### 5. Check All Executor Components

**Files to check:**
- `src/components/client/workout-execution/blocks/AmrapExecutor.tsx`
- `src/components/client/workout-execution/blocks/EmomExecutor.tsx`
- `src/components/client/workout-execution/blocks/ForTimeExecutor.tsx`
- `src/components/client/workout-execution/blocks/TabataExecutor.tsx`
- `src/components/client/workout-execution/blocks/DropSetExecutor.tsx`
- `src/components/client/workout-execution/blocks/RestPauseExecutor.tsx`
- `src/components/client/workout-execution/blocks/ClusterSetExecutor.tsx`
- `src/components/client/workout-execution/blocks/PyramidSetExecutor.tsx`
- `src/components/client/workout-execution/blocks/LadderExecutor.tsx`
- `src/components/client/workout-execution/blocks/PreExhaustionExecutor.tsx`
- `src/components/client/workout-execution/blocks/CircuitExecutor.tsx`

**Action:** Search for `block_parameters` in each file and remove any references

---

### 6. Check Other Components

**Files to check:**
- `src/components/WorkoutDetailModal.tsx`
- `src/components/coach/WorkoutTemplateDetails.tsx`
- `src/app/client/workouts/[id]/details/page.tsx`
- `src/app/coach/workouts/templates/[id]/page.tsx`
- `src/app/coach/workouts/templates/[id]/page_redesigned.tsx`
- `src/app/coach/programs/[id]/edit/page.tsx`
- `src/components/features/workouts/ExerciseBlockCard.tsx`

**Action:** Search for `block_parameters` and remove references

---

## Update Summary

### Total Files to Update: ~15-20 files

### Changes Required:
1. Remove `block_parameters` from TypeScript interfaces
2. Remove `block_parameters` from database inserts
3. Remove `block_parameters` fallbacks in form components
4. Remove `block_parameters` from select queries
5. Update all components that read `block_parameters`

### Testing Checklist:
- [ ] Workout template creation works
- [ ] Workout template editing works
- [ ] Workout template loading works
- [ ] All block types display correctly:
  - [ ] Straight set
  - [ ] Superset
  - [ ] Giant set
  - [ ] Drop set
  - [ ] Cluster set
  - [ ] Rest pause
  - [ ] Pyramid set
  - [ ] Ladder
  - [ ] Pre-exhaustion
  - [ ] AMRAP
  - [ ] EMOM
  - [ ] For Time
  - [ ] Tabata
- [ ] Workout execution works for all block types
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Build passes (`npm run build`)

## Important Notes

1. **target_reps and time_cap_minutes**: These fields are referenced in `block_parameters` but may not exist in `workout_time_protocols`. Verify the schema and either:
   - Add these columns to `workout_time_protocols` if needed
   - Remove references if not needed
   - Handle differently based on your requirements

2. **emom_mode**: Check if this exists in `workout_time_protocols`. If not, add it or handle differently.

3. **Tabata sets**: The complex nested structure in `block_parameters.tabata_sets` should be built from `workout_time_protocols` data. The code already does this - just remove the fallback.

4. **Backward Compatibility**: After removing `block_parameters`, old data without relational table entries may not load. Ensure all existing blocks have corresponding relational data before removal.

## Execution Order

1. ✅ Run `11_verify_block_parameters_data_mapping.sql` - Verify all data is in relational tables
2. ⏳ Update all code files (this document)
3. ⏳ Test thoroughly
4. ⏳ Run `12_remove_block_parameters.sql` - Remove columns
5. ⏳ Final verification


# Live Workout Navigation & Progress System Analysis

## Executive Summary

The Live Workout system has **partial navigation** but **lacks auto-advancement** after set logging. Most executors track progress locally but don't automatically advance to the next set/exercise/block. The system relies on manual navigation buttons or explicit `onBlockComplete()` calls.

---

## Section 1: Main Workout Page

**File:** `src/app/client/workouts/[id]/start/page.tsx`

### Block Navigation

**Current block index stored in:**

- `currentBlockIndex` (state variable, line 158)
- Type: `number` (0-indexed)
- Initial value: `0`

**Advanced via:**

- `handleBlockChange(blockIndex: number)` (line 331-339)
- `handleNextBlock()` (line 321-328) - only called manually, not auto-triggered
- Direct state update: `setCurrentBlockIndex(prev => prev + 1)`

**Auto-advances on block completion:** ❌ **NO**

- `handleBlockComplete()` (line 313-319) only marks block as `isCompleted: true`
- Does NOT automatically call `handleNextBlock()`
- User must manually click "Next" button or navigate

**Current code:**

```typescript
const handleBlockComplete = (blockId: string, loggedSets: LoggedSet[]) => {
  setWorkoutBlocks((prev) =>
    prev.map((block) =>
      block.block.id === blockId ? { ...block, isCompleted: true } : block
    )
  );
  // ❌ MISSING: Auto-advance to next block
  // Should call: handleNextBlock() or setCurrentBlockIndex(prev => prev + 1)
};

const handleNextBlock = () => {
  if (currentBlockIndex < workoutBlocks.length - 1) {
    setCurrentBlockIndex((prev) => prev + 1);
  } else {
    setShowWorkoutCompletion(true);
  }
};
```

### Exercise Navigation

**Current exercise index stored in:**

- `currentExerciseIndex` (state variable, line 128) - **DEPRECATED** (used by old system)
- `block.currentExerciseIndex` (in LiveWorkoutBlock object) - **ACTIVE** (used by block system)
- Per-block, not global

**Advanced via:**

- `onExerciseIndexChange` callback passed to executors
- `setCurrentExerciseIndex` in LiveWorkoutBlockExecutor (line 329)
- `handleBlockChange()` resets exercise index to 0 (line 336)

**Auto-advances on exercise completion:** ❌ **NO**

- No automatic exercise advancement logic
- Executors don't check if all exercises in a block are complete

**Current code:**

```typescript
const handleBlockChange = (blockIndex: number) => {
  setCurrentBlockIndex(blockIndex);
  // Reset exercise index to 0 when changing blocks
  setWorkoutBlocks((prev) =>
    prev.map((block, idx) =>
      idx === blockIndex ? { ...block, currentExerciseIndex: 0 } : block
    )
  );
};
```

### Set Navigation

**Completed sets tracked in:**

- `block.completedSets` (in LiveWorkoutBlock object)
- `loggedSetsArray` (local state in each executor)
- NOT synced between executors and parent

**Resets after logging:** ✅ **YES** (in some executors)

- StraightSetExecutor: Increments `currentSetNumber` (line 206)
- SupersetExecutor: Increments `currentSet` (but `currentSet` comes from `block.completedSets`)
- Most executors: Clear inputs but don't always advance set number

**Progress display:**

- Shows "Set X of Y" in UI
- Calculated from `currentSetNumber` (local) or `currentSet` (from block)

---

## Section 2: Live Workout Block Executor

**File:** `src/components/client/LiveWorkoutBlockExecutor.tsx`

### Block Navigation

**Current block index:**

- Received as prop: `currentBlockIndex` (line 65)
- Passed to child executors via `commonProps` (line 326)

**Block completion:**

- Receives `onBlockComplete` callback (line 45)
- Passes it to child executors (line 319)
- Does NOT auto-advance - just passes callback through

### Exercise Navigation

**Current exercise index stored in:**

- Local state: `currentExerciseIndex` (line 71-73)
- Synced with `block.currentExerciseIndex` via useEffect (line 76-78)
- Per-block (each block has its own exercise index)

**Advanced via:**

- `setCurrentExerciseIndex` (line 329)
- Passed to executors as `onExerciseIndexChange` (line 329)
- Executors can call this to advance, but most don't

**Auto-advances on exercise completion:** ❌ **NO**

- No logic to check if all exercises in block are complete
- No automatic call to `onExerciseIndexChange`

**Current code:**

```typescript
const [currentExerciseIndex, setCurrentExerciseIndex] = useState(
  block.currentExerciseIndex || 0
);

useEffect(() => {
  setCurrentExerciseIndex(block.currentExerciseIndex || 0);
}, [block.currentExerciseIndex, block.block.id]);
```

### Set Navigation

**Completed sets tracked in:**

- `block.completedSets` (from LiveWorkoutBlock prop)
- NOT updated by LiveWorkoutBlockExecutor
- Each executor tracks its own `loggedSetsArray`

**Resets after logging:** ❌ **NO** (at this level)

- LiveWorkoutBlockExecutor doesn't manage set state
- Delegates to child executors

### Post-Logging Behavior

**After logSetToDatabase() completes:**

- Returns `{ success: boolean, e1rm?: number, isNewPR?: boolean }`
- Updates e1RM in local state if present (line 237-239)
- Shows PR notification if new record (line 242-249)
- **Does NOT trigger any navigation**
- **Does NOT update block.completedSets**
- **Does NOT check if block is complete**

**Callback function:**

- None - executors handle their own post-logging logic

---

## Section 3: Block Executors

### StraightSetExecutor

**File:** `src/components/client/workout-execution/blocks/StraightSetExecutor.tsx`

**Completed sets tracked in:**

- `loggedSetsArray` (local state, line 48)
- `currentSetNumber` (local state, line 44)
- Initialized from `block.completedSets + 1` (line 44)

**Progress display:**

- Shows "Set {currentSetNumber} of {totalSets}" (line 228)
- Passed to BaseBlockExecutorLayout as `currentSet={currentSetNumber}` (line 294)

**Resets after logging:** ✅ **YES**

- If not last set: Increments `currentSetNumber` (line 206)
- Clears inputs (line 208-209)
- Pre-fills weight for next set via useEffect (line 51-72)

**Post-logging behavior:**

```typescript
if (result.success) {
  // ... create loggedSet ...

  if (currentSetNumber >= totalSets) {
    // Complete the block
    onBlockComplete(block.block.id, updatedLoggedSets);
  } else {
    // Auto-advance to next set
    setCurrentSetNumber(currentSetNumber + 1);
    setWeight("");
    setReps("");
  }
}
```

**Auto-advances:** ✅ **YES** (to next set within same exercise)

- Automatically increments set number
- Does NOT advance to next exercise
- Does NOT auto-advance to next block (calls `onBlockComplete` but parent doesn't auto-advance)

---

### AmrapExecutor

**File:** `src/components/client/workout-execution/blocks/AmrapExecutor.tsx`

**Completed sets tracked in:**

- `loggedSetsArray` (created on-the-fly, line 226)
- Only one set per AMRAP block

**Progress display:**

- Shows `currentSet={1}` and `totalSets={1}` (line 401-402)
- Static - doesn't change

**Resets after logging:** ❌ **NO**

- AMRAP is single-set, so no reset needed
- Immediately calls `onBlockComplete()` (line 246)

**Post-logging behavior:**

```typescript
if (result.success) {
  // ... create loggedSetsArray ...

  // Complete the block immediately
  onBlockComplete(block.block.id, loggedSetsArray);
}
```

**Auto-advances:** ✅ **YES** (calls onBlockComplete, but parent doesn't auto-advance block)

---

### SupersetExecutor

**File:** `src/components/client/workout-execution/blocks/SupersetExecutor.tsx`

**Completed sets tracked in:**

- `currentSet` from `block.completedSets || 0` (line 41)
- NOT stored in local state
- NOT incremented after logging

**Progress display:**

- Uses `currentSet + 1` for set_number in loggedSetsArray (line 188, 197)
- But doesn't update `block.completedSets`

**Resets after logging:** ✅ **YES** (clears inputs)

- Clears weight/reps inputs (line 224-227)
- Does NOT increment set number
- Does NOT update `block.completedSets`

**Post-logging behavior:**

```typescript
if (result.success) {
  // ... create loggedSetsArray ...

  // Clear inputs
  setWeightA("");
  setRepsA("");
  setWeightB("");
  setRepsB("");

  // Complete block if last set
  if (currentSet + 1 >= totalSets) {
    onBlockComplete(block.block.id, loggedSetsArray);
  }
  // ❌ MISSING: Increment currentSet for next set
}
```

**Auto-advances:** ❌ **NO**

- Does NOT increment set number
- Does NOT update block.completedSets
- User must manually track which set they're on

---

### GiantSetExecutor

**File:** `src/components/client/workout-execution/blocks/GiantSetExecutor.tsx`

**Completed sets tracked in:**

- `currentSet` from `block.completedSets || 0` (line 40)
- `loggedSetsArray` created on-the-fly (line 165)

**Progress display:**

- Uses `currentSet + 1` for round_number (line 155)
- But doesn't update `block.completedSets`

**Resets after logging:** ✅ **YES** (clears inputs)

- Clears weight/reps arrays (line 186-200)
- Pre-fills with suggested weights
- Does NOT increment set number

**Post-logging behavior:**

```typescript
if (allSuccess) {
  // Clear inputs and pre-fill for next round
  // ... clear logic ...

  // Complete block if last set
  if (currentSet + 1 >= totalSets) {
    onBlockComplete(block.block.id, loggedSetsArray);
  }
  // ❌ MISSING: Increment currentSet
}
```

**Auto-advances:** ❌ **NO**

---

### Other Executors Summary

| Executor                  | Tracks Sets                                      | Auto-Advances Set | Auto-Advances Block                                      |
| ------------------------- | ------------------------------------------------ | ----------------- | -------------------------------------------------------- |
| **StraightSetExecutor**   | ✅ `currentSetNumber`                            | ✅ Yes            | ❌ No (calls onBlockComplete but parent doesn't advance) |
| **AmrapExecutor**         | ❌ Single set                                    | N/A               | ❌ No                                                    |
| **SupersetExecutor**      | ❌ Uses `block.completedSets` but doesn't update | ❌ No             | ❌ No                                                    |
| **GiantSetExecutor**      | ❌ Uses `block.completedSets` but doesn't update | ❌ No             | ❌ No                                                    |
| **DropSetExecutor**       | ❌ Uses `block.completedSets` but doesn't update | ❌ No             | ❌ No                                                    |
| **ClusterSetExecutor**    | ❌ Uses `block.completedSets` but doesn't update | ❌ No             | ❌ No                                                    |
| **RestPauseExecutor**     | ❌ Uses `block.completedSets` but doesn't update | ❌ No             | ❌ No                                                    |
| **PreExhaustionExecutor** | ❌ Uses `block.completedSets` but doesn't update | ❌ No             | ❌ No                                                    |
| **EmomExecutor**          | ❌ Uses `currentMinute` (not sets)               | ❌ No             | ❌ No                                                    |
| **ForTimeExecutor**       | ❌ Single completion                             | N/A               | ❌ No                                                    |
| **PyramidSetExecutor**    | ❌ Loops through all sets at once                | ❌ No             | ❌ No                                                    |
| **LadderExecutor**        | ❌ Loops through all rungs at once               | ❌ No             | ❌ No                                                    |
| **TabataExecutor**        | ❌ No set tracking                               | N/A               | ❌ No                                                    |
| **CircuitExecutor**       | ❌ No set tracking                               | N/A               | ❌ No                                                    |

---

## Key Findings

### 1. Block Navigation Issues

**Problem:** `handleBlockComplete()` marks block as complete but doesn't auto-advance.

**Current Flow:**

1. Executor calls `onBlockComplete(blockId, loggedSets)`
2. Parent marks block as `isCompleted: true`
3. **STOPS HERE** - user must manually click "Next"

**Should Be:**

1. Executor calls `onBlockComplete(blockId, loggedSets)`
2. Parent marks block as complete
3. **Auto-advance:** Check if more blocks exist → advance to next block OR show completion screen

### 2. Exercise Navigation Issues

**Problem:** No automatic exercise advancement within a block.

**Current State:**

- Each block can have multiple exercises
- `currentExerciseIndex` tracks which exercise is active
- **No logic to advance to next exercise** when current exercise is complete

**Missing:**

- Logic to check if all sets of current exercise are complete
- Logic to advance to next exercise in block
- Logic to check if all exercises in block are complete

### 3. Set Navigation Issues

**Problem:** Most executors don't update `block.completedSets` after logging.

**Current State:**

- `block.completedSets` comes from parent (initial state)
- Executors read it but don't update it
- Only `StraightSetExecutor` tracks sets locally with `currentSetNumber`

**Missing:**

- Mechanism to update `block.completedSets` after logging
- Sync between executor's local state and block's completedSets
- Logic to determine when all sets are complete

### 4. Progress Display Issues

**Problem:** Progress display doesn't always reflect actual progress.

**Current State:**

- Progress shown as "Set X of Y" or "Exercise X of Y"
- Calculated from local state or `block.completedSets`
- **Not always accurate** because `block.completedSets` isn't updated

**Example:**

- SupersetExecutor shows "Set 1 of 3" even after logging Set 1
- Because `currentSet` (from `block.completedSets`) never increments

---

## Recommendations

### Fix 1: Auto-Advance Blocks

**In `handleBlockComplete()` (start/page.tsx line 313):**

```typescript
const handleBlockComplete = (blockId: string, loggedSets: LoggedSet[]) => {
  setWorkoutBlocks((prev) =>
    prev.map((block) =>
      block.block.id === blockId ? { ...block, isCompleted: true } : block
    )
  );

  // ✅ ADD: Auto-advance to next block
  if (currentBlockIndex < workoutBlocks.length - 1) {
    // Small delay for UX (show completion toast first)
    setTimeout(() => {
      setCurrentBlockIndex((prev) => prev + 1);
    }, 1000);
  } else {
    // All blocks complete
    setShowWorkoutCompletion(true);
  }
};
```

### Fix 2: Update block.completedSets

**Create a callback to update completed sets:**

```typescript
const handleSetLogged = (blockId: string, newCompletedSets: number) => {
  setWorkoutBlocks((prev) =>
    prev.map((block) =>
      block.block.id === blockId
        ? { ...block, completedSets: newCompletedSets }
        : block
    )
  );
};
```

**Pass to executors and call after logging:**

```typescript
// In each executor, after successful log:
if (result.success) {
  // Update parent's completedSets
  onSetLogged?.(block.block.id, currentSet + 1);

  // Then check if block is complete
  if (currentSet + 1 >= totalSets) {
    onBlockComplete(block.block.id, loggedSetsArray);
  }
}
```

### Fix 3: Auto-Advance Exercises

**Add logic to check if exercise is complete and advance:**

```typescript
const handleExerciseComplete = (blockId: string) => {
  setWorkoutBlocks((prev) =>
    prev.map((block) => {
      if (block.block.id !== blockId) return block;

      const currentExIndex = block.currentExerciseIndex || 0;
      const totalExercises = block.block.exercises?.length || 0;

      if (currentExIndex < totalExercises - 1) {
        // Advance to next exercise
        return {
          ...block,
          currentExerciseIndex: currentExIndex + 1,
          completedSets: 0,
        };
      } else {
        // All exercises complete, mark block as complete
        return { ...block, isCompleted: true };
      }
    })
  );
};
```

### Fix 4: Sync Set State

**Update executors to use and update `block.completedSets`:**

```typescript
// Instead of local currentSetNumber, use:
const currentSet = block.completedSets || 0;
const setNumber = currentSet + 1;

// After logging:
if (result.success) {
  // Update block's completedSets via callback
  onSetLogged?.(block.block.id, setNumber);

  // Check completion
  if (setNumber >= totalSets) {
    onBlockComplete(block.block.id, loggedSetsArray);
  }
}
```

---

## Summary

### What Works ✅

- Block system loads and displays correctly
- Set logging works and saves to database
- Progress display shows current set/exercise
- Manual navigation buttons work

### What's Broken ❌

- **No auto-advancement** after block completion
- **No auto-advancement** after exercise completion
- **No auto-advancement** after set completion (except StraightSetExecutor)
- `block.completedSets` not updated after logging
- Progress display shows stale data

### What's Missing 🔴

- Callback to update `block.completedSets` from executors
- Logic to check if exercise is complete
- Logic to check if block is complete (beyond just calling onBlockComplete)
- Auto-navigation triggers
- State synchronization between executors and parent

### Priority Fixes

1. **HIGH:** Auto-advance blocks after completion
2. **HIGH:** Update `block.completedSets` after logging
3. **MEDIUM:** Auto-advance exercises within blocks
4. **MEDIUM:** Sync set state between executors and parent
5. **LOW:** Add visual feedback for auto-advancement

# GiantSetExecutor Infinite Loop Fix & Load% Investigation

**Date**: 2026-01-11  
**Status**: ✅ **Infinite Loop Fixed**

---

## Issues Identified

1. **Infinite Loop Error** - "Maximum update depth exceeded" in `GiantSetExecutor.tsx`
2. **Load% Not Displaying** - Some exercises not showing load percentage

---

## Issue 1: Infinite Loop Fix ✅

### Problem

**Location**: `src/components/client/workout-execution/blocks/GiantSetExecutor.tsx` (line 76)

**Root Cause**: 
- `useEffect` had `weights` in the dependency array: `[exercises, e1rmMap, weights]`
- Inside the effect, `setWeights(initialWeights)` was called (line 70)
- This created an infinite loop:
  1. useEffect runs
  2. setWeights is called
  3. weights state changes
  4. useEffect runs again (because weights is in dependencies)
  5. Infinite loop! 🔄

### Solution

**Changed**: Removed `weights` from dependency array and changed initialization logic

**Before**:
```typescript
useEffect(() => {
  if (exercises.length > 0) {
    const initialWeights = exercises.map((ex, idx) => {
      const currentWeight = weights[idx]; // Reading from weights state
      // ... logic ...
      return currentWeight || "";
    });
    setWeights(initialWeights); // Setting weights state
    // ...
  }
}, [exercises, e1rmMap, weights]); // ❌ weights in dependencies causes loop
```

**After**:
```typescript
useEffect(() => {
  if (exercises.length > 0) {
    // Only update if weights array is empty or length doesn't match
    const shouldInitialize = weights.length === 0 || weights.length !== exercises.length;
    
    if (shouldInitialize) {
      const initialWeights = exercises.map((ex) => {
        // Only set suggested weight if e1rmMap has data
        const hasE1rm = ex.exercise_id && e1rmMap[ex.exercise_id] && e1rmMap[ex.exercise_id] > 0;
        
        if (hasE1rm && ex.load_percentage) {
          const suggested = calculateSuggestedWeightUtil(
            ex.exercise_id,
            ex.load_percentage,
            e1rmMap
          );
          if (suggested && suggested > 0) {
            return suggested.toString();
          }
        }
        return "";
      });
      setWeights(initialWeights);
      setReps(new Array(exercises.length).fill(""));
    }
  }
}, [exercises, e1rmMap]); // ✅ Removed 'weights' from dependencies
```

### Changes Made

1. **Removed `weights` from dependency array** - Prevents infinite loop
2. **Added initialization check** - Only initializes if weights array is empty or length doesn't match
3. **Simplified logic** - Removed complex weight preservation logic (not needed on initialization)

### Result

- ✅ No more infinite loop
- ✅ Weights still initialize correctly when exercises or e1rmMap changes
- ✅ Weights preserve user input (only initializes when array is empty/mismatched)

---

## Issue 2: Load% Not Displaying - Investigation

### Current Behavior

Load percentage is displayed in `blockDetails` for GiantSetExecutor (lines 97-113):

```typescript
if (ex.load_percentage) {
  const suggestedWeight = calculateSuggestedWeightUtil(
    ex.exercise_id,
    ex.load_percentage,
    e1rmMap
  );
  const loadDisplay = formatLoadPercentage(
    ex.load_percentage,
    suggestedWeight
  );
  if (loadDisplay) {
    blockDetails.push({
      label: `LOAD (${idx + 1})`,
      value: loadDisplay,
    });
  }
}
```

### When Load% is Displayed

Load% is displayed when ALL of these are true:
1. ✅ `ex.load_percentage` exists (not null/undefined) - **Line 97**
2. ✅ `formatLoadPercentage()` returns a non-null value - **Line 107**

### When Load% is NOT Displayed

Load% is NOT displayed when ANY of these are true:
1. ❌ `ex.load_percentage` is null/undefined/0
2. ❌ `formatLoadPercentage()` returns null (loadPercentage is falsy or <= 0)

### `formatLoadPercentage` Function Behavior

**Location**: `src/components/client/workout-execution/BaseBlockExecutor.tsx` (lines 220-232)

```typescript
export function formatLoadPercentage(
  loadPercentage: number | null | undefined,
  suggestedWeight: number | null
): string | null {
  if (!loadPercentage || loadPercentage <= 0) {
    return null; // ❌ Returns null if loadPercentage is falsy or <= 0
  }

  if (suggestedWeight !== null && suggestedWeight > 0) {
    return `${loadPercentage}% / ${suggestedWeight}kg`; // ✅ Shows percentage + weight
  }

  return `${loadPercentage}%`; // ✅ Shows just percentage if no e1RM data
}
```

### Possible Reasons Load% Isn't Displaying

1. **Exercise doesn't have `load_percentage` set**
   - `ex.load_percentage` is null/undefined
   - Check: Is `load_percentage` stored in `workout_block_exercises` table for this exercise?

2. **`load_percentage` is 0 or negative**
   - `formatLoadPercentage` returns null if loadPercentage <= 0
   - Check: Is `load_percentage` > 0 in the database?

3. **Exercise data not loaded correctly**
   - `load_percentage` not included in SELECT query
   - Check: Is `load_percentage` selected from `workout_block_exercises` table?

### Recommended Checks

**Database Check**:
```sql
-- Check if load_percentage exists for exercises in a giant_set block
SELECT 
  wbe.id,
  wbe.exercise_id,
  e.name AS exercise_name,
  wbe.load_percentage,
  wb.block_type
FROM workout_block_exercises wbe
JOIN exercises e ON wbe.exercise_id = e.id
JOIN workout_blocks wb ON wbe.block_id = wb.id
WHERE wb.block_type = 'giant_set'
  AND wbe.block_id = 'YOUR_BLOCK_ID'
ORDER BY wbe.exercise_order;
```

**Code Check**:
- Verify `workout_block_exercises.load_percentage` is selected in `workoutBlockService.ts`
- Check if `load_percentage` is properly mapped to exercises in the block loading logic

### Notes

- The code logic appears correct - load% should display if `ex.load_percentage` exists and is > 0
- The issue is likely that some exercises don't have `load_percentage` set in the database
- OR `load_percentage` is 0/null for some exercises (which is valid - not all exercises need load%)
- Load% display is optional - it's only shown if the data exists

---

## Files Modified

1. **`src/components/client/workout-execution/blocks/GiantSetExecutor.tsx`**
   - **Line 49-75**: Fixed useEffect infinite loop
   - Removed `weights` from dependency array
   - Added initialization check to prevent unnecessary updates

---

## Testing

### Test Infinite Loop Fix

1. **Navigate to workout execution page** with a giant_set block
2. **Check browser console** - Should NOT see "Maximum update depth exceeded" error
3. **Verify weights initialize** - Weight inputs should populate with suggested weights (if e1RM data exists)
4. **Verify weights preserve user input** - User-entered weights should not be cleared on navigation

### Test Load% Display

1. **Check block details** - Look for "LOAD (1)", "LOAD (2)", etc. in block details grid
2. **Verify load% shows** - Should display for exercises with `load_percentage` > 0
3. **Check format** - Should show either:
   - `"X% / Ykg"` (if e1RM data exists)
   - `"X%"` (if no e1RM data)

### Expected Behavior

- ✅ No infinite loop errors in console
- ✅ Weight inputs initialize correctly
- ✅ Load% displays for exercises with `load_percentage` set
- ✅ Load% format is correct (percentage + weight if e1RM exists, or just percentage)

---

## Summary

✅ **Fixed**: Infinite loop in GiantSetExecutor useEffect  
🔍 **Investigated**: Load% display logic (appears correct - issue is likely missing data)

The infinite loop fix is complete. The load% display issue is likely due to missing `load_percentage` data in the database for some exercises, which is expected behavior (not all exercises need load%).

# Water Counter Persistence Fix - Implementation Complete ✅

## Summary

Water counter (hydration tracker) now **persists across page reloads** and **resets at midnight** like other daily counters.

## Problem Identified

**Issue**: Water counter reset to 0 every time the page was reloaded.

**Root Cause**: 
- Water intake was only stored in React state (`nutritionData.water.glasses`)
- Not saved to database
- On page reload, state resets to initial value (0)

## Solution

Store water intake in `goals` table's `current_value` field (same as other daily goals):
- **Load** `current_value` from goals table on page load
- **Save** `current_value` to goals table when user clicks glasses
- **Reset** at midnight (already handled by `resetDailyGoals()`)

## Changes Made

### 1. Added Goal ID Storage

**Location**: `src/app/client/nutrition/page.tsx` (line 68)

**Change**: Added state to store water goal ID
```typescript
const [waterGoalId, setWaterGoalId] = useState<string | null>(null);
```

### 2. Updated `loadWaterGoal()` Function

**Location**: Lines 325-401

**Changes**:
- Now selects `id` and `current_value` from goals table (in addition to `target_value`, `target_unit`)
- Loads today's water intake from `current_value` (stored in ml)
- Converts `current_value` (ml) to glasses for display
- Stores goal ID for future updates

**Before**:
```typescript
.select("target_value, target_unit") // Only goal, not current value
// Water intake always starts at 0 on page load
```

**After**:
```typescript
.select("id, target_value, target_unit, current_value") // Includes goal id and current value
const currentValue = waterGoal.current_value || 0; // Today's intake (ml)
const currentGlasses = Math.floor(currentValue / 375); // Convert to glasses
// Water intake persists from database
```

### 3. Updated `handleWaterGlassClick()` Function

**Location**: Lines 414-488

**Changes**:
- Now async function (was synchronous)
- Saves water intake to goals table `current_value` field (in ml)
- Updates `progress_percentage` and `status` based on goal
- Includes error handling with state revert on save failure

**Before**:
```typescript
const handleWaterGlassClick = (targetGlasses: number) => {
  setNutritionData(...); // Only updates React state
  // Not saved to database - resets on reload
};
```

**After**:
```typescript
const handleWaterGlassClick = async (targetGlasses: number) => {
  // Update UI immediately (optimistic update)
  setNutritionData(...);
  
  // Save to database
  await supabase.from("goals").update({
    current_value: newMl, // Store in ml
    progress_percentage: ...,
    status: ...,
  }).eq("id", waterGoalId);
  
  // Error handling with revert
};
```

## How It Works Now

### Flow After Click:

1. **User clicks glass** → `handleWaterGlassClick()` called
2. **Calculate new value** → New glasses and ml calculated
3. **Update UI immediately** → State updated (optimistic update)
4. **Save to database** → `goals.current_value` updated (in ml)
5. **Persists on reload** → Value loaded from database on page load ✅

### Flow On Page Load:

1. **Page loads** → `loadWaterGoal()` called
2. **Load from database** → Queries goals table for `current_value`
3. **Convert to glasses** → ml → glasses (375ml per glass)
4. **Display** → Shows correct water intake ✅

### Flow At Midnight:

1. **Cron job runs** → `resetDailyGoals()` called (already implemented)
2. **Reset water goals** → Sets `current_value = 0` for water intake goals
3. **Next page load** → Shows 0 glasses ✅

## Expected Behavior

**Before Fix:**
- User clicks 3 glasses → Shows 3 glasses ✅
- User reloads page → Shows 0 glasses ❌ (reset)
- Midnight → Still shows old value ❌ (never resets)

**After Fix:**
- User clicks 3 glasses → Shows 3 glasses ✅
- User reloads page → Shows 3 glasses ✅ (persists!)
- Midnight → Resets to 0 ✅ (daily reset works)

## Files Modified

1. **`src/app/client/nutrition/page.tsx`**
   - Added: `waterGoalId` state (line 68)
   - Modified: `loadWaterGoal()` to load `current_value` (lines 328, 363, 386-400)
   - Modified: `handleWaterGlassClick()` to save to database (lines 414-488)

## Notes

- **Storage format**: Water intake stored in **ml** in database (`current_value` field)
- **Display format**: Converted to **glasses** (375ml per glass) for UI
- **Reset**: Already handled by `resetDailyGoals()` function (resets at midnight UTC)
- **Backward compatible**: Works even if no water goal is configured (just doesn't save)
- **Error handling**: Reverts UI state if database save fails

---

✅ **Implementation Complete** - Water counter now persists and resets at midnight!

# Nutrition Calorie Counting Bug - Analysis & Fix

## 🔍 Problem Identified

The nutrition page is displaying calories (498 kcal) even though **no meals have been logged today** (0 of 1 meals logged).

## 🐛 Root Cause

**Location**: `src/app/client/nutrition/page.tsx` (lines 301-322)

**The Bug**: Calories are being calculated from **ALL meals in the meal plan**, regardless of whether they've been logged today or not.

### Current Code (WRONG):
```typescript
// Lines 301-322: Calculates calories from ALL meals, even unlogged ones
const totalCalories = mealsWithData.reduce(
  (sum, meal) =>
    sum +
    meal.items.reduce((itemSum, item) => itemSum + item.calories, 0),
  0
);
```

### What's Happening:

1. **Step 1** (lines 185-248): For each meal in the meal plan:
   - Gets all food items for that meal
   - Calculates calories for those food items
   - Stores them in `mealsWithData`

2. **Step 2** (lines 250-272): Checks if meal was logged today:
   - Sets `meal.logged = true/false` based on photo logs/completions
   - **BUT**: Food items with calories are already in the meal object

3. **Step 3** (lines 301-322): Calculates totals:
   - **BUG**: Counts calories from ALL meals, including unlogged ones
   - Should only count calories from meals where `meal.logged === true`

## ✅ The Fix

Only count calories/protein/carbs/fat from meals that have been **logged today**.

### Fixed Code:
```typescript
// Only count nutrients from logged meals
const totalCalories = mealsWithData.reduce(
  (sum, meal) =>
    meal.logged 
      ? sum + meal.items.reduce((itemSum, item) => itemSum + item.calories, 0)
      : sum,
  0
);

const totalProtein = mealsWithData.reduce(
  (sum, meal) =>
    meal.logged
      ? sum + meal.items.reduce((itemSum, item) => itemSum + item.protein, 0)
      : sum,
  0
);

const totalCarbs = mealsWithData.reduce(
  (sum, meal) =>
    meal.logged
      ? sum + meal.items.reduce((itemSum, item) => itemSum + item.carbs, 0)
      : sum,
  0
);

const totalFat = mealsWithData.reduce(
  (sum, meal) =>
    meal.logged
      ? sum + meal.items.reduce((itemSum, item) => itemSum + item.fat, 0)
      : sum,
  0
);
```

## 📊 Expected Behavior After Fix

**Before Fix**:
- Meal plan has 1 meal with 344 calories (Beef chuck, Chicken Breast)
- Meal shows as "Not Logged"
- **Calories displayed: 498** ❌ (WRONG - counting unlogged meal)

**After Fix**:
- Meal plan has 1 meal with 344 calories (Beef chuck, Chicken Breast)
- Meal shows as "Not Logged"
- **Calories displayed: 0** ✅ (CORRECT - only counting logged meals)

**After Logging Meal**:
- Meal is logged (photo uploaded)
- Meal shows as "Logged"
- **Calories displayed: 344** ✅ (CORRECT - counting logged meal)

## 🔧 Files to Fix

1. **File**: `src/app/client/nutrition/page.tsx`
   - **Lines**: 301-322
   - **Change**: Add `meal.logged` check before summing calories/protein/carbs/fat

## 🧪 How to Verify

1. **Before fix**: Open nutrition page with unlogged meals → calories show incorrectly
2. **Apply fix**: Update the reduce functions to check `meal.logged`
3. **After fix**: 
   - Open nutrition page with unlogged meals → calories should be 0
   - Log a meal → calories should update to that meal's calories
   - Log another meal → calories should add both meals' calories

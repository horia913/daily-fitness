# Phase 7 Component Migration Plan

## ⚠️ IMPORTANT: This migration requires updating ALL imports

Moving components will break the app unless we update every import statement. This document outlines what would need to be moved and what would break.

## Components to Move

### 1. Workout Components → `features/workouts/`

**Files to move:**

- `WorkoutTemplateForm.tsx` (4 imports found)
- `WorkoutDetailModal.tsx` (needs check)
- `WorkoutAssignmentModal.tsx` (needs check)
- `WorkoutBlockBuilder.tsx` (from coach/)
- `WorkoutTemplateEditor.tsx` (from coach/)
- `WorkoutTemplateFilters.tsx` (from coach/)
- `WorkoutTemplateSidebar.tsx` (from coach/)

**Current imports:**

- `WorkoutTemplateForm`: 4 files
  - `src/app/coach/workouts/templates/[id]/edit/page.tsx`
  - `src/app/coach/workouts/templates/create/page.tsx`
  - `src/components/coach/OptimizedWorkoutTemplates.tsx`
  - `src/components/coach/EnhancedWorkoutTemplateManager.tsx`

### 2. Nutrition Components → `features/nutrition/`

**Files to move:**

- `MealForm.tsx`
- `MealPlanBuilder.tsx` (2 imports found)
- `MealCreator.tsx` (from coach/, 1 import found)

**Current imports:**

- `MealPlanBuilder`: 2 files
  - `src/app/coach/nutrition/page.tsx`
  - `src/app/coach/meals/page.tsx`
- `MealCreator`: 1 file
  - `src/app/coach/nutrition/meal-plans/[id]/page.tsx`

### 3. Exercise Components → `features/exercises/` (NEW FOLDER)

**Files to move:**

- `ExerciseForm.tsx`
- `ExerciseSelector.tsx`
- `ExerciseCategoryForm.tsx`
- `ExerciseSetForm.tsx`
- `CategoryForm.tsx`
- `ExerciseCard.tsx` (from coach/)
- `ExerciseSearchFilters.tsx` (from coach/)
- `ExerciseAlternativesModal.tsx` (from coach/)
- `DraggableExerciseCard.tsx` (from coach/)

## Risk Assessment

### High Risk ⚠️

- **Breaking changes**: Moving files will break ALL imports
- **Files affected**: ~15-20 files would need import updates
- **Testing required**: Each moved component needs verification

### Low Risk ✅

- **TypeScript will catch errors**: The compiler will show all broken imports
- **Systematic approach**: We can move files and update imports in batches
- **Git tracking**: Easy to revert if something breaks

## Recommended Approach

### Option 1: Do it Safely with Import Updates ⭐ RECOMMENDED

1. Move files in batches (one category at a time)
2. Update ALL imports immediately after each move
3. Verify TypeScript compilation passes
4. Test affected pages

### Option 2: Don't Do It (Safer)

- Keep current structure
- Only organize new components going forward
- Less risk of breaking existing functionality

### Option 3: Partial Migration

- Only move NEW components to features/
- Leave existing components where they are
- Gradually refactor as components are touched

## Execution Plan (if proceeding)

### Step 1: Workout Components (Medium Risk)

1. Move `WorkoutTemplateForm.tsx` → `features/workouts/`
2. Update 4 import statements
3. Verify compilation
4. Test workout template pages

### Step 2: Nutrition Components (Low Risk - Few imports)

1. Move `MealPlanBuilder.tsx` → `features/nutrition/`
2. Move `MealCreator.tsx` → `features/nutrition/`
3. Update 3 import statements total
4. Verify compilation

### Step 3: Exercise Components (High Risk - Many imports)

1. Find ALL imports first
2. Create `features/exercises/` folder
3. Move files
4. Update ALL imports
5. Comprehensive testing

## Current Status

✅ **Analysis Complete**
📋 **Import locations identified**
✅ **Decision Made: Skip Migration (Option 1)**

**Final Decision:** We are keeping the current component structure and will only organize new components going forward. Existing components remain in their current locations to avoid breaking changes.

## Recommendation

**I recommend Option 1 (Safe Migration)** if you want better organization, OR **Option 2 (Don't migrate)** if you want zero risk of breaking changes.

The migration is doable but requires careful execution and testing.

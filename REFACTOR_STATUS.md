# Database Schema & Modal Refactor - Status Report

## ✅ Completed Phases

### Phase 2: EnhancedProgramManager Refactor ✅

- **Status:** Mostly Complete
- **New Pages Created:**
  - ✅ `/coach/programs/page.tsx` - Main program list
  - ✅ `/coach/programs/create/page.tsx` - Program creation
  - ✅ `/coach/programs/[id]/page.tsx` - Program details
  - ✅ `/coach/programs/[id]/edit/page.tsx` - Program editing
- **Components Extracted:**
  - ✅ `ProgramCard.tsx` - Extracted to `features/programs/`
- **Remaining Work:**
  - ⚠️ `EnhancedProgramManager.tsx` still exists (likely kept for backward compatibility or needs cleanup)
  - Need to verify if it's still being used anywhere

### Phase 2.5: Progress Tracking Integration ✅

- **Status:** Complete
- **New Pages Created:**
  - ✅ `/client/progress/body-metrics/page.tsx` - Body metrics tracking
  - ✅ `/client/progress/mobility/page.tsx` - Mobility assessments
  - ✅ `/client/progress/personal-records/page.tsx` - Personal records
  - ✅ `/client/progress/achievements/page.tsx` - Achievements
  - ✅ `/client/progress/goals/page.tsx` - Goals & Habits (converted from modal)
  - ✅ `/coach/clients/[id]/fms/page.tsx` - FMS assessments (coach view)
- **Services Created:**
  - ✅ `progressTrackingService.ts` - All progress tracking services
  - ✅ `progressPhotoStorage.ts` - Photo upload handling
  - ✅ Schema fixes (goals table: `is_active` → `status`)
- **Components:**
  - ✅ `MobilityFormFields.tsx` - Enhanced mobility form with reference values
  - ✅ `mobilityReferenceValues.ts` - Reference value definitions

### Phase 4: Workout Template Management ✅

- **Status:** Complete
- **New Pages Created:**
  - ✅ `/coach/workouts/templates/page.tsx` - Template list
  - ✅ `/coach/workouts/templates/create/page.tsx` - Template creation
  - ✅ `/coach/workouts/templates/[id]/page.tsx` - Template details
  - ✅ `/coach/workouts/templates/[id]/edit/page.tsx` - Template editing
- **Components Extracted:**
  - ✅ `WorkoutTemplateCard.tsx` - Template card component
  - ✅ `ExerciseBlockCard.tsx` - Block display component
  - ✅ `ExerciseItem.tsx` - Individual exercise component
- **Services:**
  - ✅ `workoutBlockService.ts` - Block management service

---

## 🔄 In Progress / Partially Complete

### Phase 2: EnhancedProgramManager (Cleanup Needed)

- ⚠️ Old `EnhancedProgramManager.tsx` component still exists
- **Still in use by:**
  - `src/app/coach/programs-workouts/page.tsx` - Used in tab view
  - `src/components/coach/client-views/ClientWorkoutsView.tsx` - Used for client workout view
- **Action Needed:**
  - Update `programs-workouts/page.tsx` to redirect to new `/coach/programs` page instead
  - Check if ClientWorkoutsView needs updating
  - Consider deprecating or removing old component after migration complete

---

## ❌ Remaining Phases

### Phase 3: SimplifiedMealPlans Refactor ✅

- **Status:** Complete
- **Pages Created:**
  - ✅ `/coach/nutrition/meal-plans/page.tsx` - Main meal plan list with search/filter
  - ✅ `/coach/nutrition/meal-plans/create/page.tsx` - Create new meal plan
  - ✅ `/coach/nutrition/meal-plans/[id]/page.tsx` - Meal plan details view
  - ✅ `/coach/nutrition/meal-plans/[id]/edit/page.tsx` - Edit meal plan
- **Components Extracted:**
  - ✅ `MealPlanCard.tsx` - Extracted to `features/nutrition/`
  - ✅ `MealPlanAssignmentModal.tsx` - Simple modal for quick client assignment
- **Improvements:**
  - ✅ Calculates real meal counts and assignment counts from database
  - ✅ All navigation uses Next.js router (no more modals for main views)
  - ✅ MealCreator still uses modal (quick interaction)
  - ✅ Updated nutrition page to redirect to new meal-plans page
- **Note:** `SimplifiedMealPlans.tsx` still exists but can be deprecated after testing

### Phase 5: Client Detail Views Refactor

- **Status:** Not Started
- **Current State:**
  - `ClientDetailModal.tsx` still exists and is actively used
  - **Used by:** `src/app/coach/clients/page.tsx` - Main clients list page
  - Client views are components, not pages:
    - `ClientWorkoutsView.tsx`
    - `ClientMealsView.tsx`
    - `ClientProgressView.tsx`
    - `ClientProfileView.tsx`
- **Required Work:**
  ```
  src/app/coach/clients/
    └── [id]/
        ├── page.tsx              # Client overview/details
        ├── workouts/
        │   └── page.tsx         # Client workouts view
        ├── nutrition/
        │   └── page.tsx         # Client meals view
        └── progress/
            └── page.tsx         # Client progress view
  ```
- **Tasks:**
  - [ ] Convert ClientDetailModal to full client detail page
  - [ ] Move each client view to separate page route
  - [ ] Use tabs or navigation for switching between views
  - [ ] Update all database queries
  - [ ] Test client data loading and interactions

### Phase 6: Exercise Library & Food Database

- **Status:** Minimal Changes Needed (Lower Priority)
- **Current Files:**
  - `OptimizedExerciseLibrary.tsx` (904 lines)
  - `OptimizedFoodDatabase.tsx`
- **Required Work:**
  - [ ] Verify database queries work correctly
  - [ ] Only fix what's broken
  - [ ] Simplify exercise selection modals if needed

### Phase 7: File Organization & Cleanup

- **Status:** Not Started
- **Backup Files to Remove:**
  - [ ] `src/app/coach/clipcards/page-backup.tsx`
  - [ ] `src/app/coach/goals/page-old-backup.tsx`
  - [ ] `src/app/coach/goals/page-new.tsx` (consolidate)
  - [ ] `src/app/coach/scheduling/page.tsx.backup`
  - [ ] `src/app/coach/programs-workouts/page-clean.tsx`
  - [ ] `src/app/client/page_old.tsx`
  - [ ] `src/app/client/page_new.tsx`
  - [ ] `src/app/client/progress/page_new.tsx`
  - [ ] `src/app/coach/page_old.tsx`
  - [ ] `src/app/coach/page_new.tsx`
- **Organization Tasks:**
  - [ ] Move components to `features/` folder structure
  - [ ] Organize by feature (programs, workouts, nutrition, clients, progress)
  - [ ] Remove duplicate/backup files

### Phase 8: Remaining Schema Updates

- **Status:** Ongoing (Fix as found)
- **Recent Fixes:**
  - ✅ Goals table: Changed `is_active` to `status`
  - ✅ Workout blocks: Updated to use `workout_blocks` instead of `workout_template_exercises`
- **Tasks:**
  - [ ] Spot check remaining files for schema mismatches
  - [ ] Verify table names match new schema
  - [ ] Verify column names match new schema
  - [ ] Update foreign key references where needed
  - [ ] Test all queries

### Phase 9: Testing & Validation

- **Status:** Ongoing
- **Functional Testing:**
  - [ ] Programs: Create, edit, view, assign, delete
  - [ ] Workouts: Create templates, assign, track completion
  - [ ] Meals: Create plans, assign, track completion
  - [ ] Clients: View details, manage relationships
  - [ ] Progress: View metrics, charts, analytics
- **Mobile UX Testing:**
  - [ ] All pages render properly on mobile (iPhone, Pro Max)
  - [ ] No modal overflow issues
  - [ ] Navigation works smoothly
  - [ ] Forms are usable on small screens
- **Database Query Validation:**
  - [ ] All queries use correct table names
  - [ ] All queries use correct column names
  - [ ] Foreign key relationships work
  - [ ] No SQL errors in console

---

## Priority Order (Recommended)

1. **Phase 3: SimplifiedMealPlans** - Large component causing modal issues
2. **Phase 5: Client Detail Views** - Still modal-based, needs conversion
3. **Phase 7: File Cleanup** - Remove backup files cluttering codebase
4. **Phase 2 Cleanup** - Remove old EnhancedProgramManager if unused
5. **Phase 8: Schema Updates** - Fix remaining issues as found
6. **Phase 6: Exercise/Food Libraries** - Lower priority, minimal changes

---

## Summary Statistics

- **✅ Completed:** 3.5 phases (EnhancedProgramManager, Progress Tracking, Workout Templates, Meal Plans)
- **🔄 In Progress:** 0.5 phases (Cleanup)
- **❌ Remaining:** 2.5 phases (Client Views, Cleanup, Schema fixes)
- **Overall Progress:** ~70% Complete

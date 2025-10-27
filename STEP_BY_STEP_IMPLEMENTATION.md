# Step-by-Step Implementation Guide

## Pre-Flight Checklist

- [ ] Git repository is clean (all changes committed)
- [ ] Create backup tag
- [ ] Ready to spend 3-4 days on this

---

## Setup: Create Backup (10 minutes)

### Step 1: Git Backup

```bash
# Navigate to project directory
cd dailyfitness-app

# Check status
git status

# If there are uncommitted changes, commit them
git add .
git commit -m "Pre-exercise-groups backup"

# Create a backup tag
git tag backup-before-exercise-groups

# Create feature branch
git checkout -b feature/exercise-groups-implementation
```

### Step 2: Verify Files Exist

Check that these files were created:

```bash
ls sql/13-exercise-groups-schema.sql
ls src/lib/workoutGroupService.ts
ls src/types/workoutGroups.ts
```

---

## Day 1: Database Migration (2-3 hours)

### Task 1: Run SQL Migration

1. **Open Supabase Dashboard**

   - Go to your project
   - Click **SQL Editor**

2. **Copy SQL from file**

   - Open `sql/13-exercise-groups-schema.sql`
   - Copy entire contents

3. **Run in Supabase**

   - Paste into SQL Editor
   - Click **Run**
   - Should see: "Exercise groups schema setup completed successfully!"

4. **Verify Tables Created**

   ```sql
   -- Run this check query:
   SELECT table_name
   FROM information_schema.tables
   WHERE table_name IN ('workout_exercise_groups', 'workout_template_exercises')
   ORDER BY table_name;
   ```

   Should show both tables

5. **Verify Columns Added**

   ```sql
   -- Run this check query:
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'workout_template_exercises'
     AND column_name IN ('group_id', 'group_letter', 'work_seconds', 'weight_kg');
   ```

   Should show 4 new columns

6. **Commit**
   ```bash
   git add sql/13-exercise-groups-schema.sql
   git commit -m "Add exercise groups database schema"
   ```

### Task 2: Test Helper Service (Optional)

Create a test file to verify the service works:

```typescript
// Test file: test-workout-group-service.ts
import { WorkoutGroupService } from "./src/lib/workoutGroupService";

// Test basic functionality
console.log("Testing workout group service...");

// This is just to verify it compiles
// You'll fully test when you integrate it
```

---

## Day 2: Update WorkoutTemplateForm (8-10 hours)

### Task 1: Update Save Logic

**File**: `src/components/WorkoutTemplateForm.tsx`

**Location**: Find the `handleSubmit` function (around line 343)

**Find this code** (lines 405-508):

```typescript
if (exercises.length > 0) {
  const exerciseData = exercises.map((exercise, index) => {
    // Complex JSON packing logic...
  });

  const { error: exerciseError } = await supabase
    .from("workout_template_exercises")
    .insert(exerciseData);
}
```

**Replace with**:

```typescript
// Import at top of file
import { WorkoutGroupService } from "@/lib/workoutGroupService";

// In handleSubmit function, replace exercise saving section with:
if (exercises.length > 0) {
  // Use the helper service to save each exercise group
  for (const exercise of exercises) {
    try {
      await WorkoutGroupService.saveExerciseGroup(savedTemplateId, exercise);
    } catch (error) {
      console.error("Error saving exercise group:", error);
      alert(`Error saving exercise: ${error.message}`);
      throw error;
    }
  }
}
```

### Task 2: Update Load Logic

**Location**: `loadTemplateExercises` function (around line 256)

**Find this code**:

```typescript
const { data, error } = await supabase
  .from("workout_template_exercises")
  .select(
    `
    *,
    exercise:exercises(id, name, description)
  `
  )
  .eq("template_id", templateId)
  .order("order_index", { ascending: true });
```

**Replace with**:

```typescript
const { data, error } = await supabase
  .from("workout_template_exercises")
  .select(
    `
    *,
    exercise:exercises(id, name, description),
    group:workout_exercise_groups(*)
  `
  )
  .eq("template_id", templateId)
  .order("group_id")
  .order("group_letter");

if (error) throw error;

// Group exercises by group_id for display
const grouped = (data || []).reduce((acc, ex) => {
  const groupId = ex.group_id || `ungrouped-${ex.id}`;
  if (!acc[groupId]) acc[groupId] = [];
  acc[groupId].push(ex);
  return acc;
}, {});

// Set grouped exercises
setExercises(Object.values(grouped).flat());
```

### Task 3: Test the Changes

1. **Start your dev server**

   ```bash
   npm run dev
   ```

2. **Try creating a simple workout**

   - Add a straight set
   - Save
   - Check database to verify group created

3. **Fix any errors**

   - Debug any TypeScript errors
   - Fix any runtime errors

4. **Commit**
   ```bash
   git add src/components/WorkoutTemplateForm.tsx
   git commit -m "Update form to use exercise groups"
   ```

---

## Day 3: Update All Query Files (6-8 hours)

### Pattern for All Files

For each file that queries `workout_template_exercises`, add the join:

**Change from**:

```typescript
.select(`
  *,
  exercise:exercises(id, name, description)
`)
```

**Change to**:

```typescript
.select(`
  *,
  exercise:exercises(id, name, description),
  group:workout_exercise_groups(*)
`)
```

### Files to Update (with approximate line numbers):

1. **`src/components/client/EnhancedClientWorkouts.tsx`**

   - Line 143: Update query
   - Add grouping logic when displaying

2. **`src/components/coach/WorkoutTemplateDetails.tsx`**

   - Line 92: Update query
   - Update display to show groups

3. **`src/components/WorkoutDetailModal.tsx`**

   - Line 137: Update query
   - Update display logic

4. **`src/lib/workoutTemplateService.ts`**

   - Lines 195-216: Update queries
   - Multiple query methods in this file

5. **`src/app/client/workouts/[id]/details/page.tsx`**

   - Add join to groups

6. **`src/app/client/workouts/[id]/start/page.tsx`**

   - Lines 200-300: Add join
   - Update workout execution logic

7. **`src/components/coach/OptimizedWorkoutTemplates.tsx`**

   - Add join

8. **`src/components/coach/client-views/ClientWorkoutsView.tsx`**
   - Add join

9-16. **Other files** that reference `workout_template_exercises`

### Quick Find Script

To find all files that need updating:

```bash
# Run this to find all files using workout_template_exercises
grep -r "from.*workout_template_exercises" src --include="*.tsx" --include="*.ts"
```

### After Each File

Test that file's functionality, then commit:

```bash
git add src/components/client/EnhancedClientWorkouts.tsx
git commit -m "Update EnhancedClientWorkouts to join groups"
```

---

## Day 4: Testing & Cleanup (6-8 hours)

### Test Checklist

Create and test each exercise type:

1. **Straight Set**

   - [ ] Create workout with straight set
   - [ ] Save successfully
   - [ ] Display correctly
   - [ ] Execute workout

2. **Superset**

   - [ ] Create workout with superset
   - [ ] Both exercises save
   - [ ] Display shows A and B
   - [ ] Execute as superset

3. **Giant Set**

   - [ ] Create with 3+ exercises
   - [ ] All save correctly
   - [ ] Display shows group
   - [ ] Execute together

4. **Circuit**

   - [ ] Create circuit with rounds
   - [ ] Multiple exercises save
   - [ ] Timing parameters work
   - [ ] Execute circuit

5. **Tabata**
   - [ ] Create tabata protocol
   - [ ] Timing saves correctly
   - [ ] Execute with timer

6-14. **Test remaining types**

### Final Checks

- [ ] All TypeScript compiles
- [ ] No console errors
- [ ] All forms work
- [ ] All displays work
- [ ] Workout execution works
- [ ] No broken features

### Final Commit

```bash
git add .
git commit -m "Complete exercise groups implementation"
git checkout main
git merge feature/exercise-groups-implementation
git tag v1.1.0-with-exercise-groups
```

---

## Rollback Plan

### If You Need to Revert

**Step 1: Revert Code**

```bash
git checkout main
git branch -D feature/exercise-groups-implementation
```

**Step 2: Revert Database**

```sql
-- Run this in Supabase SQL Editor
-- File: sql/REVERT_exercise_groups.sql
```

**Step 3: Verify**

```sql
-- Check tables removed
SELECT table_name FROM information_schema.tables
WHERE table_name = 'workout_exercise_groups';
-- Should return nothing

-- Check columns removed
SELECT column_name FROM information_schema.columns
WHERE table_name = 'workout_template_exercises'
  AND column_name IN ('group_id', 'group_letter', 'work_seconds', 'weight_kg');
-- Should return nothing
```

---

## Troubleshooting

### Common Issues

**Issue**: "Table already exists"

```sql
-- Run DROP first, then CREATE
DROP TABLE IF EXISTS public.workout_exercise_groups CASCADE;
-- Then run migration again
```

**Issue**: "Column already exists"

```sql
-- Columns already added, that's okay
-- Just proceed to next step
```

**Issue**: TypeScript errors in service

```bash
# Check if types file exists
ls src/types/workoutGroups.ts

# Check if service imports correctly
```

**Issue**: Queries return errors

```sql
-- Check table exists
SELECT * FROM workout_exercise_groups LIMIT 1;

-- Check columns exist
\d workout_template_exercises;
```

---

## Success Indicators

✅ Database: New table created, columns added  
✅ Service: Compiles without errors  
✅ Forms: Can create all exercise types  
✅ Display: Shows grouped exercises  
✅ Execution: Runs workouts correctly  
✅ No errors: Console is clean  
✅ Data saves: Check Supabase after each save

---

## Next Steps After Success

1. Test with more complex workouts
2. Add error handling
3. Optimize queries if needed
4. Update documentation
5. Share with team

---

## Support

If you get stuck:

1. Check the implementation plan document
2. Review the helper service code
3. Look at error messages carefully
4. Test in Supabase SQL Editor directly
5. Use git to revert and try again

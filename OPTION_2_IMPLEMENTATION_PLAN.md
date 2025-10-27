# Option 2 Implementation Plan: Complete Guide

## Overview

**Goal**: Fix messy JSON storage + improve UX with minimal changes  
**Time**: 3-4 days  
**Risk**: Low-Medium

---

## What We're Building

### Database Changes

1. Create `workout_exercise_groups` table
2. Add `group_id` and `group_letter` columns to `workout_template_exercises`
3. Add optional columns for time-based exercises

### Code Changes

1. Create helper service (`workoutGroupService.ts`)
2. Update form to use "type-first" selection
3. Update display to group exercises
4. Update queries to join with groups table
5. Test all exercise types

---

## Step-by-Step Implementation

### Phase 1: Database Schema (Day 1, Morning - 2 hours)

#### Step 1.1: Create SQL Migration File

**File**: `dailyfitness-app/sql/13-exercise-groups-schema.sql`

```sql
-- =====================================================
-- Exercise Groups Schema - Minimal Fix
-- =====================================================
-- This implements proper grouping for supersets, circuits, etc.
-- =====================================================

-- 1. CREATE EXERCISE GROUPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workout_exercise_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,

    -- Group identity
    group_type TEXT NOT NULL CHECK (group_type IN (
        'straight_set', 'superset', 'giant_set', 'circuit', 'tabata',
        'amrap', 'emom', 'drop_set', 'cluster_set', 'rest_pause',
        'pyramid_set', 'pre_exhaustion', 'for_time', 'ladder'
    )),
    group_order INTEGER NOT NULL,

    -- Rest information
    rest_after_seconds INTEGER DEFAULT 60,

    -- Protocol-specific parameters (many will be NULL)
    rounds INTEGER,
    work_seconds INTEGER,
    rest_seconds INTEGER,
    duration_seconds INTEGER,
    reps_per_minute INTEGER,
    drop_percentage DECIMAL(5,2),
    target_reps INTEGER,
    time_cap INTEGER,
    rest_pause_duration INTEGER,
    max_rest_pauses INTEGER,
    clusters_per_set INTEGER,
    intra_cluster_rest INTEGER,
    inter_set_rest INTEGER,

    -- Flexible storage for complex protocols
    group_parameters JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ADD COLUMNS TO EXISTING TABLE
-- =====================================================
ALTER TABLE public.workout_template_exercises
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.workout_exercise_groups(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS group_letter TEXT,
    ADD COLUMN IF NOT EXISTS work_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(8,2);

-- 3. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_workout_exercise_groups_template
    ON public.workout_exercise_groups(template_id);

CREATE INDEX IF NOT EXISTS idx_workout_exercise_groups_order
    ON public.workout_exercise_groups(template_id, group_order);

CREATE INDEX IF NOT EXISTS idx_workout_template_exercises_group
    ON public.workout_template_exercises(group_id);

-- 4. ENABLE RLS
-- =====================================================
ALTER TABLE public.workout_exercise_groups ENABLE ROW LEVEL SECURITY;

-- 5. CREATE RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Coaches can manage exercise groups" ON public.workout_exercise_groups;
CREATE POLICY "Coaches can manage exercise groups" ON public.workout_exercise_groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workout_templates
            WHERE workout_templates.id = workout_exercise_groups.template_id
            AND workout_templates.coach_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Clients can read assigned exercise groups" ON public.workout_exercise_groups;
CREATE POLICY "Clients can read assigned exercise groups" ON public.workout_exercise_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workout_templates
            JOIN public.workout_assignments ON workout_assignments.workout_template_id = workout_templates.id
            WHERE workout_templates.id = workout_exercise_groups.template_id
            AND workout_assignments.client_id = auth.uid()
        )
    );

-- 6. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.workout_exercise_groups TO authenticated;

-- Success message
SELECT 'Exercise groups schema setup completed successfully! 🎉' as message;
```

#### Step 1.2: Run SQL Migration

Execute this in your Supabase SQL editor.

---

### Phase 2: Create Helper Service (Day 1, Afternoon - 4-6 hours)

#### Step 2.1: Create the Service File

**File**: `dailyfitness-app/src/lib/workoutGroupService.ts`

Create this new file with the complete helper service that handles all 14 exercise types.

#### Step 2.2: Create Type Definitions

**File**: `dailyfitness-app/src/types/workoutGroups.ts`

```typescript
export interface WorkoutExerciseGroup {
  id: string;
  template_id: string;
  group_type: ExerciseGroupType;
  group_order: number;
  rest_after_seconds?: number;
  rounds?: number;
  work_seconds?: number;
  rest_seconds?: number;
  duration_seconds?: number;
  reps_per_minute?: number;
  drop_percentage?: number;
  target_reps?: number;
  time_cap?: number;
  rest_pause_duration?: number;
  max_rest_pauses?: number;
  clusters_per_set?: number;
  intra_cluster_rest?: number;
  inter_set_rest?: number;
  group_parameters?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type ExerciseGroupType =
  | "straight_set"
  | "superset"
  | "giant_set"
  | "circuit"
  | "tabata"
  | "amrap"
  | "emom"
  | "drop_set"
  | "cluster_set"
  | "rest_pause"
  | "pyramid_set"
  | "pre_exhaustion"
  | "for_time"
  | "ladder";

export interface ExerciseRow {
  template_id: string;
  exercise_id: string;
  group_id?: string;
  group_letter?: string;
  sets?: number;
  reps?: string;
  rest_seconds?: number;
  work_seconds?: number;
  weight_kg?: number;
  rir?: number;
  tempo?: string;
  notes?: string;
  order_index?: number;
}
```

---

### Phase 3: Update WorkoutTemplateForm (Day 2, Morning - 6-8 hours)

#### Step 3.1: Update Save Logic

**File**: `dailyfitness-app/src/components/WorkoutTemplateForm.tsx`

**Location**: Lines 405-508 (replace the entire save exercise logic)

**OLD CODE** (lines 405-508):

```typescript
if (exercises.length > 0) {
  const exerciseData = exercises.map((exercise, index) => {
    let details = null;
    let notes = exercise.notes || "";

    if (exercise.exercise_type && exercise.exercise_type !== "straight_set") {
      const complexData = {
        // ... 50+ lines of JSON packing
      };
      details = cleanData;
    }

    return {
      template_id: savedTemplateId,
      exercise_id: exercise.exercise_id || null,
      order_index: index + 1,
      sets: exercise.sets === "" ? null : parseInt(exercise.sets) || null,
      // ... more fields
      exercise_type: exercise.exercise_type || "straight_set",
      details: details,
      notes: notes,
    };
  });

  const { error: exerciseError } = await supabase
    .from("workout_template_exercises")
    .insert(exerciseData);
}
```

**NEW CODE** (replace with ~20 lines):

```typescript
if (exercises.length > 0) {
  // Use the helper service to save each exercise group
  for (const exercise of exercises) {
    try {
      await WorkoutGroupService.saveExerciseGroup(savedTemplateId, exercise);
    } catch (error) {
      console.error("Error saving exercise group:", error);
      throw error;
    }
  }
}
```

#### Step 3.2: Update Add Exercise Function

**File**: `dailyfitness-app/src/components/WorkoutTemplateForm.tsx`

**Location**: Lines 544-700 (the `addExercise` function)

This function stays mostly the same but update to use new form structure (type-first selection).

#### Step 3.3: Update Form UI - Type First Selection

**File**: `dailyfitness-app/src/components/WorkoutTemplateForm.tsx`

**Location**: Around lines 700-900 (the form inputs section)

Change the order so exercise_type is selected first, then show appropriate inputs.

---

### Phase 4: Update Display Logic (Day 2, Afternoon - 2-3 hours)

#### Step 4.1: Update Exercise Loading

**File**: `dailyfitness-app/src/components/WorkoutTemplateForm.tsx`

**Location**: Lines 256-320 (`loadTemplateExercises` function)

**OLD**:

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

**NEW**:

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

// Group exercises by group_id for display
const groupedExercises = (data || []).reduce((acc, ex) => {
  const groupId = ex.group_id || `ungrouped-${ex.id}`;
  if (!acc[groupId]) acc[groupId] = [];
  acc[groupId].push(ex);
  return acc;
}, {} as Record<string, typeof data>);
```

#### Step 4.2: Update Exercise Display

**File**: `dailyfitness-app/src/components/WorkoutTemplateForm.tsx`

**Location**: Lines 900-1500 (where exercises are rendered)

Update to show group headers and group exercises together.

---

### Phase 5: Update Query Files (Day 3, Morning - 4-6 hours)

#### Files to Update (Add join to workout_exercise_groups):

1. **`src/components/client/EnhancedClientWorkouts.tsx`**
   - Line 143: Update query to join groups
2. **`src/components/coach/WorkoutTemplateDetails.tsx`**
   - Line 92: Update query to join groups
3. **`src/components/WorkoutDetailModal.tsx`**
   - Line 137: Update query to join groups
4. **`src/lib/workoutTemplateService.ts`**
   - Lines 195-216: Update query to join groups
5. **`src/app/client/workouts/[id]/details/page.tsx`**
   - Add join to groups table
6. **`src/app/client/workouts/[id]/start/page.tsx`**
   - Lines 200-300: Add join and grouping logic
7. **`src/app/client/page.tsx`**
   - Add join to groups
8. **`src/components/coach/OptimizedWorkoutTemplates.tsx`**
   - Add join to groups
9. **`src/components/coach/client-views/ClientWorkoutsView.tsx`**
   - Add join to groups
10. **`src/lib/personalRecords.ts`**
    - Add join to groups
11. **`src/hooks/useWorkoutData.ts`**
    - Add join to groups
12. **`src/lib/prefetch.ts`**
    - Add join to groups
13. **`src/hooks/useWorkoutSummary.ts`**
    - Add join to groups
14. **`src/components/ExerciseSetForm.tsx`**
    - Add join to groups
15. **`src/components/coach/EnhancedProgramManager.tsx`**
    - Add join to groups
16. **Other files referencing workout_template_exercises**
    - Add join to groups

#### Query Change Pattern:

**OLD**:

```typescript
.select(`
  *,
  exercise:exercises(id, name, description)
`)
```

**NEW**:

```typescript
.select(`
  *,
  exercise:exercises(id, name, description),
  group:workout_exercise_groups(*)
`)
```

Then add grouping logic when rendering.

---

### Phase 6: Testing (Day 3-4, 8-10 hours)

#### Test Cases:

1. **Straight Set**

   - Create, save, display, execute

2. **Superset**

   - Create, save, display, execute (both exercises together)

3. **Giant Set**

   - Create, save, display, execute (all exercises)

4. **Circuit**

   - Create with multiple exercises, save, display, execute

5. **Tabata**

   - Create with timing, save, display, execute

6. **AMRAP**

   - Create, save, display, execute

7. **EMOM**

   - Create, save, display, execute

8. **Drop Set**

   - Create, save, display, execute

9. **Cluster Set**

   - Create, save, display, execute

10. **Rest-Pause**

    - Create, save, display, execute

11. **Pyramid Set**

    - Create, save, display, execute

12. **Pre-Exhaustion**

    - Create, save, display, execute

13. **For Time**

    - Create, save, display, execute

14. **Ladder**
    - Create, save, display, execute

#### Additional Tests:

- Update existing workout
- Delete exercise from group
- Add exercise to group
- Reorder exercises in workout
- Test with multiple exercise types in one workout

---

## File Change Summary

### New Files (2 files)

1. `dailyfitness-app/sql/13-exercise-groups-schema.sql`
2. `dailyfitness-app/src/lib/workoutGroupService.ts`
3. `dailyfitness-app/src/types/workoutGroups.ts`

### Modified Files (~20 files)

1. `src/components/WorkoutTemplateForm.tsx` - Major changes
2. `src/components/WorkoutDetailModal.tsx` - Update queries & display
3. `src/components/coach/WorkoutTemplateDetails.tsx` - Update queries
4. `src/components/client/EnhancedClientWorkouts.tsx` - Update queries
5. `src/app/client/workouts/[id]/start/page.tsx` - Update queries & grouping
6. `src/app/client/workouts/[id]/details/page.tsx` - Update queries
7. `src/lib/workoutTemplateService.ts` - Update queries
   8-20. Other files with queries (add join)

---

## Implementation Checklist

### Day 1

- [ ] Create and run SQL migration
- [ ] Create workoutGroupService.ts
- [ ] Create workoutGroups.ts types
- [ ] Test helper service with each exercise type

### Day 2

- [ ] Update WorkoutTemplateForm save logic
- [ ] Update WorkoutTemplateForm display logic
- [ ] Update form UI to type-first selection
- [ ] Test form creation for all types

### Day 3

- [ ] Update queries in all 16 files
- [ ] Update display logic in all files
- [ ] Test all exercise types display
- [ ] Test workout execution

### Day 4

- [ ] Test all exercise types execution
- [ ] Test edge cases
- [ ] Fix any bugs
- [ ] Final testing and cleanup

---

## Success Criteria

- [ ] All 14 exercise types can be created
- [ ] Exercises are properly grouped in database
- [ ] Display shows grouped exercises correctly
- [ ] Workout execution handles all types
- [ ] No JSON parsing needed for exercise types
- [ ] UX improved (type-first selection)
- [ ] All existing tests pass
- [ ] No data loss

---

## Rollback Plan

If issues arise:

1. Git revert the changes
2. Keep database changes (test data only)
3. Fix issues incrementally
4. Re-test and redeploy

# 🚨 CRITICAL ARCHITECTURE FIXES REQUIRED

**Date**: December 29, 2025  
**Severity**: BLOCKER - Must fix before ANY UI work  
**Issue Type**: Core business logic mismatch

---

## 🎯 The Problem in One Sentence

**Your database schema is correct, but your RPC functions and policies implement the WRONG business rules, which will cause progression bugs, duplicate completions, and break your adherence model regardless of what UI you build on top.**

---

## ✅ What Your Final Product MUST Do (Your Rules)

1. **Dashboard**: Shows NEXT DUE WORKOUT from client's active program
2. **No Rest Days**: Rest days are NEVER shown or tracked
3. **Variable Schedule**: Weeks can have 3, 4, 5, or any number of workouts
4. **Flexible Order**: Client can complete workouts in ANY ORDER within current week
5. **Week Locking**: Week N+1 is LOCKED until ALL workouts in Week N are completed
6. **Completion Definition**: Workout session completed via "Complete" button advances progress
7. **Standalone Workouts**: Extra workouts (non-program templates) NEVER affect program progression
8. **Meal Photos**: 1 photo per meal per day, NO replace, NO delete, NO viewing back

**This is coherent and correct for high-adherence coaching.**

---

## ✅ What Your Database Supports (Good News)

Your schema is **already correct** and supports all your rules:

- `program_assignments` has `current_week` and `days_completed_this_week`
- `program_schedule` has `week_number` and `day_of_week` (unique per slot)
- `program_workout_completions` links to `program_assignment_id` and `program_schedule_id`
- Templates repeating across weeks is fine (schedule slots differentiate)

**Database model: ✅ CORRECT**

---

## ❌ What Is Currently WRONG (Will Cause Bugs)

### 🚨 **Critical Issue #1: `get_next_due_workout` RPC Function**

**File**: Database function (needs manual SQL fix)

**Current Implementation Problems**:

```sql
-- WRONG: No week_number filter
SELECT ps.*, ...
FROM program_schedule ps
WHERE ps.program_id = ... 
  AND ps.day_of_week = current_day - 1  -- ❌ Wrong: ignores week
  -- Missing: AND ps.week_number = current_week
LIMIT 1;

-- WRONG: Returns "rest day" text
IF NOT FOUND THEN
  RETURN ... 'message': 'Rest day - no workout scheduled';  -- ❌ Forbidden

-- WRONG: Hardcoded 6 workouts/week assumption
IF days_completed >= 6 THEN  -- ❌ Wrong: assumes fixed schedule
  -- Advance week logic

-- WRONG: Doesn't match progression rules to specific slot
SELECT * FROM program_progression_rules
WHERE program_id = ...
  AND week_number = ...
LIMIT 1;  -- ❌ Wrong: needs to match exercise_id/block_id
```

**Impact**:
- Returns wrong workout (ignores which week client is on)
- Shows "rest day" (you explicitly forbid this)
- Can't handle variable workouts/week (assumes 6)
- Progression rules not matched to specific exercises
- "Next due" concept broken

---

### 🚨 **Critical Issue #2: `complete_workout` RPC Function**

**File**: Database function (needs manual SQL fix)

**Current Implementation Problems**:

```sql
-- WRONG: Sequential day enforcement (blocks "any order")
SELECT ps.* FROM program_schedule ps
WHERE ps.program_id = ...
  AND ps.day_of_week = current_day - 1  -- ❌ Forces strict order
  -- Missing: Check if THIS specific slot is incomplete

-- WRONG: Hardcoded 6 workouts/week
IF new_days_completed >= 6 THEN  -- ❌ Wrong: variable schedule
  -- Advance week

-- WRONG: Advances current_day sequentially
UPDATE program_assignments
SET current_day = current_day + 1  -- ❌ Wrong: client chooses order

-- WRONG: Based on template_id match
AND wt.id = ps.workout_template_id  -- ❌ Wrong: templates repeat across weeks
```

**Impact**:
- Client CANNOT complete workouts in any order (your rule #4 impossible)
- Week advancement triggers at wrong time (assumes 6 workouts)
- `current_day` becomes meaningless with flexible order
- Can complete wrong week's workout (template ID collision)

---

### 🚨 **Critical Issue #3: No Uniqueness Constraint on Completions**

**File**: `program_workout_completions` table schema

**Current Schema**:
```sql
CREATE TABLE program_workout_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_assignment_id UUID REFERENCES program_assignments(id),
  program_schedule_id UUID REFERENCES program_schedule(id),
  workout_log_id UUID REFERENCES workout_logs(id),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- ❌ MISSING: UNIQUE constraint on (program_assignment_id, program_schedule_id)
);
```

**Impact**:
- Double-clicking "Complete" can insert duplicate rows
- `days_completed_this_week` can inflate (counts duplicates)
- Weeks can advance prematurely (duplicate count triggers advancement)
- Program metrics corrupted (duplicate completions counted)

**Required Fix**:
```sql
ALTER TABLE program_workout_completions
ADD CONSTRAINT unique_slot_completion 
UNIQUE (program_assignment_id, program_schedule_id);
```

---

### 🚨 **Critical Issue #4: Meal Photo Policies Contradict Rules**

**Current State vs Required State**:

| Aspect | Current (WRONG) | Required (Correct) |
|--------|-----------------|-------------------|
| **RLS Policy** | Client can UPDATE | Client INSERT only |
| **RLS Policy** | Client can DELETE | Client cannot DELETE |
| **Service** | `replaceMealPhoto()` exists | No replace function |
| **UI** | Shows photos back to client | Photos hidden from client |
| **UI** | "Update Photo" button | Only "Log Meal" (once) |
| **Storage Policy** | Client can delete files | Client cannot delete |

**Files Affected**:
- `migrations/2025-12-28_canonical_meal_photos.sql` - RLS policies
- `src/lib/mealPhotoService.ts` - Has replace logic
- `src/app/client/nutrition/page.tsx` - Shows photos, "Update Photo" button
- `src/app/client/progress/nutrition/page.tsx` - Shows photos
- Storage bucket policies - Allow client DELETE

**Impact**:
- Clients can alter "proof" (undermines accountability)
- Clients can delete evidence (undermines adherence tracking)
- Coaches can't trust meal logs (client can manipulate)
- Your core value prop (accountability) is broken

---

## 🔧 Required Fixes (In Order)

### **Fix #1: Rewrite `get_next_due_workout` Function**

**Goals**:
1. Return next INCOMPLETE workout in CURRENT WEEK
2. If all workouts in current week done, return "Week X Complete! Week X+1 starts [date]"
3. NO "rest day" ever
4. Support variable workouts/week (count from `program_schedule`)
5. Match progression rules to specific slot/exercise

**New Logic**:
```sql
CREATE OR REPLACE FUNCTION get_next_due_workout(p_client_id UUID)
RETURNS JSON AS $$
DECLARE
  v_assignment RECORD;
  v_schedule RECORD;
  v_total_workouts_this_week INT;
  v_result JSON;
BEGIN
  -- Get active program assignment
  SELECT * INTO v_assignment
  FROM program_assignments
  WHERE client_id = p_client_id
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY start_date DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'status', 'no_active_program',
      'message', 'No active program assigned'
    );
  END IF;

  -- Count total workouts in current week (variable schedule)
  SELECT COUNT(*) INTO v_total_workouts_this_week
  FROM program_schedule
  WHERE program_id = v_assignment.program_id
    AND week_number = v_assignment.current_week;

  -- Check if all workouts in current week are completed
  IF v_assignment.days_completed_this_week >= v_total_workouts_this_week THEN
    -- Week is complete
    RETURN json_build_object(
      'status', 'week_complete',
      'message', 'Week ' || v_assignment.current_week || ' complete!',
      'current_week', v_assignment.current_week,
      'next_week', v_assignment.current_week + 1,
      'next_week_start_date', v_assignment.week_start_date + INTERVAL '7 days'
    );
  END IF;

  -- Find FIRST INCOMPLETE workout in current week (any order)
  SELECT ps.* INTO v_schedule
  FROM program_schedule ps
  WHERE ps.program_id = v_assignment.program_id
    AND ps.week_number = v_assignment.current_week
    AND NOT EXISTS (
      -- Check if this slot is already completed
      SELECT 1 FROM program_workout_completions pwc
      WHERE pwc.program_assignment_id = v_assignment.id
        AND pwc.program_schedule_id = ps.id
    )
  ORDER BY ps.day_of_week  -- Suggest order, but client can choose any
  LIMIT 1;

  IF NOT FOUND THEN
    -- Should not happen (caught above), but safety check
    RETURN json_build_object(
      'status', 'week_complete',
      'message', 'All workouts in current week completed'
    );
  END IF;

  -- Build result with workout details + progression rules
  SELECT json_build_object(
    'status', 'workout_due',
    'program_assignment_id', v_assignment.id,
    'program_schedule_id', v_schedule.id,
    'workout_template_id', v_schedule.workout_template_id,
    'week_number', v_schedule.week_number,
    'day_of_week', v_schedule.day_of_week,
    'week_progress', json_build_object(
      'completed', v_assignment.days_completed_this_week,
      'total', v_total_workouts_this_week
    ),
    'workout_details', (
      SELECT row_to_json(wt.*) FROM workout_templates wt WHERE wt.id = v_schedule.workout_template_id
    ),
    'progression_rules', (
      -- Get all progression rules for this week's exercises
      SELECT json_agg(ppr.*)
      FROM program_progression_rules ppr
      WHERE ppr.program_id = v_assignment.program_id
        AND ppr.week_number = v_schedule.week_number
        -- Match to workout blocks for this template
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Key Changes**:
- ✅ Filters by `current_week` (week-aware)
- ✅ No "rest day" logic (removed entirely)
- ✅ Counts workouts dynamically from `program_schedule` (variable schedule)
- ✅ Checks `program_workout_completions` for slot completion (any order)
- ✅ Returns "week complete" when all done (no premature advancement)
- ✅ Returns progression rules matched to week

---

### **Fix #2: Rewrite `complete_workout` Function**

**Goals**:
1. Complete SPECIFIC SLOT (not "next in sequence")
2. Increment `days_completed_this_week` correctly
3. Advance to next week ONLY when ALL current week slots done
4. Support "any order" completion
5. Prevent duplicates (with uniqueness constraint)

**New Logic**:
```sql
CREATE OR REPLACE FUNCTION complete_workout(
  p_program_assignment_id UUID,
  p_program_schedule_id UUID,
  p_workout_log_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_assignment RECORD;
  v_schedule RECORD;
  v_total_workouts_this_week INT;
  v_new_days_completed INT;
  v_week_complete BOOLEAN;
BEGIN
  -- Get assignment
  SELECT * INTO v_assignment
  FROM program_assignments
  WHERE id = p_program_assignment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Program assignment not found');
  END IF;

  -- Get schedule slot
  SELECT * INTO v_schedule
  FROM program_schedule
  WHERE id = p_program_schedule_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Schedule slot not found');
  END IF;

  -- Verify slot belongs to current week
  IF v_schedule.week_number != v_assignment.current_week THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot complete workout from week ' || v_schedule.week_number || 
               '. You are currently on week ' || v_assignment.current_week
    );
  END IF;

  -- Insert completion (will fail if duplicate due to UNIQUE constraint)
  BEGIN
    INSERT INTO program_workout_completions (
      program_assignment_id,
      program_schedule_id,
      workout_log_id,
      completed_at
    ) VALUES (
      p_program_assignment_id,
      p_program_schedule_id,
      p_workout_log_id,
      NOW()
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This workout has already been completed'
    );
  END;

  -- Increment days_completed_this_week
  UPDATE program_assignments
  SET days_completed_this_week = days_completed_this_week + 1,
      last_workout_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE id = p_program_assignment_id
  RETURNING days_completed_this_week INTO v_new_days_completed;

  -- Count total workouts in this week
  SELECT COUNT(*) INTO v_total_workouts_this_week
  FROM program_schedule
  WHERE program_id = v_assignment.program_id
    AND week_number = v_assignment.current_week;

  -- Check if week is now complete
  v_week_complete := (v_new_days_completed >= v_total_workouts_this_week);

  -- If week complete, advance to next week
  IF v_week_complete THEN
    UPDATE program_assignments
    SET current_week = current_week + 1,
        days_completed_this_week = 0,
        week_start_date = week_start_date + INTERVAL '7 days',
        updated_at = NOW()
    WHERE id = p_program_assignment_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'days_completed', v_new_days_completed,
    'total_workouts_this_week', v_total_workouts_this_week,
    'week_complete', v_week_complete,
    'next_week', CASE WHEN v_week_complete THEN v_assignment.current_week + 1 ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Key Changes**:
- ✅ Takes `program_schedule_id` (specific slot, not day_of_week)
- ✅ Verifies slot is in current week (blocks wrong week completion)
- ✅ No sequential `current_day` advancement (removed)
- ✅ Counts total dynamically (variable schedule)
- ✅ Only advances week when ALL slots done
- ✅ Handles duplicate attempts gracefully (UNIQUE constraint)

---

### **Fix #3: Add Uniqueness Constraint**

**SQL**:
```sql
-- Prevent duplicate completions of same slot
ALTER TABLE program_workout_completions
ADD CONSTRAINT unique_slot_completion 
UNIQUE (program_assignment_id, program_schedule_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_program_completions_assignment_schedule
ON program_workout_completions(program_assignment_id, program_schedule_id);
```

**Impact**:
- Duplicate clicks will fail gracefully
- `days_completed_this_week` stays accurate
- Week progression triggers correctly

---

### **Fix #4: Lock Down Meal Photo Policies**

#### **4a. Fix RLS Policies (Database)**

**SQL**:
```sql
-- Drop old policies that allow UPDATE/DELETE
DROP POLICY IF EXISTS "meal_photos_update_own" ON meal_photo_logs;
DROP POLICY IF EXISTS "meal_photos_delete_own" ON meal_photo_logs;

-- Keep only INSERT and SELECT for clients
-- (Policies already exist from Slice 12, just verify they're correct)

-- Verify INSERT policy (one-shot only)
-- Should already exist from migration:
-- CREATE POLICY "meal_photos_insert_own" ON meal_photo_logs FOR INSERT
-- WITH CHECK (auth.uid() = client_id);

-- Verify SELECT policy (coaches only, NOT clients)
-- CREATE POLICY "meal_photos_select_coach" ON meal_photo_logs FOR SELECT
-- USING (...coach check...);

-- Add comment to clarify intent
COMMENT ON TABLE meal_photo_logs IS 
'Meal photo proof - clients can INSERT once per meal per day (enforced by unique constraint). 
NO UPDATE or DELETE allowed. Photos are for coach accountability tracking only.';
```

#### **4b. Remove Replace Logic from Service**

**File**: `src/lib/mealPhotoService.ts`

**Changes Needed**:
```typescript
// REMOVE the replaceMealPhoto function entirely
// REMOVE this block from uploadMealPhoto:

// Check if photo already logged for this meal today
const existingLog = await getMealPhotoForDate(clientId, mealId, dateStr);

if (existingLog) {
  // ❌ REMOVE: Replace existing photo
  return await replaceMealPhoto(existingLog.id, file, notes);
}

// REPLACE WITH:

if (existingLog) {
  return {
    success: false,
    error: 'You have already logged this meal today. Meal photos cannot be changed once submitted.',
    replacedExisting: false
  };
}
```

#### **4c. Update Storage Bucket Policies**

**In Supabase Dashboard → Storage → meal-photos → Policies**:

**Remove**:
- Any DELETE policy for clients
- Any UPDATE policy for clients

**Keep Only**:
```sql
-- Clients can upload their own (INSERT)
CREATE POLICY "meal_photo_upload_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'meal-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Coaches can view all (SELECT)
CREATE POLICY "meal_photo_select_coach"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'meal-photos'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('coach', 'admin', 'super_coach', 'supercoach')
  )
);

-- Coaches can delete (for admin purposes only)
CREATE POLICY "meal_photo_delete_coach"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'meal-photos'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('coach', 'admin', 'super_coach', 'supercoach')
  )
);
```

#### **4d. Update Client Nutrition UI**

**File**: `src/app/client/nutrition/page.tsx`

**Changes**:
```typescript
// BEFORE (WRONG):
{meal.logged ? (
  <>
    <Camera className="w-5 h-5" />
    <span>Update Photo</span>  // ❌ REMOVE
  </>
) : (
  <>
    <Camera className="w-5 h-5" />
    <span>Log {meal.name} with Photo</span>
  </>
)}

// AFTER (CORRECT):
{meal.logged ? (
  <>
    <Check className="w-5 h-5" />
    <span>Meal Logged ✓</span>  // ✅ Locked state
  </>
) : (
  <>
    <Camera className="w-5 h-5" />
    <span>Log {meal.name} with Photo</span>
  </>
)}

// Make button disabled when logged
<Button
  disabled={uploadingMeal === meal.id || meal.logged}  // ✅ Disable when logged
  style={{
    background: meal.logged
      ? "rgba(0,0,0,0.05)"  // Greyed out
      : getSemanticColor("success").gradient,
    cursor: meal.logged ? 'not-allowed' : 'pointer'
  }}
>
```

**Also**:
- **Remove** `photoUrl` display (clients should NOT see photos back)
- **Remove** "View Photo" functionality
- **Add** confirmation modal before upload: "Once submitted, meal photos cannot be changed. Continue?"

---

## 📱 Required UI/UX Changes (Tied to Fixed Logic)

### **1. Client Dashboard (`/client/page.tsx`)**

**Current**: Shows today's workout (calendar-based)  
**Required**: Shows NEXT DUE workout from `get_next_due_workout()`

**Changes**:
```typescript
// Call new RPC function
const { data: nextWorkout } = await supabase.rpc('get_next_due_workout', {
  p_client_id: user.id
});

// Display based on status
if (nextWorkout.status === 'workout_due') {
  // Show workout card with:
  // - Workout name
  // - Week X, Day Y
  // - Progress: "3/5 workouts this week"
  // - "Start Workout" button
  
} else if (nextWorkout.status === 'week_complete') {
  // Show celebration card:
  // - "Week X Complete! 🎉"
  // - "Week X+1 starts [date]"
  // - Option to view Week X+1 preview (locked)
  
} else if (nextWorkout.status === 'no_active_program') {
  // Show "No active program" state
}
```

**Also Add**: Week checklist UI (optional but helpful)
```typescript
// Fetch all workouts in current week + completion status
const { data: weekWorkouts } = await supabase
  .from('program_schedule')
  .select(`
    *,
    completion:program_workout_completions(id, completed_at)
  `)
  .eq('program_id', programId)
  .eq('week_number', currentWeek)
  .order('day_of_week');

// Display as checklist:
// ✓ Workout 1: Upper Body (Mon) - Completed
// ○ Workout 2: Lower Body (Wed) - Due
// ○ Workout 3: Full Body (Fri) - Due
```

---

### **2. Workout Completion Flow (`/client/workouts/[id]/start` → Complete)**

**Current**: Completes workout_log, doesn't link to program slot  
**Required**: Completes specific program_schedule_id

**Changes in Complete Button Handler**:
```typescript
// When completing workout:
const { data, error } = await supabase.rpc('complete_workout', {
  p_program_assignment_id: assignment.id,  // From assignment
  p_program_schedule_id: nextWorkout.program_schedule_id,  // From get_next_due_workout
  p_workout_log_id: workoutLog.id  // From session
});

if (data.success) {
  if (data.week_complete) {
    // Show "Week Complete!" celebration
    // Redirect to dashboard with confetti animation
  } else {
    // Show "Workout Complete!"
    // Display: "{data.days_completed}/{data.total_workouts_this_week} this week"
    // Redirect to dashboard (will show next due workout)
  }
} else {
  // Show error (e.g., "This workout was already completed")
}
```

**Critical**: Workout start/complete flow must ALWAYS pass through:
1. Get `nextWorkout` from `get_next_due_workout()`
2. Start workout using `nextWorkout.workout_template_id`
3. Complete using `nextWorkout.program_schedule_id`

**DO NOT** allow completing standalone templates as program workouts.

---

### **3. Nutrition Page (`/client/nutrition/page.tsx`)**

**Required Changes**:
1. **Before Upload**: Show confirmation modal
   ```typescript
   "Once submitted, this meal photo cannot be changed. Are you sure?"
   [Cancel] [Confirm and Upload]
   ```

2. **During Upload**: Show progress
   ```typescript
   "Uploading meal photo..."
   [Progress bar]
   ```

3. **After Upload**: Lock the UI
   ```typescript
   [✓] Meal Logged
   // Button disabled, greyed out
   // NO photo preview shown
   ```

4. **Remove**:
   - All `photoUrl` displays
   - "View Photo" links
   - "Update Photo" buttons
   - Photo gallery/preview components

5. **Add**: Daily summary
   ```typescript
   "Today's Meals: 3/4 logged"
   // Simple count, no photos
   ```

---

### **4. Coach Client Detail (`/coach/clients/[id]/page.tsx`)**

**Current**: All hardcoded data  
**Required**: Real adherence metrics

**Priority Metrics to Show**:
```typescript
// 1. Today's Program Adherence
const todaysWorkout = await supabase.rpc('get_next_due_workout', {
  p_client_id: clientId
});

// Display:
// - "Next Due: Upper Body (Week 3, Day 2)"
// - "Week Progress: 1/4 workouts completed"
// - Status badge: "On Track" | "Behind" | "Week Complete"

// 2. Today's Meal Adherence
const { data: todaysMeals } = await supabase
  .from('meal_photo_logs')
  .select('meal_id, log_date')
  .eq('client_id', clientId)
  .eq('log_date', today);

const { data: assignedMeals } = await supabase
  .from('meal_plan_assignments')
  .select('meals_count')  // Or query meal_plan details
  .eq('client_id', clientId)
  .eq('status', 'active');

// Display:
// - "Today's Meals: 3/4 logged"
// - Status badge: "Compliant" | "Partial" | "Not Logged"

// 3. This Week's Compliance
// Calculate from workout_logs + program requirements
// Calculate from meal_photo_logs + meal plan requirements
```

**Remove**: All hardcoded client data (name, stats, activity)  
**Replace**: Query from `profiles`, `workout_logs`, `program_assignments`

---

## ⏱️ Implementation Order (Critical Path)

### **Phase 1: Database Logic (MUST DO FIRST) - 4-6 hours**
1. ✅ Add uniqueness constraint to `program_workout_completions`
2. ✅ Rewrite `get_next_due_workout` RPC function
3. ✅ Rewrite `complete_workout` RPC function
4. ✅ Test both functions with SQL queries (verify week advancement)
5. ✅ Lock down meal photo RLS policies (remove UPDATE/DELETE)
6. ✅ Lock down storage bucket policies

**Why First**: No point fixing UI if the underlying logic is wrong.

---

### **Phase 2: Service Layer Updates - 2-3 hours**
1. ✅ Update `mealPhotoService.ts` - remove replace logic, add "already logged" error
2. ✅ Create `programProgressionService.ts` wrapper for new RPC functions
   ```typescript
   export async function getNextDueWorkout(clientId: string) {
     const { data, error } = await supabase.rpc('get_next_due_workout', {
       p_client_id: clientId
     });
     return data;
   }

   export async function completeWorkout(
     assignmentId: string,
     scheduleId: string,
     workoutLogId: string
   ) {
     const { data, error } = await supabase.rpc('complete_workout', {
       p_program_assignment_id: assignmentId,
       p_program_schedule_id: scheduleId,
       p_workout_log_id: workoutLogId
     });
     return data;
   }
   ```

---

### **Phase 3: UI Updates - 6-8 hours**
1. ✅ Update `/client/page.tsx` - use `getNextDueWorkout()`, show week progress
2. ✅ Update `/client/workouts/[id]/start` - ensure it gets workout from next due
3. ✅ Update workout complete flow - call `completeWorkout()` with schedule ID
4. ✅ Update `/client/nutrition/page.tsx` - one-shot UI, no photo viewing
5. ✅ Update `/client/progress/nutrition/page.tsx` - same changes
6. ✅ Update `/coach/clients/[id]/page.tsx` - show real adherence metrics

---

### **Phase 4: Testing (CRITICAL) - 4 hours**
1. ✅ Test program progression with 3-workout week
2. ✅ Test program progression with 5-workout week
3. ✅ Test completing workouts in random order
4. ✅ Test week advancement (all workouts → next week)
5. ✅ Test week locking (can't complete Week 2 while on Week 1)
6. ✅ Test duplicate completion (should fail gracefully)
7. ✅ Test meal photo logging (one-shot, no replace)
8. ✅ Test meal photo viewing (client can't see, coach can)

---

## 🎯 Expected Outcomes After Fixes

### **Before (Current - Broken)**:
- ❌ Next workout shown is wrong (ignores week)
- ❌ "Rest days" appear (forbidden)
- ❌ Can't complete workouts in any order
- ❌ Weeks advance incorrectly (hardcoded 6)
- ❌ Duplicate completions inflate progress
- ❌ Clients can edit meal photos (no accountability)

### **After (Fixed - Correct)**:
- ✅ Next workout is always the first incomplete in current week
- ✅ No "rest days" ever shown
- ✅ Client can complete workouts in any order
- ✅ Week advances only when ALL current week done (variable schedule)
- ✅ Duplicate completions prevented (UNIQUE constraint)
- ✅ Meal photos are one-shot proof (no editing)

---

## 🚨 Why This Is More Critical Than Frontend Gaps

**Frontend-Backend Gaps** (from previous analysis):
- Pages not using service layers
- Hardcoded data
- Missing UI for new features
- **Impact**: Poor UX, but app functions

**Architecture Logic Bugs** (this document):
- Core progression logic is wrong
- Meal accountability is broken
- Duplicate data corruption possible
- **Impact**: App breaks, data corrupted, users confused, coaching workflow fails

**You MUST fix architecture issues FIRST**, then fix frontend gaps.

---

## ✅ Definition of Done

**This issue is FIXED when**:
1. [ ] `get_next_due_workout` returns correct workout for current week, any variable schedule
2. [ ] `complete_workout` allows any-order completion and advances week correctly
3. [ ] Duplicate completions are prevented (UNIQUE constraint)
4. [ ] Client dashboard shows real "next due workout"
5. [ ] Week progression works with 3, 4, 5+ workouts/week
6. [ ] Meal photos are one-shot (no replace/delete/view)
7. [ ] All 8 test cases in Phase 4 pass

---

## 📊 Estimated Total Effort

| Phase | Hours | Priority |
|-------|-------|----------|
| Database Logic | 4-6h | P0 (BLOCKER) |
| Service Layer | 2-3h | P0 (BLOCKER) |
| UI Updates | 6-8h | P1 (Required) |
| Testing | 4h | P1 (Required) |
| **TOTAL** | **16-21 hours** | **2-3 days** |

**This MUST be done before January launch.**

---

**End of Critical Architecture Fixes Document**


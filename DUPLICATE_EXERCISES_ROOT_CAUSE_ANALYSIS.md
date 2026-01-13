# Duplicate Exercises - Root Cause Analysis

## Problem
You have **523 exercises** but only added **400**, meaning there are **123 duplicate exercises**.

## Root Causes Identified

### 1. **No Database Unique Constraint** ❌
The `exercises` table does NOT have a unique constraint on `(name, coach_id)`. This means the database allows multiple exercises with the same name for the same coach.

**Evidence:**
- No unique constraint found in schema
- Only primary key constraint exists on `id`
- Only index exists on `coach_id` (not unique)

### 2. **Bulk Insert Scripts Have No Duplicate Prevention** ❌
The bulk insert SQL scripts (`BULK_INSERT_EXERCISES_PART1.sql` through `PART4.sql`) use plain `INSERT` statements without checking if exercises already exist.

**What happens:**
- If you run the scripts once → 400 exercises created ✅
- If you run the scripts again → 400 more duplicates created ❌
- If you run them a third time → 400 more duplicates ❌

**The scripts use:**
```sql
INSERT INTO exercises (name, coach_id, category, muscle_groups, equipment_types)
VALUES
  ('Back Squat', '...', '...', '...', '...'),
  ...
```

**They should use:**
```sql
INSERT INTO exercises (name, coach_id, category, muscle_groups, equipment_types)
VALUES
  ('Back Squat', '...', '...', '...', '...')
ON CONFLICT (name, coach_id) DO NOTHING;
```
(But this requires a unique constraint first)

### 3. **ExerciseForm Component Has No Duplicate Check** ❌
When creating a new exercise through the UI (`ExerciseForm.tsx`), there's no check to see if an exercise with the same name already exists for that coach.

**Current code (line 229-232):**
```typescript
const { error, data } = await supabase
  .from('exercises')
  .insert(exerciseData)  // ❌ No duplicate check
  .select()
```

**What should happen:**
Before inserting, check if an exercise with the same name and coach_id already exists.

## Most Likely Scenario

**The bulk insert scripts were run multiple times.**

This is the most probable cause because:
1. You added 400 exercises via bulk insert
2. You now have 523 exercises (123 duplicates)
3. If scripts were run twice: 400 + 400 = 800 (but you have 523, so maybe partial runs or some were deleted)
4. The duplicates likely have identical or very similar `created_at` timestamps

## How to Verify

Run the diagnostic script: `DIAGNOSE_DUPLICATE_CAUSE.sql`

This will show:
- If duplicates have the same `created_at` timestamp (bulk insert multiple runs)
- The distribution of when duplicates were created
- Whether a unique constraint exists

## Solutions

### Immediate Fix (Remove Duplicates)
1. Run `FIND_DUPLICATE_EXERCISES.sql` to see what duplicates exist
2. Run `DELETE_DUPLICATE_EXERCISES.sql` to remove duplicates (keeps oldest)

### Long-term Prevention

#### Option 1: Add Database Unique Constraint (Recommended)
```sql
-- Add unique constraint to prevent duplicates at database level
ALTER TABLE exercises 
ADD CONSTRAINT unique_exercise_name_per_coach 
UNIQUE (name, coach_id);
```

**Pros:**
- Prevents duplicates at database level (most reliable)
- Works for both bulk inserts and UI creation
- Database enforces it automatically

**Cons:**
- Need to remove existing duplicates first
- Will fail if duplicates exist when adding constraint

#### Option 2: Add Duplicate Check in ExerciseForm
Add a check before inserting:
```typescript
// Check if exercise already exists
const { data: existing } = await supabase
  .from('exercises')
  .select('id')
  .eq('name', exerciseData.name)
  .eq('coach_id', exerciseData.coach_id)
  .single();

if (existing) {
  // Show error or update existing
  return;
}
```

**Pros:**
- Prevents duplicates from UI
- Can show user-friendly error message

**Cons:**
- Doesn't prevent duplicates from SQL scripts
- Race condition possible (two users create same exercise simultaneously)

#### Option 3: Update Bulk Insert Scripts to Use INSERT ... ON CONFLICT
```sql
INSERT INTO exercises (name, coach_id, category, muscle_groups, equipment_types)
VALUES
  ('Back Squat', '...', '...', '...', '...')
ON CONFLICT (name, coach_id) DO NOTHING;
```

**Pros:**
- Safe to run multiple times
- Won't create duplicates

**Cons:**
- Requires unique constraint first
- Only works for bulk inserts, not UI

## Recommended Approach

**Do all three:**
1. ✅ Remove existing duplicates (run DELETE script)
2. ✅ Add unique constraint to database
3. ✅ Add duplicate check in ExerciseForm (for better UX)
4. ✅ Update bulk insert scripts to use ON CONFLICT (for safety)

This provides defense in depth - multiple layers of protection against duplicates.

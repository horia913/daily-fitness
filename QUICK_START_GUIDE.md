# Quick Start: Exercise Groups Implementation

## What This Solves

- ✅ Fixes messy JSON storage in `notes` field
- ✅ Fixes UX issue (forced main exercise selection)
- ✅ Clean relational database structure
- ✅ Proper grouping for supersets, circuits, tabata, etc.

---

## Implementation Summary

**Time**: 3-4 days  
**Files to change**: ~20 files  
**Database changes**: Add 1 table + 4 columns  
**Risk**: Low (test data only)

---

## Before You Start

### 1. Backup Your Database (15 minutes)

```bash
# 1. Commit everything to git
git add .
git commit -m "Backup before exercise groups implementation"
git tag backup-before-exercise-groups

# 2. Create a branch for the feature
git checkout -b feature/exercise-groups
```

### 2. Document Current Schema (5 minutes)

```sql
-- Run this in Supabase SQL Editor and save the output
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_template_exercises'
ORDER BY column_name;
```

---

## Implementation Steps

### Day 1: Database Setup (2 hours)

1. **Run SQL migration**

   - File: `sql/13-exercise-groups-schema.sql`
   - In Supabase SQL Editor
   - Verifies tables and columns are created

2. **Verify setup**

   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_name = 'workout_exercise_groups';

   -- Check columns added
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'workout_template_exercises'
     AND column_name IN ('group_id', 'group_letter');
   ```

3. **Commit**
   ```bash
   git add sql/13-exercise-groups-schema.sql
   git commit -m "Add exercise groups schema"
   ```

---

### Day 2: Helper Service & Form (8-10 hours)

1. **Service is already created** ✅

   - File: `src/lib/workoutGroupService.ts`
   - File: `src/types/workoutGroups.ts`

2. **Update WorkoutTemplateForm.tsx**

   - Line 405-508: Replace save logic
   - Line 256-320: Update load logic
   - Line 700-900: Update UI (type-first selection)

3. **Test basic save**

   - Create a straight_set
   - Create a superset
   - Verify in database

4. **Commit**
   ```bash
   git add src/lib/workoutGroupService.ts src/types/workoutGroups.ts
   git add src/components/WorkoutTemplateForm.tsx
   git commit -m "Add group service and update form"
   ```

---

### Day 3: Update Queries (6-8 hours)

1. **Update 16 files** to add join:

```typescript
// Find this pattern:
.select(`
  *,
  exercise:exercises(id, name, description)
`)

// Add one line:
.select(`
  *,
  exercise:exercises(id, name, description),
  group:workout_exercise_groups(*)  // ← Add this
`)
```

Files to update:

- `src/components/client/EnhancedClientWorkouts.tsx`
- `src/components/coach/WorkoutTemplateDetails.tsx`
- `src/components/WorkoutDetailModal.tsx`
- `src/lib/workoutTemplateService.ts`
- `src/app/client/workouts/[id]/start/page.tsx`
- `src/app/client/workouts/[id]/details/page.tsx`
- - 10 more files

2. **Commit**
   ```bash
   git commit -m "Update queries to join groups"
   ```

---

### Day 4: Testing (6-8 hours)

Test all 14 exercise types:

- [ ] straight_set
- [ ] superset
- [ ] giant_set
- [ ] circuit
- [ ] tabata
- [ ] amrap
- [ ] emom
- [ ] drop_set
- [ ] cluster_set
- [ ] rest_pause
- [ ] pyramid_set
- [ ] pre_exhaustion
- [ ] for_time
- [ ] ladder

For each: Create → Save → Display → Execute

---

## If Something Goes Wrong

### Revert Database

```sql
-- Run this in Supabase SQL Editor:
-- File: sql/REVERT_exercise_groups.sql
```

This will:

- Drop `workout_exercise_groups` table
- Remove columns from `workout_template_exercises`
- Restore database to original state

### Revert Code

```bash
git checkout main
git branch -D feature/exercise-groups
```

---

## Success Checklist

- [ ] Database tables created
- [ ] Helper service compiles
- [ ] Forms updated
- [ ] All queries updated
- [ ] All 14 types work
- [ ] Display shows grouped exercises
- [ ] Workout execution works
- [ ] No JSON parsing needed
- [ ] Better UX (type-first)

---

## Files Created

✅ `sql/13-exercise-groups-schema.sql` - Database migration  
✅ `sql/REVERT_exercise_groups.sql` - Rollback SQL  
✅ `src/lib/workoutGroupService.ts` - Helper service  
✅ `src/types/workoutGroups.ts` - TypeScript types  
✅ `OPTION_2_IMPLEMENTATION_PLAN.md` - Full guide  
✅ `BACKUP_AND_REVERT_GUIDE.md` - Backup instructions

---

## Next Step

**Start with Day 1:**

1. Run `sql/13-exercise-groups-schema.sql` in Supabase
2. Verify tables created
3. Test helper service compiles

Ready to begin!

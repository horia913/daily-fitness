# Database Backup and Revert Guide

## Before Making Changes

⚠️ **IMPORTANT**: Backup your database before running any migration!

---

## Method 1: Complete Database Backup (Recommended for Production)

### Step 1: Export Schema

**In Supabase Dashboard**:

1. Go to **Settings** → **Database**
2. Click **"Export Schema"**
3. Save as: `backup_schema_YYYY_MM_DD.sql`

This creates a complete snapshot of your database structure.

### Step 2: Export Data (if needed)

**In Supabase SQL Editor**:

```sql
-- Export all data from workout tables
COPY (
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT * FROM workout_templates
  ) t
) TO '/tmp/workout_templates_backup.json';

-- Export workout_template_exercises
COPY (
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT * FROM workout_template_exercises
  ) t
) TO '/tmp/workout_template_exercises_backup.json';

-- Export all other workout-related tables
COPY (
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT * FROM workout_assignments
  ) t
) TO '/tmp/workout_assignments_backup.json';

COPY (
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT * FROM exercises
  ) t
) TO '/tmp/exercises_backup.json';
```

Or use Supabase dashboard:

1. Go to **Table Editor**
2. Select table
3. Click **"Export"** (downloads as CSV/JSON)

---

## Method 2: Create Migration Backup (Simple for Test Data)

### Create Revert SQL Script

**File**: `dailyfitness-app/sql/BACKUP_before_exercise_groups.sql`

```sql
-- =====================================================
-- BACKUP: Database State Before Exercise Groups Migration
-- =====================================================
-- Run this BEFORE implementing exercise groups
-- Save this in case you need to revert
-- =====================================================

-- This script is a template for creating your backup
-- Manually copy your current schema structure here

-- Example: Document current column structure
-- workout_template_exercises table currently has:
--   - id, template_id, exercise_id, order_index
--   - sets, reps, rest_seconds
--   - notes, details (JSONB)
--   - exercise_type
--   - created_at

-- To revert, you would:
--   1. DROP workout_exercise_groups table
--   2. REMOVE added columns from workout_template_exercises
--   3. Restore your data from backup

SELECT 'Backup documentation created' as message;
```

---

## Method 3: Git Commit Strategy (Best for Test Data)

### Before Starting Implementation

```bash
# 1. Ensure all current changes are committed
git status  # Check if any uncommitted changes
git add .
git commit -m "Backup: Before exercise groups implementation"

# 2. Create a branch for the new feature
git checkout -b feature/exercise-groups-implementation

# 3. Now you can safely make changes
# If anything goes wrong, just:
# git checkout main
# git branch -D feature/exercise-groups-implementation
```

---

## Method 4: Supabase Point-in-Time Recovery

If you're on a paid Supabase plan:

1. Go to **Settings** → **Database**
2. Enable **"Point-in-Time Recovery"**
3. Create a restore point before making changes
4. If issues arise, restore to that point

---

## Implementation Safe Approach

### Before Running Migration

1. **Commit current code to git**

```bash
git add .
git commit -m "Before exercise groups migration"
```

2. **Document current schema**

```sql
-- Run this in Supabase SQL Editor and save output
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('workout_template_exercises', 'workout_templates')
ORDER BY table_name, ordinal_position;
```

3. **Test on staging first** (if you have one)

4. **Keep the old code**

```bash
# Tag your current version
git tag v1.0.0-before-exercise-groups
```

---

## Revert Plan: How to Undo Changes

### If You Need to Roll Back

#### Step 1: Revert Code Changes

```bash
# Discard code changes
git checkout main
git branch -D feature/exercise-groups-implementation

# Or revert specific files
git checkout HEAD -- src/components/WorkoutTemplateForm.tsx
```

#### Step 2: Revert Database Changes

**Revert SQL Script** (`dailyfitness-app/sql/REVERT_exercise_groups.sql`):

```sql
-- =====================================================
-- REVERT: Remove Exercise Groups Implementation
-- =====================================================
-- ONLY RUN IF YOU NEED TO ROLL BACK
-- =====================================================

-- 1. DROP the new table
DROP TABLE IF EXISTS public.workout_exercise_groups CASCADE;

-- 2. REMOVE columns added to existing table
ALTER TABLE public.workout_template_exercises
  DROP COLUMN IF EXISTS group_id,
  DROP COLUMN IF EXISTS group_letter,
  DROP COLUMN IF EXISTS work_seconds,
  DROP COLUMN IF EXISTS weight_kg;

-- 3. DROP indexes
DROP INDEX IF EXISTS idx_workout_exercise_groups_template;
DROP INDEX IF EXISTS idx_workout_exercise_groups_order;
DROP INDEX IF EXISTS idx_workout_template_exercises_group;

-- Success message
SELECT 'Exercise groups schema reverted successfully! ✅' as message;
```

#### Step 3: Restore Data (if needed)

If you backed up your data:

```sql
-- Restore from backup (example)
COPY workout_templates FROM '/tmp/workout_templates_backup.json';
COPY workout_template_exercises FROM '/tmp/workout_template_exercises_backup.json';
```

---

## Recommended Flow

### Before Starting

```bash
# 1. Commit everything
git add .
git commit -m "Pre-exercise-groups: Stable version"

# 2. Create feature branch
git checkout -b feature/exercise-groups

# 3. Document current state
# (Create BACKUP_before_exercise_groups.sql with current schema)

# 4. Now implement changes
```

### During Implementation

```bash
# Make changes incrementally
# Commit each major step:

git add sql/13-exercise-groups-schema.sql
git commit -m "Add exercise groups schema"

git add src/lib/workoutGroupService.ts
git commit -m "Add workout group helper service"

git add src/components/WorkoutTemplateForm.tsx
git commit -m "Update form to use groups"

# If something breaks, easy to revert:
git reset --hard HEAD~1  # Undo last commit
```

### If Everything Works

```bash
# Merge to main
git checkout main
git merge feature/exercise-groups
git push

# Tag the version
git tag v1.1.0-with-exercise-groups
```

---

## Quick Backup Script

Create this file: `dailyfitness-app/scripts/backup-database.sh`

```bash
#!/bin/bash

# Backs up your database before migration

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/backup_$DATE"

mkdir -p $BACKUP_DIR

echo "Creating backup at $BACKUP_DIR"

# 1. Save git state
echo "Backing up git state..."
git log -1 > $BACKUP_DIR/git_state.txt

# 2. Export schema (manually copy from Supabase)
# Supabase Dashboard → Settings → Database → Export Schema
# Save to: $BACKUP_DIR/schema_backup.sql

# 3. Export data
echo "Backup complete! Saved to $BACKUP_DIR"
```

---

## Test Data Safety

Since you're using **test data only**:

✅ **Safe to proceed** - even if something breaks, you can:

1. Delete all test data
2. Restore from git
3. Re-run migrations
4. Add test data again

Worst case: Lose some test data (not production data!)

---

## Recommended Approach for Your Situation

Since you have **test data only**:

1. **Git is your main backup**

```bash
git commit -m "Backup before exercise groups"
git tag backup-before-exercise-groups
```

2. **Create revert SQL file** (I'll create this for you)

3. **Proceed with confidence**

   - If it breaks: revert git commits + run revert SQL
   - Test data can be regenerated

4. **Test incrementally**
   - Add schema first
   - Test it works
   - Add service
   - Test it works
   - Update forms
   - Test each step

This way, you can stop at any point without losing progress.

---

## Summary

**Best backup strategy for test data:**

1. ✅ Git commit (main backup)
2. ✅ Git tag (revert point)
3. ✅ Revert SQL file (database rollback)
4. ❌ Don't need full data exports (test data only)

**Revert if needed:**

1. Revert git commits
2. Run revert SQL
3. Regenerate test data if needed

Want me to create the revert SQL file for you?

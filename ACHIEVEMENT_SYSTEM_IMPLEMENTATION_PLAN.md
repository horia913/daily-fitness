# Achievement System Implementation Plan

Based on database inspection results and user requirements.

---

## Database Structure Summary

### Current State:
- **`achievements` table**: Empty, has `client_id` column (was for client achievements)
- **`user_achievements` table**: Empty, has `user_id` and `achievement_id` columns (needs modification)
- **No JSON columns**: Confirmed ✅
- **No foreign keys**: On `user_achievements` (needs to be added)
- **No code references**: `user_achievements` not used in codebase (safe to modify)

---

## Solution: Two-Table Approach

### Table 1: `achievement_templates` (NEW)
**Purpose**: Stores predefined achievements (same for everyone)

**Key Columns**:
- `id` (UUID, primary key)
- `name`, `description`, `icon`, `category`
- `achievement_type` (e.g., 'workout_count', 'streak_weeks', 'pr_count')
- `is_tiered` (BOOLEAN)
- **Tier thresholds** (separate columns, NO JSON):
  - `tier_bronze_threshold`, `tier_bronze_label`
  - `tier_silver_threshold`, `tier_silver_label`
  - `tier_gold_threshold`, `tier_gold_label`
  - `tier_platinum_threshold`, `tier_platinum_label`
- `single_threshold` (for non-tiered achievements)
- `is_active` (BOOLEAN)

### Table 2: `user_achievements` (MODIFIED)
**Purpose**: Stores unlocked achievements for each client

**Current Columns** (to keep for now):
- `id`, `user_id`, `achievement_id`, `earned_at`

**New Columns** (to add):
- `client_id` (UUID, FK to `profiles`)
- `achievement_template_id` (UUID, FK to `achievement_templates`)
- `tier` (TEXT: 'bronze', 'silver', 'gold', 'platinum', or NULL for non-tiered)
- `metric_value` (NUMERIC: the value that triggered unlock, e.g., 100 workouts)
- `achieved_date` (DATE)
- `is_public` (BOOLEAN)

**Unique Constraint**: `(client_id, achievement_template_id, tier)`
- Prevents duplicate unlocks of the same tier
- For non-tiered achievements, `tier` is NULL (only one NULL allowed per template)

---

## SQL Migration Script

**File**: `CREATE_ACHIEVEMENT_SYSTEM.sql`

**Steps**:
1. ✅ Create `achievement_templates` table
2. ✅ Add new columns to `user_achievements`
3. ✅ Add foreign key constraints
4. ✅ Drop old unique constraint, create new one
5. ✅ Add indexes
6. ✅ Set NOT NULL constraints
7. ✅ Add RLS policies
8. ⚠️ **Optional**: Drop old columns (`user_id`, `achievement_id`, `earned_at`) after confirming no code references

---

## Next Steps After SQL Execution

1. **Run SQL script** (`CREATE_ACHIEVEMENT_SYSTEM.sql`)
2. **Verify structure** (run verification queries in script)
3. **Create achievement templates** (seed data):
   - Workout Count: 10, 50, 100, 500, 1000 (tiered)
   - Streak Weeks: 1, 4, 8, 12, 24 (tiered)
   - PR Count: 5, 10, 25, 50 (tiered)
   - Program Completion: 1, 3, 5, 10 (tiered)
   - etc.
4. **Implement service layer**:
   - `achievementService.ts`: Get templates, calculate progress, unlock achievements
5. **Implement unlocking logic**:
   - On workout completion → Check workout_count achievements
   - On streak calculation → Check streak_weeks achievements
   - On PR set → Check pr_count achievements
   - On program completion → Check program_completion achievements
6. **Implement "In Progress" calculation**:
   - Get all templates
   - Calculate progress for each: `(current_value / threshold) * 100`
   - Filter: `progress > 0 AND progress < 100 AND not already unlocked`
7. **Update UI**:
   - Client achievements page: Show templates with progress
   - Progress hub: Show "achievements in progress" count

---

## Critical Requirements Met

✅ **NO JSON columns**: All data in separate columns
✅ **Two-table approach**: Templates (global) + User achievements (per-client)
✅ **Tiered achievements**: Separate columns for each tier threshold
✅ **Clean structure**: No assumptions, based on actual database inspection
✅ **On-the-fly progress**: Calculated when displaying, unlocked on action completion
✅ **"In Progress"**: Defined as > 0% and < 100% progress, not yet unlocked

---

## Questions Before Implementation

1. ✅ **Database structure**: Confirmed via SQL inspection
2. ⏳ **Seed data**: Which achievement templates should we create initially?
3. ⏳ **Trigger points**: Confirm which actions should trigger achievement checks:
   - Workout completion ✅
   - PR set ✅
   - Streak calculation ✅
   - Program completion ✅
   - Any others?
4. ⏳ **Old columns**: Should we drop `user_id`, `achievement_id`, `earned_at` from `user_achievements` after implementation, or keep them for compatibility?

---

## Ready to Execute

The SQL script is ready to run. After execution, we can proceed with:
1. Creating seed data (achievement templates)
2. Implementing the service layer
3. Implementing unlocking logic
4. Updating the UI

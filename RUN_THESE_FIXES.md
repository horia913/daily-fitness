# 🚨 Run These Critical Fixes NOW

---

## Step 1: Run SQL Migration

**File**: `migrations/2025-12-29_fix_program_progression_logic.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy the ENTIRE file contents
3. Paste and run
4. Verify success (4 parts should complete)

**What this fixes**:
- ✅ Prevents duplicate workout completions
- ✅ Fixes "next due workout" logic (week-aware, no rest days)
- ✅ Fixes workout completion logic (any order, variable schedule)
- ✅ Locks down meal photo database policies

**Time**: 2 minutes

---

## Step 2: Update Storage Bucket Policies

**File**: `STORAGE_POLICIES_TO_UPDATE.md` (read this)

1. Go to Supabase Dashboard → Storage → `meal-photos` → Policies
2. **DELETE** any client UPDATE/DELETE policies
3. **KEEP/CREATE** only these 3 policies:
   - `meal_photo_upload_own` (INSERT - clients)
   - `meal_photo_select_coach` (SELECT - coaches)
   - `meal_photo_delete_coach` (DELETE - coaches)

**What this fixes**:
- ✅ Clients can't edit/delete meal photos
- ✅ Clients can't view photos back (no manipulation)
- ✅ One-shot accountability proof

**Time**: 3 minutes

---

## Step 3: Run Verification Queries

**Copy these into Supabase SQL Editor**:

```sql
-- 1. Check uniqueness constraint
SELECT conname, contype 
FROM pg_constraint
WHERE conrelid = 'program_workout_completions'::regclass
  AND conname = 'unique_slot_completion';
-- Expected: 1 row

-- 2. Check functions exist
SELECT proname 
FROM pg_proc
WHERE proname IN ('get_next_due_workout', 'complete_workout');
-- Expected: 2 rows

-- 3. Check meal photo policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'meal_photo_logs'
ORDER BY policyname;
-- Expected: 4 policies (insert, select, update_coach, delete_coach)
-- Should NOT have: update_own, delete_own

-- 4. Check storage policies (in Storage UI, not SQL)
-- You should see exactly 3 policies in meal-photos bucket
```

**Expected**: All checks pass ✅

**Time**: 2 minutes

---

## ✅ DONE!

**Total Time**: ~7 minutes

**What you fixed**:
1. Program progression now works correctly (any order, variable schedule, week locking)
2. Duplicate completions prevented
3. Meal photos are locked (one-shot accountability)

**Next steps** (after this):
- Update frontend code to use new RPC functions
- Test program progression with real data
- Update nutrition UI to enforce one-shot upload

---

**Questions? Check**:
- `CRITICAL_ARCHITECTURE_FIXES_REQUIRED.md` - Full explanation
- `FRONTEND_BACKEND_GAP_ANALYSIS.md` - UI changes needed after this


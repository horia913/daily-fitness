# Implementation Checklist

Print this out and check off as you go!

---

## Phase 1: Backup & Setup (30 minutes)

- [ ] Git commit all changes
- [ ] Create backup tag: `git tag backup-before-exercise-groups`
- [ ] Create feature branch: `git checkout -b feature/exercise-groups`
- [ ] Verify helper service file exists: `src/lib/workoutGroupService.ts`
- [ ] Verify types file exists: `src/types/workoutGroups.ts`
- [ ] Verify SQL migration exists: `sql/13-exercise-groups-schema.sql`

---

## Phase 2: Database Migration (1-2 hours)

- [ ] Open Supabase SQL Editor
- [ ] Copy contents of `sql/13-exercise-groups-schema.sql`
- [ ] Paste and run in Supabase
- [ ] See success message: "Exercise groups schema setup completed successfully!"
- [ ] Verify `workout_exercise_groups` table exists
- [ ] Verify `group_id` column added to `workout_template_exercises`
- [ ] Verify `group_letter` column added
- [ ] Verify `work_seconds` column added
- [ ] Verify `weight_kg` column added
- [ ] Commit: `git commit -m "Add exercise groups schema"`

---

## Phase 3: Update WorkoutTemplateForm (6-8 hours)

### Save Logic

- [ ] Open `src/components/WorkoutTemplateForm.tsx`
- [ ] Find `handleSubmit` function (around line 343)
- [ ] Import `WorkoutGroupService` at top
- [ ] Find exercise saving code (lines 405-508)
- [ ] Replace with helper service call
- [ ] Save file
- [ ] Check for TypeScript errors

### Load Logic

- [ ] Find `loadTemplateExercises` function (around line 256)
- [ ] Add join to `workout_exercise_groups`
- [ ] Add grouping logic
- [ ] Save file
- [ ] Test: Start dev server
- [ ] Test: Create a simple workout
- [ ] Test: Save works without errors
- [ ] Check database: Verify group created
- [ ] Commit: `git commit -m "Update form to use exercise groups"`

---

## Phase 4: Update Query Files (6-8 hours)

For each file below, add the group join:

### Main Files

- [ ] `src/components/client/EnhancedClientWorkouts.tsx`

  - [ ] Find query (line 143)
  - [ ] Add `group:workout_exercise_groups(*)` to select
  - [ ] Test file works
  - [ ] Commit

- [ ] `src/components/coach/WorkoutTemplateDetails.tsx`

  - [ ] Find query (line 92)
  - [ ] Add group join
  - [ ] Test file works
  - [ ] Commit

- [ ] `src/components/WorkoutDetailModal.tsx`

  - [ ] Find query (line 137)
  - [ ] Add group join
  - [ ] Test file works
  - [ ] Commit

- [ ] `src/lib/workoutTemplateService.ts`

  - [ ] Find queries (lines 195-216)
  - [ ] Add group joins (multiple queries)
  - [ ] Test service works
  - [ ] Commit

- [ ] `src/app/client/workouts/[id]/start/page.tsx`
  - [ ] Find queries
  - [ ] Add group join
  - [ ] Update workout execution logic
  - [ ] Test execution works
  - [ ] Commit

### Secondary Files

- [ ] `src/app/client/workouts/[id]/details/page.tsx`
- [ ] `src/app/client/page.tsx`
- [ ] `src/components/coach/OptimizedWorkoutTemplates.tsx`
- [ ] `src/components/coach/client-views/ClientWorkoutsView.tsx`
- [ ] `src/lib/personalRecords.ts`
- [ ] `src/hooks/useWorkoutData.ts`
- [ ] `src/lib/prefetch.ts`
- [ ] `src/hooks/useWorkoutSummary.ts`
- [ ] `src/components/ExerciseSetForm.tsx`
- [ ] `src/components/coach/EnhancedProgramManager.tsx`

For each:

- [ ] Find `workout_template_exercises` query
- [ ] Add group join
- [ ] Test works
- [ ] Commit

---

## Phase 5: Testing (6-8 hours)

### Exercise Type Tests

- [ ] **Straight Set**

  - [ ] Create
  - [ ] Save
  - [ ] Display
  - [ ] Execute

- [ ] **Superset**

  - [ ] Create
  - [ ] Both exercises save
  - [ ] Display shows A/B
  - [ ] Execute together

- [ ] **Giant Set**

  - [ ] Create with 3+ exercises
  - [ ] All save
  - [ ] Display groups
  - [ ] Execute together

- [ ] **Circuit**

  - [ ] Create with rounds
  - [ ] Multiple exercises save
  - [ ] Timing works
  - [ ] Execute circuit

- [ ] **Tabata**

  - [ ] Create
  - [ ] Timing saves
  - [ ] Display correct
  - [ ] Execute with timer

- [ ] **AMRAP**

  - [ ] Create
  - [ ] Save
  - [ ] Display
  - [ ] Execute

- [ ] **EMOM**

  - [ ] Create
  - [ ] Save
  - [ ] Display
  - [ ] Execute

- [ ] **Drop Set**

  - [ ] Create
  - [ ] Multiple weights save
  - [ ] Display shows drops
  - [ ] Execute

- [ ] **Cluster Set**

  - [ ] Create
  - [ ] Save
  - [ ] Display
  - [ ] Execute

- [ ] **Rest-Pause**

  - [ ] Create
  - [ ] Save
  - [ ] Display
  - [ ] Execute

- [ ] **Pyramid Set**

  - [ ] Create
  - [ ] Progressive weights save
  - [ ] Display
  - [ ] Execute

- [ ] **Pre-Exhaustion**

  - [ ] Create
  - [ ] Both exercises save
  - [ ] Display
  - [ ] Execute

- [ ] **For Time**

  - [ ] Create
  - [ ] Save
  - [ ] Display
  - [ ] Execute

- [ ] **Ladder**
  - [ ] Create
  - [ ] Progressive reps save
  - [ ] Display
  - [ ] Execute

### Integration Tests

- [ ] Create workout with multiple types
- [ ] Mix superset and straight sets
- [ ] Mix circuit and tabata
- [ ] Update existing workout
- [ ] Delete exercise from group
- [ ] Reorder exercises

### Edge Cases

- [ ] Workout with only straight sets
- [ ] Workout with only supersets
- [ ] Workout with 5 different types
- [ ] Empty workout template
- [ ] Single exercise workout

---

## Phase 6: Final Cleanup

- [ ] All TypeScript compiles without errors
- [ ] No console errors
- [ ] All features work
- [ ] Database queries fast
- [ ] Code is clean
- [ ] Commits are organized
- [ ] Documentation updated

### Final Git Actions

- [ ] All changes committed
- [ ] Merge to main: `git checkout main && git merge feature/exercise-groups`
- [ ] Create release tag: `git tag v1.1.0-exercise-groups`
- [ ] Push to remote: `git push origin main --tags`

---

## Success Metrics

- [ ] Database has new table
- [ ] Database has new columns
- [ ] No JSON in notes field
- [ ] Type-first selection works
- [ ] All 14 types create successfully
- [ ] Display shows grouped exercises
- [ ] Workout execution works
- [ ] Zero errors in console

---

## Rollback If Needed

If something goes wrong:

- [ ] Stop making changes
- [ ] Note the error
- [ ] Run revert SQL: `sql/REVERT_exercise_groups.sql`
- [ ] Revert git: `git checkout main`
- [ ] Delete branch: `git branch -D feature/exercise-groups`
- [ ] Start over from safe point

---

## Done! 🎉

After completing all checks:

- [ ] Your database is clean
- [ ] Your code is clean
- [ ] Your UX is improved
- [ ] Ready to launch!

Estimated time: 3-4 days (25-35 hours)

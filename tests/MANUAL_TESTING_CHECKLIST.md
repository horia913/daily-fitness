# Manual Testing Checklist

This document provides a comprehensive checklist for manually testing coach-side exercise, workout, and program creation functionality.

## Prerequisites

- [ ] Logged in as coach user
- [ ] Database is accessible and migrations are applied
- [ ] Test data is available (or create as you test)

---

## Exercise Creation Testing

### Basic Exercise Creation
- [ ] Navigate to `/coach/exercises`
- [ ] Click "Create Exercise" button
- [ ] Fill required fields:
  - [ ] Name: "Test Bench Press"
  - [ ] Category: Select "Strength"
  - [ ] Muscle Groups: Select "Chest" and "Triceps"
- [ ] Click "Save"
- [ ] Verify exercise appears in library immediately
- [ ] Verify exercise has correct name, category, and muscle groups

### Exercise with Optional Fields
- [ ] Create new exercise
- [ ] Add description: "Standard bench press exercise"
- [ ] Add video URL: Valid YouTube/Vimeo URL
- [ ] Add image: Upload image file
- [ ] Add multiple instructions:
  - [ ] "Lie on bench"
  - [ ] "Grip bar shoulder-width"
  - [ ] "Lower to chest"
  - [ ] "Press up explosively"
- [ ] Add multiple tips:
  - [ ] "Keep feet flat on floor"
  - [ ] "Maintain arch in back"
- [ ] Select multiple equipment: "Barbell", "Bench"
- [ ] Save exercise
- [ ] Verify all fields saved correctly
- [ ] Verify video plays when clicked
- [ ] Verify image displays

### Exercise Editing
- [ ] Find created exercise in library
- [ ] Click "Edit" button
- [ ] Change name to "Updated Bench Press"
- [ ] Add new muscle group: "Shoulders"
- [ ] Update description
- [ ] Save changes
- [ ] Verify changes persisted
- [ ] Reload page, verify changes still there

### Exercise Deletion
- [ ] Find exercise in library
- [ ] Click "Delete" button
- [ ] Confirm deletion
- [ ] Verify exercise removed from library
- [ ] Verify exercise no longer appears in workout builder

### Exercise Search and Filters
- [ ] Use search bar to find exercise by name
- [ ] Filter by category: "Strength"
- [ ] Filter by muscle group: "Chest"
- [ ] Filter by equipment: "Barbell"
- [ ] Combine multiple filters
- [ ] Clear filters
- [ ] Verify search results update correctly

---

## Workout Creation Testing

### Basic Workout Creation
- [ ] Navigate to `/coach/workouts/templates`
- [ ] Click "Create Template" button
- [ ] Fill basic info:
  - [ ] Name: "Push Day"
  - [ ] Description: "Upper body push workout"
  - [ ] Difficulty: "Intermediate"
  - [ ] Estimated Duration: 60 minutes
- [ ] Save workout
- [ ] Verify workout appears in templates list

### Exercise Type: Straight Set
- [ ] Edit workout template
- [ ] Click "Add Exercise"
- [ ] Select "Straight Set"
- [ ] Select exercise: "Bench Press"
- [ ] Set parameters:
  - [ ] Sets: 3
  - [ ] Reps: "10"
  - [ ] Rest: 60 seconds
  - [ ] Tempo: "2-0-1-0"
  - [ ] RIR: 2
- [ ] Save exercise
- [ ] Verify exercise appears in workout
- [ ] Verify all parameters displayed correctly

### Exercise Type: Superset
- [ ] Add new exercise block
- [ ] Select "Superset"
- [ ] Add first exercise: "Bench Press"
  - [ ] First exercise reps: "10"
- [ ] Add second exercise: "Rows"
  - [ ] Second exercise reps: "12"
- [ ] Rest between pairs: 90 seconds
- [ ] Save
- [ ] Verify both exercises shown
- [ ] Verify rest between pairs displayed

### Exercise Type: Giant Set
- [ ] Add new exercise block
- [ ] Select "Giant Set"
- [ ] Add 3+ exercises:
  - [ ] Exercise 1: "Bench Press"
  - [ ] Exercise 2: "Rows"
  - [ ] Exercise 3: "Shoulder Press"
- [ ] Set rounds: 3
- [ ] Rest after set: 120 seconds
- [ ] Save
- [ ] Verify all exercises shown
- [ ] Verify rounds and rest displayed

### Exercise Type: Drop Set
- [ ] Add new exercise block
- [ ] Select "Drop Set"
- [ ] Select exercise: "Cable Fly"
- [ ] Set parameters:
  - [ ] Sets: 3
  - [ ] Exercise reps: "10"
  - [ ] Drop set reps: "8"
  - [ ] Weight reduction: 20%
- [ ] Save
- [ ] Verify drop set parameters displayed

### Exercise Type: Cluster Set
- [ ] Add new exercise block
- [ ] Select "Cluster Set"
- [ ] Select exercise: "Squat"
- [ ] Set parameters:
  - [ ] Reps per cluster: 3
  - [ ] Clusters per set: 4
  - [ ] Intra-cluster rest: 15 seconds
  - [ ] Rest after set: 120 seconds
- [ ] Save
- [ ] Verify cluster parameters displayed

### Exercise Type: Rest-Pause
- [ ] Add new exercise block
- [ ] Select "Rest-Pause"
- [ ] Select exercise: "Bench Press"
- [ ] Set parameters:
  - [ ] Sets: 1
  - [ ] Reps: "8"
  - [ ] Rest-pause duration: 15 seconds
  - [ ] Max rest pauses: 3
- [ ] Save
- [ ] Verify rest-pause parameters displayed

### Exercise Type: Pyramid Set
- [ ] Add new exercise block
- [ ] Select "Pyramid Set"
- [ ] Select exercise: "Squat"
- [ ] Add pyramid sets:
  - [ ] Set 1: 12 reps, 50kg
  - [ ] Set 2: 10 reps, 60kg
  - [ ] Set 3: 8 reps, 70kg
  - [ ] Set 4: 6 reps, 80kg
- [ ] Save
- [ ] Verify pyramid progression displayed

### Exercise Type: Pre-Exhaustion
- [ ] Add new exercise block
- [ ] Select "Pre-Exhaustion"
- [ ] Isolation exercise: "Cable Fly"
  - [ ] Isolation reps: "15"
- [ ] Compound exercise: "Bench Press"
  - [ ] Compound reps: "8"
- [ ] Rest between pairs: 60 seconds
- [ ] Save
- [ ] Verify both exercises shown
- [ ] Verify isolation → compound order

### Exercise Type: AMRAP
- [ ] Add new exercise block
- [ ] Select "AMRAP"
- [ ] Select exercise: "Burpees"
- [ ] Set parameters:
  - [ ] Duration: 10 minutes
  - [ ] Target reps: 100
- [ ] Save
- [ ] Verify AMRAP parameters displayed

### Exercise Type: EMOM
- [ ] Add new exercise block
- [ ] Select "EMOM"
- [ ] Select exercise: "Thrusters"
- [ ] Set parameters:
  - [ ] Mode: "Reps"
  - [ ] Duration: 12 minutes
  - [ ] Target reps: 10
  - [ ] Work seconds: 45
- [ ] Save
- [ ] Verify EMOM parameters displayed

### Exercise Type: Tabata
- [ ] Add new exercise block
- [ ] Select "Tabata"
- [ ] Select exercise: "Mountain Climbers"
- [ ] Set parameters:
  - [ ] Work seconds: 20
  - [ ] Rest seconds: 10
  - [ ] Rounds: 8
  - [ ] Rest after set: 60 seconds
- [ ] Save
- [ ] Verify Tabata parameters displayed

### Exercise Type: For Time
- [ ] Add new exercise block
- [ ] Select "For Time"
- [ ] Select exercise: "Deadlifts"
- [ ] Set parameters:
  - [ ] Target reps: 100
  - [ ] Time cap: 15 minutes
- [ ] Save
- [ ] Verify For Time parameters displayed

### Exercise Type: Ladder
- [ ] Add new exercise block
- [ ] Select "Ladder"
- [ ] Select exercise: "Pull-ups"
- [ ] Add ladder rungs:
  - [ ] Rung 1: 5 reps, 60kg
  - [ ] Rung 2: 6 reps, 65kg
  - [ ] Rung 3: 7 reps, 70kg
- [ ] Save
- [ ] Verify ladder progression displayed

### Workout Management
- [ ] Reorder exercises (drag and drop)
- [ ] Edit exercise parameters
- [ ] Delete exercise from workout
- [ ] Duplicate workout template
- [ ] Edit workout template name/description
- [ ] Delete workout template
- [ ] Assign workout to client
- [ ] Verify workout appears in client's list

---

## Program Creation Testing (CRITICAL)

### Basic Program Creation
- [ ] Navigate to `/coach/programs`
- [ ] Click "Create Program" button
- [ ] Fill basic info:
  - [ ] Name: "8-Week Strength Program"
  - [ ] Description: "Progressive strength training"
  - [ ] Difficulty: "Intermediate"
  - [ ] Duration: 8 weeks
  - [ ] Target Audience: "General Fitness"
- [ ] Save basic info
- [ ] Navigate to edit page

### Weekly Schedule Tab (CRITICAL)

#### Week 1 Schedule Setup
- [ ] Open "Weekly Schedule" tab
- [ ] Verify week selector shows Week 1-8
- [ ] Select Week 1
- [ ] Assign workout template to Day 1
- [ ] **VERIFY IN DATABASE**: Check `program_progression_rules` table has data for Week 1, Day 1
- [ ] Assign workout to Day 2, 3, 4, 5
- [ ] Set Day 6, 7 to "Rest Day"
- [ ] **VERIFY IN DATABASE**: Progression rules exist for Days 1-5 only

#### Week 1 Auto-Fill
- [ ] Switch to Week 2
- [ ] **VERIFY**: Week 2 shows same schedule as Week 1 (auto-filled)
- [ ] **VERIFY IN DATABASE**: `program_progression_rules` has Week 2 data (copied from Week 1)
- [ ] Switch to Week 3
- [ ] **VERIFY**: Week 3 also auto-filled from Week 1

#### Independent Week Editing
- [ ] Switch to Week 2
- [ ] Change Day 1 workout to different template
- [ ] **VERIFY IN DATABASE**: Old progression rules deleted, new ones created
- [ ] Switch to Week 3
- [ ] Assign different workout to Day 1
- [ ] **VERIFY**: Week 3 has independent schedule
- [ ] Go back to Week 1
- [ ] **VERIFY**: Week 1 unchanged (independent)

#### Schedule Persistence
- [ ] Make changes to Week 1 schedule
- [ ] Reload page
- [ ] **VERIFY**: All schedule changes persisted
- [ ] **VERIFY IN DATABASE**: All schedule rows correct

### Progression Rules Tab (CRITICAL)

#### Week 1 Progression Rules
- [ ] Open "Progression Rules" tab
- [ ] Select Week 1
- [ ] Click Day 1 button
- [ ] **VERIFY**: All exercises from workout template displayed
- [ ] **VERIFY**: All fields show actual values (not placeholders)
- [ ] **VERIFY**: Exercise types display correctly (Straight Set, Superset, etc.)
- [ ] Edit sets for first exercise (e.g., change 3 to 4)
- [ ] Edit reps for first exercise (e.g., change "10" to "12")
- [ ] Click Save
- [ ] **VERIFY IN DATABASE**: Changes saved to `program_progression_rules`
- [ ] Reload page, select Week 1, Day 1
- [ ] **VERIFY**: Changes persisted

#### Week 2+ Placeholder Behavior
- [ ] Select Week 2
- [ ] Click Day 1 button
- [ ] **VERIFY**: Shows Week 1 data as placeholders (if Week 2 not edited)
- [ ] **VERIFY**: Placeholder indicator visible
- [ ] Edit sets for first exercise (e.g., change 3 to 5)
- [ ] Click Save
- [ ] **VERIFY IN DATABASE**: New rule created for Week 2 (not modifying Week 1)
- [ ] Switch back to Week 1, Day 1
- [ ] **VERIFY**: Week 1 still has original values (unchanged)

#### All 13 Exercise Types in Progression Rules
- [ ] For each exercise type, verify fields are editable:
  - [ ] **Straight Set**: Edit sets, reps, rest, tempo, RIR
  - [ ] **Superset**: Edit first_exercise_reps, second_exercise_reps, rest_between_pairs
  - [ ] **Giant Set**: Edit exercise_order, sets, reps
  - [ ] **Drop Set**: Edit exercise_reps, drop_set_reps, weight_reduction_percentage
  - [ ] **Cluster Set**: Edit reps_per_cluster, clusters_per_set, intra_cluster_rest
  - [ ] **Rest-Pause**: Edit rest_pause_duration, max_rest_pauses
  - [ ] **Pyramid**: Edit pyramid_order, sets, reps, weight
  - [ ] **Pre-Exhaustion**: Edit isolation_reps, compound_reps, compound_exercise_id
  - [ ] **AMRAP**: Edit duration_minutes, target_reps
  - [ ] **EMOM**: Edit emom_mode, duration_minutes, target_reps
  - [ ] **Tabata**: Edit work_seconds, rest_seconds, rounds
  - [ ] **For Time**: Edit target_reps, time_cap_minutes
  - [ ] **Ladder**: Edit ladder_order, reps, weight_kg
- [ ] For each type, save changes and verify persistence

#### Exercise Replacement
- [ ] Select any exercise in progression rules
- [ ] Click "Replace Exercise" button
- [ ] Select different exercise
- [ ] **VERIFY**: Exercise replaced
- [ ] **VERIFY**: Other parameters preserved (sets, reps, rest, etc.)
- [ ] **VERIFY IN DATABASE**: Only exercise_id changed in progression rules

#### Workout Replacement
- [ ] Click "Replace Workout" button
- [ ] Select different workout template
- [ ] **VERIFY IN DATABASE**: Old progression rules deleted
- [ ] **VERIFY IN DATABASE**: New workout data copied to progression rules
- [ ] **VERIFY**: All exercises from new workout displayed

#### Week Independence
- [ ] Edit Week 1, Day 1: sets=3
- [ ] Edit Week 2, Day 1: sets=4
- [ ] Edit Week 3, Day 1: sets=5
- [ ] **VERIFY IN DATABASE**: Each week has independent values
- [ ] **VERIFY IN DATABASE**: Separate rules for each week
- [ ] Switch between weeks
- [ ] **VERIFY**: Each week shows correct values

### Program Management
- [ ] Save program
- [ ] Verify program appears in list
- [ ] Edit program (change name, duration)
- [ ] **VERIFY**: Schedule and progression rules unchanged
- [ ] View program details
- [ ] Assign program to client
- [ ] **VERIFY**: Client sees correct schedule and progression
- [ ] Test program deletion (with assignments)
- [ ] **VERIFY**: Cascade delete works (progression rules deleted)

---

## Edge Cases & Error Handling

### Exercise Edge Cases
- [ ] Create exercise with invalid video URL
- [ ] Create exercise with very long name (100+ characters)
- [ ] Create exercise with very long description (1000+ characters)
- [ ] Create exercise with no muscle groups (should fail)
- [ ] Create exercise with 10+ muscle groups
- [ ] Create exercise with special characters in name

### Workout Edge Cases
- [ ] Create workout with no exercises
- [ ] Create workout with 50+ exercises
- [ ] Create workout with duplicate exercises
- [ ] Create workout with all 13 exercise types
- [ ] Edit workout while it's assigned to clients
- [ ] Delete workout that's used in programs

### Program Edge Cases
- [ ] Create program with no workouts
- [ ] Create program with duplicate workouts same day
- [ ] Create program with workout on all 7 days
- [ ] Create program with 52 weeks duration
- [ ] Edit program duration from 8 to 4 weeks (verify schedule)
- [ ] Edit program duration from 4 to 12 weeks (verify auto-fill)
- [ ] Delete program with active assignments
- [ ] Assign same workout to multiple days in same week

### Data Integrity Edge Cases
- [ ] Delete exercise used in workouts
- [ ] Delete workout used in programs
- [ ] Edit workout template while it's in program schedule
- [ ] **VERIFY**: Original workout templates unchanged when editing progression rules
- [ ] **VERIFY**: Multiple programs can use same template independently

### Network & Performance
- [ ] Test with slow network connection (throttle to 3G)
- [ ] Test with no internet connection (offline mode)
- [ ] Test with interrupted save (close browser during save)
- [ ] Test with multiple tabs open (concurrent edits)
- [ ] Test with very large workout (20+ exercises)

### Form Validation
- [ ] Submit empty exercise form (should show errors)
- [ ] Submit empty workout form (should show errors)
- [ ] Submit empty program form (should show errors)
- [ ] Enter negative numbers (sets, reps, weight)
- [ ] Enter text in number fields
- [ ] Enter invalid date
- [ ] Enter very large numbers (1000+ sets)

---

## UI/UX Verification

### Page Loading
- [ ] All pages load without errors
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Empty states display correctly

### Modals and Dialogs
- [ ] All modals open correctly
- [ ] All modals close correctly
- [ ] Modal overlays work correctly
- [ ] Modal scrolling works for long content

### Forms
- [ ] All forms submit correctly
- [ ] Form validation displays correctly
- [ ] Form errors clear on correction
- [ ] Form autosave works (if implemented)

### Navigation
- [ ] Navigation between pages works
- [ ] Back buttons work correctly
- [ ] Breadcrumbs work correctly
- [ ] Deep links work correctly

### Search and Filters
- [ ] Search functionality works
- [ ] Filters work correctly
- [ ] Combined search + filters work
- [ ] Clear filters works

### Responsive Design
- [ ] Mobile (< 640px): Layout works correctly
- [ ] Tablet (640-1024px): Layout works correctly
- [ ] Desktop (> 1024px): Layout works correctly
- [ ] Landscape mode: Layout adjusts correctly
- [ ] Touch targets are adequate size (44x44pt minimum)

### Theme Support
- [ ] Dark mode works on all pages
- [ ] Light mode works on all pages
- [ ] Theme switching works smoothly
- [ ] All colors have adequate contrast

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible (test with VoiceOver/TalkBack)
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Color contrast meets WCAG AA (4.5:1)

---

## Database Verification

### Direct Database Checks
- [ ] Query `exercises` table: Verify coach_id matches
- [ ] Query `workout_templates` table: Verify all fields saved
- [ ] Query `workout_blocks` table: Verify all exercise types saved
- [ ] Query `workout_block_exercises` table: Verify exercise relationships
- [ ] Query `workout_programs` table: Verify program data
- [ ] Query `program_schedule` table: Verify schedule data
- [ ] Query `program_progression_rules` table: **CRITICAL** - Verify all 40+ columns populated correctly
- [ ] Verify foreign keys are correct
- [ ] Verify no orphaned records
- [ ] Verify cascade deletes work

### Data Relationships
- [ ] Exercise → Workout Block Exercise: Relationship correct
- [ ] Workout Template → Workout Blocks: Relationship correct
- [ ] Program → Program Schedule: Relationship correct
- [ ] Program Schedule → Progression Rules: Relationship correct
- [ ] **CRITICAL**: Verify `program_progression_rules` is single source of truth
- [ ] **CRITICAL**: Verify original workout templates unchanged

---

## Test Results Log

Use this section to log any issues found:

### Issues Found
1. [ ] Issue description: ________________
   - Location: ________________
   - Steps to reproduce: ________________
   - Expected: ________________
   - Actual: ________________

2. [ ] Issue description: ________________
   - Location: ________________
   - Steps to reproduce: ________________
   - Expected: ________________
   - Actual: ________________

### Test Completion
- [ ] All exercise creation tests passed
- [ ] All workout creation tests passed
- [ ] All program creation tests passed (CRITICAL)
- [ ] All edge cases tested
- [ ] All UI/UX verified
- [ ] Database verified
- [ ] Ready for production

---

**Last Updated**: [Date]
**Tested By**: [Name]
**Environment**: [Development/Staging/Production]


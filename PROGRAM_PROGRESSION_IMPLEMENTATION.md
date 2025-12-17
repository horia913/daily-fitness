# Program Progression Rules - Complete Implementation

## Overview

This implementation provides a complete system for managing program progression rules where workout templates are copied into `program_progression_rules` table for program-specific modifications. This allows coaches to:

1. Assign workout templates to programs
2. Edit workout parameters independently for each program
3. Modify workouts week-by-week
4. Replace exercises or entire workouts
5. Auto-populate from Week 1 data

## Architecture

### Single Source of Truth

**`program_progression_rules`** is the **SINGLE SOURCE OF TRUTH** for program workouts:

- When a workout template is assigned to a program, ALL data is copied
- Original `workout_templates` remain unchanged
- All edits happen in `program_progression_rules`
- No JSON in `notes` field - only plain text comments

### Database Schema

```sql
program_progression_rules (
  id UUID PRIMARY KEY,
  program_id UUID REFERENCES workout_programs,
  program_schedule_id UUID REFERENCES program_schedule,
  week_number INTEGER,

  -- Block info
  block_type TEXT (straight_set, superset, giant_set, drop_set, etc.),
  block_order INTEGER,
  block_name TEXT,

  -- Exercise info
  exercise_id UUID REFERENCES exercises,
  exercise_order INTEGER,
  exercise_letter TEXT,

  -- Common fields
  sets INTEGER,
  reps TEXT,
  rest_seconds INTEGER,
  tempo TEXT,
  rir INTEGER,
  weight_kg NUMERIC,
  notes TEXT, -- TEXT ONLY, NO JSON!

  -- Type-specific fields (see schema file for full list)
  first_exercise_reps, second_exercise_reps, rest_between_pairs,
  drop_set_reps, weight_reduction_percentage,
  reps_per_cluster, clusters_per_set, intra_cluster_rest,
  rest_pause_duration, max_rest_pauses,
  isolation_reps, compound_reps, compound_exercise_id,
  duration_minutes, emom_mode, target_reps,
  work_seconds, rounds, rest_after_set, time_cap_minutes,
  rest_after_exercise, pyramid_order, ladder_order
)
```

## Implementation Files

### 1. Database Schema

**File:** `migrations/create_program_progression_rules_schema.sql`

Creates the table with:

- All columns for every exercise type
- Proper indexes
- RLS policies
- Updated_at trigger

**Usage:**

```bash
# Run this migration in your Supabase SQL editor
```

### 2. Service Layer

**File:** `src/lib/programProgressionService.ts`

Main service class with methods:

#### `copyWorkoutToProgram(programId, programScheduleId, templateId, weekNumber)`

Copies ALL workout data from a template to progression rules:

- Loads workout blocks via `WorkoutBlockService`
- Converts each block type to progression rules
- Handles all 13 exercise types
- Inserts into `program_progression_rules`

#### `getProgressionRules(programId, weekNumber, programScheduleId?)`

Loads progression rules with auto-populate from Week 1:

```typescript
const { rules, isPlaceholder } =
  await ProgramProgressionService.getProgressionRules(
    programId,
    3 // Week 3
  );
// If Week 3 is empty, returns Week 1 data with isPlaceholder = true
```

#### `updateProgressionRule(ruleId, updates)`

Updates a specific progression rule field.

#### `createProgressionRule(rule)`

Creates a new progression rule (used when editing placeholder from Week 1).

#### `replaceExercise(ruleId, newExerciseId)`

Replaces an exercise while keeping all other parameters.

#### `replaceWorkout(programId, programScheduleId, newTemplateId, weekNumber)`

Replaces entire workout:

1. Deletes all rules for that schedule/week
2. Copies new template data

### 3. UI Component

**File:** `src/components/coach/ProgramProgressionRulesEditor.tsx`

React component that displays and edits progression rules:

**Features:**

- ✅ Groups exercises by blocks
- ✅ Shows block type badges (Straight Set, Superset, etc.)
- ✅ Displays all fields based on block type
- ✅ Auto-populates from Week 1 (shows placeholder indicator)
- ✅ Tracks edited fields
- ✅ Saves changes (creates new rules for placeholders, updates existing)
- ✅ Replace exercise button

**Props:**

```typescript
<ProgramProgressionRulesEditor
  programId={string}
  programScheduleId={string}
  weekNumber={number}
  exercises={Exercise[]}
  onUpdate={() => void}
/>
```

### 4. Integration

**File:** `src/components/coach/EnhancedProgramManager.tsx`

Modified to automatically copy workouts when assigned:

```typescript
// After inserting/updating program_schedule:
const schedulesToCopy = [
  /* schedules that were added/changed */
];

for (const { scheduleId, templateId, weekNumber } of schedulesToCopy) {
  await ProgramProgressionService.deleteProgressionRules(
    scheduleId,
    weekNumber
  );
  await ProgramProgressionService.copyWorkoutToProgram(
    programId,
    scheduleId,
    templateId,
    weekNumber
  );
}
```

## Supported Exercise Types

All 13 exercise types are fully supported:

| Type               | Key Fields                                                      |
| ------------------ | --------------------------------------------------------------- |
| **Straight Set**   | sets, reps, rest_seconds, tempo, rir                            |
| **Superset**       | first_exercise_reps, second_exercise_reps, rest_between_pairs   |
| **Giant Set**      | exercise_order, sets, reps, rest_between_pairs                  |
| **Drop Set**       | sets, exercise_reps, drop_set_reps, weight_reduction_percentage |
| **Cluster Set**    | reps_per_cluster, clusters_per_set, intra_cluster_rest          |
| **Rest-Pause**     | rest_pause_duration, max_rest_pauses                            |
| **Pyramid**        | pyramid_order, sets, reps, weight_kg                            |
| **Pre-Exhaustion** | isolation_reps, compound_reps, compound_exercise_id             |
| **AMRAP**          | duration_minutes, target_reps                                   |
| **EMOM**           | emom_mode, duration_minutes, target_reps                        |
| **Tabata**         | work_seconds, rest_seconds, rounds, rest_after_set              |
| **For Time**       | target_reps, time_cap_minutes                                   |
| **Ladder**         | ladder_order, reps, weight_kg                                   |

## Usage Flow

### 1. Assign Workout to Program

```typescript
// When creating/editing a program schedule:
await supabase.from("program_schedule").insert({
  program_id: programId,
  day_of_week: 0, // Monday
  week_number: 1,
  template_id: workoutTemplateId,
});

// ✅ EnhancedProgramManager automatically copies workout data
// to program_progression_rules via ProgramProgressionService
```

### 2. View Progression Rules

```typescript
// In your program edit UI:
<ProgramProgressionRulesEditor
  programId={programId}
  programScheduleId={scheduleId}
  weekNumber={selectedWeek}
  exercises={allExercises}
  onUpdate={loadData}
/>
```

### 3. Edit for Specific Week

```typescript
// Week 1: Shows actual data, edits save to Week 1 rules
// Week 2+: If empty, shows Week 1 as placeholders
//          When coach edits, creates new rules for that week
```

### 4. Replace Exercise

```typescript
// Click "Replace" button on any exercise
await ProgramProgressionService.replaceExercise(ruleId, newExerciseId);
// Keeps sets, reps, etc. - only changes exercise
```

### 5. Replace Entire Workout

```typescript
// Replace all exercises for a program day/week
await ProgramProgressionService.replaceWorkout(
  programId,
  programScheduleId,
  newTemplateId,
  weekNumber
);
// Deletes old rules, copies new template
```

## Key Requirements Implemented

✅ **REQUIREMENT 1: COPY WORKOUT TO PROGRAM**

- Copies ALL workout data from template
- Creates program-specific copy
- Original templates unchanged

✅ **REQUIREMENT 2: DISPLAY IN PROGRESSION RULES TAB**

- Shows EXACT SAME FORM as workout template editor
- Loads from `program_progression_rules`
- Displays ALL fields based on block type
- Grouped by blocks

✅ **REQUIREMENT 3: EDIT FUNCTIONALITY**

- Updates `program_progression_rules` only
- Never touches `workout_templates`
- Changes apply to specific program/week

✅ **REQUIREMENT 4: REPLACE EXERCISE**

- Updates `exercise_id` only
- Keeps all other fields
- Original template unchanged

✅ **REQUIREMENT 5: REPLACE ENTIRE WORKOUT**

- Deletes old progression rules
- Copies new template data
- Original templates unchanged

✅ **REQUIREMENT 6: AUTO-POPULATE FROM WEEK 1**

- Week 2+ shows Week 1 data as placeholders
- Edits create new rules for that week
- Week 1 remains unchanged

✅ **REQUIREMENT 7: NO JSON IN NOTES**

- `notes` field is TEXT ONLY
- All data in proper columns
- No `JSON.parse` or `JSON.stringify`

## Testing Checklist

### Exercise Types to Test

- [ ] **Straight Set**: 3 sets x 10 reps, 60s rest
- [ ] **Superset**: Bench Press 3x10 + Rows 3x12
- [ ] **Giant Set**: 3 exercises back-to-back
- [ ] **Drop Set**: 3x10, drop 20%, continue to failure
- [ ] **Cluster Set**: 5 clusters x 2 reps, 15s intra rest
- [ ] **Rest-Pause**: Initial set + 3 rest-pauses
- [ ] **Pyramid**: 12-10-8-6 increasing weight
- [ ] **Pre-Exhaustion**: Isolation + compound
- [ ] **AMRAP**: 10 minutes max rounds
- [ ] **EMOM**: 12 minutes, 10 reps each minute
- [ ] **Tabata**: 8 rounds, 20s work / 10s rest
- [ ] **For Time**: 100 reps as fast as possible
- [ ] **Ladder**: Ascending/descending reps

### Workflow Tests

- [ ] Create program, assign template to Day 1
- [ ] Verify data copied to `program_progression_rules`
- [ ] View Week 1, edit sets/reps
- [ ] View Week 2, verify Week 1 shown as placeholder
- [ ] Edit Week 2 field, verify new rule created
- [ ] Replace exercise, verify only exercise_id changed
- [ ] Replace entire workout, verify all rules replaced
- [ ] Verify original `workout_templates` unchanged

## Troubleshooting

### Issue: No progression rules shown

**Solution:** Check if workout was assigned to program_schedule. The copy happens automatically after assignment.

### Issue: Changes not saving

**Solution:** Check browser console for errors. Verify RLS policies allow coach to update rules.

### Issue: Week 1 data not showing for Week 2

**Solution:** Verify Week 1 has progression rules. Check `program_schedule_id` matches.

### Issue: TypeError about missing columns

**Solution:** Run the schema migration. Ensure all columns exist in database.

## Migration Path

If you have existing data in the old format:

1. Run the schema migration
2. For each program:

   ```sql
   -- Delete old progression rules (if any)
   DELETE FROM program_progression_rules WHERE program_id = 'xxx';

   -- Re-assign templates to trigger copy
   -- This will happen automatically when coach edits program
   ```

## API Reference

### ProgramProgressionService

```typescript
class ProgramProgressionService {
  // Copy workout to program
  static async copyWorkoutToProgram(
    programId: string,
    programScheduleId: string,
    templateId: string,
    weekNumber: number = 1
  ): Promise<boolean>;

  // Get rules with auto-populate
  static async getProgressionRules(
    programId: string,
    weekNumber: number,
    programScheduleId?: string
  ): Promise<{ rules: ProgramProgressionRule[]; isPlaceholder: boolean }>;

  // Update rule
  static async updateProgressionRule(
    ruleId: string,
    updates: Partial<ProgramProgressionRule>
  ): Promise<boolean>;

  // Create rule
  static async createProgressionRule(
    rule: Omit<ProgramProgressionRule, "id" | "created_at" | "updated_at">
  ): Promise<ProgramProgressionRule | null>;

  // Replace exercise
  static async replaceExercise(
    ruleId: string,
    newExerciseId: string
  ): Promise<boolean>;

  // Replace workout
  static async replaceWorkout(
    programId: string,
    programScheduleId: string,
    newTemplateId: string,
    weekNumber: number
  ): Promise<boolean>;

  // Delete rules
  static async deleteProgressionRules(
    programScheduleId: string,
    weekNumber?: number
  ): Promise<boolean>;
}
```

## Next Steps

To integrate this into your coach UI:

1. **Run the migration:**

   - Open Supabase SQL editor
   - Copy/paste `create_program_progression_rules_schema.sql`
   - Execute

2. **Test the copy logic:**

   - Create a new program
   - Assign a workout template
   - Check `program_progression_rules` table for copied data

3. **Add the editor to your UI:**

   - Import `ProgramProgressionRulesEditor`
   - Add to your program edit page (e.g., in a "Progression Rules" tab)
   - Pass required props

4. **Verify with different exercise types:**
   - Create templates with each type
   - Assign to programs
   - Verify all fields copied correctly

## Support

For issues or questions:

1. Check browser console for errors
2. Verify database schema matches migration
3. Check RLS policies allow coach access
4. Review this documentation

---

**Last Updated:** 2025-11-06
**Version:** 1.0.0

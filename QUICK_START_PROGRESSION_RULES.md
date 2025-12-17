# Quick Start: Program Progression Rules

## 🚀 What's Been Implemented

A complete system for managing program-specific workout modifications. When coaches assign workout templates to programs, the workout data is automatically copied to `program_progression_rules` where it can be edited independently without affecting the original templates.

## ✅ Implementation Complete

### Files Created

1. **`migrations/create_program_progression_rules_schema.sql`**

   - Complete database schema with all columns for every exercise type
   - RLS policies
   - Indexes for performance

2. **`src/lib/programProgressionService.ts`**

   - `copyWorkoutToProgram()` - Copies workout data from templates
   - `getProgressionRules()` - Loads rules with Week 1 auto-populate
   - `updateProgressionRule()` - Updates individual fields
   - `replaceExercise()` - Swaps exercises
   - `replaceWorkout()` - Replaces entire workouts

3. **`src/components/coach/ProgramProgressionRulesEditor.tsx`**

   - Visual editor for progression rules
   - Displays all fields based on exercise type
   - Auto-populates from Week 1
   - Tracks and saves changes

4. **`src/components/coach/EnhancedProgramManager.tsx` (Modified)**
   - Automatically calls copy logic when templates are assigned
   - Integrated with ProgramProgressionService

### Files Modified

- `src/components/coach/EnhancedProgramManager.tsx`
  - Added import for `ProgramProgressionService`
  - Added automatic copy logic in schedule save handler (lines 1236-1321)

## 📋 Next Steps (30 minutes)

### Step 1: Run Database Migration (5 min)

1. Open Supabase SQL Editor
2. Copy contents of `migrations/create_program_progression_rules_schema.sql`
3. Execute the SQL
4. Verify table created:
   ```sql
   SELECT * FROM program_progression_rules LIMIT 1;
   ```

### Step 2: Test the Copy Logic (10 min)

1. Open your application
2. Navigate to Programs page
3. Create or edit a program
4. Assign a workout template to a program day
5. Save the program

**Verify in database:**

```sql
SELECT
  block_type,
  block_order,
  exercise_id,
  sets,
  reps,
  rest_seconds
FROM program_progression_rules
WHERE program_id = 'your-program-id'
ORDER BY block_order, exercise_order;
```

You should see workout data copied from the template!

### Step 3: Add Editor to Program UI (15 min)

Find where you edit programs (probably in a modal or page), and add the progression rules editor:

```typescript
import ProgramProgressionRulesEditor from "@/components/coach/ProgramProgressionRulesEditor";

// In your program edit component:
<ProgramProgressionRulesEditor
  programId={selectedProgram.id}
  programScheduleId={selectedSchedule.id}
  weekNumber={selectedWeek}
  exercises={allExercises}
  onUpdate={() => {
    // Reload program data
    loadProgram();
  }}
/>;
```

**Typical integration location:**

- In a tab called "Progression Rules" or "Weekly Changes"
- Below the schedule/calendar view
- In a modal when clicking a program day

## 🎯 Quick Test Scenarios

### Test 1: Basic Copy

1. Create program with 1 workout
2. Check database - should have progression rules
3. ✅ Original template unchanged

### Test 2: Week 1 Edit

1. Open progression rules editor for Week 1
2. Change sets from 3 to 4
3. Save
4. ✅ Database updated with sets = 4

### Test 3: Week 2 Auto-Populate

1. Open progression rules editor for Week 2
2. ✅ Should show Week 1 data with blue "placeholder" banner
3. Edit reps from "10" to "12"
4. Save
5. ✅ New rules created for Week 2 with reps = "12"
6. ✅ Week 1 unchanged (still reps = "10")

### Test 4: Replace Exercise

1. Click "Replace" button on any exercise
2. Select new exercise
3. ✅ Only exercise_id changes, sets/reps/rest stay same

## 🔧 Typical UI Integration Example

Here's how to add the progression rules editor to your existing program manager:

```tsx
// In your ProgramEditPage or ProgramDetailsModal

const [selectedWeek, setSelectedWeek] = useState(1);
const [selectedSchedule, setSelectedSchedule] = useState(null);

return (
  <Tabs>
    <TabsList>
      <TabsTrigger value="schedule">Schedule</TabsTrigger>
      <TabsTrigger value="progression">Progression Rules</TabsTrigger>
    </TabsList>

    <TabsContent value="schedule">
      {/* Your existing schedule UI */}
    </TabsContent>

    <TabsContent value="progression">
      {/* Week selector */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: program.duration_weeks }, (_, i) => i + 1).map(
          (week) => (
            <Button
              key={week}
              variant={selectedWeek === week ? "default" : "outline"}
              onClick={() => setSelectedWeek(week)}
            >
              Week {week}
            </Button>
          )
        )}
      </div>

      {/* Day selector */}
      <div className="flex gap-2 mb-4">
        {program.schedule?.map((schedule) => (
          <Button
            key={schedule.id}
            variant={
              selectedSchedule?.id === schedule.id ? "default" : "outline"
            }
            onClick={() => setSelectedSchedule(schedule)}
          >
            Day {schedule.program_day}
          </Button>
        ))}
      </div>

      {/* Progression rules editor */}
      {selectedSchedule && (
        <ProgramProgressionRulesEditor
          programId={program.id}
          programScheduleId={selectedSchedule.id}
          weekNumber={selectedWeek}
          exercises={exercises}
          onUpdate={loadProgram}
        />
      )}
    </TabsContent>
  </Tabs>
);
```

## 🐛 Troubleshooting

### No rules showing

- **Check:** Did you run the migration?
- **Check:** Is the workout template assigned in `program_schedule`?
- **Check:** Browser console for errors

### Copy not triggering

- **Check:** Is the schedule insert/update successful?
- **Check:** Browser console logs for "🔄 Copying X workouts..."
- **Check:** Supabase logs for errors

### Can't save edits

- **Check:** RLS policies allow coach to update
- **Check:** Coach ID matches program coach_id
- **Check:** Browser console for error messages

## 📊 Database Verification Queries

```sql
-- Check if workout was copied
SELECT COUNT(*) as rule_count
FROM program_progression_rules
WHERE program_id = 'your-program-id'
  AND week_number = 1;

-- View Week 1 rules
SELECT
  block_type,
  block_order,
  e.name as exercise_name,
  sets,
  reps,
  rest_seconds
FROM program_progression_rules pr
LEFT JOIN exercises e ON e.id = pr.exercise_id
WHERE pr.program_id = 'your-program-id'
  AND pr.week_number = 1
ORDER BY pr.block_order, pr.exercise_order;

-- Check for Week 2+ modifications
SELECT week_number, COUNT(*) as rules
FROM program_progression_rules
WHERE program_id = 'your-program-id'
GROUP BY week_number
ORDER BY week_number;
```

## 🎨 Styling Notes

The `ProgramProgressionRulesEditor` uses your existing UI components:

- `Card`, `CardContent` for block grouping
- `Badge` for block types and exercise letters
- `Input` for all editable fields
- `Button` for save/replace actions

It's fully theme-aware (light/dark mode) using `useTheme()`.

## 🚨 Important Rules

1. **NEVER store JSON in `notes`** - Use proper columns
2. **NEVER modify `workout_templates`** - Only modify `program_progression_rules`
3. **ALWAYS copy on template assignment** - Happens automatically
4. **Week 1 is the source** - Other weeks auto-populate from it

## 📞 Support

If you encounter issues:

1. Check `PROGRAM_PROGRESSION_IMPLEMENTATION.md` for detailed docs
2. Review browser console logs
3. Check Supabase logs
4. Verify database schema matches migration

## 🎉 Success Indicators

You'll know it's working when:

✅ Workout templates assigned to programs automatically create progression rules
✅ Progression rules editor displays all exercise fields correctly
✅ Week 2+ shows Week 1 data as placeholders
✅ Editing creates new rules for that specific week
✅ Original workout templates remain unchanged
✅ All 13 exercise types display correctly

---

**Ready to test!** Start with Step 1 above.

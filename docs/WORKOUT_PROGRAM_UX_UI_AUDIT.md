# WORKOUT & PROGRAM CREATION UX/UI AUDIT

**Date:** February 20, 2026  
**Scope:** Complete audit of workout template and program creation, editing, assignment, and detail screens  
**Status:** READ-ONLY AUDIT - NO MODIFICATIONS MADE

---

## TABLE OF CONTENTS

1. [Workout Template - Create](#1-workout-template---create)
2. [Workout Template - Edit](#2-workout-template---edit)
3. [Workout Template - Detail/View](#3-workout-template---detailview)
4. [All Block Type Forms](#4-all-block-type-forms)
5. [Program - Create](#5-program---create)
6. [Program - Edit](#6-program---edit)
7. [Program - Detail/View](#7-program---detailview)
8. [Workout Assignment](#8-workout-assignment)
9. [Program Assignment](#9-program-assignment)
10. [Exercise Search/Selection](#a-exercise-searchselection)
11. [Set Configuration Pattern](#b-set-configuration-pattern)
12. [Shared Components](#c-shared-components)
13. [Navigation Flow](#d-navigation-flow)
14. [Critical Bug Analysis](#critical-bug-analysis)

---

## 1. WORKOUT TEMPLATE — CREATE

### File Path
`src/app/coach/workouts/templates/create/page.tsx`

### Component Name
`CreateWorkoutTemplatePage`

### UI Structure

**Top to Bottom:**
1. **Back Navigation Link** - "Back to Training" button (top-left, above header)
2. **Sticky Header** (glass effect, border-bottom)
   - Back arrow button (left)
   - Title: "Create Template" + subtitle "Builder Mode" (left)
   - Preview button (right, non-functional - onClick={() => {}})
3. **Main Content Area** (max-w-7xl, centered)
   - `WorkoutTemplateForm` component (renderMode="page")

### Form Fields

**Basic Information Section:**
- **Name** (Input, required)
  - Type: text
  - Placeholder: Not visible in code
  - Validation: Required for save
  - Default: Empty string

- **Description** (Textarea)
  - Type: text
  - Placeholder: Not visible in code
  - Default: Empty string

- **Category** (Select)
  - Type: dropdown
  - Options: Loaded from `workout_categories` table (coach-specific)
  - Stores: category name (text) + categoryId (for Select value)
  - Default: Empty string

- **Estimated Duration** (Select)
  - Type: dropdown
  - Options: 30, 45, 60, 75, 90, 120 minutes
  - Default: 60 minutes

- **Difficulty Level** (Select)
  - Type: dropdown
  - Options: Beginner, Intermediate, Advanced, Athlete
  - Default: "Beginner"

**Workout Flow Section:**
- Dynamic list of exercises/blocks
- Each exercise rendered as `ExerciseBlockCard` containing `ExerciseDetailForm`
- Drag-and-drop enabled for reordering

### Interaction Patterns

**Adding Exercises:**
- "Add Exercise" button opens inline form above the list
- Exercise type selector (dropdown) - 15+ block types available
- Exercise search/select (SearchableSelect component)
- Form fields change dynamically based on selected exercise type
- Save button adds exercise to list

**Reordering:**
- Drag-and-drop using `@hello-pangea/dnd`
- Grip handle visible on desktop (hidden on mobile)
- Visual feedback during drag (opacity-50)

**Editing:**
- Edit button on each `ExerciseBlockCard`
- Opens `ExerciseDetailForm` inline
- Changes save immediately to exercise state

**Deleting:**
- Delete button (X icon) on each card
- Confirmation: None (immediate deletion)

### Block Types & Forms

See [Section 4: All Block Type Forms](#4-all-block-type-forms)

### States (Loading / Empty / Error)

**Loading State:**
- No explicit loading state for form itself
- Individual async operations may show loading

**Empty State:**
- Shows when `exercises.length === 0`
- Icon: Dumbbell (large, dimmed)
- Heading: "Empty Workout"
- Message: "Start building your workout by adding exercises and blocks in any order you want!"
- CTA: "Add Exercise" button

**Error Handling:**
- Save errors: Alert popup (alert())
- No inline error messages visible
- No validation feedback before save attempt

### Visual Style

- Uses theme classes: `fc-surface`, `fc-glass`, `fc-text-primary`, `fc-text-dim`
- Consistent rounded-2xl borders
- AnimatedBackground + FloatingParticles (if enabled)
- Responsive: sm: breakpoints for mobile/desktop differences

### Pain Points & Issues

1. **Preview button is non-functional** - onClick={() => {}} does nothing
2. **No validation feedback** - Form allows saving with empty name (validation happens on save)
3. **No draft auto-save indicator** - Drafts save to localStorage but no UI feedback
4. **Delete has no confirmation** - Easy to accidentally delete exercises
5. **Mobile drag-and-drop** - Grip handle hidden on mobile, unclear how to reorder

---

## 2. WORKOUT TEMPLATE — EDIT

### File Path
`src/app/coach/workouts/templates/[id]/edit/page.tsx`

### Component Name
`EditWorkoutTemplatePage`

### UI Structure

**Top to Bottom:**
1. **Back Navigation Link** - "Back to Training" button
2. **Sticky Nav Bar** (glass effect)
   - Back arrow + Title "Edit Template" + template name + "Saved" indicator
   - "Revert to Original" button (non-functional - no onClick handler)
   - "Preview" button (non-functional)
3. **Main Content**
   - `WorkoutTemplateForm` component with:
     - `template={template}` prop
     - `initialBlocks={initialBlocks}` prop
     - `renderMode="page"`

### Form Fields

Same as Create form (see Section 1), but:
- **Pre-populated** from existing template data
- **Category** loads existing category name and finds matching ID
- **Difficulty** capitalizes first letter (e.g., "beginner" → "Beginner")

### How It Loads Existing Data

**Loading Flow:**
1. Page component loads template via `WorkoutTemplateService.getWorkoutTemplateById()`
2. Page component loads blocks via `WorkoutBlockService.getWorkoutBlocks(templateId, { lite: true })`
3. Both loaded in parallel using `Promise.all()`
4. Sets `initialBlocks` state
5. Passes `initialBlocks` to `WorkoutTemplateForm` as prop
6. `WorkoutTemplateForm` receives `initialBlocks` in useEffect (line 1088-1111)
7. Calls `convertBlocksToExercises(initialBlocks)` to transform blocks → exercises
8. Sets `exercises` state for rendering

**Data Preservation:**
- Block IDs preserved (`exercise.id = block.id`)
- All block-level data converted to exercise format
- Complex block types (superset, giant_set, etc.) preserve nested exercise data
- Time protocols preserved for time-based blocks

### Critical Bug: Blocks Load But Don't Render

**SYMPTOM:** Console shows 6 blocks loaded, 7 exercises confirmed, but UI shows 0 rendered blocks.

**CODE PATH ANALYSIS:**

1. **initialBlocks Received** (edit/page.tsx:65)
   ```typescript
   setInitialBlocks(blocks || []);
   ```

2. **Passed to Form** (edit/page.tsx:193)
   ```typescript
   <WorkoutTemplateForm
     initialBlocks={initialBlocks ?? undefined}
   />
   ```

3. **Form Receives Prop** (WorkoutTemplateForm.tsx:101)
   ```typescript
   initialBlocks,
   ```

4. **useEffect Checks initialBlocks** (WorkoutTemplateForm.tsx:1088-1111)
   ```typescript
   if (!hasLoadedBlocks.current) {
     if (initialBlocks !== undefined && initialBlocks !== null && Array.isArray(initialBlocks) && initialBlocks.length > 0) {
       setWorkoutBlocks(initialBlocks);
       convertBlocksToExercises(initialBlocks);  // ← CONVERTS BLOCKS TO EXERCISES
       hasLoadedBlocks.current = true;
     }
   }
   ```

5. **convertBlocksToExercises Function** (WorkoutTemplateForm.tsx:670-2336)
   - Loops through blocks
   - Creates exercise objects from each block
   - Calls `setExercises(convertedExercises)` at the end

6. **Rendering Gate** (WorkoutTemplateForm.tsx:4463)
   ```typescript
   {exercises.length > 0 ? (
     <DragDropContext>
       {exercises.map((exercise, index) => {
         // Renders ExerciseBlockCard for each exercise
       })}
     </DragDropContext>
   ) : (
     // Empty state
   )}
   ```

**ROOT CAUSE HYPOTHESIS:**

The `convertBlocksToExercises` function is a `useCallback` (line 670) that depends on `[]` (no dependencies). However, it calls `setExercises()` which may not trigger a re-render if:

1. **Timing Issue:** `convertBlocksToExercises` is called before `exercises` state is initialized, or
2. **State Update Issue:** The `setExercises` call inside `convertBlocksToExercises` may be batched incorrectly, or
3. **Dependency Issue:** The callback dependencies may be missing, causing stale closure

**EVIDENCE:**
- Console logs show blocks are loaded (6 blocks)
- `convertBlocksToExercises` is called (console.log at line 1095)
- But `exercises.length` remains 0 at render time

**LIKELY FIX LOCATION:**
- Check if `setExercises` is actually being called inside `convertBlocksToExercises`
- Verify the `convertedExercises` array is populated before `setExercises` call
- Check for early returns or conditions that skip `setExercises`

### Are There Fields That Reset or Lose Data?

**Potential Issues:**
- **Category:** If category name doesn't match any in coach's categories list, categoryId becomes empty (but category name preserved)
- **Block order:** Preserved via `order_index` in converted exercises
- **Complex block data:** All nested exercises, time protocols, special tables preserved

### States (Loading / Empty / Error)

**Loading State:**
- Shows skeleton/pulse animation while template/blocks load
- "Loading..." text in centered card

**Empty State:**
- Same as Create form (see Section 1)

**Error State:**
- Redirects to `/coach/workouts/templates` if template not found
- No error message displayed to user

### Visual Style

Same as Create form (see Section 1)

### Pain Points & Issues

1. **CRITICAL BUG:** Blocks load but don't render (see bug analysis above)
2. **"Revert to Original" button non-functional** - No onClick handler
3. **"Preview" button non-functional** - onClick={() => {}}
4. **No unsaved changes warning** - Can navigate away without saving
5. **"Saved" indicator always shows** - Doesn't reflect actual save state

---

## 3. WORKOUT TEMPLATE — DETAIL/VIEW

### File Path
`src/app/coach/workouts/templates/[id]/page.tsx`

### Component Name
`WorkoutTemplateDetailsPage`

### UI Structure

**Top to Bottom:**
1. **Navigation Bar**
   - "Back to Training" link
   - "Back to Templates" link
   - Action buttons: Duplicate, Delete, Edit Template
2. **Header Section**
   - Category badge + Difficulty badge
   - Template name (h1, 3xl)
   - Description (if exists)
3. **Stats Grid** (4 columns: Duration, Exercises, Assignments, Rating)
4. **Workout Flow Section**
   - Heading: "Workout Flow" + block count
   - Scrollable list (max-h-[600px] sm:max-h-[700px])
   - Each block rendered as `ExerciseBlockCard` with `renderMode="view"`

### Information Displayed

**Template Metadata:**
- Name, description, category, difficulty
- Estimated duration, exercise count, usage count, rating

**Blocks:**
- Each block shown as card with:
  - Block type icon + name
  - Exercise details (name, sets, reps, rest, etc.)
  - Block-specific configuration (drop sets, cluster sets, etc.)
  - Color-coded left border (indigo for straight_set, amber for superset, green for time-based)

**Block Details Shown:**
- Exercise name(s)
- Sets × Reps
- Rest time
- RIR, Tempo (if set)
- Load percentage / Weight
- Block-specific data (drop percentage, cluster config, time protocols, etc.)

### Can You See Set Configurations?

**Yes** - All set configurations visible:
- Sets count
- Reps per set
- Rest seconds
- RIR (Reps in Reserve)
- Tempo
- Load percentage or Weight
- Block-specific fields (drop sets, cluster sets, time protocols)

### Preview Mode

No separate preview mode - this IS the preview/view mode.

### Links to Actions

**Available Actions:**
- **Edit:** Link to `/coach/workouts/templates/${id}/edit`
- **Duplicate:** Calls `WorkoutTemplateService.duplicateWorkoutTemplate()`
- **Delete:** Confirmation dialog → `WorkoutTemplateService.deleteWorkoutTemplate()`
- **Assign:** Not visible on this page (assignment happens from templates list page)

### States (Loading / Empty / Error)

**Loading State:**
- Pulse animation skeleton
- "Loading..." text

**Empty State:**
- Shows when `workoutBlocks.length === 0`
- Icon: Dumbbell (large)
- Heading: "No exercises yet"
- Message: "Add exercises to this template to get started"
- CTA: "Add Exercises" button → links to edit page

**Error State:**
- Shows error card with icon
- Message: Error message or "Template not found"
- CTA: "Back to Templates" button

### Visual Style

- Consistent theme classes
- Color-coded block borders
- Responsive grid (1 col mobile → 4 cols desktop)
- Scrollable workout flow section

### Pain Points & Issues

1. **No assignment action** - Must go back to templates list to assign
2. **Stats show "0" for assignments** - May not reflect actual usage
3. **Rating always shows** - Even if no ratings exist (shows 0/5)
4. **Scrollable section** - Long workouts require scrolling, no pagination

---

## 4. ALL BLOCK TYPE FORMS

### Block Types Supported

1. **Straight Set** (`straight_set`)
2. **Superset** (`superset`)
3. **Giant Set** (`giant_set`)
4. **Drop Set** (`drop_set`)
5. **Cluster Set** (`cluster_set`)
6. **Rest-Pause** (`rest_pause`)
7. **Pre-Exhaustion** (`pre_exhaustion`)
8. **AMRAP** (`amrap`)
9. **EMOM** (`emom`)
10. **For Time** (`for_time`)
11. **Tabata** (`tabata`)
12. **Circuit** (`circuit`) - Note: Deprecated/removed in some contexts
13. **HR Sets** (`hr_sets`)

### How to Create Each Block Type

**Method:** Click "Add Exercise" → Select exercise type from dropdown → Fill form fields

**Button Label:** "Add Exercise" (not "Add Block" - terminology inconsistency)

**Modal/Inline:** Inline form (not modal) - appears above exercise list when `showAddExercise === true`

### Block Type-Specific Forms

#### 1. STRAIGHT SET

**Fields:**
- Exercise (SearchableSelect - required)
- Sets (number input)
- Reps (text input - supports ranges like "10-12")
- Rest Seconds (number input)
- RIR (number input, optional)
- Tempo (text input, optional - e.g., "2-1-2-0")
- Load % / Weight (toggle between percentage or kg)
- Notes (textarea, optional)

**Visual:** Purple accent color, Dumbbell icon

#### 2. SUPERSET

**Fields:**
- First Exercise (SearchableSelect - required)
- Sets (number input)
- Reps (text input)
- Rest Seconds (number input)
- RIR (number input, optional)
- Tempo (text input, optional)
- Load % / Weight (for first exercise)
- **Second Exercise** (SearchableSelect - required)
- **Second Exercise Reps** (text input)
- **Second Exercise Load % / Weight** (toggle)
- **Second Exercise RIR** (optional)
- **Second Exercise Tempo** (optional)
- Notes (textarea, optional)

**Visual:** Amber accent color, Zap icon

**How Exercises Added:** Two separate exercise selectors (first + second)

#### 3. GIANT SET

**Fields:**
- Sets (number input)
- **Giant Set Exercises** (array of exercises)
  - For each exercise:
    - Exercise (SearchableSelect)
    - Reps (text input)
    - Load % / Weight (toggle)
    - RIR (optional)
    - Tempo (optional)
- Rest Seconds (number input)
- Notes (textarea, optional)

**Visual:** Target icon

**How Exercises Added:** "Add Exercise" button within giant set form adds to `giant_set_exercises` array

#### 4. DROP SET

**Fields:**
- Exercise (SearchableSelect - required)
- Sets (number input)
- Main Reps (text input - initial set reps)
- Rest Seconds (number input)
- **Drop Percentage** (number input - e.g., 20 = 20% weight reduction)
- **Drop Set Reps** (text input - reps for drop sets)
- Load % / Weight (for initial set)
- RIR (optional)
- Tempo (optional)
- Notes (textarea, optional)

**Visual:** TrendingDown icon

**How Exercises Added:** Single exercise selector

#### 5. CLUSTER SET

**Fields:**
- Exercise (SearchableSelect - required)
- Sets (number input)
- Reps Per Cluster (number input)
- Clusters Per Set (number input)
- Intra-Cluster Rest (number input - seconds)
- Rest Seconds (number input - between sets)
- Load % / Weight (toggle)
- RIR (optional)
- Tempo (optional)
- Notes (textarea, optional)

**Visual:** Timer icon

**How Exercises Added:** Single exercise selector

#### 6. REST-PAUSE

**Fields:**
- Exercise (SearchableSelect - required)
- Sets (number input)
- Reps (text input)
- Rest Seconds (number input - between sets)
- **Rest-Pause Duration** (number input - seconds for each pause)
- **Max Rest-Pauses** (number input - maximum pauses allowed)
- Load % / Weight (toggle)
- RIR (optional)
- Tempo (optional)
- Notes (textarea, optional)

**Visual:** PauseCircle icon

**How Exercises Added:** Single exercise selector

#### 7. PRE-EXHAUSTION

**Fields:**
- **Isolation Exercise** (SearchableSelect - required, first exercise)
- Isolation Reps (text input)
- Isolation Load % / Weight (toggle)
- Isolation RIR (optional)
- Isolation Tempo (optional)
- **Compound Exercise** (SearchableSelect - required, second exercise)
- Compound Reps (text input)
- Compound Load % / Weight (toggle)
- Compound RIR (optional)
- Compound Tempo (optional)
- Sets (number input)
- Rest Seconds (number input)
- Notes (textarea, optional)

**Visual:** Activity icon

**How Exercises Added:** Two separate exercise selectors (isolation + compound)

#### 8. AMRAP

**Fields:**
- Exercise (SearchableSelect - required)
- **Duration** (number input - minutes)
- Rounds (number input - optional, for tracking)
- Rest Seconds (number input - between rounds if applicable)
- Load % / Weight (toggle)
- Notes (textarea, optional)

**Visual:** RotateCcw icon, green accent

**How Exercises Added:** Single exercise selector

#### 9. EMOM

**Fields:**
- Exercise (SearchableSelect - required)
- **Duration** (number input - minutes)
- **EMOM Mode** (select: "reps" or "time")
- **EMOM Reps** (number input - if mode is "reps")
- Rest Seconds (number input - between rounds)
- Load % / Weight (toggle)
- Notes (textarea, optional)

**Visual:** Clock icon, green accent

**How Exercises Added:** Single exercise selector

#### 10. FOR TIME

**Fields:**
- Exercise (SearchableSelect - required)
- **Target Reps** (number input)
- **Time Cap** (number input - minutes)
- Rest Seconds (number input)
- Load % / Weight (toggle)
- Notes (textarea, optional)

**Visual:** Zap icon, green accent

**How Exercises Added:** Single exercise selector

#### 11. TABATA

**Fields:**
- **Tabata Sets** (array of sets)
  - Each set contains:
    - **Exercises** (array - multiple exercises per set)
      - For each exercise:
        - Exercise (SearchableSelect)
        - Work Seconds (number input)
        - Rest After (number input - seconds)
        - Load % / Weight (toggle)
    - Rest Between Sets (number input)
- **Rounds** (number input - total rounds)
- **Work Seconds** (number input - default work time)
- **Rest After** (number input - default rest time)
- Notes (textarea, optional)

**Visual:** Flame icon, green accent

**How Exercises Added:** "Add Exercise" button within each set adds to `tabata_sets[setIndex].exercises` array

**Complexity:** Most complex block type - nested structure (sets → exercises → fields)

#### 12. CIRCUIT

**Fields:**
- **Circuit Sets** (array of sets)
  - Each set contains:
    - **Exercises** (array - multiple exercises per set)
      - For each exercise:
        - Exercise (SearchableSelect)
        - Sets (number input - per exercise)
        - Reps (text input)
        - Rest Seconds (number input - between exercises)
        - Load % / Weight (toggle)
    - Rest Between Sets (number input)
- Rounds (number input - total rounds)
- Notes (textarea, optional)

**Visual:** Repeat icon, green accent

**How Exercises Added:** "Add Exercise" button within each set adds to `circuit_sets[setIndex].exercises` array

**Note:** Circuit block type may be deprecated/removed in some contexts (code comments suggest removal)

#### 13. HR SETS

**Fields:**
- **HR Is Intervals** (checkbox - toggle between intervals and steady-state)
- **HR Zone** (select - zone 1-5)
- **HR Percentage Min** (number input - %)
- **HR Percentage Max** (number input - %)
- **HR Duration Minutes** (number input - total duration)
- **HR Work Duration Minutes** (number input - if intervals)
- **HR Rest Duration Minutes** (number input - if intervals)
- **HR Target Rounds** (number input - if intervals)
- **HR Distance Meters** (number input - optional)
- **HR Set Exercises** (array - exercises for HR training)
- Notes (textarea, optional)

**Visual:** Activity icon

**How Exercises Added:** "Add Exercise" button adds to `hr_set_exercises` array

### Visual Representation Differences

**Color Coding:**
- Straight Set: Indigo border (`var(--fc-accent-indigo)`)
- Superset: Amber border (`var(--fc-accent-amber)`)
- Time-based (AMRAP, EMOM, For Time, Tabata, Circuit): Green border (`var(--fc-accent-success)`)

**Icons:**
- Each block type has unique icon (see blockTypeStyles in ExerciseBlockCard.tsx)

**Layout:**
- Simple blocks: Single column form
- Complex blocks (Tabata, Circuit, Giant Set): Nested arrays with "Add Exercise" buttons

### Advanced Settings

**Load Percentage vs Weight Toggle:**
- All resistance training blocks support toggle between:
  - Load %: Percentage of estimated 1RM
  - Weight: Specific weight in kg
- Toggle state stored per exercise in `exerciseToggleModes` state

**Progressive Overload:**
- Not visible in form - handled at program level via progression rules

**Time Protocols:**
- Time-based blocks store protocol data in `workout_time_protocols` table
- Fields: rounds, work_seconds, rest_seconds, total_duration_minutes, etc.

### Pain Points & Issues

1. **Terminology Inconsistency:** Form says "Add Exercise" but creates "Blocks"
2. **Complex Block Types:** Tabata/Circuit forms are deeply nested, hard to understand
3. **No Block Type Descriptions:** Dropdown doesn't explain what each type is
4. **Validation:** No validation that required fields are filled before save
5. **HR Sets:** Very complex form, unclear use case
6. **Circuit Deprecated:** Code comments suggest removal but still in UI

---

## 5. PROGRAM — CREATE

### File Path
`src/app/coach/programs/create/page.tsx`

### Component Name
`CreateProgramContent` (wrapped in `CreateProgramPage`)

### UI Structure

**Top to Bottom:**
1. **Breadcrumb Navigation** - "Programs / New Creation"
2. **Header**
   - Title: "Create Training Program"
   - Subtitle: "Define the blueprint for your client's success."
3. **Form Card** (fc-surface, rounded-2xl)
   - **Program Basics Section**
     - Program Name (Input, required)
     - Description (Textarea)
     - Difficulty Level (Select: beginner, intermediate, advanced, athlete)
     - Duration Weeks (Input, number, 1-52)
     - Training Category (Select, optional - for volume calculator)
   - **Action Buttons** (bottom)
     - Cancel (ghost button)
     - Create Program (primary button, disabled if name empty)
4. **Info Card** (below form)
   - Info icon + message about next steps after creation

### Form Fields

| Field | Type | Required | Default | Validation | Notes |
|-------|------|----------|---------|------------|-------|
| Program Name | Input (text) | Yes | "" | Trim check on save | Placeholder: "e.g., 8-Week Strength Builder" |
| Description | Textarea | No | "" | None | Placeholder: "Describe the program goals and structure..." |
| Difficulty Level | Select | No | "intermediate" | None | Options: beginner, intermediate, advanced, athlete |
| Duration Weeks | Input (number) | No | 8 | Min: 1, Max: 52 | Number input |
| Training Category | Select | No | "none" | None | Loaded from workout_categories table, optional for volume calculator |

### How Are Workout Days/Weeks Structured?

**Not in Create Form** - Create form only collects basic info. Weekly schedule is configured in Edit page (see Section 6).

### How Are Workouts Assigned to Days?

**Not in Create Form** - Happens in Edit page → Schedule tab (see Section 6).

### Is There a Calendar/Week View?

**Not in Create Form** - Available in Edit page (see Section 6).

### Can You Set Progression Rules?

**Not in Create Form** - Available in Edit page → Progression tab (see Section 6).

### Overall Flow

**Single-Step Form** (not wizard):
1. Fill basic info
2. Click "Create Program"
3. Redirects to `/coach/programs/${id}/edit` for schedule/progression setup

### States (Loading / Empty / Error)

**Loading State:**
- Button shows "Creating..." text
- Button disabled during save

**Empty State:**
- N/A (form always shows)

**Error Handling:**
- Alert popup on error: `alert("Failed to create program...")`
- Console error logging
- No inline error messages

### Visual Style

- Consistent theme classes
- Info card uses semantic color (trust.primary)
- Responsive grid (1 col mobile → 2 cols desktop for difficulty/duration)
- Gradient button on save

### Pain Points & Issues

1. **No validation feedback** - Can attempt save with empty name (button disabled but no message)
2. **Alert popups** - Uses browser `alert()` instead of toast notifications
3. **No draft saving** - Unlike workout templates, no localStorage draft
4. **Redirect after create** - Uses `window.location.href` instead of Next.js router
5. **Category optional but unclear** - Message says "optional - for volume calculator" but doesn't explain impact

---

## 6. PROGRAM — EDIT

### File Path
`src/app/coach/programs/[id]/edit/page.tsx`

### Component Name
`EditProgramContent` (wrapped in `EditProgramPage`)

### UI Structure

**Top to Bottom:**
1. **Back Button** - "Back to Program"
2. **Header Card** (fc-surface)
   - Icon: BookOpen (green gradient)
   - Badge: "Program Editor"
   - Title: "Edit Program"
   - Subtitle: Program name
3. **Tab Navigation** (3 tabs in rounded pill container)
   - Basic Info
   - Weekly Schedule
   - Progression Rules
4. **Tab Content** (changes based on active tab)

### Form Fields

#### BASIC INFO TAB

Same fields as Create form (see Section 5), plus:
- **Active Toggle** (checkbox)
  - Label: "Program is active and visible to clients"
  - Default: `form.is_active` (from database)

#### WEEKLY SCHEDULE TAB

**Week Selector:**
- Select dropdown (1 to `duration_weeks`)
- Default: Week 1

**Days Grid:**
- 7 day cards (Day 1 through Day 7)
- Each card:
  - Day label + icon (Coffee for rest, Dumbbell for workout)
  - Select dropdown:
    - Options: "Rest Day" + list of workout templates
    - Value: `template_id` or "rest"

**Info Card:**
- Explains Week 1 auto-apply behavior
- Message: "When you set workouts for Week 1, they will automatically be applied to all other weeks."

**Program Volume Calculator:**
- Shows if program has category set
- Displays volume calculations based on schedule

#### PROGRESSION RULES TAB

**Week Selector:**
- Same as Schedule tab

**Day Selector:**
- Buttons for each scheduled workout in selected week
- Format: "Day X - Template Name"
- Clicking selects that day's schedule item

**Progression Rules Editor:**
- `ProgramProgressionRulesEditor` component
- Shows exercises from selected template
- Allows editing sets, reps, load %, etc. per week
- Supports progression suggestions (if category set)

### How Are Workout Days/Weeks Structured?

**Structure:**
- Programs have `duration_weeks` (1-52 weeks)
- Each week has 7 days (Day 1 = Monday, Day 7 = Sunday)
- Each day can have:
  - A workout template assigned (`template_id`)
  - Rest day (`template_id === "rest"`)

**Data Model:**
- `program_schedules` table stores:
  - `program_id`
  - `week_number` (1-based)
  - `program_day` (1-7)
  - `template_id` (or null for rest)

### How Are Workouts Assigned to Days?

**Method:**
1. Select week from dropdown
2. For each day card, select workout template from dropdown
3. Selection saves immediately via `WorkoutTemplateService.setProgramSchedule()`
4. If Week 1 is being edited, auto-applies to all other weeks

**Auto-Apply Logic:**
- When Week 1 schedule is set, copies to Weeks 2, 3, 4, etc.
- Also copies progression rules via `ProgramProgressionService.copyWorkoutToProgram()`
- Logs: `✅ Auto-applied Week 1 schedule to all other weeks`

### Calendar/Week View

**Not a Calendar** - Grid view of 7 days:
- Responsive: 1 col mobile → 2 cols tablet → 3 cols desktop → 4 cols xl
- Each day is a card with select dropdown
- Visual distinction: Rest days show Coffee icon (dimmed), workouts show Dumbbell icon (colored)

### Can You Set Progression Rules?

**Yes** - Progression Rules tab:
- Select week
- Select day (from scheduled workouts)
- Edit exercise parameters:
  - Sets, Reps, Load %, Weight, RIR, Tempo
  - Changes apply only to selected week
- **Progression Suggestions Button:**
  - Available if program has category
  - Opens `ProgressionSuggestionsModal`
  - Suggests progression based on coach guidelines

### How Does It Load Existing Program Structure?

**Loading Flow:**
1. Loads program from `workout_programs` table
2. Loads schedule via `WorkoutTemplateService.getProgramSchedule(programId)`
3. Loads all workout templates (coach's templates)
4. Loads blocks for scheduled templates via `WorkoutBlockService.getWorkoutBlocksForTemplates()`
5. Builds `templateExercises` and `templateBlocks` maps for display

**Performance:**
- Uses parallel loading (Promise.all) where possible
- Batches template/block queries
- Console timing logs in dev mode

### Can You Modify Schedule Without Losing Progress Data?

**Yes** - Schedule changes don't affect:
- Existing `workout_logs` (client workout history)
- Existing `workout_assignments` (already assigned workouts)
- Progression rules (stored separately per week)

**What Changes:**
- Only affects future assignments (new program assignments use updated schedule)

### States (Loading / Empty / Error)

**Loading State:**
- Spinner in centered card
- "Loading program..." text

**Empty States:**
- **No Schedule:** Info message in Schedule tab
- **No Progression Rules:** "Select a day above to edit progression rules" message

**Error Handling:**
- Alert popup: `alert("Failed to save schedule...")`
- Console error logging
- No inline error messages

### Visual Style

- Consistent theme classes
- Tab buttons use gradient when active
- Day cards use glass effect
- Responsive grid layouts
- Info cards with colored borders

### Pain Points & Issues

1. **Auto-apply behavior unclear** - Week 1 changes apply to all weeks, but not obvious
2. **No undo** - Can't revert auto-applied changes
3. **Schedule saves immediately** - No "Save" button, changes auto-save on select
4. **Progression rules complex** - Requires understanding of week/day selection
5. **No bulk operations** - Can't copy schedule from one week to another manually
6. **Volume calculator** - Only shows if category set, but category is optional

---

## 7. PROGRAM — DETAIL/VIEW

### File Path
`src/app/coach/programs/[id]/page.tsx`

### Component Name
`ProgramDetailsContent` (wrapped in `ProgramDetailsPage`)

### UI Structure

**Top to Bottom:**
1. **Navigation Bar**
   - "Back to Programs" link
   - Share + More actions buttons (non-functional)
2. **Header Section**
   - Difficulty badge + Program ID (first 8 chars)
   - Program name (h1, 3xl)
   - Description (if exists)
   - **Assigned Clients Card** (right side)
     - Shows "0 ACTIVE" badge
     - "Manage Access" link (non-functional)
3. **Progression Card** (left border accent)
   - Icon: TrendingUp
   - Title: "Progression"
   - Message: "Edit rules and weekly schedule in program settings."
   - "Edit Program" button → links to edit page
4. **Stats Grid** (4 columns)
   - Total Weeks
   - Active Clients (always 0)
   - Avg Duration (weeks)
   - Target Audience
5. **Training Schedule Section**
   - Heading: "Training Schedule"
   - **Week 1 Card**
     - Grid of 7 days
     - Each day shows: Day label + icon + template name or "Rest Day"

### Tabs

**NO TABS** - This is a single-page view (unlike edit page which has tabs).

**Content Sections:**
1. Header/Metadata
2. Stats
3. Training Schedule (Week 1 only)

### What Content Is Shown

**Program Metadata:**
- Name, description, difficulty, target audience
- Duration weeks, active clients count, average duration

**Schedule:**
- Week 1 schedule only (not all weeks)
- 7 days with assigned templates or "Rest Day"

**Progression:**
- Card with link to edit (doesn't show actual progression rules)

### Data Sources

- **Program:** `workout_programs` table (direct query)
- **Schedule:** `WorkoutTemplateService.getProgramSchedule(programId)`
- **Templates:** Individual queries per template ID from schedule
- **Clients:** Not loaded (shows hardcoded 0)

### Real Data or Placeholder?

**Real Data:**
- Program info: ✅ Real
- Schedule: ✅ Real (Week 1 only)
- Template names: ✅ Real

**Placeholder/Hardcoded:**
- Active Clients: ❌ Always shows 0 (hardcoded)
- Avg Duration: ❌ Shows `duration_weeks` (not actual average)
- Share/More buttons: ❌ Non-functional
- Manage Access link: ❌ Non-functional

### Issues

1. **Only shows Week 1** - Can't see other weeks' schedules
2. **Active Clients always 0** - Not calculated from `program_assignments`
3. **No progression rules display** - Only link to edit
4. **No workout details** - Doesn't show what exercises are in assigned templates
5. **Non-functional buttons** - Share, More, Manage Access do nothing

### Actions Available

- **Edit Program:** Link to `/coach/programs/${id}/edit` ✅
- **Duplicate:** Not available ❌
- **Delete:** Not available ❌
- **Assign:** Not available ❌ (happens from programs list page)
- **Share:** Button exists but non-functional ❌

### How Is Weekly Schedule Displayed?

**Display:**
- Grid of 7 day cards
- Each card shows:
  - Day number (Day 1, Day 2, etc.)
  - Icon (Coffee for rest, Dumbbell for workout)
  - Template name or "Rest Day"
- **Only Week 1** is shown (not selectable)

**Visual:**
- Cards use glass effect
- Rest days dimmed
- Workout days use colored icon

### Pain Points & Issues

1. **Limited information** - Only shows Week 1, no other weeks
2. **No client assignment info** - Shows 0 active clients (hardcoded)
3. **No workout preview** - Can't see what's in assigned templates
4. **Non-functional features** - Share, More, Manage Access buttons do nothing
5. **No duplicate/delete** - Must go back to programs list

---

## 8. WORKOUT ASSIGNMENT

### File Path
`src/components/WorkoutAssignmentModal.tsx`

### Component Name
`WorkoutAssignmentModal`

### How Does a Coach Assign a Workout to a Client?

**Entry Points:**
1. **From Templates List Page** (`/coach/workouts/templates`)
   - Click "Assign" button on template card
   - Opens modal with template pre-selected
2. **From Template Detail Page** - Not available (no assign button)
3. **Bulk Assignment** - Separate component (`BulkAssignment.tsx`)

### Assignment Flow

**3-Step Wizard:**

**Step 1: Select Workouts**
- Search bar for filtering templates
- Grid/list of workout templates (checkboxes)
- Shows: Name, duration, difficulty, category
- Can select multiple workouts
- "Next" button → Step 2

**Step 2: Select Clients**
- Search bar for filtering clients
- List of clients (checkboxes)
- Shows: Name, email, avatar (if available)
- Can select multiple clients
- "Next" button → Step 3

**Step 3: Review & Schedule**
- Summary of selected workouts + clients
- **Scheduled Date** (date picker, default: today)
- **Notes** (textarea, optional)
- "Assign Workouts" button → Executes assignment

### What Options Exist?

**Scheduling Options:**
- **Scheduled Date:** Date picker (default: today)
- **Notes:** Optional textarea for coach notes

**Assignment Options:**
- **Multiple Workouts:** Can assign multiple templates at once
- **Multiple Clients:** Can assign to multiple clients at once
- **Bulk Assignment:** All combinations created (workout × client)

### Can You Assign to Multiple Clients at Once?

**Yes** - Step 2 allows selecting multiple clients via checkboxes.

**Behavior:**
- Creates assignment for each workout × client combination
- Shows success/failure count after assignment
- Example: 3 workouts × 2 clients = 6 assignments created

### What Feedback Does the Coach Get After Assignment?

**Success Feedback:**
- Alert popup: `alert(\`Successfully assigned ${successCount} workout(s)!\`)`
- If failures: `alert(\`Failed to assign ${failureCount} workout(s). Please try again.\`)`
- Modal closes
- Calls `onSuccess()` callback (refreshes templates list)

**No Detailed Feedback:**
- Doesn't show which specific assignments succeeded/failed
- Doesn't show which clients received which workouts

### States (Loading / Empty / Error)

**Loading State:**
- "Assigning..." text on button
- Button disabled during assignment

**Empty States:**
- **No Workouts:** Message in Step 1
- **No Clients:** Alert: "No clients available. Please add clients before assigning workouts."

**Error Handling:**
- Alert popups for errors
- Console error logging
- Continues with other assignments if one fails (shows failure count)

### Visual Style

- Modal overlay (fixed inset-0, z-[9999])
- 3-step wizard with step indicators
- Search bars for filtering
- Checkbox selection
- Responsive layout

### Pain Points & Issues

1. **Alert popups** - Uses browser `alert()` instead of toast notifications
2. **No detailed feedback** - Doesn't show which assignments succeeded/failed
3. **No validation** - Can proceed without selecting workouts/clients (shows alert on submit)
4. **Date picker** - Basic HTML date input, no calendar UI
5. **No recurring assignments** - Can't set up recurring workouts
6. **Bulk assignment** - Creates all combinations, no way to assign specific workout to specific client only

---

## 9. PROGRAM ASSIGNMENT

### File Path
`src/components/coach/EnhancedProgramManager.tsx` (lines 231-309)

### Component Name
Assignment handled within `EnhancedProgramManager` component

### How Does a Coach Assign a Program to a Client?

**Entry Point:**
- From Programs List Page (`/coach/programs`)
- Click "Assign" button on program card
- Opens assignment modal

### Assignment Flow

**Modal Flow:**
1. **Load Clients**
   - Fetches active clients for coach
   - Fetches client profiles
   - Filters out already-assigned clients
   - Shows available clients only

2. **Select Clients**
   - List of clients with checkboxes
   - Search bar for filtering
   - Shows: Name, email, avatar

3. **Assign**
   - Click "Assign" button
   - Creates `program_assignments` records
   - Shows success alert
   - Closes modal

### What Options Exist?

**Assignment Options:**
- **Multiple Clients:** Can select multiple clients
- **Start Date:** Not visible in code (may be handled elsewhere)

**Filtering:**
- Already-assigned clients are filtered out automatically
- Shows alert if all clients already assigned

### What Happens If Client Already Has an Active Program?

**Behavior:**
- Already-assigned clients are **filtered out** from selection list
- Shows alert: "All clients already have this program assigned!"
- Modal closes if no available clients

**No Conflict Handling:**
- Doesn't check for other active programs
- Doesn't allow replacing existing program assignment
- Doesn't show which clients already have programs

### What Feedback Does the Coach Get After Assignment?

**Success Feedback:**
- Alert popup (exact message not visible in code snippet)
- Modal closes
- List refreshes

**No Detailed Feedback:**
- Doesn't show which clients received assignment
- Doesn't show start dates or schedule details

### States (Loading / Empty / Error)

**Loading State:**
- "Assigning..." text on button (assumed, not visible in snippet)

**Empty States:**
- **No Available Clients:** Alert + modal closes

**Error Handling:**
- Alert popups (assumed)
- Console error logging

### Visual Style

- Modal overlay
- Client list with checkboxes
- Search functionality
- Responsive layout

### Pain Points & Issues

1. **No start date selection** - Can't set when program starts for client
2. **No conflict detection** - Doesn't check for other active programs
3. **Filtered clients hidden** - Can't see which clients already have program
4. **Alert popups** - Uses browser `alert()` instead of toast
5. **No program preview** - Can't see program schedule before assigning

---

## A. EXERCISE SEARCH/SELECTION

### How Does the Exercise Picker Work?

**Component:** `SearchableSelect` (`src/components/ui/SearchableSelect.tsx`)

**Features:**
- **Search by name** - Real-time filtering as you type
- **Dropdown list** - Shows matching exercises
- **Exercise details** - Displays name + description
- **Keyboard navigation** - Arrow keys, Enter to select

### Search Functionality

**Search Method:**
- Filters exercises by name (case-insensitive)
- Real-time filtering (no debounce visible)
- Shows up to 50 results (slice(0, 50))

**No Advanced Filters:**
- Can't filter by muscle group
- Can't filter by category
- Can't filter by equipment

### Can You Create Exercises Inline?

**No** - Exercise picker only selects from existing exercises in `exercises` table.

**To Create Exercises:**
- Must go to Exercise Library page (separate flow)
- No quick-add from workout form

### Modal, Dropdown, Autocomplete, or Separate Page?

**Type:** **Autocomplete Dropdown** (SearchableSelect component)

**Behavior:**
- Opens dropdown when focused
- Shows search input at top
- Lists exercises below
- Click to select
- Closes on selection

### Where Is It Used?

**Used In:**
1. WorkoutTemplateForm - Exercise selection for all block types
2. ExerciseDetailForm - Main exercise picker
3. ProgramProgressionRulesEditor - Exercise replacement
4. Various other forms throughout app

### Pain Points & Issues

1. **No muscle group filter** - Hard to find exercises by target muscle
2. **No category filter** - Can't filter by exercise category
3. **Limited to 50 results** - Long lists are truncated
4. **No recent exercises** - Doesn't show recently used exercises
5. **No favorites** - Can't mark favorite exercises
6. **No exercise preview** - Can't see exercise details before selecting

---

## B. SET CONFIGURATION PATTERN

### How Are Sets Configured Across All Block Types?

**Shared Pattern:**
- Most block types use similar set configuration fields
- Fields: Sets, Reps, Rest Seconds, RIR, Tempo, Load %/Weight
- Implemented in `ExerciseDetailForm` component

### Is There a Shared Component?

**Yes** - `ExerciseDetailForm` (`src/components/features/workouts/ExerciseDetailForm.tsx`)

**Usage:**
- Used in WorkoutTemplateForm for editing exercises
- Used in ProgramProgressionRulesEditor for progression rules
- Supports all block types with conditional rendering

### Set Configuration Fields

**Common Fields (Most Block Types):**
- **Sets** (number input)
- **Reps** (text input - supports ranges like "10-12")
- **Rest Seconds** (number input)
- **RIR** (number input, optional - Reps in Reserve)
- **Tempo** (text input, optional - e.g., "2-1-2-0")
- **Load % / Weight** (toggle between percentage or kg)
- **Notes** (textarea, optional)

**Block-Specific Fields:**
- **Drop Set:** Drop Percentage, Drop Set Reps
- **Cluster Set:** Clusters Per Set, Reps Per Cluster, Intra-Cluster Rest
- **Rest-Pause:** Rest-Pause Duration, Max Rest-Pauses
- **Time-Based:** Duration, Rounds, Work Seconds, Rest After
- **Superset/Giant Set:** Multiple exercise configurations

### Can You Add/Remove Individual Sets?

**No** - Sets are configured as a single number (total sets).

**Exception:**
- **Tabata/Circuit:** Have "sets" array where each set contains multiple exercises
- Can add/remove sets via "Add Set" button

### Can You Copy Sets?

**No** - No copy/duplicate functionality for individual sets.

**Available:**
- Can duplicate entire exercise/block (via "Duplicate" button on ExerciseBlockCard)
- Can't copy set configuration from one exercise to another

### Pain Points & Issues

1. **No individual set editing** - Can't configure different reps/weight for each set
2. **No set templates** - Can't save common set configurations
3. **No copy between exercises** - Must manually re-enter set configs
4. **Reps as text** - Supports ranges but no validation
5. **No set notes** - Notes are block-level, not set-level

---

## C. SHARED COMPONENTS

### Block Editor Component

**Component:** `WorkoutBlockBuilder` (`src/components/coach/WorkoutBlockBuilder.tsx`)

**Purpose:** Create and manage workout blocks (legacy component, may not be actively used)

**Features:**
- Add block (select type from grid)
- Edit block (name, notes, rest, sets, reps)
- Delete block
- Reorder blocks (up/down arrows)

**Usage:** Not visible in main WorkoutTemplateForm flow (may be deprecated)

### Exercise Picker

**Component:** `SearchableSelect` (`src/components/ui/SearchableSelect.tsx`)

**Purpose:** Search and select exercises from library

**Features:**
- Real-time search
- Dropdown list
- Keyboard navigation

**Usage:** Used throughout workout/program forms

### Set Configuration Form

**Component:** `ExerciseDetailForm` (`src/components/features/workouts/ExerciseDetailForm.tsx`)

**Purpose:** Configure exercise parameters (sets, reps, rest, etc.)

**Features:**
- Dynamic fields based on exercise type
- Load % / Weight toggle
- Block-specific configurations

**Usage:** Used in WorkoutTemplateForm and ProgramProgressionRulesEditor

### Program Schedule Builder

**Component:** Built into `EditProgramContent` (Schedule tab)

**Purpose:** Assign workout templates to program days/weeks

**Features:**
- Week selector
- Day grid (7 days)
- Template selector per day
- Auto-apply Week 1 to all weeks

**Usage:** Only in Program Edit page

### Assignment Modal/Form

**Components:**
- `WorkoutAssignmentModal` - For workout assignments
- Assignment logic in `EnhancedProgramManager` - For program assignments

**Purpose:** Assign workouts/programs to clients

**Features:**
- Multi-step wizard (workouts → clients → review)
- Client search/filter
- Date selection
- Notes field

**Usage:** From templates/programs list pages

### Other Shared Components

**ExerciseBlockCard:**
- Displays exercise/block in card format
- Supports "form" and "view" render modes
- Shows block type icon, exercise name, configuration summary

**ExerciseDetailForm:**
- Inline form for editing exercise parameters
- Conditional rendering based on exercise type
- Supports all block types

**VolumeCalculatorWidget:**
- Shows volume calculations for workouts
- Only active when category supports volume calculator
- Displays sets × reps × weight calculations

---

## D. NAVIGATION FLOW

### Full Coach Workflow

**1. Create Exercises**
- Path: Exercise Library page (separate from workout/program flow)
- Not part of workout creation flow

**2. Create Blocks**
- **Not a separate step** - Blocks are created as part of workout template creation
- When adding exercise in WorkoutTemplateForm, you select exercise type (which becomes block type)

**3. Create Workout Template**
- Path: `/coach/workouts/templates/create`
- Flow: Fill basic info → Add exercises/blocks → Save
- After save: Redirects to templates list

**4. Create Program**
- Path: `/coach/programs/create`
- Flow: Fill basic info → Save → Redirects to edit page
- After save: Must configure schedule in edit page

**5. Assign to Client**
- **Workout Assignment:**
  - From templates list → Click "Assign" → Select clients → Schedule → Assign
- **Program Assignment:**
  - From programs list → Click "Assign" → Select clients → Assign

### How Does the Coach Navigate Between Steps?

**Navigation Methods:**
1. **Menu/Navigation Bar** - Links to Templates, Programs, etc.
2. **Back Buttons** - "Back to Training", "Back to Templates", etc.
3. **Action Buttons** - "Edit", "Assign", "Duplicate", etc.
4. **Redirects After Save** - Automatically redirects after create/save

### Are There Shortcuts?

**Shortcuts:**
- **Create Workout from Program:** Not available - Must create workout first, then assign to program
- **Duplicate Template:** Available on template detail page
- **Quick Assign:** Available from templates list (pre-selects template)

### Can You Reach All Creation Flows from the Menu?

**Menu Structure (assumed):**
- Training / Workouts / Templates → Create Template
- Training / Programs → Create Program
- Exercise Library → Create Exercise (separate)

**Accessibility:**
- All creation flows accessible from main navigation
- No hidden or hard-to-find creation buttons

### Pain Points & Issues

1. **No workflow guidance** - No wizard or step-by-step guide for new coaches
2. **Exercise creation separate** - Must leave workout form to create exercises
3. **Program schedule separate** - Must go to edit page after creating program
4. **No templates from program** - Can't create workout template while building program
5. **Assignment flows separate** - Workout and program assignments are different modals

---

## CRITICAL BUG ANALYSIS

### WorkoutTemplateForm Blocks Rendering Bug

**SYMPTOM:**
- Console logs show: 6 blocks loaded, 7 exercises confirmed
- UI shows: 0 rendered blocks (empty state)

**CODE PATH TRACE:**

1. **Edit Page Loads Blocks** (`edit/page.tsx:54-56`)
   ```typescript
   const blocks = await WorkoutBlockService.getWorkoutBlocks(templateId, { lite: true });
   setInitialBlocks(blocks || []);
   ```
   ✅ Blocks loaded successfully (6 blocks confirmed in console)

2. **Edit Page Passes Prop** (`edit/page.tsx:193`)
   ```typescript
   <WorkoutTemplateForm
     initialBlocks={initialBlocks ?? undefined}
   />
   ```
   ✅ Prop passed correctly

3. **Form Receives Prop** (`WorkoutTemplateForm.tsx:101`)
   ```typescript
   initialBlocks,
   ```
   ✅ Prop received

4. **useEffect Checks initialBlocks** (`WorkoutTemplateForm.tsx:1088-1111`)
   ```typescript
   if (!hasLoadedBlocks.current) {
     if (initialBlocks !== undefined && initialBlocks !== null && Array.isArray(initialBlocks) && initialBlocks.length > 0) {
       setWorkoutBlocks(initialBlocks);
       convertBlocksToExercises(initialBlocks);  // ← CALLED
       hasLoadedBlocks.current = true;
       console.log("[WorkoutTemplateForm] Using initialBlocks, count:", initialBlocks.length);
     }
   }
   ```
   ✅ Condition passes (6 blocks > 0)
   ✅ `convertBlocksToExercises` is called
   ✅ Console log shows count: 6

5. **convertBlocksToExercises Function** (`WorkoutTemplateForm.tsx:670-2336`)
   ```typescript
   const convertBlocksToExercises = useCallback((blocks: WorkoutBlock[]) => {
     if (!blocks || blocks.length === 0) {
       setExercises([]);
       return;
     }
     const convertedExercises: any[] = [];
     blocks.forEach((block, blockIndex) => {
       // ... conversion logic ...
       convertedExercises.push(exercise);
     });
     setExercises(convertedExercises);  // ← SHOULD SET EXERCISES
   }, []);
   ```
   ⚠️ **ISSUE:** `useCallback` has empty dependency array `[]`
   ⚠️ **ISSUE:** Function may have early returns or conditions that prevent `setExercises` call
   ⚠️ **ISSUE:** `convertedExercises` array may be empty after conversion

6. **Rendering Gate** (`WorkoutTemplateForm.tsx:4463`)
   ```typescript
   {exercises.length > 0 ? (
     <DragDropContext>
       {exercises.map((exercise, index) => {
         // Renders ExerciseBlockCard
       })}
     </DragDropContext>
   ) : (
     <div>Empty Workout</div>
   )}
   ```
   ❌ **PROBLEM:** `exercises.length === 0` → Shows empty state

**ROOT CAUSE ANALYSIS:**

**Hypothesis 1: convertBlocksToExercises Doesn't Call setExercises**
- Function may have early return before `setExercises` call
- Check for conditions that skip conversion

**Hypothesis 2: convertedExercises Array is Empty**
- Conversion logic may fail silently
- Blocks may not have required data (exercise_id, etc.)
- Check if `convertedExercises.push(exercise)` is actually called

**Hypothesis 3: State Update Timing Issue**
- `setExercises` called but state doesn't update before render
- React batching may cause issue
- Check if state update is synchronous

**Hypothesis 4: useCallback Dependency Issue**
- Empty dependency array `[]` may cause stale closure
- Function may reference old `setExercises` or other state
- Check if dependencies are missing

**RECOMMENDED DEBUGGING STEPS:**

1. **Add console.log inside convertBlocksToExercises:**
   ```typescript
   console.log("🔍 convertBlocksToExercises called with:", blocks.length, "blocks");
   console.log("🔍 convertedExercises before setExercises:", convertedExercises.length);
   setExercises(convertedExercises);
   console.log("🔍 setExercises called with:", convertedExercises.length, "exercises");
   ```

2. **Check if conversion logic completes:**
   - Verify `blocks.forEach` completes all iterations
   - Verify `convertedExercises.push(exercise)` is called for each block
   - Check for early returns or exceptions

3. **Verify exercises state after conversion:**
   ```typescript
   useEffect(() => {
     console.log("🔍 exercises state:", exercises.length);
   }, [exercises]);
   ```

4. **Check for conditions that skip conversion:**
   - Verify blocks have required fields (exercise_id, block_type, etc.)
   - Check if time-based blocks have time_protocols
   - Verify complex blocks (superset, giant_set) have exercises array

**LIKELY FIX:**

The issue is likely in the `convertBlocksToExercises` function. Check:
1. If `convertedExercises` array is populated before `setExercises` call
2. If there are any early returns or conditions that skip `setExercises`
3. If blocks have required data for conversion (especially `exercise_id` or `block.exercises`)

**Most Likely Issue:**
Blocks may be missing `exercise_id` or `block.exercises` data, causing conversion to fail silently or create empty exercise objects that are filtered out.

---

## SUMMARY OF PAIN POINTS

### Critical Issues
1. **WorkoutTemplateForm blocks don't render** - 6 blocks load but 0 render (see bug analysis)
2. **No validation feedback** - Forms allow invalid data until save
3. **Alert popups everywhere** - Should use toast notifications
4. **Non-functional buttons** - Preview, Revert, Share buttons do nothing

### UX Issues
1. **Complex block types** - Tabata/Circuit forms are deeply nested and confusing
2. **No workflow guidance** - New coaches may not know where to start
3. **Exercise creation separate** - Must leave workout form to create exercises
4. **Program schedule separate** - Must edit program after creation to set schedule
5. **Limited feedback** - Assignment success/failure not detailed

### Missing Features
1. **No individual set editing** - Can't configure different reps/weight per set
2. **No exercise preview** - Can't see exercise details before selecting
3. **No muscle group filter** - Hard to find exercises by target muscle
4. **No draft indicators** - Can't tell if draft is saved
5. **No undo/redo** - Can't revert changes

### Inconsistencies
1. **Terminology** - "Add Exercise" creates "Blocks"
2. **Button styles** - Some use gradients, some don't
3. **Error handling** - Mix of alerts, console logs, and silent failures
4. **Loading states** - Some components have loading states, others don't

---

**END OF AUDIT**

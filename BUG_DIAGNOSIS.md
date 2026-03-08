# Bug Batch Diagnosis — Week 2+ day cards, template edit exercises, add exercise

## BUG #2: Week 2+ day cards not interactive

### Where week tabs and day cards are rendered
- **File:** `src/app/coach/programs/[id]/edit/page.tsx`
- **Weekly Schedule tab** (`activeTab === "schedule"`):
  - **Week selector:** Lines 1084–1125 — `<Select value={String(selectedWeek)} onValueChange={(v) => setSelectedWeek(parseInt(v, 10))}>` with options Week 1..duration_weeks.
  - **Day strip:** Lines 1127–1178 — Seven buttons (Day 1–7), each `onClick={() => setSelectedDay(dayNum)}`. No `pointer-events: none`, no `disabled`, no `weekNumber === 1` condition.
  - **Selected day detail:** Lines 1181–1282 — One template dropdown for the selected day; `currentSchedule = schedule.find((s) => (s.week_number || 1) === selectedWeek && s.program_day === selectedDay)`; dropdown uses `handleDayTemplateChange(selectedDay, value)`.

### State and conditionals
- `selectedWeek` (state, default 1) and `selectedDay` (state, default 1) are used consistently.
- Day strip and dropdown are not gated by `weekNumber === 1`; they use `selectedWeek` and `selectedDay` for any week.
- No conditional that disables Week 2+ day cards in the Schedule tab.

### Root cause (likely)
- **Progression tab** (lines 1362–1374): When there are no schedule entries for the selected week, it shows “No Workouts Scheduled for Week N” and does **not** render the day selector buttons. So for Week 2+ **in the Progression tab**, if schedule has no rows for that week, there are no day cards to click.
- **Schedule tab** template dropdown: The Schedule tab’s `<SelectContent>` (line 1258) has **no z-index**. The Progression tab’s week dropdown uses `className="z-[10000]" position="popper"` (line 1390). If the Schedule tab’s dropdown is opening behind the sticky nav or another layer, it would look like “clicking does nothing” and “dropdowns don’t open.”

### Fix applied
- Add `className="z-[10000]"` and `position="popper"` to the **Schedule tab** template dropdown’s `<SelectContent>` (same as Progression tab) so the dropdown opens on top and is clickable for all weeks.

---

## BUG #3: Template edit page shows “No exercises yet”

### Where template edit and exercises are loaded
- **Edit page:** `src/app/coach/workouts/templates/[id]/edit/page.tsx`
- **Form:** `WorkoutTemplateForm` in `src/components/WorkoutTemplateForm.tsx`
- **Empty state:** “No exercises yet” appears on the **template view** page (`templates/[id]/page.tsx`, EmptyState). The **edit** form uses `EmptyExerciseState` which shows “Empty Workout”. Treating both as “edit form shows no exercises when template has exercises”.

### Load flow
- Edit page `loadTemplate()` (lines 46–75): `Promise.all([ getWorkoutTemplateById(templateId), WorkoutBlockService.getWorkoutBlocks(templateId, { lite: true }) ])` then `setTemplate(found)`, `setInitialBlocks(blocks || [])`, `setIsOpen(true)`.
- Form receives `template`, `initialBlocks`, `isOpen`.

### Form effect (lines 481–537)
- Deps: `[isOpen, template, loadDraft]`. **`initialBlocks` is not in the dependency array.**
- Logic: if `template` and `!hasLoadedBlocks.current`, then if `initialBlocks !== undefined` → use `initialBlocks` and set exercises; else → `loadWorkoutBlocks(template.id)`.
- If the effect runs once with `template` set but `initialBlocks` still undefined (e.g. strict mode or batching), it takes the `else` branch, sets `hasLoadedBlocks.current = true`, and never runs again when `initialBlocks` is later defined. So exercises stay empty.
- Even when both are set in the same commit, preferring `initialBlocks` whenever they are defined (and not gating that branch on `hasLoadedBlocks`) avoids races.

### Fix applied
- Add `initialBlocks` to the effect dependency array.
- When `template` and `initialBlocks !== undefined`, always apply `initialBlocks` and set exercises (do not gate this on `hasLoadedBlocks`). Only gate the `loadWorkoutBlocks(template.id)` branch on `!hasLoadedBlocks.current` so we don’t double-fetch when no `initialBlocks` are passed.

---

## BUG #4: Add exercise in edit mode fails with server error

### Add Exercise flow
- **Handler:** `WorkoutTemplateForm.addExercise` (lines 782–856). It calls `buildExerciseFromNewExercise(newExercise, availableExercises, exercises, editingExerciseId)` and then updates local state with `setExercises` and `setNewExercise`. **No Supabase/fetch/API call.**
- **AddExercisePanel** only calls `onAddExercise` (the form’s `addExercise`); no server call in the panel.

### Conclusion
- There is **no server request** triggered by clicking “Add Exercise”. The only server call for the template is **Save** (`saveWorkoutTemplate`).
- So either: (1) the user sees an error when clicking **Save** after adding an exercise, or (2) an error is thrown in `buildExerciseFromNewExercise`/validation and shown in the UI (e.g. toast), which they may be calling a “server” error.

### Recommendation
- No code change was made for BUG #4 without the exact error message or stack trace.
- If the error happens on **Save**, please share the console/network error (message, status code, and response body) so we can fix the save path (e.g. `createWorkoutBlock` / `addExerciseToBlock` or RLS).

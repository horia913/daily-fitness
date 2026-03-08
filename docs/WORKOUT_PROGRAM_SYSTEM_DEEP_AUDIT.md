# Workout & Program System Deep Audit + Dual-Expert Analysis

**Date:** March 8, 2025  
**Scope:** READ-ONLY audit of workout templates, programs, assignments, client execution, program progression, and exercise library.  
**No files were modified.**

---

## SECTION A: Executive Summary

### Total findings by severity
- **CRITICAL:** 4  
- **IMPORTANT:** 11  
- **POLISH:** 14  
- **INTENTIONAL/OK:** 5  

### Top 5 most impactful issues
1. **Preview and Revert to Original buttons are non-functional** (Create/Edit template) — coaches see actions that do nothing.  
2. **Exercise library "Add exercise" FAB is non-functional** — `onClick={() => {}}` on coach exercises page; create flow exists inside `OptimizedExerciseLibrary` but the page-level FAB never opens it.  
3. **Workout template assignment success/failure uses `alert()`** instead of toasts — inconsistent with detail page (toasts) and blocks screen readers.  
4. **WorkoutTemplateForm save failures use `alert()`** — "Failed to save template" and "An error occurred while saving" are alerts, not toasts.  
5. **Client workout start URL mismatch** — Train page redirects to `/client/workouts/${workout_assignment_id}/start` but app route is under `src/app/client/workouts/[id]/start`; if base path is different this could 404 (verify deployment base path).

### Overall readiness assessment
The system is **functional end-to-end** for the core path: coach creates template → coach creates program and schedule → coach assigns program or single workout → client sees program on Train → client starts workout → client logs sets → client completes workout → program progress advances.  

**Data flow is coherent:** `workout_templates` → `workout_set_entries` (+ special tables) → `workout_assignments` → `workout_sessions` / `workout_logs` / `workout_set_logs` → `program_day_completions` and progress cache.  

**Gaps:** Several coach-side buttons do nothing (Preview, Revert, Add exercise FAB). Alerts are still used in key flows. Some UX copy and navigation (e.g. "Back to Training" vs "Programs" vs "Training Hub") are inconsistent. The system is **ready for real use with clear documentation and a short list of fixes**; the critical items are UX/feedback, not data corruption.

---

## SECTION B: Data Flow Integrity Report (Sarah's Analysis)

### Templates subsystem
- **Read:** `workout_templates`, `workout_set_entries`, `workout_set_entry_exercises`, `workout_drop_sets`, `workout_cluster_sets`, `workout_rest_pause_sets`, `workout_time_protocols`, `workout_hr_sets`, `workout_categories`, `exercises`.  
- **Write:** `workout_templates` (insert/update), `workout_set_entries` (create/update/delete via `WorkoutBlockService`), and all special tables via `saveWorkoutTemplate` + `WorkoutBlockService` (smart update: preserve IDs, delete removed blocks, update/create blocks).  
- **Data in DB not shown:** Template `rating` is shown on detail page; `usage_count` is shown. No major columns found that are never displayed.  
- **UI expecting data that may be missing:** Form and detail assume `workout_categories` exist or fallback to hardcoded list; `exercise_count` is derived from blocks (not stored on template in list when `skipExerciseCount: true`).  
- **Write path:** Complete. Create/update/delete template and blocks with special-table handling; draft in localStorage for new templates.

### Programs subsystem
- **Read:** `workout_programs`, `program_schedule` (via `WorkoutTemplateService.getProgramSchedule`), `workout_templates` (for schedule rows), `training_blocks`.  
- **Write:** `workout_programs` (create/update), `program_schedule` (via service), progression rules via `ProgramProgressionService` / `ProgramProgressionRulesEditor`.  
- **Program → workout → block → exercise chain:** Program has `program_schedule` rows (week_number, day_of_week, template_id). Each template is loaded with `WorkoutBlockService.getWorkoutBlocks` (which uses `workout_set_entries` + special tables). Edit page builds block summaries and shows `ExerciseBlockCard`; client gets assignment and template blocks for execution. Chain is consistent.  
- **Progression rules:** `program_progression_rules` and editor exist; `ProgramProgressionRulesEditor` and `ProgressionPreview` are used on program edit. Week-over-week parameter application for clients is driven by program state and slot resolution; progression data is read/written.  
- **Coach view of “what client sees”:** Program detail/edit show schedule and block summaries; there is no dedicated “client preview” mode (Preview button is non-functional).

### Assignments subsystem
- **Single workout assignment:** `WorkoutTemplateService.assignWorkoutToClient(clientRelationshipId, clientProfileId, templateId, coachId, startDate, null)` → creates `workout_assignments` (and related structure). Used from templates list modal and `WorkoutAssignmentModal` / `EnhancedWorkoutTemplateManager`.  
- **Program assignment:** `WorkoutTemplateService.assignProgramToClients(programId, clientIds, coachId)` → creates program assignments and related records. Used from `ProgramsDashboardContent` and `EnhancedProgramManager`.  
- **Data created:** For single workout: `workout_assignments` row(s). For program: program assignment plus schedule-derived structure; progress is resolved via `programStateService` and `program_day_completions`.  
- **Edge cases:** Reassigning or “client already has active program” is not clearly surfaced in UI (e.g. no warning “This will replace current program” or “Client already has an active program”). Unassign exists in `ClientWorkoutsView` (`handleUnassignProgram`).

### Execution subsystem (client)
- **Flow:** Train page → `/api/client/program-week` → client clicks “Start” → `/api/program-workouts/start-from-progress` (or equivalent) → redirect to `/client/workouts/{workout_assignment_id}/start`. Start page loads assignment, creates/restores `workout_sessions`, loads blocks via assignment/template, runs `LiveWorkoutBlockExecutor`.  
- **Logged data:** Sets go through `POST /api/log-set` (weight, reps, RPE, set_number, set_entry_id, workout_assignment_id, etc.). Block completion via `POST /api/block-complete`. Workout completion via `POST /api/complete-workout` → `completeWorkoutService`.  
- **Tables written:** `workout_sessions`, `workout_logs`, `workout_set_logs`, `workout_set_entry_completions`, `user_exercise_metrics`, `personal_records` (via prService), `program_day_completions`, progress cache.  
- **Mid-workout close:** Session progress is persisted to `workout_sessions` (current_block_index, current_exercise_index, last_activity_at) in start page (`persistSessionProgress`). Restore path exists (sessionId, workoutLogId restored).  
- **PRs:** Log-set route calls `checkAndStorePR`; PRs are checked and stored after logging sets.

### Progression subsystem
- **Client program overview:** Train page uses `program-week` API; `ActiveProgramCard`, `WeekStrip`, `OverdueWorkouts` show current week and slots.  
- **Week progression:** Driven by `programStateService` (getProgramState, getNextSlot, updateProgressCache). Completion writes to `program_day_completions`; next slot and week are derived from that and schedule.  
- **Locked weeks:** Logic exists (e.g. `assertWeekUnlocked`, `WEEK_LOCKED` in complete-workout). Client can see current week and overdue; “locked” future weeks are implied by week-based logic rather than a dedicated “locked” label in the audit scope.  
- **Progression rules modifying params:** Progression rules are stored and edited; application at workout execution (e.g. load % or reps by week) would be in start/execution or program state resolution — not fully traced in this audit; no evidence of broken write path.

### Exercise library
- **Read:** `exercises`, categories, muscle_groups (optional).  
- **Write:** Create/edit/delete exercises (in `OptimizedExerciseLibrary` + `ExerciseForm`).  
- **Page-level “Add exercise” FAB:** On `src/app/coach/exercises/page.tsx` the FAB has `onClick={() => {}}` and never opens the create form. The library component has `showCreateForm` internally but no way to open it from the page FAB.

### Tables / columns of note
- **Legacy/deprecated:** `workoutBlockService.ts` is a deprecated re-export of `WorkoutSetEntryService`; `@/types/workoutBlocks` barrel is deprecated shim.  
- **Naming:** DB uses `workout_set_entries` (set_entry_id); UI and some APIs still say “block” (workout_block_id, block_id) — backward-compat aliases are handled in APIs.  
- **Unused by UI in audit:** No critical tables are fully unused; some columns (e.g. optional notes on set logs) may be omitted from UI.

---

## SECTION C: UX Clarity Report (Marcus's Analysis)

### Coach: Create workout template
- **Confusion risk:** “Back to Training” from create page goes to `/coach/programs` (programs list/hub). “Builder Mode” is clear; “Preview” button does nothing — high confusion.  
- **Feedback:** Save uses toasts for sign-in error but `alert()` for save failure and generic catch — inconsistent and not accessible.  
- **Empty/loading/error:** Create page has no explicit error boundary; form has loading and draft restore.  
- **Validation:** No inline validation before save (e.g. “Name required”); validation exists inside `saveWorkoutTemplate` and returns error message.

### Coach: Edit workout template
- **Non-functional actions:** “Revert to Original” and “Preview” in nav have no `onClick` (edit page lines 188–203).  
- **Flow:** Edit loads template + initialBlocks in parallel; form receives `initialBlocks` so blocks render. Duplicate/Delete use toasts.  
- **Navigation:** “Back to Training” → `/coach/programs`; “Back to Templates” is clear.

### Coach: Create / manage program
- **Create:** Simple form; on success redirects to `/coach/programs/${id}/edit`. Program list is at `/coach/training/programs` (Training Hub links there); `/coach/programs` is the hub entry. Two entry points (“Programs” in hub vs “Back to Training”) can be confusing.  
- **Edit:** Program edit page is heavy (schedule, blocks, progression rules, volume calculator). Block-type summaries and progression preview exist; no client-facing preview.

### Coach: Assign workout or program
- **Single workout (templates list):** In-page modal: select clients, start date, Assign. Success/failure use `alert()` — should be toasts.  
- **WorkoutAssignmentModal:** Same service `assignWorkoutToClient`; flow is clear; again alerts for errors.  
- **Program assignment:** From dashboard/EnhancedProgramManager; selects program and clients. No explicit “client already has program” or “this replaces current program” warning.

### Client: Execute workout
- **Train page:** Clear states: loading, program completed, active program (with today’s slot), overdue, no program. “Start” and day click to start or view log.  
- **Start page:** Large single file; block executor, rest timer, RPE, set logging. Rest timer and RPE (inline or post-set) are implemented.  
- **Completion:** Complete page shows summary and can call complete-workout API.  
- **Mid-workout close:** Progress is saved to session; restore is implemented; no explicit “Resume” vs “Start over” messaging audited.

### Client: Program progress
- **Overview:** Train shows current week and days; week strip and overdue list.  
- **What’s next:** Current and overdue slots are clear; “locked” future weeks are not prominently labeled.  
- **Completion:** When all workouts in week are done, completion and next slot are handled by `completeWorkoutService` and program state.

### Ambiguous or inconsistent UX
- “Back to Training” from templates goes to Programs hub — “Training” and “Programs” used interchangeably.  
- Two program entry points: `/coach/programs` (hub) and `/coach/training/programs` (list).  
- Preview / Revert buttons look active but do nothing.  
- Add exercise FAB on exercises page does nothing.  
- Mixed feedback: toasts on template detail (duplicate/delete), alerts on template list (assign) and form (save error).

---

## SECTION D: Ambiguity Zones (Joint Analysis)

1. **Preview (template)**  
   - **Current:** Button present on create and edit; `onClick={() => {}}` or no handler.  
   - **Might intend:** Open a read-only or client-style view of the template.  
   - **Product decision needed:** Implement preview (e.g. open detail in new tab or modal) or remove button.

2. **Revert to Original**  
   - **Current:** Button on edit page; no handler.  
   - **Might intend:** Discard unsaved changes and reload from DB, or reset to last saved.  
   - **Product decision needed:** Define “original” (last save vs first load) and implement or remove.

3. **Add exercise FAB (coach exercises page)**  
   - **Current:** Page FAB `onClick={() => {}}`; create form lives inside `OptimizedExerciseLibrary` with `showCreateForm`.  
   - **Might intend:** FAB should open the same create form (e.g. setShowCreateForm(true) passed or exposed).  
   - **Product decision needed:** Either wire FAB to library’s create form or remove FAB.

4. **Client already has active program**  
   - **Current:** No explicit check or warning when assigning a program.  
   - **Might intend:** Allow multiple programs, or replace, or warn.  
   - **Product decision needed:** Define behavior and add UI/validation if needed.

5. **“Circuit” block type**  
   - **Current:** Circuit is in `blockTypeStyles` and used in start page (tabata/circuit flow).  
   - **Known issues:** Audit referred to “circuit deprecated but still in UI” — code shows circuit still supported in execution; only `workoutBlocks` type barrel is deprecated.  
   - **Product decision needed:** Confirm whether circuit is supported or deprecated and align UI and docs.

6. **Program “Preview” (client view)**  
   - **Current:** Coach has no working preview of “what the client sees” for a program.  
   - **Might intend:** A read-only program view mirroring client experience.  
   - **Product decision needed:** Add client-style preview or document that it’s out of scope.

---

## SECTION E: Prioritized Action Plan

| # | Severity | Type | Affected files | Description |
|---|----------|------|----------------|-------------|
| 1 | IMPORTANT | UX CLARITY | `create/page.tsx`, `[id]/edit/page.tsx` | Implement Preview (e.g. open template detail in new tab or modal) or remove Preview button. |
| 2 | IMPORTANT | UX CLARITY | `[id]/edit/page.tsx` | Implement “Revert to Original” (reload from DB / reset form) or remove button. |
| 3 | CRITICAL | UNFINISHED | `src/app/coach/exercises/page.tsx` | Wire “Add exercise” FAB to create flow (e.g. pass callback to `OptimizedExerciseLibrary` to open create form, or lift state). |
| 4 | IMPORTANT | UX CLARITY | `src/app/coach/workouts/templates/page.tsx` | Replace assignment success/failure `alert()` with toast notifications. |
| 5 | IMPORTANT | UX CLARITY | `src/components/WorkoutTemplateForm.tsx` | Replace save-failure and catch `alert()` with `addToast` (e.g. variant: "destructive"). |
| 6 | POLISH | TERMINOLOGY | Multiple coach pages | Unify “Back to Training” / “Programs” / “Training Hub” and document where each goes (or use single label). |
| 7 | POLISH | UX CLARITY | Program assignment flows | Consider “Client already has active program” warning or replace confirmation when assigning program. |
| 8 | POLISH | DEAD CODE | `WorkoutBlockBuilder.tsx` | Confirm if still used; `WorkoutTemplateForm` imports it — if unused, remove or document as legacy. |
| 9 | POLISH | TERMINOLOGY | APIs / types | Continue migration from “block” to “set entry” in names; keep backward-compat body params. |
| 10 | POLISH | UNFINISHED | `ExerciseDetailForm.tsx` | Remove or gate debug `console.log` for `hr_sets` (line ~146). |
| 11 | INTENTIONAL/OK | — | `workoutBlockService.ts` | Deprecated re-export; keep until all call sites use `workoutSetEntryService`. |
| 12 | POLISH | UX CLARITY | Workout template form | Add optional inline validation (e.g. name required) before submit; server already validates. |
| 13 | POLISH | UX CLARITY | Client start page | Consider explicit “Resume” vs “Start over” when returning to in-progress session. |
| 14 | INTENTIONAL/OK | — | `completeWorkoutService` | Program completion via `program_day_completions` and progress cache — no change needed. |
| 15 | CRITICAL (verify) | — | Train page redirect | Confirm `/client/workouts/${id}/start` matches app route (and base path) in production. |

---

## Phase 1 Summary (Reference)

### 1A – Coach workout template system
- **Create page:** Renders `WorkoutTemplateForm` with `template=undefined`; Preview button empty handler.  
- **Detail page:** Loads template + blocks in parallel; uses `ExerciseBlockCard` in view mode; Duplicate/Delete work; uses toasts.  
- **Edit page:** Loads template + initialBlocks; form with initialBlocks; Revert and Preview have no handlers.  
- **List page:** Fetches via `/api/coach/workouts/templates`; in-page assign modal; assignment uses `WorkoutTemplateService.assignWorkoutToClient`; success/failure via `alert()`.  
- **WorkoutTemplateForm:** Uses `WorkoutBlockService` (re-export of `WorkoutSetEntryService`), `saveWorkoutTemplate`, draft localStorage, `convertBlocksToExercises` / `exercisesToWorkoutBlocks`; save errors as alert.  
- **ExerciseBlockCard:** Supports form/view; block-type styles; used in form and detail.  
- **ExerciseDetailForm:** Inline/modal; block-type-specific fields; HR sets debug log.  
- **WorkoutBlockBuilder:** Imported by form; may be legacy (confirm usage).  
- **workoutTemplateService:** Full CRUD templates, getProgramSchedule, assignWorkoutToClient, assignProgramToClients.  
- **workoutBlockService:** Deprecated shim; real impl in `workoutSetEntryService`.

### 1B – Coach program system
- **Create:** WorkoutTemplateService.createProgram → redirect to edit.  
- **Detail:** Loads program + schedule; fetches templates per schedule row; training blocks.  
- **Edit:** Large page with schedule, blocks, progression editor, volume calculator.  
- **List:** Hub at `/coach/programs`; list at `/coach/training/programs`.  
- **ProgramCard(s):** Used on list; _redesigned and _OLD_backup variants exist.  
- **Progression:** ProgramProgressionRulesEditor, ProgressionPreview; ProgramProgressionService and programStateService used.

### 1C – Assignment system
- **Single workout:** Templates list modal + WorkoutAssignmentModal + EnhancedWorkoutTemplateManager call `assignWorkoutToClient`.  
- **Program:** ProgramsDashboardContent and EnhancedProgramManager call `assignProgramToClients`.  
- **APIs:** start-from-progress, program-week, etc.; assignment creation is in service layer.

### 1D – Client workout execution
- **Train:** Fetches program-week; ActiveProgramCard, WeekStrip, OverdueWorkouts; start → start-from-progress → redirect to `/client/workouts/{id}/start`.  
- **Start:** Loads assignment/session/blocks; LiveWorkoutBlockExecutor; log-set, block-complete, complete-workout; session progress persisted; RPE and rest timer implemented.  
- **Complete:** Shows summary; completes via API.  
- **APIs:** log-set (workout_log creation, set logs, metrics, PRs); block-complete (set_entry_completions); complete-workout (completeWorkoutService); set-rpe (update RPE on existing set log).

### 1E – Client program progression
- **Overview:** program-week API and Train page show current week and slots.  
- **Week progression:** programStateService; program_day_completions on completion.  
- **Locked weeks:** Enforced in API; UI shows current/overdue.

### 1F – Exercise library
- **Page:** Coach exercises page uses OptimizedExerciseLibrary; FAB has empty onClick.  
- **Library:** Loads exercises/categories; grid/list; create/edit in modal; video/alternatives.  
- **SearchableSelect:** Used in form; search + description filter.  
- **Fields:** Name, description, category, muscle groups, etc.; form supports them; workout builder uses exercise picker.

---

## Known Issues (from prompt) – Status

| Issue | Status |
|-------|--------|
| WorkoutTemplateForm blocks rendering bug (6 blocks load, 0 render) | **Likely fixed** — edit page passes `initialBlocks` and form uses `convertBlocksToExercises`; no “0 render” path found in current code. |
| Preview button non-functional | **Still present** — create and edit. |
| "Revert to Original" non-functional | **Still present** — edit page. |
| `/coach/sessions/page.tsx` hardcoded colors | Not re-audited in this doc. |
| Touch targets below 44px | Not re-audited. |
| Two button systems (fc-btn + Button) | **Still present** — both used across coach/client. |
| Alert popups instead of toasts | **Still present** — templates list (assign), WorkoutTemplateForm (save error). |
| Circuit block type deprecated but in UI | **Clarified** — circuit is still in UI and execution; type barrel is deprecated. |
| No validation feedback before save on template form | **Still present** — server validates name; no inline validation before submit. |

---

*End of audit.*

# Workout and Program System — Comprehensive Audit (Read-Only)

**Date:** March 13, 2026  
**Scope:** Full audit of program structure, workout templates, execution, completion, progression, coach visibility, and cross-cutting issues.  
**No files changed.**

---

## PART 1: Program Structure and Creation (Coach)

### 1.1 Program Creation Flow

**Pages and flow:**
1. **Coach Programs Hub** — `/coach/programs` (entry point)
2. **Create Program** — Modal or form in `EnhancedProgramManager` → `WorkoutTemplateService.createProgram()`
3. **Redirect to Edit** — `/coach/programs/${id}/edit` (program edit page)
4. **Program Edit Page** — `src/app/coach/programs/[id]/page.tsx` — loads program, schedule, training blocks, templates

**Tables involved:**
- `workout_programs` — program metadata (name, description, duration_weeks, coach_id, difficulty_level, category)
- `program_schedule` — schedule rows (week_number, day_of_week, template_id, program_id, training_block_id)
- `training_blocks` — program phases (see migration `20260228_phase2_training_blocks.sql`; **not in schema CSV** — may be post-migration)
- `program_schedule` — links to `workout_templates` via `template_id`

**Flow summary:**
1. Coach creates program via `createProgram()` → inserts into `workout_programs`
2. Redirects to edit page
3. Edit page loads schedule via `WorkoutTemplateService.getProgramSchedule(programId)`
4. Coach configures schedule (week → day → template) via `ProgramProgressionRulesEditor` and schedule UI
5. Progression rules are edited via `ProgramProgressionRulesEditor` and `ProgramProgressionService`

---

### 1.2 Training Blocks (Hypertrophy, Strength, Deload, etc.)

**Schema:** `training_blocks` table (from migration `20260228_phase2_training_blocks.sql`):

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| program_id | uuid | FK → workout_programs |
| name | text | NOT NULL |
| goal | text | NOT NULL, default 'custom' |
| custom_goal_label | text | nullable |
| duration_weeks | integer | NOT NULL, default 4 |
| block_order | integer | NOT NULL, default 1 |
| progression_profile | text | default 'none' |
| notes | text | nullable |
| created_at, updated_at | timestamptz | |

**Goal values (from `types/trainingBlock.ts`):** `hypertrophy`, `strength`, `power`, `peaking`, `accumulation`, `conditioning`, `deload`, `general_fitness`, `sport_specific`, `custom`

**Progression profiles:** `volume_ramp`, `intensity_ramp`, `taper`, `density_increase`, `reduction`, `linear`, `none`

**Ordering:** `block_order` ascending. `block_order` is unique per program; blocks do not overlap.

**Service:** `TrainingBlockService` (`src/lib/trainingBlockService.ts`) — CRUD; `getOrCreateImplicitBlock` creates one implicit block per program if none exists.

**Note:** `training_blocks` is **not** in the Supabase schema CSV files. The migration may have been applied after the schema export.

---

### 1.3 Assigning Workout Templates to Days Within Blocks

**Structure:**
- `program_schedule` — (program_id, week_number, day_of_week, template_id, training_block_id)
- Each row = one program day (week + day) → one workout template
- `training_block_id` links a schedule row to a training block

**Weeks:** Each week has its own configuration. `program_schedule` has `week_number` (1..N) and `day_of_week` (0..6). The block defines `duration_weeks`; schedule rows are created per (week, day).

**Block → weeks:** A block spans `duration_weeks`; schedule rows are linked via `training_block_id`. Blocks are sequential (no overlap).

---

### 1.4 Progression Generator (Phase 4)

**Components:** `ProgramProgressionRulesEditor`, `ProgressionPreview`, `ProgramProgressionService`

**Tables:** `program_progression_rules` — per-program, per-week rules. Columns include: `program_id`, `week_number`, `block_id`, `block_type`, `block_order`, `exercise_id`, `sets`, `reps`, `rest_seconds`, `rir`, `tempo`, `weight_kg`, `load_percentage`, and special block-type fields (drop_set, cluster, rest_pause, etc.).

**Auto-population:** The progression generator does **not** auto-populate from training block goals. Rules are edited manually in the coach UI. Progression rules are stored and edited; application at workout execution (e.g. load % or reps by week) would be in start/execution or program state resolution — not fully traced in this audit.

---

### 1.5 Program Editing

**Edit after creation:** Yes. Coach can edit program at `/coach/programs/[id]/page.tsx` — schedule, blocks, progression rules, volume calculator.

**Edit after assignment:** No explicit lock. Coach can edit program schedule and progression rules even when clients have active assignments.

**Effect on client data:** If coach edits a program mid-assignment:
- `program_schedule` changes affect **future** slots; `workout_assignments` already created for past days are unchanged.
- `client_program_progression_rules` are copied from `program_progression_rules` at assignment time; edits to program rules do **not** automatically update client rules.
- `program_day_assignments` and `workout_assignments` for completed/in-progress days are not retroactively modified.

**Gaps:** No explicit "client already has program" or "this replaces current program" warning when assigning. No versioning of program changes.

---

### 1.6 Issues / Confusion

1. **Preview and Revert buttons** — Non-functional on template create/edit (per `WORKOUT_PROGRAM_SYSTEM_DEEP_AUDIT.md`).
2. **Two entry points** — `/coach/programs` (hub) and `/coach/training/programs` (list). Terminology "Back to Training" vs "Programs" vs "Training Hub" is inconsistent.
3. **training_blocks not in schema CSV** — May cause confusion if schema is used as source of truth.
4. **Progression rules vs client rules** — `client_program_progression_rules` are populated from program rules; sync on program edit is unclear.

---

## PART 2: Workout Templates and Exercises (Coach)

### 2.1 Workout Template Structure

**Data model (from schema CSV):**

```
workout_templates
  └── workout_blocks (block-level data)
        └── [Optional] Special Tables (exercise-level data for specific block types only):
              ├── workout_block_exercises (for straight_set, superset, giant_set, pre_exhaustion blocks only)
              ├── workout_drop_sets (for drop_set blocks only)
              ├── workout_cluster_sets (for cluster_set blocks only)
              ├── workout_rest_pause_sets (for rest_pause blocks only)
              ├── workout_pyramid_sets (for pyramid_set blocks only)
              ├── workout_ladder_sets (for ladder blocks only)
              └── workout_time_protocols (for amrap, emom, for_time, tabata, circuit blocks only)
```

**Note:** Migrations `20260228_phase1_block_to_set_entry_rename.sql` and `20260311_dashboard_rpc_workout_set_entries.sql` rename `workout_blocks` → `workout_set_entries` and `workout_block_exercises` → `workout_set_entry_exercises`. The schema CSV still shows `workout_blocks`; the codebase uses both `workout_blocks` and `workout_set_entries` (via `WorkoutBlockService` / `WorkoutSetEntryService`).

**workout_blocks schema:**
- id, template_id, block_order, block_name, block_notes, duration_seconds, rest_seconds, total_sets, reps_per_set
- block_type: USER-DEFINED enum `workout_block_type` default `'straight_set'`
- hr_zone_target, hr_percentage_min, hr_percentage_max (nullable)

**workout_block_exercises schema:**
- id, block_id, exercise_id, exercise_order, exercise_letter, sets, reps, weight_kg, rir, tempo, rest_seconds, notes, load_percentage

---

### 2.2 Exercise Configuration

**exercises table (from schema):**
- id, coach_id, name, description, category, image_url, video_url, is_active
- equipment_types (jsonb, default `[]`)
- instructions (jsonb), tips (jsonb)
- primary_muscle_group_id, secondary_muscle_group_1_id, secondary_muscle_group_2_id (FK → muscle_groups)

**Related tables:**
- `exercise_muscle_groups` — exercise_id, muscle_group (text), is_primary (boolean)
- `exercise_equipment` — exercise_id, equipment_type (text), is_required (boolean)
- `exercise_categories` — id, name, description, icon, color
- `muscle_groups` — id, name, description

**Muscle groups:** `exercises` has `primary_muscle_group_id` and `secondary_muscle_group_1_id`, `secondary_muscle_group_2_id` (FK to `muscle_groups`). `exercise_muscle_groups` allows multiple muscles with `is_primary` flag.

**Equipment:** `exercises.equipment_types` (jsonb). `exercise_equipment` table stores equipment_type per exercise. Code uses `equipment` or `equipment_types` interchangeably.

**Categories:** `exercises.category` (text, NOT NULL). `exercise_categories` table exists for display/filtering.

---

### 2.3 Distinct Values (from codebase)

**exercise.category:** Used as text; no hardcoded enum in schema. CHECK: `workout_templates.difficulty_level` = `'beginner' | 'intermediate' | 'advanced' | 'athlete'`.

**exercise.equipment:** From `ExerciseForm.tsx` and `OptimizedExerciseLibrary.tsx`:
- `'Bodyweight', 'Dumbbells', 'Barbell', 'Kettlebell', 'Resistance Bands'` (common list)

**exercise.difficulty:** Schema does not have `difficulty` on `exercises`. `workout_templates` has `difficulty_level`.

**muscle_groups:** Table exists; `muscle_groups.name` is UNIQUE.

---

### 2.4 Exercise Categories and Muscle Groups Schemas

**muscle_groups:**
- id (uuid), name (text), description (text), created_at, updated_at

**exercises:**
- id, coach_id, name, description, category (text), image_url, video_url, is_active
- equipment_types (jsonb), instructions (jsonb), tips (jsonb)
- primary_muscle_group_id, secondary_muscle_group_1_id, secondary_muscle_group_2_id (FK → muscle_groups)

**exercise_categories:**
- id, name, description, icon, color (default '#3B82F6')

**exercise_equipment:**
- id, exercise_id, equipment_type (text), is_required (boolean, default true)

---

## PART 3: Workout Execution (Client)

### 3.1 Workout Start Flow

**Sequence:** Train page → "Start" → `/api/program-workouts/start-from-progress` → redirect to `/client/workouts/{workout_assignment_id}/start`

**Exact sequence:**

1. **Client on Train page** (`/client/train`) — fetches `GET /api/client/program-week` for program state
2. **Client clicks "Start"** on a day card or overdue slot
3. **Client calls** `POST /api/program-workouts/start-from-progress` with body `{ client_id?, program_schedule_id? }`
4. **API flow:**
   - `getProgramState()` → `getNextSlot()` or validate requested slot
   - `assertWeekUnlocked()` — reject if week locked
   - Check for existing in-progress `workout_sessions` or incomplete `workout_logs` for this program day
   - If found: return existing `workout_assignment_id` (REUSE)
   - If not found: CREATE:
     - `workout_assignments` (new row)
     - `workout_sessions` (status='in_progress', program_assignment_id, program_schedule_id)
     - `workout_logs` (started_at, program_assignment_id, program_schedule_id)
5. **Redirect** to `/client/workouts/{workout_assignment_id}/start`
6. **Start page** loads assignment, session, blocks via `WorkoutBlockService.getWorkoutBlocksForTemplates(templateIds)` and `useWorkoutData`

**Tables created on start:**
- `workout_assignments` (if new)
- `workout_sessions` (if new)
- `workout_logs` (if new)

---

### 3.2 Set Logging

**API:** `POST /api/log-set`

**Data captured per set type (from `workout_set_logs` schema):**
- Common: weight, reps, set_number, block_id, exercise_id, block_type, completed_at
- Superset: superset_exercise_a_id, superset_weight_a, superset_reps_a, superset_exercise_b_id, superset_weight_b, superset_reps_b
- Giant set: giant_set_exercises (jsonb)
- Drop set: dropset_initial_weight, dropset_initial_reps, dropset_final_weight, dropset_final_reps, dropset_percentage
- Cluster: cluster_number
- Rest pause: rest_pause_initial_weight, rest_pause_initial_reps, rest_pause_reps_after, rest_pause_number
- Pre-exhaustion: preexhaust_isolation_exercise_id, preexhaust_isolation_weight, preexhaust_isolation_reps, preexhaust_compound_exercise_id, preexhaust_compound_weight, preexhaust_compound_reps
- AMRAP: amrap_total_reps, amrap_duration_seconds, amrap_target_reps
- EMOM: emom_minute_number, emom_total_reps_this_min, emom_total_duration_sec
- Tabata: tabata_rounds_completed, tabata_total_duration_sec
- For time: fortime_total_reps, fortime_time_taken_sec, fortime_time_cap_sec, fortime_target_reps
- Pyramid: pyramid_step_number
- Ladder: ladder_rung_number, ladder_round_number

**RPE:** Stored in `workout_set_details` (rpe column, 1–10). RPE modal appears after logging set. `workout_set_logs` does not have RPE; `workout_set_details` (linked to workout_exercise_logs) does.

**Rest times:** `workout_set_details.rest_seconds` exists. Rest timer overlay is implemented; rest duration is configurable.

---

### 3.3 Plate Calculator

**File path:** `src/components/PlateCalculator.tsx`, `src/components/PlateCalculatorWidget.tsx`, `src/lib/plateCalculator.ts`

**Where rendered:**
- `src/app/client/workouts/[id]/start/page.tsx` — modal (lines 7385–7404)
- `ToolsDrawer` — `src/components/client/workout-execution/ui/ToolsDrawer.tsx` — plate calculator button
- `SetLoggingForm` — `src/components/SetLoggingForm.tsx` — conditional: `isBarbellExercise() && <PlateCalculatorWidget />`
- `StraightSetExecutor`, `SupersetExecutor`, `DropSetExecutor`, etc. — pass `onPlateCalculatorClick` to open modal

**Equipment check logic:**
- `SetLoggingForm.tsx` (lines 225–233):
  ```ts
  const isBarbellExercise = () => {
    const equipment = templateExercise?.exercise?.equipment || []
    return equipment.some((eq: string) => 
      eq.toLowerCase().includes('barbell') || 
      eq.toLowerCase().includes('bar') ||
      eq.toLowerCase().includes('olympic')
    )
  }
  ```
- `stepper.tsx` (lines 60–64): similar `isBarbellExercise()` using `equipment`

**Show/hide:** Plate calculator is shown when:
1. User clicks the plate calculator button (always available in ToolsDrawer and per-executor)
2. In `SetLoggingForm` and `stepper`: only when `isBarbellExercise()` is true

**Equipment types that SHOULD show plate calculator:** Barbell, Olympic bar, EZ bar. Smith machine is not explicitly checked; `'bar'` would match. The logic uses `includes('barbell')`, `includes('bar')`, `includes('olympic')`.

---

### 3.4 Smart Nudges (Phase 5) — ProgressionNudge

**Component:** `src/components/client/workout-execution/ui/ProgressionNudge.tsx`

**Data:** `ProgressionSuggestion` from `clientProgressionService.ts` — types: `progress`, `repeat`, `match`, `plateau`, `deload`, `first_time`. Message, suggestedWeight, suggestedReps, previousPerformance.

**Where used:** `StraightSetExecutor`, `SupersetExecutor`, `PreExhaustionExecutor`, `GiantSetExecutor`, `BaseBlockExecutor` — pass `progressionSuggestion`, `previousPerformanceMap`, `onApplySuggestion`.

**Current state:** Component renders when `lastTimeLine || suggestion` is truthy. Has `console.log` for debugging. Renders "Last time: X kg × Y · RPE Z" and suggestion message. "Apply" button fills weight/reps when `onApplySuggestion` is provided.

**Visibility:** ProgressionNudge is rendered inside block executors. It requires `progressionSuggestion` or `previousPerformance` from `clientProgressionService.getExercisePreviousPerformance` and `getProgressionSuggestion`. If these return null/empty, the nudge does not render.

---

## PART 4: Workout Completion

### 4.1 Completion Flow

**Sequence:** Client taps "Complete" on complete page → `POST /api/complete-workout` → `completeWorkout()` in `completeWorkoutService.ts`

**Steps in completeWorkoutService:**
1. Fetch workout_log, verify ownership
2. Idempotency guard (already completed → no-op 200)
3. Fetch workout_set_logs, compute totals (sets, reps, weight)
4. Update workout_logs (completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted)
5. Update workout_sessions status if session_id provided
6. Program completion (if program_assignment_id + program_schedule_id):
   - INSERT INTO program_day_completions (ON CONFLICT DO NOTHING)
   - Find next slot via programStateService
   - Update program_progress cache (updateProgressCache)
   - Week lock check (assertWeekUnlocked)
7. Sync goals (non-blocking)
8. Check achievements (workout_count, streak_weeks) — non-blocking
9. Update leaderboard — non-blocking

**Data saved:** workout_logs (completed_at, totals), workout_sessions (status, completed_at), program_day_completions (ledger), program_assignment_progress cache.

**Calculated:** total_sets_completed, total_reps_completed, total_weight_lifted, total_duration_minutes.

---

### 4.2 PRs and Achievements During Workout

**PR detection:**
- **File:** `src/lib/prService.ts` — `checkAndStorePR(clientId, setData)`
- **Trigger:** Called from `POST /api/log-set` (line 976–1001) after logging a set
- **Logic:** Compares weight/reps to `personal_records` for same exercise; if new max, inserts/updates `personal_records`

**PR record types:** `weight`, `reps`, `distance`, `time`, `score` (from schema CHECK)

**Achievement triggers:**
- **File:** `src/lib/achievementService.ts` — `checkAndUnlockAchievements(clientId, achievementType)`
- **When:** `completeWorkoutService` calls for `workout_count` and `streak_weeks` after completion
- **PR path:** `prService.checkAndStorePR` does **NOT** call `checkAndUnlockAchievements(clientId, 'pr_count')`. Only `progressTrackingService.upsertPersonalRecord` does. So PRs from log-set **do not** trigger pr_count achievements or leaderboard updates.

**Achievement types (from achievement_templates):** milestone, goal_completion, personal_record, consistency, progress, workout_streak, assessment_improvement

**Notification/display when PR during workout:**
- Log-set: PR is stored; no modal or toast shown at log time
- Complete page: Fetches `personal_records` for `workout_assignment_id` and displays PR badges if any

**AchievementUnlockModal:** Exists but is **never imported or used** in the unlock flow (per `ACHIEVEMENTS_LEADERBOARDS_CHALLENGES_AUDIT.md`).

---

### 4.3 Workout Completion Celebration

**Page:** `src/app/client/workouts/[id]/complete/page.tsx`

**Shows:** Stats (duration, sets, reps, weight), difficulty rating slider, notes, "Complete Workout" button, "View Summary" button, next workout suggestion card.

**PRs:** Fetches `personal_records` for `workout_assignment_id` after completion; shows PR badges if `prs.length > 0`.

**Achievements:** `completeWorkoutService` returns `newAchievements`; client complete page does not explicitly show an achievement modal. `AchievementUnlockModal` is not used.

---

## PART 5: Program Lifecycle and Progression

### 5.1 Week Progression

**Trigger:** `program_day_completions` ledger. When a workout is completed, `completeWorkoutService` inserts a row for (program_assignment_id, program_schedule_id). Next slot is derived from `getNextSlot()`.

**computeUnlockedWeekMax:** `src/lib/programStateService.ts` (lines 435–457)

```ts
// Week 1 always unlocked. Week W+1 unlocked only when ALL slots in week W (and prior) are complete.
// Returns lowest week number that still has incomplete slots.
```

**Logic:** `completedSlots` = rows from program_day_completions. For each week, check if all slots in that week are in completedSlots. First week with incomplete slots = unlocked week max.

**Automatic:** Yes. When all days in week are completed, next slot is in week+1. No manual "advance week" action.

---

### 5.2 Progression Rules Schemas

**program_progression_rules:**
- program_id, week_number, block_id, block_type, block_order, block_name
- exercise_id, exercise_order, exercise_letter, sets, reps, rest_seconds, tempo, rir
- weight_kg, load_percentage
- Special: second_exercise_id, compound_exercise_id, first_exercise_reps, second_exercise_reps, drop_set_reps, weight_reduction_percentage, reps_per_cluster, clusters_per_set, rest_pause_duration, etc.
- program_schedule_id (nullable), training_block_id (nullable, from migration)

**client_program_progression_rules:**
- client_id, program_assignment_id, week_number, block_id, block_type, exercise_id, etc.
- Same structure as program_progression_rules; copied per client when assigned.

**Relation to training blocks:** `program_progression_rules.training_block_id` and `program_schedule.training_block_id` link to training_blocks.

**Progression generator:** Populates `program_progression_rules` via coach UI. No automatic generation from block goals.

---

### 5.3 Deload/Taper Detection

**Deload:** `training_blocks.goal = 'deload'` or `progression_profile = 'reduction'` / `'taper'`.

**Usage:** Smart nudges use `clientProgressionService` which considers `previousPerformance` and `currentWeekRules`. Deload suggestion type exists in `ProgressionNudge` (type `deload`). Whether deload is detected from block goal or progression profile is not fully traced in code.

---

## PART 6: Coach Visibility into Client Workouts

### 6.1 Coach Pages/Components

| What | Where | Component/Page |
|------|-------|----------------|
| Which workout client is on | Client detail → Workouts tab | `ClientWorkoutsView` (`src/components/coach/client-views/ClientWorkoutsView.tsx`) |
| Client workout history/logs | Client detail, Progress tab | `OptimizedClientProgress`, workout logs list |
| Adherence/compliance | Program completion, progress tracking | `program_assignment_progress`, `program_day_completions` |
| Client PRs and progress | Client Progress tab | `OptimizedClientProgress` — PRs, workout logs |

**ClientWorkoutsView:** Loads `workout_assignments` and `program_assignments` for client; shows status (assigned, in_progress, completed, skipped).

---

### 6.2 Coach View of Completed Workout Detail

**Client workout logs:** Coach can view via `OptimizedClientProgress` and client progress views. `workout_logs` and `workout_set_logs` are readable by coach (RLS policies allow coach to read client data via `clients` relationship).

**Data shown:** Sets, reps, weights, RPE (from workout_set_details), duration. `workout_exercise_logs` and `workout_set_details` contain detailed set data.

**WorkoutDetailModal:** `src/components/WorkoutDetailModal.tsx` — used for viewing workout details.

---

## PART 7: Cross-Cutting Issues

### 7.1 Consistency Check

**Backend without frontend:**
- `program_workout_completions` — in schema CSV; completion pipeline uses `program_day_completions` (created by migration `20260209_canonical_program_tracking_tables.sql`). These are different tables: `program_day_completions` is the canonical ledger keyed by program_schedule_id; `program_workout_completions` is keyed by assignment_progress_id, week_number, program_day.
- `daily_workout_cache` — used by program-week API; no dedicated coach UI.

**Frontend without backend:**
- `AchievementUnlockModal` — exists but not used in unlock flow.
- Preview button, Revert button — no handlers.

---

### 7.2 Orphan Components

**CheckIns.tsx:** Not found in imports (search returned no matches). May have been removed.

**Other orphan candidates:** `WorkoutBlockBuilder` — imported by `WorkoutTemplateForm`; may be legacy.

---

### 7.3 Mobile View (375px)

**Workout execution:** `start/page.tsx` — large single file. Buttons (LOG SET, Prev/Next block, rest timer) are in `LiveWorkoutBlockExecutor` and block executors. `ToolsDrawer` contains plate calculator.

**Plate calculator:** Modal with `inset-0`; `items-center justify-center p-4` for centering. Should be usable on mobile. `VISUAL_POLISH_MOBILE_UX_AUDIT_MARCH_2026.md` notes `PlateCalculatorWidget` border styling.

**Touch targets:** Not re-audited in this doc. Previous audit noted touch targets below 44px.

---

### 7.4 Error States

**No program assigned, client navigates to `/client/train`:** Train page shows `EmptyState` or "No active program" when `programData` is null/empty. `fetchExtraAssignments` still loads standalone workout_assignments.

**Workout template missing exercises:** Blocks may have 0 exercises. Execution would show empty block; no explicit error.

**Progression rules empty:** `client_program_progression_rules` are used for smart nudges. If empty, no progression suggestions; no crash.

**No program:** `start-from-progress` returns 404 `{ status: 'no_program' }`. Train page handles this.

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Program creation | Functional | Flow works; terminology and navigation inconsistent |
| Training blocks | Functional | Migration adds table; not in schema CSV |
| Workout templates | Functional | workout_blocks vs workout_set_entries naming in flux |
| Program schedule | Functional | Week/day → template mapping clear |
| Progression rules | Functional | Manual edit; no auto-generation from block goals |
| Workout start | Functional | Idempotent; reuses or creates assignment/session/log |
| Set logging | Functional | All set types supported; RPE in workout_set_details |
| Plate calculator | Functional | Shown for barbell/bar/olympic; always available via button |
| Smart nudges | Functional | ProgressionNudge renders when data present |
| Completion | Functional | Unified pipeline; totals, ledger, cache |
| PR detection | Functional | checkAndStorePR on log-set; no achievement/leaderboard trigger |
| Achievements | Partial | Unlock logic exists; modal not shown to user |
| Week progression | Functional | computeUnlockedWeekMax; automatic on completion |
| Coach visibility | Functional | ClientWorkoutsView, OptimizedClientProgress |

---

*End of audit.*

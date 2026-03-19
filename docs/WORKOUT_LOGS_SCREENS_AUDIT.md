# Workout Logs Screens — Read-Only Audit

This document answers: what data is fetched, what is displayed, and what is missing or inconsistent. No code changes were made.

---

## Screen 1: `/client/progress/workout-logs` (List Page)

### 1. Full data fetching code

**File:** [src/app/client/progress/workout-logs/page.tsx](src/app/client/progress/workout-logs/page.tsx)

**Flow:** `loadWorkoutLogs()` runs on mount (and on Retry). It runs **four** operations in sequence:

1. **Query 1 — workout_logs**
   - **Table:** `workout_logs`
   - **Select:** `id`, `client_id`, `started_at`, `completed_at`, `total_duration_minutes`, `total_sets_completed`, `total_reps_completed`, `total_weight_lifted`, `workout_assignment_id`
   - **Filters:** `.eq("client_id", user.id)`
   - **Order:** `started_at` descending
   - **Limit:** 100

2. **Query 2 — workout template names (via assignments)**
   - **Table:** `workout_assignments` with nested `workout_templates`
   - **Select:** `id`, `workout_template_id`, `workout_templates(id, name)`
   - **Filters:** `.in("id", assignmentIds)` where `assignmentIds` = unique `workout_assignment_id` from step 1

3. **Query 3 — workout_set_logs (batched)**
   - **Table:** `workout_set_logs`
   - **Select:** `id`, `weight`, `reps`, `exercise_id`, `workout_log_id`, `exercises(id, name, category)`
   - **Filters:** `.in("workout_log_id", logIds)`, `.eq("client_id", user.id)`

4. **In-memory:** Build `processedLogs` by mapping each log to a `WorkoutLog` with `workoutName` from the assignment map, `workout_set_logs` from the sets map, and computed `totalSets`, `totalWeight`, `uniqueExercises` (from sets or fallback to log totals).

### 2. Fields selected from `workout_logs`

- `id`, `client_id`, `started_at`, `completed_at`, `total_duration_minutes`, `total_sets_completed`, `total_reps_completed`, `total_weight_lifted`, `workout_assignment_id`

**Not selected:** `workout_session_id`, `notes`, `overall_difficulty_rating`, `perceived_effort`, `energy_level`, `muscle_fatigue_level`, `created_at`, HR/distance columns.

### 3. Join with `workout_templates` for workout name?

**Yes, but indirectly.** The list page does **not** join `workout_logs` to templates. It:

1. Collects unique `workout_assignment_id` from the logs.
2. Queries `workout_assignments` with nested `workout_templates(id, name)` for those IDs.
3. Builds `assignmentTemplateMap` and assigns `workoutName` per log in JavaScript.

So the workout name comes from **workout_assignments → workout_templates**, not from a direct join on `workout_logs`.

### 4. Does it load `workout_set_logs` for each log?

**Yes, in one batch.** All set logs for all 100 log IDs are fetched in a single query (Query 3). Results are grouped by `workout_log_id` in a `setsByLogId` Map. So there is no N+1.

### 5. What the UI renders per log entry

Each log is rendered by **WorkoutLogCard** ([src/components/client/WorkoutLogCard.tsx](src/components/client/WorkoutLogCard.tsx)), which receives a `log` shaped as `WorkoutLogCardLog`:

- **Eyebrow:** Formatted date (e.g. "Mon, Mar 16") from `completed_at` or `started_at`.
- **Title:** `workoutName` (from assignment → template).
- **Subtitle pills:** Duration (min), total sets, total volume (kg).
- **Body:** Exercise preview — up to 4 unique exercise **names** from `log.workout_set_logs[].exercises?.name`, joined by " · ".
- **Primary action:** "View" button → `/client/progress/workout-logs/[id]`.

So per card the UI shows: **date, workout name, duration, set count, total kg, and a short list of exercise names.**

### 6. Data MISSING from the list display

- **workout_log.notes** — not fetched, not shown.
- **workout_log** difficulty/effort/energy/muscle fatigue — not fetched, not shown.
- **Per-set details** (weight, reps, RPE) — not shown on the list (only on detail); data is fetched in the batch set query but only used for totals and exercise names.
- **Program/session context** (e.g. which program or day) — not fetched or shown.

Nothing critical is missing for the list UX; the card is a summary.

### 7. Console errors

The code logs to console on error only:

- `console.error("❌ Error loading workout logs:", error)` (line 106, 245)
- `console.error("Error fetching sets:", setsError)` (line 176)
- `console.error("⚠️ Error fetching assignments:", assignmentsError)` (line 142)

If the page loads successfully, there are no expected console errors. If assignments or sets fail, those errors are logged and the list still shows (with fallback "Workout" name and/or no exercise names).

---

## Screen 2: `/client/progress/workout-logs/[id]` (Detail Page)

### 1. Full data fetching code

**File:** [src/app/client/progress/workout-logs/[id]/page.tsx](src/app/client/progress/workout-logs/[id]/page.tsx)

**Flow:** `loadWorkoutLog()` runs when `workoutLogId` and `user` are set. It runs **several** operations:

1. **Query 1 — workout_log**
   - **Table:** `workout_logs`
   - **Select:** `id`, `started_at`, `completed_at`, `total_duration_minutes`, `total_sets_completed`, `total_reps_completed`, `total_weight_lifted`, `workout_assignment_id`
   - **Filters:** `.eq("id", workoutLogId)`, `.eq("client_id", user.id)`, `.single()`

2. **Query 2 — template name (first assignment fetch)**
   - **Table:** `workout_assignments`
   - **Select:** `workout_template_id`, `workout_templates(id, name)`
   - **Filters:** `.eq("id", log.workout_assignment_id)`, `.single()`
   - **Use:** Set `workoutName` state.

3. **Query 3 — assignment again (template_id only)**
   - **Table:** `workout_assignments`
   - **Select:** `workout_template_id`
   - **Filters:** `.eq("id", log.workout_assignment_id)`, `.single()`
   - **Use:** Get `workout_template_id` to load template blocks. (Query 2 and 3 could be merged.)

4. **WorkoutBlockService.getWorkoutBlocks(templateId)**  
   Fetches template structure (workout_set_entries / blocks with exercises). Used to build block groups and exercise names/letters even when a block has no logged sets.

5. **Query 4 — workout_set_logs**
   - **Table:** `workout_set_logs`
   - **Select:** Long list of columns including: `id`, `workout_log_id`, `set_entry_id`, `set_type`, `exercise_id`, `weight`, `reps`, `rpe`, `set_number`, `completed_at`, plus all block-type-specific columns (dropset_*, superset_*, giant_set_exercises, amrap_*, fortime_*, emom_*, rest_pause_*, cluster_number, tabata_*, preexhaust_*), and nested `exercises(id, name, category)`.
   - **Filters:** `.eq("workout_log_id", workoutLogId)`, `.eq("client_id", user.id)`
   - **Order:** `completed_at` ascending

6. **Query 5 — exercises (for superset/pre-exhaustion/giant_set names)**
   - **Table:** `exercises`
   - **Select:** `id`, `name`
   - **Filters:** `.in("id", Array.from(exerciseIds))`  
   Exercise IDs are collected from set logs (exercise_id, superset_exercise_a_id, superset_exercise_b_id, preexhaust_isolation_exercise_id, preexhaust_compound_exercise_id, and giant_set_exercises[].exercise_id).

Then the code groups sets by `set_entry_id` into `BlockGroup`s (keyed by template block id), merges in template exercise names and letters, and computes totals from the log and sets.

### 2. Does it load `workout_set_logs` with exercise names?

**Yes.** The `workout_set_logs` query includes a nested select `exercises(id, name, category)`. Additional exercise names for superset/pre-exhaustion/giant_set are resolved via a separate `exercises` query and an `exerciseMap`. Template blocks from `WorkoutBlockService.getWorkoutBlocks()` also provide exercise names and letters for each block.

### 3. Does it load `workout_exercise_logs` and `workout_set_details` (for RPE)?

**No.** The detail page does **not** query:

- `workout_exercise_logs`
- `workout_set_details`

It **does** select `rpe` from `workout_set_logs` (line 286). So RPE on the detail page is shown only if it is stored on **workout_set_logs**. The schema CSV you have lists `workout_set_logs` with `block_id` and many columns but does **not** list an `rpe` column; a migration file references `workout_set_logs_rpe_range`, so RPE may have been added to `workout_set_logs` in a migration. If RPE is only stored in `workout_set_details` (linked to `workout_exercise_logs`), then the current detail page would **not** show it, because it never reads those tables.

### 4. What the UI renders

- **Header:** Workout name, date range (started – completed), duration, and summary stats (sets, reps, volume, unique exercises).
- **Block sections (accordion):** For each template block, a card with block type and first exercise name (or type), set count, and expand/collapse. When expanded:
  - **If the block has logged sets:** Sets are rendered by `renderSetDisplay(set, blockType, ...)` which handles: straight_set, superset, giant_set, drop_set, amrap, for_time, emom, rest_pause, cluster_set, pre_exhaustion. Each line shows weight, reps, and when present: RPE (`set.rpe`), AMRAP/For Time/EMOM/Tabata specifics, drop-set progression, rest-pause, etc.
  - **If the block has no logged sets:** Template exercises for that block are shown via `renderTemplateExercises(block, block.exerciseNames)`.
- **Links:** "View progression" per exercise (to analytics with exerciseId).
- **Actions:** Back to list, Delete workout (with confirmation).

So the UI renders: **sets, reps, weight, RPE (from workout_set_logs), duration, block-type-specific fields, and notes only where the set object has them.** It does not render notes from `workout_logs` or from `workout_set_details`.

### 5. Data MISSING or displayed incorrectly

- **workout_exercise_logs / workout_set_details:** Not loaded. So any RPE or notes that exist only in `workout_set_details` are **not** shown. If the app writes RPE to `workout_set_logs.rpe`, that is shown; if it writes only to `workout_set_details`, it is missing on this page.
- **workout_log.notes:** Not selected and not displayed.
- **workout_log** perceived_effort, overall_difficulty_rating, energy_level, muscle_fatigue_level: Not selected, not displayed.
- **Schema column name:** The code selects `set_entry_id` from `workout_set_logs`. Your schema CSV shows **block_id** on `workout_set_logs`, not `set_entry_id`. If the DB has only `block_id`, the select would either fail or return null for `set_entry_id`, and sets would not match to template blocks (all sets would be dropped with "Set found for block not in template"). So either the DB has a column or alias `set_entry_id`, or this is a bug. Worth confirming in the DB.

### 6. Console errors

- On log load failure: `console.error("Error loading workout log:", logError)`.
- On missing assignment: `console.error("No template_id found for assignment")`.
- On missing template blocks: `console.error("No blocks found for template")`.
- On sets load failure: `console.error("Error loading sets:", setsError)`.
- When a set's `set_entry_id` does not match any template block: `console.warn("Set found for block not in template:", set.set_entry_id)`.

If the page loads and matches blocks, no errors are expected. The warning above would appear if set logs reference a block id that is not in the template (e.g. template changed after the workout).

---

## Exact Supabase queries summary

| Page   | # | Table(s)                    | Select | Filters |
|--------|---|-----------------------------|--------|---------|
| List   | 1 | workout_logs                | id, client_id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted, workout_assignment_id | client_id = user.id, order started_at desc, limit 100 |
| List   | 2 | workout_assignments         | id, workout_template_id, workout_templates(id, name) | id in assignmentIds |
| List   | 3 | workout_set_logs            | id, weight, reps, exercise_id, workout_log_id, exercises(id, name, category) | workout_log_id in logIds, client_id = user.id |
| Detail | 1 | workout_logs                | id, started_at, completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted, workout_assignment_id | id = workoutLogId, client_id = user.id, single |
| Detail | 2 | workout_assignments         | workout_template_id, workout_templates(id, name) | id = log.workout_assignment_id, single |
| Detail | 3 | workout_assignments         | workout_template_id | id = log.workout_assignment_id, single |
| Detail | 4 | (WorkoutBlockService)       | Template blocks from workout_set_entries (or equivalent) for templateId | — |
| Detail | 5 | workout_set_logs            | id, workout_log_id, set_entry_id, set_type, exercise_id, weight, reps, rpe, set_number, completed_at, + all block-type columns, exercises(id, name, category) | workout_log_id = workoutLogId, client_id = user.id, order completed_at asc |
| Detail | 6 | exercises                   | id, name | id in exerciseIds |

---

## Response shape (conceptual) for a real workout log

You asked what the response looks like for workout log id `bb94ec05-a5da-401c-bd8f-d22af8b6f4bf`. The app does not log the raw response. To see the **exact** shape you can:

1. Run the SQL below in the Supabase SQL editor.
2. Optionally add a temporary `console.log(JSON.stringify(log))` (and of `sets`) in the detail page after the queries and reload the detail page for that id.

---

## SQL to run in Supabase (for log id `bb94ec05-a5da-401c-bd8f-d22af8b6f4bf`)

Run these in the Supabase SQL editor to see what actually exists for this workout. That will show whether `workout_set_logs` uses `block_id` or `set_entry_id`, whether RPE exists on set logs or only in set_details, and what rows exist in each table.

```sql
-- The workout log itself
SELECT * FROM workout_logs
WHERE id = 'bb94ec05-a5da-401c-bd8f-d22af8b6f4bf';

-- What set logs exist for this workout? (only columns that exist in all envs)
SELECT wsl.id, wsl.exercise_id, e.name AS exercise_name,
       wsl.set_number, wsl.weight, wsl.reps,
       wsl.completed_at
FROM workout_set_logs wsl
LEFT JOIN exercises e ON e.id = wsl.exercise_id
WHERE wsl.workout_log_id = 'bb94ec05-a5da-401c-bd8f-d22af8b6f4bf'
ORDER BY wsl.completed_at;

-- To see actual column names on workout_set_logs (run if above fails or to add set_type/block_id):
-- SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workout_set_logs' ORDER BY ordinal_position;

-- What exercise logs exist?
SELECT * FROM workout_exercise_logs
WHERE workout_log_id = 'bb94ec05-a5da-401c-bd8f-d22af8b6f4bf';

-- What set details exist (RPE)?
SELECT wsd.* FROM workout_set_details wsd
JOIN workout_exercise_logs wel ON wel.id = wsd.workout_exercise_log_id
WHERE wel.workout_log_id = 'bb94ec05-a5da-401c-bd8f-d22af8b6f4bf';
```

### Finding from running the SQL (workout log `bb94ec05-a5da-401c-bd8f-d22af8b6f4bf`)

- **workout_logs row:** The log **exists**. Key columns: `started_at` = 2026-03-15 19:36:46, `completed_at` = **null**, `total_sets_completed` = 0, `total_reps_completed` = 0, `total_weight_lifted` = 0, `workout_assignment_id` and `workout_session_id` and `program_schedule_id` set. So this is a **started but never completed** workout — the user began the session but did not complete it and no sets were logged.
- **workout_set_logs:** **0 rows** for this `workout_log_id`. No sets were ever written for this session.
- **workout_exercise_logs:** **0 rows** for this `workout_log_id`.
- **workout_set_details:** **0 rows** (join via `workout_exercise_logs`).
- **Conclusion:** List and detail pages are behaving correctly for this log. There is no set or exercise data in the DB because the session was abandoned before any sets were logged. The list will show this log with 0 sets / 0 kg and no exercise names (from the log row totals). The detail page will show the workout name and template structure but only template exercises per block (no logged sets). To verify the UI with real data, run the same four queries for a `workout_log_id` where `completed_at` is not null and `total_sets_completed` > 0.

---

## Data that EXISTS in the DB but is NOT displayed

- **workout_logs:** `notes`, `overall_difficulty_rating`, `perceived_effort`, `energy_level`, `muscle_fatigue_level`, `workout_session_id`, `created_at`, HR/distance columns — not selected or not shown on list or detail.
- **workout_exercise_logs:** Entire table is not used on the workout log screens. So exercise-level notes, difficulty_rating, form_quality_rating, completed_sets JSON, etc., are not displayed.
- **workout_set_details:** Not used on the detail page. So RPE, rest_seconds, notes, and completed_at that live only in `workout_set_details` are not displayed. (Only `workout_set_logs.rpe` is used if present.)

---

## Data that is FETCHED but not rendered

- **List page:** All selected fields from `workout_logs` and `workout_set_logs` are used either for the card (name, date, duration, set count, volume, exercise names) or for filtering/sorting. The only "extra" data is the full set list per log, which is used to compute totals and unique exercise names; individual set weight/reps are not shown on the list (by design).
- **Detail page:** All fetched data is used for the block/set UI or for totals. Nothing is intentionally fetched and then ignored. The only gap is if the backend writes RPE/notes to `workout_set_details` instead of `workout_set_logs` — in that case that data is never fetched for this page.

---

## Summary

| Topic | List page | Detail page |
|-------|-----------|-------------|
| workout_logs columns used | Core fields only; no notes, no difficulty/effort/HR | Same; no notes, no difficulty/effort |
| workout_templates name | Via workout_assignments → workout_templates | Via workout_assignments → workout_templates |
| workout_set_logs | Batched for all logs; used for totals + exercise names | Full select with block-type columns; grouped by set_entry_id |
| workout_exercise_logs | Not used | Not used |
| workout_set_details | Not used | Not used |
| RPE | Not shown | Shown only from workout_set_logs.rpe (if column exists) |
| Possible schema mismatch | — | set_entry_id in code vs block_id in schema CSV — verify in DB |

Running the SQL above for `bb94ec05-a5da-401c-bd8f-d22af8b6f4bf` will give you the full picture of what exists in the DB for that log and whether the detail page can show it with the current code.

---

## Rename / ID mismatch audit (drop sets “0 sets” bug)

Before fixing the display bug, run the following in the Supabase SQL editor to see the **actual** column names and data. Then compare with the code below to find where the ID mismatch is.

### 1. Column names on `workout_set_entries`

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_set_entries'
ORDER BY ordinal_position;
```

### 2. Column names on `workout_set_logs`

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_set_logs'
ORDER BY ordinal_position;
```

### 3. Logged sets vs template set entries (for a completed workout with drop/special sets)

**Logged sets (what the app reads):**

```sql
SELECT wsl.id, wsl.set_entry_id, wsl.set_type, wsl.exercise_id, e.name
FROM workout_set_logs wsl
LEFT JOIN exercises e ON e.id = wsl.exercise_id
WHERE wsl.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
  AND wsl.set_type IN ('drop_set', 'cluster_set', 'rest_pause', 'superset')
  AND wsl.workout_log_id IN (
    SELECT id FROM workout_logs
    WHERE completed_at IS NOT NULL AND client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
  )
ORDER BY wsl.completed_at DESC
LIMIT 10;
```

**Template set entries those logs reference:**

```sql
SELECT wse.id, wse.template_id, wse.set_type, wse.set_name, wse.set_order
FROM workout_set_entries wse
WHERE wse.id IN (
  SELECT DISTINCT wsl.set_entry_id FROM workout_set_logs wsl
  WHERE wsl.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
    AND wsl.set_type IN ('drop_set', 'cluster_set', 'rest_pause', 'superset')
);
```

*(If `workout_set_entries` uses `block_type` instead of `set_type`, or `block_name` instead of `set_name`, adjust the SELECT list from step 1.)*

### 4. `blocksMap` construction in the detail page

**File:** `src/app/client/progress/workout-logs/[id]/page.tsx`

- **Map creation:** `const blocksMap = new Map<string, BlockGroup>();` (around line 377).
- **Key used when populating:** `block.id` — i.e. each template block is stored under its own `id`:
  - `templateBlocks?.forEach((block) => { ... blocksMap.set(block.id, { set_entry_id: block.id, set_type: block.set_type || "unknown", ... }); });` (lines 380–418).
- **Key used when looking up:** `set.set_entry_id` — i.e. each logged set is looked up by the value of `set_entry_id` from `workout_set_logs`:
  - `const blockGroup = blocksMap.get(set.set_entry_id);` (line 425).
  - If missing: `console.warn("Set found for block not in template:", set.set_entry_id);` and the set is skipped (lines 426–428).

So for every set log, the code does `blocksMap.get(set.set_entry_id)`. For that to find a block, **`set.set_entry_id` must equal some `block.id`** from the template.

### 5. What `WorkoutBlockService.getWorkoutBlocks()` returns

**File:** `src/lib/workoutSetEntryService.ts`

- **Source:** Fetches from table **`workout_set_entries`** with `.select('*')` and `.eq('template_id', templateId)` (lines 473–477).
- **Returned shape:** The raw rows are passed to `buildBlocksForTemplates(blocks, options)`, which **mutates and returns** the same objects with extra fields (`exercises`, `drop_sets`, `time_protocols`, etc.). The **`id`** on each returned object is **not** changed.
- **Conclusion:** Each returned “block” has **`id` = `workout_set_entries.id`** (the primary key of the set entry row). So the detail page’s `blocksMap` is keyed by **`workout_set_entries.id`**.

### Summary for the mismatch

- **Template side:** `blocksMap` is keyed by `workout_set_entries.id` (because `getWorkoutBlocks` returns set entries and the page uses `block.id`).
- **Log side:** Lookup uses `workout_set_logs.set_entry_id`.

So the IDs will align **only if** `workout_set_logs.set_entry_id` stores **`workout_set_entries.id`**. If it stores something else (e.g. `workout_blocks.id`, or a row id from `workout_drop_sets`), the lookup will fail and you get “Set found for block not in template” and “0 sets”.

Run the SQL in sections 1–3 and compare:

- Step 1–2: Confirm actual column names on both tables (e.g. `set_type` vs `block_type`, `set_entry_id` vs `block_id`).
- Step 3: Check whether the `set_entry_id` values in the logged sets correspond to `workout_set_entries.id` from the second query. If they don’t (e.g. they’re drop_set row IDs), that’s the mismatch to fix in the logging or in the detail page grouping.

---

## SQL results (confirmed from your DB)

### Column names

- **workout_set_entries:** `id`, `template_id`, `set_order`, `set_name`, `set_notes`, `duration_seconds`, `rest_seconds`, `total_sets`, `reps_per_set`, `created_at`, `updated_at`, `set_type`, `hr_zone_target`, `hr_percentage_min`, `hr_percentage_max`. So **set_type** and **set_name** (no block_type/block_name).
- **workout_set_logs:** Includes **set_entry_id** and **set_type** (no `block_id` / `block_type`). The detail page query using `set_entry_id` and `set_type` matches the schema.

### Logged sets vs template set entries

- Logged sets (sample): each row has **set_entry_id** = a UUID (e.g. `8b3c9c22-5e0d-40f3-ba92-d20b91959b36`, `8be1cecd-208b-4927-a28a-87b9d12425bc`, `1eabf7f1-0bae-49a2-8f1c-deb59b4be26b`).
- Template set entries: the second query returns **workout_set_entries** rows whose **id** is exactly those UUIDs. So in your data, **workout_set_logs.set_entry_id = workout_set_entries.id** for cluster_set, rest_pause, and superset.

So the ID link is correct: logs point to set entries by `workout_set_entries.id`, and `getWorkoutBlocks(templateId)` returns those same set entries keyed by that `id`. For the templates in your sample, the detail page’s `blocksMap.get(set.set_entry_id)` should find the block.

### Why “0 sets” might still appear (e.g. for drop sets)

1. **Wrong template for the log**  
   The detail page loads blocks for the log’s **assignment’s** `workout_template_id`. If the assignment was changed to another template after the workout, or the log was created under a different template, the set_entry_ids in the log can belong to a different template than the one loaded. Then those ids are not in `blocksMap` and you get “Set found for block not in template” and 0 sets for that block.

2. **Drop sets: confirm what’s written**  
   Your sample had no `set_type = 'drop_set'` rows. For a workout that **does** have drop sets, run the same “logged sets” query filtered to `set_type = 'drop_set'` and check that:
   - `set_entry_id` is not null.
   - That `set_entry_id` appears in `workout_set_entries` for the **same template** that the log’s assignment uses. If drop-set logs have null or a different id (e.g. a row from `workout_drop_sets`), that would explain “0 sets” for drop-set blocks only.

**Next step:** On a specific workout log where a drop-set block shows “0 sets”, note the log’s `workout_assignment_id` and the block’s `set_entry_id` from the UI or DB. Then confirm that assignment’s `workout_template_id` is the template that contains that `workout_set_entries.id`. If it is and sets still don’t show, the issue is likely in how drop-set logs are written (e.g. missing or wrong `set_entry_id`).

---

## Drop set data and log-set API (findings)

### SQL to run (you run these; results tell us A/B/C/D)

**1. All drop set logs for this client**

*(If your DB has no `dropset_drops` column, remove it from the SELECT.)*

```sql
-- 1. Find ALL drop set logs for this client
SELECT wsl.id, wsl.set_entry_id, wsl.set_type, wsl.exercise_id, e.name,
       wsl.weight, wsl.reps, wsl.workout_log_id,
       wsl.dropset_initial_weight, wsl.dropset_initial_reps
FROM workout_set_logs wsl
LEFT JOIN exercises e ON e.id = wsl.exercise_id
WHERE wsl.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
  AND wsl.set_type = 'drop_set'
ORDER BY wsl.completed_at DESC
LIMIT 10;
```

If that returns 0 rows, try with `set_type = 'dropset'` (API stores `'dropset'`, template may use `'drop_set'`):

```sql
SELECT wsl.id, wsl.set_entry_id, wsl.set_type, wsl.exercise_id, e.name,
       wsl.weight, wsl.reps, wsl.workout_log_id,
       wsl.dropset_initial_weight, wsl.dropset_initial_reps
FROM workout_set_logs wsl
LEFT JOIN exercises e ON e.id = wsl.exercise_id
WHERE wsl.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
  AND wsl.set_type = 'dropset'
ORDER BY wsl.completed_at DESC
LIMIT 10;
```

**2. Distinct set_type values (to see if drop sets use a different label)**

```sql
SELECT DISTINCT set_type, COUNT(*)
FROM workout_set_logs
WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
GROUP BY set_type
ORDER BY count DESC;
```

**3. What is written during drop set logging (code answer, below)**

---

### Log-set API: what is stored for drop sets

**File:** `src/app/api/log-set/route.ts`

- **set_entry_id:** Not derived in the API. It comes from the request body:
  - `const set_entry_id = bodySetEntryId ?? bodyBlockId` (line 74).
  - So whatever the **client** sends as `set_entry_id` (or `block_id`) is what gets stored. The API does not substitute a different value for drop sets.
- **set_type:** Stored as `blockType`, which comes from the body (`bodySetType ?? bodyBlockType`). For drop sets the API accepts **`'dropset'`** only: `validBlockTypes` includes `'dropset'` (line 139), not `'drop_set'`. So if the client sends `set_type: 'drop_set'`, the API returns 400 Invalid set_type. So in the DB, drop set rows will have **set_type = 'dropset'**.
- **Drop set branch (lines 419–450):** The insert uses the same `insertData` built earlier (lines 331–336), so `set_entry_id` and `set_type` are already set. The branch only adds dropset-specific fields (dropset_initial_weight, dropset_final_weight, dropset_drops, etc.). So for drop sets, **set_entry_id is exactly what the client sent**.

---

### Client: what DropSetExecutor and LiveWorkoutBlockExecutor send

**DropSetExecutor** (`src/components/client/workout-execution/blocks/DropSetExecutor.tsx`):

- Calls `logSetToDatabase(logData)` where `logData` has `set_type: "dropset"` (line 366) and does **not** include `set_entry_id` in `logData`. So the executor relies on the parent to add it.

**LiveWorkoutBlockExecutor** (`src/components/client/LiveWorkoutBlockExecutor.tsx`):

- Builds the payload that is actually sent. It sets:
  - **set_entry_id: block.block.id** (line 392 in the golden flow path, line 526 in the legacy path).
- `block.block` is the `WorkoutSetEntry` (from `getWorkoutBlocks`), so **block.block.id = workout_set_entries.id**.
- So the client **does** send **set_entry_id = workout_set_entries.id** for drop sets (and all other block types). The golden flow passes `enrichedPayload` (which includes `set_entry_id: block.block.id`) to the orchestrator; `syncEntry` in `goldenLogSet.ts` sends `entry.payload` to `/api/log-set`, so the API receives the correct **set_entry_id**.

---

### Conclusion (A/B/C/D)

- **A) Drop sets never logged:** If query 1 returns 0 rows for both `set_type = 'drop_set'` and `set_type = 'dropset'`, then no drop set logs exist for this client. So either they were never logged or something prevents the request (e.g. 400 if client sent `set_type: 'drop_set'`).
- **B) Logged with wrong/null set_entry_id:** The code sends `set_entry_id: block.block.id` (workout_set_entries.id). If you see drop set rows with null or a different id, the bug is in how/when that payload is built (e.g. a different code path that doesn’t set it).
- **C) Different set_type value:** The API stores **`dropset`**; the template uses **`drop_set`**. The detail page groups only by **set_entry_id**, not set_type, so this alone would not cause “0 sets”. Query 2 shows which set_type values exist.
- **D) Logged correctly but detail page doesn’t render:** If query 1 returns rows with non-null `set_entry_id` that match `workout_set_entries.id` for the same template as the log’s assignment, and the detail page still shows 0 sets, then the bug is in the detail page (e.g. filtering or grouping).

Run the SQL and compare with the code above to see which of A–D applies.

---

## SQL results: drop set logs exist (set_type = 'dropset')

**Queries run:** (1) drop set logs with `set_type = 'dropset'`; (2) distinct set_type counts.

**Findings:**

- **Drop set logs exist:** 20 rows with `set_type = 'dropset'`. So **A) “never logged” is ruled out**; drop sets are being logged.
- **set_entry_id is set:** All returned rows have non-null `set_entry_id` (e.g. `5cfd7af3-7332-4d64-9840-a577bbc29d4f`, `98842794-68e8-471b-a8a8-5ccba009b216`, `f149188d-e0e0-4d8e-af7f-bc2540d3887a`). So **B) wrong/null set_entry_id** is not the cause for these rows.
- **Stored as `dropset`:** DB uses `set_type = 'dropset'` (no underscore). So **C)** is confirmed: template may use `drop_set`, logs use `dropset`; grouping is by `set_entry_id` only, so this alone does not cause “0 sets”.
- **Workout log `a8c38e9c-3121-4f62-b49f-e7382133f369`** has two drop set rows (Dumbbell Romanian Deadlift, set_entry_id `98842794-68e8-471b-a8a8-5ccba009b216`). If the detail page still shows “0 sets” for that block, the remaining suspect is **D) template mismatch** or a frontend bug.

**Next check (template vs log):** For the log that shows “0 sets”, confirm the assignment’s template actually contains that set entry:

```sql
-- For workout log a8c38e9c-3121-4f62-b49f-e7382133f369: get assignment and template
SELECT wl.id AS workout_log_id, wl.workout_assignment_id, wa.workout_template_id
FROM workout_logs wl
JOIN workout_assignments wa ON wa.id = wl.workout_assignment_id
WHERE wl.id = 'a8c38e9c-3121-4f62-b49f-e7382133f369';

-- Does that template have the set entry the drop set logs reference?
SELECT id, template_id, set_type, set_name, set_order
FROM workout_set_entries
WHERE id = '98842794-68e8-471b-a8a8-5ccba009b216';
```

If the first query’s `workout_template_id` does **not** match the second query’s `template_id`, then the assignment was changed (or the log was created under a different template) and the detail page loads a template that doesn’t contain that set entry — so `blocksMap.get(set_entry_id)` is undefined and the block shows 0 sets. If they **do** match, the bug is in the detail page (e.g. wrong templateId used, or sets filtered out).

---

## Set-type naming mismatch fix (drop_set vs dropset)

**Cause:** Template (`workout_set_entries`) uses `set_type = 'drop_set'`; logs were stored as `'dropset'`. Same pattern for `for_time`/`fortime` and `pre_exhaustion`/`preexhaust`. The detail page and API now normalize so both conventions work.

**Changes made:**

1. **`src/lib/setTypeUtils.ts`**  
   - `normalizeSetType(type)` maps variants to canonical (e.g. `dropset` → `drop_set`, `fortime` → `for_time`, `preexhaust` → `pre_exhaustion`). Used everywhere we read or compare set_type.

2. **Detail page (`workout-logs/[id]/page.tsx`)**  
   - When building `blocksMap`, `set_type` is set from `normalizeSetType(block.set_type)`.  
   - When grouping sets by exercise, we use `normalizeSetType(blockGroup.set_type)` for the giant_set/superset/pre_exhaustion check.  
   - `renderSetDisplay` normalizes the incoming `blockType` before the switch so one case (e.g. `drop_set`) handles both.  
   - Display labels use `formatBlockType(normalizeSetType(block.set_type))`.  
   - The branch that chooses “all sets directly” vs “group by exercise” uses `normalizeSetType(block.set_type)`.

3. **Log-set API (`/api/log-set/route.ts`)**  
   - `validBlockTypes` accepts both variants (e.g. `dropset` and `drop_set`, `fortime` and `for_time`, `preexhaust` and `pre_exhaustion`).  
   - After validation, we set `blockType = normalizeSetType(incomingBlockType)` so we **store canonical** `set_type` in `workout_set_logs` (e.g. `drop_set`).  
   - All switch cases use canonical names (`drop_set`, `for_time`, `pre_exhaustion`).

**SQL to compare template vs log set_type values (run in Supabase):**

```sql
-- What set_types exist in templates?
SELECT DISTINCT set_type FROM workout_set_entries ORDER BY set_type;

-- What set_types exist in logs?
SELECT DISTINCT set_type FROM workout_set_logs ORDER BY set_type;
```

Any value that appears in one list but not the other (or with different spelling) is handled by `normalizeSetType` so display and grouping work for both. New logs are stored with canonical form to match templates.

**Actual DB comparison (from Supabase):**

| Source     | set_type values |
| ---------- | ----------------- |
| **Templates** (`workout_set_entries`) | straight_set, superset, giant_set, **drop_set**, cluster_set, rest_pause, **pre_exhaustion**, amrap, emom, tabata, **for_time** |
| **Logs** (`workout_set_logs`)         | straight_set, superset, giant_set, **dropset**, cluster_set, rest_pause, **preexhaust**, amrap, emom, **fortime** |

**Mismatches (all handled by `normalizeSetType`):**

| Template value   | Log value  | Map entry in setTypeUtils |
| -----------------| ---------- | -------------------------- |
| drop_set         | dropset    | `dropset` → `drop_set`     |
| for_time         | fortime    | `fortime` → `for_time`     |
| pre_exhaustion   | preexhaust | `preexhaust` → `pre_exhaustion` |

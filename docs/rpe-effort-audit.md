# RPE / Effort Tracking — Read-Only Code Audit

**Scope:** Schema (from repo migrations + Supabase column inventory CSVs), Supabase RPCs in `migrations/`, TypeScript types, client/coach UI, and data flow to `/api/log-set` and `/api/sets/[id]`.  
**Date:** 2026-05-01  
**Note:** `supabase/migrations/` in this repo had no matches for `workout_set_logs` / RPE; authoritative SQL for RPCs and the `rpe` column lives under `dailyfitness-app/migrations/`.

---

## A) Set log schema

### Primary table: `workout_set_logs`

Individual set performance for the golden logging flow is stored in **`public.workout_set_logs`** (referenced across the app as `workout_set_logs`). Legacy or parallel paths may reference **`workout_set_details`** (`rpe`) and **`workout_exercise_logs`** (`difficulty_rating`); the live client execution path documented here targets **`workout_set_logs`**.

#### Effort / intensity / RPE–related columns

| Column / object | Purpose (from code + migrations) | Type / constraint | Nullable |
|-----------------|----------------------------------|-------------------|----------|
| **`rpe`** | Rate of perceived exertion for the logged set (1–10). Used by `/api/log-set`, resume RPCs, PATCH `/api/sets/[id]`, and UI. | `integer`; CHECK `workout_set_logs_rpe_range`: `rpe IS NULL OR (rpe >= 1 AND rpe <= 10)` | Yes |
| **`hr_percentage`**, **`hr_average_percentage`**, **`hr_zone`**, etc. | Heart-rate / zone–style intensity for HR-capable blocks (not the same as RPE). | Per inventory + CHECKs in `Supabase Snippet Public Schema Column Inventory (4).csv` | Yes |

**Other session-level fields (not per set):** `workout_logs.perceived_effort` and `workout_logs.overall_difficulty_rating` (integer, nullable per `Supabase Snippet Public Schema Column Inventory.csv`).

**Legacy:** `workout_set_details.rpe` (integer, nullable; CHECK 1–10 in inventory (4)).

#### Where the schema is defined

| Location | What it defines |
|----------|-----------------|
| `migrations/20260201_tracking_tables_and_admin_permissions.sql` | Adds `workout_set_logs.rpe` and `workout_set_logs_rpe_range` CHECK (lines **137–151**). |
| `migrations/20260228_phase1_block_to_set_entry_rename.sql` | Renames `block_id` → `set_entry_id`, `block_type` → `set_type` on `workout_set_logs` (lines **180–181**). |
| `migrations/20260313_workout_set_logs_dropset_drops.sql` | Adds `dropset_drops` JSONB (line **4**); not RPE-specific. |
| `Supabase Snippet Public Schema Column Inventory.csv` | Lists many `workout_set_logs` columns (lines **1080–1139**). **Gap:** that export segment does **not** list `rpe` or post-rename `set_entry_id` / `set_type`; treat live DB + migrations as source of truth for `rpe`. |
| `Supabase Snippet Public Schema Column Inventory (4).csv` | CHECK constraints for HR columns on `workout_set_logs` (e.g. lines **92–99**); no `rpe` CHECK line in this file snippet. |

**`supabase/migrations/`:** No audited matches for `workout_set_logs` / RPE in this workspace snapshot.

---

## B) Workout template / prescription schema

Prescribed “target RPE” in this codebase is consistently modeled as the **`rir`** integer column on exercise-level rows (naming is legacy; app comments state it stores **prescribed RPE**, not RIR conversion).

### Tables with prescription-related columns (from `Supabase Snippet Public Schema Column Inventory.csv`)

| Table | Column | Type | Nullable | Notes |
|-------|--------|------|----------|--------|
| **`workout_block_exercises`** | `rir` | integer | YES | Template exercise prescription (`894`). |
| **`workout_exercise_assignments`** | `rir` | integer | YES | Assignment-level (`955`). |
| **`client_workout_block_exercises`** | `rir` | integer | YES | Client copy (`190`). |
| **`program_progression_rules`** | `rir` | integer | YES | Program progression (`743`). |
| **`client_program_progression_rules`** | `rir` | integer | YES | Client progression (`145`). |
| **`workout_templates`** | `difficulty_level` | text, default `'intermediate'` | YES | Coarse template difficulty, not per-set RPE (`1144`). |
| **`workout_programs`** | `difficulty_level` | text | YES | Program-level (`1035`). |
| **`program_days`** / **`program_day_assignments`** | `intensity_level` | text | YES | Program day intensity label (`697`, `717`). |
| **`volume_guidelines`** | `rir_min`, `rir_max` | integer | NO | Guidelines naming (`850–851`); distinct from set logs. |
| **`progression_guidelines`** | `difficulty`, `intensity_increase_week` | text / integer | — | Meta-guidelines (`794`, `797`). |
| **`performance_tests`** | `perceived_effort` | integer | YES | Tests, not workout set logs (`626`). |

**Migration references for prescriptions:** Program/coach persistence of `rir` is heavily exercised in `src/lib/programProgressionService.ts` (integer field lists include `'rir'`). Template builder display uses `exercise.rir` as “RPE” in UI (see section G).

---

## C) Supabase RPC functions

Inserts/updates to `workout_set_logs` in this stack are performed via the **Next.js API** (`/api/log-set`, `/api/sets/[id]`) using the Supabase client, not via a dedicated `log_set` RPC. RPCs below **read** `workout_set_logs` (some return `rpe` in projected columns).

| RPC name | File | Reads / writes `workout_set_logs` | Effort / RPE columns |
|----------|------|-----------------------------------|----------------------|
| **`get_workout_set_logs_for_resume`** | `migrations/20260408_get_workout_set_logs_for_resume_rpc.sql` (lines **12–68**); security revision `migrations/20260409_security_auth_uid_checks_on_rpcs.sql` (lines **685–747**) | Read | Select list includes **`rpe`** (e.g. 20260408 lines **46**, **64**). |
| **`get_workout_session_data`** | `migrations/20260408_get_workout_set_logs_for_resume_rpc.sql` (lines **84–187**); `migrations/20260409_security_auth_uid_checks_on_rpcs.sql` (lines **765–854**) | Read | `setLogs` subquery includes **`rpe`** (20260408 lines **146**, **164**). Earlier version in `migrations/20260315_get_workout_session_data_rpc.sql` (lines **67–72**) **did not** select `rpe` or speed/endurance columns—superseded by 20260408. |
| **`get_gym_console_status`** (and secured variant) | e.g. `migrations/20260316_get_gym_console_status_rpc.sql` (lines **35–36**); `migrations/20260410_secure_get_gym_console_status.sql` (lines **39–40**) | Read | Subqueries: `COUNT(*)`, `MAX(completed_at)` only—**no `rpe`**. |
| **Dashboard / counter RPCs** | e.g. `migrations/20260407_get_client_dashboard_program_counters.sql` (line **164**); `migrations/20260311_dashboard_rpc_workout_set_entries.sql` (line **136**); `migrations/20260202_client_dashboard_rpc.sql` (line **212**); `migrations/20260209_patch_dashboard_rpc_column_names.sql` (line **207**) | Read | Typically aggregates or joins; not the primary RPE display path. |

---

## D) Application type definitions

| Type / interface | File | Relevant fields |
|------------------|------|-----------------|
| **`WorkoutSetEntryExercise`** | `src/types/workoutSetEntries.ts` (lines **50–78**) | `rir?: number` — comment: *“Prescribed RPE (1–10); DB column name is legacy”*. |
| **`LoggedSet`** | `src/types/workoutSetEntries.ts` (lines **229–247**) | `rir?: number`, `rpe?: number` — comment on `rpe`: *“Rate of Perceived Exertion (1-10)”*. |
| **`WorkoutSetEntry`** | same file (lines **21–48**) | Block-level prescription; exercises carry `rir`. |
| **`LastSessionSetRow`** | `src/lib/clientProgressionService.ts` (lines **32–36**) | `rpe: number \| null` for last-session rows. |
| **Progression / program types** | `src/lib/programProgressionService.ts` (e.g. lines **8–9**, **57–58**) | Documents `rir` as prescribed RPE for INTEGER DB columns. |
| **`ClientProgressionEditor`** row shape | `src/components/coach/client-views/ClientProgressionEditor.tsx` (lines **22**, **151**, **175**) | `rir: number \| null` on loaded exercises. |

---

## E) UI components that handle effort / RPE

| Component | Path | Props / data | UI pattern | Client vs coach |
|-----------|------|----------------|------------|-----------------|
| **`InlineRPERow`** | `src/components/client/workout-execution/ui/InlineRPERow.tsx` | `currentRPE`, `onRPESelect(rpe)` | **Four buttons** (Easy/Solid/Hard/Max) mapping to **RPE 6, 8, 9, 10** | Client |
| **`StraightSetExecutor`** | `.../blocks/StraightSetExecutor.tsx` | Uses `InlineRPERow`; prescribed label via `formatPrescribedRpeLabel(currentExercise.rir)` | Buttons + PATCH `{ rpe }` | Client |
| **`SupersetExecutor`**, **`GiantSetExecutor`**, **`PreExhaustionExecutor`** | same folder | `InlineRPERow` + prescribed `rir` labels | Buttons | Client |
| **`DropSetExecutor`**, **`ClusterSetExecutor`**, **`RestPauseExecutor`**, **`AmrapExecutor`**, **`EmomExecutor`**, **`ForTimeExecutor`** | same folder | `InlineRPERow` | Buttons | Client |
| **`EnduranceExecutor`**, **`SpeedWorkExecutor`** | same folder | Local `rpeStr` state | **Optional numeric text input** (1–10), merged into log payload as `rpe` | Client |
| **`RPEModal`** | `src/components/client/RPEModal.tsx` | `onSelect(rpe)`, `onSkip()` | **1–10 button grid** (deprecated in orchestrator) | Client |
| **`LiveWorkoutBlockExecutor`** | `src/components/client/LiveWorkoutBlockExecutor.tsx` | Wires `fetchApi("/api/log-set", …)` | Comment: RPE modal deprecated (e.g. line **1110** area) | Client |
| **`LastSessionSetsSection`** | `src/components/client/workout-execution/ui/LastSessionSetsSection.tsx` | `lastWorkout.setDetails[].rpe` | **Derived text** via `clientEffortLabelFromStoredRpe` | Client |
| **`ProgressionNudge`** | `src/components/client/workout-execution/ui/ProgressionNudge.tsx` | `formatEffortSuffix` / average RPE | Text suffix from stored RPE | Client |
| **`SetLoggingForm`** | `src/components/SetLoggingForm.tsx` | `formData.rpe` (default **5**) | **Range input** 1–10 + labels | Client UI present; **submit path omits `rpe`** (lines **112–124**) — see section I |
| **`ExerciseBlockCard`**, **`ExerciseItem`** | `src/components/features/workouts/*.tsx` | `exercise.rir` | Prescribed label via `formatPrescribedRpeLabel` | Mixed / read-only display |
| **`WorkoutBlockBuilder`** | `src/components/coach/WorkoutBlockBuilder.tsx` | `exercise.rir` | Text: `RPE: {exercise.rir}` when set | Coach |
| **`ClientProgressionEditor`**, **`ProgramProgressionGridCell`**, **`ProgramProgressionRulesEditor`**, **`ProgressionPreview`** | `src/components/coach/...` | `rir` fields, labeled “RPE” in grid | Text / numeric inputs; preview uses `formatPrescribedRpeLabel` | Coach |
| **Client workout `start/page.tsx`** | `src/app/client/workouts/[id]/start/page.tsx` | `currentExercise.rir` | Displays `RPE: {Number(currentExercise.rir)}` in multiple places (e.g. lines **5380–5386**) | Client |

---

## F) Current client-side effort input (golden flow)

1. **Strength-style blocks (straight set, superset, giant set, pre-exhaust, drop, cluster, rest-pause, AMRAP, EMOM, for-time):** After a set is logged, **`InlineRPERow`** shows four **buttons** (“Easy”, “Solid”, “Hard”, “Max”) which correspond to stored values **`6`, `8`, `9`, `10`** only (not the full 1–10 scale).
2. **Optional fine-grained RPE:** **`EnduranceExecutor`** and **`SpeedWorkExecutor`** use a **text field** for optional **integer 1–10** included on the initial log payload as `rpe`.
3. **Sync path:** `useSetLoggingOrchestrator` / `goldenLogSet.buildSyncPayload` merge `entry.rpe` into the POST body when non-null (`src/lib/setLogging/goldenLogSet.ts`, lines **56–65**). **`LiveWorkoutBlockExecutor`** posts to **`POST /api/log-set`** (`src/components/client/LiveWorkoutBlockExecutor.tsx`, lines **556–561**).
4. **Server persistence:** `/api/log-set` sets `insertData.rpe` when `incomingRpe` is integer 1–10 (`src/app/api/log-set/route.ts`, lines **722–727**).
5. **Post-hoc update:** Executors call **`PATCH /api/sets/{id}`** with `{ rpe }` (`StraightSetExecutor.tsx` example lines **691–715**). Whitelist in `src/app/api/sets/[id]/route.ts` includes **`rpe`** for listed `set_type` keys (lines **22–79**); **`speed_work` / `endurance` are not present** in that whitelist—PATCH RPE for those types is not supported server-side.

**RPC:** No client RPC is required to write RPE; optional **`get_workout_set_logs_for_resume`** / **`get_workout_session_data`** return `rpe` for hydration (`start/page.tsx` select list includes `rpe`, e.g. line **788**).

---

## G) Current coach-side prescription

- **Program / progression editing:** Coaches enter **`rir`** in grids and forms; UI labels it **“RPE”** in places (e.g. `ClientProgressionEditor.tsx` column `['rir', 'RPE']` at lines **445**). Values persist through `programProgressionService` as integer **`rir`** (prescribed RPE).
- **Template preview:** `WorkoutBlockBuilder.tsx` shows **`RPE: {exercise.rir}`** when `rir` is non-null (lines **426–427**).
- **Display helper:** `formatPrescribedRpeLabel` prefixes the stored number as **`RPE {value}`** (`src/lib/workoutTargetIntensity.ts`, lines **7–14**), with an explicit comment that **`rir` holds prescribed RPE as-is** (lines **1–4**).

---

## H) Historical data display (“Last session”)

- **`LastSessionSetsSection.tsx`** (lines **82–83**, **131–135**): For each row, reads **`set.rpe`** and maps through **`clientEffortLabelFromStoredRpe`** (`src/lib/workoutEffortLabels.ts`). Labels: **Easy** (≤7), **Moderate** (8), **Hard** (9), **Very hard** (≥10)—note this mapping uses **≤7** as “Easy”, aligning with button value **6** but also lumping **7** into Easy if ever stored.
- **Aggregate row** (no `setDetails`): uses **`lastWorkout.avgRpe`** rounded, same mapper (`LastSessionSetsSection.tsx`, lines **131–135**).
- **Source data:** `clientProgressionService` selects `rpe` from `workout_set_logs` and builds `LastSessionSetRow` (`src/lib/clientProgressionService.ts`, lines **138–144**, **183**, **229**).

---

## I) Gaps and observations

1. **Single column for “effort” + numeric RPE:** `workout_set_logs` stores **one** nullable **`rpe`** integer (1–10). There is **no** separate text/enum column for a four-tier effort label; labels are **derived in the app** from `rpe` (`InlineRPERow`, `clientEffortLabelFromStoredRpe`).
2. **Template prescriptions:** **`rir`** on `workout_block_exercises` (and related tables) holds **target / prescribed RPE** per app convention—not a second “effort” channel at set-log level.
3. **Coach UI vs DB:** Coach surfaces use **`rir`** consistently for prescribed intensity; display often says “RPE”.
4. **`SetLoggingForm`:** RPE slider/state **does not** appear in the **`fetchApi('/api/log-set', { body })`** payload (`src/components/SetLoggingForm.tsx`, lines **112–124**) — **UI/schema mismatch** if that modal is still used.
5. **`LoggedSet` dual fields:** Types allow both **`rir`** and **`rpe`** on `LoggedSet`; hydration from DB uses **`rpe`** (`start/page.tsx`, lines **974–1016**), but **straight-set edit** initializes edit draft from **`setEntry.rir`** (`StraightSetExecutor.tsx`, line **220**), which can **omit** stored `rpe` when opening the editor—a **field naming inconsistency**.
6. **Inline buttons vs DB constraint:** Buttons write **6, 8, 9, 10** only; DB allows **1–10**. **`RPEModal`** still documents **1–10** grid if ever re-enabled—different granularity than `InlineRPERow`.
7. **Naming confusion:** **`rir`** column name everywhere for **prescribed RPE**; **`rpe`** for **logged** exertion; HR “intensity” columns separate; `workout_logs.perceived_effort` is **session-level**, not per set.
8. **Inventory CSV drift:** `Supabase Snippet Public Schema Column Inventory.csv` segment for `workout_set_logs` ends at **`hr_average_percentage`** without listing **`rpe`** / renamed columns—rely on migrations + live `information_schema` for audits.

---

## Appendix: Tables quick index

| Role | Table(s) |
|------|-----------|
| Per-set log (primary) | `workout_set_logs` |
| Per-set log (legacy) | `workout_set_details` (`rpe`) |
| Session-level effort | `workout_logs` (`perceived_effort`, `overall_difficulty_rating`) |
| Prescribed RPE (column `rir`) | `workout_block_exercises`, `workout_exercise_assignments`, `client_workout_block_exercises`, `program_progression_rules`, `client_program_progression_rules` |
| Template / program coarse difficulty | `workout_templates`, `workout_programs` (`difficulty_level`); `program_days` / `program_day_assignments` (`intensity_level`) |

# Block Model Audit — Findings

**Date:** 2026-06-10  
**Scope:** Read-only investigation of the current workout set-entry (`block_type` / `set_type`) model in `dailyfitness-app` against live Supabase.  
**Repo:** `C:\Users\HP\Desktop\DailyFitness\dailyfitness-app`

---

## Nomenclature (critical context)

The codebase underwent **Phase 1 rename** (see `src/types/workoutSetEntries.ts`, `migrations/20260228_phase1_block_to_set_entry_rename.sql`). The audit brief uses legacy names; live DB and most application code use the new names:

| Audit / stale CSV term | Live DB / current code |
|------------------------|-------------------------|
| `workout_blocks` | `workout_set_entries` |
| `block_type` | `set_type` |
| `workout_block_exercises` | `workout_set_entry_exercises` |
| `block_order` | `set_order` |
| Builder form field | `exercise_type` (UI) → persisted as `set_type` |

`Supabase Snippet Public Schema Column Inventory.csv` still lists `workout_blocks`, `block_type`, etc. — **stale** relative to live DB.

---

## Area 1 — Block type census (code)

### Canonical TypeScript union

**File:** `src/types/workoutSetEntries.ts` — `SetType` (14 values):

`straight_set`, `superset`, `giant_set`, `drop_set`, `cluster_set`, `rest_pause`, `pre_exhaustion`, `amrap`, `emom`, `tabata`, `for_time`, `speed_work`, `endurance`, `timed_set`

Also exports `WORKOUT_SET_TYPE_CONFIGS` with metadata per type (`requiresMultipleExercises`, `supportsTimeProtocols`, etc.).

**Deprecated shim:** `src/types/workoutBlocks.ts` re-exports from `workoutSetEntries` as `WorkoutBlockType`.

### Zod validation

**File:** `src/lib/validation/validators.ts` — `WorkoutBlockTypeSchema` (13 values):

`straight_set`, `superset`, `giant_set`, `drop_set`, `cluster_set`, `rest_pause`, `pre_exhaustion`, `amrap`, `emom`, `for_time`, `tabata`, `speed_work`, `endurance`

**Missing vs `SetType`:** `timed_set`  
**Missing vs UI dropdowns:** none (UI has `timed_set`; Zod does not)

Uses field name `set_type` on `WorkoutBlockSchema` (not `block_type`).

### Normalization / display maps

**File:** `src/lib/setTypeUtils.ts`

- `SET_TYPE_MAP`: aliases `dropset`→`drop_set`, `fortime`→`for_time`, `preexhaust`→`pre_exhaustion`, `timedset`→`timed_set`, etc.
- `SET_TYPE_DISPLAY`: 13 labels (includes `timed_set`; no `hr_sets`, `circuit`, `pyramid`, `ladder`)

### Builder dropdowns (“Add Exercise” flow)

Both builder UIs expose the **same 14 options** (no `hr_sets`, `circuit`, `pyramid`, `ladder`):

| Source | Path |
|--------|------|
| Add panel (create) | `src/components/workout-form/AddExercisePanel.tsx` — `SelectItem value={...}` lines ~266–417 |
| Edit panel | `src/components/features/workouts/ExerciseDetailForm.tsx` — `SelectItem` lines ~343–476 |

Groups: Standard (`straight_set`, `superset`, `giant_set`), Advanced Techniques (`drop_set`, `cluster_set`, `rest_pause`, `pre_exhaustion`), Time-Based (`speed_work`, `endurance`, `amrap`, `emom`, `tabata`, `for_time`, `timed_set`).

Form state field: **`exercise_type`** (not `set_type` / `block_type`).

### Log API accepted types

**File:** `src/app/api/log-set/route.ts` — `validBlockTypes` includes canonical + legacy aliases (`dropset`, `fortime`, `preexhaust`) but **not** `hr_sets`, `circuit`, `pyramid`, `ladder`.

### DB CHECK constraint (migration file only — see Risks)

**File:** `migrations/20260401_remove_pyramid_ladder_circuit_everywhere.sql` — `workout_set_entries_set_type_check` lists:

`straight_set`, `superset`, `giant_set`, `drop_set`, `cluster_set`, `rest_pause`, `pre_exhaustion`, `amrap`, `emom`, `tabata`, `for_time`, **`hr_sets`**

Does **not** list `speed_work`, `endurance`, `timed_set` (conflicts with live data and TypeScript — see Area 7).

### Cross-location agreement matrix

| Location | Count | Values not in `SetType` | Values in `SetType` but missing here |
|----------|------:|-------------------------|--------------------------------------|
| `workoutSetEntries.ts` | 14 | — | — |
| Zod `WorkoutBlockTypeSchema` | 13 | — | `timed_set` |
| AddExercisePanel / ExerciseDetailForm | 14 | — | — |
| `setTypeUtils` SET_TYPE_DISPLAY | 13 | — | (timed_set has display) |
| log-set `validBlockTypes` | 17 entries (aliases) | — | — |
| Migration CHECK (file) | 12 | `hr_sets` | `speed_work`, `endurance`, `timed_set` |
| Stale CSV `workout_block_type` enum | unknown | likely `circuit`, pyramid, ladder | `speed_work`, `endurance`, `timed_set` |

### Dead / removed types in code

| Type | In UI? | In `SetType`? | Code references |
|------|--------|---------------|-----------------|
| `circuit` | No | No | Docs/migrations only (`migrations/20260401_...`, `docs/NOTE_circuit_removal.md`) |
| `hr_sets` | No | No | Migrations/RPC JSON keys only; **zero** `src/` references |
| `pyramid_set` / `pyramid` | No | No | Migration deletes; log columns `pyramid_step_number` remain on `workout_set_logs` |
| `ladder` / `ladder_set` | No | No | Migration drops `workout_ladder_sets`; log columns `ladder_round_number`, `ladder_rung_number` remain |

---

## Area 2 — Block type census (live database)

> User-supplied queries targeted `workout_blocks.block_type`. Live schema uses **`workout_set_entries.set_type`**. Old tables return `PGRST205` (not in schema cache).

### Adapted query 1 — Types in templates

```sql
SELECT set_type, COUNT(*) AS blocks,
       COUNT(DISTINCT template_id) AS templates
FROM workout_set_entries
GROUP BY set_type
ORDER BY blocks DESC;
```

**Result (live, 2026-06-10):**

| set_type | blocks | templates |
|----------|-------:|----------:|
| straight_set | 103 | 27 |
| superset | 19 | 11 |
| drop_set | 8 | 8 |
| cluster_set | 3 | 3 |
| tabata | 2 | 2 |
| emom | 2 | 1 |
| for_time | 2 | 2 |
| speed_work | 2 | 2 |
| endurance | 2 | 2 |
| rest_pause | 1 | 1 |
| pre_exhaustion | 1 | 1 |
| amrap | 1 | 1 |
| giant_set | 1 | 1 |
| **timed_set** | **0** | **0** |
| **hr_sets** | **0** | **0** |
| **circuit** | **0** | **0** |

**Total set entries:** 147

### Adapted query 2 — Types logged by clients

```sql
SELECT set_type, COUNT(*) AS logged_sets,
       COUNT(DISTINCT workout_log_id) AS sessions
FROM workout_set_logs
GROUP BY set_type
ORDER BY logged_sets DESC;
```

**Result (live, 1,210 rows):**

| set_type (as stored) | logged_sets | sessions |
|----------------------|------------:|---------:|
| straight_set | 844 | 73 |
| superset | 52 | 14 |
| dropset | 36 | 22 |
| cluster_set | 21 | 15 |
| emom | 11 | 6 |
| giant_set | 8 | 7 |
| fortime | 8 | 8 |
| rest_pause | 6 | 6 |
| amrap | 6 | 6 |
| preexhaust | 5 | 4 |
| speed_work | 2 | 1 |
| endurance | 1 | 1 |
| **tabata** | **0** | **0** |
| **timed_set** | **0** | **0** |
| **drop_set** | **0** | (uses alias `dropset`) |
| **for_time** | **0** | (uses alias `fortime`) |
| **pre_exhaustion** | **0** | (uses alias `preexhaust`) |

**Note:** Logs use **mixed canonical and legacy** `set_type` strings. `normalizeSetType()` exists but storage is not fully normalized in DB.

### Adapted query 3 — Progression rules

```sql
SELECT set_type, COUNT(*) FROM program_progression_rules GROUP BY set_type;
```

**Result (live, 1,187 rows — paginated):**

| set_type | count |
|----------|------:|
| straight_set | 966 |
| superset | 66 |
| drop_set | 43 |
| cluster_set | 26 |
| giant_set | 18 |
| tabata | 18 |
| pre_exhaustion | 16 |
| emom | 12 |
| amrap | 6 |
| for_time | 6 |
| rest_pause | 6 |
| endurance | 2 |
| speed_work | 2 |
| **timed_set** | **0** |

**Related:** `client_program_progression_rules` still has column **`block_type`** (not `set_type`) — schema conflict with `program_progression_rules.set_type`.

### Adapted query 4 — Satellite table row counts

```sql
SELECT 'workout_drop_sets' AS tbl, COUNT(*) FROM workout_drop_sets
UNION ALL SELECT 'workout_cluster_sets', COUNT(*) FROM workout_cluster_sets
UNION ALL SELECT 'workout_rest_pause_sets', COUNT(*) FROM workout_rest_pause_sets
UNION ALL SELECT 'workout_pyramid_sets', COUNT(*) FROM workout_pyramid_sets
UNION ALL SELECT 'workout_ladder_sets', COUNT(*) FROM workout_ladder_sets
UNION ALL SELECT 'workout_time_protocols', COUNT(*) FROM workout_time_protocols
UNION ALL SELECT 'workout_hr_sets', COUNT(*) FROM workout_hr_sets;
```

**Result (live):**

| Table | Rows | Status |
|-------|-----:|--------|
| workout_drop_sets | 7 | exists |
| workout_cluster_sets | 3 | exists |
| workout_rest_pause_sets | 1 | exists |
| workout_time_protocols | 11 | exists |
| workout_speed_sets | 1 | exists (not in user query) |
| workout_endurance_sets | 2 | exists (not in user query) |
| workout_pyramid_sets | — | **table does not exist** (`PGRST205`) |
| workout_ladder_sets | — | **table does not exist** |
| workout_hr_sets | — | **table does not exist** |

### `workout_time_protocols.protocol_type` (live distinct)

```sql
SELECT protocol_type, COUNT(*) FROM workout_time_protocols GROUP BY protocol_type;
```

| protocol_type | count |
|---------------|------:|
| tabata | 6 |
| emom | 2 |
| for_time | 2 |
| amrap | 1 |

No other `protocol_type` values in production.

---

## Area 3 — How each type is stored

Parent table for all types: **`workout_set_entries`**

**Live columns:** `id`, `template_id`, `set_type`, `set_order`, `set_name`, `set_notes`, `duration_seconds`, `rest_seconds`, `total_sets`, `reps_per_set`, `hr_zone_target`, `hr_percentage_min`, `hr_percentage_max`, `created_at`, `updated_at`

Child exercise rows: **`workout_set_entry_exercises`**

**Live columns:** `id`, `set_entry_id`, `exercise_id`, `exercise_order`, `exercise_letter`, `sets`, `reps`, `weight_kg`, `load_percentage`, `rir`, `tempo`, `rest_seconds`, `notes`, `created_at`, `updated_at`

**Save path:** `src/services/saveWorkoutTemplate.ts` + `src/lib/workoutSetEntryService.ts` (`childTablesForSetType`).

### Per-type storage summary

| set_type | `workout_set_entry_exercises` rows | `exercise_order` usage | Satellite table(s) | Prescription location |
|----------|-----------------------------------|------------------------|--------------------|------------------------|
| **straight_set** | 1 | `1` | — | WSEE: `sets`, `reps`, `weight_kg`, `load_percentage`, `rir`, `tempo`, `rest_seconds`; parent: `total_sets`, `reps_per_set`, `rest_seconds` |
| **superset** | 2 (17/19 prod); 2 prod rows have only 1 WSEE | Both exercises share **`exercise_order = 1`**; letters `A`, `B` | — (drop/cluster/rest_pause *supported in config* but saved separately if type changed) | Per-exercise reps/load on WSEE; **group rest** on parent `rest_seconds` (not per-exercise) |
| **giant_set** | N (prod: 3 on one entry) | All share **`exercise_order = 1`**; letters A…N | — | Per-exercise `sets`/`reps`/load on WSEE; parent `total_sets`, `rest_seconds` |
| **pre_exhaustion** | 2 | Both **`exercise_order = 1`**; A=isolation, B=compound | — | Isolation/compound reps on respective WSEE rows; parent `total_sets`, `rest_seconds` |
| **drop_set** | 1 | `1` | **`workout_drop_sets`**: `drop_order`, `weight_kg`, `reps`, `load_percentage`, `drop_percentage` (prod: only `drop_order=1` rows) | Initial load in drop_sets + WSEE; parent `total_sets`, `rest_seconds` |
| **cluster_set** | 1 | `1` | **`workout_cluster_sets`**: `reps_per_cluster`, `clusters_per_set`, `intra_cluster_rest`, `inter_set_rest`, `load_percentage` | WSEE + cluster_sets; parent `total_sets` |
| **rest_pause** | 1 | `1` | **`workout_rest_pause_sets`**: `weight_kg`, `load_percentage`, `rest_pause_duration`, `max_rest_pauses` | WSEE reps + rest_pause_sets; parent `total_sets`, `rest_seconds` |
| **amrap** | **0** (time types skip WSEE) | N/A | **`workout_time_protocols`** (`protocol_type='amrap'`): `total_duration_minutes`, `load_percentage`, `weight_kg` | Parent `duration_seconds`; protocol row per exercise |
| **emom** | 0 | protocol `exercise_order = 1` | **`workout_time_protocols`**: `total_duration_minutes`, `work_seconds`, `rest_seconds`, `reps_per_round`, `emom_mode`, `load_percentage` | Parent `duration_seconds` |
| **for_time** | 0 | `exercise_order = 1` | **`workout_time_protocols`**: `target_reps`, `time_cap_minutes`, `load_percentage` | Parent fields minimal; caps/targets in protocol |
| **tabata** | **0** | **Incrementing `exercise_order`** per exercise across sets (1,2,3…) | **`workout_time_protocols`** only: `protocol_type='tabata'`, `set` (round group #), `work_seconds`, `rest_seconds` (intra), `rest_after_set`, `rounds`, `weight_kg` | Multi-exercise list is **multiple protocol rows**, not WSEE |
| **speed_work** | 0 in prod (code can write WSEE + speed_sets) | `1` when WSEE used | **`workout_speed_sets`**: `intervals`, `distance_meters`, `rest_seconds`, `load_pct_bw`, `target_speed_pct`, `target_hr_pct` | Parent `total_sets` (=intervals), `rest_seconds`; distance/speed in speed_sets |
| **endurance** | 0 in prod | `1` when WSEE used | **`workout_endurance_sets`**: `target_distance_meters`, `target_time_seconds`, `target_pace_seconds_per_km`, `hr_zone`, `target_hr_pct` | Single continuous effort; parent `total_sets = 1` |
| **timed_set** | 1 (when saved) | `1` | — | Parent `duration_seconds` (= work seconds per set), `total_sets`, `rest_seconds`; WSEE has no reps |

### Multi-exercise representation

| Type | Exercise list mechanism |
|------|-------------------------|
| superset, giant_set, pre_exhaustion | Multiple **`workout_set_entry_exercises`** rows |
| tabata | Multiple **`workout_time_protocols`** rows (JSON `tabata_sets` in form → flattened on save) |
| amrap, emom, for_time | Typically **one** protocol row per set entry (single exercise in prod) |
| speed_work, endurance | One **`workout_*_sets`** row + optional WSEE |

**`giant_set_exercises` on logs:** Not a template table — logged performance is stored as JSON column `workout_set_logs.giant_set_exercises`.

---

## Area 4 — Grouping representability test

**Question:** Can existing schema represent “N exercises back-to-back, shared round count, rest after last exercise” without a dedicated `set_type`?

### What already exists

- **Group container:** `workout_set_entries` row (`total_sets` = round count, `rest_seconds` = rest after completing the group).
- **Ordered members:** `workout_set_entry_exercises` with `exercise_letter` (A/B/C) and shared `exercise_order = 1` for superset/giant_set/pre_exhaustion (live pattern).
- **Labels:** `exercise_letter` provides A1/A2-style labeling at prescription level (UI renders via `ExerciseBlockCard`, executors).
- **Tabata-style multi-exercise:** Achieved via multiple `workout_time_protocols` rows with shared `set` field and `rest_after_set`.

### What is missing for a generic grouping axis

- **No type-agnostic “group” entity** — grouping is implied by choosing `superset` / `giant_set` / `pre_exhaustion` / `tabata` upfront.
- **`exercise_order` is not round index** — for grouped resistance types all members use `exercise_order = 1`; round iteration is driven by `total_sets` at parent level, not per-exercise ordering semantics.
- **Per-exercise rest inside a group** — explicitly cleared (`rest_seconds: undefined`) on WSEE for superset/pre_exhaustion; only parent-level post-group rest.
- **Per-exercise measurement type** — no column on WSEE or parent; measurement is **entirely implied by `set_type`** (and satellite table choice).
- **Mixed measurement within a group** — not representable (e.g. rep exercise A + time exercise B in one group).
- **HR-specific set type** — `hr_zone_target` / `hr_percentage_*` columns exist on `workout_set_entries` but **zero populated rows** in live DB; `workout_hr_sets` table dropped.

### Measurement / tracking type column

**No explicit `measurement_type` or `tracking_mode` column.** Implied by:

1. `workout_set_entries.set_type`
2. Presence of satellite table (`workout_time_protocols`, `workout_speed_sets`, `workout_endurance_sets`, etc.)
3. Log column families on `workout_set_logs` (weight/reps vs `actual_time_seconds` vs `actual_distance_meters`)

---

## Area 5 — Consumer inventory (blast radius)

**Search:** `block_type|set_type|exercise_type` in `src/` + `tests/` → **88 files**  
**Legacy `block_type` only:** **14 files**

### Builder / template authoring

| File | Role |
|------|------|
| `src/components/WorkoutTemplateForm.tsx` | Main template builder; `exercise_type` state; imports (unused) `WorkoutBlockBuilder` |
| `src/components/workout-form/AddExercisePanel.tsx` | “Add exercise” type dropdown + per-type form sections |
| `src/components/features/workouts/ExerciseDetailForm.tsx` | Edit exercise type dropdown + per-type fields |
| `src/components/features/workouts/ExerciseBlockCard.tsx` | Card display branches on `exercise.exercise_type` for labels/icons |
| `src/components/coach/WorkoutBlockBuilder.tsx` | Legacy block builder UI (iterates `WORKOUT_BLOCK_CONFIGS`) — **not rendered** |
| `src/services/saveWorkoutTemplate.ts` | Persists `exercise_type` → `set_type`; per-type DB writes |
| `src/utils/buildExerciseFromNewExercise.ts` | Maps new-exercise form → exercise object by `exercise_type` |
| `src/lib/blockConversion.ts` | `convertBlocksToExercises()` — load path inverse |
| `src/utils/exercisesToWorkoutBlocks.ts` | Form exercises → `WorkoutSetEntry[]` for volume widget |
| `src/lib/workoutSetEntryService.ts` | CRUD/load for set entries + child tables |
| `src/lib/workoutTemplateService.ts` | Template fetch; set_type handling |
| `src/lib/workoutBlocksRpcMapper.ts` | Maps RPC payload keys |
| `src/lib/validation/validators.ts` | Zod `WorkoutBlockTypeSchema` |
| `src/components/coach/WorkoutTemplateDetails.tsx` | Template detail view; type-specific display |
| `src/components/coach/workouts/workoutTemplateSetTypeAccent.ts` | UI accent colors per type |
| `src/components/coach/workouts/WorkoutTemplateConfigCard.tsx` | Type metadata for config UI |
| `src/components/coach/programs/ProgramEditSetTypePill.tsx` | Set-type pill in program edit |

### Conversion / display (read-only surfaces)

| File | Role |
|------|------|
| `src/components/WorkoutBlocks/BlockCardDisplay.tsx` | Routes display by `block.blockType` |
| `src/components/WorkoutBlocks/TypeBadge.tsx` | Badge styling per `blockType` |
| `src/components/WorkoutBlocks/StraightSetsDisplay.tsx` | Straight set display |
| `src/components/WorkoutBlocks/SupersetsDisplay.tsx` | Superset display |
| `src/components/WorkoutBlocks/DropsetsDisplay.tsx` | Drop set display |
| `src/components/WorkoutBlocks/DensityTrainingDisplay.tsx` | AMRAP/EMOM/for_time display |
| `src/components/WorkoutBlocks/TabataSetsDisplay.tsx` | Tabata display |
| `src/components/WorkoutDetailModal.tsx` | Modal; branches on exercise type |
| `src/components/client/train/WorkoutDayPreview.tsx` | Preview by type |
| `src/app/client/workouts/[id]/details/page.tsx` | Details page type branches |
| `src/app/client/workouts/[id]/details/WorkoutDetailsBlockSection.tsx` | Block section rendering |

### Client execution / set-logging row system

| File | Role |
|------|------|
| `src/components/client/LiveWorkoutBlockExecutor.tsx` | **Dispatcher** `switch (block.set_type)` → per-type executor |
| `src/components/client/workout-execution/blocks/*Executor.tsx` | 14 executors (StraightSet, Superset, GiantSet, DropSet, ClusterSet, RestPause, PreExhaustion, Amrap, Emom, Tabata, ForTime, SpeedWork, Endurance, TimedSet) |
| `src/components/client/workout-execution/hooks/useSetRowsState.ts` | Generic row state (type-agnostic) |
| `src/components/client/workout-execution/ui/set-rows/SetRowShell.tsx` | Row chrome (type-agnostic) |
| `src/components/client/workout-execution/ui/set-rows/SetRowFieldsByType.tsx` | **Misnamed** — only shared weight/reps field components |
| `src/components/client/workout-execution/ui/BlockTypeBadge.tsx` | Client badge by type |
| `src/components/client/workout-execution/ui/SetTypeBadge.tsx` | Set type badge |
| `src/components/client/workout-execution/BaseBlockExecutor.tsx` | Shared executor base; references `set_type` |
| `src/app/client/workouts/[id]/start/page.tsx` | Loads assignment, restores logs by `set_entry_id` + `set_type` |
| `src/hooks/useSetLoggingOrchestrator.ts` | Logging orchestration |
| `src/lib/setLogging/goldenLogSet.ts` | Golden log payload builder |
| `src/lib/setLogging/types.ts` | Logging types |

### API / writes

| File | Role |
|------|------|
| `src/app/api/log-set/route.ts` | Inserts `workout_set_logs`; branches on `set_type`; accepts `block_type` alias |
| `src/app/api/sets/[id]/route.ts` | Set update; type-aware payload |
| `src/lib/setEditPayload.ts` | Allowed fields per `set_type` for edits |
| `src/lib/completeWorkoutService.ts` | Completion flow; set_type aware |

### Gym console

| File | Role |
|------|------|
| `src/components/coach-gym-console/SessionCard.tsx` | Completion marking; reads `set_type` / `block_type` |
| `src/components/coach-gym-console/QuickLogRow.tsx` | Quick log; passes `set_type` |
| `src/app/coach/gym-console/gymConsoleTypes.ts` | Types include both `set_type` and `block_type` |
| `src/app/coach/gym-console/gymConsoleWorkLine.ts` | Work line text by type |
| `src/app/api/coach/pickup/next-workout/route.ts` | Pickup RPC; `block_type` references |

### Assignment / propagation chain

| Step | Mechanism |
|------|-----------|
| Template | `workout_set_entries.set_type` |
| Assignment load | Client start page loads blocks via assignment + `WorkoutSetEntryService` / RPC; **`workout_block_assignments` count = 0** (empty) |
| Log write | Client sends `set_type` (+ `set_entry_id`) to `/api/log-set` |
| Log storage | `workout_set_logs.set_entry_id` + `workout_set_logs.set_type` (not FK-derived from template on insert) |
| Progression | `program_progression_rules.set_type`; client overrides use **`client_program_progression_rules.block_type`** |

### Analytics / volume / PR / adherence

| File | Role |
|------|------|
| `src/lib/volumeAnalytics.ts` | Volume by `set_type`; parses `giant_set_exercises` JSON |
| `src/lib/recomputeUserExerciseMetrics.ts` | Metrics; giant set JSON expansion |
| `src/lib/biggestWinService.ts` | References set types |
| `src/lib/athleteScoreService.ts` | Score calc; set_type |
| `src/lib/coachWorkoutAdherence.ts` | Adherence by block/set type |
| `src/lib/workoutLog/adherenceFromBlocks.ts` | Adherence from `setEntries[].set_type` |
| `src/lib/workoutLog/groupSetsIntoBlocks.ts` | Groups log rows by `set_type` |
| `src/lib/workoutLog/prescribedWorkoutReference.ts` | Prescription reference per type |
| `src/lib/weekReviewService.ts` | Week review; `block_type` field reads |
| `src/lib/coachClientSummaryServer.ts` | Coach summary selects type-specific log columns |
| `src/lib/coachGuidelinesService.ts` | Guidelines filter by set type |
| `src/lib/weightDefaultService.ts` | Weight defaults by type |
| `src/lib/clientProgressionService.ts` | Client progression; `block_type` |
| `src/lib/programProgressionService.ts` | Program progression rules by `set_type` / `block_type` |
| `src/lib/progressionGenerator.ts` | Generates rules; type list includes `timed_set` |
| `src/components/coach/ProgramProgressionRulesEditor.tsx` | Progression UI |
| `src/components/coach/client-views/ClientProgressionEditor.tsx` | Client progression; `block_type` |
| `src/hooks/useProgramProgressionGrid.ts` | Grid rows labeled by `block.set_type` |
| `src/components/coach/ProgressionPreview.tsx` | Preview by type |
| `src/components/client-workout-complete/buildExerciseSummary.ts` | Complete screen summary by type |
| `src/components/client-workout-complete/setLinesFromLogs.ts` | Log line formatting |
| `src/app/client/workouts/[id]/complete/page.tsx` | Complete page switch on type |

### Tests

| File | Role |
|------|------|
| `tests/coach/workout-creation.test.ts` | Creation tests; `block_type` |
| `tests/coach/program-creation.test.ts` | Program creation |
| `tests/coach/data-integrity.test.ts` | Integrity |
| `tests/coach/integration.test.ts` | Integration |
| `tests/golden-logging-flow.test.ts` | Golden logging |
| `src/lib/workoutLog/__tests__/*.test.ts` | Adherence/grouping/prescription tests |
| `src/utils/__tests__/buildExerciseFromNewExercise.test.ts` | Form build tests |
| `src/app/client/workouts/[id]/start/__tests__/types.test.ts` | Start page types |

### File counts by zone

| Zone | Files (approx.) |
|------|----------------:|
| Builder / template authoring | 17 |
| Conversion / static display | 12 |
| Client execution / set rows | 22 |
| API / logging writes | 5 |
| Gym console | 5 |
| Progression / assignment | 8 |
| Analytics / adherence / complete | 18 |
| Tests | 9 |
| Types / utils / misc | 12 |
| **Total (unique)** | **88** |

---

## Area 6 — Measurement dimension today

### Rep-based

- **Types:** `straight_set`, `superset`, `giant_set`, `pre_exhaustion`, `drop_set`, `cluster_set`, `rest_pause` (+ amrap/emom/for_time when logged with rep counts)
- **Prescription columns:** WSEE `reps`, `sets`, `weight_kg`, `load_percentage`; parent `total_sets`, `reps_per_set`
- **Log columns:** `weight`, `reps`, plus type-specific (`superset_weight_a/b`, `dropset_*`, `rest_pause_*`, `preexhaust_*`, `giant_set_exercises` JSON)

### Time-based

- **Types:** `amrap`, `emom`, `for_time`, `tabata`, `timed_set`
- **Prescription:** `workout_time_protocols` (see Area 3); parent `duration_seconds` for amrap/emom; `timed_set` uses parent `duration_seconds` as work interval
- **`protocol_type` live values:** `tabata`, `emom`, `amrap`, `for_time` only
- **Log columns:** `amrap_duration_seconds`, `amrap_total_reps`, `emom_minute_number`, `emom_total_duration_sec`, `tabata_rounds_completed`, `tabata_total_duration_sec`, `fortime_time_taken_sec`, `fortime_time_cap_sec`, `fortime_total_reps`, `actual_duration_seconds` (timed_set)

### Distance

- **Prescription:** `workout_speed_sets.distance_meters`; `workout_endurance_sets.target_distance_meters`
- **Log columns:** `actual_distance_meters`; legacy-named **`hr_distance_meters`** (populated for `speed_work` and `endurance` logs — 5+ rows; name is misleading vs dropped `hr_sets` type)
- **No standalone `distance` set_type** — distance is subsumed under `speed_work` / `endurance`

### HR

- **Prescription:** `workout_endurance_sets.hr_zone`, `target_hr_pct`; `workout_speed_sets.target_hr_pct`; unused parent columns `hr_zone_target`, `hr_percentage_min/max` on `workout_set_entries` (all null in prod)
- **Log columns:** `actual_hr_avg`, `hr_average_percentage`, `hr_zone`, `hr_percentage`, `hr_work_duration_seconds`, `hr_rest_duration_seconds`, `hr_interval_round` (legacy from removed `hr_sets` type — no prod logs using dedicated hr_sets type)
- **`workout_hr_sets` table:** dropped from live DB

### Live `workout_set_logs` column list

From `SELECT * FROM workout_set_logs LIMIT 1` (2026-06-10):

`id`, `workout_log_id`, `client_id`, `set_entry_id`, `exercise_id`, `set_type`, `set_number`, `weight`, `reps`, `rpe`, `completed_at`, `created_at`, `round_number`, `cluster_number`, `superset_exercise_a_id`, `superset_exercise_b_id`, `superset_weight_a`, `superset_weight_b`, `superset_reps_a`, `superset_reps_b`, `giant_set_exercises`, `dropset_initial_weight`, `dropset_initial_reps`, `dropset_final_weight`, `dropset_final_reps`, `dropset_percentage`, `rest_pause_initial_weight`, `rest_pause_initial_reps`, `rest_pause_reps_after`, `rest_pause_number`, `rest_pause_duration`, `max_rest_pauses`, `preexhaust_isolation_exercise_id`, `preexhaust_isolation_weight`, `preexhaust_isolation_reps`, `preexhaust_compound_exercise_id`, `preexhaust_compound_weight`, `preexhaust_compound_reps`, `amrap_duration_seconds`, `amrap_total_reps`, `amrap_target_reps`, `emom_minute_number`, `emom_total_reps_this_min`, `emom_total_duration_sec`, `tabata_rounds_completed`, `tabata_total_duration_sec`, `fortime_total_reps`, `fortime_time_taken_sec`, `fortime_time_cap_sec`, `fortime_target_reps`, `actual_time_seconds`, `actual_distance_meters`, `actual_hr_avg`, `actual_speed_kmh`, `actual_duration_seconds`, `hr_distance_meters`, `hr_duration_seconds`, `hr_zone`, `hr_percentage`, `hr_average_percentage`, `hr_work_duration_seconds`, `hr_rest_duration_seconds`, `hr_interval_round`, `pyramid_step_number`, `ladder_round_number`, `ladder_rung_number`

**Can logs record only weight×reps?** No — the table supports time, distance, HR, and type-specific JSON, but many types still primarily use weight/reps. `speed_work` / `endurance` / `timed_set` require `actual_time_seconds` and/or `actual_distance_meters` / `actual_duration_seconds` per `/api/log-set` validation.

---

## Area 7 — Dead weight inventory

### Types with zero template rows (live)

`timed_set`, `hr_sets`, `circuit`, `pyramid_set`, `ladder`

### Types with zero logged sets (live)

`tabata`, `timed_set`, `hr_sets` (and canonical forms `drop_set`, `for_time`, `pre_exhaustion` — only legacy aliases appear)

### Satellite tables with zero rows / missing

| Artifact | Status |
|----------|--------|
| `workout_pyramid_sets` | Table **dropped** |
| `workout_ladder_sets` | Table **dropped** |
| `workout_hr_sets` | Table **dropped** |
| `workout_drop_sets` | 7 rows — **used** |
| `workout_cluster_sets` | 3 rows — **used** |
| `workout_rest_pause_sets` | 1 row — **used** |
| `workout_time_protocols` | 11 rows — **used** |
| `workout_speed_sets` | 1 row — **used** |
| `workout_endurance_sets` | 2 rows — **used** |

### `circuit` deprecation

- Removed from creation UI and TypeScript `SetType`
- Migration `20260401_remove_pyramid_ladder_circuit_everywhere.sql` deletes `set_type IN ('circuit', ...)`
- Docs: `docs/NOTE_circuit_removal.md`, `docs/END_TO_END_TESTING_AUDIT_MARCH_2026.md` note legacy `circuit_sets` references on start page
- **Live DB:** 0 circuit rows

### `workout_pyramid_sets` / `workout_ladder_sets`

- **No read/write code paths** in `src/` (tables dropped)
- Log columns `pyramid_step_number`, `ladder_round_number`, `ladder_rung_number` remain on `workout_set_logs`
- `program_progression_rules` still has `pyramid_order`, `ladder_order` columns (legacy)

### `WorkoutBlockBuilder`

- **File exists:** `src/components/coach/WorkoutBlockBuilder.tsx` (~476 lines)
- **Imported** in `WorkoutTemplateForm.tsx` line 55
- **Never rendered** in JSX (no `<WorkoutBlockBuilder` usage) — **dead import / legacy component**
- Active builder path: `ExerciseBlockCard` + `AddExercisePanel` / `ExerciseDetailForm`

### Other legacy / contradictory artifacts

| Artifact | Notes |
|----------|-------|
| `workout_blocks` / `workout_block_exercises` | Tables **do not exist** on live DB |
| `workout_block_assignments` | Exists but **0 rows** |
| `client_workout_blocks` | **0 rows**; still uses `block_type` column name |
| `hr_sets` in migration CHECK + RPC | Type removed from UI; table dropped; CHECK file out of sync with `speed_work`/`endurance` in prod |
| `SetRowFieldsByType.tsx` | No per-type branching — only shared weight/reps widgets |
| Stale schema CSV | Lists old table/column names throughout |

---

## Risks & Conflicts

1. **Table/column rename not reflected in audit queries or CSV** — Live authority is `workout_set_entries.set_type`, not `workout_blocks.block_type`. Any external tooling using the CSV will mis-query.

2. **Triple naming in application layer** — `exercise_type` (builder form) vs `set_type` (DB/RPC) vs `block_type` (legacy aliases in API, gym console, client progression). Increases blast radius for any model change.

3. **Log `set_type` strings are not normalized in DB** — Production stores `dropset`, `fortime`, `preexhaust` alongside canonical forms. Analytics must normalize or branch on both.

4. **Migration CHECK constraint vs live data** — `20260401_remove_pyramid_ladder_circuit_everywhere.sql` CHECK includes `hr_sets` but omits `speed_work`, `endurance`, `timed_set` while live templates contain `speed_work` and `endurance`. Either live constraint differs from repo migration or constraint is not enforced as written.

5. **`hr_sets` schism** — In migration CHECK and RPC `hr_sets` JSON key; table dropped; zero UI/code support; log columns prefixed `hr_*` reused for speed/endurance distance/time.

6. **Zod schema missing `timed_set`** — UI and executors support it; validators do not. Zero prod templates today, but validation gap exists.

7. **Progression schema split** — `program_progression_rules.set_type` vs `client_program_progression_rules.block_type` vs stale `block_type` in CSV for both.

8. **Superset data integrity** — 2 of 19 live supersets have only **1** `workout_set_entry_exercises` row (orphan/incomplete supersets).

9. **Tabata: templates exist, logs do not** — 2 tabata set entries in templates, 0 `workout_set_logs` with `set_type = 'tabata'` (logging may use different type string or tabata not yet performed in prod).

10. **`timed_set` fully coded, never persisted** — Executor, save path, and log API exist; 0 template rows and 0 logs.

11. **`WorkoutBlockBuilder` dead import** — Suggests incomplete removal of first-generation builder; risk of accidental re-wiring.

12. **Grouping already partially exists but is type-locked** — Multi-exercise rows and shared `total_sets`/`rest_seconds` implement superset/giant_set semantics; no generic grouping without choosing a rigid `set_type` first.

13. **Legacy log columns for removed types** — Pyramid/ladder/hr column families remain on `workout_set_logs` with no active writers in `src/`.

14. **`get_workout_blocks` RPC** — Service-role test returned `Not authenticated`; RPC still referenced in migrations with `hr_sets` aggregation though table is gone (runtime behavior not verified in this audit).

---

*End of report. No redesign proposals or implementation recommendations included per audit charter.*

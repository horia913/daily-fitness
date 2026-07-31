# Phase 0 Purge — Report

**Date:** 2026-06-10  
**Scope:** Dead-weight removal only (pre–group-model redesign). No git operations performed.

---

## Step 1 — Verification table

| Target | Verdict | Evidence | Action |
|--------|---------|----------|--------|
| **1.1 WorkoutBlockBuilder** | Dead | Imported only in `WorkoutTemplateForm.tsx:55`; no `<WorkoutBlockBuilder` JSX anywhere; no other imports | **Deleted** file + removed import |
| **1.2 `workout_set_logs.pyramid_step_number`** | Dead | 0 src refs; `COUNT(non-null)=0` | **In PHASE0_PURGE.sql §C** |
| **1.2 `workout_set_logs.ladder_round_number`** | Dead | 0 src refs; `COUNT(non-null)=0` | **In PHASE0_PURGE.sql §C** |
| **1.2 `workout_set_logs.ladder_rung_number`** | Dead | 0 src refs; `COUNT(non-null)=0` | **In PHASE0_PURGE.sql §C** |
| **1.2 `workout_set_logs.hr_zone`** | **Alive (blocked)** | 24 non-null rows; legacy `hr_sets` data mirrored for speed/endurance | **Not dropped** — flag for main migration |
| **1.2 `workout_set_logs.hr_percentage`** | **Alive (blocked)** | 24 non-null rows | **Not dropped** |
| **1.2 `workout_set_logs.hr_average_percentage`** | **Alive (blocked)** | 8 non-null rows | **Not dropped** |
| **1.2 `workout_set_logs.hr_work_duration_seconds`** | **Alive (blocked)** | 16 non-null rows | **Not dropped** |
| **1.2 `workout_set_logs.hr_rest_duration_seconds`** | **Alive (blocked)** | 16 non-null rows | **Not dropped** |
| **1.2 `workout_set_logs.hr_interval_round`** | **Alive (blocked)** | 16 non-null rows | **Not dropped** |
| **1.2 `workout_set_logs.hr_distance_meters`** | **Alive (blocked)** | 24 non-null rows; **reader** `biggestWinService.ts:371,546` | **Not dropped** — known trap |
| **1.2 `workout_set_logs.hr_duration_seconds`** | **Alive (blocked)** | 24 non-null rows (prescription mirror; `actual_time_seconds` is separate) | **Not dropped** |
| **1.2 `workout_set_entries.hr_zone_target`** | Dead | 0 src writers to column; `COUNT(non-null)=0` | **In PHASE0_PURGE.sql §C** |
| **1.2 `workout_set_entries.hr_percentage_min`** | Dead | Form state only (dead `hr_sets` UI); `COUNT(non-null)=0` | **In PHASE0_PURGE.sql §C** |
| **1.2 `workout_set_entries.hr_percentage_max`** | Dead | Same; `COUNT(non-null)=0` | **In PHASE0_PURGE.sql §C** |
| **1.2 `program_progression_rules.pyramid_order`** | Dead | 0 src refs; `COUNT(non-null)=0` | **In PHASE0_PURGE.sql §C** |
| **1.2 `program_progression_rules.ladder_order`** | Dead | 0 src refs; `COUNT(non-null)=0` | **In PHASE0_PURGE.sql §C** |
| **1.3 `workout_block_assignments`** | Dead | `COUNT(*)=0`; 0 `src/` references | **In PHASE0_PURGE.sql §D** |
| **1.3 `client_workout_blocks`** | Dead | `COUNT(*)=0`; 0 `src/` references | **In PHASE0_PURGE.sql §D** |
| **1.4 `get_workout_blocks` RPC** | **Actively used** | Callers: `start/page.tsx`, `programProgressionService.ts`, `pickup/next-workout/route.ts`; live body still aggregates `workout_hr_sets` (table dropped → RPC risk) | **CREATE OR REPLACE** in §E (remove `hr_sets` JSON) |
| **1.4 `delete_workout_set_entry_children` RPC** | Used (indirect) | Referenced in `saveWorkoutTemplate.ts` comment; still deletes `workout_hr_sets` | **CREATE OR REPLACE** in §E |
| **1.4 Other dropped-table RPCs** | N/A | `workout_pyramid_sets` / `workout_ladder_sets` already removed from latest migration body | No extra RPCs found in `src/` |
| **1.5 Legacy `'dropset'` writers** | Writer | `DropSetExecutor.tsx` sent `set_type: "dropset"` | **Changed to `drop_set`** |
| **1.5 Legacy `'fortime'` writers** | Writer | `ForTimeExecutor.tsx` | **Changed to `for_time`** |
| **1.5 Legacy `'preexhaust'` writers** | Writer | `PreExhaustionExecutor.tsx` | **Changed to `pre_exhaustion`** |
| **1.5 Legacy readers (reader-only)** | Reader | `recomputeUserExerciseMetrics.ts` cases; `start/page.tsx` restore branch; `sets/[id]/route.ts` whitelist/switch; `setEditPayload.ts` mapping | **Updated to canonical** (+ `normalizeSetType` where needed) |
| **1.5 `log-set` alias list** | Alias acceptance | `validBlockTypes` still accepts legacy | **Kept**; storage uses `normalizeSetType` |
| **1.5 `groupSetsIntoBlocks.ts`** | Normalizer | Maps legacy → canonical | **Left** (defensive) |
| **1.5 `complete/page.tsx`** | Dual-case | Handles both canonical + legacy in switch | **Left** (safe until §A SQL runs) |
| **1.6 Orphan supersets** | Delete candidates | See table below | **In PHASE0_PURGE.sql §B** |
| **1.7 Live CHECK constraint** | **Not queried via API** | PostgREST cannot read `pg_proc`; production has `speed_work`/`endurance` templates (2 each) while repo migration `20260401_...` CHECK lists `hr_sets` only | **§F** redefines to 14 canonical types; run 1.7 query in SQL editor before §F |

### Orphan supersets (1.6)

| set_entry_id | Template | set_name | WSEE rows | Logs | Prog rules |
|--------------|----------|----------|----------:|-----:|-----------:|
| `24673694-20ef-4547-937f-e907eec88b7d` | Luminita test 1 | Plate Overhead Tricep Extension + … | 1 | 9 | 0 |
| `1eabf7f1-0bae-49a2-8f1c-deb59b4be26b` | test FINAL | Conventional Deadlift + … | 1 | 19 | 12 |

### Dead UI removed (hr_sets / circuit / pyramid / ladder in `src/`)

| Location | Finding |
|----------|---------|
| `circuit` | **0** references in `src/**/*.{ts,tsx}` |
| `hr_sets` | **0** references in `src/`; dead UI was `{false && (` blocks |
| `pyramid` / `ladder` (types) | **0** references in `src/` |
| `AddExercisePanel.tsx` | Removed ~300-line disabled HR Sets block |
| `ExerciseDetailForm.tsx` | Removed ~240-line disabled HR Sets block |
| `WorkoutTemplateForm.tsx` | Removed dead `hr_*` / `hr_set_exercises` form state (kept `endurance_hr_*`) |

---

## Step 2 — Files deleted

| Path | One-line description |
|------|----------------------|
| `src/components/coach/WorkoutBlockBuilder.tsx` | Legacy block builder; imported but never rendered |

## Step 2 — Files edited

| Path | Change |
|------|--------|
| `src/components/WorkoutTemplateForm.tsx` | Removed `WorkoutBlockBuilder` import; removed dead `hr_sets` form fields |
| `src/components/workout-form/AddExercisePanel.tsx` | Removed disabled HR Sets configuration block |
| `src/components/features/workouts/ExerciseDetailForm.tsx` | Removed disabled HR Sets configuration block |
| `src/app/api/log-set/route.ts` | Clarified canonical `set_type` persistence via `normalizeSetType` |
| `src/components/client/workout-execution/blocks/DropSetExecutor.tsx` | Log payload `set_type` → `drop_set` |
| `src/components/client/workout-execution/blocks/ForTimeExecutor.tsx` | Log payload `set_type` → `for_time` |
| `src/components/client/workout-execution/blocks/PreExhaustionExecutor.tsx` | Log payload `set_type` → `pre_exhaustion` |
| `src/app/api/sets/[id]/route.ts` | Canonical whitelist keys + `normalizeSetType` on read |
| `src/lib/setEditPayload.ts` | Canonical whitelist keys; removed legacy API mapping |
| `src/lib/recomputeUserExerciseMetrics.ts` | `normalizeSetType` + canonical switch cases |
| `src/app/client/workouts/[id]/start/page.tsx` | Restore branch uses `pre_exhaustion` |

---

## Step 3 — `PHASE0_PURGE.sql` summary

| Section | Purpose |
|---------|---------|
| **A** | Normalize `dropset`/`fortime`/`preexhaust` → canonical on `workout_set_logs` |
| **B** | Delete 2 orphan superset entries + dependents (28 logs, 12 prog rules, 2 WSEE, 2 set entries) |
| **C** | Drop 8 verified-dead columns (pyramid/ladder logs; hr_zone_target cols on set_entries; pyramid/ladder on prog rules) |
| **D** | Drop `workout_block_assignments`, `client_workout_blocks` |
| **E** | Replace `get_workout_blocks` (remove `hr_sets` agg) + `delete_workout_set_entry_children` (remove `workout_hr_sets` delete) |
| **F** | Interim CHECK: 14 canonical `SetType` values |

### Manual run order

1. Open Supabase SQL Editor.
2. **Record live CHECK** (Step 1.7) before changing anything:
   ```sql
   SELECT conname, pg_get_constraintdef(oid)
   FROM pg_constraint
   WHERE conrelid = 'public.workout_set_entries'::regclass AND contype = 'c';
   ```
3. For **each section A→F**: `BEGIN;` → preview SELECTs → destructive statements → post-check → `ROLLBACK;` (inspect).
4. When all post-checks pass, re-run **A through F in one transaction** with `COMMIT;`.
5. Recommended order: **A → B → C → D → E → F** (F last so CHECK matches code before new writes).

---

## Flagged for main migration (not purged now)

- All `workout_set_logs.hr_*` columns (misleading names; 8–24 non-null rows each; `hr_distance_meters` read by `biggestWinService.ts`)
- Satellite tables: `workout_drop_sets`, `workout_cluster_sets`, `workout_rest_pause_sets`, `workout_time_protocols`, `workout_speed_sets`, `workout_endurance_sets`
- `set_type` column itself + Zod `timed_set` gap
- `exercise_type` / `set_type` / `block_type` naming triple
- `src/types/workoutBlocks.ts` deprecated shim
- `programProgressionService.ts` rule fields `hr_duration_seconds`, `hr_work_duration_seconds`, etc. (progression table columns, not log columns)
- Dead form field remnants: `hr_is_intervals` in `WorkoutTemplateForm` reset object (line ~1006 area) if any remain after partial cleanup
- `client_program_progression_rules.block_type` vs `program_progression_rules.set_type` schema split

---

## Step 4 — Build & test status

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **Pre-existing errors** in test files (`coachWorkoutAdherence.test.ts`, `prescribedWorkoutReference.test.ts`) — unchanged by this purge |
| `npm run build` | **Pass** (exit 0) |
| `npm test` | **Pass** — 20 suites, 223 tests |

---

*Phase 0 complete. No redesign work started.*

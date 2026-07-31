# Wave 1A — Foundation: Group Model Persistence + Legacy Adapter

## Step 1 — Call graph

### Template SAVE

```
WorkoutTemplateForm (unchanged UI)
  → saveWorkoutTemplate (src/services/saveWorkoutTemplate.ts)
      → formExerciseToGroupModel (src/lib/groupModel/formToGroupModel.ts)
      → WorkoutSetEntryService.createWorkoutBlock / updateWorkoutBlock
      → WorkoutSetEntryService.deleteAllChildTablesSequential (edit: clears all 7 child tables incl. stale satellites)
      → WorkoutSetEntryService.persistGroupModelSlots (writes workout_set_entry_exercises only)
```

**Save boundary:** `saveWorkoutTemplate` `processExerciseAtIndex` — form objects are translated once via `formExerciseToGroupModel`; legacy `set_type`, `reps_per_set`, and group columns are written on `workout_set_entries`; slots carry `measurement`, `technique`, and config columns. Satellite INSERT paths (`createDropSet`, `createTimeProtocol`, etc.) are no longer called from save.

### Template LOAD (editor)

```
WorkoutSetEntryService.getWorkoutBlocks / getWorkoutBlocksForTemplates
  → buildBlocksForTemplates (src/lib/workoutSetEntryService.ts)
      → adaptBlockRowToLegacy (src/lib/groupModel/adaptBlockRow.ts)
          → toLegacyBlockShape
  → blockConversion.convertBlocksToExercises (unchanged)
  → WorkoutTemplateForm consumers
```

**Load boundary (editor):** `buildBlocksForTemplates` — satellite table queries removed; only `workout_set_entries` + `workout_set_entry_exercises` (*); legacy shape synthesized per block.

### Execution LOAD

```
get_workout_blocks RPC (unchanged SQL)
  → mapWorkoutBlocksRpcToSetEntries (src/lib/workoutBlocksRpcMapper.ts)
      → adaptRpcBlockToLegacy
          → toLegacyBlockShape
  → blockConversion / executors (unchanged this wave)
```

**Load boundary (execution):** `mapWorkoutBlocksRpcToSetEntries` — RPC satellite arrays (`drop_sets`, `time_protocols`, etc.) ignored; `exercises` jsonb rows (wsee) + parent wse columns drive output.

### `onConflict` finding

Searched `src/` for `.upsert` with `onConflict` involving `set_entry_id` + `exercise_id`: **none found**. Template save uses DELETE-all-children + INSERT slots. The DB unique index on `(set_entry_id, exercise_id)` is respected via defensive dedupe in `formExerciseToGroupModel` and `persistGroupModelSlots`; no upsert workaround was added.

---

## Step 2–5 — Adapter module

| File | Role |
|------|------|
| `src/lib/groupModel/types.ts` | Group-model types |
| `src/lib/groupModel/deriveSetType.ts` | Pure legacy `set_type` derivation |
| `src/lib/groupModel/toLegacyBlockShape.ts` | Inverse of flip backfill → `WorkoutSetEntry` + satellite arrays |
| `src/lib/groupModel/formToGroupModel.ts` | Form exercise → write payload |
| `src/lib/groupModel/adaptBlockRow.ts` | Row/RPC → legacy adapter |
| `src/lib/groupModel/schemas.ts` | Zod write validation |
| `src/lib/groupModel/index.ts` | Public exports |

---

## Documented divergences

1. **`pre_exhaustion` → `superset`:** `deriveSetType` never emits `pre_exhaustion`; two-slot pre-exhaustion groups derive and persist as `superset`. Intended — the new model has no separate pre-exhaustion driver.

2. **`emom_mode` fix:** Live DB backfill stored `rep_based` / `time_based`. `toLegacyBlockShape` synthesizes `target_reps` / `time_based` as `EmomExecutor` expects. Load path fixes stale satellite values for free.

3. **Nearest-size approximation:** Mixed measurements or technique inside multi-slot groups derive to `superset` / `giant_set` / `tabata` by slot count and measurement homogeneity only — content the legacy model cannot express exactly.

---

## Files changed

- `src/lib/groupModel/*` (new module)
- `src/lib/workoutSetEntryService.ts` — adapter load in `buildBlocksForTemplates`; `persistGroupModelSlots`; group columns on create
- `src/lib/workoutBlocksRpcMapper.ts` — thin adapter wrapper
- `src/services/saveWorkoutTemplate.ts` — group-model save boundary; satellite INSERTs removed
- `tests/groupModel/groupModel.test.ts` — 18 unit/round-trip tests

**Not touched (per spec):** builder UI, executors, gym console, analytics, `/api/log-set`, migrations/SQL.

---

## Step 6 — Test results

| Command | Result |
|---------|--------|
| `npm test -- --testPathPattern=groupModel` | 18/18 pass |
| `npm test` (full suite) | **245/245 pass** |
| `npm run build` | Pass |

Round-trip coverage: straight, superset, giant, pre_exhaustion→superset, drop, cluster, rest-pause, amrap, emom-reps, emom-time, for_time, tabata, timed, speed, endurance; plus live-row RPC fixtures (drop_set stale satellites, emom `rep_based` fix).

---

## Step 7 — Manual QA (3 items)

1. **Coach — create superset:** Open an existing template in the unchanged builder, add a superset (two exercises, sets/reps), save. Re-open the template and confirm both exercises (A/B) load with correct reps.

2. **Coach — create drop set:** Add a drop set with weight, reps, and drop %. Save and re-open; confirm drop fields round-trip in the editor.

3. **Client — log one set each:** As the test client, start a workout containing those blocks on `/client/workouts/[id]/start`. Log one completed set on the superset block and one on the drop set block; confirm no errors and sets appear in session state.

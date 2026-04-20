# Training Block Subsystem Audit (Diagnose-Only)

**Executive summary:** **Yes (Y).** Live data shows duplicate training blocks and duration totals exceeding `workout_programs.duration_weeks` (TB_Q12, TB_Q11–TB_Q16), plus 143 `program_schedule` rows with `training_block_id` null on a multi-block program (TB_Q20). Code review shows additional risks not limited to the three known bugs: **main program save does not reconcile block durations**, **`removeProgramSchedule` is not block-scoped**, and the **3-argument `copy_week_schedule` RPC wipes all weeks for the program** regardless of block boundaries. Evidence below.

---

## 1 — Schema reality (live DB; Horica TB_Q1–TB_Q9, TB_Q21–TB_Q22)

### 1.1 Column inventory — `public.training_blocks`

| column | type | nullable | default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| program_id | uuid | NO | null |
| name | text | NO | null |
| goal | text | NO | 'custom'::text |
| custom_goal_label | text | YES | null |
| duration_weeks | integer | NO | 4 |
| block_order | integer | NO | 1 |
| progression_profile | text | YES | 'none'::text |
| notes | text | YES | null |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

*(Source: TB_Q1 result set.)*

### 1.2 Foreign keys — in/out and ON DELETE

**References `training_blocks.id` (TB_Q2):**

| referencing_table | column | on_delete |
|-------------------|--------|-----------|
| program_progression_rules | training_block_id | CASCADE |
| program_schedule | training_block_id | CASCADE |

**`training_blocks` references (TB_Q3):**

| referencing_column | referenced_table | column | on_delete |
|--------------------|------------------|--------|-----------|
| program_id | workout_programs | id | CASCADE |

### 1.3 Unique, CHECK, triggers — `training_blocks`

- **UNIQUE / PK (TB_Q4):** `training_blocks_pkey` PRIMARY KEY on `(id)` only.
- **CHECK (TB_Q5):** Generated `NOT NULL` checks on id, program_id, name, goal, duration_weeks, block_order only (no business rule like “sum of durations = program”).
- **Triggers (TB_Q6):** Success, **no rows** — no user triggers on `training_blocks`.

### 1.4 RLS — `training_blocks`

- **Enabled (TB_Q7):** `relrowsecurity = true`, not forced.
- **Policies (TB_Q8):** Coaches SELECT/INSERT/UPDATE/DELETE where `program_id` is a program owned by `auth.uid()`; clients SELECT where `program_id` is in their `program_assignments`.

### 1.5 `program_schedule.training_block_id` — added when, nullable, default

- **Live (TB_Q9):** `training_block_id` type `uuid`, **nullable YES**, **default null**.
- **Migration name from SQL (TB_Q10 / TB_Q10b):** `supabase_migrations.schema_migrations` is **not visible** to the SQL editor role; TB_Q10 only listed `auth.schema_migrations` and `realtime.schema_migrations`. **Column addition timestamp cannot be asserted from live SQL** on this project; TB_Q10b failed with missing relation as expected.

---

## 2 — Block lifecycle code paths

### 2.1 Create paths (insert into `training_blocks`)

| Location | Trigger | Evidence |
|----------|---------|----------|
| `TrainingBlockService.createTrainingBlock` | Any caller passing payload | ```53:84:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\lib\trainingBlockService.ts``` |
| `TrainingBlockService.getOrCreateImplicitBlock` | Edit program **load** when `getTrainingBlocks` returns **empty** | ```567:577:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\app\coach\programs\[id]\edit\page.tsx``` + ```185:214:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\lib\trainingBlockService.ts``` |
| `EnhancedProgramManager` | **New program** saved: after `createProgram`, auto `createTrainingBlock` “Phase 1” | ```1203:1216:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\components\coach\EnhancedProgramManager.tsx``` |
| `TrainingBlockModal` | Coach saves **new** block from modal | ```119:128:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\components\coach\programs\TrainingBlockModal.tsx``` |

**`getOrCreateImplicitBlock` behavior (conditions, duration, existing check):**

- **Condition:** `existing` from `select * … eq('program_id').order('block_order').limit(1).maybeSingle()` is falsy — i.e. **no row returned** (not merely “no blocks”; if RLS hides rows, this can mis-read as empty).
- **Duration:** `durationWeeks` argument from caller; edit page passes `programData.duration_weeks ?? 4`.
- **Existing check:** Only **first** block by `block_order`; if any block exists, **no** insert. It does **not** scan for duplicates.

### 2.2 Read paths

| Pattern | Scope |
|---------|--------|
| `TrainingBlockService.getTrainingBlocks(programId)` | `.eq('program_id', programId)` — **per program** | ```15:21:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\lib\trainingBlockService.ts``` |
| `TrainingBlockService.getTrainingBlock(blockId)` | **by id** | ```34:40:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\lib\trainingBlockService.ts``` |
| `WorkoutTemplateService.getProgramSchedule(programId)` | `.eq('program_id', programId)` — **no block filter** | ```1191:1198:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\lib\workoutTemplateService.ts``` |

Call sites include coach edit page, coach program detail, client program details, `ActiveProgramCard`, progression editor (grep-derived list in §6).

### 2.3 Update paths

- **`TrainingBlockService.updateTrainingBlock`:** arbitrary partial updates including `duration_weeks` | ```91:108:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\lib\trainingBlockService.ts``` |
- **Coach edit `handleUpdateBlock`:** after block update, if `duration_weeks` changed, recomputes **sum of block durations in current React state** and calls `updateProgram` with that sum | ```665:677:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\app\coach\programs\[id]\edit\page.tsx``` |
- **`refreshBlocks`:** reloads blocks from DB, sets `workout_programs.duration_weeks` to **sum of loaded block durations** | ```652:661:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\app\coach\programs\[id]\edit\page.tsx``` |
- **`onSave` (main Save / navigate away):** updates `duration_weeks` from **form only** — **no** training block reconciliation in that path | ```635:643:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\app\coach\programs\[id]\edit\page.tsx``` |

**Cascade to `program_schedule.week_number`:** No automatic DB or service cascade from block duration edits to reschedule weeks; not observed in code.

### 2.4 Delete paths

- **UI:** `TrainingBlockHeader` / `TrainingBlockModal` / `handleDeleteBlockFromHeader` on edit page | ```700:716:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\app\coach\programs\[id]\edit\page.tsx``` |
- **`deleteTrainingBlock`:** deletes progression rules for schedule rows tied to block, then deletes block | ```117:148:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\lib\trainingBlockService.ts``` |
- **`program_schedule`:** FK **ON DELETE CASCADE** from `training_block_id` (TB_Q2) — DB removes schedule rows for that block; code pre-cleans progression rules first.

---

## 3 — Invariants expected vs enforced

### 3.1 Sum of `block.duration_weeks` = `workout_programs.duration_weeks`

- **DB:** No CHECK/trigger enforcing equality (TB_Q5, TB_Q6).
- **App:** `refreshBlocks` / `handleUpdateBlock` push program duration toward sum of blocks; **`onSave` does not** (§2.3). **Drift is possible** — TB_Q12 proves live drift for at least two programs.

### 3.2 Every `program_schedule.week_number` falls within some block’s stacked week range

- **DB:** No constraint tying `week_number` to blocks.
- **TB_Q17:** **No rows** — with ranges computed by ordered cumulative `duration_weeks`, no orphan weeks detected globally (does not prove semantic correctness of which block “owns” a week if IDs are wrong).

### 3.3 `program_schedule.training_block_id` same program as block

- **DB:** FK to `training_blocks(id)` only; no CHECK `(ps.program_id = tb.program_id)`.
- **TB_Q18:** **No rows** — no cross-program pointer mismatches in current data.

### 3.4 At most one block covering a given week

- **DB:** Not enforced. TB_Q19 **no rows** under **sequential stacking** model (ordered blocks consume contiguous week ranges — TB_Q16). That model **does not** detect two blocks both with `block_order = 1`; they stack into disjoint ranges (TB_Q16 Hybrid: weeks 1–24 and 25–48), so **duplicate metadata** can exist without TB_Q19 overlap.

### 3.5 `training_block_id IS NULL` validity

- **DB:** Nullable (TB_Q9).
- **TB_Q20:** Program `96ff2e6d-3eb0-0054-bf4e-9de2edd466ca` has **143** schedule rows with null `training_block_id` (weeks 1–24).
- **Code:** Edit page treats null as matching active block **only if** `trainingBlockCount <= 1` | ```109:118:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\app\coach\programs\[id]\edit\page.tsx``` — **multi-block + null rows is ambiguous / risky.**

---

## 4 — Phantom block scenario (live data + code)

### 4.1 TB_Q11 / TB_Q12 (excerpt)

- **Programs with `block_count > 1` (TB_Q12):** Hybrid Athletic Development v2 — sum 48 vs program 24 (+24); Test Program – Seed Fixture — sum 8 vs program 4 (+4); TS 4-Week Program — sum 12 vs program 12 (0).

### 4.2 Program `631550b9-2477-42dd-b454-4548a1875556` (“test 32”)

- **TB_Q13 / TB_Q14:** **One** block, `duration_weeks = 4`, sum = program = 4. **No phantom in DB for this id.**

### 4.3 Recently-created phantom-style program (from data)

- **Strongest “duplicate implicit Phase 1” signal:** `bcdbfdba-d959-4bfd-a29a-d9d49c9122b5` (“Test Program – Seed Fixture”) — two rows in TB_Q11 with **same name**, `block_order` 1, `created_at` **~30ms apart** (see TB_Q11 snippet in Horica output).

### 4.4 Sequence consistent with code + data (second block coach did not intend)

Plausible mechanisms **supported by evidence**:

1. **Double insert / race:** Two `insert into training_blocks` close in time (Seed Fixture TB_Q11). Competing paths include `EnhancedProgramManager` post-`createProgram` block | ```1203:1216:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\components\coach\EnhancedProgramManager.tsx``` and edit-page `getOrCreateImplicitBlock` when `getTrainingBlocks` returns empty | ```567:577:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\app\coach\programs\[id]\edit\page.tsx``` — e.g. replication/RLS timing could theoretically yield a transient “no blocks” read (hypothesis; TB_Q20 null-heavy Hybrid suggests legacy/RPC paths also muddy block attribution).

2. **UI interpretation:** Two blocks with four weeks each yield TB_Q16-style ranges **1–4** and **5–8** while program `duration_weeks` stays **4** (Seed Fixture: TB_Q12 `duration_delta = +4`) — **matches “two 4-week blocks” symptom** even when program row was never extended.

---

## 5 — Inconsistencies and asymmetries

### 5.1 `setProgramSchedule` vs unique constraint

- **DB (TB_Q21):** `UNIQUE (program_id, day_of_week, week_number)` — **does not** include `training_block_id`.
- **Code:** When `trainingBlockId` is passed, select is scoped with `.eq('training_block_id', trainingBlockId)`; insert may still hit unique violation if another row exists for same triple with different/null `training_block_id` | ```1828:1883:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\lib\workoutTemplateService.ts``` |
- **Verdict:** **Latent bug / intentional partial mitigation** — app comment acknowledges “upsert-style” logic; DB constraint is stricter than block-scoped intent.

### 5.2 Overlapping week claims from UI

- With unique triple, **second block cannot persist a separate row** for same `(program_id, day_of_week, week_number)`; save either **updates the existing row** (if select finds it without block filter — when `trainingBlockId` omitted) or **errors on insert**. With `trainingBlockId` on select only, **collision** depends on existing row’s `training_block_id`.

### 5.3 `copy_week_schedule` and blocks

- **Deployed RPC (repo `20260333_copy_week_schedule_rpc.sql`):** 3-arg overload **deletes all `program_schedule` rows** for `week_number BETWEEN 1 AND p_total_weeks` except source week, then inserts copies carrying **`ps.training_block_id` unchanged** | ```41:80:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\migrations\20260333_copy_week_schedule_rpc.sql``` |
- **Edit page calls** `copy_week_schedule` with **3 args only** (no `p_training_block_id`) | ```772:776:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\app\coach\programs\[id]\edit\page.tsx``` |
- **Verdict:** **Not block-aware** in the sense of limiting to one block’s week window; it is **program-wide** for weeks `1..p_total_weeks`.

### 5.4 Shrinking `workout_programs.duration_weeks`

- **`onSave`** can set program duration **without** shrinking blocks (§2.3).
- **No** DB trigger on program shrink to adjust `training_blocks` (TB_Q6 empty).

---

## 6 — Block-related files (`src/`)

### 6.1 Files referencing `TrainingBlockService`, `training_blocks`, `training_block_id`, or block UI

- `src/lib/trainingBlockService.ts`
- `src/lib/workoutTemplateService.ts`
- `src/lib/programProgressionService.ts`
- `src/app/coach/programs/[id]/edit/page.tsx`
- `src/app/coach/programs/[id]/page.tsx`
- `src/app/client/programs/[id]/details/page.tsx`
- `src/components/client/train/ActiveProgramCard.tsx`
- `src/components/coach/EnhancedProgramManager.tsx`
- `src/components/coach/ProgramProgressionRulesEditor.tsx`
- `src/components/coach/programs/TrainingBlockModal.tsx`
- `src/components/coach/programs/TrainingBlockHeader.tsx`
- `src/types/trainingBlock.ts`

### 6.2 Short pass — suspicious or high-risk

- **`removeProgramSchedule`:** deletes by `(program_id, day_of_week, week_number)` **only** — **not** scoped by `training_block_id` | ```1964:1970:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\lib\workoutTemplateService.ts``` |
- **`EnhancedProgramManager`:** schedule persistence comments omit `training_block_id` in “columns that exist” comment area — verify inserts in same file for null block stamping (risk of null `training_block_id` rows) | ```1219:1251:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\components\coach\EnhancedProgramManager.tsx``` |
- **`ProgramProgressionService` / editor:** explicit `.or(training_block_id.eq...,is.null)` — nulls treated as first-class; interacts badly with multi-block if nulls abound (TB_Q20).

---

## Newly discovered issues (beyond the three known)

| Issue | Severity | Evidence |
|-------|----------|----------|
| `program_schedule` unique key excludes `training_block_id` vs block-scoped upsert | **Launch-risk** | TB_Q21 + ```1828:1883:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\lib\workoutTemplateService.ts``` |
| `removeProgramSchedule` not block-scoped — can remove wrong block’s slot | **Launch-risk** | ```1964:1970:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\lib\workoutTemplateService.ts``` |
| Main `onSave` updates program `duration_weeks` without reconciling blocks | **Launch-risk** | ```635:643:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\app\coach\programs\[id]\edit\page.tsx``` + TB_Q12 drift |
| `copy_week_schedule` (3-arg) deletes/rebuilds **all** program weeks 1..N | **Launch-risk** | ```50:80:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\migrations\20260333_copy_week_schedule_rpc.sql``` + edit page RPC call |
| Duplicate `training_blocks` rows / sum duration > program (Hybrid, Seed Fixture) | **Launch-risk** (data integrity) | TB_Q11, TB_Q12, TB_Q16 |
| Many `training_block_id` nulls on multi-block program | **Post-launch** (unless client-facing week UX hits it) | TB_Q20 + ```109:118:c:\Users\HP\Desktop\DailyFitness\dailyfitness-app\src\app\coach\programs\[id]\edit\page.tsx``` |

---

## Integrity queries (post-fix verification)

Re-run TB_Q12, TB_Q16, TB_Q17, TB_Q18, TB_Q19, TB_Q20, TB_Q21; add:

```sql
-- TB_POST: programs where sum(block durations) <> program.duration_weeks
SELECT wp.id, wp.name, wp.duration_weeks AS program_weeks,
       COALESCE(SUM(tb.duration_weeks),0) AS sum_block_weeks
FROM workout_programs wp
LEFT JOIN training_blocks tb ON tb.program_id = wp.id
GROUP BY wp.id, wp.name, wp.duration_weeks
HAVING COALESCE(SUM(tb.duration_weeks),0) <> wp.duration_weeks;

-- TB_POST2: duplicate (program_id, block_order) pairs
SELECT program_id, block_order, COUNT(*) AS cnt
FROM training_blocks
GROUP BY program_id, block_order
HAVING COUNT(*) > 1;
```

---

*End of report. Prose kept concise; evidence is in tables, TB_* labels, and code citations.*

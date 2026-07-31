# Program Layer Verification (Live Supabase)

**Queried at:** 2026-06-11T18:04:31Z  
**Data source:** live Supabase REST + PostgREST OpenAPI (`Accept: application/openapi+json`)  
**Constraints:** read-only SELECT / introspection only; no code or schema changes.

---

## 1. Full live column lists + row counts

### Table name resolution

| Suspected name | Live table | Notes |
| --- | --- | --- |
| `programs` | **Does not exist** | Master program entity is `workout_programs` |
| `program_schedule` | `program_schedule` | ✓ |
| `program_assignments` | `program_assignments` | ✓ |
| `workout_assignments` | `workout_assignments` | ✓ |
| `client_program_progression_rules` | `client_program_progression_rules` | ✓ |
| `training_blocks` | `training_blocks` | ✓ |
| `workout_logs` | `workout_logs` | ✓ |

**Additional program-layer siblings discovered via OpenAPI** (17 tables):

`client_program_progression_rules`, `program_assignment_progress`, `program_assignments`, `program_day_assignments`, `program_day_completions`, `program_day_completions_v1`, `program_days`, `program_progress`, `program_progress_v1`, `program_progression_rules`, `program_schedule`, `program_week_time_override`, `program_workout_completions`, `training_blocks`, `workout_assignments`, `workout_logs`, `workout_programs`

Related but outside the core list: `workout_templates`, `workout_sessions`, `coach_week_reviews` (FK to `program_assignments`).

### Row counts (live)

**Query pattern:**
```http
GET /rest/v1/{table}?select=id&limit=0
Prefer: count=exact
```

| Table | Row count |
| --- | ---: |
| `workout_programs` | 15 |
| `program_schedule` | 275 |
| `program_assignments` | 14 |
| `program_day_assignments` | 407 |
| `program_progression_rules` | 1,175 |
| `client_program_progression_rules` | 1,055 |
| `training_blocks` | 17 |
| `workout_assignments` | 102 |
| `workout_logs` | 110 |
| `program_day_completions` | 58 |
| `program_progress` | 8 |
| `program_progress_v1` | 2 |
| `program_day_completions_v1` | 6 |
| `program_days` | 0 |
| `program_assignment_progress` | 1 |
| `program_week_time_override` | 0 |
| `program_workout_completions` | 0 |
| `workout_templates` | 38 |

Note: `program_progress` has **no `id` column**; PK is `program_assignment_id`. Count used `select=program_assignment_id`.

### `workout_programs` (15 columns in live API; 11 returned by OpenAPI root definition)

| column_name | data_type | nullable | default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | |
| description | text | YES | |
| coach_id | uuid | NO | FK → profiles |
| difficulty_level | text | YES | intermediate |
| duration_weeks | integer | YES | 4 |
| target_audience | text | YES | general_fitness |
| is_active | boolean | YES | true |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| category | text | YES | |

### `program_schedule` (10 columns, 275 rows)

| column_name | data_type | nullable | default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| program_id | uuid | NO | FK → workout_programs |
| template_id | uuid | NO | **no FK in live catalog** (see §5) |
| day_of_week | integer | NO | 0–6 legacy index |
| week_number | integer | NO | ≥1 |
| day_number | integer | NO | 1–7 canonical day-in-week |
| training_block_id | uuid | YES | FK → training_blocks |
| is_optional | boolean | YES | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

**Week/day encoding:** one row per scheduled workout slot. `week_number` + `day_number` (1–7) are canonical; `day_of_week` (0–6) is legacy. Rest days are represented by **absence** of a schedule row (no `template_id = null` rest rows in Tudorel Test).

### `program_assignments` (24 columns, 14 rows)

| column_name | data_type | nullable | default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| program_id | uuid | NO | FK → workout_programs |
| client_id | uuid | NO | FK → profiles |
| coach_id | uuid | NO | |
| current_day_number | integer | YES | 1 |
| completed_days | integer | YES | |
| total_days | integer | NO | |
| start_date | date | NO | CURRENT_DATE |
| preferred_workout_days | text[] | YES | |
| status | text | YES | active |
| is_customized | boolean | YES | |
| notes | text | YES | |
| name | text | YES | |
| description | text | YES | |
| duration_weeks | integer | YES | |
| timezone_snapshot | text | YES | |
| progression_mode | text | NO | auto |
| coach_unlocked_week | integer | YES | |
| pause_status | text | NO | active |
| paused_at | timestamptz | YES | |
| pause_reason | text | YES | |
| pause_accumulated_days | integer | NO | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### `program_day_assignments` (22 columns, 407 rows)

Per-client **schedule snapshot** copied at assign time. Key columns: `program_assignment_id`, `day_number` (= `(week_number-1)*7 + program_day`), `program_day`, `day_type` (`workout`|`rest`), `workout_template_id`, `workout_assignment_id` (bridge to execution row), `is_optional`, `is_customized`, `is_completed` (legacy flag; canonical completion is `workout_logs` / ledger).

### `workout_assignments` (15 columns, 102 rows)

| column_name | data_type | nullable | default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workout_template_id | uuid | YES | |
| client_id | uuid | NO | |
| coach_id | uuid | NO | |
| name | text | NO | |
| description | text | YES | |
| estimated_duration | integer | YES | 60 |
| assigned_date | date | NO | CURRENT_DATE |
| scheduled_date | date | YES | |
| status | text | YES | assigned |
| notes | text | YES | |
| is_customized | boolean | YES | |
| **program_assignment_id** | uuid | YES | **discriminator** (see below) |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

#### `program_assignment_id` discriminator (live)

**Query:**
```http
GET /rest/v1/workout_assignments?program_assignment_id=not.is.null&select=id&limit=0  → 60
GET /rest/v1/workout_assignments?program_assignment_id=is.null&select=id&limit=0     → 42
```

| Value | Meaning | Count |
| --- | --- | ---: |
| `IS NOT NULL` | Program-execution row (created at Start / coach pickup / gym console) | 60 |
| `IS NULL` | Standalone coach-assigned extra workout | 42 |

Introduced in `migrations/20260530_workout_assignments_program_assignment_id.sql`: FK to `program_assignments(id)` **ON DELETE SET NULL** (deleting assignment demotes execution rows to standalone; does not delete them).

Sample program-execution row:
```json
{
  "id": "d09b54c5-4834-4f37-8a46-479e9b9fba66",
  "workout_template_id": "99e31121-4e9b-4e08-a755-65db88d91f1f",
  "client_id": "a92e0772-1561-409c-b238-02f5c11c2ca7",
  "program_assignment_id": "447f36a4-df0a-4733-b7b9-96bca10eb327",
  "name": "Week 1 • Day 4: Tudorel test - Day 4",
  "notes": "Program: Program - Week 1 • Day 4"
}
```

### `program_progression_rules` (48 columns, 1,175 rows)

Master program prescription copy keyed by `program_id`, `program_schedule_id`, `week_number`, `set_entry_id` (template set-entry UUID), `set_type`, `set_order`, exercise fields, protocol fields, `training_block_id`, `speed_endurance_config` jsonb. Populated when coach edits program progression in UI (`ProgramProgressionService.copyWorkoutToProgram`), not automatically for all programs.

### `client_program_progression_rules` (48 columns, 1,055 rows)

Per-assignment copy of master rules. Column naming mismatch vs master: `block_id` / `block_type` / `block_order` hold values from master `set_entry_id` / `set_type` / `set_order`. Includes `override_exercise_id` for client-specific swaps.

### `training_blocks` (11 columns, 17 rows)

| column_name | data_type | nullable | default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| program_id | uuid | NO | FK → workout_programs ON DELETE CASCADE |
| name | text | NO | |
| goal | text | NO | custom |
| custom_goal_label | text | YES | |
| duration_weeks | integer | NO | 4 |
| block_order | integer | NO | 1 |
| progression_profile | text | YES | none |
| notes | text | YES | |
| created_at / updated_at | timestamptz | YES | now() |

`program_schedule.training_block_id` → `training_blocks(id)` ON DELETE CASCADE (`migrations/20260228_phase2_training_blocks.sql`).

### `workout_logs` (23 columns, 110 rows)

Includes program linkage: `program_assignment_id`, `program_schedule_id` (both nullable; SET NULL on parent delete — `migrations/20260131_program_day_tracking.sql`).

### `workout_set_logs` (58 columns live; count = 110 parent logs’ children — not separately counted)

Key columns: `workout_log_id`, `set_entry_id`, `exercise_id`, `set_type`, `set_number`, protocol/H R/speed/endurance actuals, `rpe`, `dropset_drops` (jsonb). **`set_entry_id` has no FK** to `workout_set_entries` (plain UUID; see §5).

### `program_progress` (6 columns, 8 rows)

Cache pointer per assignment. PK = `program_assignment_id` (FK ON DELETE CASCADE). Columns: `current_week_number`, `current_day_number`, `is_completed`, timestamps.

### `program_day_completions` (6 columns, 58 rows)

Completion ledger: UNIQUE (`program_assignment_id`, `program_schedule_id`); FKs ON DELETE CASCADE to both parents (`migrations/20260209_canonical_program_tracking_tables.sql`).

---

## 2. Program structure today — worked example: **Tudorel Test**

**Query:**
```http
GET /rest/v1/workout_programs?name=ilike.*Tudorel*Test*
GET /rest/v1/program_schedule?program_id=eq.bac114ad-d345-4008-b8bd-1cbdeb2dff33&order=week_number.asc,day_number.asc
GET /rest/v1/training_blocks?program_id=eq.bac114ad-d345-4008-b8bd-1cbdeb2dff33
GET /rest/v1/program_progression_rules?program_id=eq.bac114ad-d345-4008-b8bd-1cbdeb2dff33 → count 0
```

### Program row

| Field | Value |
| --- | --- |
| id | `bac114ad-d345-4008-b8bd-1cbdeb2dff33` |
| name | Tudorel Test |
| coach_id | `b6014e58-f696-4606-bc63-d7707a21d5f1` |
| duration_weeks | 4 |
| difficulty_level | advanced |
| category | Hypertrophy |
| is_active | true |

### Training block

One implicit block seeded at program creation:

| id | name | duration_weeks | block_order | progression_profile |
| --- | --- | ---: | ---: | --- |
| `5f67fc0a-68c6-4f2d-8716-0e304c07460d` | Block 1 | 4 | 1 | none |

All 16 schedule rows have `training_block_id = null` (block exists but schedule rows were not linked).

### Schedule structure (16 rows = 4 weeks × 4 training days)

Four unique templates rotate on **days 1, 2, 4, 5** each week (days 3, 6, 7 are rest — no rows):

| week | day_number | day_of_week | template_id | template_name |
| ---: | ---: | ---: | --- | --- |
| 1 | 1 | 0 | `6e604551-92ae-4989-9671-2a06c395d1ce` | Tudorel Test - Day 1 |
| 1 | 2 | 1 | `05f1af0b-680d-4499-a06a-157a00679177` | Tudorel test - Day 2 |
| 1 | 4 | 3 | `e11f0435-014d-47a8-9efe-61b94abb8166` | Tudorel Test - Day 3 |
| 1 | 5 | 4 | `99e31121-4e9b-4e08-a755-65db88d91f1f` | Tudorel test - Day 4 |
| 2–4 | (same pattern) | | (same four template IDs repeated) | |

Example schedule row (Week 1 Day 1):
```json
{
  "id": "ec6ec597-5c54-4cc9-8181-13b896236986",
  "program_id": "bac114ad-d345-4008-b8bd-1cbdeb2dff33",
  "week_number": 1,
  "day_number": 1,
  "day_of_week": 0,
  "template_id": "6e604551-92ae-4989-9671-2a06c395d1ce",
  "training_block_id": null,
  "is_optional": false
}
```

**Progression rules for this program:** **0** rows in `program_progression_rules`. Prescription at runtime falls back to linked **workout templates** (`get_workout_blocks` RPC), not progression tables.

---

## 3. Assignment chain

### UI entry

`ProgramsDashboardContent.tsx` → `WorkoutTemplateService.assignProgramToClients(programId, clientIds, coachId, startDate, notes, progressionMode)` (`src/lib/workoutTemplateService.ts`).

There is **no dedicated REST route** for program assign; it runs client-side via Supabase anon/service client from the coach browser session.

### Per-client steps (`assignProgramToClients` → `createProgramAssignment`)

1. **`program_assignments`**
   - Sets all existing `status='active'` rows for client to `completed`.
   - If row exists for `(client_id, program_id)`: **UPDATE** reactivation (calls `clearStaleRunDataForAssignmentReuse` → `POST /api/coach/program-assignments/{id}/reset-run-data` to wipe run-scoped logs/sessions).
   - Else: **INSERT** with `start_date`, `total_days` (= count of `program_schedule` rows), `timezone_snapshot`, optional `coach_id`, `progression_mode`.

2. **`client_program_progression_rules`** (copy-on-assign — **confirmed**)
   - `deleteClientProgramProgressionRules(assignmentId)`
   - `copyProgramRulesToClient(programId, assignmentId, clientId)` — SELECT all `program_progression_rules` for `program_id`, INSERT into `client_program_progression_rules` mapping `set_*` → `block_*` columns (`src/lib/programProgressionService.ts` lines 288–366).

3. **`program_day_assignments`** (copy-on-assign — **confirmed**)
   - For each master `program_schedule` row: **UPSERT** snapshot with `program_assignment_id`, `day_number`, `program_day`, `day_type`, `workout_template_id`, names/descriptions from template metadata, `onConflict: program_assignment_id,day_number` (`workoutTemplateService.ts` lines 1941–1978).

### Rows **not** created at assign

- No `program_schedule` copy (master rows shared across all clients).
- No `workout_templates` / `workout_set_entries` copy.
- No `workout_assignments` until client/coach **starts** a workout.
- No `workout_logs` / `workout_sessions`.
- No `program_day_completions`.
- `program_progress` cache row may be created lazily on first progress read/advance RPC.

### Failure cleanup

If snapshot upsert fails, assignment row is **deleted** (orphan cleanup).

---

## 4. Runtime resolution — “today’s workout”

### Client home / start (`/client`, `/client/me`)

**Chain:** `clientDashboardPageData.ts` → RPC **`get_client_dashboard`**

Joins / reads (inside RPC — see `migrations/20260407_get_client_dashboard_program_counters.sql`):
- `program_assignments` (active)
- `workout_programs`
- `program_schedule` (master schedule for program_id; current week from `program_progress.current_week_number` or calendar resolver)
- `workout_sessions` / completions for weekly counters
- `workout_set_entries` (set counts for display)

`todaysWorkout` resolves next uncompleted slot in **current program week** by comparing `program_schedule` template slots to completed `program_schedule_id`s (via sessions/completions). Returns `templateId`, `scheduleId` (= `program_schedule.id`), week/day numbers.

Train page additionally calls **`get_train_page_data`** (same assignment + schedule + completion overlay).

### Client workout start (execution prescription)

**Chain:** `POST /api/program-workouts/start-from-progress` → `getProgramState()` (`programStateService.ts`)

**State resolver reads:**
1. `program_assignments` (active)
2. `program_day_assignments` (canonical per-client schedule snapshot)
3. `program_schedule` (only to resolve `program_schedule.id` for FK keys on logs/sessions)
4. `workout_logs` where `completed_at IS NOT NULL` + `program_assignment_id` + `program_schedule_id` (completion ledger)
5. `program_progress` (cache; optional)

**Creates on first start of a slot:** `workout_assignments` (with `program_assignment_id`), `workout_sessions`, `workout_logs` (with `program_assignment_id`, `program_schedule_id`); may link `program_day_assignments.workout_assignment_id`.

**Prescription at execute time:** `src/app/client/workouts/[id]/start/page.tsx`
- If `workout_assignments.program_assignment_id IS NOT NULL`:
  - `ProgramProgressionService.getClientProgressionBlocksForTemplate(assignmentId, currentWeek, templateId)` reads **`client_program_progression_rules`**, overlays onto template from **`get_workout_blocks`** RPC.
  - If no client rules: **fallback to raw template** blocks.
- Standalone assignments: template only via `get_workout_blocks`.

**Other progression consumers:**
- `enrichWorkoutBlocksPrescribedRir.ts` — reads `client_program_progression_rules.rir` then `program_progression_rules.rir`
- `clientProgressionService.ts` — reads `client_program_progression_rules` for week-over-week suggestions (compare logs vs rules); does **not** write prescription
- Coach program editor: `ProgramProgressionRulesEditor.tsx` reads/writes **`program_progression_rules`** (master)
- Coach client editor: `ClientProgressionEditor.tsx` reads/writes **`client_program_progression_rules`**

**Master `program_progression_rules` at runtime:** used in coach editing and RIR enrichment fallback; **not** the primary executor path (client table preferred).

### Coach pickup / next workout

**Chain:** `GET /api/coach/pickup/next-workout?clientId=` → RPC **`get_coach_pickup_workout`**

Fallback: `getProgramState()` + template blocks if RPC returns configuration gap.

Same underlying tables as client start; pickup `mark-complete` / `gym-console/start-workout` also use `getProgramState()` and create the same trio (`workout_assignments`, `workout_sessions`, `workout_logs`).

---

## 5. FK delete behavior

Direct `pg_constraint` / `information_schema` SQL could not be authenticated (same as `MIGRATION_VERIFICATION.md`). Rules below from **applied migrations** + **`test_persona_schema_recon_report.md`** (live constraint packet, dated prior to current session — cross-check noted).

| FK column | References | ON DELETE | Evidence |
| --- | --- | --- | --- |
| `workout_set_logs.workout_log_id` | `workout_logs.id` | **CASCADE** | `test_persona_schema_recon_report.md`; confirmed by `migrations/20260531_discard_workout_session_rpc.sql` comment (deleting log cascades set logs) |
| `workout_set_logs.set_entry_id` | *(none)* | **none** | `migrations/PRE_MIGRATION_SCHEMA_REFERENCE.md`: plain UUID, no FK to `workout_set_entries`; recon report lists no FK on this column |
| `workout_logs.workout_assignment_id` | `workout_assignments.id` | **CASCADE** | `test_persona_schema_recon_report.md` |
| `workout_logs.program_assignment_id` | `program_assignments.id` | **SET NULL** | `migrations/20260131_program_day_tracking.sql` |
| `workout_logs.program_schedule_id` | `program_schedule.id` | **SET NULL** | `migrations/20260131_program_day_tracking.sql` |
| `workout_assignments.program_assignment_id` | `program_assignments.id` | **SET NULL** | `migrations/20260530_workout_assignments_program_assignment_id.sql` |
| `program_schedule.template_id` | `workout_templates.id` | **none (no FK)** | `test_persona_schema_recon_report.md` — only `program_id` and `training_block_id` FKs listed |
| `program_schedule.program_id` | `workout_programs.id` | **CASCADE** | recon report |
| `program_day_completions.program_schedule_id` | `program_schedule.id` | **CASCADE** | `migrations/20260209_canonical_program_tracking_tables.sql` |
| `program_progression_rules.program_schedule_id` | `program_schedule.id` | **CASCADE** (implied) | `migrations/20260330_copy_week_schedule_rpc.sql` deletes rules before deleting schedule rows |

**History survival implications:**
- Deleting a **`workout_assignment`** cascades to **`workout_logs`** and then **`workout_set_logs`** → **logged sets are lost** with assignment deletion.
- Deleting **`program_assignments`** SET NULLs program links on logs/assignments but **does not delete logs**.
- Deleting **`program_schedule`** CASCADEs **`program_day_completions`** (ledger entries for that slot) but SET NULLs `workout_logs.program_schedule_id` (logs survive with nullable schedule link).
- Deleting **`workout_set_entries`** (template blocks) does **not** cascade to `workout_set_logs.set_entry_id` (no FK).

---

## 6. Volume reality check

### Programs

| program | assignments | progression_rules | notes |
| --- | ---: | ---: | --- |
| Tudorel Test | 1 | 0 | active test client |
| Andreea Test | 2 | 0 | |
| Test Program – Seed Fixture | 5 | 36 | |
| Hybrid Athletic Development v2 | 1 | 708 | |
| Roxi Test 1 | 2 | 60 | |
| Glute Hypertrophy 1 | 3 | 192 | |
| TS 4-Week Program | 0 | 147 | rules only |
| test 2 | 0 | 32 | rules only |
| *(7 others)* | 0 | 0 | |

### Active assignments with log volume

| assignment_id | client_id | program | status | logs total | completed | client_prog_rules |
| --- | --- | --- | --- | ---: | ---: | ---: |
| `447f36a4-…` | a92e0772… | Tudorel Test | active | 3 | 1 | 0 |
| `535b6e78-…` | c781f778… | Andreea Test | active | 1 | 1 | 0 |
| `a9f43690-…` | af9325e2… | Andreea Test | active | 2 | 2 | 0 |
| `8ade4dc4-…` | 893bded4… | Seed Fixture | active | 2 | 2 | 0 |
| `ceeb6497-…` | 0048aff5… | Roxi Test 1 | active | 12 | 12 | 54 |
| `5e58ace5-…` | 7aa53694… | Seed Fixture | active | 15 | 15 | 0 |
| `241dfd79-…` | 2bca9d9a… | Glute Hypertrophy 1 | active | 0 | 0 | 168 |

### Migration-relevant assignments (≥1 completed `workout_log`)

11 assignments across 6 programs; heaviest data:
- Seed Fixture: 15 + 2 completed logs (two clients)
- Glute Hypertrophy 1: 12 + 14 completed (completed assignments)
- Roxi Test 1: 12 completed (active)
- Tudorel / Andreea: light recent test traffic

**Query:**
```http
GET /rest/v1/workout_logs?program_assignment_id=eq.{id}&completed_at=not.is.null&select=id&limit=0
Prefer: count=exact
```

---

## 7. Template usage

| Metric | Count |
| --- | ---: |
| Total `workout_templates` | 38 |
| Distinct templates referenced in `program_schedule` | 28 |
| Distinct templates in standalone `workout_assignments` (`program_assignment_id IS NULL`) | 12 |
| Templates in schedule **only** | 18 |
| Standalone **only** | 2 |
| Both schedule and standalone | 10 |
| **Orphaned** (no schedule ref, no standalone assignment) | 8 |

Templates are **referenced by UUID** from `program_schedule.template_id`; no copy at program build or assign (except progression-rule denormalization when coach populates `program_progression_rules`).

---

## Surprises

1. **`programs` table does not exist** — live name is `workout_programs`. Code TypeScript interface is `Program` but DB table is `workout_programs`.

2. **Copy-on-assign already exists (two mechanisms):**
   - Full **`program_day_assignments` snapshot** per client at assign (407 rows / 14 assignments ≈ 29 days each).
   - Full **`client_program_progression_rules` copy** from master at assign — but **only when master rules exist**. Tudorel Test, Andreea Test, and most active test assignments have **0 client rules** because master `program_progression_rules` were never populated for those programs.

3. **Tudorel Test has 0 progression rules** — runtime uses **raw workout templates** via `get_workout_blocks`, not progression tables. Redesign assumption that programs always carry copied prescription is **not true today** for this program.

4. **`program_schedule.template_id` has no FK** to `workout_templates` in live catalog — template deletion would not be blocked by DB; schedule rows could dangle.

5. **`workout_set_logs.set_entry_id` has no FK** — set logs retain UUID references even if template set entries are deleted; no referential integrity.

6. **Deleting `workout_assignments` CASCADE-deletes `workout_logs` and thus `workout_set_logs`** — prescription/assignment cleanup **can destroy execution history** (inferred from recon report + discard RPC). Deleting `program_assignments` is safer for logs (SET NULL links).

7. **`program_progress` PK is `program_assignment_id`**, not `id` — PostgREST count on `select=id` fails; table has 8 rows (one per active/recent assignment with cache).

8. **Legacy tables still present:** `program_progress_v1`, `program_day_completions_v1`, `program_days` (0 rows), `program_assignment_progress` (1 row), `program_workout_completions` (0 rows).

9. **`training_blocks` exist but Tudorel schedule rows all have `training_block_id = null`** — block metadata is decoupled from schedule FK in practice for this program.

10. **Dual schedule read model:** canonical client schedule is **`program_day_assignments`** (`programStateService`); dashboard RPCs still read master **`program_schedule`** by `program_id` — two layers must stay aligned via assign-time copy + coach snapshot edits.

11. **60/102 workout_assignments are program-execution rows** (`program_assignment_id NOT NULL`) — majority of assignments are runtime-created, not coach standalone assigns.

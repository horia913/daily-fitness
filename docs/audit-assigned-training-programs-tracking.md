# Assigned Training Programs Tracking — As-Is Audit

**Goal:** Complete, concrete as-is map (DB + code paths + invariants) for comparison to a best-practice coaching/workouts SaaS model.  
**Rules:** Audit only. No suggestions, no refactors, no behavior changes. Every claim cited with file path + function/table/column.

---

## 1) STACK & FOLDERS

| Item | Detail |
|------|--------|
| **Framework** | Next.js App Router. Pages under `src/app/` (e.g. `src/app/client/`, `src/app/coach/`, `src/app/api/`). |
| **API routes** | `src/app/api/` — e.g. `complete-workout/route.ts`, `program-workouts/start-from-progress/route.ts`, `block-complete/route.ts`, `log-set/route.ts`, `coach/pickup/mark-complete/route.ts`. |
| **Server actions** | Not used as primary entry for program/assignment or completion; completion and progress are driven by API routes (POST to `/api/complete-workout`, etc.). |
| **Supabase** | Used from both client and server. `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`. API routes use `validateApiAuth(req)` which returns `supabaseAuth` (session, RLS) and `supabaseAdmin` (service role). RPCs called via `supabaseAuth.rpc(...)` so `auth.uid()` is set. |
| **RLS** | Enabled on program/assignment/log tables; policies in `Supabase Snippet Public Schema Column Inventory (2).csv`. Client/coach/admin access enforced by policies (e.g. program_assignments: Clients SELECT by `client_id = auth.uid()`, Coaches ALL by `coach_id = auth.uid()`). |
| **Schema / migrations** | Schema: `dailyfitness-app/Supabase Snippet Public Schema Column Inventory.csv` (columns), `(1).csv` (constraints/FKs), `(2).csv` (RLS policies), `(3).csv` (rowsecurity), `(4).csv` (CHECK expressions). Migrations: `dailyfitness-app/migrations/` (e.g. `20260131_program_day_tracking.sql`, `20260131_advance_program_progress_rpc.sql`, `20260208_advance_program_progress_accept_schedule_id.sql`). **Note:** Tables `program_progress` and `program_day_completions` are referenced in migrations and code but **do not appear in the schema CSV**; their CREATE TABLE is not present in the migrations folder. |

---

## 2) SCHEMA INVENTORY

### Program definition tables

| Table | PK | Foreign keys | Unique / important | RLS (reads/writes) |
|-------|----|--------------|--------------------|--------------------|
| **workout_programs** | `id` | `coach_id` → profiles.id | — | Coaches manage own; clients SELECT if assigned (program_assignments + active). |
| **program_days** | `id` | `program_id` → workout_programs.id, `workout_template_id` → workout_templates.id | UNIQUE(program_id, day_number) | program_days_select (authenticated); insert/update/delete coach/admin. |
| **program_schedule** | `id` | `program_id` → workout_programs.id, `template_id` → workout_templates.id | UNIQUE(program_id, day_of_week, week_number) | Clients view for assigned programs; coaches full CRUD. |
| **program_progression_rules** | `id` | program_id, program_schedule_id, block_id, exercise_id, etc. | — | Coaches manage their programs. |

**Note:** There is no table literally named "program_weeks" in the schema CSV. Week structure comes from `program_schedule.week_number` and ordering in RPCs/code.

### Assignment / enrollment tables

| Table | PK | Foreign keys | Unique / important | RLS |
|-------|----|--------------|--------------------|-----|
| **program_assignments** | `id` | `program_id` → workout_programs.id, `client_id`, `coach_id` → profiles.id | UNIQUE(program_id, client_id) | Clients view own; coaches full CRUD. |
| **program_day_assignments** | `id` | `program_assignment_id` → program_assignments.id, `program_day_id` → program_days.id, `workout_assignment_id` → workout_assignments.id | UNIQUE(program_assignment_id, day_number) | Clients view own; coaches manage. |
| **workout_assignments** | `id` | `workout_template_id` → workout_templates.id, `client_id`, `coach_id` → profiles.id | — | Clients view own; coaches full CRUD. |

### Progress tables (two systems)

**System A — used by RPC and “next workout” (not in schema CSV; defined by migration usage):**

| Table | Columns (from migration usage) | Notes |
|-------|--------------------------------|--------|
| **program_progress** | id, program_assignment_id, current_week_index, current_day_index, is_completed, created_at, updated_at | One row per program assignment. Indices 0-based. INSERT in `20260208_advance_program_progress_accept_schedule_id.sql` line 106; no CREATE TABLE in migrations. |
| **program_day_completions** | program_assignment_id, week_index, day_index, completed_by, notes, completed_at | ON CONFLICT (program_assignment_id, week_index, day_index) DO NOTHING (idempotent). Referenced in same migration; no CREATE TABLE in migrations. |

**System B — in schema CSV (legacy / alternate):**

| Table | PK | Foreign keys | Unique / important | RLS |
|-------|----|--------------|--------------------|-----|
| **program_assignment_progress** | `id` | `client_id` → profiles.id | UNIQUE(client_id, program_id) | program_assignment_progress_*: client, coach, admin. |
| Columns | assignment_id (NOT NULL), client_id, program_id, current_week (default 1), current_day (default 1), days_completed_this_week, cycle_start_date, last_workout_date, total_weeks_completed, is_program_completed, completed_at | **Constraint file (1).csv:** No FK from assignment_id to program_assignments.id. CHECK: current_day between 1 and 6. |

### Logging tables

| Table | PK | Foreign keys | Unique / important | RLS |
|-------|----|--------------|--------------------|-----|
| **workout_logs** | `id` | `workout_assignment_id` → workout_assignments.id, `client_id` → profiles.id, `workout_session_id` → workout_sessions.id | — | Clients insert/read/update own. |
| **workout_logs (extra columns from migration)** | — | From `20260131_program_day_tracking.sql`: `program_assignment_id` → program_assignments.id, `program_schedule_id` → program_schedule.id (nullable) | Partial index `idx_wl_program_day_incomplete` on (client_id, program_assignment_id, program_schedule_id) WHERE completed_at IS NULL | Same RLS (client_id). |
| **workout_set_logs** | `id` | `workout_log_id` → workout_logs.id, `client_id`, `exercise_id` | — | Clients insert/read own. |
| **workout_sessions** | `id` | `assignment_id` → workout_assignments.id, `client_id` | — | Clients manage own. Same migration adds program_assignment_id, program_schedule_id. |
| **program_workout_completions** | `id` | assignment_progress_id → program_assignment_progress.id, client_id, program_id | UNIQUE(assignment_progress_id, week_number, program_day); CHECK program_day 1–6 | program_workout_completions_*: client, coach, admin. |

### Join / linking

- **program_schedule** links program → (week_number, day_of_week) → template_id (workout_templates.id).
- **program_day_assignments** links program_assignment → day_number → workout_assignment_id (and optional program_day_id, workout_template_id).
- **workout_logs** and **workout_sessions** link to a specific program day via (program_assignment_id, program_schedule_id) when set (migration 20260131).

### Canonical identifiers (answers)

- **“User is on program X”:** Table `program_assignments`, column `id` (one row per client–program with status). Active = `status = 'active'`. Canonical: `program_assignments.id` for the assignment.
- **“Day N completed”:**  
  - **System A:** `program_day_completions` row for (program_assignment_id, week_index, day_index).  
  - **System B:** `program_day_assignments.is_completed` = true and `completed_date` set; or `program_workout_completions` rows keyed by assignment_progress_id + week_number + program_day.  
  Code and RPC use System A for advancing and “next workout”; some UI and legacy paths still read/write System B.

---

## 3) READ PATHS TABLE

| READ_PATH | SCREEN | FUNCTION | TABLES READ | KEY FIELDS USED | NOTES |
|-----------|--------|----------|-------------|------------------|--------|
| Current program / next workout | Client workouts list | `getCurrentWorkoutFromProgress` | program_assignments, program_progress, program_schedule | program_progress.current_week_index, current_day_index, is_completed; schedule template_id, id (schedule_row_id) | `src/lib/programProgressService.ts` getCurrentWorkoutFromProgress. Creates program_progress row if missing. |
| Same | EnhancedClientWorkouts | useEffect load | program_assignments, getCurrentWorkoutFromProgress → program_progress + program_schedule, program_assignments+workout_programs, getProgramMetrics | current_week_index, current_day_index, template_id, schedule_row_id; program name, duration_weeks | `src/components/client/EnhancedClientWorkouts.tsx` ~451–673. Sets “today’s workout” and currentProgram (week from programMetrics.current_day_number/7). |
| Program metrics (completion %, day number) | EnhancedClientWorkouts, coach program view | `getProgramMetrics` | program_progress, program_assignments, program_schedule, program_day_completions | current_week_index, current_day_index, is_completed; completions count; total from schedule | `src/lib/programMetricsService.ts` getProgramMetrics. Fallback: getProgramMetricsLegacy uses program_day_assignments.is_completed. |
| Current week (display) | Workout details page | direct query | program_assignment_progress | current_week | `src/app/client/workouts/[id]/details/page.tsx` ~253: from("program_assignment_progress").select("current_week"). |
| Active program assignment | Start/complete workout pages | direct query | program_assignments, program_day_assignments | id, workout_assignment_id, program_assignment_id, is_completed | `src/app/client/workouts/[id]/start/page.tsx` ~1371, 1386, 2095; complete page ~643, 765. Start also reads program_assignment_progress for current_week. |
| Current week/day for start | Start page (program flow) | direct query | program_assignment_progress | current_week, program_id | `src/app/client/workouts/[id]/start/page.tsx` ~2095–2103. |
| Coach program progress | Coach client program page | direct query | program_assignments, program_progress (as program_progress) | current_week_index, current_day_index, is_completed | `src/app/coach/clients/[id]/programs/[programId]/page.tsx` ~169: from('program_progress').eq('program_assignment_id', assignmentData.id). |
| Client dashboard weekly goal / next workout | Client dashboard | clientDashboardService | program_assignments, program_progress, workout_assignments, program_schedule | current_week_index; program workout for “today” | `src/lib/clientDashboardService.ts` ~108–124, 311–342. |
| Client summary RPC | Dashboard/summary | get_client_workout_summary (RPC) | program_assignments, program_progress, program_schedule, program_day_completions, workout_logs, etc. | current_week_index, current_day_index; current row from schedule | `migrations/20260208_fix_client_summary_v_current_schedule_row.sql`, `20260202_client_summary_rpc.sql`. |
| Coach pickup “next workout” | Gym console | get_coach_pickup_workout (RPC) | program_assignments, program_progress, program_schedule | current_week_index, current_day_index; template for current slot | `migrations/20260202_coach_pickup_rpc.sql`. |

---

## 4) WRITE PATHS TABLE

| WRITE_PATH | TRIGGER (UI) | FUNCTION | PAYLOAD FIELDS | TABLES WRITTEN | ADVANCE LOGIC | IDEMPOTENT? (Y/N + how) |
|------------|--------------|-----------|----------------|----------------|---------------|--------------------------|
| Complete workout | Finish workout button → complete page | POST /api/complete-workout | workout_log_id, client_id, duration_minutes?, session_id? | workout_logs (update completed_at, totals); workout_sessions (update status, completed_at if session_id); then RPC advance_program_progress | When workout_log has program_assignment_id + program_schedule_id, RPC called with those; else RPC advances from current pointer. RPC updates program_progress and program_day_completions. | N (workout_log update is not guarded). Double completion: second request updates same workout_log again; RPC returns already_completed (409) for same day. No DB unique on “one completion per (workout_log_id)” or “one completion per (client, program_day)”. |
| Block complete | Block completion in workout executor | POST /api/block-complete | workout_log_id?, workout_assignment_id?, workout_block_id? | workout_block_completions (upsert on workout_log_id, workout_block_id); may create workout_log if missing | None | Y: upsert on (workout_log_id, workout_block_id). |
| Coach mark complete | Coach gym console / pickup | POST /api/coach/pickup/mark-complete | client_id, etc. | Calls advance_program_progress RPC (no schedule id); RPC updates program_progress, program_day_completions | RPC advances from current pointer (no p_program_schedule_id). | RPC uses ON CONFLICT DO NOTHING for program_day_completions; “already_completed” returned if day already in completions. |
| Complete page program_day_assignments | Same as “Complete workout” (after API success) | Client complete page | workout_log_id, client_id; resolution of program_day_assignment by workout_assignment_id | program_day_assignments (update is_completed, completed_date) | None (mark day complete in System B) | N. If workout came from program_day_assignments, complete page updates that row (src/app/client/workouts/[id]/complete/page.tsx ~764–797). No unique preventing multiple updates. |
| Start-from-progress | “Start” program workout from list | POST /api/program-workouts/start-from-progress | client_id? (default auth.uid()) | workout_assignments (insert), workout_sessions (insert with program_assignment_id, program_schedule_id), workout_logs (insert with same) | None (creates assignment/session/log for current program day) | Y: reuses existing in-progress session or incomplete log for same (client_id, program_assignment_id, program_schedule_id) before creating new. |

---

## 5) ID MAPPING DIAGRAM

```
program_id (workout_programs.id)
    │
    ├── program_schedule (program_id, week_number, day_of_week, template_id)
    │       └── schedule_row_id = program_schedule.id  [created at program definition]
    │
    └── program_assignments (program_id, client_id, coach_id)
            └── program_assignment_id = program_assignments.id  [created at assignment time]

program_assignment_id
    │
    ├── program_progress (program_assignment_id, current_week_index, current_day_index, is_completed)  [created on first read or by RPC]
    ├── program_day_completions (program_assignment_id, week_index, day_index, ...)  [created at completion time by RPC]
    ├── program_day_assignments (program_assignment_id, day_number, workout_assignment_id, ...)  [created at assignment time]
    └── workout_assignments (created per “day” when starting from progress; no FK to program_assignment in schema)
            └── workout_assignment_id = workout_assignments.id  [created at workout start or at assignment time for legacy]

workout_template_id = workout_templates.id  [template for a schedule row; exists at definition]

At workout start (start-from-progress):
  - program_progress + program_schedule → (current_week_index, current_day_index) → schedule_row_id (program_schedule.id), template_id.
  - Reuse check: workout_sessions or workout_logs with (client_id, program_assignment_id, program_schedule_id) and in_progress / completed_at NULL.
  - If new: create workout_assignment, workout_session (assignment_id, program_assignment_id, program_schedule_id), workout_log (workout_assignment_id, program_assignment_id, program_schedule_id).

At completion:
  - workout_log_id (and client_id) → complete-workout API.
  - workout_logs row has workout_assignment_id, optional program_assignment_id, program_schedule_id.
  - API updates workout_logs (completed_at, totals); then RPC advance_program_progress(p_client_id, p_completed_by, p_notes, workout_log.program_assignment_id, workout_log.program_schedule_id).
  - RPC writes program_day_completions and program_progress (advances pointer or marks program completed).
  - Separate client path: complete page updates program_day_assignments.is_completed for the workout_assignment_id that links to that program day.

Join keys by screen:
  - Client “next workout”: program_assignments.id (active) → program_progress → program_schedule → template_id, schedule_row_id.
  - Start workout: program_assignment_id + program_schedule_id (and client_id) for idempotency; workout_assignment_id returned.
  - Complete workout: workout_log_id (and client_id); workout_log carries program_assignment_id, program_schedule_id into RPC.
```

---

## 6) TOP 5 DESYNC RISKS (with citations)

1. **Two progress systems (program_progress + program_day_completions vs program_assignments/program_day_assignments)**  
   - **Where:** Read path uses `program_progress` and `getCurrentWorkoutFromProgress` (programProgressService.ts, getProgramMetrics programMetricsService.ts). Write path: RPC updates `program_progress` and `program_day_completions`; complete page also updates `program_day_assignments.is_completed` and `completed_date` (complete/page.tsx ~764–797).  
   - **Why:** “Current day” and “next workout” come from System A; System B is still written on completion. If RPC fails and program_day_assignments is updated (or the other way around), or if coach uses mark-complete (advances only System A), the two can diverge.  
   - **Citation:** `src/app/client/workouts/[id]/complete/page.tsx` lines 761–797 (program_day_assignments update); `src/app/api/complete-workout/route.ts` lines 270–286 (RPC only).

2. **program_assignment_progress vs program_progress**  
   - **Where:** Some code reads `program_assignment_progress` (e.g. workout details page for current_week; start page for current_week). Other code and RPCs use `program_progress` (current_week_index, current_day_index).  
   - **Why:** Two different tables for “current position”; schema CSV has program_assignment_progress; migrations/code use program_progress. If only one is updated (e.g. only RPC updates program_progress), program_assignment_progress can be stale.  
   - **Citation:** `src/app/client/workouts/[id]/details/page.tsx` line 253 (program_assignment_progress); `src/app/client/workouts/[id]/start/page.tsx` lines 2095–2103 (program_assignment_progress); `src/lib/programProgressService.ts` (program_progress).

3. **Completion inferred from workout_logs in one place and from program_day_completions/assignments in another**  
   - **Where:** Compliance/analytics count completed workouts from workout_logs (e.g. OptimizedClientProgress, OptimizedComplianceAnalytics, progress page). Program completion percentage uses program_day_completions (programMetricsService) or legacy program_day_assignments.  
   - **Why:** A completed workout_log without a matching program_day_completion (e.g. RPC failed after workout_log update) leaves program progress behind; the reverse (RPC succeeded, workout_log update failed) is less likely because API updates log first then RPC.  
   - **Citation:** `src/components/coach/OptimizedClientProgress.tsx` ~250–256 (workout_logs for completed count); `src/lib/programMetricsService.ts` ~80–89 (program_day_completions for completed_workouts).

4. **No unique constraint preventing double completion of the same program day**  
   - **Where:** program_day_completions has ON CONFLICT (program_assignment_id, week_index, day_index) DO NOTHING in RPC, so duplicate insert is no-op. But workout_logs can be updated multiple times (completed_at set again); there is no unique on (workout_log_id) for “completed once.”  
   - **Why:** Double-click or retry can send two complete-workout requests; both update the same workout_log; RPC may return already_completed for the second. Idempotency is in RPC for “day,” not for “this workout_log completed.”  
   - **Citation:** `src/app/api/complete-workout/route.ts` lines 148–159 (single update by id; no “already completed” check on workout_log before updating).

5. **“Today’s active log” resolution mismatch**  
   - **Where:** Start page and log-set API resolve “active” workout_log by (client_id, workout_assignment_id, completed_at IS NULL) and optionally by (client_id, program_assignment_id, program_schedule_id). Complete page may receive workout_log_id from URL/state or derive it (e.g. “most recent incomplete for this assignment”).  
   - **Why:** If the client has two tabs or the “active” log chosen on start differs from the one used on complete (e.g. one by assignment, one by program day), sets can be split across logs or completion can attach to the wrong log.  
   - **Citation:** `src/app/client/workouts/[id]/start/page.tsx` ~800–843 (find active workout_log); `src/app/client/workouts/[id]/complete/page.tsx` ~219–284 (resolve workout_log_id); `src/app/api/log-set/route.ts` (reuses “active” log by assignment/program day).

---

## 7) MINIMAL DATASET EXAMPLE

**Setup:** User U (client), program P (3 days in schedule). Program has program_schedule rows e.g. (week_number=1, day_of_week=0, template_id=T1), (1, 1, T2), (1, 2, T3).

**1) Assignment time**

- **program_assignments:** 1 row: id=PA1, program_id=P, client_id=U, coach_id=COACH, status='active', start_date=today, total_days=3, ...
- **program_day_assignments:** 3 rows (one per day): program_assignment_id=PA1, day_number=1,2,3, workout_assignment_id=NULL initially, workout_template_id=T1/T2/T3, is_completed=false, ...
- **program_progress:** None yet (created on first getCurrentWorkoutFromProgress or by RPC).
- **program_assignment_progress:** May exist (schema CSV): assignment_id=PA1, client_id=U, program_id=P, current_week=1, current_day=1, ...

**2) Workout start for day 1**

- Client calls POST /api/program-workouts/start-from-progress. getCurrentWorkoutFromProgress returns template_id=T1, schedule_row_id=PS1 (program_schedule.id for week 1 day 0).
- No existing in-progress session or incomplete log for (U, PA1, PS1). So insert:
  - **workout_assignments:** id=WA1, workout_template_id=T1, client_id=U, coach_id=COACH, status='assigned', ...
  - **workout_sessions:** id=S1, assignment_id=WA1, client_id=U, status='in_progress', program_assignment_id=PA1, program_schedule_id=PS1.
  - **workout_logs:** id=WL1, workout_assignment_id=WA1, client_id=U, started_at=now, completed_at=NULL, program_assignment_id=PA1, program_schedule_id=PS1.
- Optional: program_progress row created/read with current_week_index=0, current_day_index=0 (pointer to “day 1”).

**3) Completion of day 1**

- Client submits POST /api/complete-workout with workout_log_id=WL1, client_id=U.
- **workout_logs:** WL1 updated: completed_at=now, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted.
- **workout_sessions:** S1 updated: status='completed', completed_at=now (if session_id sent).
- RPC advance_program_progress(U, U, null, PA1, PS1): inserts **program_day_completions** (PA1, week_index=0, day_index=0, ...); updates **program_progress** to current_week_index=0, current_day_index=1 (or next slot). If only 3 days and ordering is linear, pointer moves to day 2.
- Complete page (if workout came from program_day_assignments): finds program_day_assignments row with workout_assignment_id=WA1, updates **program_day_assignments** is_completed=true, completed_date=today.

**4) Moving to day 2**

- Client opens workouts list. getCurrentWorkoutFromProgress reads program_progress (current_week_index, current_day_index) and program_schedule, returns next row (e.g. week 1 day 1 → template T2, schedule_row_id=PS2).
- Start-from-progress again: no in-progress session or incomplete log for (U, PA1, PS2); creates WA2, S2, WL2 with program_assignment_id=PA1, program_schedule_id=PS2.
- No new rows in program_assignments or program_day_assignments for “day 2” in the minimal example; the next workout is driven entirely by program_progress + program_schedule.

---

*End of audit. No recommendations or changes; for comparison to best practice only.*

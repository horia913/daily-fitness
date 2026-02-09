# Program completion: how it works and where it breaks

This document explains how the app tracks a client’s progression through a program (which workouts are done, which week/day, what to show next, when to advance), and recommends a single, clear approach.

---

## 1. What the app is trying to do

- **Track** which program workouts the client has completed (by week/day).
- **Know** the current position (current week, current day).
- **Show** “what’s next” (next workout in the program).
- **Advance** that position when the client completes a workout (and optionally mark the program as completed when all days are done).

---

## 2. Relevant database structures

There are two overlapping “progress” systems in the codebase and schema.

### 2.1 System A: “New” progress (RPC + UI “next workout”)

- **`program_progress`** (referenced in RPC and migrations; may not appear in your schema CSV if it was added later)
  - One row per program assignment.
  - `program_assignment_id`, `current_week_index`, `current_day_index`, `is_completed`, `updated_at`.
  - `current_week_index` / `current_day_index` are **indices** into the program schedule (0-based), not calendar week/day.
- **`program_day_completions`**
  - One row per completed (week_index, day_index) for a program assignment.
  - `program_assignment_id`, `week_index`, `day_index`, `completed_by`, `completed_at`.
  - Used for idempotency (e.g. ON CONFLICT DO NOTHING) and for counting completed days.

Used by:

- RPC **`advance_program_progress`** (advances “current” position and inserts into `program_day_completions`).
- **`getCurrentWorkoutFromProgress`** (programProgressService): reads `program_progress` + `program_schedule` to decide “next” workout.
- **`getProgramMetrics`** (programMetricsService): uses `program_progress` + `program_day_completions` (with legacy fallback to System B).

### 2.2 System B: “Legacy” / assignment-based

- **`program_assignments`**
  - `current_day_number`, `completed_days`, `total_days`, `status`, etc.
- **`program_day_assignments`**
  - One row per program “day” for an assignment (from program template).
  - `program_assignment_id`, `day_number`, `workout_assignment_id`, `workout_template_id`, **`is_completed`**, **`completed_date`**, `program_day`, etc.
  - Links a logical program day to a concrete `workout_assignment_id` (and optionally template).

Used by:

- **Client complete page** (workouts/[id]/complete): when the completed workout has a `workout_assignment_id` that matches a `program_day_assignments` row, it updates that row’s `is_completed` and `completed_date`.
- **Legacy start flow**: `/api/program-workouts/start` (by `program_day_assignment_id`); some navigation still uses `scheduleId` (program_schedule.id) or template/assignment lookups.
- **programMetricsService** legacy fallback when `program_progress` is missing.

### 2.3 Other relevant tables

- **`program_schedule`**: defines the program grid: `program_id`, `week_number`, `day_of_week`, `template_id`. This is the source of truth for “which template is Week X, Day Y”.
- **`workout_logs`**: has optional **`program_assignment_id`** and **`program_schedule_id`** (from migration 20260131_program_day_tracking). So each log can be tied to a specific program day.
- **`workout_sessions`**: same optional program columns for in-progress sessions.

Your schema CSV lists **`program_assignment_progress`** (e.g. `assignment_id`, `current_week`, `current_day`) — a different name from **`program_progress`**. If both exist, that’s a third place where “current position” could live and can cause confusion.

---

## 3. End-to-end flow today

### 3.1 “What to show next” (client workouts list / dashboard)

1. **EnhancedClientWorkouts** (and dashboard) call **`getCurrentWorkoutFromProgress(supabase, clientId)`**.
2. That function:
   - Finds the client’s active **program_assignment** (status = active).
   - Gets or creates a **program_progress** row (current_week_index, current_day_index, is_completed).
   - Loads **program_schedule** for that program.
   - Builds a schedule structure (weeks and days) and picks the row at `(current_week_index, current_day_index)`.
   - Returns that row’s **template_id** and **program_schedule.id** (schedule_row_id) as “current workout”.
3. So “next” is **purely** the slot at the current pointer in System A. It does **not** derive from “first program_day_assignment that is not completed” in System B.

### 3.2 Starting a program workout

Two paths:

- **Preferred path (program “from progress”)**
  - Client clicks Start → **POST /api/program-workouts/start-from-progress**.
  - API calls **getCurrentWorkoutFromProgress** to get the current (week_index, day_index) and its `template_id` and `program_schedule_id`.
  - API then either reuses an existing in-progress session/log for that **(client_id, program_assignment_id, program_schedule_id)** or creates a new **workout_assignment** + **workout_session** + **workout_log**, with **program_assignment_id** and **program_schedule_id** set on session and log.
  - Response returns **workout_assignment_id**; client is sent to `/client/workouts/{workout_assignment_id}/start`.
- **Legacy path**
  - Some code paths still navigate with **scheduleId** (program_schedule.id) or **program_day_assignments.id**. The start page then resolves that to a workout_assignment (e.g. via program-workouts/start or template/assignment lookup). That can create or link **program_day_assignments.workout_assignment_id** and may or may not set program day on session/log.

So when the “start-from-progress” path is used, the workout is correctly tagged with the current program day. When the legacy path is used, tagging and consistency with System A can be weaker.

### 3.3 Completing a workout

1. Client completes → **POST /api/complete-workout** with **workout_log_id** and **client_id**.
2. API:
   - Loads **workout_log** (and has access to **program_assignment_id** and **program_schedule_id** on that log).
   - Updates **workout_logs** (totals, completed_at), optionally **workout_sessions**, and **workout_assignments.status** (via client complete page).
   - Calls RPC **`advance_program_progress(p_client_id, p_completed_by, p_notes)`**.
3. **RPC `advance_program_progress`**:
   - Receives **only** `p_client_id`, `p_completed_by`, `p_notes`. It does **not** receive which program day was just completed (no program_schedule_id or week/day).
   - Finds the client’s active **program_assignment** and its **program_progress** row.
   - Assumes “the workout just completed **is** the one at (current_week_index, current_day_index)”.
   - Inserts into **program_day_completions** for that (week_index, day_index) (with ON CONFLICT DO NOTHING).
   - Advances the pointer: same week next day, or next week day 0, or marks program completed.
   - Updates **program_progress** with the new (current_week_index, current_day_index) and possibly is_completed.

So advancement is **implicit**: “whatever is at the current pointer, we mark that as done and move the pointer.” The API does **not** tell the RPC “this completion was for program_schedule_id X,” so the RPC cannot validate or correct out-of-order completion.

4. **Client complete page** (after API call) additionally:
   - Finds **program_day_assignments** where **workout_assignment_id** = the completed assignment.
   - Sets **is_completed = true** and **completed_date** for that row.

So we have **two writes** for one completion: RPC updates System A (program_progress + program_day_completions); client page updates System B (program_day_assignments). If the client completes in a different order than the “current” pointer (e.g. legacy start, or multiple devices), System A and System B can diverge.

### 3.4 When things go wrong

- **RPC doesn’t know which day was completed**
  - If the user somehow starts/completes “Week 2 Day 1” before “Week 1 Day 3”, the RPC still advances from whatever (current_week_index, current_day_index) was. So it may mark the wrong logical day as completed and show the wrong “next” workout.
- **Two sources of truth**
  - “Next” and metrics use **program_progress** (+ program_schedule). Completion is also written to **program_day_assignments**. If one path fails or is skipped, the two can disagree (e.g. program shows “Week 2” but program_day_assignments still has Week 1 days incomplete).
- **Schema / naming**
  - Your CSV has **program_assignment_progress**; the RPC and services use **program_progress**. If both exist with different semantics, or if one is missing, you get 404s or wrong data.
- **Legacy start path**
  - If the client starts via scheduleId or program_day_assignments.id and the created workout_log doesn’t get program_assignment_id/program_schedule_id, the RPC still advances “current” pointer. So the completed day (in System B) and the day the RPC thinks was completed (in System A) can differ.

---

## 4. Best-practice direction (single source of truth)

Goal: one clear place that defines “which workouts are done” and “what is the next workout,” and one place that updates when a workout is completed.

### 4.1 Recommended model

- **Use one progress model**, not two.
  - Prefer **program_progress** (current_week_index, current_day_index, is_completed) + **program_day_completions** (week_index, day_index per completion) as the **single source of truth** for:
    - Which program day is “current” (what to show next).
    - Which days are completed (for metrics and completion %).
  - Treat **program_day_assignments** as **assignment/template linkage** (which workout_assignment and template belong to which program day), not as the source of truth for completion. Optionally keep updating **is_completed**/completed_date there for backward compatibility or coach views, but **derive** “next” and “completed count” from program_progress + program_day_completions only.

- **Tie completion to the actual day completed**
  - When completing a workout, the API already has **workout_log.program_assignment_id** and **workout_log.program_schedule_id**.
  - Pass at least **program_schedule_id** (or equivalent week_index + day_index) into the RPC, e.g. **advance_program_progress(p_client_id, p_completed_by, p_program_schedule_id, p_notes)**.
  - RPC should:
    - Resolve program_schedule_id to (program_id, week_number, day_of_week) and then to (week_index, day_index) in the schedule order.
    - Insert into **program_day_completions** for **that** (program_assignment_id, week_index, day_index), not for “current” pointer.
    - Then update **program_progress.current_week_index / current_day_index** to the **next** slot after the one just completed (e.g. “next incomplete day” or “next day in order”). That way out-of-order completion still records the correct day and the pointer moves to a sensible next position.

- **Single path to start program workouts**
  - Always use **start-from-progress** for program workouts: get current day from **program_progress** + **program_schedule**, create or reuse session/log with **program_assignment_id** and **program_schedule_id** set. Remove or strictly limit legacy navigation that uses scheduleId or program_day_assignments.id to start so that every program completion is tied to a known program day.

- **Schema clarity**
  - Confirm in the DB which tables exist: **program_progress** vs **program_assignment_progress**. If both exist, document which is canonical and migrate callers to one. If only program_assignment_progress exists, either rename or add **program_progress** and **program_day_completions** per the RPC and migrate data once.

### 4.2 Concrete steps (summary)

1. **Verify schema**: Ensure **program_progress** and **program_day_completions** exist and match what the RPC and programProgressService expect; resolve any **program_assignment_progress** naming/duplication.
2. **RPC signature and logic**: Extend **advance_program_progress** to accept the completed program day (e.g. **p_program_schedule_id** or **p_week_index, p_day_index**). Record completion for that day in **program_day_completions**, then set **program_progress** to the next slot (or “next incomplete” if you allow out-of-order).
3. **Complete-workout API**: Pass **workout_log.program_assignment_id** and **workout_log.program_schedule_id** (or derived week_index/day_index) into the RPC when the log has program day set; otherwise keep current behavior (advance from current pointer) for non-program or legacy completions.
4. **Single “next” logic**: Keep using **getCurrentWorkoutFromProgress** (program_progress + program_schedule) everywhere for “what’s next” and for start-from-progress. Do not derive “next” from program_day_assignments.is_completed.
5. **Optional**: Keep updating **program_day_assignments.is_completed**/completed_date when the completed workout has a linked program_day_assignment, for backward compatibility or reporting, but do not use it to drive “next” or advancement.
6. **Client start flow**: Use only **start-from-progress** for program workouts in the UI (and ensure dashboard/workouts list always call it and navigate to the returned workout_assignment_id). Deprecate or reserve legacy “start by scheduleId / program_day_assignment id” for non-program or coach-only flows.

---

## 5. Clarifying questions (for you)

1. **Tables in your DB**: Do you actually have **program_progress** and **program_day_completions** in Supabase, or only **program_assignment_progress** (and program_day_assignments)? If only the latter, we need a migration to add the former (or to standardize on one naming and one model).
2. **Out-of-order completion**: Should the app allow completing “Week 2 Day 1” before “Week 1 Day 3” (and still record both correctly), or is strict order required? That affects whether we only “advance pointer” or we “mark this day done and recompute next.”
3. **program_day_assignments**: Are coach-facing or reporting features relying on **program_day_assignments.is_completed** / completed_date? If yes, we keep the dual write for now and document it; if no, we can stop writing it and rely only on program_progress + program_day_completions.
4. **Legacy start**: Do any real users or flows still start program workouts via the legacy path (e.g. link that uses program_schedule.id or program_day_assignments.id)? If everything goes through the “Start” button that calls start-from-progress, we can treat legacy as deprecated and fix advancement and “next” on the single path.

**What “starting via a link” means:** In the code, some paths navigate to `/client/workouts/{id}/start` where `id` can be a **workout_assignment_id** (correct), or in legacy paths a **program_schedule.id** or **program_day_assignments.id**. A “link” would be e.g. an email or in-app link like `https://yourapp.com/client/workouts/abc-123-uuid/start`. If that UUID is a schedule or program_day_assignment id instead of a workout_assignment id, the start page resolves it (different API or lookup). You said all starts go through the Start button, so we assume the app always gets a workout_assignment_id from start-from-progress and legacy link-by-id is not used.

---

## 5c. Schema confirmed (from discovery SQL results)

- **program_progress** and **program_day_completions** both exist and match the RPC (current_week_index, current_day_index; week_index, day_index).
- **program_assignment_progress** also exists (assignment_id, client_id, current_week, current_day, …). This is a different table; the RPC `advance_program_progress` uses **program_progress** only. Any code reading `program_assignment_progress` for “current position” would be out of sync with the RPC.
- **workout_logs** and **workout_sessions** have **program_assignment_id** and **program_schedule_id** — so we can pass the completed program day from the API into the RPC.
- **Views:** No views in `public` reference `program_day_assignments`.
- **Triggers:** No triggers on `program_day_assignments`. So nothing in the DB depends on `program_day_assignments` for views/triggers; the dual write to `is_completed` is for app/coach use only.
- **Functions (public schema):** Name-only discovery returned two functions:
  - **advance_program_progress** — used by the complete-workout API to advance the current pointer and insert into program_day_completions.
  - **enforce_single_program_assignment** — likely a constraint/trigger function (e.g. one active program per client); not part of the completion flow but relevant to program assignment lifecycle.

---

## 5b. Your answers (for implementation)

- **Schema**: Run `docs/program-completion-schema-discovery.sql` in the SQL editor and share the results so we know exactly which tables exist.
- **Out-of-order**: Client may complete days in any order **within** a week (e.g. Week 1 Day 3 before Week 1 Day 1). They must **not** complete Week 2 before Week 1 is finished. So advancement must: (1) record the specific day completed; (2) allow same-week out-of-order; (3) enforce “no week N+1 until week N is complete.”
- **program_day_assignments.is_completed**: Use the SQL in the discovery script (section 3) to see if any views/triggers/functions reference `program_day_assignments`. Share the result; we’ll keep or drop the dual write accordingly.
- **Legacy start**: Not used; all program workouts are started via the Start button (start-from-progress). We can treat start-from-progress as the only path for program workouts.

---

## 6. Short summary

- **What the app does now**: It uses **program_progress** (current_week_index, current_day_index) + **program_schedule** to decide “next” workout, and **advance_program_progress** RPC to advance a single “current” pointer and insert into **program_day_completions**. The RPC does **not** receive which program day was actually completed; it assumes “current = just completed.” A second system (**program_day_assignments.is_completed**) is updated on the client complete page. Two sources of truth and “blind” advancement can cause wrong progress and wrong “next” when flows are mixed or out of order.
- **Best practice**: Use **program_progress** + **program_day_completions** as the only source of truth for “next” and “completed.” Pass the **completed program day** (e.g. program_schedule_id) from the complete-workout API into the RPC, record that day in **program_day_completions**, then set **program_progress** to the next slot. Use only **start-from-progress** for starting program workouts so every completion is tied to a known program day. Resolve schema naming (program_progress vs program_assignment_progress) and optional dual-write to program_day_assignments once the above is clear.

If you answer the four questions in §5, the next step is to turn this into a concrete implementation plan (migrations + API + RPC + client changes) tailored to your current schema and product rules.

# Train Page: “Completed for Today” Bug Investigation

## Summary

A workout is shown as completed for today (Monday) even though the client did not do any workout today. This doc explains the schema, how completion is determined, and how to confirm the root cause with data.

---

## Step 1 & 2: Queries for you to run

Run these in the **Supabase SQL Editor** and save the results. (We cannot run SQL against your database from here.)

### Query 1 — Program day completions for this client

Use `created_at` on `program_assignments` (not `assigned_at`).

```sql
SELECT 
  pdc.id,
  pdc.program_assignment_id,
  pdc.program_schedule_id,
  pdc.completed_at,
  ps.week_number,
  ps.day_number,
  ps.day_of_week,
  ps.template_id,
  wt.name as template_name
FROM program_day_completions pdc
JOIN program_schedule ps ON ps.id = pdc.program_schedule_id
LEFT JOIN workout_templates wt ON wt.id = ps.template_id
WHERE pdc.program_assignment_id = (
  SELECT id FROM program_assignments 
  WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8' 
  AND status = 'active'
  ORDER BY created_at DESC LIMIT 1
)
ORDER BY pdc.completed_at DESC
LIMIT 10;
```

Check:

- How many rows and which `week_number` / `day_number` / `day_of_week`?
- Is there only **one** row per (week_number, day_number) in `program_schedule` for this program (e.g. only Week 1), or multiple weeks?
- What are the `completed_at` dates? Is there a completion with `completed_at` = **today’s date**?

### Query 2 — Today’s workout_logs for this client

Use `workout_template_id` on `workout_assignments` (not `template_id`).

```sql
SELECT 
  wl.id,
  wl.started_at,
  wl.completed_at,
  wl.workout_assignment_id,
  wl.program_assignment_id,
  wl.program_schedule_id,
  wa.workout_template_id as template_id,
  wt.name as template_name
FROM workout_logs wl
LEFT JOIN workout_assignments wa ON wa.id = wl.workout_assignment_id
LEFT JOIN workout_templates wt ON wt.id = wa.workout_template_id
WHERE wl.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
ORDER BY wl.started_at DESC
LIMIT 10;
```

Check:

- Any row with `started_at` or `completed_at` **today**? If not, the client indeed did not do a workout today.

---

## Step 3: How the Train page decides “completed for today”

### program_day_completions schema (source of truth)

From `migrations/20260209_canonical_program_tracking_tables.sql`:

| Column                    | Type        | Notes |
|---------------------------|-------------|--------|
| id                        | uuid        | PK    |
| program_assignment_id     | uuid        | FK → program_assignments |
| program_schedule_id       | uuid        | FK → program_schedule    |
| completed_at              | timestamptz | When the day was completed |
| completed_by              | uuid        | FK → profiles           |
| notes                     | text        | Optional                 |

- **Unique:** `(program_assignment_id, program_schedule_id)` — one completion per assignment per schedule slot.
- There is **no** `week_number` or calendar date on the table; the only “which day” is `program_schedule_id`.

### program_schedule (what each completion refers to)

- Table has `(program_id, week_number, day_number, day_of_week, template_id, ...)`.
- Unique index: `(program_id, week_number, day_number)` (see `20260209_program_schedule_day_number.sql`).
- So **each (program, week, day)** has its own `id` (program_schedule_id).  
  Example: Week 1 Monday = one `id`, Week 2 Monday = another `id`.

### How the Train page maps completions to the current week

1. **RPC `get_train_page_data`** returns:
   - **schedule:** all rows from `program_schedule` for the program (ordered by `week_number`, `day_number`).
   - **completions:** all rows from `program_day_completions` for the client’s active assignment:  
     `(program_schedule_id, completed_at)` — no filtering by date.

2. **Mapper `trainPageDataMapper.ts`** (and `programStateService`):
   - Builds `completedScheduleIds = new Set(completions.map(c => c.program_schedule_id))`.
   - Computes **current week** via `computeUnlockedWeekMax(slots, completedSlots)` (first week that has an incomplete required slot).
   - **Today’s slot:** `getTodaySlot(slots, unlockedWeekMax, todayWeekday)` — slot in the unlocked week whose `day_of_week` matches today (Monday = 0 in code).
   - For **every** day card (including today):  
     `isCompleted: completedScheduleIds.has(slot.id)`.

So the Train page marks a day as completed **only** if that day’s **program_schedule_id** appears in `program_day_completions`. It does **not** check:

- calendar date (e.g. “completed today”),
- or “completed this week”.

So if the client completed “Monday” on a **previous** Monday (or any past day), that same schedule slot stays “completed” forever for that program week. When they open the Train page **this** Monday, they still see Monday as completed because the schedule_id is in the ledger, even though they did nothing today.

---

## Root cause (likely)

- **Completion is keyed only by (assignment, schedule_id), not by calendar date.**
- So “Monday” is shown as completed if **that** Monday’s schedule slot was ever completed (e.g. last week), not if they completed a workout **today**.

Additional possibility:

- If the program has **only one week** in `program_schedule` (e.g. only `week_number = 1` with 7 days), then there is a single schedule_id per weekday. Completing “Monday” once marks that one Monday forever; every calendar Monday will show as completed.

---

## What to confirm with the query results

1. From **Query 1:**  
   For the Monday that shows as completed, note its `program_schedule_id` and `completed_at`.  
   - If `completed_at` is **not** today → that explains the bug (we show “completed” from a past date).
2. From **Query 1** (schedule shape):  
   Count distinct `(week_number, day_number)` for this program.  
   - If there is only one week (e.g. 7 rows total), then “Monday” is the same schedule_id every week.
3. From **Query 2:**  
   Confirm there is no `workout_log` with `started_at`/`completed_at` today → confirms “client hasn’t done any workout today”.

---

## Suggested fix (product decision)

**Option A — “Completed for today” = completed on calendar today**

- For the **today** slot only, treat it as completed only if:
  - there is a completion for that slot’s `program_schedule_id`, **and**
  - `completed_at` is **today** (client’s date).
- Implementation: extend RPC or mapper to expose `completed_at` per completion; in the Train page, for the card that is “today”, set `isCompleted = completedScheduleIds.has(slot.id) && completedAtForSlotIsToday(slot.id)`.

**Option B — Keep “ever completed” but clarify in UI**

- Keep current logic (completed = schedule_id in ledger).
- Make the UI explicit, e.g. “Completed [date]” or “Done earlier this week” so users don’t think the checkmark means “I did this today”.

**Option C — “Completed this week”**

- For the today slot, show completed only if there is a completion for that schedule_id with `completed_at` in the current week (e.g. Monday–Sunday).  
  Same idea as A but with a week window.

Once you have the query results and choose A, B, or C, we can implement the chosen behavior in the RPC/mapper and Train page.

---

## Implemented fix (Option A — current program week)

- **RPC:** `get_train_page_data` now returns `assignmentStartDate` (assignment `created_at`). Completions already include `completed_at`. Run migration **`20260316_train_page_completion_current_week.sql`** in Supabase.
- **Mapper:** `trainPageDataMapper.ts` builds `completedScheduleIdsCurrentWeek`: only completions whose `completed_at` falls in the current program week (Monday–Sunday of that week). Day card `isCompleted` and overdue slots use this set. `computeUnlockedWeekMax`, `nextSlot`, and `completedCount` still use **all-time** completions.
- **completeWorkoutService:** Fallback schedule lookup now uses `program_progress.current_week_number` and `.eq('week_number', currentWeek)` so the correct week’s schedule slot is resolved.

---

## Extra: completion fallback and wrong schedule_id

In `completeWorkoutService.ts`, when the workout_log has no `program_assignment_id` / `program_schedule_id`, the fallback resolves schedule by:

- `program_day_assignments` → `day_number`
- then `program_schedule` with `.eq('program_id', …).eq('day_number', pda.day_number).maybeSingle()`

Previously it used **day_number only**, not **week_number**. This was fixed: the fallback now reads `program_progress.current_week_number` and uses `.eq('week_number', currentWeek)` in the program_schedule lookup.

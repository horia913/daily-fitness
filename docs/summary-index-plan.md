## Summary Route Index Plan + SQL

Scope: `/api/client/workouts/summary`

Verification source:

- Table/column existence verified against `Supabase Snippet Public Schema Column Inventory.csv`.
- Step names match Server-Timing step names from the route.

Top 5 slow steps (from latest Server-Timing line you provided):

1. `workout_assignments` ~2205ms
2. `program_assignment_progress` ~2017ms
3. `workout_logs` ~2184ms
4. `completed_programs` ~2198ms
5. `program_assignments` ~2238ms

Notes on step name vs table:

- `program_schedule_week` is a step name; the actual table is `program_schedule`.
- `program_template_blocks` is a step name; the actual table is `workout_blocks`.
- `program_assignment_with_program` uses `program_assignments` with a foreign select on `workout_programs`.

Index plan (exact query shapes and matching indexes):

1. **workout_assignments**

- Table: `workout_assignments`
- Filters: `client_id = ?`
- Order / Limit: `order scheduled_date desc`
- Index: composite on `(client_id, scheduled_date)`
- Why: matches filter + ordering.

2. **program_assignment_progress**

- Table: `program_assignment_progress`
- Filters: `client_id = ?`, `is_program_completed = ?`
- Order / Limit: `order created_at desc`, limit 1
- Index: composite on `(client_id, is_program_completed, created_at)`
- Why: matches equality filters + ordering.

3. **workout_logs**

- Table: `workout_logs`
- Filters: `client_id = ?`, `completed_at IS NOT NULL`
- Order / Limit: `order completed_at desc`, limit 100
- Index: composite on `(client_id, completed_at)`
- Why: matches filter + ordering.

4. **completed_programs**

- Table: `rpc:get_completed_programs`
- Filters: `p_client_id`
- Order / Limit: none
- Index: **blocked** until the RPC definition is inspected in Supabase.
- Why: index targets must match the tables/filters inside the RPC; no guessing allowed.

5. **program_assignments**

- Table: `program_assignments`
- Filters: `client_id = ?`
- Order / Limit: `order created_at desc`
- Index: composite on `(client_id, created_at)`
- Why: matches filter + ordering.

Additional existing plan items still valid:

- `program_workout_completions` → `(assignment_progress_id, week_number)`
- `program_template_blocks` → `(template_id)` on `workout_blocks`
- `client_program_rules` → `(program_assignment_id, week_number, block_id, block_order, exercise_order)`
- `program_schedule_week` → `(program_id, week_number, day_of_week)`
- `program_assignment_with_program` → `(program_id, client_id)` on `program_assignments`

SQL (see `supabase/sql/summary_route_indexes.sql`):

- Uses `CREATE INDEX CONCURRENTLY` for safe online index creation.
- Run each statement in Supabase SQL editor (not inside a transaction).

Rollback:

- See the drop statements in `supabase/sql/summary_route_indexes.sql`.

How to verify impact (short):

- Enable `DEBUG_HARNESS=true` and reload `/client/workouts`.
- In the server logs, capture the `Server-Timing` header (or `[summary timing]` logs).
- Compare durations for the mapped step names below before vs after.
- Success criteria: each step’s duration drops and total route time decreases.

Server-Timing → Index mapping (with confirmation steps):

1. **workout_assignments**

   - Index: `idx_workout_assignments_client_scheduled_date`
   - Expect: `workout_assignments` duration to drop.
   - Confirm: compare the `workout_assignments` `dur=` value.

2. **program_assignment_progress**

   - Index: `idx_program_assignment_progress_client_completed_created`
   - Expect: `program_assignment_progress` duration to drop.
   - Confirm: compare the `program_assignment_progress` `dur=` value.

3. **workout_logs**

   - Index: `idx_workout_logs_client_completed_at`
   - Expect: `workout_logs` duration to drop.
   - Confirm: compare the `workout_logs` `dur=` value.

4. **completed_programs**

   - Index: blocked until RPC definition is known.
   - Confirm: inspect function SQL in Supabase and map filters to indexes.

5. **program_assignments**
   - Index: `idx_program_assignments_client_created_at`
   - Expect: `program_assignments` duration to drop.
   - Confirm: compare the `program_assignments` `dur=` value.

Also mapped from prior plan: 6) **program_workout_completions** → `idx_program_workout_completions_assignment_week` 7) **program_template_blocks** → `idx_workout_blocks_template_id` 8) **client_program_rules** → `idx_client_program_rules_assignment_week_block_order` 9) **program_schedule_week** → `idx_program_schedule_program_week_day` 10) **program_assignment_with_program** → `idx_program_assignments_program_client`

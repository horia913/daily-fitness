## Summary Route Query Report

Route: `/api/client/workouts/summary`

Each DB call (ordered by step name as logged in Server-Timing):

1) **workout_assignments**
- Table: `workout_assignments`
- Select: `id, workout_template_id, assigned_date, scheduled_date, status, name, description, coach_id, created_at`
- Filters: `eq(client_id)`
- Order / Limit: `order scheduled_date desc`, no limit
- Joins: none
- Index candidates (plain English): index on `client_id` and `scheduled_date` to support filter + sort.

2) **program_assignment_progress**
- Table: `program_assignment_progress`
- Select: `id, assignment_id, program_id, current_week, current_day`
- Filters: `eq(client_id), eq(is_program_completed)`
- Order / Limit: `order created_at desc`, limit 1 (maybeSingle)
- Joins: none
- Index candidates (plain English): index on `client_id` and `is_program_completed`, include `created_at` for sort.

3) **program_assignments**
- Table: `program_assignments`
- Select: `id, start_date, status, program_id, coach_id, name, description, duration_weeks`
- Filters: `eq(client_id)`
- Order / Limit: `order created_at desc`, no limit
- Joins: none
- Index candidates (plain English): index on `client_id` and `created_at` for filter + sort.

4) **workout_logs**
- Table: `workout_logs`
- Select: `id, workout_assignment_id, completed_at, total_duration_minutes, total_weight_lifted`
- Filters: `eq(client_id), not(completed_at is null)`
- Order / Limit: `order completed_at desc`, limit 100
- Joins: none
- Index candidates (plain English): index on `client_id` and `completed_at` to support filter + sort.

5) **completed_programs**
- Table: `rpc:get_completed_programs`
- Select: RPC result set
- Filters: `p_client_id`
- Order / Limit: none
- Joins: none
- Index candidates (plain English): depends on RPC internal queries; review RPC definition to target filters used there.

6) **template_blocks**
- Table: `workout_blocks`
- Select: `id, block_type, total_sets`
- Filters: `eq(template_id)`
- Order / Limit: none
- Joins: none
- Index candidates (plain English): index on `template_id`.

7) **template_block_exercises**
- Table: `workout_block_exercises`
- Select: `block_id, exercise_id, exercise_order, sets`
- Filters: `in(block_id)`
- Order / Limit: none
- Joins: none
- Index candidates (plain English): index on `block_id`.

8) **template_drop_sets**
- Table: `workout_drop_sets`
- Select: `block_id, exercise_id, exercise_order`
- Filters: `in(block_id)`
- Order / Limit: none
- Joins: none
- Index candidates (plain English): index on `block_id`.

9) **template_cluster_sets**
- Table: `workout_cluster_sets`
- Select: `block_id, exercise_id, exercise_order`
- Filters: `in(block_id)`
- Order / Limit: none
- Joins: none
- Index candidates (plain English): index on `block_id`.

10) **template_rest_pause_sets**
- Table: `workout_rest_pause_sets`
- Select: `block_id, exercise_id, exercise_order`
- Filters: `in(block_id)`
- Order / Limit: none
- Joins: none
- Index candidates (plain English): index on `block_id`.

11) **template_time_protocols**
- Table: `workout_time_protocols`
- Select: `block_id, exercise_id, exercise_order`
- Filters: `in(block_id)`
- Order / Limit: none
- Joins: none
- Index candidates (plain English): index on `block_id`.

12) **template_hr_sets**
- Table: `workout_hr_sets`
- Select: `block_id, exercise_id, exercise_order`
- Filters: `in(block_id)`
- Order / Limit: none
- Joins: none
- Index candidates (plain English): index on `block_id`.

13) **program_schedule_week**
- Table: `program_schedule`
- Select: `id, program_id, week_number, day_of_week, template_id`
- Filters: `eq(program_id), eq(week_number)`
- Order / Limit: `order day_of_week asc`, no limit
- Joins: none
- Index candidates (plain English): index on `program_id` and `week_number`, include `day_of_week` for sort.

14) **program_workout_completions**
- Table: `program_workout_completions`
- Select: `program_day`
- Filters: `eq(assignment_progress_id), eq(week_number)`
- Order / Limit: none
- Joins: none
- Index candidates (plain English): index on `assignment_progress_id` and `week_number`.

15) **program_schedule_next_week**
- Table: `program_schedule`
- Select: `id, program_id, week_number, day_of_week, template_id`
- Filters: `eq(program_id), eq(week_number)`
- Order / Limit: `order day_of_week asc`, limit 1 (maybeSingle)
- Joins: none
- Index candidates (plain English): same as program_schedule_week (program_id + week_number + day_of_week).

16) **program_schedule_fallback**
- Table: `program_schedule`
- Select: `id, program_id, week_number, day_of_week, template_id`
- Filters: `eq(program_id), eq(week_number)`
- Order / Limit: `order day_of_week asc`, limit 1 (maybeSingle)
- Joins: none
- Index candidates (plain English): same as program_schedule_week (program_id + week_number + day_of_week).

17) **program_template_blocks**
- Table: `workout_blocks`
- Select: `id`
- Filters: `eq(template_id)`
- Order / Limit: none
- Joins: none
- Index candidates (plain English): index on `template_id`.

18) **client_program_rules**
- Table: `client_program_progression_rules`
- Select: `id, week_number, block_order, exercise_id, exercise_order, exercise_letter, sets, reps, rest_seconds, notes, block_id`
- Filters: `eq(program_assignment_id), eq(week_number), in(block_id)`
- Order / Limit: `order block_order asc, exercise_order asc`, no limit
- Joins: none
- Index candidates (plain English): index on `program_assignment_id` + `week_number` + `block_id`; include `block_order`, `exercise_order` for ordering.

19) **program_assignment_with_program**
- Table: `program_assignments` with foreign select `workout_programs`
- Select: `program:workout_programs(id, name, description, duration_weeks, difficulty_level, coach_id)`
- Filters: `eq(program_id), eq(client_id)`
- Order / Limit: `maybeSingle`
- Joins: foreign select `workout_programs`
- Index candidates (plain English): index on `program_assignments` with `program_id` + `client_id`.

20) **coach_profiles**
- Table: `profiles`
- Select: `id, first_name, last_name, avatar_url`
- Filters: `in(id)`
- Order / Limit: none
- Joins: none
- Index candidates (plain English): primary key index on `id` is sufficient for `in(id)` lookup.

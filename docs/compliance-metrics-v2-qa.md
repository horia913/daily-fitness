# Compliance Metrics v2 — Manual QA & Regression Checklist

Use this checklist when testing the compliance alignment (feature/compliance-metrics-v2).

## Acceptance scenarios

### 1. Structural 100%, time 100%, week completed true
- **Setup:** Client on a program; current week has 4 assigned slots. Complete all 4 workouts within 7 days of the program week start (rolling from `program_assignments.start_date`).
- **Verify:** Client workout summary returns `todaysWorkout.weekCompleted === true`, `todaysWorkout.currentWeek` set. Client workouts screen shows “Week N Complete!” when applicable. Coach compliance shows 100% workout (structural) for that client.

### 2. Structural 100%, time 85%, week completed true
- **Setup:** Same 4 assigned slots; complete all 4 but take 10 days from week start (UTC).
- **Verify:** `weekCompleted` true; time adherence 85 (decay table). Coach view (if time adherence is shown) shows 85%.

### 3. Structural 50%, time N/A, week completed false
- **Setup:** 4 assigned, 2 completed.
- **Verify:** `weekCompleted` false; structural 50%; time adherence null. No “Week Complete” card.

### 4. Duplicate completions
- **Verify:** DB UNIQUE(program_assignment_id, program_schedule_id) prevents double-completion. In-code cap ensures completed never exceeds assigned.

### 5. Coach override
- **Setup:** Insert row into `program_week_time_override` for (program_assignment_id, week_number), set_by = coach, set_at = now(), override_time_score = 100.
- **Verify:** For that week, time adherence = 100; structural unchanged. Override does not mark workouts complete.

### 6. Multi-week programs
- **Verify:** Metrics are per week_number. Changing completions in week 1 does not affect week 2 metrics.

## Regression

- **Completion flow:** Start workout → log sets → complete workout once. No crash; one completion recorded; progress advances.
- **No breaking schema changes:** Existing tables unchanged; only additive `program_week_time_override`.
- **Screens load:** Client workouts screen loads; coach compliance/adherence screens load. Calendar-week dashboard stats (e.g. get_client_dashboard weekly goal/current) unchanged; if shown alongside program metrics, ensure labeling is clear.

## Quick commands

- Run migration: apply `migrations/20260210_program_week_time_override.sql` to your Supabase project.
- Client summary: `GET /api/client/workouts/summary` (authenticated as client) — response should include `todaysWorkout.weekCompleted` and `todaysWorkout.currentWeek` when client has an active program.

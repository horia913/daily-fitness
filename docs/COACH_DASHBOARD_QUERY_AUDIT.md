# Coach Dashboard — Data and Query Audit

The coach dashboard page (`/coach/page.tsx`) loads data via **one API call**: `GET /api/coach/dashboard`.

The API runs two flows in parallel:

1. **getMorningBriefing(coachId, supabase)** — builds stats, alerts, and client summaries.
2. **getControlRoomResult(supabase, coachId)** — builds control room signals (e.g. program compliance %).

---

## 1. getMorningBriefing — Supabase queries (in order)

| # | Table / source | Purpose |
|---|----------------|---------|
| 1 | `clients` | All coach's clients (client_id, status) |
| 2 | `profiles` | Names/avatars for all client IDs |
| 3 | `workout_logs` | Workouts completed today (client_id, completed_at) for today's date range |
| 4 | `daily_wellness_logs` | Check-ins today (client_id, log_date) for today |
| 5 | `daily_wellness_logs` | Recent wellness (client_id, log_date, sleep_hours, stress_level, soreness_level) last 3 days |
| 6 | `daily_wellness_logs` | Week wellness (client_id, log_date) for current week |
| 7 | `workout_logs` | Last workout per client (client_id, completed_at) ordered by completed_at desc |
| 8 | `daily_wellness_logs` | Last check-in per client (client_id, log_date) ordered by log_date desc |
| 9 | `program_assignments` | Active programs (client_id, id, program_id, start_date, duration_weeks) |
| 10 | `meal_plan_assignments` | Active meal plans (client_id) |
| 11 | `athlete_scores` | Latest score per client (client_id, score) |
| 12 | `workout_assignments` | Recent assignments (id, client_id, scheduled_date, status) last 7 days |
| 13 | `clients` | Client created_at (client_id, created_at) |
| 14 | `daily_wellness_logs` | All-time wellness log dates (for “ever checked in”) |
| 15 | `program_progress` | current_week_number per program_assignment_id (for compliance) |
| 16 | `program_schedule` | Slots (id, program_id, week_number, day_number, is_optional) |
| 17 | `program_day_completions` | Completions (program_assignment_id, program_schedule_id) |
| 18 | `workout_logs` | Completed logs by workout_assignment_id (for missed-workout alerts) |
| 19 | `check_in_configs` | frequency_days per client (coach_id, client_id) |
| 20 | `body_metrics` | Last measured_date per client (client_id, measured_date) |
| 21 | `user_achievements` | Recent achievements (client_id, tier, earned_at, achievement_templates.name) last 24h |

So **getMorningBriefing** does **21 Supabase queries** (some conditional on data).

---

## 2. getControlRoomResult — Supabase queries

| # | Table | Purpose |
|---|-------|---------|
| 1 | `clients` | Coach's client_id list |
| 2 | `program_assignments` | Active assignments (id, client_id, program_id, updated_at) |
| 3 | `program_progress` | current_week_number per assignment |
| 4 | `program_schedule` | Slots (id, program_id, week_number, day_number, is_optional) |
| 5 | `program_day_completions` | program_assignment_id, program_schedule_id |

So **getControlRoomResult** does **5 queries**.

---

## 3. Total per dashboard load

- **1** HTTP request from the page to `/api/coach/dashboard`.
- **~26–28** Supabase queries inside the API (21 in briefing + 5 in control room; some steps are conditional).

The single RPC **get_coach_dashboard** replaces all of these with **one** database round-trip.

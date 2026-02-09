# Backend–Frontend Mapping: Client Workout Flow

Used to ensure UI changes do not break data flow. Do not change payloads, params, or table usage without this context.

---

## 1. Workout details (`/client/workouts/[id]/details`)

**Route param:** `id` = workout assignment ID (or template ID for fallback).

**Data sources:**
- `supabase.auth.getUser()` — current user.
- `workout_assignments` — by `id` + `client_id`, or fallback by `workout_template_id` + `client_id` (latest).
- `workout_templates` — `category`, `estimated_duration` by assignment’s `workout_template_id`.
- `program_assignment_progress` — optional `current_week` for client (one row, not completed).
- `WorkoutBlockService.getWorkoutBlocks(workout_template_id)` — builds blocks from `workout_blocks` + special tables (exercises, drop_sets, etc.). Read-only.
- `fetchPersonalRecords(user.id)` — from `@/lib/personalRecords` for PR badges.

**Outbound:** None (read-only). Navigate to `/client/workouts/{assignment.id}/start` to begin.

**Key IDs:** `assignment.id` (assignment UUID) is used for start/complete. Do not remove or rename.

---

## 2. Workouts list (`/client/workouts`)

**Component:** `EnhancedClientWorkouts` with `clientId={user?.id}`.

**Data sources:**
- `supabase`: `workout_assignments`, `workout_templates`, `workout_logs`, `program_assignments`, `program_assignment_progress`, `coaches`, `workout_sessions`, various aggregates.
- `fetchApi("/api/client/workouts/summary")` — workout summary.
- `fetchApi("/api/program-workouts/start-from-progress", ...)` — start program workout.
- Helpers: `getCurrentWorkoutFromProgress`, `getProgramMetrics`.

**Outbound:** Start workout → navigate to start page or call start-from-progress API. Do not change API payloads.

---

## 3. Start workout (`/client/workouts/[id]/start`)

**Route param:** `id` = assignment ID.

**Data sources:**
- `supabase.auth.getUser()`.
- Supabase for assignment/session/block state (exact tables in start page).
- `fetchApi("/api/program-workouts/start", ...)` — when starting from program.
- `fetchApi("/api/log-set", ...)` — log set (weight, reps, etc.).
- `fetchApi("/api/block-complete", ...)` — mark block complete.

**Outbound:** POST to `/api/log-set`, `/api/block-complete`, `/api/program-workouts/start`. Do not change request body shapes.

---

## 4. Complete workout (`/client/workouts/[id]/complete`)

**Route params:** assignment id and optional overrides (workout_log_id, session_id, etc.).

**Data sources:**
- `supabase.auth.getUser()`.
- `workout_logs` — by id, or by workout_assignment_id + client_id (completed or in-progress). May create a new workout_log if none.
- `fetchApi("/api/complete-workout", { body: { workout_log_id, client_id, duration_minutes, session_id } })`.

**Outbound:** POST `/api/complete-workout` with `workout_log_id`, `client_id`, `duration_minutes`, `session_id`. Do not change.

---

## 5. Client dashboard workout block (`/client`)

**Data source:** `fetch("/api/client/dashboard", { credentials: "include" })` — single API. Response includes `todaysWorkout`, `weeklyProgress`, `weeklyStats`, etc.

**Outbound:** None for workout block. "Start Workout" links to `/client/workouts/{id}/start` or program flow. Do not change dashboard API contract or link targets.

# Workout Completion Rules

## Completion Target

A workout completion always targets a specific `workout_assignment_id`.
The completion API (`/api/complete-workout`) requires a `workout_log_id` which is linked to exactly one `workout_assignment_id`.

## Idempotency Guarantees

### Server-side (completeWorkoutService)

- Before completing, the service checks `workout_log.completed_at`.
- If already set, it returns `{ alreadyCompleted: true }` without modifying any data.
- This prevents duplicate totals calculations and duplicate program progression.

### Client-side (complete/page.tsx)

- A `completionDoneRef` guard ensures `updateWorkoutTotals` runs only once per page load.
- If the `workoutLogIdOverride` effect fires after completion already succeeded, it skips.
- `markWorkoutComplete` checks `assignment.status === "completed"` before updating.

### workout_log Creation

- `workout_log` rows are created ONLY by the set-logging flow (`/api/log-set`) during the workout.
- The complete page does NOT create workout_logs. If none is found, it shows an error with retry.
- The `/api/log-set` route reuses existing active logs for the same `workout_assignment_id`.

### localStorage Handoff

- The start page writes completion data to localStorage (`workoutLogIdForComplete`, `workoutSessionIdForComplete`, `workoutDurationMinutes`, `workoutStartTime`).
- The complete page reads all keys into state and clears them from localStorage immediately on mount.
- This prevents stale retries and multi-tab duplicates.

## Loading Safety

- The `/api/complete-workout` call is wrapped in `withTimeout(15000)`.
- If it times out or fails, `loadError` is set and a retry button is shown.
- The start page "Complete Workout" button stays disabled during navigation. A 15s safety timeout resets it if navigation stalls.

---

## Manual Regression Checklist

- [ ] Completing a workout twice does not duplicate workout_logs
- [ ] Refreshing after completion does not create duplicates
- [ ] "Complete Workout" button never stays loading indefinitely (15s max)
- [ ] Completed workout screen remains visible after data loads
- [ ] Workout list loads same assignments as dashboard
- [ ] Workout list shows error + retry on failure (both RPC and legacy paths)
- [ ] Opening completion page in a second tab does not re-trigger completion

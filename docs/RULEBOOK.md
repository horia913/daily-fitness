## Stability + Security + Performance Rulebook

Priority order: SECURITY > STABILITY/CORRECTNESS > UX > PERFORMANCE

- Never weaken RLS; never rely on frontend filtering for security.
- Never fix performance by broadening queries or removing ownership filters.
- No request storms: no Supabase queries in loops; no polling on client workout routes.
- Any change must preserve existing working features; if unsure, add instrumentation first.
- Do not retry 400. Retry 401/403 once after refresh. Backoff retry for network errors.
- Use offline/workout mode guard to disable background prefetch/polling on live workout routes.

---

## Block completion & workout log resolution

### `/api/block-complete` contract

- **Payload:** Must support both:
  - `workout_log_id` (optional)
  - `workout_assignment_id` (required when `workout_log_id` is missing)
- When `workout_log_id` is missing, the API must resolve or create today's active `workout_log` using `(auth.uid(), workout_assignment_id)` before writing to `workout_block_completions`.
- **Response:** Must always return the resolved or created `workout_log_id`.

### Client: `handleBlockComplete`

- After a successful `/api/block-complete` response, persist the log id so timer-only workouts don't create multiple logs and restore is stable:
  - `if (!workoutLogId && res.workout_log_id) setWorkoutLogId(res.workout_log_id)`.

---

## Complete Workout button (freeze prevention)

- **UX:** Use a loading state and disable the button while completing (e.g. `isCompletingWorkout`); show “Completing…” or spinner.
- **Double-submit guard:** In addition to the disabled button, add a guard **inside** `completeWorkout()` (early return or `useRef`) so a second call while the first is in flight does nothing. The guard must be in the function body, not only in the button handler.
- **Errors:** On failure, surface to the user (toast or message) and re-enable the button for retry.

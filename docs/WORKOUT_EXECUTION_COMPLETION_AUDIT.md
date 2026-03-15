# Critical Audit: Workout Execution and Completion Pages (Read-Only)

## 1. "Complete Workout" button on `/client/workouts/[id]/start`

### What function runs when the button is clicked?

**Handler:** `completeWorkout` (async function defined in the same page).

**Exact code (button):**

```tsx
// Lines 4203–4230 (block-system path)
{isLastBlockComplete && currentBlockIndex === workoutBlocks.length - 1 && (
  <div className="mt-6">
    <PrimaryButton
      disabled={isCompletingWorkout}
      onClick={async () => {
        console.log("🔘 Complete Workout button clicked");
        setShowWorkoutCompletion(false);
        await completeWorkout();
      }}
      className="w-full h-14 text-lg font-semibold disabled:opacity-70 disabled:pointer-events-none"
    >
      {isCompletingWorkout ? (
        <>
          <Loader2 className="w-6 h-6 animate-spin" />
          Completing…
        </>
      ) : (
        <>
          <CheckCircle className="w-6 h-6" />
          Complete Workout
        </>
      )}
    </PrimaryButton>
  </div>
)}
```

There is also a second UI path (modal) around line 7840 that calls `completeWorkout()` when the user confirms completion.

### What API does it call?

**None directly.** The start page does **not** call `/api/complete-workout`. It:

1. Checks `isCompletingWorkoutRef.current` (double-click guard).
2. Gets auth (getSession / getUser).
3. Writes to **localStorage**: `workoutDurationMinutes`, `workoutStartTime`, `workoutLogIdForComplete` (or from `sessionId` with `restored-` prefix), and optionally `workoutSessionIdForComplete`.
4. **Navigates** with `router.push(\`/client/workouts/${completeTargetId}/complete\`)`.
5. Optionally **updates** `workout_sessions` in the background (status `completed`, `completed_at`) for the current `sessionId` — fire-and-forget, no await.

The **completion page** is the one that calls **POST `/api/complete-workout`** when it loads and finds an incomplete `workout_log`.

### What state does it check before allowing the click?

- **`disabled={isCompletingWorkout}`** — button is disabled while completing.
- **Inside `completeWorkout()`:**  
  `if (isCompletingWorkoutRef.current) return;` then `isCompletingWorkoutRef.current = true` and `setIsCompletingWorkout(true)` so a second click is ignored (ref guard even if state hasn’t updated yet).

### What happens after (navigation)?

- **Immediate navigation:** `router.push(\`/client/workouts/${completeTargetId}/complete\`)` so the user goes to the completion page. No waiting for the optional `workout_sessions` update.
- **Safety net:** A 15s timeout resets `isCompletingWorkoutRef` and `isCompletingWorkout` and shows a toast so the user can retry if navigation never happens (e.g. tab backgrounded).
- **Visibility change:** On tab return, if completion started >20s ago, the ref/state are reset and a toast suggests tapping again or opening the completion link.

### Double-click guard?

- **Ref guard:** `if (isCompletingWorkoutRef.current) return;` at the start of `completeWorkout`.
- **Button:** `disabled={isCompletingWorkout}` and `disabled:pointer-events-none` in the class.
- **Reset:** In `finally` (and on 15s timeout / visibility reset), `isCompletingWorkoutRef.current = false` and `setIsCompletingWorkout(false)`.

---

## 2. Completion page `/client/workouts/[id]/complete` — data loading and “submit”

### How does it get the workoutLogId?

**Resolution order inside `updateWorkoutTotals`:**

1. **Override from localStorage (preferred):**  
   On mount, an effect reads `workoutLogIdForComplete` and `workoutSessionIdForComplete` from localStorage, sets `workoutLogIdOverride` / `workoutSessionIdOverride`, then **clears** those keys immediately.
2. **Effective IDs:**  
   `effectiveWorkoutLogId = workoutLogIdOverrideParam || workoutLogIdOverride || null`  
   `effectiveAssignmentId = assignmentIdOverride || resolvedAssignmentId || assignment?.id || null`
3. **Lookup:**
   - If `effectiveWorkoutLogId`: fetch `workout_logs` by `id` and `client_id` → `workoutLog`.
   - Else if `workoutSessionIdOverride`: fetch `workout_logs` by `workout_session_id` and `client_id` → `workoutLog`.
   - Else if `effectiveAssignmentId`: fetch **completed** log for that assignment (most recent `completed_at`), or if none then **incomplete** log for that assignment (most recent `started_at`); use that as `workoutLog`.
4. **workoutLogId** used for the rest of the flow is `workoutLog?.id`.

So **workoutLogId** comes from: (1) handoff from start page via localStorage, or (2) session id, or (3) assignment id (completed or active log).

### What happens if the workout log doesn’t exist or is already completed?

- **No log found:**  
  If after all lookups `!workoutLogId`:
  - `setLoadError("Could not find workout data. Your sets may already be saved — try Retry or go back to Training.")`  
  - `setLoading(false)`  
  - **Return** — no call to `/api/complete-workout`, no new log created. Comment in code: *"workout_logs are created by the set-logging flow (/api/log-set) during the workout. Creating one here would cause duplicates."*

- **Log exists and already completed (`workoutLog?.completed_at`):**  
  Completion page only **displays** data: sets stats from the existing log, calls `loadBlocksAndSets(workoutLogId, user.id)`, sets `completionDoneRef.current = true`. It does **not** call `/api/complete-workout`.

- **Log exists and not completed:**  
  It **calls POST `/api/complete-workout`** with `workout_log_id`, `client_id`, `duration_minutes`, `session_id`; then updates UI from the response and loads blocks/sets.

### What API does the “Submit” button call?

There is **no separate “Submit” button** that posts to the API. The completion page **automatically** calls **POST `/api/complete-workout`** inside `updateWorkoutTotals` when it finds an **incomplete** workout log (see above). The only explicit action is **Retry**, which re-runs `loadAssignment()` then `updateWorkoutTotals(...)`, which may again call `/api/complete-workout` if the log is still incomplete.

### What does `/api/complete-workout` check before completing?

**Route** (`/api/complete-workout/route.ts`):

- **Auth:** `validateApiAuth(req)` (user must be authenticated).
- **Body:** `validateRequiredFields(body, ['workout_log_id', 'client_id'])`.
- **Ownership:** `validateOwnership(user.id, client_id)` — `client_id` must equal authenticated user.

**Service** (`completeWorkoutService`):

1. **Fetch workout_log** by `workoutLogId` and `client_id`; if missing or error → throw `"Workout log not found: ${workoutLogId}"` (API returns 404).
2. **Idempotency:** If `workoutLog.completed_at` is already set → return `{ alreadyCompleted: true, workoutLog }`; API returns 200 with `already_completed: true`, no DB update.
3. Then: fetch set logs, compute totals, update `workout_logs` (completed_at, totals), optionally update `workout_sessions`, handle program progression/achievements/leaderboard.

So before writing: **ownership** (log’s `client_id` = authenticated user) and **not already completed** (idempotency).

---

## 3. Duplicate workout log prevention

### When does the app create a `workout_logs` row?

- **On start (program flow):**  
  **POST `/api/program-workouts/start-from-progress`** can create a new session and a new **workout_log** in STEP 4 when there is **no** existing in-progress session and **no** existing incomplete log for that (client, program_assignment_id, program_schedule_id). So creation happens at **start** for program workouts when not resuming.

- **On first set log (log-set flow):**  
  **POST `/api/log-set`** can create a **workout_log** when `workout_log_id` is not provided: it looks for an existing incomplete log for the given `workout_assignment_id` and `client_id`; if none, it **inserts** a new row. So creation can happen on **first set log** (or when block-complete creates/resolves a log).

So: **workout_log** is created either at **workout start** (start-from-progress) or at **first log** (log-set / block-complete), depending on flow.

### Is there a unique constraint preventing two logs for the same session?

- **Schema (Supabase inventory):**  
  `workout_logs` has **PRIMARY KEY (id)** and **FOREIGN KEY** to `workout_assignments` and `workout_sessions`. There is **no** UNIQUE constraint on `(client_id, workout_assignment_id, completed_at)` or `(workout_session_id)` in the provided schema.

- So the DB does **not** enforce “one log per session” or “one incomplete log per assignment”. Duplicate prevention is **in application logic**: start-from-progress and log-set both **look for an existing incomplete log** and reuse it or create only when none is found.

### If the user starts, leaves, comes back, and taps “Start” again — new log or reuse?

- **Program workout (start-from-progress):**
  - STEP 3a: Look for **workout_sessions** with same `client_id`, `program_assignment_id`, `program_schedule_id`, `status = 'in_progress'`.
  - If found and **not stale** (< 24h): return existing `assignment_id` and `session_id` (**reuse**), no new log.
  - If found but **stale** (≥ 24h): session and matching incomplete log are closed (abandoned), then fall through to create new.
  - STEP 3b: If no session, look for **workout_logs** with same program keys and `completed_at IS NULL`.
  - If found and not stale: return that assignment (**reuse** log).
  - If not found (or stale): STEP 4 creates **new** assignment, session, and **workout_log**.

So: **reuse** when there is a non-stale in-progress session or incomplete log for that program day; **new** when none or when stale (24h).

---

## 4. `workout_sessions` lifecycle

### What statuses exist?

- From **start-from-progress** and **start page** usage:
  - **`in_progress`** — default when creating a session; used when resuming.
  - **`completed`** — set when workout is completed (start page updates session in background; complete-workout service also updates when `session_id` is provided).

- Schema default: `status` text, default `'in_progress'`. There is **no** enum or CHECK in the snippet; in code, only `in_progress` and `completed` are used. **Abandoned** is represented by closing the session (e.g. `status = 'completed'`, `completed_at = started_at`) and optionally closing the related incomplete log, not a separate status value.

### Is there a unique constraint on (client_id, status='in_progress')?

- **Schema (constraints file):**  
  `workout_sessions` is listed with **PRIMARY KEY (id)** only. There is **no** UNIQUE on `(client_id, status)` or partial unique for `status = 'in_progress'`.

- So the DB **does not** enforce “one in-progress session per client”. The app avoids duplicates by **querying** for an in-progress session for the **same program day** (client_id + program_assignment_id + program_schedule_id) and reusing it.

### What happens when the user returns to the workout after a tab switch?

- **Start page:**  
  If they left during “Complete Workout”, a visibility handler (after 20s) resets the completion ref/state and shows a toast; they can tap “Complete Workout” again or open the completion URL. The session and log are unchanged; completion page will still find the log (by override or assignment) and call complete-workout.

- **Session validity:**  
  - If they come back to the **start** URL and the app calls **start-from-progress** again: the same in-progress session / incomplete log for that program day is found and **reused** (same assignment/session/log), so no duplicate.
  - Sessions older than **24 hours** are treated as stale: they are closed and a **new** session (and log) is created on next start. So after 24h, the old session is no longer “valid” for reuse.

---

## 5. Guards summary

| Concern | Guard |
|--------|--------|
| **Double completion (button twice)** | Start: `isCompletingWorkoutRef` + `disabled={isCompletingWorkout}`; API: service checks `workoutLog.completed_at` and returns idempotent 200 without updating. |
| **Duplicate workout logs** | No DB UNIQUE. App: start-from-progress and log-set both look for existing incomplete log/session for the same context and **reuse** or create only when none found. |
| **Stale session after tab return** | Sessions (and orphan logs) older than **24h** are auto-closed in start-from-progress; new start then creates a fresh session/log. Reuse only for non-stale. |
| **Missing workout log on completion page** | Completion page does **not** create a log. It sets load error and shows “Could not find workout data… try Retry or go back to Training.” Retry re-runs load + updateWorkoutTotals; if log was created later (e.g. by another tab), next load could find it. |

---

## Code references (file:line)

- Start page complete button and handler: `src/app/client/workouts/[id]/start/page.tsx` (e.g. 3343–3474, 4203–4230, 7840).
- Completion page load and updateWorkoutTotals: `src/app/client/workouts/[id]/complete/page.tsx` (e.g. 205–234, 247–525, 780+).
- Complete-workout API: `src/app/api/complete-workout/route.ts` (full file).
- Complete-workout service: `src/lib/completeWorkoutService.ts` (e.g. 93–123, 156–171).
- Start-from-progress (reuse + create): `src/app/api/program-workouts/start-from-progress/route.ts` (e.g. 189–330, 398–417).
- Log-set (create/resolve workout_log): `src/app/api/log-set/route.ts` (e.g. 169–399).
- Schema: `Supabase Snippet Public Schema Column Inventory.csv` and `(1).csv` (workout_logs, workout_sessions — no UNIQUE on in_progress or one-per-session).

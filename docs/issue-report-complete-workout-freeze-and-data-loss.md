# Issue Report: Complete Workout Button Freeze & Apparent Data Loss on Reload

**Report date:** 2025-01-31  
**Reporter:** Client (test user)  
**Scope:** Client workout execution flow (block system), Complete Workout button, and session restore on reload.

---

## 1. Summary

Clients sometimes experience:

1. **Button freeze:** When the “Complete Workout” button appears (after finishing the last block), they cannot press it—the UI feels frozen.
2. **Data loss on reload:** If they reload the app in that state, they feel they “lose all the logs” or that the workout did not count.

This document explains the **investigated causes** and **recommended fixes** before any code changes.

---

## 2. Issue 1: Complete Workout Button “Freeze”

### 2.1 Where the button lives

- **File:** `dailyfitness-app/src/app/client/workouts/[id]/start/page.tsx`
- **Rough location:** ~3754–3771 (inside the block system branch when `useBlockSystem && workoutBlocks.length > 0`).
- The button is shown only when:
  - `isLastBlockComplete === true`, and
  - `currentBlockIndex === workoutBlocks.length - 1`.

### 2.2 Investigated causes

| Cause | Explanation |
|--------|-------------|
| **No loading/feedback on click** | The button’s `onClick` runs `completeWorkout()` (async) but the button is **not** disabled and there is **no** loading spinner or “Completing…” state. If the request is slow (network/Supabase), the user gets no feedback and may assume the app is frozen. |
| **No protection against double submit** | The button stays clickable during the async flow. Multiple taps can trigger multiple `completeWorkout()` runs (e.g. multiple navigations or race conditions). |
| **Heavy re-render when button appears** | When the last block completes, several state updates run: `setWorkoutBlocks`, `setIsLastBlockComplete(true)`, and a `setTimeout` that calls `setCurrentBlockIndex`. The start page is very large (8000+ lines). On low-end or busy devices, the resulting re-render can take hundreds of ms and make the UI feel unresponsive; taps can be missed or delayed. |
| **No user-visible error handling** | If `completeWorkout()` fails (e.g. network error, auth, or Supabase error), the `catch` only logs. The user sees nothing and may think the button “does nothing” or that the app froze. |
| **Overlays** | Rest timer overlay (`RestTimerOverlay`) uses `z-50` and is only driven by `showRestTimer` (used in the **legacy** flow, not the block executor’s own rest modal). So in the block flow this overlay is not the cause. Tabata timer modal correctly cleans up `fc-modal-open` and overflow when closed. No other full-screen overlay was found that would stay on top when the Complete Workout button is visible. |

### 2.3 Root cause (best assessment)

The main reasons the button appears to “freeze” are:

1. **Lack of loading state and double-submit protection** – no feedback and no guard against multiple submissions.
2. **Silent failures** – errors in `completeWorkout()` are not shown to the user.
3. **Possible main-thread jank** – a single very large page re-rendering when the last block completes can make the UI feel stuck on weaker devices.

---

## 3. Issue 2: “Losing All Logs” on Reload

### 3.1 What is actually persisted

- **Set logs (weight, reps, etc.):** Each “Log Set” call goes to `/api/log-set`, which writes to `workout_set_logs` and uses/creates a row in `workout_logs`. So **set-level data is stored in the database** and is **not** lost on reload.
- **Block completion state:** “Block X is complete” is **only in React state**. There is **no** backend field or table that stores “block completed with no sets logged.”

### 3.2 What happens on reload

- On load, the start page:
  1. Resolves the assignment and loads blocks.
  2. Calls `findActiveWorkoutLogForToday()` to find an **incomplete** `workout_log` for today.
  3. If found, calls `restoreWorkoutProgress(workoutLogId, ...)`, which:
     - Fetches **only** `workout_set_logs` for that `workout_log_id`.
     - Infers progress **per block** from those set logs (e.g. counts sets per block/exercise).
     - Sets `isCompleted` per block and `currentBlockIndex` from that inference.

So **restore is entirely driven by `workout_set_logs`**. If a block has **no** set logs, it is always restored as **not** completed.

### 3.3 Why Tabata / EMOM “lose” completion on reload

- For **Tabata**, the user often only taps “Complete Block” (or finishes the timer and completes). That path **does not** call `logSetToDatabase`; it only calls `onBlockComplete(blockId, [])`. So **no** row is written to `workout_set_logs` for that block.
- For **EMOM**, if the user uses “Complete Block” without logging the last minute, again **no** set is logged for that block.

So after reload:

1. The same `workout_log` is found (incomplete, for today).
2. `restoreWorkoutProgress` runs and finds **no** set logs for the Tabata (or EMOM) block.
3. That block is restored with `isCompleted: false`.
4. `isLastBlockComplete` is derived from “every block has `isCompleted === true`,” so it becomes **false**.
5. The “Complete Workout” button **no longer appears**; the user is shown the last block again as incomplete.

From the user’s perspective:

- “I finished the workout and saw the Complete Workout button, but it didn’t work. I reloaded and now the workout is not finished / I lost my progress.”

So the **set logs** (for other blocks) are still in the DB; the **“workout finished” state** is lost because we never persist “block completed with zero sets logged.”

### 3.4 Root cause (best assessment)

- **Block completion is not persisted** for blocks that complete without any set logs (e.g. Tabata “Complete Block”, EMOM “Complete Block”).
- Restore is **only** from `workout_set_logs`, so those blocks are always restored as incomplete and the Complete Workout button disappears after reload.

---

## 4. Best-Practice Solution (Recommended Direction)

### 4.1 Button freeze (Complete Workout)

1. **Add loading state and disable during submit**
   - Introduce e.g. `isCompletingWorkout` (or re-use existing `completing` if already on this page).
   - When the user clicks “Complete Workout”, set it to `true` immediately and disable the button (and optionally show “Completing…” or a spinner).
   - When `completeWorkout()` finishes (success or failure), set it back to `false` so the user can retry if needed.

2. **Guard against double submit**
   - In `completeWorkout()`, return early if already completing (e.g. if `isCompletingWorkout` is true), or use a ref to prevent concurrent runs.

3. **Surface errors to the user**
   - In the `catch` of `completeWorkout()`, show a toast or inline message (e.g. “Could not complete workout. Check connection and try again.”) and ensure the button becomes clickable again so they can retry.

4. **Optional: reduce re-render cost**
   - Consider splitting the start page into smaller components or memoizing heavy sections so that when `isLastBlockComplete` flips to `true`, the tree that contains the Complete Workout button is cheaper to re-render. This is a larger refactor but improves perceived responsiveness.

### 4.2 Apparent data loss on reload (block completion state)

1. **Persist “block completed” for time-based blocks**
   - When a block is completed **without** logging sets (e.g. Tabata “Complete Block”, EMOM “Complete Block”), write a **lightweight** record so restore can see it:
     - **Option A:** Call the log-set API with a minimal “block completed” payload (e.g. one row per such block with a sentinel or block_type-specific flag) so that `workout_set_logs` (or an agreed structure) reflects “this block was completed.”
     - **Option B:** Add a small table or JSON column (e.g. on `workout_logs` or `workout_sessions`) that stores “completed_block_ids” and update it when a block is completed with no sets. Then in `restoreWorkoutProgress`, consider a block complete if it’s in that list (or has set logs).
   - Ensure the **same** `workout_log_id` (and session, if used) is used so that on reload we still find the same log and restore correctly.

2. **Restore logic**
   - In `restoreWorkoutProgress`, when determining `isCompleted` for a block:
     - If the block has at least one row in `workout_set_logs`, keep current logic.
     - If the block has **no** set logs but is in the new “completed blocks” store (or matches the minimal “block completed” record), set `isCompleted: true` for that block so that `isLastBlockComplete` can be true after reload and the Complete Workout button appears again.

3. **No change to existing set logging**
   - Keep all existing “Log Set” behavior and `/api/log-set` semantics; the new behavior only adds a way to record “block completed with no sets” and to read it back on restore.

### 4.3 Order of implementation

1. **First:** Button loading state, double-submit guard, and error handling (quick win, reduces “freeze” and confusion).
2. **Second:** Persist and restore “block completed with no sets” for Tabata/EMOM (and any similar blocks) so reload no longer resets completion state.

---

## 5. References (code locations)

| Item | File / area |
|------|-------------|
| Complete Workout button render | `start/page.tsx` ~3754–3771 |
| `completeWorkout()` | `start/page.tsx` ~3009–3108 |
| `handleBlockComplete` | `start/page.tsx` ~420–509 |
| Restore progress | `restoreWorkoutProgress` in `start/page.tsx` ~822–1000+ |
| Find active log | `findActiveWorkoutLogForToday` in `start/page.tsx` ~773–815 |
| Tabata “Complete Block” (no set log) | `TabataExecutor.tsx` `handleComplete` → `onBlockComplete(blockId, [])` |
| EMOM “Complete Block” | `EmomExecutor.tsx` `handleCompleteBlock` → `onBlockComplete(blockId, [])` |
| Set logs API | `app/api/log-set/route.ts` (creates/uses `workout_log`, inserts `workout_set_logs`) |

---

## 6. Conclusion

- **Freeze:** The Complete Workout button appears to freeze mainly because there is no loading state, no double-submit protection, and no user-visible error handling; heavy re-renders can add to the feeling of unresponsiveness.
- **Data loss:** Set logs are not lost; they remain in `workout_set_logs`. What is lost on reload is **block completion state** for blocks that never wrote any set log (e.g. Tabata/EMOM “Complete Block”). Restore is based only on set logs, so those blocks show as incomplete after reload.

Implementing loading/error handling and double-submit protection first, then persisting and restoring “block completed with no sets,” will address both the freeze and the apparent data loss in a way that matches current architecture and best practices.

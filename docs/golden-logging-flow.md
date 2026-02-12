# Golden Logging Flow

> Single source of truth for the set-logging lifecycle in the DailyFitness workout executor.

---

## 1. Lifecycle States

Each set instance goes through these states (defined in `src/lib/setLogging/types.ts`):

| State | Meaning | UI |
|---|---|---|
| `idle` | Set row visible, not yet logged | Normal input fields + LOG SET button |
| `pendingLocal` | Optimistic write applied locally | Row shows logged values, button disabled |
| `awaitingRPE` | RPE modal is open for this set | Blocking RPE modal, row shows logged values |
| `pendingSync` | Background API call in-flight | Row shows logged values + pulsing "saving..." |
| `synced` | Successfully persisted to Supabase | Row shows logged values, no indicator |
| `syncFailed` | Sync failed after retries | Row shows logged values + "Not synced" + retry |

### State transitions

```
idle
  -> pendingLocal        (user taps LOG SET)
  -> awaitingRPE         (optimistic write + RPE modal opens)
  -> pendingSync         (RPE confirmed/skipped -> fires async sync + opens rest timer)
  -> synced              (API 200)
  -> syncFailed          (API error after retries)
  -> pendingSync         (manual retry)
```

**Rest timer is purely UI sequencing.** It opens in parallel with the background sync after RPE confirm/skip. It does NOT gate persistence.

---

## 2. Sequencing Rules

### Mandatory order

1. User taps **LOG SET**
2. UI updates **instantly** (optimistic) -- row shows logged values, button disabled
3. **RPE modal** opens (blocking -- no dismiss via backdrop, no X, no ESC)
4. User selects RPE value **or** taps "Skip for now"
5. On RPE confirm/skip, **two things happen atomically**:
   - Background sync fires (POST `/api/log-set` with RPE included)
   - Rest timer modal opens (if rest seconds > 0)
6. Rest timer runs independently of sync

### What must NOT happen

- Rest timer must NEVER open before RPE confirm/skip
- Rest timer must NEVER block/gate the background sync
- The user must NEVER be able to interact with the workout screen while RPE or rest timer modal is open
- A logged set must NEVER "un-log" after appearing in the UI

---

## 3. Idempotency Key

### Format

```
${sessionId || "local"}:${blockId}:${exerciseId}:${setNumber}:${YYYY-MM-DD}
```

### Client-side guard

- Generated before the optimistic write
- Stored in a `Set<string>` (`usedKeys`)
- If the key already exists, `logSet()` returns `{ accepted: false, reason: "duplicate_key" }`
- **Persisted in `sessionStorage`** under key `glf:${sessionId}` so it survives page refresh
- On hook mount: rehydrate `usedKeys` + `pendingEntries` from sessionStorage
- On sync success: remove key from sessionStorage

### Server-side guard (belt-and-suspenders)

When `idempotency_key` is provided in the request body AND `workout_log_id` is resolved:

1. Query `workout_set_logs` for existing row matching `(workout_log_id, block_id, exercise_id, set_number)`
2. If found, return `200 { success: true, set_log_id: <existing>, deduplicated: true }`
3. Do NOT insert a duplicate

This protects against client state resets (cleared sessionStorage, new tab, etc.).

---

## 4. UI Requirements Per State

### `idle`
- Weight + reps input fields visible
- LOG SET button enabled (unless inputs invalid)

### `pendingLocal` / `awaitingRPE`
- Row shows logged weight x reps
- LOG SET button disabled for this set instance
- RPE modal is open (blocking)

### `pendingSync`
- Row shows logged weight x reps
- Small non-blocking "saving..." indicator (pulsing dot)
- Rest timer may be open (independent)

### `synced`
- Row shows logged weight x reps
- No indicator
- Checkmark or success styling

### `syncFailed`
- Row shows logged weight x reps (set is NEVER un-logged)
- "Not synced" indicator
- Tap-to-retry button inline

---

## 5. Merge Rules (Server vs Local Pending)

When the workout page refetches logged sets from the server (e.g., on visibility change):

1. **Server data is the base** -- always trust server rows
2. **Local pending entries that are NOT in server data** are appended (local wins visually)
3. **Local entries that ARE in server data** get removed from pending (promoted to synced)
4. **A set that was shown as logged is NEVER un-shown** -- even if the server doesn't have it yet

---

## 6. Background Sync

- Fires immediately after RPE confirm/skip (NOT after rest timer)
- Uses `fetch` with `credentials: "include"` and 10s timeout
- On failure: mark as `syncFailed`, retry with exponential backoff:
  - Attempt 1: wait 2s
  - Attempt 2: wait 4s
  - Attempt 3: wait 8s
- After 3 failures: stop retrying, show "Not synced" with manual retry
- Manual retry resets attempt counter and starts fresh

---

## 7. File Inventory

| File | Role |
|---|---|
| `src/lib/setLogging/types.ts` | State machine types, idempotency key builder |
| `src/lib/setLogging/goldenLogSet.ts` | Pure helpers: entry creation, sync, retry, sessionStorage |
| `src/hooks/useSetLoggingOrchestrator.ts` | React hook: state machine, RPE/rest sequencing, sync |
| `src/components/client/RPEModal.tsx` | Blocking RPE modal (z-9999, no dismiss) |
| `src/components/client/workout-execution/RestTimerModal.tsx` | Rest timer with scroll lock |
| `src/components/client/LiveWorkoutBlockExecutor.tsx` | Orchestrator integration, RPE modal rendering |
| `src/app/api/log-set/route.ts` | Server: accepts `rpe` + `idempotency_key`, server-side dedupe |

---

## 8. Manual Regression Checklist

- [ ] Log Set opens RPE modal first (before rest timer)
- [ ] RPE modal cannot be dismissed by tapping outside or pressing back
- [ ] RPE "Skip for now" works and transitions to rest timer
- [ ] Rest timer only opens after RPE confirm/skip
- [ ] Underlying screen cannot scroll during RPE modal
- [ ] Underlying screen cannot scroll during rest timer modal
- [ ] Double-tap LOG SET does not create duplicate rows
- [ ] Page refresh + re-logging same set does not create duplicate (idempotency key in sessionStorage)
- [ ] Network failure keeps set logged with "Not synced" indicator
- [ ] Manual retry from "Not synced" state works
- [ ] RPE value is persisted in `workout_set_logs.rpe` after sync
- [ ] e1RM and PR toasts show after background sync completes
- [ ] All block types (superset, drop set, AMRAP, etc.) show RPE modal after logging

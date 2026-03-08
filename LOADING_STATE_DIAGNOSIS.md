# Coach Dashboard Loading State Diagnosis

## 1. Loading state flow (exact code path)

### Where `loading` is set to `true`
- **Single place:** [`src/app/coach/page.tsx`](src/app/coach/page.tsx) line 45 — inside `loadData()`, at the start of the `try` block: `setLoading(true)`.

### Where `loading` is set to `false`
- **Single place:** [`src/app/coach/page.tsx`](src/app/coach/page.tsx) line 62 — inside the `finally` block of `loadData()`: `setLoading(false)`.

### Code path summary
```ts
const loadData = useCallback(async () => {
  if (!user) return;
  try {
    setLoading(true);                    // ← only place that sets true
    setError(null);
    const [briefingData, controlRoomData] = await Promise.all([
      getMorningBriefing(user.id),
      getControlRoomResult(supabase, user.id).catch(() => null),
    ]);
    setBriefing(briefingData);
    if (controlRoomData) { ... }
  } catch (err) { ... }
  finally {
    setLoading(false);                  // ← only place that sets false
  }
}, [user]);
```
- `loading` is set to `false` **only** in `finally`, so it runs after both success and failure.
- If the `catch` ran and did not set `loading` to false, we would still rely on `finally` — and `finally` is present and does call `setLoading(false)`.

So under normal completion (resolve or reject), `loading` will become `false`. The only way it stays `true` forever is if the `Promise.all` **never settles** (never resolves and never rejects). In that case the `try` block never completes, so we never reach `finally`.

---

## 2. What could prevent loading from becoming false

### A. Promise.all never settles (most likely)
- `loadData()` uses `await Promise.all([getMorningBriefing(user.id), getControlRoomResult(...).catch(() => null)])`.
- **getControlRoomResult** is wrapped in `.catch(() => null)`, so it always resolves (with `null` on error). It cannot cause the outer `Promise.all` to reject.
- **getMorningBriefing** can:
  - **Resolve** with data or with `getEmptyBriefing()` (it wraps the body in try/catch and returns `getEmptyBriefing()` on error).
  - **Hang** if one of its internal `await`s never completes (no timeouts anywhere).

So the only way `Promise.all` never settles is if **at least one** of these happens:

1. **getMorningBriefing hangs**
   - It has a large `Promise.all([...13 Supabase queries...])` and then a 14th sequential `await` (fetching `workout_logs` by `assignmentIds`). If any of those 14 steps never resolves (e.g. one Supabase request hangs), `getMorningBriefing` never resolves, so the page’s `Promise.all` never resolves and `finally` never runs → `loading` stays `true`.

2. **getControlRoomResult hangs**
   - It runs a **sequential** `for (const clientId of clientIds)` with multiple `await`s per client (`getActiveAssignmentForControlRoom`, `getCurrentWeekNumber`, `countSlotsThisWeek`, `countCompletedSlotsThisWeek`). If any of those awaits hangs (e.g. slow or stuck Supabase call), `getControlRoomResult` never resolves. Even though it’s wrapped in `.catch(() => null)`, that only handles **rejection**; a promise that never settles never rejects, so the whole `Promise.all` still never completes → `finally` never runs → `loading` stays `true`.

So: **no timeout anywhere** in this chain. One hanging request (in either service) is enough to leave the dashboard in the loading skeleton forever, even if other TrackedFetch calls (e.g. from other tabs or earlier runs) complete successfully.

### B. useRefreshOnFocus not calling the callback (does not by itself explain “loading forever”)
- In [`src/hooks/useRefreshOnFocus.ts`](src/hooks/useRefreshOnFocus.ts), when `refreshCounter > 0`, the hook calls `getSession()` then optionally `refreshSession()`. It only calls the page callback (`loadData`) when there is a session (or a refreshed session). If both are missing, `loadData()` is never called.
- That can explain “data not refetched” after focus, but not “loading skeleton forever” unless the **initial** load (from `useEffect`) is the one that never completes. So the same root cause applies: the initial (or the only) `loadData()` run’s `Promise.all` never settles.

---

## 3. Guard against concurrent loadData calls?

- **No.** There is no guard like `if (loading) return` at the start of `loadData()`.
- When `useRefreshOnFocus` runs, it can call `loadData()` while the first `loadData()` (from initial `useEffect`) is still in flight. Then:
  - Both runs set `loading = true`.
  - Whichever run finishes **last** will run `finally` and set `loading = false`.
- So:
  - If the **first** run never finishes (Promise.all hangs), the **second** run can still finish and set `loading = false` — then we would not see “loading forever.”
  - If the **second** run never finishes and the first one did finish, we would already have `loading = false` from the first run — again no “loading forever.”
- “Loading forever” therefore implies that the **only** run of `loadData()` that is in flight (or the run that “wins” the race to set `loading`) never completes. So the issue is still a run where `Promise.all` never settles, not primarily the lack of a guard. A guard would still be good practice to avoid redundant work and confusing state flips.

---

## 4. Coach page render condition

- **Skeleton:** Rendered when `loading` is true (line 193): `{loading && ( ... skeleton ... )}`.
- **Content:** Rendered when `!loading && briefing` (line 201).
- So:
  - If `loading` is never set to `false`, the skeleton shows forever.
  - If `loading` becomes `false` but `briefing` is still `null`, we show neither skeleton nor main content (only header/error if any). So “skeleton forever” is strictly from `loading` remaining `true`.

---

## 5. getMorningBriefing and getControlRoomResult

### getMorningBriefing ([`src/lib/coachDashboardService.ts`](src/lib/coachDashboardService.ts))
- Uses a top-level try/catch; on error it returns `getEmptyBriefing()`, so it **does not reject**.
- It can still **hang** if any internal `await` never completes:
  - One `Promise.all` of 13 parallel Supabase queries.
  - Then one sequential `await` for `workout_logs` by `assignmentIds`.
- No timeouts; one hanging query is enough for the whole function to hang.

### getControlRoomResult ([`src/lib/coach/controlRoomService.ts`](src/lib/coach/controlRoomService.ts))
- Sequential `for` loop over `clientIds` with several `await`s per client. No timeout.
- If any of those awaits hangs, the whole function hangs.
- It does not use a top-level try/catch; if something throws, it would reject. On the coach page it’s used as `getControlRoomResult(...).catch(() => null)`, so rejection is converted to `null` and does not prevent `Promise.all` from resolving. Only **non-settling** (hanging) would keep the dashboard loading forever.

---

## 6. Catch block and error logging

- In `loadData`, the `catch` block (lines 58–61) only logs and sets `setError`. It does **not** set `loading` to false there; `finally` is responsible for that.
- So whenever the `Promise.all` **rejects**, we hit `catch` and then `finally` → `loading` becomes false. The only way `loading` stays true is when the `Promise.all` **never** resolves and **never** rejects (i.e. one of the two branches hangs).

---

## 7. useRefreshOnFocus interaction

- When focus/visibility triggers a refresh, AuthContext increments `refreshCounter`, then `useRefreshOnFocus` runs and eventually may call `loadData()` (after `getSession()` / `refreshSession()`).
- `loadData()` always sets `setLoading(true)` at the start. There is no “if (loading) return” guard.
- So two concurrent `loadData()` calls can run; both set `loading = true`. The last one to finish sets `loading = false`. So:
  - Race conditions can cause an extra loading flash or redundant requests.
  - They do not by themselves explain “loading forever” unless the run that “wins” (or the only run) is the one that never completes because `Promise.all` never settles.

---

## 8. Client nutrition page (same pattern)

- [`src/app/client/nutrition/page.tsx`](src/app/client/nutrition/page.tsx) uses multiple loading flags: `loadingMeals`, `loadingMode`, `loadingWaterGoal`.
- Skeleton is shown when `(loadingMeals || loadingMode)` (line 1045). So if either never becomes false, the skeleton can persist.
- `runMealsLoadWithTimeout` uses `Promise.race` with a timeout and has a `finally` that sets `setLoadingMeals(false)` (with a loadId guard). So a single run will clear `loadingMeals` after success, failure, or timeout — unless the component unmounts and the guard prevents the update, or there is another code path that sets `loadingMeals = true` and never clears it.
- So the coach dashboard issue (single `loading` flag, no timeout, one hanging promise) is the clearest match for “loading skeleton forever.” The nutrition page has a similar pattern (loading state + async load) but adds timeouts and multiple flags; diagnosis there would follow the same idea: find which flag stays true and which promise never settles.

---

## 9. Recommended fix (coach dashboard)

**Goal:** Ensure `loading` is always set to `false` after the load attempt, even if one of the underlying calls hangs.

1. **Add a timeout around the whole load** (in [`src/app/coach/page.tsx`](src/app/coach/page.tsx) inside `loadData`):
   - Wrap `Promise.all([getMorningBriefing(...), getControlRoomResult(...).catch(() => null)])` in a `Promise.race` with a timeout (e.g. 30–45 seconds).
   - In the `try` block, await that race. If the timeout wins, treat it as failure: e.g. `setError('Loading took too long. Please try again.')` and do **not** overwrite `briefing` with partial data (or optionally set briefing to a fallback). The existing `finally` will run and set `setLoading(false)`.
   - This way, even if `getMorningBriefing` or `getControlRoomResult` hangs, the race resolves and `finally` runs → `loading` becomes false and the user sees an error instead of an infinite skeleton.

2. **Optional but recommended:** Add a simple guard at the top of `loadData()` to avoid starting a new load while one is already in progress, e.g. `if (loading) return;` — with the caveat that after a timeout you do want to allow retry, so the guard might be “refuse to start only if we are loading and have no error” or use a ref to track in-flight request and ignore stale completions (similar to nutrition’s `loadId`).

3. **Do not** change page structure or add new loading states for this fix; the single `loading` flag and the existing `finally` are enough once the promise is guaranteed to settle (e.g. via the timeout).

---

## Summary

| Question | Answer |
|----------|--------|
| What sets `loading` to true? | `setLoading(true)` at the start of `loadData()` (line 45). |
| What sets `loading` to false? | `setLoading(false)` in the `finally` block of `loadData()` (line 62). |
| Is `loading` set to false in finally? | Yes. Only in `finally`. |
| If one promise in Promise.all throws, does loading get set to false? | Yes. The whole Promise.all rejects → catch runs → finally runs → setLoading(false). |
| try/catch/finally pattern? | Yes. setLoading(false) is only in the `finally` block. |
| Could a promise hang forever? | Yes. Neither getMorningBriefing nor getControlRoomResult use timeouts; one hanging request leaves Promise.all pending and `finally` never runs. |
| Guard against concurrent loadData? | No. No guard. |
| What condition shows the skeleton? | `loading === true`. |
| Could data be null after loading? | Yes (`!loading && briefing`), but that would show no content, not the skeleton. “Skeleton forever” means `loading` is stuck true. |

**Root cause:** The dashboard’s `Promise.all` can never settle if either `getMorningBriefing` or `getControlRoomResult` hangs. When that happens, `finally` never runs and `loading` stays `true`, so the skeleton is shown forever. The fix is to make the wait bounded (e.g. `Promise.race` with a timeout) so that `finally` always runs and `loading` is always set to `false`.

# Audit: Tab Return Loading Issue (Issue 5) — March 2026

**Scope:** Find every page that may fail to reload (show loading skeleton / blank / error) after the user leaves the browser tab and returns.

**Method:** Code audit — checking for:
- `usePageData` usage (simple load-once)
- Manual `useEffect` with fetch
- `finally` block that **always** sets `loading` to false (no cancelled/guard)
- `visibilitychange`, `focus`, or `refreshCounter` references
- `cancelled` / `isCancelled` flag that prevents `setLoading(false)`
- `AbortController` where abort could prevent state from being set

---

## Summary Table (All Pages)

| Page | Fetch Method | Has finally | Cancelled/Abort Guard | Visibility Listener | Status |
|------|--------------|-------------|------------------------|---------------------|--------|
| **Client** | | | | | |
| `/client` (dashboard) | Manual useEffect | Yes | **Yes (cancelledRef)** | useRefetchOnTabVisible | **AT RISK** |
| `/client/train` | usePageData | N/A (hook) | N/A | refetchOnVisible: true | OK |
| `/client/nutrition` | Manual useEffect | Yes (loadId guard) | loadGenerationRef | None | OK (cleanup sets loading false) |
| `/client/check-ins` | usePageData | N/A | N/A | refetchOnVisible: true | OK |
| `/client/check-ins/weekly` | Manual useEffect | Yes | **Yes (cancelled)** | None | **BROKEN** |
| `/client/goals` | Manual useEffect | Yes | No | useRefetchOnTabVisible | OK |
| `/client/goals/history` | Manual useEffect | Yes | **Yes (cancelled)** | None | **BROKEN** |
| `/client/progress` | Manual useEffect | Yes | No | useRefetchOnTabVisible | OK |
| `/client/progress/body-metrics` | Manual useEffect | Yes | No (main load) | useRefetchOnTabVisible | OK |
| `/client/progress/photos` | Manual useEffect | Yes | No | None | OK |
| `/client/progress/mobility` | Manual useEffect | Yes | No | None | OK |
| `/client/progress/workout-logs` | Manual useEffect | Yes | No | useRefetchOnTabVisible | OK |
| `/client/progress/workout-logs/[id]` | Manual useEffect | Yes | No | None | OK |
| `/client/progress/analytics` | Manual useEffect | Yes | No | useRefetchOnTabVisible | OK |
| `/client/progress/nutrition` | Manual useEffect | Yes | No | None | OK |
| `/client/progress/personal-records` | Manual useEffect | Yes | No | useRefetchOnTabVisible | OK |
| `/client/progress/leaderboard` | Manual useEffect | Yes | No | useRefetchOnTabVisible | OK |
| `/client/progress/performance` | Manual useEffect | Yes | No | useRefetchOnTabVisible | OK |
| `/client/progress/achievements` | Manual useEffect | Yes | No | None | OK |
| `/client/workouts/[id]/start` | Manual | Yes | No | useRefetchOnTabVisible | OK |
| `/client/workouts/[id]/complete` | Manual | Yes | No | None | OK |
| `/client/profile` | Manual useEffect | Yes | No | None | OK |
| `/client/achievements` | (N/A - uses progress/achievements) | | | | OK |
| `/client/challenges` | Manual useEffect | Yes | No | None | OK |
| `/client/challenges/[id]` | Manual useEffect | Yes | No | None | OK |
| `/client/activity` | No fetch (static) | N/A | N/A | N/A | OK |
| `/client/habits` | Manual useEffect | Yes | No | useRefetchOnTabVisible | OK |
| `/client/lifestyle` | (Route not found) | | | | N/A |
| `/client/clipcards` | Manual useEffect | Yes | No | None | OK |
| **Coach** | | | | | |
| `/coach` (dashboard) | Manual useEffect | Yes | No (AbortError return, but finally runs) | useRefetchOnTabVisible | OK |
| `/coach/clients` | Manual useEffect | Yes | No | useRefetchOnTabVisible | OK |
| `/coach/clients/[id]` | usePageData | N/A | N/A | refetchOnVisible: true | OK |
| `/coach/clients/[id]/progress` | ClientProgressView | N/A | N/A | N/A | OK |
| `/coach/clients/[id]/analytics` | **ClientAnalyticsView** | Yes | **Yes (cancelled)** | None | **BROKEN** |
| `/coach/clients/[id]/adherence` | **ClientAdherenceView** | Yes | **Yes (cancelled)** | None | **BROKEN** |
| `/coach/training/programs` | ProgramsDashboardContent | Yes | No (AbortError return, finally runs) | None | OK |
| `/coach/programs/[id]` | Manual useEffect | Yes | No | None | OK |
| `/coach/workouts/templates` | Manual useEffect | Yes | No | None | OK |
| `/coach/nutrition` | Static (no fetch) | N/A | N/A | N/A | OK |
| `/coach/nutrition/meal-plans` | usePageData | N/A | N/A | None | OK |
| `/coach/nutrition/meal-plans/[id]` | Manual useEffect | Yes | No | None | OK |
| `/coach/nutrition/generator` | Manual useEffect | Yes | cancelledRef (generation only) | None | OK |
| `/coach/nutrition/foods` | OptimizedFoodDatabase | Yes | AbortController | None | OK |
| `/coach/nutrition/assignments` | (component-level) | | | | OK |
| `/coach/meals` | Manual useEffect | Yes | No | None | OK |
| `/coach/gym-console` | Manual useEffect | Yes | **Yes (cancelled)** in ViewDetailPanel | None | **BROKEN** |
| `/coach/adherence` | OptimizedAdherenceTracking | Yes | AbortController | None | OK |
| `/coach/goals` | Manual useEffect | Yes | No | None | OK |
| `/coach/profile` | Manual useEffect | Yes | No | None | OK |
| `/coach/analytics` | OptimizedAnalyticsReporting | Yes | AbortController | None | OK |
| `/coach/progress` | Manual useEffect | Yes | No (main load) | None | OK (selectedClient has isCancelled but secondary) |

---

## Broken or At-Risk Pages — Exact Locations

### 1. **BROKEN: `/client/goals/history`**
- **File:** `dailyfitness-app/src/app/client/goals/history/page.tsx`
- **Lines:** 61–85
- **Issue:** `cancelled` guard in `finally`: `if (!cancelled) setLoading(false)`. When effect cleanup runs (deps change or unmount), `cancelled = true`, so `setLoading(false)` is skipped and the page can stay in loading state.
- **Code:**
```tsx
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // ... fetch
      } finally {
        if (!cancelled) setLoading(false);  // ← SKIPPED when cleanup runs
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);
```

---

### 2. **BROKEN: `/client/check-ins/weekly`**
- **File:** `dailyfitness-app/src/app/client/check-ins/weekly/page.tsx`
- **Lines:** 24–51
- **Issue:** Same pattern: `if (!cancelled) setLoading(false)` in `finally`. Cleanup sets `cancelled = true`, so loading can remain true.
- **Code:**
```tsx
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        // ...
      } finally {
        if (!cancelled) setLoading(false);  // ← SKIPPED when cleanup runs
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);
```

---

### 3. **BROKEN: `/coach/gym-console` — ViewDetailPanel**
- **File:** `dailyfitness-app/src/app/coach/gym-console/page.tsx`
- **Lines:** 268–291
- **Issue:** `ViewDetailPanel` uses `cancelled` guard in `.finally()`. When the panel closes or `clientId` changes, cleanup runs and `setLoading(false)` is skipped.
- **Code:**
```tsx
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchApi(`/api/coach/pickup/next-workout?clientId=${clientId}`)
      .then(...)
      .catch(...)
      .finally(() => {
        if (!cancelled) setLoading(false);  // ← SKIPPED when cleanup runs
      });
    return () => { cancelled = true; };
  }, [clientId]);
```

---

### 4. **BROKEN: `/coach/clients/[id]/analytics` — ClientAnalyticsView**
- **File:** `dailyfitness-app/src/components/coach/client-views/ClientAnalyticsView.tsx`
- **Lines:** 43–56
- **Issue:** `cancelled` guard in `.finally()`. When `clientId` changes or component unmounts, `setLoading(false)` is skipped.
- **Code:**
```tsx
  useEffect(() => {
    let cancelled = false
    getClientAnalytics(clientId)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(...) })
      .finally(() => {
        if (!cancelled) setLoading(false)  // ← SKIPPED when cleanup runs
      })
    return () => { cancelled = true }
  }, [clientId])
```

---

### 5. **BROKEN: `/coach/clients/[id]/adherence` — ClientAdherenceView**
- **File:** `dailyfitness-app/src/components/coach/client-views/ClientAdherenceView.tsx`
- **Lines:** 24–127
- **Issue:** Same pattern: `if (!cancelled) setLoading(false)` in `finally`. Cleanup sets `cancelled = true`.
- **Code:**
```tsx
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // ...
      } finally {
        if (!cancelled) setLoading(false)  // ← SKIPPED when cleanup runs
      }
    }
    load()
    return () => { cancelled = true }
  }, [clientId])
```

---

### 6. **AT RISK: `/client` (dashboard)**
- **File:** `dailyfitness-app/src/app/client/page.tsx`
- **Lines:** 130, 248–284
- **Issue:** Uses `cancelledRef` in `runDashboardLoad`. On cleanup, `cancelledRef.current = true`, and `finally` does `if (!cancelledRef.current) setDataLoaded(true)`, so it can skip. `useRefetchOnTabVisible` helps by triggering a new load on tab return, but if AuthContext updates `user` on tab return and triggers effect re-run, the old load’s `finally` will skip and the new load could also be interrupted.
- **Code:**
```tsx
  const cancelledRef = useRef(false);
  // ...
  } finally {
    if (!cancelledRef.current) {
      setDataLoaded(true);
      setLoadingStartedAt(null);
    }
  }
  // ...
  return () => {
    cancelledRef.current = true;
    // ...
  };
```

---

## Root Cause

When an effect’s cleanup runs (deps change or unmount), any in-flight async work continues. If the `finally` block uses `if (!cancelled) setLoading(false)`, and cleanup has set `cancelled = true`, `setLoading(false)` is never called. The page can remain in a loading state indefinitely.

This is most likely when:
1. User switches tabs → AuthContext refreshes token → `user` reference changes → effect deps change → cleanup runs.
2. User navigates away and back quickly.
3. User opens/closes a modal or panel (e.g. gym-console ViewDetailPanel) while a fetch is in progress.

---

## Recommended Fix (Do NOT apply yet — report only)

For each broken page:
1. Remove the `cancelled` guard from the `finally` block so `setLoading(false)` always runs, **or**
2. Move to `usePageData` (or equivalent) which handles abort/cleanup without leaving loading stuck, **or**
3. In cleanup, explicitly call `setLoading(false)` before setting `cancelled = true` (only if safe for that component’s logic).

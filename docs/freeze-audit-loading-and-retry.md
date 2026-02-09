# Freeze audit: screens that can stick (loading forever or no retry)

**Goal:** No screen should require a manual refresh to recover.

**Implemented (Feb 2025):** Client dashboard, sessions, workout complete, progress hub, workout details, habits, goals, challenges (list + detail), programs detail, nutrition meal/food, scheduling, clipcards, and achievements now all use `withTimeout` (25–30s), clear loading in `finally`, and a **Retry** button on load error. See `src/lib/withTimeout.ts`. Every data load should either succeed, hit a timeout, or fail with a clear error and a **Retry** (or equivalent) so the user can recover without leaving the page.

**Standard fix pattern (where applicable):**
1. **Timeout** on the initial load (e.g. 25–30s) so a hanging request doesn’t leave loading true forever.
2. **Error state** (e.g. `loadError`) set on timeout or fetch failure.
3. **Retry** button (or link) when `loadError && !loading` that clears error and calls the same load function again.
4. **Guaranteed loading reset:** `setLoading(false)` in a `finally` (or equivalent) so loading is always cleared.

---

## Already fixed (timeout + error + Retry)

| Screen | File | Notes |
|--------|------|--------|
| Client Profile | `app/client/profile/page.tsx` | Timeout 30s, loadError, Retry, ref for userId on retry |
| Client Nutrition | `app/client/nutrition/page.tsx` | runMealsLoadWithTimeout 20s, mealsLoadError, Retry |
| Client Workouts list | `EnhancedClientWorkouts.tsx` | loadError, "Refresh" button; RPC fix avoids crash |
| Client Add food | `app/client/nutrition/foods/create/page.tsx` | Submit timeout 25s, alert on error, loading in finally |
| Complete Workout button | `app/client/workouts/[id]/start/page.tsx` | Loading + double-submit guard + toast on error |

---

## Client app – fixed (timeout + error + Retry applied)

All of the following now use the shared `withTimeout` helper (25–30s), `loadError` state, and a **Retry** button. Helper: `src/lib/withTimeout.ts`.

| Screen | File | Current behavior | Recommended fix |
|--------|------|------------------|------------------|
| **Client dashboard (Home)** | `app/client/page.tsx` | Has `error` state and shows message; no Retry, no timeout | Add timeout to `fetchDashboardData`, add Retry button when `error` |
| **Client Sessions** | `app/client/sessions/page.tsx` | try/finally setLoading(false); no timeout, no error UI | Add timeout, loadError state, Retry when loadError |
| **Client Workout complete** | `app/client/workouts/[id]/complete/page.tsx` | loadAssignment has finally setLoading(false); no timeout, no error/Retry if load fails | Add timeout to load flow, loadError state, Retry |
| **Client Progress (main)** | `app/client/progress/page.tsx` | try/finally setLoading(false); no timeout, no error/Retry | Timeout, loadError, Retry |
| **Client Workout details** | `app/client/workouts/[id]/details/page.tsx` | Has setError; has finally setLoading(false). Check for Retry | Add Retry if missing; add timeout |
| **Client Habits** | `app/client/habits/page.tsx` | try/finally setLoading(false); no timeout, no error/Retry | Timeout, loadError, Retry |
| **Client Goals** | `app/client/goals/page.tsx` | try/finally setLoading(false); no timeout, no error/Retry | Timeout, loadError, Retry |
| **Client Challenges list** | `app/client/challenges/page.tsx` | try/finally setLoading(false); no timeout, no error/Retry | Timeout, loadError, Retry |
| **Client Challenge detail** | `app/client/challenges/[id]/page.tsx` | try/finally setLoading(false); no timeout, no error/Retry | Timeout, loadError, Retry |
| **Client Programs detail** | `app/client/programs/[id]/details/page.tsx` | try/finally setLoading(false); no timeout, no error/Retry | Timeout, loadError, Retry |
| **Client Workout start** | `app/client/workouts/[id]/start/page.tsx` | Complex; loading in many paths | Ensure all load paths have finally setLoading(false); consider timeout + error/Retry for initial load |
| **Client Nutrition meal** | `app/client/nutrition/meals/[id]/page.tsx` | try/finally setLoading(false); no timeout, no error/Retry | Timeout, loadError, Retry |
| **Client Nutrition food** | `app/client/nutrition/foods/[id]/page.tsx` | try/finally setLoading(false); no timeout, no error/Retry | Timeout, loadError, Retry |
| **Client Scheduling** | `app/client/scheduling/page.tsx` | try/finally setLoading(false); no timeout, no error/Retry | Timeout, loadError, Retry |
| **Client Clipcards** | `app/client/clipcards/page.tsx` | try/finally setLoading(false); no timeout, no error/Retry | Timeout, loadError, Retry |
| **Client Achievements** | `app/client/achievements/page.tsx` | try/finally setLoading(false); no timeout, no error/Retry | Timeout, loadError, Retry |
| **Client Progress sub-pages** | `progress/body-metrics`, `progress/analytics`, `progress/performance`, `progress/personal-records`, `progress/workout-logs`, `progress/leaderboard`, `progress/achievements`, `progress/nutrition`, `progress/mobility` | Most have try/finally setLoading(false); generally no timeout, no error/Retry | Apply same pattern: timeout, loadError, Retry where it’s a full-page load |

---

## Coach app – same pattern (lower priority if only clients were freezing)

Coach pages that start with loading true and fetch on mount should get the same treatment where you want to avoid coach-side freezes:

- `app/coach/page.tsx` (dashboard)
- `app/coach/sessions/page.tsx`
- `app/coach/clients/page.tsx`
- `app/coach/clients/[id]/page.tsx`
- `app/coach/profile/page.tsx`
- `app/coach/progress/page.tsx`
- `app/coach/programs/page.tsx`, `programs/[id]/page.tsx`, `programs/[id]/edit/page.tsx`
- `app/coach/workouts/templates/page.tsx`, `templates/[id]/page.tsx`, `templates/[id]/edit/page.tsx`
- `app/coach/nutrition/page.tsx`, `nutrition/meal-plans/[id]/page.tsx`, `meal-plans/[id]/edit/page.tsx`, `meal-plans/create/page.tsx`
- `app/coach/meals/page.tsx`
- `app/coach/habits/page.tsx`, `app/coach/goals/page.tsx`, `app/coach/achievements/page.tsx`
- `app/coach/challenges/page.tsx`, `challenges/[id]/page.tsx`
- `app/coach/scheduling/page.tsx`, `availability/page.tsx`, `clipcards/page.tsx`
- `app/coach/bulk-assignments/page.tsx`
- `app/coach/categories/page.tsx`, `exercise-categories/page.tsx`
- Plus shared components used by coach: `OptimizedClientProgress`, `OptimizedAnalyticsOverview`, `OptimizedAnalyticsReporting`, `ClientWorkoutsView`, `ClientMealsView`, `ClientProfileView`, etc.

---

## Shared components

These have their own loading state and may be embedded in pages that already have error/Retry. If they’re the main content of a route, they should still get timeout + error + Retry at the page level or inside the component:

- `EnhancedClientWorkouts.tsx` – already has loadError + Refresh
- `OptimizedClientProgress.tsx`, `OptimizedAnalyticsOverview.tsx`, `OptimizedAnalyticsReporting.tsx`
- `ClientWorkoutsView.tsx`, `ClientMealsView.tsx`, `ClientProfileView.tsx`, `ClientProgressView.tsx`, `ClientHabitsView.tsx`, `ClientClipcards.tsx`

---

## Implementation order (suggested)

1. **Client dashboard (Home)** – high visibility; add timeout + Retry.
2. **Client Sessions** – add timeout, loadError, Retry.
3. **Client Workout complete** – add timeout, loadError, Retry for load flow.
4. **Client Progress (main)** – add timeout, loadError, Retry.
5. **Client Workout details** – ensure Retry exists; add timeout.
6. **Remaining client pages** – apply same pattern in batches (habits, goals, challenges, programs, nutrition meal/food, scheduling, clipcards, achievements, progress sub-pages).
7. **Coach pages** – same pattern as needed for coach UX.

---

## Reusable helper (optional)

To avoid duplicating timeout logic, you can add a small helper, e.g. in `lib/`:

```ts
export function withTimeout<T>(promise: Promise<T>, ms: number, message = 'timeout'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
}
```

Then in each page: `const data = await withTimeout(loadData(), 30000);` and in catch check `error.message === 'timeout'` to set a friendly loadError and show Retry.

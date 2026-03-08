# Audit 1: Infinite Loading / Stale State Bugs (Read-Only)

## Scope

Pages that use `useEffect` for data fetching on mount. For each: loading state at start, `finally` block, error handling, cleanup (abort/cancelled), and tab visibility re-fetch.

---

## Summary Table

| Page path | Has loading state | Has finally block | Handles errors (set loading false) | Cleanup (abort/cancelled) | Tab visibility re-fetch | Current status |
|-----------|-------------------|-------------------|-------------------------------------|----------------------------|-------------------------|-----------------|
| `/coach/nutrition/meal-plans` | Yes | Yes (guarded by `!cancelledRef.current`) | Yes (catch + finally) | Yes (`cancelledRef`, cleanup sets `setLoading(false)`) | No | **Likely broken** – on tab return effect does not re-run; if fetch hung, user sees stale or stuck state |
| `/coach/training/programs` | N/A (wrapper) | — | — | — | — | **Likely fine** – delegates to `ProgramsDashboardContent` |
| `/coach/workouts/templates` | Yes | Yes | Yes (catch + finally) | Yes (AbortController) | Yes (`useRefreshOnFocus` – auth-based, not true visibility) | **Likely fine** – abort + finally; focus refresh is auth-only |
| `/client/nutrition` | Yes (`loadingMeals`) | Yes (loadId guard) | Yes | Yes (loadGenerationRef increment on cleanup) | Yes (`visibilitychange` + timeout to clear stuck loading) | **Likely fine** – best-in-class visibility handling |
| `/client/train` | No (uses `dataLoaded`) | No | setError only | No (comment: "stale fetches just won't update state") | No | **Likely broken** – if fetch never completes or throws before setDataLoaded, skeleton can persist; no visibility re-fetch |
| `/client/check-ins` | Yes (`dataLoading`) | Yes | Yes (catch + finally) | No | No | **Likely broken** – no cleanup; no visibility re-fetch; tab return can show stale or stuck loading |
| `/client/check-ins/weekly` | Yes | Yes (guarded by `!cancelled`) | Yes | Yes (cancelled flag) | No | **Likely fine** – cleanup and guarded finally |
| `/client/goals` | Yes | Yes (inside `loadGoals`) | Yes (setLoadError + finally) | No | No (useRefreshOnFocus is auth-based) | **Likely fine** – finally in loadGoals; no visibility re-fetch |

---

## Known Broken / High-Risk Pages (Detail)

### 1. `/coach/nutrition/meal-plans` — **Confirmed infinite loading on tab return**

- **File:** `src/app/coach/nutrition/meal-plans/page.tsx`
- **Pattern:** `loadMealPlans` in `useCallback`; `setLoading(true)` at start; `finally { if (!cancelledRef.current) setLoading(false) }`; cleanup sets `cancelledRef.current = true` and `setLoading(false)`.
- **Issue:** When the user switches tab and returns **without unmounting** (same route), dependency array `[user?.id, loadMealPlans]` is unchanged, so the effect does **not** re-run. If the in-flight request was throttled or never completed, the UI can stay in loading state or show stale/empty data. There is **no** `visibilitychange` or focus listener to re-run the load or force loading false after a timeout.
- **Strict Mode:** On double-mount, first effect cleanup sets `cancelledRef.current = true` and `setLoading(false)`. Second effect runs, sets `cancelledRef.current = false`, calls `loadMealPlans()` again. So Strict Mode is handled; the main risk is tab switch without unmount.

### 2. `/client/train` — **No loading state for initial fetch; no finally**

- **File:** `src/app/client/train/page.tsx`
- **Pattern:** IIFE in `useEffect` calls `fetchAllData()` then `setDataLoaded(true)`. No `loading` boolean for the initial load (skeleton is driven by `!dataLoaded`). No `finally`; no cleanup.
- **Issue:** If `fetchAllData()` throws, `setDataLoaded(true)` is never called → skeleton forever. If the request hangs, same. No abort, no visibility re-fetch. Comment says "No cleanup needed — stale fetches just won't update state", but that does not address tab return or hung requests.

### 3. `/client/check-ins` (hub) — **No cleanup; no visibility re-fetch**

- **File:** `src/app/client/check-ins/page.tsx`
- **Pattern:** `loadCheckInData` in `useCallback`; `setDataLoading(true)` at start; `finally { setDataLoading(false) }`; no cancelled flag; effect has no cleanup.
- **Issue:** If the user leaves the tab and the request completes after they’ve left, state updates still run (no guard). When they return, the effect does not re-run (deps unchanged), so they may see stale data. If the request never completes (e.g. throttled when tab in background), loading can stay true with no timeout or visibility handling.

---

## Other Pages Checked (Brief)

- **ProgramsDashboardContent** (used by `/coach/training/programs`): Has `loading`, `finally`, AbortController cleanup, and 15s timeout to force `setLoading(false)`. Has `useRefreshOnFocus` (auth-based). **Likely fine.**
- **Coach workout templates** (`/coach/workouts/templates`): AbortController, `finally`, `useRefreshOnFocus`. **Likely fine** except focus refresh is not true tab visibility.
- **Client goals**: `loadGoals` has `finally` and sets loading false; useEffect also has `.then(() => setLoading(false))`. No cleanup, no visibility. **Likely fine** for loading; possible stale data on tab return.
- **Client check-ins weekly**: Cancelled flag, guarded `setLoading(false)` in finally, cleanup. **Likely fine.**

---

## React Strict Mode / Cancelled-Flag Pitfalls

- **Meal-plans:** Cleanup sets `setLoading(false)`. So on unmount (e.g. Strict Mode first run) loading is explicitly set false. When the async work completes, `if (!cancelledRef.current) setLoading(false)` — so if cancelled, we do **not** set loading false again. That’s correct; the cleanup already set it false.
- **Risk pattern:** A pattern that would be broken: cleanup sets `cancelled = true` but does **not** call `setLoading(false)`, and in `finally` we have `if (!cancelled) setLoading(false)`. Then after unmount, loading would stay true. The meal-plans page avoids this by calling `setLoading(false)` in the cleanup.
- **State updates after unmount:** React 18 does not warn on setState after unmount. So if there’s no cancelled guard, returning to a page after a remount can still apply state from an old request. Using a cancelled flag (or AbortController + guard) is the right pattern and is present where noted.

---

## Visibility / Focus Re-Fetch

- **Pages with `visibilitychange` or similar:**  
  `client/nutrition/page.tsx` (timeout + clear loading when tab visible), `client/page.tsx`, `AuthContext`, `LiveWorkoutBlockExecutor`, `useLoggingReset`.
- **`useRefreshOnFocus`:** Used by client nutrition, coach workout templates, coach programs dashboard, client goals. Implemented in `src/hooks/useRefreshOnFocus.ts`: runs when **`refreshCounter`** from AuthContext changes, **not** on window/tab focus. So it does **not** re-fetch on tab return unless auth triggered a refresh.

---

## Recommendations (for later, not implemented in this audit)

1. **Tab visibility:** For pages that can hang (meal-plans, check-ins hub, train), add a `visibilitychange` listener: when tab becomes visible, either re-run the load (with a short debounce) or, if a load has been in progress for too long, set loading false and show an error/retry.
2. **Train page:** Add a loading state for the initial fetch and a `finally` that always sets it false; consider timeout or visibility to clear stuck state.
3. **Check-ins hub:** Add a cancelled flag (or AbortController) and, optionally, visibility-based re-fetch or timeout to avoid infinite loading.

---

# Audit 2: Mobile View Issues (375px) — Read-Only

## Scope

Major client and coach screens at 375px viewport (iPhone SE). Modals: centered, scroll to actions, full-screen backdrop. Pages: horizontal scroll, overflow/overlap, touch targets &lt;44px, cut-off content, misalignment.

**Note:** This audit is based on code structure and common failure patterns (overflow, min-width, fixed heights, button sizes). A full 375px visual pass in a browser was not run; findings are inferred from layout and class usage.

---

## Modal Summary (from codebase)

- **ResponsiveModal** (`src/components/ui/ResponsiveModal.tsx`): `fixed inset-0`, `flex items-center justify-center`, `p-4`; content `maxHeight: min(88vh, calc(100vh - 4rem))`, `overflow-y-auto` on content; footer with actions is `flex-shrink-0`. Backdrop covers full screen. On 375px, tall content could push actions below the fold; user must scroll to reach them (content area scrolls).
- **LogMeasurementModal:** Custom fixed overlay, `max-h-[88vh]`, `overflow-y-auto` on content; footer sticky at bottom. Same risk: long form + scroll needed to reach "Save" (no explicit min-height on footer for 44px).
- **AddClientCheckInModal:** Uses ResponsiveModal; same as above.
- **AddGoalModal, MealPlanAssignmentModal, WorkoutAssignmentModal, etc.:** Various; many use ResponsiveModal or custom fixed overlay with scrollable body. Without a live 375px check per modal, **possible issues:** long forms requiring scroll to reach primary button; small close or secondary buttons.

---

## Page-by-Page Table (375px)

| Page path | Issue description | Severity | Element/component |
|-----------|-------------------|----------|-------------------|
| `/client/train` | Possible horizontal scroll if week strip or cards use fixed min-widths | Low | WeekStrip, ActiveProgramCard |
| `/client/nutrition` | Tables/lists may cause horizontal scroll if no `overflow-x-auto` or `min-w-0` on narrow viewport | Medium | Meal lists, day selector |
| `/client/check-ins` | Comparison table uses `overflow-x-auto` + `min-w-[280px]` — horizontal scroll on narrow screens is intentional | Low | WeeklyComparison |
| `/client/check-ins/weekly` | Multi-step form; long content in Step 1/2/3 may require scroll to reach Next/Submit | Medium | StepBodyMetrics, StepReview |
| `/client/goals` | Page uses `min-w-0 overflow-x-hidden`; tables or wide content could still overflow without per-section overflow | Low | Goals list, tables |
| `/client/progress` | Hub with cards; generally responsive; possible overflow in any custom card content | Low | Progress cards |
| `/client/progress/body-metrics` | Tables use `overflow-x-auto` and `min-w-[280px]` / `min-w-[240px]` — horizontal scroll likely on 375px | Low | Comparison table, measurements table |
| `/client/progress/photos` | Image grids and comparison layout; images may be large; ensure touch targets for actions ≥44px | Low | Photo grid, buttons |
| `/client/progress/mobility` | Forms and lists; small inputs or buttons possible | Medium | MobilityFormFields, list items |
| `/client/workouts/[id]/start` | Workout execution; timers and buttons must be tappable (44px); long block list may scroll | Critical | Rest timer, RPE, navigation buttons |
| `/client/workouts/[id]/complete` | Completion screen; primary CTA must be visible and ≥44px | Medium | Submit/Finish button |
| `/client/profile` | Forms and sections; small buttons (e.g. `min-h-11`) may be &lt;44px on some breakpoints | Low | Button, inputs |
| `/client/achievements` | Grid or list; card tap targets | Low | Achievement cards |
| `/coach` (dashboard) | Dashboard layout; widgets and tables; overflow possible on 375px | Medium | Widgets, tables |
| `/coach/clients` | Client list; row tap target and any icon buttons | Low | List rows, buttons |
| `/coach/clients/[id]` | Tabs and cards; tab height and card actions | Low | Tabs, ClientGlassCard |
| `/coach/training/programs` | Programs list/grid; card and button sizes | Low | ProgramsDashboardContent |
| `/coach/workouts/templates` | Template cards, filters, search; small filter chips or icons | Medium | WorkoutTemplateCard, filters |
| `/coach/nutrition` | Nutrition hub; links and cards | Low | Cards, links |
| `/coach/nutrition/meal-plans` | Meal plan cards and actions; `overflow-x-hidden` on container | Low | MealPlanCard, container |
| `/coach/nutrition/meal-plans/[id]` | Detail view; content length and primary actions | Low | Detail content, buttons |
| `/coach/nutrition/generator` | Generator form; long form + sticky footer; scroll to submit | Medium | Form, submit button |
| `/coach/nutrition/foods` | Food list/search; input and row height | Low | Input, list rows |
| `/coach/gym-console` | Console UI; controls and status; touch targets | Medium | Controls, buttons |
| `/coach/adherence` | Adherence views; tables or lists | Low | OptimizedAdherenceTracking |

---

## Modals (375px) — Inferred

| Modal / component | Issue description | Severity | Element/component |
|-------------------|-------------------|----------|-------------------|
| ResponsiveModal (generic) | Content area scrolls; footer actions may be below fold on long content; close button `min-w-11 min-h-11` (44px) OK | Medium | Content area height, footer visibility |
| LogMeasurementModal | Long form (weight, body fat, circumferences, notes); footer "Save" / "Cancel" may require scroll; no visibility of sticky footer guaranteed on all viewports | Medium | Form body, footer |
| AddGoalModal | Form length; scroll to submit | Low | Form, actions |
| MealPlanAssignmentModal | Client list + actions; scroll to confirm | Low | List, footer |
| WorkoutAssignmentModal | Similar pattern | Low | Content, footer |
| Workout execution modals (RestTimer, RPE, TabataCircuitTimer) | Must be clearly visible and dismissible; touch targets for buttons | Critical | Timer overlay, buttons |

---

## Touch Target and Sizing Notes (from codebase)

- Many buttons use `min-h-11` (44px) or `min-h-[44px]` in specific places (e.g. foods, profile, coach clients).
- Some buttons remain `size="sm"` or default without an explicit 44px min; on 375px these could be &lt;44px.
- Tables with `min-w-[280px]` or `min-w-[240px]` inside `overflow-x-auto` are designed to scroll horizontally on small screens; that’s acceptable but should be verified that the scroll affordance is visible.

---

## Recommendations (for later, not implemented)

1. Run a real 375px pass in DevTools for each listed page and modal; confirm no unexpected horizontal scroll, no content cut off, and all primary actions reachable without excessive scroll.
2. Ensure every primary CTA and critical action (Submit, Save, Start, Complete, Close) has at least 44px height (e.g. `min-h-[44px]`).
3. For modals with long forms, consider a sticky footer with actions so "Submit" is always visible, or a clear scroll cue so users know to scroll to the button.

---

*End of audit. No code or configuration was changed.*

# Performance Audit — Read-Only Analysis

**Scope:** All client pages, coach pages, Optimized* components, and key services.  
**Focus:** Supabase query count, waterfalls, duplicate queries, N+1, heavy client-side work.  
**No files were modified.**

---

## Per-page summary table

| Page | Queries | Pattern | Duplicates | N+1 | Waterfall | Rating |
|------|---------|---------|------------|-----|-----------|--------|
| /client (dashboard) | ~4–8 (via API + wellness) | 3 parallel (dashboard API, athlete-score API, check-in) | 0 | No | Auth → then parallel | 🟢 |
| /client/train | 6–12+ | API (program-week) then 3 Supabase flows (blocks, exercises, assignments, logs) | Retry doubles some | No | Program week → exercise counts → extra workouts → logs | 🟡 |
| /client/nutrition | 12–15 | 2 useEffects: meals (7 seq) + goals (2–3) + history (3) | goals 2x (all + pillar) | No | Assignment → meals → 5 batch; goals waterfall | 🟡 |
| /client/check-ins | 3 | 2 parallel (today + range) + 1 goals | 0 | No | Parallel then goals in 2nd useEffect | 🟢 |
| /client/progress/analytics | 3 direct + libs | 6 loaders in Promise.all | 0 | Yes (compound.map getExerciseProgression) | No | 🟡 |
| /client/progress/personal-records | 1 | Single query | 0 | No | No | 🟢 |
| /client/progress/body-metrics | 2 | Sequential | 0 | No | Yes | 🟡 |
| /client/workouts | 0 (page) | Uses child/API | — | — | — | 🟢 |
| /coach (dashboard) | 16 + 6 (briefing + control room) | 2 parallel (getMorningBriefing, getControlRoomResult) | 0 | No | Inside briefing: 16 sequential | 🔴 |
| /coach/clients | 0 direct | Uses component | — | — | — | — |
| /coach/clients/[id] | 1 | Profile only | 0 | No | No | 🟢 |
| /coach/analytics | 0 direct | OptimizedAnalyticsOverview/Reporting | — | — | — | — |
| /coach/adherence | 0 direct | OptimizedAdherenceTracking: 5 | 0 | No | 5 sequential | 🟡 |
| /coach/progress | 0 direct | OptimizedClientProgress: 2 + 10+ per client | 0 | No | fetchClients → loadClientProgress (waterfall) | 🔴 |
| /coach/compliance | 0 direct | OptimizedComplianceDashboard: 7 | 0 | No | 2 then Promise.all(5) | 🟡 |
| /coach/training/programs | 0 direct | ProgramsDashboardContent | — | — | — | — |
| /coach/workouts/templates | 0 direct | OptimizedWorkoutTemplates: 3–4 | 0 | No | templates → blocks → Promise.all(assignments, exercises) | 🟡 |
| /coach/nutrition/meal-plans | 2 batch | 2 parallel (items, assignments) | 0 | No | No | 🟢 |
| /coach/nutrition/foods | 0 direct | OptimizedFoodDatabase | — | — | — | — |
| /coach/nutrition/assignments | 0 direct | OptimizedNutritionAssignments | — | — | — | — |

---

## Detailed findings — 🔴 SLOW pages

### 1. Coach dashboard (`/coach`)

- **Total query count:** 22+ (16 inside `getMorningBriefing`, 6 inside `getControlRoomResult`). Both run in parallel via `Promise.all`, but each is heavy.
- **Waterfall chain (getMorningBriefing):**  
  clients → profiles → todayWorkouts → todayCheckins → recentWellnessLogs → weekWellnessLogs → lastWorkouts → lastCheckins → activePrograms → activeMealPlans → athleteScores → recentAssignments → (if assignments) workout_logs → clientRecords → allWellnessLogsEver. All sequential.
- **Duplicate queries:** None; each table queried once per load.
- **N+1:** None; batched by client_id.
- **Recommendation:** Run steps 2–16 of the briefing in parallel (e.g. `Promise.all` of profiles, todayWorkouts, todayCheckins, recentWellnessLogs, weekWellnessLogs, lastWorkouts, lastCheckins, activePrograms, activeMealPlans, athleteScores, recentAssignments, clientRecords, allWellnessLogsEver). Keep step 1 (clients) first to get `clientIds`. Then run the conditional workout_logs query if needed. Control room is already a separate service; ensure it doesn’t re-fetch clients if the page could pass clientIds.

---

### 2. Coach progress (`/coach/progress` — OptimizedClientProgress)

- **Total query count:** 2 (clients, profiles) on initial load, then **10+ per selected client** in `loadClientProgress`: clients (single), workout_logs, workout_assignments (count), body_metrics, profiles (single), workout_logs again (recent with join), meal_completions, daily_wellness_logs, personal_records, plus Promise.all(getCheckinStreak, getCompletionStats, getTodayLog) and Promise.all(nutrition, habit, achievements, personal_records).
- **Waterfall chain:** fetchClients (2) → set first client → loadClientProgress (clients → workout_logs → workout_assignments → body_metrics → profiles → recent workout_logs → meal_completions → wellness + 2× Promise.all). Largely sequential per client.
- **Duplicate queries:** `profiles` fetched for list then again for selected client; `workout_logs` twice (full count then recent with join).
- **N+1:** No per-item Supabase loop; one “client at a time” waterfall when switching clients.
- **Recommendation:** (1) Batch initial client list + profiles once; (2) For selected client, run all independent fetches in one `Promise.all` (workout_logs, workout_assignments count, body_metrics, profile, meal_completions, daily_wellness_logs, personal_records, plus the existing Promise.all for metrics). (3) Use one workout_logs query with ordering/limit and derive both “count completed” and “recent” in JS, or use a small view/RPC to avoid double read.

---

## Detailed findings — 🟡 MODERATE pages

### /client/train

- **Queries:** Program-week API (server-side), then client-side: workout_blocks, workout_block_exercises, program_day_assignments, workout_assignments, workout_logs. Retry logic can double each call on auth errors.
- **Waterfall:** program-week API → then exercise counts (blocks → block_exercises) and extra workouts (program_day_assignments → workout_assignments) and logs; some parallelizable.
- **Improvement:** Run blocks + program_day_assignments + workout_assignments (for extra workouts) + workout_logs in parallel after program-week is back; then compute exercise counts from blocks + block_exercises in one batch (already batched by template IDs).

### /client/nutrition

- **Queries:** loadTodayMeals: meal_plan_assignments → meals → then meal_food_items, foods, meal_options, meal_photo_logs, meal_completions (last 5 can be parallel). loadWaterGoal: goals (all active) then goals (pillar=nutrition). loadNutritionHistory: meal_photo_logs, meal_completions, meal_food_items.
- **Waterfall:** Assignment then meals then the 5 batch queries (currently sequential); goals twice; history in separate useEffect.
- **Improvement:** Run the 5 batch queries (3a–3e) in `Promise.all` after planMeals is known. Consider one goals query with filters in SQL and split water vs nutrition in JS to avoid two goals calls.

### /client/progress/analytics

- **Queries:** workout_logs, body_metrics, goals (3 direct). Plus getTopProgressions, getTrainedExercises, then `compound.map(getExerciseProgression)` (N+1), getWeeklyVolume, getWellnessTrends (each lib may do 1+ queries).
- **N+1:** `loadStrengthProgressions` calls `getExerciseProgression(user.id, ex.id, "3M")` per compound lift in a loop.
- **Improvement:** Batch load all compound progressions in one or few calls (e.g. one API that accepts multiple exercise IDs and returns progressions), or at least run the existing `Promise.all(compound.map(...))` with a concurrency limit so the UI doesn’t fire 10+ parallel requests at once.

### /client/progress/body-metrics

- Two sequential Supabase calls; can be merged into one or run in parallel if they serve different purposes.

### OptimizedAdherenceTracking

- 5 sequential: clients → profiles → workout_assignments → workout_logs → daily_wellness_logs. Steps 2–5 can run in parallel after clientIds are known.

### OptimizedComplianceDashboard

- clients → profiles → Promise.all(5). First two are sequential; fine. No change critical.

### OptimizedWorkoutTemplates

- workout_templates → workout_blocks → Promise.all(workout_assignments, workout_block_exercises). Slight waterfall; blocks could be parallel with a templates+blocks join or second parallel batch.

### Coach nutrition meal-plans

- Already 2 batch queries (meal_plan_items, meal_plan_assignments); no duplicates. OK.

---

## 🟢 FAST pages (no changes needed)

- **/client:** Dashboard uses 2 API calls + wellness (getTodayLog, getCheckinStreak) in parallel; auth is in AuthProvider.
- **/client/check-ins:** 2 wellness queries in parallel + 1 goals; pillar goals in separate useEffect.
- **/client/progress/personal-records:** Single workout_logs query; PRs derived client-side.
- **/client/workouts:** Page does not run Supabase directly; delegates to children/API.
- **/coach/clients/[id]:** Single profile fetch.
- **/coach/nutrition/meal-plans:** Two batched queries, no N+1.

---

## Component-level query counts (data-fetching components)

| Component | Queries | Pattern |
|-----------|---------|---------|
| OptimizedAdherenceTracking | 5 | Sequential: clients → profiles → assignments → logs → wellness |
| OptimizedClientProgress | 2 + 10+ per client | clients → profiles; then per client: long waterfall |
| OptimizedComplianceDashboard | 7 | clients → profiles → Promise.all(5) |
| OptimizedWorkoutTemplates | 3–4 | templates → blocks → Promise.all(assignments, block_exercises) |
| OptimizedFoodDatabase | 1–2 | foods (list; optional second for filters) |
| OptimizedNutritionAssignments | 3–4 | meal_plan_assignments → profiles + meal_plans; meal_completions |
| OptimizedExerciseLibrary | 2–3 | exercises; exercise_categories; exercises again on filter |
| OptimizedAnalyticsOverview | 4 | clients → profiles → Promise.all(workout_logs, workout_assignments) |
| OptimizedAnalyticsReporting | 5 | clients → profiles → Promise.all(workout_logs, goals, achievements) |

---

## Service-level summary

### coachDashboardService.ts

- **getCoachStats:** 3 sequential (clients, workout_templates, meal_plans). Can be `Promise.all`.
- **getRecentClients:** 2 sequential (clients, profiles). OK.
- **getMorningBriefing:** 16 sequential queries (see Coach dashboard). Biggest win: parallelize after clients.

### clientDashboardService.ts

- **calculateStreak:** 1 (workout_logs).
- **calculateWeeklyProgress:** getProgramState (internal) + workout_logs + workout_assignments + clients + profiles + getCurrentWorkoutFromProgress (which can do template + assignment queries). Multiple sequential steps; some could run in parallel once clientId and program state are known.

### useDashboardData.ts (useClientDashboardData / useCoachDashboardData)

- Uses DatabaseService + cache; 4-way Promise.all for client, 3-way for coach. Good.

### prefetch.ts

- PrefetchClientDashboard: Promise.all(4) via DatabaseService. Good. No Supabase in this file directly.

---

## Cross-cutting analysis

### 1. Worst offenders (top 5 by query count / load time)

1. **Coach dashboard** — 22+ queries (16 in getMorningBriefing + 6 in getControlRoomResult). Sequential briefing dominates.
2. **Coach progress (OptimizedClientProgress)** — 2 + 10+ per client; switching client triggers full waterfall again.
3. **Client nutrition** — 12–15 queries across 2 useEffects and multiple sequential steps.
4. **Client train** — 6–12+ (API + 3 Supabase flows with retries).
5. **Coach compliance (OptimizedComplianceDashboard)** — 7 queries; 2 sequential then 5 in parallel. Moderate.

### 2. Common anti-patterns

- **Sequential waterfall where parallel is possible:**  
  getMorningBriefing (16 steps), loadClientProgress (10+ steps), client nutrition (assignment → meals → 5 batch), OptimizedAdherenceTracking (5 steps).
- **Duplicate or redundant queries:**  
  OptimizedClientProgress: profiles and workout_logs each fetched twice per client. Nutrition: goals table twice (all active + pillar=nutrition).
- **N+1:**  
  Client progress/analytics: `compound.map(getExerciseProgression)` in loadStrengthProgressions.
- **select('*') where narrower select would help:**  
  OptimizedClientProgress: clients and profiles use `select('*')`; coach meal-plans batch already uses targeted selects. Several components could select only needed columns.
- **Missing pagination / full table load:**  
  getMorningBriefing loads “all wellness logs ever” and “last check-ins” without limit; lastWorkouts/lastCheckins are full order then deduped in JS. Consider limit or RPC for “latest per client”.

### 3. Auth waterfall

- **Pattern:** AuthProvider (useAuth) provides user; pages run useEffect when `user` is set and then call Supabase or API. No extra “get profile then load data” in most pages; profile often comes from AuthContext or one profile fetch.
- **Coach dashboard:** No extra auth step; goes straight to getMorningBriefing + getControlRoomResult.
- **Client dashboard:** Uses API routes that do auth on the server; client only waits for user then fires 3 parallel requests. No unnecessary steps.

### 4. Component double-mounting

- **StrictMode:** Not found in `src/app/layout.tsx`. No React StrictMode in root layout.
- **ProtectedRoute:** Used on many pages; typically wraps content and may cause a brief mount before redirect. No evidence of double-mount causing duplicate fetches in the code; if ProtectedRoute re-mounts after auth, one could see two loads. Recommend checking in devtools whether key pages fire their main load twice.

### 5. Recommended fix priority

1. **Coach dashboard (getMorningBriefing)** — High traffic, 16 sequential queries. Parallelize steps 2–16 after clients. Highest impact.
2. **Coach progress (OptimizedClientProgress)** — High traffic; 10+ queries per client and duplicate fetches. Batch and parallelize per-client load; remove duplicate profile and workout_logs.
3. **Client nutrition** — Parallelize the 5 batch queries in loadTodayMeals; reduce goals to one query.
4. **Client progress/analytics** — Remove N+1 in loadStrengthProgressions (batch or cap concurrency for getExerciseProgression).
5. **Client train** — Parallelize Supabase flows after program-week and avoid retry doubling where possible.
6. **OptimizedAdherenceTracking** — Parallelize steps 2–5 after clientIds.
7. **clientDashboardService.calculateWeeklyProgress** — Parallelize independent queries where safe (RLS/ownership preserved).

---

## Notes

- **RLS / security:** All recommendations assume preserving existing RLS and ownership checks; batching and parallelization must not merge data across users or coaches.
- **API vs client Supabase:** Client dashboard uses `/api/client/dashboard` and `/api/client/athlete-score` (and RPC/buildProgramWeekState on server); train uses `/api/client/program-week` then client Supabase. Server-side RPC/API can reduce round-trips and keep heavy logic behind one auth check.
- **Lifestyle page:** `src/app/client/lifestyle/page.tsx` was not found; may have been removed or renamed.

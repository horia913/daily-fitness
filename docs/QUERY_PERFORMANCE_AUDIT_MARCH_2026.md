# Query Performance Audit — March 2026

**Read-only audit. No code changes.**

---

## Step 1: Query Count Per Page Load

| Page | File(s) | Query Count | Tables Queried |
|------|---------|-------------|----------------|
| `/client` (dashboard) | `page.tsx`, `/api/client/dashboard`, `/api/client/athlete-score`, `wellnessService` | **~25–35** | See Step 2 |
| `/client/train` | `page.tsx`, `program-week` API, `WorkoutSetEntryService` | **~15–25** | program_assignments, program_schedule, program_day_completions, workout_templates, workout_set_entries, workout_set_entry_exercises, workout_time_protocols, workout_drop_sets, etc. |
| `/client/nutrition` | `page.tsx` (client-side) | **~8–15** | meal_plan_assignments, client_daily_plan_selection, meals, meal_food_items, meal_options, meal_completions, foods, storage (signed URLs) |
| `/client/check-ins` | `page.tsx`, `wellnessService`, `measurementService`, `checkInConfigService` | **~8** | daily_wellness_logs (×2), body_metrics (×2), check_in_configs (via clients), goals |
| `/client/goals` | `page.tsx` | **~3–4** | goals, habit_logs, goal_templates |
| `/client/progress/body-metrics` | `page.tsx`, `nutritionLogService` | **~6–8** | body_metrics (×2), goals, nutrition_logs (via getNutritionComplianceTrend), goals (via getClientNutritionGoals) |
| `/coach` (dashboard) | `page.tsx`, `/api/coach/dashboard` | **~25–35** | clients, profiles, workout_logs, daily_wellness_logs (×4), program_assignments, meal_plan_assignments, athlete_scores, workout_assignments, program_progress, program_schedule, program_day_completions, check_in_configs, body_metrics, user_achievements |
| `/coach/clients` | `page.tsx`, `/api/coach/clients` | **~6–8** | clients, profiles, workout_logs, daily_wellness_logs (×2), program_assignments, meal_plan_assignments |
| `/coach/clients/[id]` | `page.tsx`, `/api/coach/clients/[clientId]/summary` | **~6–8** | clients, profiles, workout_logs, program_assignments, program_schedule, program_day_completions, workout_assignments |
| `/coach/nutrition/meal-plans` | `page.tsx`, `MealPlanService` | **~4** | meal_plans, meal_plan_items, meal_plan_assignments |
| `/coach/gym-console` | `page.tsx`, `/api/coach/gym-console/status` | **~15–25 per poll** | profiles, clients, workout_sessions, workout_logs, workout_set_logs, workout_blocks, workout_block_exercises, exercises, program_assignments, program_schedule, program_day_completions (×N clients) |

---

## Step 2: Worst Offenders — Detailed Breakdown

### `/client` (Dashboard)

**Data flow:** `fetchDashboardPageData` → 3 parallel fetches:
1. **`/api/client/dashboard`** (1 HTTP call, many DB queries):
   - `auth.getUser()` — 1
   - `rpc('get_client_dashboard')` — 1 RPC (consolidates many)
   - `buildProgramWeekState` → `getProgramState` → 1–5 queries (program_assignments, program_schedule, program_day_completions, programs, workout_templates)
   - Highlights: `personal_records` (count), `user_achievements` (1 row), `leaderboard_entries`, `achievement_templates` (1), `exercises` (1)
   - **Total in dashboard API: ~10–15 queries**

2. **`/api/client/athlete-score`** (1 HTTP call):
   - `getLatestAthleteScore` — athlete_scores
   - `getAthleteScoreHistory` — athlete_scores
   - Possibly `calculateAthleteScore` — many sub-queries (workout_logs, program_state, daily_wellness_logs, goals, nutrition_logs)
   - **Total: 2–15+ queries** (depends on cache hit)

3. **`getTodayLog` + `getCheckinStreak`** (client-side, 2 queries):
   - `daily_wellness_logs` × 2 (today + last 365 for streak)

**Flags:**
- ⚠️ **Duplicate `daily_wellness_logs`**: today's log fetched in dashboard RPC (if included) and again in `getTodayLog`
- ⚠️ **`getCheckinStreak`** fetches up to 365 rows; could use `.limit(365)` — already has it
- ✅ Dashboard RPC reduces many queries; program week state adds 5–8 more

---

### `/client/train`

**Data flow:**
- `usePageData` → `fetchProgramWeekData` → `/api/client/program-week`
- `buildProgramWeekState` → `getProgramState` → 3–5 queries
- `workout_templates` for template names
- When user selects a workout: `WorkoutSetEntryService.getWorkoutBlocksForTemplates(templateIds)`:
  - `workout_set_entries` (1)
  - `buildBlocksForTemplates` → `workout_set_entry_exercises`, `workout_time_protocols`, `workout_drop_sets`, `workout_cluster_sets`, `workout_rest_pause_sets`, `workout_hr_sets` (chunked by block IDs)
  - `exercises` for names

**Flags:**
- ⚠️ **N+1 risk**: If multiple templates load, `getWorkoutBlocksForTemplates` batches by template_id, but special tables are queried in chunks (`queryTableInChunks`)
- ⚠️ **No `.limit(1)`** on single-row lookups in programStateService (uses `.maybeSingle()` where appropriate)
- ✅ Batched template fetch; chunked special-table queries avoid huge IN lists

---

### `/client/nutrition`

**Data flow (client-side Supabase):**
1. `meal_plan_assignments` + `client_daily_plan_selection` (2, parallel)
2. `meals` (1)
3. `meal_food_items`, `meal_options`, `meal_completions` (3, parallel)
4. `foods` (1, by unique food IDs)
5. **N+1**: `meal_completions` → `createSignedUrl` per completion with photo (storage API, not DB)

**Flags:**
- 🚨 **Queries in loop**: `Promise.all((allCompletions || []).map(async (comp) => { ... createSignedUrl ... }))` — one storage request per completion with photo
- ⚠️ Could batch storage signed URLs or defer to on-demand
- ✅ Food items batched; no duplicate table fetches

---

### `/client/check-ins`

**Data flow:**
- `getTodayLog`, `getLogRange`, `getLatestMeasurement`, `getClientMeasurements`, `getClientCheckInConfig` — 5 parallel
- `fetchPillarGoals` — 1 (goals)
- `getClientCheckInConfig` → 2 queries (clients for coach_id, then check_in_configs)

**Flags:**
- ⚠️ **`getLogRange`** fetches 90 days of logs — reasonable
- ⚠️ **`getClientMeasurements(user.id, 2)`** — has limit
- ✅ All 5 initial fetches in `Promise.all`

---

### `/client/goals`

**Data flow:**
- `goals` (1)
- `habit_logs` (1, if habit goals exist)
- `goal_templates` (1, on mount for preset goals)

**Flags:**
- ✅ Low query count; no N+1

---

### `/client/progress/body-metrics`

**Data flow:**
- `body_metrics` (×2: full + chart subset), `goals` (1) — 3 parallel
- `getClientNutritionGoals` → goals (1)
- `getNutritionComplianceTrend` → `getLogRange` + `getClientNutritionGoals` → nutrition_logs (1) + goals (1) — **duplicate goals fetch**

**Flags:**
- ⚠️ **Duplicate `goals`**: fetched in initial batch and again in `getClientNutritionGoals` (inside getNutritionComplianceTrend)
- ⚠️ **Duplicate `body_metrics`**: full + chart — could be one query with different column selection

---

### `/coach` (Dashboard)

**Data flow:** `getMorningBriefing` + `getControlRoomResult` in parallel.

**getMorningBriefing:**
- clients (1)
- profiles (1)
- 12 parallel: workout_logs, daily_wellness_logs (×4 variants), program_assignments, meal_plan_assignments, athlete_scores, workout_assignments, clients (created_at), daily_wellness_logs (all ever)
- Then: program_progress, program_schedule, program_day_completions (3)
- workout_logs (completed for assignments) (1)
- check_in_configs, body_metrics (2)
- user_achievements (1)

**getControlRoomResult:**
- clients (1)
- program_assignments (1)
- program_progress, program_schedule, program_day_completions (3)

**Flags:**
- ⚠️ **Duplicate `clients`**: fetched in both briefing and control room
- ⚠️ **Duplicate `daily_wellness_logs`**: 4+ queries with different filters (today, 3 days, week, all)
- ✅ Batch queries; no per-client loops

---

### `/coach/clients`

**Data flow:** `/api/coach/clients`:
- clients (1)
- profiles + `getClientMetrics` in parallel
- `getClientMetrics`: workout_logs, daily_wellness_logs (×2), program_assignments, daily_wellness_logs (all, limit 10000)

**Flags:**
- ⚠️ **`daily_wellness_logs`** queried 3 times in getClientMetrics (7-day, 7-day detailed, 365-day for streak)
- ✅ Batched; no N+1

---

### `/coach/clients/[id]`

**Data flow:** `/api/coach/clients/[clientId]/summary`:
- clients (1, assert ownership)
- profiles, `calculateStreakWithClient`, `calculateWeeklyProgressWithClient` (3 parallel)
- `calculateWeeklyProgressWithClient` → workout_logs, getProgramState (program_assignments, program_schedule, program_day_completions), workout_assignments

**Flags:**
- ✅ Single client; query count acceptable
- `getProgramState` = 3–4 queries

---

### `/coach/nutrition/meal-plans`

**Data flow:**
- `MealPlanService.getMealPlans` → meal_plans (1)
- meal_plan_items, meal_plan_assignments (2)
- Optional: `DatabaseService.getClients` when opening assign modal

**Flags:**
- ✅ Low count; batched

---

### `/coach/gym-console`

**Data flow:** POST `/api/coach/gym-console/status` (polled every 30s):
- profiles (1), clients (1)
- `getProgramState` **per client** (up to 6) → 3–4 queries × N = **18–24 queries** for 6 clients
- workout_sessions, workout_logs, workout_set_logs
- workout_blocks, workout_block_exercises, exercises
- template block counts

**Flags:**
- 🚨 **N+1**: `Promise.all(validClientIds.map(cid => getProgramState(...)))` — 6 clients = 18–24 queries from getProgramState alone
- ⚠️ **RPC opportunity**: Single `get_gym_console_status(client_ids[])` could replace 20+ queries

---

## Step 3: Missing Indexes — SQL to Run

Run in Supabase SQL Editor:

```sql
-- Find slow queries (if pg_stat_statements is available)
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

If `pg_stat_statements` is not available:

```sql
-- Tables with no indexes besides the primary key
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
AND NOT EXISTS (
  SELECT 1 FROM pg_indexes i
  WHERE i.schemaname = 'public'
  AND i.tablename = t.tablename
  AND i.indexname != t.tablename || '_pkey'
);
```

**Common filter columns to verify indexes:**
- `daily_wellness_logs`: (client_id, log_date)
- `workout_logs`: (client_id), (completed_at), (workout_assignment_id)
- `program_assignments`: (client_id, status)
- `program_day_completions`: (program_assignment_id)
- `meal_plan_assignments`: (client_id, is_active)
- `body_metrics`: (client_id, measured_date)
- `nutrition_logs`: (client_id, log_date)
- `workout_sessions`: (client_id, status)

---

## Step 4: RPC Functions — Current Usage & Opportunities

### Existing RPCs

| RPC | Used By | Replaces |
|-----|---------|----------|
| `get_client_dashboard` | `/api/client/dashboard` | ~10+ individual queries |
| `get_client_workout_summary` | workouts summary API, serverCache | Multiple queries |
| `get_coach_pickup_workout` | `/api/coach/pickup/next-workout` | Program + template + blocks |
| `create_clipcard` | coach clipcards page | Multi-step insert |
| `create_invite_code` | coach add client | Invite creation |
| Compliance RPCs | ComplianceSnapshot | Compliance aggregation |

### Pages That Would Benefit From New RPCs

| Page | Current Queries | Proposed RPC | Est. Reduction |
|------|-----------------|--------------|-----------------|
| `/coach/gym-console` | 20–30 per poll | `get_gym_console_status(client_ids uuid[])` | 20+ → 1 |
| `/client/check-ins` | 8 | `get_checkin_page_data(client_id)` | 8 → 1 |
| `/client/progress/body-metrics` | 6–8 | `get_body_metrics_page_data(client_id, date_from)` | 6 → 1 |
| `/coach` dashboard | 25–35 | `get_coach_morning_briefing(coach_id)` | 25+ → 1 |
| `/coach/clients` | 6–8 | `get_coach_clients_with_metrics(coach_id)` | 6+ → 1 |
| `/client/nutrition` | 8–15 + N storage | `get_client_nutrition_page(client_id, date)` | 10+ → 1 (DB only) |

---

## Summary

| Metric | Value |
|--------|-------|
| **Highest query count** | `/coach` dashboard, `/client` dashboard (~25–35 each) |
| **Worst N+1** | Gym console: `getProgramState` × 6 clients |
| **Duplicate queries** | goals (body-metrics), daily_wellness_logs (coach), clients (coach) |
| **Queries in loops** | Nutrition: `createSignedUrl` per completion with photo |
| **RPC coverage** | Client dashboard, coach pickup — good; coach dashboard, gym console — high opportunity |

---

## Recommended Next Steps (When Implementing)

1. **Gym console**: Create `get_gym_console_status(client_ids[])` RPC to batch program state and session data.
2. **Coach dashboard**: Create `get_coach_morning_briefing(coach_id)` RPC.
3. **Body metrics page**: Reuse `getClientNutritionGoals` result; avoid double fetch in `getNutritionComplianceTrend`.
4. **Nutrition page**: Batch or defer storage signed URL generation; consider CDN or pre-signed URLs at upload.
5. **Run index audit**: Execute the SQL in Step 3 and add indexes for high-traffic filter columns.

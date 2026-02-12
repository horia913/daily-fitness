# As-Is System Map — DailyFitness App

**Purpose:** Accurate understanding of what exists today, how it works, and where major coupling points are. Analysis and documentation only; no refactors or new features.

---

## Tech stack (versions)

- **Next.js:** 15.5.9 (App Router, Turbopack for dev)
- **React:** 19.1.0
- **Supabase:** `@supabase/supabase-js` 2.57.4, `@supabase/ssr` 0.5.2
- **Auth:** Supabase Auth (session); server `createSupabaseServerClient`, client profile via AuthContext
- **UI:** Tailwind 4, Radix (Dialog, Tabs, Select, Checkbox, Progress, Avatar, Label, Slot), Lucide icons, CVA, clsx, tailwind-merge
- **Forms/validation:** react-hook-form, @hookform/resolvers, Zod 4
- **State:** React state + context (AuthContext, ThemeContext); no global store
- **Data fetching:** fetch to API routes (credentials: include); server RPC for dashboard; Supabase client in components for some lists

---

## A) App Overview

DailyFitness is a fitness coaching SaaS/PWA built with **Next.js 15** (App Router), **Supabase** (Postgres + Auth), and **Tailwind CSS**. The app prioritizes **training adherence**; nutrition is secondary. It supports **multi-week programs** with strict week-by-week unlock rules. There are three main entry points: **client** (bottom nav: Home, Workouts, Nutrition, Progress, Menu), **coach** (Dashboard, Workouts, Programs, Nutrition, Menu), and **admin** (achievement templates, goal templates, habit categories, tracking sources). Auth is session-based via Supabase (`@supabase/ssr` server client, `AuthContext` + profile on the client). The client dashboard (“today”) is driven by a single RPC `get_client_dashboard` plus a separate `GET /api/client/program-week` for program week/day cards. “Today’s workout” and program progression use a **canonical program state** (program_assignments, program_schedule, program_day_completions ledger, program_progress cache) resolved by `programStateService` and written by `completeWorkoutService`; legacy tables (program_day_assignments, program_workout_completions, program_assignment_progress) are still present but the codebase is migrated to the new ledger where possible.

---

## B) Route Map

| Segment | Path | Purpose |
|--------|------|--------|
| **Root** | `/` | Landing/auth (no AppLayout/Header/BottomNav) |
| **Client** | `/client` | Client dashboard (today, program week cards, gauges, quick actions) |
| | `/client/workouts` | Workout list (EnhancedClientWorkouts) |
| | `/client/workouts/[id]/details` | Workout details |
| | `/client/workouts/[id]/start` | Live workout execution (blocks, log set, complete) |
| | `/client/workouts/[id]/complete` | Complete workout screen (POST complete, then next workout) |
| | `/client/programs/[id]/details` | Program details |
| | `/client/nutrition` | Nutrition dashboard (assigned meal plan, today’s meals, mark completed) |
| | `/client/nutrition/meals/[id]` | Single meal view |
| | `/client/nutrition/foods/[id]`, `/create` | Food detail/create |
| | `/client/progress` | Progress hub |
| | `/client/progress/analytics` | Analytics |
| | `/client/progress/workout-logs`, `/[id]` | Workout logs |
| | `/client/progress/body-metrics` | Body metrics |
| | `/client/progress/goals` | Goals |
| | `/client/progress/nutrition` | Progress nutrition |
| | `/client/progress/personal-records` | PRs |
| | `/client/progress/leaderboard` | Leaderboard |
| | `/client/progress/mobility` | Mobility |
| | `/client/progress/achievements` | Achievements |
| | `/client/goals`, `/habits`, `/achievements`, `/challenges`, `/challenges/[id]` | Goals, habits, achievements, challenges |
| | `/client/scheduling` | Book sessions |
| | `/client/sessions` | Sessions list |
| | `/client/clipcards` | Clip cards |
| | `/client/profile` | Profile |
| | `/client/menu` | Menu (links to all sections) |
| **Coach** | `/coach` | Coach dashboard |
| | `/coach/programs` | Programs list |
| | `/coach/programs/[id]`, `edit`, `create` | Program view/edit/create |
| | `/coach/programs-workouts` | Programs + workouts |
| | `/coach/workouts/templates` | Workout templates list |
| | `/coach/workouts/templates/[id]`, `edit`, `create` | Template view/edit/create |
| | `/coach/clients` | Clients list |
| | `/coach/clients/add` | Add client |
| | `/coach/clients/[id]` | Client hub (tabs: profile, workouts, programs, progress, etc.) |
| | `/coach/clients/[id]/workouts` | Client workouts |
| | `/coach/clients/[id]/programs/[programId]` | Client program |
| | `/coach/compliance`, `/adherence` | Compliance / adherence |
| | `/coach/analytics` | Analytics |
| | `/coach/nutrition`, `/nutrition/meal-plans`, `[id]`, `edit`, `create` | Nutrition / meal plans |
| | `/coach/scheduling`, `/sessions` | Scheduling, sessions |
| | `/coach/availability` | Availability |
| | `/coach/exercises`, `/exercise-categories` | Exercises |
| | `/coach/goals`, `/habits`, `/meals` | Goals, habits, meals |
| | `/coach/gym-console` | Gym console (pickup) |
| | `/coach/notifications` | Notifications |
| | `/coach/reports` | Reports |
| | `/coach/profile` | Profile |
| | `/coach/menu` | Menu |
| **Admin** | `/admin` | Admin dashboard |
| | `/admin/achievement-templates` | Achievement templates |
| | `/admin/goal-templates` | Goal templates |
| | `/admin/habit-categories` | Habit categories |
| | `/admin/tracking-sources` | Tracking sources |
| **Other** | `/create-user` | Create user |
| | `/simple-auth` | Simple auth |
| | `/database-status`, `/setup-database` | DB status/setup |
| | `/test-supabase` | Test Supabase |

**Route groups:** None beyond `(admin)`, `(client)`, `(coach)` as path prefixes. Layout: root `layout.tsx` wraps all with `AppLayout` (except `/`); `AppLayout` renders `Header` + main + `BottomNav`. Client vs coach nav is chosen in `BottomNav` by `pathname.startsWith('/coach')`.

---

## C) API Routes Summary

| Method | Path | Purpose |
|--------|------|--------|
| GET | `/api/client/dashboard` | Single RPC `get_client_dashboard` → avatar, name, streak, weekly progress/stats, workout days, body weight, **todaysWorkout** |
| GET | `/api/client/program-week` | Program state via `programStateService.getProgramState` → current unlocked week, day slots with completion, template names |
| GET | `/api/client/workouts/summary` | Client workout summary (RPC if present) |
| POST | `/api/program-workouts/start` | Start by `program_day_assignment_id`; create workout_assignment if needed, link to program_day_assignments |
| POST | `/api/program-workouts/start-from-progress` | **Canonical start:** resolve slot (user-selected or next), week lock check, reuse in-progress session/log or create assignment + session + log with program tags |
| POST | `/api/log-set` | Get/create workout_log, insert workout_set_logs row, upsert user_exercise_metrics, optional goal sync |
| PATCH | `/api/sets/[id]` | Edit set log (in-progress workout only); whitelist by block_type; recompute user_exercise_metrics |
| DELETE | `/api/sets/[id]` | Delete set log (in-progress only); delete giant_set children; recompute metrics |
| POST | `/api/block-complete` | Upsert workout_block_completions (workout_log_id or resolve/create from workout_assignment_id) |
| POST | `/api/complete-workout` | **Unified pipeline** via `completeWorkoutService`: update workout_logs, session, program_day_completions (ledger), program_progress cache; week lock on advance |
| POST | `/api/coach/pickup/mark-complete` | Coach mark complete → same `completeWorkout` service |
| GET | `/api/coach/pickup/next-workout` | Next workout for coach pickup |
| GET | `/api/coach/dashboard` | Coach dashboard RPC |
| POST | `/api/clients/create` | Create client |
| POST | `/api/sessions/create` | Create session |
| POST | `/api/cancel-session` | Cancel session |
| POST | `/api/emails/send-invite` | Send invite email |
| POST | `/api/notifications/send` | Send notification |
| POST | `/api/goals/sync` | Sync goals |
| PATCH | `/api/user/timezone` | Update profiles.timezone (IANA) |
| POST | `/api/set-rpe` | Set RPE on a set log |
| GET/POST | `/api/cron/daily-sync` | Daily sync cron |
| GET/POST | `/api/cron/daily-reset` | Daily reset cron |
| GET/POST | `/api/cron/weekly-reset` | Weekly reset cron |

---

## D) Data Model Map (Canonical Tables & Relationships)

### Programs, weeks, schedule

| Table | Key columns | Source of truth / rules |
|-------|-------------|-------------------------|
| **workout_programs** | id, name, coach_id, duration_weeks, ... | Program template (multi-week). |
| **program_assignments** | id, program_id, client_id, coach_id, start_date, status, total_days, ... | One active per client (partial unique). |
| **program_schedule** | id, program_id, template_id, week_number, day_number, day_of_week | Ordered slots (week_number ASC, day_number ASC). day_number 1-based. |
| **program_progress** | program_assignment_id (PK), current_week_number, current_day_number, is_completed | **Cache** only; derived from ledger. |
| **program_day_completions** | id, program_assignment_id, program_schedule_id, completed_at, completed_by | **Ledger** — one row per completed slot. UNIQUE(program_assignment_id, program_schedule_id). |
| **program_day_assignments** | id, program_assignment_id, day_number, day_type, workout_assignment_id, workout_template_id, is_completed, ... | Assignment/template linkage; legacy completion flags still present. |
| **program_workout_completions** | assignment_progress_id, client_id, program_id, week_number, program_day, template_id, workout_date, ... | Legacy; completion flow uses program_day_completions. |

- **Canonical read:** `programStateService`: getActiveProgramAssignment → getProgramSlots + getCompletedSlots → nextSlot, computeUnlockedWeekMax, assertWeekUnlocked.
- **Canonical write:** `completeWorkoutService`: INSERT program_day_completions (ON CONFLICT DO NOTHING), then updateProgressCache.

### Workout execution & logs

| Table | Key columns | Source of truth / rules |
|-------|-------------|-------------------------|
| **workout_templates** | id, coach_id, name, difficulty_level, ... | Template definition. |
| **workout_blocks** | id, template_id, block_type, block_order, ... | Block-level; special tables per block type (see user rule hierarchy). |
| **workout_assignments** | id, workout_template_id, client_id, coach_id, assigned_date, scheduled_date, status | Assigned instance; created on start (program or ad hoc). |
| **workout_sessions** | id, assignment_id, client_id, status, started_at, completed_at, program_assignment_id, program_schedule_id | Optional session wrapper; used by start-from-progress and complete. |
| **workout_logs** | id, workout_assignment_id, client_id, started_at, completed_at, program_assignment_id, program_schedule_id | One active log per assignment (completed_at IS NULL); completed_at set by complete-workout. |
| **workout_set_logs** | id, workout_log_id, client_id, block_id, block_type, exercise_id, weight, reps, set_number, completed_at, rpe, ... | One row per logged set; block_type-specific columns. |
| **workout_block_completions** | workout_log_id, workout_block_id, completed_at, completion_type | Block-level completion (e.g. timer-only blocks). |

- **Log set:** workout_log_id required (or created from workout_assignment_id + session_id). Insert into workout_set_logs; then upsert user_exercise_metrics.
- **Undo/edit/delete:** PATCH/DELETE `/api/sets/[id]` only if workout_log.completed_at IS NULL; after change, recompute user_exercise_metrics for affected exercises.

### Compliance / completion tracking

- **Program:** program_day_completions (ledger) + program_progress (cache). Week lock: all slots in week W must be complete before week W+1 is unlocked (`assertWeekUnlocked` in programStateService).
- **Workout:** workout_logs.completed_at + totals; weekly counts from workout_logs in dashboard RPC (week bounds: `date_trunc('week', CURRENT_DATE)` Monday–Sunday).

### Goals, habits, check-ins, metrics

| Table | Purpose |
|-------|--------|
| **goals** | client_id, coach_id, title, target_value, current_value, status, start_date, completed_date |
| **habit_assignments**, **habit_logs** | Habit tracking |
| **body_metrics** | client_id, measured_date, weight_kg, circumferences, ... |
| **user_exercise_metrics** | user_id, exercise_id, estimated_1rm, best_weight, best_reps, best_volume, ... (updated on log-set and recompute) |
| **personal_records** | client_id, exercise_id, record_type, record_value, achieved_date |

### Nutrition / meal plans

| Table | Key columns |
|-------|-------------|
| **meal_plans** | id, coach_id, name, target_calories, target_protein, ... |
| **meals** | id, meal_plan_id, meal_type, order_index |
| **meal_plan_assignments** | id, coach_id, client_id, meal_plan_id, start_date, end_date, is_active |
| **meal_food_items** | meal_id, food_id, quantity, unit |
| **meal_completions** | id, meal_id, client_id, completed_at |
| **meal_photo_logs** | client_id, meal_id, log_date, photo_url |
| **foods** | id, name, serving_size, calories_per_serving, ... |

### Timezone and date bucketing

- **Server “today”:** Dashboard RPC uses `CURRENT_DATE` and `date_trunc('week', CURRENT_DATE)` (server timezone).
- **Client:** `profiles.timezone` (IANA) updated via PATCH `/api/user/timezone`; synced on login via `timezoneSync.ts`.
- **Week boundaries (compliance):** `weekComplianceService` uses assignment timezone_snapshot or profile timezone for “week start” (midnight in that zone).
- **Program week/day:** Stored as week_number, day_number (1-based); no per-row timezone — week lock is ordinal (complete all slots in week N before N+1).

---

## E) Critical Flows (File Paths + Functions)

### 1. Load assignment / “today’s workout”

- **Client dashboard:**  
  - `src/app/client/page.tsx`: `fetchDashboardData()` → GET `/api/client/dashboard` → RPC `get_client_dashboard`.  
  - RPC (migration `20260202_client_dashboard_rpc.sql`): uses `CURRENT_DATE`, weekly bounds, then builds **todaysWorkout** from program/assignments (patch in `20260209_patch_dashboard_rpc_column_names.sql` likely aligns column names to program_progress/program_schedule).
- **Program week cards:**  
  - Same page: `fetchProgramWeekData()` → GET `/api/client/program-week`.  
  - `src/app/api/client/program-week/route.ts`: `getProgramState(supabase, user.id)` → `computeUnlockedWeekMax()` → returns current unlocked week slots with completion and template names.
- **List “today” elsewhere:**  
  - `EnhancedClientWorkouts.tsx`: filters by `scheduled_date === today` (client `new Date().toISOString().split('T')[0]`).

### 2. Start workout

- **From dashboard (program):**  
  - `src/app/client/page.tsx` `handleStartDay(scheduleId)` → POST `/api/program-workouts/start-from-progress` with `program_schedule_id`.  
  - `src/app/api/program-workouts/start-from-progress/route.ts`: `getProgramState()` → validate slot → `assertWeekUnlocked()` → check workout_sessions (in_progress, same program_schedule_id) then workout_logs (completed_at IS NULL, same program_schedule_id); if found return existing assignment_id; else create workout_assignments + workout_sessions + workout_logs with program_assignment_id + program_schedule_id → return workout_assignment_id.  
  - Redirect to `/client/workouts/[workout_assignment_id]/start`.
- **Legacy start by program day assignment:**  
  - POST `/api/program-workouts/start` with `program_day_assignment_id`; creates workout_assignment, updates program_day_assignments.workout_assignment_id.

### 3. Log set

- **UI:** `src/app/client/workouts/[id]/start/page.tsx` → `LiveWorkoutBlockExecutor` → block executors (e.g. `StraightSetExecutor`) call `fetchApi('/api/log-set', { method: 'POST', body: { ... } })`.
- **API:** `src/app/api/log-set/route.ts`:  
  - Auth, validate client_id = user.  
  - Resolve or create workout_log (workout_assignment_id required if no workout_log_id; optional session_id to link).  
  - Build insert for `workout_set_logs` by block_type (straight_set, superset, giant_set, amrap, dropset, cluster_set, rest_pause, preexhaust, emom, tabata, fortime).  
  - Idempotency: if idempotency_key, dedupe by (workout_log_id, block_id, set_number, exercise_id).  
  - Insert; then e1RM calc and upsert `user_exercise_metrics`; optional strength goal sync.  
  - Returns set_log_id, workout_log_id, e1rm, pr.

### 4. Undo set / edit / delete

- **API:** `src/app/api/sets/[id]/route.ts`:  
  - **PATCH:** `getSetAndValidate()` (set + workout_logs join; must be same client, workout_log.completed_at IS NULL). Build update from body with WHITELIST per block_type; FORBIDDEN_KEYS (client_id, workout_log_id, block_id, block_type, completed_at, created_at). Update workout_set_logs; then `recomputeUserExerciseMetrics(user.id, exerciseIds)`.  
  - **DELETE:** Same validation; for giant_set delete workout_giant_set_exercise_logs by workout_set_log_id; delete workout_set_logs row; recompute metrics.

### 5. Complete workout

- **UI:** `src/app/client/workouts/[id]/complete/page.tsx`: on confirm, POST `/api/complete-workout` with workout_log_id, client_id, duration_minutes?, session_id?.
- **API:** `src/app/api/complete-workout/route.ts` → `completeWorkout()` in `src/lib/completeWorkoutService.ts`:  
  1. Load workout_log (ownership).  
  2. Idempotency: if completed_at set, return alreadyCompleted.  
  3. Sum totals from workout_set_logs.  
  4. Update workout_logs (completed_at, total_sets_completed, total_duration_minutes).  
  5. Update workout_sessions (status, completed_at) if sessionId.  
  6. If program_assignment_id + program_schedule_id on log: INSERT program_day_completions ON CONFLICT DO NOTHING; get next slot; assertWeekUnlocked for that next slot (if advancing); updateProgressCache(program_progress).  
  7. (Optional) goal/achievement sync.  
- Week lock: if completion would advance to a week not yet unlocked, returns 403 WEEK_LOCKED.

### 6. Program week progression / week lock

- **Rule:** `programStateService.computeUnlockedWeekMax(slots, completedSlots)`: week 1 always unlocked; week W+1 unlocked only when all slots in week W (and prior) are complete.  
- **Assert:** `assertWeekUnlocked(targetWeekNumber, slots, completedSlots)` throws WEEK_LOCKED if targetWeekNumber > unlockedWeekMax.  
- Used in: start-from-progress (before creating/reusing workout), completeWorkoutService (when advancing to next slot).

### 7. Reschedule / move workout day

- No dedicated “reschedule” API. Coach can change assignments (e.g. `workoutTemplateService` or client views) and update `scheduled_date` on workout_assignments. Program schedule is fixed (program_schedule rows); moving “program day” would require changing schedule or assignment logic, not present as a single flow.

### 8. Nutrition: view assigned meal plan + mark completed

- **View:** `src/app/client/nutrition/page.tsx` `loadTodayMeals()`:  
  - Query meal_plan_assignments (client_id, is_active, start_date ≤ today, end_date ≥ today or null) → meal_plan_id.  
  - Meals by meal_plan_id; batch meal_food_items, foods, meal_options, meal_photo_logs, meal_completions for today (completed_at in today range).  
  - Build Meal[] with logged/loggedOptionId from meal_completions and photo logs.  
- **Mark completed:** Client inserts into `meal_completions` (meal_id, client_id, completed_at). Exact UI handler in same page or MealCardWithOptions (e.g. photo upload + completion).

---

## F) Risk Hotspots (Ranked)

1. **Dashboard “today” vs client timezone**  
   RPC uses server `CURRENT_DATE` and `date_trunc('week', ...)`. If server is UTC and client is in another zone, “today” and “this week” can be wrong at day boundaries. Timezone is stored and used in weekComplianceService but not in the main dashboard RPC.

2. **Dual program state (legacy vs canonical)**  
   program_day_assignments, program_workout_completions, program_assignment_progress still exist. Reads are largely migrated to programStateService/program_day_completions/program_progress; some coach/analytics code may still reference legacy tables or is_completed on program_day_assignments. Any new feature touching “program progress” must use canonical only.

3. **Multiple entry points for “today’s workout”**  
   Dashboard RPC (todaysWorkout), program-week API (day cards), and EnhancedClientWorkouts (scheduled_date = today) can diverge if RPC and client date or program logic differ. Consolidating “today” into one source (e.g. dashboard + program-week) would reduce inconsistency.

4. **Large monolithic start page**  
   `src/app/client/workouts/[id]/start/page.tsx` is very large (8000+ lines). Block executors and logging logic are tightly coupled to this page; any change to start flow or block types is high-impact.

5. **Log-set payload and block_type**  
   log-set supports many block types and optional fields. Frontend must send correct block_type and shape per block; server validates but errors are easy to trigger with outdated or alternate clients. Keeping one canonical “golden” logging contract (docs) and shared types would help.

6. **Complete-workout and program tags**  
   Program completion path depends on workout_log having program_assignment_id and program_schedule_id. If a log is created without them (e.g. legacy or ad hoc start), completion won’t write to program_day_completions and program progress won’t advance. All program starts should go through start-from-progress so logs are tagged.

7. **Nutrition: two assignment tables**  
   Code references both meal_plan_assignments and assigned_meal_plans in places (e.g. coach meals page fallback). Schema and RLS should clarify which is canonical to avoid dual paths.

8. **Nav and “progress” duplication**  
   Progress appears as: client dashboard (gauges, weekly bar), Progress tab (analytics, logs, goals, body metrics, nutrition, PRs, leaderboard, mobility, achievements). Same concepts (e.g. “workouts this week”) can be computed in dashboard RPC, program-week, and progress screens; consolidating definitions would help consistency and maintenance.

---

## G) Missing Information (Questions Only)

1. **Dashboard RPC “todaysWorkout” logic:** The exact SQL that builds todaysWorkout in the patched RPC (after 20260209) — does it prefer program_schedule for today’s slot (e.g. by day_of_week/week_number vs CURRENT_DATE) or only workout_assignments.scheduled_date?  

2. **program_schedule.day_number vs day_of_week:** Is day_number always populated and preferred in all code paths, or do some still rely on day_of_week (0-based) and need a fallback?  

3. **Coach “mark complete” without a live workout:** When coach marks a client complete via pickup, is there always an existing workout_log (and program_schedule_id) for that day, or can it create a “completed” record without set logs?  

4. **One active program per client:** Enforced by DB (partial unique) or only in application code? If DB, which index/constraint name?  

5. **Meal “completed” semantics:** Is a meal considered completed only when a row exists in meal_completions for that meal_id + client + date, or also when a photo is logged (meal_photo_logs) without a completion row?

---

**Document version:** 1.0  
**Generated:** From repository inspection only; no refactors or feature changes.  
**Schema reference:** Supabase Snippet Public Schema Column Inventory (.csv) and migrations under `dailyfitness-app/migrations/`.

# Coach Side — As-Is System Map (Deep Audit)

**Purpose:** Structural analysis of the coach-side only. No recommendations, no refactors, no code changes.  
**Sources:** `dailyfitness-app/docs/as-is-system-map.md`, repository source code.  
**Scope:** Coach navigation, dashboard, coach→client flows, coach logging, compliance/analytics, data coupling, UX friction.

---

## 1) Coach Navigation Structure

### Current bottom nav

- **File:** `src/components/layout/BottomNav.tsx`
- **Logic:** When `pathname.startsWith("/coach")`, coach nav items are used.
- **Items:**
  - Dashboard → `/coach`
  - Workouts → `/coach/programs-workouts`
  - Programs → `/coach/programs`
  - Nutrition → `/coach/nutrition`
  - Menu → `/coach/menu`

Gym Console, Compliance, Adherence, Analytics, Clients list, Scheduling, Sessions, etc. are **not** in the bottom nav; they are reachable only via the Menu or direct links.

### Route hierarchy under `/coach`

| Segment | Path | Purpose |
|--------|------|--------|
| **Root** | `/coach` | Coach dashboard |
| **Programs** | `/coach/programs` | Programs list |
| | `/coach/programs/create` | Create program |
| | `/coach/programs/[id]` | Program view |
| | `/coach/programs/[id]/edit` | Program edit |
| **Programs + Workouts** | `/coach/programs-workouts` | Redirects to `/coach/workouts/templates` |
| **Workouts** | `/coach/workouts/templates` | Workout templates list |
| | `/coach/workouts/templates/create` | Create template |
| | `/coach/workouts/templates/[id]` | Template view |
| | `/coach/workouts/templates/[id]/edit` | Template edit |
| **Clients** | `/coach/clients` | Clients list |
| | `/coach/clients/add` | Add client |
| | `/coach/clients/[id]` | Client hub (tabs: overview embedded, link to workouts/programs/etc.) |
| | `/coach/clients/[id]/workouts` | Client workouts view |
| | `/coach/clients/[id]/programs/[programId]` | Client program details |
| | `/coach/clients/[id]/profile` | Client profile |
| | `/coach/clients/[id]/progress` | Client progress |
| | `/coach/clients/[id]/goals` | Client goals |
| | `/coach/clients/[id]/habits` | Client habits |
| | `/coach/clients/[id]/meals` | Client meals |
| | `/coach/clients/[id]/analytics` | Client analytics |
| | `/coach/clients/[id]/adherence` | Client adherence |
| | `/coach/clients/[id]/clipcards` | Client clip cards |
| | `/coach/clients/[id]/fms` | FMS |
| **Compliance / Adherence** | `/coach/compliance` | Compliance dashboard |
| | `/coach/adherence` | Adherence overview |
| **Analytics / Progress** | `/coach/analytics` | Analytics (OptimizedAnalyticsReporting) |
| | `/coach/progress` | Progress (client progress monitoring) |
| **Nutrition** | `/coach/nutrition` | Nutrition dashboard |
| | `/coach/nutrition/meal-plans`, `create`, `[id]`, `[id]/edit` | Meal plans CRUD |
| **Scheduling** | `/coach/scheduling` | Scheduling |
| | `/coach/sessions` | Sessions list |
| **Other** | `/coach/availability` | Availability |
| | `/coach/exercises` | Exercises |
| | `/coach/exercise-categories` | Exercise categories |
| | `/coach/categories` | Workout categories |
| | `/coach/goals`, `/coach/habits`, `/coach/meals` | Goals, habits, meals |
| | `/coach/gym-console` | Gym console (pickup) |
| | `/coach/notifications` | Notifications |
| | `/coach/reports` | Reports |
| | `/coach/challenges`, `/coach/challenges/[id]` | Challenges |
| | `/coach/profile` | Profile |
| | `/coach/menu` | Menu (links to all sections) |
| | `/coach/bulk-assignments` | Bulk assignments |

### Redundancies

- **Programs vs Programs–Workouts:** Bottom nav has both "Workouts" (`/coach/programs-workouts`) and "Programs" (`/coach/programs`). `programs-workouts` immediately redirects to `/coach/workouts/templates` (`src/app/coach/programs-workouts/page.tsx`). So "Workouts" in the nav is effectively "Workout templates" only; program creation/management is under "Programs."
- **Compliance vs Adherence:** Two separate routes (`/coach/compliance`, `/coach/adherence`) and two components (`OptimizedComplianceDashboard`, `OptimizedAdherenceTracking`). Compliance uses real data (workout_logs, meal_completions, habit_logs, workout_assignments); Adherence uses mock/hardcoded data (see section 5).
- **Analytics vs Progress vs Reports:** `/coach/analytics`, `/coach/progress`, and `/coach/reports` are three distinct pages; overlap in purpose (client metrics, progress, reporting) is structural only—no single shared definition of "progress" or "report."

### Screens that overlap in purpose

- **Client hub overview vs Client sub-pages:** Client hub (`/coach/clients/[id]`) shows overview (stats, recent activity) and embeds/links to Workouts, Programs, etc. Client stats (workouts this week, compliance, streak) are computed in the hub via `calculateStreak` and `calculateWeeklyProgress`; client-specific tabs (e.g. Client Progress, Client Adherence) may show related metrics in a different shape.
- **Compliance dashboard vs Client Adherence view:** Compliance is coach-wide; Client Adherence (`/coach/clients/[id]/adherence`) is per-client. Both use the term "adherence/compliance" and similar metrics (workout, nutrition, habit, session).

---

## 2) Coach Dashboard

### What data it shows

- **Source:** `src/app/coach/page.tsx` → `GET /api/coach/dashboard` → RPC `get_coach_dashboard`.
- **RPC:** `migrations/20260202_coach_dashboard_rpc.sql`
- **Payload:**
  - **stats:** `totalClients`, `activeClients` (from `clients` where coach_id = auth, status), `totalWorkouts` (count of `workout_templates` where coach_id, is_active), `totalMealPlans` (count of `meal_plans` where coach_id, is_active).
  - **todaySessions:** From `sessions` where coach_id = auth, `DATE(scheduled_at) = CURRENT_DATE`, status in ('scheduled','confirmed'), ordered by scheduled_at, limit 10. Joined to profiles for client name/avatar.
  - **recentClients:** From `clients` where coach_id = auth, ordered by created_at DESC, limit 5, with profile (first_name, last_name, avatar_url, status).

No workout completion counts, no program progress, no compliance percentages on the dashboard itself.

### How “today” is resolved for coach

- **Dashboard “today”:** In the RPC, `CURRENT_DATE` (server date) is used for `todaySessions` (sessions where `DATE(scheduled_at) = CURRENT_DATE`). No client or coach timezone is applied in this RPC.
- **Coach dashboard page:** Displays a date string from `new Date().toLocaleDateString(...)` (client device date) for greeting/header only; data driving “today’s sessions” comes from the server’s `CURRENT_DATE`.

### How compliance is computed

- The **coach dashboard** does **not** compute or display compliance. Compliance appears on:
  - Client hub: `calculateWeeklyProgress` + goal used for a compliance % (see section 6).
  - Compliance page: `OptimizedComplianceDashboard` (see section 5).

### Whether it uses program_progress or ledger

- The coach dashboard RPC does **not** read `program_progress` or `program_day_completions`. It only reads: `profiles`, `clients`, `workout_templates`, `meal_plans`, `sessions`.

---

## 3) Coach → Client Flows

### View client

- **Entry:** `/coach/clients` → click client → `/coach/clients/[id]`.
- **File:** `src/app/coach/clients/[id]/page.tsx`. Loads client profile (Supabase `profiles`), then `calculateStreak(clientId)`, `calculateWeeklyProgress(clientId)`, workout_logs (total completed, last active, recent with assignment/template name), meal_photo_logs (recent). Builds a single client object with stats (workoutsThisWeek, workoutGoal, compliance, streak, totalWorkouts, lastActive) and recentActivity. Compliance on the hub = (weeklyProgress.current / weeklyProgress.goal) * 100 when goal > 0.
- **Tabs / sub-routes:** Links or tabs to `/coach/clients/[id]/workouts`, `programs/[programId]`, `profile`, `progress`, `goals`, `habits`, `meals`, `analytics`, `adherence`, `clipcards`, `fms`. Each is a separate page component that typically links back to `/coach/clients/[id]`.

### Assign program

- **Creation of program_assignments:** `workoutTemplateService.createProgramAssignment(clientId, programId, startDate, coachId)` in `src/lib/workoutTemplateService.ts` (e.g. around 1097–1176). Inserts into `program_assignments`. Used by bulk-assign and potentially by program management UIs (e.g. `EnhancedProgramManager`, bulk flows).
- **Where assign is triggered in UI:** Programs list and program edit/create flows; bulk-assignments page (`src/app/coach/bulk-assignments/page.tsx`); client program views. No single “assign program to this client” button path was traced end-to-end in this audit; the canonical creation path is `workoutTemplateService.createProgramAssignment`.

### Edit program

- **Routes:** `/coach/programs/[id]/edit` (program edit), `/coach/clients/[id]/programs/[programId]` (client-specific program view with status change, link to program edit).
- **Edit program page:** `src/app/coach/programs/[id]/edit/page.tsx` — loads program, schedule, progression rules; updates program and related data. Saving can redirect to `/coach/programs/[id]`.
- **Client program page:** Can update `program_assignments.status` (e.g. active/paused) and “set as active” (deactivate other programs/workouts for that client, then set this program active). Does not create program_assignments; assumes assignment already exists.

### Start workout for client

- **In-app “start workout” for client:** There is **no** coach flow that starts a live workout (client-side start page) for the client. The client start flow is: client dashboard or EnhancedClientWorkouts → `POST /api/program-workouts/start-from-progress` (or legacy `POST /api/program-workouts/start`) → redirect to `/client/workouts/[workout_assignment_id]/start`. Coach-side `ClientWorkoutsView` (`src/components/coach/client-views/ClientWorkoutsView.tsx`): clicking a workout goes to **coach** template view `router.push(\`/coach/workouts/templates/${workout.workout_templates.id}\`)`, not to the client’s start page. So the coach cannot “start” the client’s workout in the same way the client does; they can only use Gym Console to “mark complete” (see below).

### Mark complete (pickup)

- **Entry:** `/coach/gym-console` (`src/app/coach/gym-console/page.tsx`). Coach selects a client, then `GET /api/coach/pickup/next-workout?clientId=...` to get next workout, then “Mark complete” calls `POST /api/coach/pickup/mark-complete` with `{ clientId, notes? }`.
- **Mark-complete API:** `src/app/api/coach/pickup/mark-complete/route.ts`. Validates coach role and client ownership (`clients` table). Gets client program state via `getProgramState(supabaseAdmin, clientId)` (canonical: program_assignments + program_schedule + program_day_completions). If no active assignment or no next slot, returns 404/409. Then:
  - Reuses existing incomplete `workout_log` for (client_id, program_assignment_id, program_schedule_id) if present.
  - Else creates `workout_assignments` + `workout_logs` with `program_assignment_id`, `program_schedule_id` set.
- Then calls `completeWorkout({ ..., workoutLogId, clientId, completedBy: user.id, notes })` in `completeWorkoutService`. So coach “mark complete” uses the same completion pipeline as the client (program_day_completions ledger, program_progress cache, week lock).

### Log sets for client

- **Log-set API:** `src/app/api/log-set/route.ts`. It enforces `client_id === userId` (authenticated user). So the authenticated user must be the client. A coach **cannot** log sets on behalf of a client through this endpoint; any request with `client_id` different from the session user is rejected with 403.

### Where workout_log is created

- **Client start (canonical):** `POST /api/program-workouts/start-from-progress` creates `workout_assignments`, `workout_sessions` (optional), and `workout_logs` with `program_assignment_id` and `program_schedule_id` set. File: `src/app/api/program-workouts/start-from-progress/route.ts`.
- **Coach pickup mark-complete:** When there is no existing incomplete log for the next slot, `mark-complete` creates `workout_assignments` and `workout_logs` with `program_assignment_id` and `program_schedule_id` set. File: `src/app/api/coach/pickup/mark-complete/route.ts`.
- **Legacy client start:** `POST /api/program-workouts/start` (by `program_day_assignment_id`) can create workout_assignments and link to program_day_assignments; creation of workout_logs in that path is not confirmed in this audit but is referenced in as-is doc.

### Whether program_schedule_id is always attached

- **start-from-progress:** Yes — new workout_logs are created with `program_assignment_id` and `program_schedule_id`.
- **Coach mark-complete:** Yes — reused or newly created workout_logs have `program_assignment_id` and `program_schedule_id`. So when the coach marks a day complete (with or without an existing log), the log used for completion is always program-tagged. Completion then writes to `program_day_completions` and updates `program_progress` via `completeWorkoutService`.

---

## 4) Coach Logging

### How log-set works for coach

- The only log-set endpoint is `POST /api/log-set`. It requires the request body’s `client_id` to equal the authenticated user’s id. So **coach cannot log sets for a client** via this API; the UI used by the coach (e.g. viewing client workouts) does not send log-set requests as the client.

### Whether UI differs from client

- The client logs sets on the live workout page (`/client/workouts/[id]/start` → block executors → `POST /api/log-set`). The coach has no equivalent “live workout” page for the client; coach either views template (`/coach/workouts/templates/...`) or uses Gym Console to mark the day complete. So the “log set” UI is client-only.

### Whether coach can complete without log

- **Yes.** Coach “mark complete” (pickup) can create a new `workout_assignment` and `workout_log` with no `workout_set_logs`, then call `completeWorkout`. The service updates the log with `completed_at` and totals (sets/reps/weight can be 0), then writes to `program_day_completions` and updates `program_progress`. So the coach can complete a program day without any sets logged.

### Risks of duplicate logs

- **Idempotency:** `completeWorkout` returns early if `workout_log.completed_at` is already set. `program_day_completions` insert uses ON CONFLICT DO NOTHING (unique on program_assignment_id, program_schedule_id). So duplicate mark-complete calls for the same day do not double-count in the ledger.
- **Duplicate workout_logs for same slot:** If the client had started the workout (so an incomplete log exists) and the coach then opens Gym Console and marks complete, the API reuses that log. If the coach marks complete and no log exists, it creates one. Creating a second assignment+log for the same program day could happen only if two mark-complete flows ran for the same next slot without one completing first, or if “next slot” resolution differed (e.g. cache vs ledger desync). Structural risk: pickup uses `getProgramState` (ledger-based next slot) and reuses or creates one log per slot; duplicate logs for the same slot are not intended but would be a consistency/race concern if multiple devices or tabs were used.

---

## 5) Compliance & Analytics

### How compliance is calculated (coach)

- **OptimizedComplianceDashboard** (`src/components/coach/OptimizedComplianceDashboard.tsx`):
  - Uses `getCoachClientIds(coachId, true)` and `getPeriodBounds(this_week | this_month | last_4_weeks)` from `@/lib/metrics` / `@/lib/metrics/period`.
  - Fetches: `workout_logs` (completed_at in period), `meal_completions`, `habit_logs`, `workout_assignments` (scheduled_date/assigned_date in period), and optional duration from `workout_logs`. All filtered by client_id in clientIds and by period (periodStart/periodEnd).
  - **Workout compliance:** For each client, `workoutCompliance = assigned > 0 ? min(100, round((workoutLogsCount / assigned) * 100)) : 0`. So “completed workouts in period / assigned workouts in period.”
  - **Nutrition compliance:** `min(100, round((uniqueDaysWithMealCompletions / daysInPeriod) * 100))`.
  - **Habit compliance:** Same idea with habit_logs and days in period.
  - **Overall:** Average of workout, nutrition, habit compliance (and optionally session_attendance). No use of `program_day_completions` or `program_progress`; compliance is assignment-based (workout_assignments + workout_logs) and calendar period-based.

- **Client hub compliance:** Uses `calculateWeeklyProgress(clientId)` from `clientDashboardService`: goal from program (current week slots) or from workout_assignments in the week; current = count of workout_logs completed in that week (Monday–Sunday in **local** time in the browser). So client hub uses local week boundaries and program-based goal when available.

### What tables are used

- **Compliance dashboard:** `clients`, `profiles`, `workout_logs`, `meal_completions`, `habit_logs`, `workout_assignments`.
- **Client hub stats:** `workout_logs`, `programStateService` (program_assignments, program_schedule, program_day_completions), `workout_assignments` (fallback goal).
- **Adherence page:** Mock data only (no tables).

### Where weekly boundaries are determined

- **Compliance dashboard:** `getPeriodBounds('this_week' | 'this_month' | 'last_4_weeks')` in `src/lib/metrics/period.ts`. “This week” = ISO week (Monday–Sunday) in **UTC** (date math via `getUTCDate()`, `setUTCHours(0,0,0,0)`). So coach compliance week is UTC.
- **Client hub / calculateWeeklyProgress:** Monday–Sunday in **local** time (`now.getDay()`, `monday.setHours(0,0,0,0)` on local date). So client-side “this week” is local; coach compliance “this week” is UTC.
- **Program week (week lock):** Ordinal program weeks (week_number from program_schedule); unlock is “all slots in week N complete before week N+1.” No calendar week in that logic. See `weekComplianceService` for program-week semantics (rolling from start_date, timezone from assignment/profile).

### Whether logic matches client week-lock system

- **No.** Coach compliance uses **calendar** periods (UTC week/month) and **assignment + completion counts** (workout_assignments vs workout_logs). The client week-lock system uses **program ordinal weeks** and the **ledger** (program_day_completions). So “compliance” on the coach side is not the same as “program week completion” or week lock; they can diverge (e.g. client completes 2 program days in one calendar week vs coach “this week” completion count).

---

## 6) Data Coupling

### Where coach actions affect program_day_completions

- **Only via mark-complete:** `POST /api/coach/pickup/mark-complete` → `completeWorkout()` → if workout_log has `program_assignment_id` and `program_schedule_id`, inserts into `program_day_completions` (ON CONFLICT DO NOTHING) and then updates `program_progress` via `updateProgressCache`. So coach affects the ledger only by completing a workout (with or without sets).

### Where coach actions affect program_progress

- Same path: `completeWorkout` calls `updateProgressCache(programAssignmentId, nextSlot, ...)` in `programStateService`, which upserts `program_progress` (current_week_number, current_day_number, is_completed). So every coach mark-complete that completes a program day updates the cache.

### Where coach actions affect workout_logs

- **Creation:** Mark-complete can create a new `workout_log` (and assignment) when there is no incomplete log for the next slot.
- **Update:** `completeWorkout` sets `completed_at`, `total_sets_completed`, `total_reps_completed`, `total_weight_lifted`, `total_duration_minutes` on the workout_log. Coach does not create or edit `workout_set_logs` (log-set is client-only by design).

### Any places coach can bypass canonical flow

- **Program assignment creation:** Done via `workoutTemplateService.createProgramAssignment` (and bulk flows). Does not go through client start or program_state; it only creates the assignment. Progress/ledger are updated when workouts are completed (client or coach mark-complete).
- **Gym Console:** Uses canonical `getProgramState` for next slot and then `completeWorkout`. No bypass of ledger or week lock; week lock is enforced inside `completeWorkout` when advancing.
- **Pickup RPC (next-workout):** `get_coach_pickup_workout` reads **program_progress** (current_week_number, current_day_number) to determine which template to show. Mark-complete uses **programStateService** (ledger-based next slot). So “next workout” in the UI is driven by the cache; after each completion the cache is updated, so they stay in sync unless the cache is wrong or not yet updated. If an older RPC version or a different code path wrote progress in 0-based index while the app expects 1-based, that could be a source of desync (migrations 20260209 normalize to 1-based in program_progress and in the patched pickup RPC).

---

## 7) UX Friction Points (Structural)

- **Gym Console not in bottom nav:** Access only via Menu or direct URL. Coaches who use pickup daily must open Menu first.
- **Compliance and Adherence are two pages:** Similar names and concepts; one uses real data, one mock. Users may not know which to use.
- **Programs vs Workouts in nav:** “Workouts” redirects to templates; “Programs” is programs. Naming can be confusing (programs contain workouts).
- **Client hub: many sub-pages:** Profile, Workouts, Programs, Progress, Goals, Habits, Meals, Analytics, Adherence, Clip cards, FMS. No single “client overview” that aggregates all; overview is one page, rest are separate routes. Multiple hops to see full picture.
- **Starting a workout for the client:** Coach cannot start the client’s live workout from the coach app; they can only mark complete from Gym Console. To have the client log sets, the client must open the app and start from their side.
- **Client workout click goes to template:** From Client Workouts view, clicking a workout takes the coach to the template view, not to the client’s workout instance or start page. So coach sees “what” the workout is, not “start it for client.”
- **Bulk-assignments and add client:** Not in bottom nav; reachable via dashboard quick links or Menu.
- **Reports page:** Existence of `/coach/reports`; relationship to Analytics and Progress (and whether reports use same metrics) is structural only—not analyzed in depth here.

---

## Critical Questions (Unknowns or Ambiguous Flows)

1. **Program assignment creation from UI:** Where exactly does the coach trigger “assign this program to this client” (single client) in the UI? Is it only from bulk-assignments, or from program detail, or from client program tab? Is there a single canonical “assign program” screen?
2. **program_progress schema in DB:** Migrations show evolution from `current_week_index`/`current_day_index` (0-based) to `current_week_number`/`current_day_number` (1-based). Is the deployed schema fully migrated so that coach pickup RPC and all app code use the same columns?
3. **get_coach_pickup_workout and program_progress:** The pickup RPC (after patch) reads program_progress for “next” slot. If program_progress were ever out of sync with program_day_completions (e.g. manual DB change or failed update), would the coach see the wrong “next” workout or could mark-complete advance the wrong day?
4. **Adherence page data:** When will OptimizedAdherenceTracking use real data instead of mock data, and will its definition of “adherence” align with OptimizedComplianceDashboard or with client week-lock?
5. **Coach dashboard “today” vs timezone:** Dashboard RPC uses server `CURRENT_DATE` for today’s sessions. If the coach is in a different timezone, “today” sessions could be wrong at day boundaries. Is there a product decision to use server date for coach or to introduce coach timezone?
6. **Client hub compliance vs compliance dashboard:** Client hub uses local week and program-based goal; compliance dashboard uses UTC period and assignment-based counts. Should both surfaces use the same definition of “week” and “compliance” for consistency?
7. **Duplicate workout_log for same program slot:** Under what exact conditions (e.g. two mark-complete calls in parallel, or client and coach both acting) could two workout_logs exist for the same (client, program_assignment_id, program_schedule_id)? Is there a unique constraint or application guard?
8. **program_day_assignments and legacy start:** Legacy start by `program_day_assignment_id` may still create assignments/logs. Does that path set program_schedule_id on workout_logs, and is it still used anywhere on the coach side?
9. **Clients table primary key:** OptimizedComplianceDashboard selects from `clients` with columns `id, client_id, ...`. Schema: is `id` the PK and `client_id` the user UUID? One RLS/query used `.in('client_id', clientIds)` after getCoachClientIds; confirm that clients rows are uniquely identified as intended.
10. **Coach “reports” vs “analytics” vs “progress”:** What is the intended distinction between `/coach/reports`, `/coach/analytics`, and `/coach/progress` in terms of data and audience (e.g. export, live dashboard, client-level drill-down)?

---

**Document version:** 1.0  
**Generated:** From repository inspection and as-is system map only; no code or schema changes.

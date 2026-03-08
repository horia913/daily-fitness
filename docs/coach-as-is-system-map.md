# Coach As-Is System Map

**Purpose:** Repo-evidence-based structural map of the coach side. No recommendations, no code changes.  
**Scope:** Navigation, dashboard data, coach→client flows, compliance/adherence, client detail page, high-risk areas, structural UX friction.  
**Lock:** Phase 1 As-Is Audit — analysis and documentation only.

---

## 1) Coach Navigation Map (BottomNav + Menu + Routes)

### Bottom navigation (coach)

- **File:** `src/components/layout/BottomNav.tsx`
- **Logic:** When `pathname.startsWith("/coach")`, coach nav items are used (lines 57–59).
- **Items:**

| Label      | href                    |
|-----------|--------------------------|
| Dashboard | `/coach`                 |
| Workouts  | `/coach/programs-workouts` |
| Programs  | `/coach/programs`       |
| Nutrition | `/coach/nutrition`      |
| Menu      | `/coach/menu`           |

**Not in bottom nav:** Clients list, Gym Console, Compliance, Adherence, Analytics, Progress, Sessions, Scheduling, Bulk assignments, Exercises, Categories, Goals, Habits, Reports, Challenges, Availability, Profile, Notifications. These are reached via Menu (`/coach/menu`) or direct links.

### Menu entry points

- **File:** `src/app/coach/menu/page.tsx`
- **Menu items (lines 32–45):** Client Management → `/coach/clients`; Programs & Workouts → `/coach/programs-workouts`; Exercise Library → `/coach/exercises`; Exercise Categories → `/coach/exercise-categories`; Workout Categories → `/coach/categories`; Nutrition Management → `/coach/nutrition`; Analytics & Reports → `/coach/analytics`; Client Progress → `/coach/progress`; Goals & Habits → `/coach/goals`; Session Management → `/coach/sessions`; Challenges → `/coach/challenges`; Availability Settings → `/coach/availability`; Coach Profile → `/coach/profile`.

**Note:** Compliance and Adherence are not in the menu list; they are reachable only by direct URL or from links inside other coach pages (e.g. OptimizedComplianceAnalytics → `router.push('/coach/analytics')`, OptimizedClientProgress → `router.push('/coach/analytics')`, OptimizedComplianceAnalytics → `router.push('/coach/analytics')`). Gym Console (`/coach/gym-console`) and Bulk Assignments (`/coach/bulk-assignments`) are not in the menu array; they are linked from dashboard quick actions or elsewhere.

### Full coach route inventory (from repo)

| Path | Purpose |
|------|--------|
| `/coach` | Coach dashboard |
| `/coach/programs-workouts` | Redirects to `/coach/workouts/templates` — `src/app/coach/programs-workouts/page.tsx` |
| `/coach/programs` | Programs list |
| `/coach/programs/create` | Create program |
| `/coach/programs/[id]` | Program view |
| `/coach/programs/[id]/edit` | Program edit |
| `/coach/workouts/templates` | Workout templates list |
| `/coach/workouts/templates/create` | Create template |
| `/coach/workouts/templates/[id]` | Template view |
| `/coach/workouts/templates/[id]/edit` | Template edit |
| `/coach/clients` | Clients list |
| `/coach/clients/add` | Add client |
| `/coach/clients/[id]` | Client hub (detail) |
| `/coach/clients/[id]/workouts` | Client workouts view |
| `/coach/clients/[id]/programs/[programId]` | Client program details |
| `/coach/clients/[id]/profile` | Client profile |
| `/coach/clients/[id]/progress` | Client progress |
| `/coach/clients/[id]/goals` | Client goals |
| `/coach/clients/[id]/habits` | Client habits |
| `/coach/clients/[id]/meals` | Client meals |
| `/coach/clients/[id]/analytics` | Client analytics |
| `/coach/clients/[id]/adherence` | Client adherence |
| `/coach/clients/[id]/clipcards` | Client clip cards |
| `/coach/clients/[id]/fms` | FMS |
| `/coach/nutrition` | Nutrition dashboard |
| `/coach/nutrition/meal-plans` | Meal plans list (if present) |
| `/coach/nutrition/meal-plans/create` | Create meal plan |
| `/coach/nutrition/meal-plans/[id]` | Meal plan view |
| `/coach/nutrition/meal-plans/[id]/edit` | Meal plan edit |
| `/coach/compliance` | Compliance dashboard |
| `/coach/adherence` | Adherence overview |
| `/coach/analytics` | Analytics (OptimizedAnalyticsReporting) |
| `/coach/progress` | Progress (client progress monitoring) |
| `/coach/reports` | Reports |
| `/coach/sessions` | Sessions list |
| `/coach/scheduling` | Scheduling |
| `/coach/availability` | Availability |
| `/coach/gym-console` | Gym console (pickup / mark complete) |
| `/coach/bulk-assignments` | Bulk assignments |
| `/coach/exercises` | Exercise library |
| `/coach/exercise-categories` | Exercise categories |
| `/coach/categories` | Workout categories |
| `/coach/goals` | Goals |
| `/coach/habits` | Habits |
| `/coach/meals` | Meals (coach-level) |
| `/coach/clipcards` | Clip cards (coach-level) |
| `/coach/notifications` | Notifications |
| `/coach/achievements` | Achievements |
| `/coach/challenges` | Challenges list |
| `/coach/challenges/[id]` | Challenge detail |
| `/coach/profile` | Coach profile |
| `/coach/menu` | Menu (hub to all sections) |

### Redundancies

- **Programs vs Programs–Workouts:** Bottom nav has both “Workouts” (`/coach/programs-workouts`) and “Programs” (`/coach/programs`). `programs-workouts` redirects to `/coach/workouts/templates` (`src/app/coach/programs-workouts/page.tsx` line 16). So “Workouts” in the nav is effectively “Workout templates” only; program creation/management lives under “Programs.”
- **Compliance vs Adherence:** Two routes (`/coach/compliance`, `/coach/adherence`) and two components. Compliance uses real data; Adherence uses mock/hardcoded data (see §4).
- **Analytics vs Progress vs Reports:** Three distinct pages (`/coach/analytics`, `/coach/progress`, `/coach/reports`) with overlapping purpose (client metrics, progress, reporting); no single shared definition of “progress” or “report” in code.

---

## 2) Current Coach Dashboard Data Sources

### API and RPC

- **Route:** `GET /api/coach/dashboard`
- **File:** `src/app/api/coach/dashboard/route.ts`
- **Implementation:** Single RPC `supabase.rpc('get_coach_dashboard')` (no parameters). No direct table queries in the route.
- **RPC migration:** `migrations/20260202_coach_dashboard_rpc.sql`

### RPC: tables and logic

- **Function:** `get_coach_dashboard()` (SECURITY DEFINER, uses `auth.uid()`).
- **Tables used:**
  - `profiles` — role check (coach/admin); join for client name/avatar in sessions and recent clients.
  - `clients` — counts by `coach_id`, `status` (total and active).
  - `workout_templates` — count where `coach_id = v_coach_id` and `is_active = true`.
  - `meal_plans` — count where `coach_id`, `is_active = true` (wrapped in exception for undefined_table).
  - `sessions` — “today’s” sessions: `coach_id`, `DATE(scheduled_at) = CURRENT_DATE`, `status IN ('scheduled','confirmed')`, order by `scheduled_at`, limit 10; joined to `profiles` for client name/avatar.
  - Recent clients: `clients` where `coach_id`, order by `created_at DESC`, limit 5, with profile (first_name, last_name, avatar_url, status).
- **Returned payload (camelCase in RPC):** `stats` (totalClients, activeClients, totalWorkouts, totalMealPlans), `todaySessions`, `recentClients`.
- **“Today” definition:** `DATE(scheduled_at) = CURRENT_DATE` — server date in the database session. No coach or client timezone applied in the RPC.
- **Dashboard page date display:** `src/app/coach/page.tsx` line 160: `new Date().toLocaleDateString("en-US", ...)` — client device date for header/greeting only. “Today’s sessions” content is driven by server `CURRENT_DATE`.

### What the dashboard does not use

- No `program_progress`, no `program_day_completions`, no workout completion counts, no compliance percentages.
- **“At Risk”:** Hardcoded `0` in the status strip — `src/app/coach/page.tsx` line 338 (`fc-text-warning">0</span>`). Not from API or RPC.

---

## 3) Coach → Client Flows

### View client

- **Entry:** `/coach/clients` → click client → `/coach/clients/[id]`.
- **File:** `src/app/coach/clients/[id]/page.tsx`
- **Data loaded:** Profile from `profiles`; then `calculateStreak(clientId)` and `calculateWeeklyProgress(clientId)` from `@/lib/clientDashboardService`; `workout_logs` (total completed, last active, recent with assignment/template); `meal_photo_logs` (recent). Stats and recent activity are built in the component. Sub-routes linked from hub: workouts, programs/[programId], profile, progress, goals, habits, meals, analytics, adherence, clipcards, fms.

### Assign program

- **Canonical creation:** `workoutTemplateService.createProgramAssignment(clientId, programId, startDate, coachId)` in `src/lib/workoutTemplateService.ts` (e.g. ~1097–1176). Inserts into `program_assignments`; enforces single active program (sets existing to completed).
- **Where triggered in UI:** Bulk-assignments page (`src/app/coach/bulk-assignments/page.tsx`); program management (e.g. `EnhancedProgramManager` — `src/components/coach/EnhancedProgramManager.tsx`); programs list/edit flows. Client hub “Assign Workout” opens `WorkoutAssignmentModal`, which assigns **workout templates** (single workouts) via `WorkoutTemplateService`, not programs — see `src/components/WorkoutAssignmentModal.tsx` (templates + clients + review).

### Assign workout (single template)

- **Client hub:** “Assign Workout” button opens `WorkoutAssignmentModal` (client detail page line 319). Modal uses `WorkoutTemplateService` to assign templates to clients (not `createProgramAssignment`).
- **Templates list:** `OptimizedWorkoutTemplates` also uses `WorkoutAssignmentModal` for assigning templates.

### Edit program

- **Routes:** `/coach/programs/[id]/edit` (program edit); `/coach/clients/[id]/programs/[programId]` (client-specific program view with status/active controls).
- **Edit page:** `src/app/coach/programs/[id]/edit/page.tsx` — loads program, schedule, progression rules; saves and can redirect to `/coach/programs/[id]`.
- **Client program page:** Updates `program_assignments.status` (e.g. active/paused), “set as active” (deactivate other programs/workouts for that client). Does not create program_assignments; assumes assignment exists. Links to `/coach/programs/${program.id}/edit`.

### Mark complete / pickup

- **Entry:** `/coach/gym-console` — `src/app/coach/gym-console/page.tsx`.
- **Flow:** Coach selects client → `GET /api/coach/pickup/next-workout?clientId=...` → “Mark complete” → `POST /api/coach/pickup/mark-complete` with `{ clientId, notes? }`.
- **Next-workout API:** `src/app/api/coach/pickup/next-workout/route.ts` → RPC `get_coach_pickup_workout(p_client_id)`. RPC reads `program_assignments` (active), `program_progress` (current_week_number, current_day_number — 1-based after patch in `migrations/20260209_patch_dashboard_rpc_column_names.sql`), `program_schedule`, `workout_templates`, blocks.
- **Mark-complete API:** `src/app/api/coach/pickup/mark-complete/route.ts`. Validates coach role and client ownership (`clients`). Gets next slot via `getProgramState(supabaseAdmin, clientId)` from `@/lib/programStateService` (ledger-based: program_assignments, program_schedule, program_day_completions). Reuses existing incomplete `workout_log` for (client_id, program_assignment_id, program_schedule_id) if present; otherwise creates `workout_assignments` + `workout_logs` with program_assignment_id and program_schedule_id. Then calls `completeWorkout({ ..., completedBy: user.id, notes })` in `src/lib/completeWorkoutService.ts`. So coach mark-complete uses the same completion pipeline as client (program_day_completions ledger, program_progress cache, week lock).

### Log sets for client

- **API:** `POST /api/log-set` — enforces `client_id === userId` (authenticated user). Coach cannot log sets on behalf of a client; only the client can log sets. File reference: `src/lib/completeWorkoutService.ts` comment and typical log-set route pattern.

### Notes

- Coach can add optional `notes` when marking complete in the mark-complete API; these are passed into `completeWorkout` and stored on the workout log/completion as supported by the schema.

---

## 4) Compliance / Adherence / Analytics Surfaces

### Compliance dashboard (real)

- **Route:** `/coach/compliance`
- **Page:** `src/app/coach/compliance/page.tsx` → renders `OptimizedComplianceDashboard`.
- **Component:** `src/components/coach/OptimizedComplianceDashboard.tsx`
- **Data:** `getCoachClientIds(coachId, true)` and `getPeriodBounds('this_week' | 'this_month' | 'last_4_weeks')` from `@/lib/metrics` / `@/lib/metrics/period`. Fetches: `clients`, `profiles`, `workout_logs` (completed_at in period), `meal_completions`, `habit_logs`, `workout_assignments` (scheduled_date/assigned_date in period), and optional `workout_logs` duration. All filtered by client ids and period (periodStart/periodEnd).
- **Workout compliance:** Per client, `workoutCompliance = assigned > 0 ? min(100, round((workoutLogsCount / assigned) * 100)) : 0` — completed workouts in period / assigned workouts in period.
- **Nutrition compliance:** `min(100, round((uniqueDaysWithMealCompletions / daysInPeriod) * 100))`.
- **Habit compliance:** Same idea with habit_logs and days in period.
- **Overall:** Average of workout, nutrition, habit compliance (and optionally session_attendance). Does not use `program_day_completions` or `program_progress`; compliance is assignment-based (workout_assignments + workout_logs) and calendar period-based.
- **Period bounds:** `getPeriodBounds` in `src/lib/metrics/period.ts` — “this_week” is ISO week (Monday–Sunday) in **UTC** (getUTCDay(), setUTCDate, setUTCHours(0,0,0,0)).

### Adherence page (mock)

- **Route:** `/coach/adherence`
- **Page:** `src/app/coach/adherence/page.tsx` → renders `OptimizedAdherenceTracking`.
- **Component:** `src/components/coach/OptimizedAdherenceTracking.tsx`
- **Data:** Initial state is a hardcoded array of `AdherenceData` (lines 81–…). Comment: “Mock data - replace with actual data fetching.” No Supabase or API calls for the main adherence list; **mock only**.

### Client hub compliance (real, different definition)

- **Where:** Client detail page `src/app/coach/clients/[id]/page.tsx`.
- **Logic:** `calculateWeeklyProgress(clientId)` from `src/lib/clientDashboardService.ts`. Goal from program (current week slots via `programStateService.getProgramState`) or fallback `workout_assignments` with scheduled_date in the week. Current = count of `workout_logs` completed in that week.
- **Week boundaries:** Monday–Sunday in **local** time in the browser (`now.getDay()`, `monday.setHours(0,0,0,0)` on local date) — `clientDashboardService.ts` lines 78–89.
- **Compliance %:** `(weeklyProgress.current / weeklyProgress.goal) * 100` when goal > 0, else 0. Computed client-side after fetching progress.

### Analytics page

- **Route:** `/coach/analytics`
- **Page:** `src/app/coach/analytics/page.tsx` → `OptimizedAnalyticsReporting` with `coachId={user?.id}`.
- **Component:** `src/components/coach/OptimizedAnalyticsReporting.tsx` — composes `OptimizedAnalyticsOverview`, `OptimizedClientProgress`, `OptimizedComplianceAnalytics`. These subcomponents may mix live Supabase data and UI state; the Compliance slice is real (as above). Overview and ClientProgress data sources are not fully traced here; treat as “partially real / needs confirmation” for Phase 2.

### Program-week vs calendar-week mismatch

- **Coach compliance dashboard:** Calendar periods in **UTC** (this_week, this_month, last_4_weeks) and assignment-based counts (workout_assignments vs workout_logs in period).
- **Client hub:** Calendar week in **local** time and program-based goal when client has active program (current program week slots).
- **Program week (week lock):** Ordinal program weeks (week_number from program_schedule); unlock is “all slots in week N complete before week N+1” — no calendar week. See `weekComplianceService` and programStateService for program-week semantics.
- So: “compliance” on coach Compliance page is not the same as “program week completion” or week lock; they can diverge (e.g. client completes 2 program days in one calendar week vs coach “this week” completion count).

---

## 5) Client Detail Page Audit

### What it shows

- **File:** `src/app/coach/clients/[id]/page.tsx`
- **Content:** Profile (name, email, phone, joined date), status (active / at-risk / inactive derived from compliance), stats cards: Workouts This Week (current/goal), Compliance %, Day Streak, Total Workouts, Last active. Recent activity (workouts + meals from workout_logs and meal_photo_logs). Tabs: Overview, Workouts (embedded `ClientWorkoutsView`), Nutrition (placeholder), Progress (placeholder). Quick links to profile, meals, progress, goals.
- **Assign Workout:** Opens `WorkoutAssignmentModal` (template assignment, not program).

### Helpers / services used

- **Profile:** Supabase `profiles` by client id.
- **Streak:** `calculateStreak(clientId)` — `src/lib/clientDashboardService.ts` — from `workout_logs` (completed_at), consecutive calendar days; streak is current only if most recent date is today or yesterday (client-side date).
- **Weekly progress:** `calculateWeeklyProgress(clientId)` — same file — uses local Monday–Sunday week; goal from `programStateService.getProgramState` (current week slots) or fallback `workout_assignments` in week; current from `workout_logs` in that week.
- **Total workouts:** Count of `workout_logs` with non-null `completed_at` for client.
- **Compliance %:** `(weeklyProgress.current / weeklyProgress.goal) * 100` when goal > 0, else 0 — **computed client-side** after weekly progress is fetched.
- **Last active:** Most recent `workout_logs.completed_at`; displayed via `getRelativeTime(...)` (client-side).
- **Recent activity:** Recent rows from `workout_logs` (with assignment/template name) and `meal_photo_logs`; merged and sorted client-side.

### Where “%” comes from

- **Compliance %:** Client-side: `(weeklyProgress.current / weeklyProgress.goal) * 100`. Goal is either program current-week slot count or count of workout_assignments in the local week; current is count of completed workout_logs in that local week. So **server** provides raw counts (via clientDashboardService and Supabase), **client** computes the percentage.

### Computed locally vs server

- **Server (Supabase / RPC):** Profile, workout_logs (counts, last, recent), meal_photo_logs, program state (for goal), workout_assignments (fallback goal).
- **Client:** Week boundaries (local), compliance %, status (active/at-risk/inactive), relative time strings, merging and sorting of recent activity.

---

## 6) High-Risk Areas (Program Engine, Completion Pipeline)

### Program engine

- **Canonical read:** `programStateService` — `getProgramState`, `getProgramSlots`, `getCompletedSlots`, `getNextSlot`, `updateProgressCache`, `assertWeekUnlocked`. Reads: program_assignments, program_schedule, program_day_completions (ledger), program_progress (cache). File: `src/lib/programStateService.ts`.
- **Coach touchpoints:** (1) Mark-complete uses `getProgramState` for next slot and then `completeWorkout` (writes to ledger and cache). (2) Next-workout RPC `get_coach_pickup_workout` reads `program_progress` (current_week_number, current_day_number) to show “next” template. So next-workout is cache-driven; mark-complete is ledger-driven and then updates cache — can desync if cache is wrong or not yet updated (e.g. manual DB change or failed update).
- **Week lock:** Enforced inside `completeWorkout` when advancing (e.g. `assertWeekUnlocked`); coach mark-complete goes through same pipeline, so coach cannot bypass week lock.

### Completion pipeline

- **Single entry:** `completeWorkout` in `src/lib/completeWorkoutService.ts`. Used by client `POST /api/complete-workout` and coach `POST /api/coach/pickup/mark-complete`.
- **Steps:** Fetch workout_log; idempotency (already completed → no-op); compute totals from workout_set_logs; update workout_logs (completed_at, totals); if program_assignment_id + program_schedule_id: insert into program_day_completions (ON CONFLICT DO NOTHING), find next slot, update program_progress via `updateProgressCache`.
- **Coach impact:** Coach mark-complete creates or reuses workout_log and calls `completeWorkout`; coach cannot log sets (log-set API is client-only). Duplicate mark-complete for same day is idempotent (alreadyCompleted, ledger ON CONFLICT DO NOTHING).

### Pickup RPC vs mark-complete

- **Next-workout:** Reads `program_progress` (1-based columns after 20260209 patch). If no row, RPC inserts (1, 1, false).
- **Mark-complete:** Uses `getProgramState` (ledger: program_day_completions) to get next slot; then `completeWorkout` updates ledger and cache. So after each completion they stay in sync unless cache is wrong or RPC/progress schema differs (e.g. 0-based vs 1-based before patch).

---

## 7) Known Structural UX Friction (No Recommendations)

- **Gym Console not in bottom nav:** Access only via Menu or direct URL (`/coach/gym-console`). Coaches using pickup daily must open Menu or bookmark.
- **Compliance and Adherence are two pages:** Similar names; one real (Compliance), one mock (Adherence). Users may not know which to use.
- **Programs vs Workouts in nav:** “Workouts” redirects to templates; “Programs” is programs. Naming can be confusing (programs contain workouts).
- **Client hub: many sub-pages:** Profile, Workouts, Programs, Progress, Goals, Habits, Meals, Analytics, Adherence, Clip cards, FMS. Overview is one page; rest are separate routes. Multiple hops to see full picture.
- **Starting a workout for the client:** Coach cannot start the client’s live workout from the coach app; they can only mark complete from Gym Console. To have the client log sets, the client must open the app and start from their side.
- **Client Workouts view click:** From Client Workouts view, clicking a workout goes to coach template view `router.push(\`/coach/workouts/templates/${workout.workout_templates.id}\`)`, not to the client’s workout instance or start page. Coach sees “what” the workout is, not “start it for client.”
- **Bulk-assignments and Add client:** Not in bottom nav; reachable via dashboard quick links or Menu.
- **Dashboard “At Risk”:** Hardcoded 0; no data source.
- **Reports page:** `/coach/reports` exists; relationship to Analytics and Progress (and whether reports use same metrics) is structural only — not fully traced in this audit.

---

## Unknowns / Needs Confirmation

1. **Single “assign program to this client” in UI:** Is it only from bulk-assignments and EnhancedProgramManager (programs list), or is there another canonical “assign program” screen from the client hub?
2. **program_progress schema in DB:** Migrations show 0-based (`current_week_index`, `current_day_index`) → 1-based (`current_week_number`, `current_day_number`). Is the deployed schema fully on 20260209 so coach pickup RPC and all app code use the same columns?
3. **get_coach_pickup_workout and program_progress:** If program_progress were out of sync with program_day_completions (e.g. manual DB change or failed update), would the coach see the wrong “next” workout or could mark-complete advance the wrong day?
4. **Adherence page:** When will OptimizedAdherenceTracking use real data, and will its definition align with OptimizedComplianceDashboard or with client week-lock?
5. **Coach dashboard “today” vs timezone:** RPC uses server `CURRENT_DATE`. If the coach is in a different timezone, “today” sessions could be wrong at day boundaries. Product decision: server date vs coach timezone?
6. **Client hub compliance vs compliance dashboard:** Client hub uses local week and program-based goal; compliance dashboard uses UTC period and assignment-based counts. Should both use the same definition for consistency? (Document only — no recommendation.)
7. **Duplicate workout_log for same program slot:** Under what exact conditions could two workout_logs exist for the same (client, program_assignment_id, program_schedule_id)? Is there a unique constraint or application guard?
8. **Coach “reports” vs “analytics” vs “progress”:** Intended distinction between `/coach/reports`, `/coach/analytics`, and `/coach/progress` in terms of data and audience (e.g. export, live dashboard, client-level drill-down)?
9. **OptimizedAnalyticsOverview / OptimizedClientProgress:** Whether they use full live data or any mock; exact tables and period logic for Phase 2.

---

**Document version:** 1.0  
**Generated from:** Repository inspection only; no code or schema changes.

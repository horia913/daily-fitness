# Coach Dashboard & Client Management — Read-Only Audit

**Date:** 2026-02-17  
**Scope:** Coach dashboard/home, client list, individual client view, coach components, navigation, API routes, services, database tables, data flow.  
**Rule:** No files were modified; this is a report only.

---

## 1. Coach dashboard/home

**Primary file:** `src/app/coach/page.tsx`

**What the coach sees first when they log in:**
- **Header:** “Coach {first_name}”, current date, “Menu” link, avatar initial.
- **Control Room section:**
  - **Signals (4 tiles):** Program compliance % (this week, from Control Room API); Nutrition compliance, Habit compliance, Overall — all show “Coming soon”.
  - **Client flags (3 placeholders):** “Needs Attention”, “About to Finish Program”, “Needs New Assignment” — each shows “Not configured yet”.
- **Quick actions:** “View Clients”, “Add Client”.
- **Recent Clients:** Up to 5 recent clients (from dashboard API) with name, status (active/pending), link to `/coach/clients/{id}`. Empty state: “No clients yet” + “Add First Client”.

**Data displayed:**
- Control Room: period label, program compliance % (from `controlRoomService`).
- Recent clients: id, firstName, lastName, avatarUrl, status (from `get_coach_dashboard` RPC via `/api/coach/dashboard`).

**Quick actions:** View Clients, Add Client.

**Navigation options:** Menu (to `/coach/menu`), View All (to `/coach/clients`), each recent client card → client hub.

**Data sources:**
- `GET /api/coach/control-room` → `getControlRoomResult()` (program_assignments, program_schedule, program_day_completions, program_progress, clients).
- `GET /api/coach/dashboard` → RPC `get_coach_dashboard()` (clients, profiles, workout_templates, meal_plans, sessions).

---

## 2. Coach client list

**File:** `src/app/coach/clients/page.tsx`

**How clients are displayed:**
- **Grid or list** (toggle). Grid: cards with status bar, avatar initial, name, email, status badge. List: rows with left border by status, avatar, name, email, status.
- **Sticky header:** Title “Clients”, Active count, “Add” button, search input, status filters (All / Active / Pending / Inactive), view toggle (grid/list).

**Info per client:**
- Name, email, status (active | inactive | pending). Interface also has at-risk (TODO). **Not shown:** workoutsThisWeek, workoutGoal, compliance, lastActive, totalWorkouts, assignedWorkouts, completedWorkouts — all set to 0 or empty in mapping (TODOs in code).

**Sort/filter/search:**
- **Search:** by name or email (client-side filter).
- **Filter:** status (all, active, pending, inactive).
- **Sort:** none (order from DB).

**Actions from list:**
- Click card/row → navigate to `/coach/clients/{id}` (Client Hub). “Add” → `/coach/clients/add`.

**Data sources:** `DatabaseService.getClients(coachId)` → `clients` + `profiles` (batch by client_id).

---

## 3. Coach individual client view (Client Hub)

**File:** `src/app/coach/clients/[id]/page.tsx`

**Layout:** Back to Clients, client card (avatar, name, status, email, phone, “Client since”), actions: “Message” (outline), “Assign Workout” (opens WorkoutAssignmentModal). Then “Quick access” grid and “More” links.

**Tabs/sections (each is a separate route + component):**

| Section            | Route                                      | Component              | Purpose (from page subtitle)                          |
|--------------------|--------------------------------------------|------------------------|-------------------------------------------------------|
| Workouts/Assignments | `/coach/clients/[id]/workouts`            | ClientWorkoutsView     | View and manage training plans                        |
| Programs           | Same as Workouts (link goes to workouts)   | —                      | Programs also in ClientWorkoutsView                   |
| Adherence          | `/coach/clients/[id]/adherence`            | ClientAdherenceView    | Workout and nutrition adherence trends                |
| Meals / Meal plans | `/coach/clients/[id]/meals`                | ClientMealsView        | View and manage nutrition plans                      |
| Goals              | `/coach/clients/[id]/goals`                | ClientGoalsView        | Client goals                                          |
| Habits             | `/coach/clients/[id]/habits`               | ClientHabitsView       | Client habits                                         |
| Progress           | `/coach/clients/[id]/progress`             | ClientProgressView     | Check-ins, measurements, photos                      |
| Analytics          | `/coach/clients/[id]/analytics`            | ClientAnalyticsView    | Login history and engagement time                    |
| Profile            | `/coach/clients/[id]/profile`              | ClientProfileView      | Personal information and preferences                 |
| Clipcards          | `/coach/clients/[id]/clipcards`            | ClientClipcards        | Clipcards for client                                  |
| FMS                | `/coach/clients/[id]/fms`                  | In-page (FMS form)     | FMS assessments, progress photos                      |
| Programs (detail)  | `/coach/clients/[id]/programs/[programId]` | In-page                | Single program assignment view / schedule            |

**Data per section (from component usage):**
- **Workouts:** workout_assignments + workout_templates; program_assignments + workout_programs; stats (total, completed, in progress, assigned).
- **Progress:** wellness (getLogRange, getCompletionStats — daily_wellness_logs), body metrics (getClientMeasurements, getLatestMeasurement), progress photos (getPhotoTimeline, getPhotosForDate).
- **Adherence:** ClientAdherenceView (coach-facing adherence/compliance).
- **Meals:** ClientMealsView (meal plans / nutrition assignments).
- **Goals:** ClientGoalsView (goals table).
- **Habits:** ClientHabitsView (habits).
- **Analytics:** ClientAnalyticsView (login history, engagement).
- **Profile:** ClientProfileView (profile/settings).
- **FMS:** progressTrackingService (FMS assessments), progress photos.

**Actions per client:** Message (button, no route implemented), Assign Workout (modal: pick template + client(s)), navigate to any tab above.

---

## 4. Coach-side components

**Location:** `src/components/coach/` and `src/components/coach/client-views/`

| File | Purpose | Renders | Data used |
|------|---------|--------|-----------|
| **client-views/ClientProgressView.tsx** | Check-ins & metrics for one client | Tabs: Wellness, Body, Photos; wellness logs, body measurements, progress photos | wellnessService (getLogRange, getCompletionStats), measurementService, progressPhotoService |
| **client-views/ClientWorkoutsView.tsx** | Workouts and programs for one client | Assignments list, program list, stats | workout_assignments, workout_templates, program_assignments, workout_programs |
| **client-views/ClientAdherenceView.tsx** | Compliance overview for one client | Adherence/compliance UI | Adherence/compliance data for client |
| **client-views/ClientMealsView.tsx** | Meal plans / nutrition for one client | Assigned meal plans | Meal plans / nutrition assignments |
| **client-views/ClientGoalsView.tsx** | Goals for one client | Goals list | goals |
| **client-views/ClientHabitsView.tsx** | Habits for one client | Habits list | habits |
| **client-views/ClientAnalyticsView.tsx** | App analytics for one client | Login history, engagement time | Analytics/login data |
| **client-views/ClientProfileView.tsx** | Profile & settings for one client | Profile info | profiles |
| **client-views/ClientClipcards.tsx** | Clipcards for one client | Clipcard UI | clipcards |
| **client-views/SetNutritionGoals.tsx** | Set client nutrition goals (macros) | Form for calories, protein, carbs, fat, water | API `/api/coach/clients/[clientId]/nutrition-goals` |
| **CoachDashboardHeader.tsx** | Coach dashboard header | Header area | — |
| **ActionItems.tsx** | Action items / alerts carousel | Placeholder items (reviews, messages, clipcards, etc.) | **Hardcoded placeholder data** |
| **NewClientRequests.tsx** | New client requests | Request list/cards | New client requests |
| **TodaySchedule.tsx** | Today’s schedule | Schedule list | sessions |
| **ProgramsDashboardContent.tsx** | Programs list and management | Program cards, create/edit links | Programs RPC / program data |
| **EnhancedProgramManager.tsx** | Program CRUD / builder | Program form and timeline | program_assignments, workout_programs, schedule |
| **ProgramDetailsModal.tsx** | Program detail modal | Modal with program info | Program data |
| **ProgramTimeline.tsx** | Program timeline | Timeline view | Program schedule |
| **ProgramVolumeCalculator.tsx** | Volume calculator for program | Volume stats | Program/template data |
| **ProgramProgressionRulesEditor.tsx** | Progression rules for program | Editor UI | Program progression |
| **ProgressionSuggestionsModal.tsx** | Progression suggestions | Modal | Suggestions from rules |
| **OptimizedWorkoutTemplates.tsx** | Workout templates list | Template cards, filters | workout_templates |
| **EnhancedWorkoutTemplateManager.tsx** | Template CRUD | Template form | workout_templates |
| **WorkoutTemplateCard.tsx** | Single template card | Card UI | Template |
| **WorkoutTemplateDetails.tsx** | Template detail view | Detail layout | Template + blocks |
| **WorkoutTemplateEditor.tsx** | Edit template | Editor | workout_templates, blocks |
| **WorkoutTemplateSidebar.tsx** | Sidebar for template builder | Sidebar | Templates/blocks |
| **WorkoutBlockBuilder.tsx** | Build workout blocks | Block builder | workout_blocks, block types |
| **WorkoutTemplateFilters.tsx** | Filters for templates | Filter controls | — |
| **VolumeCalculatorWidget.tsx** | Volume calculator widget | Widget | Block/exercise volume |
| **VolumeDetailsModal.tsx** | Volume details modal | Modal | Volume data |
| **DraggableExerciseCard.tsx** | Draggable exercise card | Card | Exercise |
| **ExerciseCard.tsx** | Exercise card | Card | Exercise |
| **ExerciseSearchFilters.tsx** | Exercise search filters | Filters | — |
| **ExerciseAlternativesModal.tsx** | Exercise alternatives | Modal | Alternatives |
| **OptimizedExerciseLibrary.tsx** | Exercise library | Library list | exercises |
| **OptimizedNutritionAssignments.tsx** | Nutrition assignments | Assignments list | Meal plan assignments |
| **OptimizedFoodDatabase.tsx** | Food database | Food list | foods |
| **MealCreator.tsx** | Create meal | Meal form | Meal options |
| **MealOptionEditor.tsx** | Edit meal option | Editor | Meal options |
| **OptimizedComplianceDashboard.tsx** | Compliance dashboard | Compliance metrics | Compliance data (coach-wide) |
| **OptimizedComplianceAnalytics.tsx** | Compliance analytics | Analytics view | Compliance |
| **OptimizedAdherenceTracking.tsx** | Adherence overview | Adherence list/charts | Adherence (coach-wide) |
| **OptimizedAnalyticsReporting.tsx** | Analytics & reporting | Reports, charts | Analytics (coach-wide) |
| **OptimizedAnalyticsOverview.tsx** | Analytics overview | Overview widgets | Analytics |
| **OptimizedDetailedReports.tsx** | Detailed reports | Report builder/preview | Report data |
| **OptimizedClientProgress.tsx** | Client progress overview | Progress widgets | Progress (multi-client) |
| **ReportTemplateSelector.tsx** | Report template selector | Selector | Templates |
| **ReportPreview.tsx** | Report preview | Preview | Report payload |
| **ReportGenerator.tsx** | Report generator | Generator UI | Report config |
| **AnalyticsChart.tsx** | Chart component | Chart | Chart data |
| **ComplianceSummaryWidget.tsx** | Compliance summary | Widget | Compliance |
| **ComplianceSnapshot.tsx** | Compliance snapshot | Snapshot | Compliance |
| **DailyAdherenceLog.tsx** | Daily adherence log | Log UI | Adherence log |
| **AdherenceInsights.tsx** | Adherence insights | Insights | Adherence |
| **AdherenceTrendChart.tsx** | Adherence trend chart | Chart | Adherence |
| **ClientDetailModal.tsx** | Client detail modal | Modal | Client profile |

---

## 5. Coach navigation

**Bottom nav (Phase 2 — 5 pillars):**  
`src/components/layout/BottomNav.tsx`  
- Home → `/coach`  
- Clients → `/coach/clients`  
- Training → `/coach/programs`  
- Nutrition → `/coach/nutrition`  
- Analytics → `/coach/analytics`  

**Coach menu:** `src/app/coach/menu/page.tsx`  
- Client Management → `/coach/clients`  
- Programs → `/coach/programs`  
- Workout Templates → `/coach/workouts/templates`  
- Gym Console → `/coach/gym-console`  
- Bulk Assignments → `/coach/bulk-assignments`  
- Exercise Library → `/coach/exercises`  
- Exercise Categories → `/coach/exercise-categories`  
- Workout Categories → `/coach/categories`  
- Nutrition Management → `/coach/nutrition`  
- Analytics → `/coach/analytics`  
- Client Progress → `/coach/progress`  
- Compliance Dashboard → `/coach/compliance`  
- Reports → `/coach/reports`  
- Adherence → `/coach/adherence`  
- Goals & Habits → `/coach/goals`  
- Session Management → `/coach/sessions`  
- Availability Settings → `/coach/availability`  
- Challenges → `/coach/challenges`  
- Coach Profile → `/coach/profile`  

**Admin-only (menu):** Goal Templates, Habit Categories, Achievement Templates, Tracking Sources (under `/admin/...`).

**All coach routes (under `/coach/`):**
- `/coach` — dashboard
- `/coach/menu` — menu
- `/coach/clients` — client list
- `/coach/clients/add` — add client
- `/coach/clients/[id]` — client hub
- `/coach/clients/[id]/workouts`
- `/coach/clients/[id]/adherence`
- `/coach/clients/[id]/meals`
- `/coach/clients/[id]/goals`
- `/coach/clients/[id]/habits`
- `/coach/clients/[id]/progress`
- `/coach/clients/[id]/analytics`
- `/coach/clients/[id]/profile`
- `/coach/clients/[id]/clipcards`
- `/coach/clients/[id]/fms`
- `/coach/clients/[id]/programs/[programId]`
- `/coach/programs` — programs landing (links to training/programs, templates, etc.)
- `/coach/training/programs` — programs dashboard (ProgramsDashboardContent)
- `/coach/workouts/templates`, `/coach/workouts/templates/create`, `/coach/workouts/templates/[id]`, `/coach/workouts/templates/[id]/edit`
- `/coach/exercises`
- `/coach/exercise-categories`
- `/coach/categories`
- `/coach/bulk-assignments`
- `/coach/gym-console`
- `/coach/nutrition`, `/coach/nutrition/meal-plans`, `/coach/nutrition/meal-plans/create`, `/coach/nutrition/meal-plans/[id]`, `/coach/nutrition/meal-plans/[id]/edit`, `/coach/nutrition/foods`, `/coach/nutrition/assignments`
- `/coach/meals`
- `/coach/analytics`
- `/coach/progress`
- `/coach/compliance`
- `/coach/reports`
- `/coach/adherence`
- `/coach/goals`
- `/coach/sessions`
- `/coach/availability`
- `/coach/challenges`, `/coach/challenges/[id]`
- `/coach/notifications`
- `/coach/clipcards`
- `/coach/achievements`
- `/coach/scheduling`
- `/coach/profile`

---

## 6. Coach API routes

| Method | Route | Purpose |
|--------|--------|---------|
| GET | `/api/coach/dashboard` | Dashboard data via RPC `get_coach_dashboard`: stats (totalClients, activeClients, totalWorkouts, totalMealPlans), todaySessions, recentClients. |
| GET | `/api/coach/control-room` | Control Room: period, signals (program compliance %), exclusions. Uses `getControlRoomResult()`. |
| GET | `/api/coach/pickup/next-workout?clientId=` | Next workout for client in Gym Console (sequence-based). RPC `get_coach_pickup_workout`. |
| POST | `/api/coach/pickup/mark-complete` | Mark current program day complete for client (body: clientId, notes?). Uses programStateService + completeWorkoutService. |
| POST | `/api/coach/clients/[clientId]/nutrition-goals` | Upsert client nutrition goals (calories, protein, carbs, fat, water_ml). Uses `goals` table. |
| DELETE | `/api/coach/clients/[clientId]/nutrition-goals` | Remove active nutrition goals for client. |

---

## 7. Coach services / hooks

**Coach-specific libs:**
- **`src/lib/coachDashboardService.ts`:** getCoachStats (clients, workout_templates, meal_plans), getTodaysSessions (sessions), getRecentClients (clients + profiles). Used alongside dashboard RPC.
- **`src/lib/coach/controlRoomService.ts`:** getControlRoomResult(supabase, coachId). Reads clients, program_assignments, program_schedule, program_progress, program_day_completions. Returns period, program compliance %, exclusions.
- **`src/lib/metrics/coach.ts`:** getCoachClientIds, getTotalClients, getNewClientsInPeriod, getActiveClientsCount (optionally with activity in period via workout_logs).

**Client data:**
- **`DatabaseService.getClients(coachId)`** (`src/lib/database.ts`): clients by coach_id, then profiles by client_id; returns combined list. Used by client list page.

**Coach–client relationship:** Stored in `clients` table (coach_id, client_id, status, …). RLS and APIs check `clients` for coach access. No dedicated “coach settings” table found in audited code; coach profile in `profiles` (role, etc.).

---

## 8. Database tables (coach-related)

From migrations and code usage:

- **clients:** coach_id, client_id, status, created_at (and likely id). Index: (coach_id, client_id, status). Used for coach’s roster and RLS.
- **profiles:** id, role (client | coach | admin), first_name, last_name, email, avatar_url, phone, created_at, etc.
- **sessions:** coach_id, client_id, scheduled_at, duration_minutes, status (for today’s sessions and scheduling).
- **program_assignments:** client_id, coach_id, program_id, status, start_date, end_date, updated_at (active program per client for Control Room and program flows).
- **program_schedule:** program_id, template_id, week_number, day_of_week (or day_number).
- **program_progress:** program_assignment_id, current_week_number, current_day_number, is_completed, updated_at.
- **program_day_completions:** program_assignment_id, program_schedule_id (for compliance).
- **workout_assignments:** client_id, coach_id, workout_template_id, status, scheduled_date, etc.
- **workout_templates:** coach_id, name, is_active, etc.
- **workout_logs:** client_id, workout_assignment_id, completed_at (for completion and activity).
- **meal_plans:** coach_id, is_active.
- **goals:** client_id, coach_id, pillar, goal_type, title, target_value, target_unit, status (nutrition goals via API).
- **daily_wellness_logs:** client_id, log_date, sleep_hours, sleep_quality, stress_level, soreness_level, steps, notes (check-ins).
- **body_metrics / measurements:** client_id (for progress).
- **progress_photos:** client_id (for progress/FMS).
- **athlete_scores:** referenced in athleteScoreService (client scoring); coach visibility not fully traced in this audit.
- **coaches_public:** coach_id, first_name, last_name, is_active (from migrations).

RLS: Coach access to client data is gated by `clients` (e.g. `c.coach_id = auth.uid()`).

---

## 9. Current data flow for coach insights

- **Workout completion rates:**  
  - **Control Room:** Program compliance % (this week) = completed program days / scheduled days per client, averaged (program_assignments, program_schedule, program_day_completions, program_progress).  
  - **Client list:** workoutsThisWeek, compliance, completedWorkouts are not computed; shown as 0 (TODOs).  
  - **Per client:** ClientWorkoutsView shows assignment/program stats; ClientAdherenceView shows adherence/compliance trends.

- **Check-in / wellness:**  
  - **Client Progress tab:** ClientProgressView uses wellnessService (getLogRange, getCompletionStats) — daily_wellness_logs (sleep, stress, soreness, steps, etc.). Coach can see check-in and completion stats per client.

- **Nutrition compliance:**  
  - **Dashboard:** “Nutrition compliance” is “Coming soon”.  
  - **Per client:** ClientMealsView for meal plans; SetNutritionGoals + nutrition-goals API for macro targets. No single “nutrition compliance %” surfaced in audited dashboard.

- **Body metrics trends:**  
  - **Client Progress tab:** Body metrics (measurementService) and progress photos in ClientProgressView. No coach-wide body metrics dashboard seen.

- **Athlete scores:**  
  - athlete_scores table and athleteScoreService exist; no coach-facing “athlete scores for all clients” view found in audited pages.

- **Notifications / alerts:**  
  - **Dashboard:** “Client flags” (Needs Attention, About to Finish Program, Needs New Assignment) are placeholders (“Not configured yet”).  
  - **ActionItems:** Uses hardcoded placeholder items (reviews, messages, clipcards, missed workouts, onboarding). No live alerts from DB.

---

## 10. Answers to specific questions

1. **What does the coach see FIRST?** Control Room (program compliance % + 3 “Coming soon” tiles), 3 unconfigured client-flag placeholders, View Clients / Add Client, and Recent Clients (or “No clients yet”). It functions as a nav hub and a minimal program-compliance signal; nutrition/habit/overall and client flags are not wired.

2. **Bird’s-eye view of ALL clients’ status?** Not in one view. Client list shows name, email, status (active/pending/inactive) but no compliance or “last active” or workload. Dashboard shows only recent 5 clients. Compliance/Adherence pages are coach-wide but not a single “all clients status” grid.

3. **Clicks to a specific client’s recent workout performance?** From dashboard: 1 (Recent Clients → client) + 1 (Workouts/Assignments or Adherence) = 2. From Clients list: 1 (click client) + 1 (Workouts or Adherence) = 2.

4. **Clicks to see if a client has been checking in consistently?** From client hub: 1 (Progress or Adherence). So 2 from home (client → Progress/Adherence).

5. **“Clients needing attention” or alert system?** Placeholder only. Dashboard has “Needs Attention”, “About to Finish Program”, “Needs New Assignment” with “Not configured yet”. ActionItems uses static placeholder data, not DB-driven alerts.

6. **Can the coach see which clients completed workouts today/this week?** Not on the main dashboard or client list. Per client: yes in Workouts and Adherence. Control Room shows program compliance % for the week (all clients averaged), not “who completed today”.

7. **Coach-level analytics or reporting page?** Yes: `/coach/analytics` (OptimizedAnalyticsReporting), `/coach/reports` (OptimizedDetailedReports), `/coach/compliance` (OptimizedComplianceDashboard), `/coach/adherence` (OptimizedAdherenceTracking), `/coach/progress` (large progress page with tabs).

8. **Coach features broken, half-built, or placeholder?**  
   - **Placeholder / not configured:** Dashboard “Client flags”; Nutrition/Habit/Overall compliance tiles (“Coming soon”); ActionItems (hardcoded items).  
   - **Client list:** workoutsThisWeek, compliance, lastActive, totalWorkouts, assignedWorkouts, completedWorkouts all 0 or empty (TODOs).  
   - **Message button** on client hub: no route/messaging implemented.  
   - **Reviews:** `/coach/reviews` in ActionItems; no `app/coach/reviews` page found.  
   - **Messages:** `/coach/messages` in ActionItems; no `app/coach/messages` page in audited list.

9. **Messaging or communication tools?** “Message” button exists on client hub but no messaging implementation or coach message route found.

10. **Program/workout assignment from coach’s perspective?**  
    - **Assign Workout:** WorkoutAssignmentModal (template → client(s)), creates workout_assignments.  
    - **Programs:** Programs dashboard, create/edit program, assign to clients; program_assignments and program_schedule drive program flow.  
    - **Gym Console:** Pick client, get next workout (RPC), mark day complete (pickup/mark-complete API).  
    - **Bulk Assignments:** Page at `/coach/bulk-assignments` for assigning to multiple clients.

---

## File tree (coach-related)

```
src/app/coach/
  page.tsx                    # Dashboard
  page_new.tsx
  page_redesigned.tsx
  menu/page.tsx
  clients/
    page.tsx                 # Client list
    add/page.tsx
    [id]/
      page.tsx               # Client hub
      page_redesigned.tsx
      workouts/page.tsx
      adherence/page.tsx
      meals/page.tsx
      goals/page.tsx
      habits/page.tsx
      progress/page.tsx
      analytics/page.tsx
      profile/page.tsx
      clipcards/page.tsx
      fms/page.tsx
      programs/
        [programId]/page.tsx
  programs/
    page.tsx
    create/page.tsx
    [id]/page.tsx
    [id]/edit/page.tsx
  programs-workouts/page.tsx
  training/programs/page.tsx
  workouts/templates/
    page.tsx
    page_redesigned.tsx
    create/page.tsx
    [id]/page.tsx
    [id]/page_redesigned.tsx
    [id]/edit/page.tsx
  exercises/page.tsx
  exercise-categories/page.tsx
  categories/page.tsx
  nutrition/
    page.tsx
    meal-plans/page.tsx
    meal-plans/create/page.tsx
    meal-plans/[id]/page.tsx
    meal-plans/[id]/edit/page.tsx
    foods/page.tsx
    assignments/page.tsx
  gym-console/page.tsx
  bulk-assignments/page.tsx
  analytics/page.tsx
  progress/page.tsx
  compliance/page.tsx
  reports/page.tsx
  adherence/page.tsx
  goals/page.tsx
  sessions/page.tsx
  availability/page.tsx
  challenges/page.tsx
  challenges/[id]/page.tsx
  notifications/page.tsx
  clipcards/page.tsx
  meals/page.tsx
  scheduling/page.tsx
  profile/page.tsx
  achievements/page.tsx

src/components/coach/
  CoachDashboardHeader.tsx
  ActionItems.tsx
  NewClientRequests.tsx
  TodaySchedule.tsx
  ProgramsDashboardContent.tsx
  EnhancedProgramManager.tsx
  ProgramDetailsModal.tsx
  ProgramTimeline.tsx
  ProgramVolumeCalculator.tsx
  ProgramProgressionRulesEditor.tsx
  ProgressionSuggestionsModal.tsx
  OptimizedWorkoutTemplates.tsx
  EnhancedWorkoutTemplateManager.tsx
  WorkoutTemplateCard.tsx
  WorkoutTemplateDetails.tsx
  WorkoutTemplateEditor.tsx
  WorkoutTemplateSidebar.tsx
  WorkoutBlockBuilder.tsx
  WorkoutTemplateFilters.tsx
  VolumeCalculatorWidget.tsx
  VolumeDetailsModal.tsx
  DraggableExerciseCard.tsx
  ExerciseCard.tsx
  ExerciseSearchFilters.tsx
  ExerciseAlternativesModal.tsx
  OptimizedExerciseLibrary.tsx
  OptimizedNutritionAssignments.tsx
  OptimizedFoodDatabase.tsx
  MealCreator.tsx
  MealOptionEditor.tsx
  OptimizedComplianceDashboard.tsx
  OptimizedComplianceAnalytics.tsx
  OptimizedAdherenceTracking.tsx
  OptimizedAnalyticsReporting.tsx
  OptimizedAnalyticsOverview.tsx
  OptimizedDetailedReports.tsx
  OptimizedClientProgress.tsx
  ReportTemplateSelector.tsx
  ReportPreview.tsx
  ReportGenerator.tsx
  AnalyticsChart.tsx
  ComplianceSummaryWidget.tsx
  ComplianceSnapshot.tsx
  DailyAdherenceLog.tsx
  AdherenceInsights.tsx
  AdherenceTrendChart.tsx
  ClientDetailModal.tsx
  client-views/
    ClientProgressView.tsx
    ClientWorkoutsView.tsx
    ClientAdherenceView.tsx
    ClientMealsView.tsx
    ClientGoalsView.tsx
    ClientHabitsView.tsx
    ClientAnalyticsView.tsx
    ClientProfileView.tsx
    ClientClipcards.tsx
    SetNutritionGoals.tsx

src/lib/
  coachDashboardService.ts
  coach/
    controlRoomService.ts
  metrics/
    coach.ts
```

**Coach API routes:**  
`src/app/api/coach/dashboard/route.ts`, `control-room/route.ts`, `pickup/next-workout/route.ts`, `pickup/mark-complete/route.ts`, `clients/[clientId]/nutrition-goals/route.ts`.

---

*End of audit. No code was changed.*

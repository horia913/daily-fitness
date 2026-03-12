# Coach-Side Client Management — Complete Current State Audit

**Date:** March 2026  
**Scope:** READ-ONLY audit of coach dashboard, client list, individual client hub (all tabs), coach-side check-in/progress views, alerts system, and coach-to-client data flow.  
**No files were modified.**

---

## PART 1: COACH DASHBOARD

### 1A. Stat Cards / Control Room

| Stat | Data source | Real or placeholder |
|------|-------------|----------------------|
| **Trained Today** | `workout_logs`: count distinct `client_id` where `completed_at` is within today (todayStart–todayEnd). From `getMorningBriefing` → `todayWorkouts`. | **Real** |
| **Checked In** | `daily_wellness_logs`: count distinct `client_id` where `log_date = todayStr`. From `getMorningBriefing` → `todayCheckins`. | **Real** (daily wellness only; does not count body_metrics/scheduled check-ins) |
| **Program Compliance** | `getControlRoomResult(supabase, user.id)` → `signals.coachProgramCompliancePct`. Uses `program_assignments`, `program_schedule`, `program_progress`, `program_day_completions`. This-week completion % per client, averaged. | **Real** |
| **Active Clients** | `briefing.activeClients` / `briefing.totalClients` from `clients` table (`status = 'active'`). | **Real** |

- **API:** `GET /api/coach/dashboard` returns `{ briefing, controlRoom }`. Briefing from `getMorningBriefing(user.id, supabase)`, control room from `getControlRoomResult(supabase, user.id)`.
- **No "Coming Soon"** on the dashboard stat cards. Nutrition/Habit/Overall compliance are not shown on the dashboard; control room returns `coachNutritionCompliancePct`, `coachHabitCompliancePct`, `coachOverallCompliancePct` as `null` (not displayed in current UI).

### 1B. Client Alerts / Attention Flags

- **System:** Alerts are **DB-driven** from `getMorningBriefing`. Combined and sorted by `sortAlertsByPriority` (high → medium → low). Up to 5 shown; "See all X alerts" links to `/coach/clients`.
- **Alert types and triggers:**

| Type | Trigger | Data source |
|------|---------|-------------|
| noCheckIn3Days | Client has checked in at least once ever, is not new (< 7 days), and last check-in date &lt; 3 days ago | `daily_wellness_logs` (last log_date per client), `hasEverCheckedInSet` |
| highStress | Avg stress (UI scale) ≥ 4 over last 3 wellness entries | `recentWellnessLogs`, `dbToUiScale(stress_level)` |
| highSoreness | Avg soreness ≥ 4 over last 3 entries | Same |
| lowSleep | Avg sleep &lt; 6h over last 3 entries | Same |
| missedWorkouts | Assignments in last 7 days (scheduled_date in past) with no completed workout_log | `workout_assignments`, `workout_logs` (workout_assignment_id) |
| programEnding | Active program end_date within 7 days | `program_assignments` (start_date + duration_weeks → computed end_date) |
| noProgram | No active program_assignments | Same |
| noMealPlan | No active meal_plan_assignments | `meal_plan_assignments` |

- **ActionItems.tsx:** **Deprecated.** File states: "Alerts are now handled directly in the coach dashboard page via getMorningBriefing()." Component is **not imported** anywhere; it uses hardcoded placeholder data and is kept for reference only.

### 1C. Client Roster on Dashboard

- **Per-client info (from `briefing.clientSummaries`):** First/last name, trainedToday, checkedInToday, checkinStreak, lastWorkoutDate, lastCheckinDate, programCompliance, latestSleep, latestStress, latestSoreness, hasActiveProgram, hasActiveMealPlan.
- **Data source:** All from `getMorningBriefing` (profiles, workout_logs, daily_wellness_logs, program_assignments, meal_plan_assignments, etc.). **Real data.**
- **programCompliance:** Set to `null` in briefing (TODO in coachDashboardService: "Calculate from program_day_completions"). Dashboard displays "—" for compliance when null; the **Program Compliance** card uses control room `coachProgramCompliancePct` instead.
- **Search:** Yes; filters by client name (`searchQuery`).
- **Sort:** Name, Last Active, Streak, Compliance — all use real fields from clientSummaries.

### 1D. Quick Actions

- **Only one:** "View Clients" → `/coach/clients`. **Works.**
- No Message button; no dead links on the dashboard.

---

## PART 2: COACH CLIENT LIST

**Page:** `src/app/coach/clients/page.tsx`  
**Data:** `GET /api/coach/clients` → returns `{ clients }`. Each client includes profile (name, email, avatar) and `metrics` from `getClientMetrics(clientIds, supabase)`.

### 2A. Per-Client Information

| Field | Real data? | Source |
|-------|------------|--------|
| Name, email, status | Yes | `profiles`, `clients` |
| Last active | Yes | Most recent of last workout date (workout_logs.completed_at) or last wellness log_date |
| Workouts this week | Yes | workout_logs in last 7 days, completed |
| Check-in streak | Yes | daily_wellness_logs (complete logs only), consecutive days including today |
| Program status | Yes | program_assignments (active), computed end_date; "active" / "noProgram" / "endingSoon" |
| Trained today / Checked in today | Yes | Same as dashboard logic |
| Latest stress / soreness | Yes | Most recent wellness log, dbToUiScale |

### 2B. Sort, Filter, Search

- **Sort:** Name, Last Active, Check-in Streak, Workouts This Week, Needs Attention. All use real metrics.
- **Filters:** Status (all, active, pending, inactive); quick filters: Needs Attention, Trained Today, Checked In Today. Needs Attention = no lastActive OR lastActive in “error” range OR no program OR stress/soreness ≥ 4.
- **Search:** By name or email. Works.

### 2C. Missing from Client List

- **Last check-in date** — Not shown as a dedicated column (only “Last active” which combines workout + wellness).
- **Current program name/week** — Not shown; only “Active” / “Ending Soon” / “No Program”.
- **Scheduled check-in status (due/overdue)** — Not shown; would require check_in_configs + last body_metrics date per client.
- **Nutrition compliance** — Not on list.
- **Body metrics trend** — Not on list.

---

## PART 3: INDIVIDUAL CLIENT HUB

**Landing:** `src/app/coach/clients/[id]/page.tsx` — header (name, email, phone, “Client since”), Message (WhatsApp or mailto or alert), Assign Workout (opens WorkoutAssignmentModal), and **Quick access** cards to sub-routes. No tab bar; each “tab” is a separate route.

### 3A. Client Overview / Header

- **Shown:** Name, avatar initial, status (active/at-risk/inactive from weekly compliance), email, phone (if any), “Client since” (profile.created_at).
- **Quick actions:** Message (WhatsApp if phone, else mailto; else `alert("No phone or email")`), Assign Workout (modal). **Both work.**
- **Quick access grid:** Workouts/Assignments → `/workouts`, Programs → `/workouts` (same), Adherence → `/adherence`, Meals → `/meals`, Goals → `/goals`, Habits → `/habits`, Progress → `/progress`, Analytics → `/analytics`, Profile → `/profile`. **More:** Clipcards, FMS. All routes exist.

### 3B. Workouts Tab (ClientWorkoutsView)

- **Route:** `/coach/clients/[id]/workouts` (workouts page renders ClientWorkoutsView).
- **Data:** workout_assignments (with workout_templates), program_assignments (with workout_programs). **Real.**
- **Stats:** total, completed, inProgress, assigned — from assignment status counts. **Real.**
- **Assign new workout:** Via hub “Assign Workout” (WorkoutAssignmentModal); not re-checked inside ClientWorkoutsView.
- **Unassign program:** Not visible in the read audit; would require checking program detail/replace flow.

### 3C. Programs Tab / Program Detail

- **Route:** Programs link from hub goes to `/workouts` (same as workouts). Program detail: `/coach/clients/[id]/programs/[programId]/page.tsx`.
- **Program detail:** Current week, day, progress; weekly schedule with completion status. Replace active program flow exists (referenced in audit context). Gym console / pick up workout: `/coach/gym-console` exists.

### 3D. Progress Tab (ClientProgressView)

- **Route:** `/coach/clients/[id]/progress`. Renders ClientProgressView + CheckInConfigEditor below.
- **No sub-tabs;** single scrollable view: Latest check-in (body_metrics last vs previous), progress photos (before/after from getComparisonPhotos), weight trend (last 12), wellness trend (4 weeks sleep/stress), “View all check-in history” (measurements list).
- **Wellness:** Uses `getLogRange`, `getCompletionStats` (7 days). **Real** daily_wellness_logs.
- **Body:** getClientMeasurements, getLatestMeasurement. **Real** body_metrics; matches client body-metrics page data.
- **Photos:** getPhotoTimeline, getComparisonPhotos. **Real** progress_photos + storage.
- **CheckInConfigEditor:** Rendered on same page; getClientCheckInConfig, upsertCheckInConfig. Frequency, weight/body fat/photos/circumferences/notes to coach. **Functional.**
- **AddClientCheckInModal:** “Add check-in for client” opens modal; uses createMeasurement (body_metrics). **Works** (creates one measurement; client-side uses upsert for same-date).

### 3E. Adherence Tab (ClientAdherenceView)

- **Data:** program_assignments (active), program_progress (current_week_number), program_schedule (slots for that week), program_day_completions. Workout adherence % = completed this week / total slots this week. **Real.**
- **Nutrition adherence:** Shown as **0%** (hardcoded). Not calculated.
- **Time range:** This week (program week). No check-in adherence.

### 3F. Goals Tab (ClientGoalsView)

- **Data:** **Placeholder.** Hardcoded array of 3 sample goals (Bench Press 100kg, Lose 10kg, Complete 50 Workouts). “5 Achieved” and “67% Avg Progress” are fixed. **Not** from `goals` table.

### 3G. Meals / Nutrition Tab (ClientMealsView)

- **Data:** Meal plan assignments, nutrition mode, compliance from nutritionLogService, mealPlanService, foodLogService. **Real** where implemented. One toast: “Meal plan assignment coming soon” in a specific flow.
- **Assign meal plan:** MealPlanAssignmentModal and assignment logic exist; full flow may have edge cases.

### 3H. Habits Tab (ClientHabitsView)

- **Data:** habit_assignments, habit_logs. **Real.** Completion and streaks from logs.

### 3I. Analytics Tab (ClientAnalyticsView)

- **Data:** **Placeholder.** Static object: totalLogins 156, avgSessionDuration '12m', weeklyLogins [5,6,7,6,5,4,3], etc. **No DB.**

### 3J. FMS Tab

- **Route:** `/coach/clients/[id]/fms`. Uses FMSAssessmentService, ProgressPhotoStorage.
- **Create/edit:** Yes; form with FMS test fields, save/update/delete. **Persisted** to `fms_assessments`.
- **Column name mismatch:** DB schema has `deep_squat`, `hurdle_step_left`, … (no `_score` suffix). Code (FMSAssessment, FMSAssessmentService) uses `deep_squat_score`, `hurdle_step_left_score`, etc. Insert spreads `...assessment`, so keys like `deep_squat_score` may not map to DB columns — **risk of silent non-persistence or error** unless a mapping layer or DB alias exists.

### 3K. Profile Tab (ClientProfileView)

- **Data:** DatabaseService.getProfile(clientId). **Real** profiles.
- **Edit:** View is read-only in the component; no in-page edit form observed. Client status (active/inactive) is from clients table; changing it would require another flow (e.g. clients list or profile edit page).

### 3L. Clip Cards Tab (ClientClipcards)

- **Data:** supabase `clipcards`, `clipcard_types`. **Real.** Create/edit/issue clipcards for client.

---

## PART 4: COACH-SIDE REFLECTION OF CLIENT CHECK-IN DATA

### 4A. Daily Wellness Check-In Data

- **Where coach sees it:** Dashboard “Checked In” count (daily_wellness_logs today); roster “Checked in today” and stress/soreness dots; client Progress tab (wellness trend 4 weeks, “Sleep avg / Stress avg / Check-in streak” in latest check-in card).
- **Fields shown:** Sleep hours, stress, soreness; streak from completion stats. Notes appear if present on latest body_metrics (in “Client notes” on Progress).
- **Check-in streak:** Shown on dashboard roster and in ClientProgressView (from getCompletionStats 7-day logged days). **Real.**
- **Wellness trends (this week vs last month):** Client has WellnessTrendsCard on check-ins page; coach has 4-week wellness bars (sleep/stress) on Progress. Coach does **not** get the same “This week / Last month / 3 months ago” table.

### 4B. Scheduled Check-In Data

- **Where:** Client Progress tab — “Latest check-in” table (body_metrics last vs previous), progress photos comparison, weight trend.
- **“Since you started”:** That block exists only on the **client** StepReview (weekly check-in flow). **Coach does not see it** on Progress.
- **Progress photos:** Coach sees getComparisonPhotos (before/after) on Progress. **Real.**
- **Notification when client completes scheduled check-in:** No dedicated notification; coach would see updated data on next open of Progress or dashboard.

### 4C. Check-In Configuration Flow

- **Where:** Progress page below ClientProgressView: **CheckInConfigEditor** (frequency_days, weight_required, body_fat_enabled, photos_enabled, circumferences_enabled, notes_to_coach_enabled). **Real** check_in_configs.
- **Frequency and “due”:** Client WeeklyCheckInCard uses getDueThreshold(frequencyDays) and getClientCheckInConfig. So coach changes to frequency **do** affect when the client sees “due” (same config).
- **Per client:** Yes; config is per client_id.
- **“Scheduled Check-In” naming:** Client-facing text was updated to “Scheduled Check-In”; coach Progress page title is “Check-ins & Metrics” and “Latest check-in” — no explicit “Scheduled Check-In” label.

### 4D. Missing Coach-Side Features

- **Overdue scheduled check-ins:** No list or filter of “clients with overdue scheduled check-in” (would need check_in_configs + last body_metrics per client).
- **Summary of all clients’ latest check-in in one view:** No; coach must open each client’s Progress.
- **Progress photos in one place:** No global gallery; only per-client Progress tab.
- **“Clients who haven’t checked in this week” filter:** No; only “Needs Attention” (includes no check-in 3+ days) and “Checked In Today.”

---

## PART 5: NAVIGATION & INFORMATION ARCHITECTURE

### 5A. Bottom Nav (Coach)

- Home → `/coach`
- Clients → `/coach/clients`
- Training → `/coach/programs`
- Nutrition → `/coach/nutrition`
- Analytics → `/coach/analytics`

Menu links “Programs” to `/coach/training/programs`; that page redirects/links to `/coach/programs`. So Training in nav goes to programs list. **Logical.**

### 5B. Menu Page

- **Sections:** Client Management (Clients), Training (Programs, Workout Templates, Exercise Library, Gym Console), Nutrition (Meal Plans, Generator, Food Database, Assignments), Analytics & Reports (Analytics, Compliance Dashboard), Settings (Profile). Admin: Goal Templates, Habit Categories, Achievement Templates, Tracking Sources.
- **Links:** All point to existing routes. Comment in menu: “/coach/reviews and /coach/messages do not exist — not linked.” **No dead links in menu.**

### 5C. Redundant Routes

- **/coach/programs** and **/coach/training/programs:** Both exist; training/programs page links to `/coach/programs`. No redirect loop; possible redundancy.
- **/coach/analytics:** Exists; renders OptimizedAnalyticsReporting (coach-level). Per-client analytics is at `/coach/clients/[id]/analytics` (placeholder view).

---

## PART 6: DATA FLOW INTEGRITY

### 6A. Coach Dashboard Data Sources

- **Briefing:** coachDashboardService.getMorningBriefing → clients, profiles, workout_logs (today + last), daily_wellness_logs (today + recent + week + all for streak), program_assignments, meal_plan_assignments, athlete_scores, workout_assignments (week), program_day_completions (via control room). **Real-time** (no caching in code).
- **Control room:** controlRoomService.getControlRoomResult → program_assignments, program_progress, program_schedule, program_day_completions. **Real-time.**

### 6B. Placeholder / TODO Inventory (Coach-Side)

| File | Finding |
|------|--------|
| coachDashboardService.ts | `programCompliance = null` per client; TODO: "Calculate from program_day_completions" |
| coachDashboardService.ts | `avgProgramCompliance = 0` in briefing; compliance shown from control room only |
| progress/page.tsx | addToast "Generate Progress Report coming soon", "Export Data coming soon" |
| ClientGoalsView.tsx | Hardcoded sample goals; no goals table fetch |
| ClientAnalyticsView.tsx | Hardcoded analyticsData; no DB |
| ClientAdherenceView.tsx | nutritionAdherence = 0 (not calculated) |
| ClientMealsView.tsx | addToast "Meal plan assignment coming soon" (one flow) |
| SetNutritionGoals.tsx | TODO: "Macro Calculator Helper" |
| WorkoutBlockBuilder.tsx | TODO: "Open exercise selector" |
| ProgramProgressionRulesEditor.tsx | "Showing Week 1 data as placeholders. Edit any field to create" when isPlaceholder |
| EnhancedProgramManager.tsx | TODO: send notifications; "Program Create Form (placeholder)"; TODO Refactor WorkoutBlockService |
| EnhancedWorkoutTemplateManager.tsx | "Template Builder Component (placeholder - needs full implementation)" |
| DailyAdherenceLog.tsx | mockDailyLogs; "Mock daily log data - replace with actual data" |
| AdherenceInsights.tsx | mockInsights; "Mock insights data - replace with actual data" |
| ActionItems.tsx | @deprecated; hardcoded placeholder data; not used |
| habits/page.tsx | "Set mock data for demonstration" (line 178) |
| meals/page.tsx, habits/page.tsx, clipcards/page.tsx, etc. | Multiple `alert()` for errors/success (browser alerts instead of toast) |

### 6C. Non-Functional UI Elements

- **Empty handlers:** None found as `onClick={() => {}}` in coach code.
- **Buttons/links to non-existent routes:** Menu and nav audited; no broken links in menu. ActionItems (deprecated) links to /coach/reviews, /coach/messages — component not used.
- **Tabs showing “No data” when data exists:** ClientGoalsView and ClientAnalyticsView always show placeholder data regardless of DB.

---

## SUMMARY TABLE — Coach Dashboard

| Dashboard Element | Shows Real Data? | Data Source | Notes |
|-------------------|------------------|-------------|-------|
| Trained Today | Yes | workout_logs (today, completed_at) | Distinct clients |
| Checked In | Yes | daily_wellness_logs (log_date = today) | Daily wellness only |
| Program Compliance | Yes | controlRoomService (program_assignments, schedule, completions) | This-week program compliance % |
| Active Clients | Yes | clients (status = 'active') | Count + total |
| Client Alerts | Yes | getMorningBriefing (wellness, assignments, programs, meal plans) | 8 alert types, DB-driven |
| Client Roster | Yes | Same briefing clientSummaries | Search, sort; programCompliance per client is null |

---

## SUMMARY TABLE — Client Hub Tabs

| Tab | Shows Real Data? | Key Data Source | Functional? | Notes |
|-----|------------------|-----------------|-------------|-------|
| Workouts | Yes | workout_assignments, workout_templates | Yes | Stats real |
| Programs | Yes | program_assignments, workout_programs | Yes | Detail + replace flow |
| Progress | Yes | body_metrics, daily_wellness_logs, progress_photos | Yes | CheckInConfigEditor, AddClientCheckInModal work |
| Adherence | Partially | program_* for workout % | Yes | Nutrition adherence 0% |
| Goals | No | Hardcoded array | Placeholder | Should use goals table |
| Meals | Yes | meal plans, nutrition services | Yes | One “coming soon” toast |
| Habits | Yes | habit_assignments, habit_logs | Yes | |
| Analytics | No | Hardcoded object | Placeholder | |
| FMS | Yes | fms_assessments | Yes | Possible *_score vs schema column mismatch |
| Profile | Yes | profiles | Yes | Read-only |
| Clip Cards | Yes | clipcards, clipcard_types | Yes | |

---

## SUMMARY TABLE — Coach Sees Client Check-In Data

| Client Action | Coach Sees It? | Where? | Real Data? | Gaps |
|---------------|----------------|--------|-------------|------|
| Daily wellness check-in | Yes | Dashboard count, roster, client Progress (wellness trend, streak) | Yes | — |
| Scheduled body check-in | Yes | Client Progress (latest check-in table, photos, weight trend) | Yes | No “Since you started” on coach |
| Progress photo upload | Yes | Client Progress (comparison before/after) | Yes | — |
| Check-in streak | Yes | Dashboard roster, Progress (7-day in card) | Yes | — |
| Wellness trends (week vs month) | Partially | Progress 4-week bars | Yes | Not same as client WellnessTrendsCard |
| Body metrics trends | Yes | Progress (weight trend, history) | Yes | — |

---

## TOP ISSUES (Ordered by Impact)

1. **Client Goals tab is placeholder** — ClientGoalsView shows hardcoded sample goals. Coach cannot see or create real goals from the `goals` table in this view.
2. **Client Analytics tab is placeholder** — ClientAnalyticsView uses static numbers; no login/session or engagement data from DB.
3. **FMS column name mismatch** — Code uses `*_score` (e.g. deep_squat_score); schema has `deep_squat`, `hurdle_step_left`, etc. Creates risk that FMS scores are not saved or read correctly.
4. **Program compliance per client is null on dashboard** — clientSummaries.programCompliance is set to null (TODO in service). Only the global Program Compliance card (control room) is real.
5. **No coach view of “Since you started”** — Client sees this in StepReview; coach Progress tab does not show first-vs-current body metrics.
6. **No overdue scheduled check-in list** — Coach cannot see “clients with overdue scheduled check-in” or “haven’t checked in this week” without opening each client.
7. **Nutrition adherence in Adherence tab is 0%** — ClientAdherenceView does not compute or display real nutrition adherence.
8. **AddClientCheckInModal uses createMeasurement only** — Client uses upsertMeasurement for same date; coach modal can hit unique constraint if client already logged that day (depends on UX: coach “add” may be for backdating).
9. **Multiple `alert()` usages** — Coach pages (meals, habits, clipcards, clients/[id], FMS, programs) use browser `alert()` for success/error instead of a consistent toast or in-page feedback.
10. **“Coming soon” toasts** — Generate Progress Report and Export Data (progress page); Meal plan assignment (ClientMealsView) in one flow.

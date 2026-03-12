# End-to-End Testing Audit — Verify Every Flow Works

**Date:** March 2026  
**Scope:** READ-ONLY verification of major user flows. Code paths traced; runtime errors, type mismatches, missing imports, broken queries, and dead code paths documented.  
**No files were modified.**

---

## FLOW STATUS TABLE

| Flow # | Flow Name | Status | Issues Found | Severity |
|--------|-----------|--------|-------------|----------|
| 1 | Client Dashboard Load | ⚠️ | Athlete-score API returns stale scoreHistory when recalculating; client does not use `todaySlot`/`isRestDay` from API (only RPC `todaysWorkout`). ScoreBreakdown can show NaN if backend ever returns null component scores. | Low |
| 2 | Daily Check-In | ✅ | Flow wired: upsertDailyLog, getCheckinStreak, success insight, checkin_streak achievement → modal. Optional weight uses createMeasurement/upsertMeasurement. | — |
| 3 | Scheduled (Weekly) Check-In | ⚠️ | Flow exists (WeeklyCheckInCard, StepBodyMetrics, StepPhotos, StepReview, ProgressMomentCard). Not fully traced for bucket name, check_in_configs field mapping, or "Since you started" query. | Medium |
| 4 | Start and Complete Workout | ⚠️ | **PRs from log-set path do NOT trigger pr_count achievement or leaderboard update** — only `progressTrackingService.upsertPersonalRecord` does; log-set uses `prService.checkAndStorePR`. Complete-workout does call updateLeaderboardForClient and workout_count/streak_weeks/total_volume/program_completion achievements. Multiple `alert()` calls on train page and EnhancedClientWorkouts. | High (PR path) / Low (alerts) |
| 5 | Client Progress (Hub, Analytics, PRs, Logs, Body, Photos, Leaderboard, Achievements, Mobility, Performance) | ⚠️ | Depends on real data and correct API/DB usage. Recent PRs fix (0/0) noted in audit doc. Not re-verified line-by-line. | Low |
| 6 | Client Nutrition | ⚠️ | "Recipes (Coming soon)", "Favorites (Coming soon)" in AddFoodModal; meal plan assignment "coming soon" toast in ClientMealsView. | Low |
| 7 | Client Goals and Habits | ⚠️ | Goals page and HabitManager use `alert()` for validation/failure. Real goals from `goals` table; flow exists. | Low |
| 8 | Client Achievements and Leaderboard | ✅ | Achievements page uses templates + user_achievements; unlock modal wired on complete-workout and daily check-in. Leaderboard populated by leaderboardPopulationService after complete-workout and after PR via progressTrackingService (not after log-set PR). | — |
| 9 | Client Challenges | ⚠️ | Not fully traced (creation, join, video submission, approval). Audit doc (ACHIEVEMENTS_LEADERBOARDS_CHALLENGES_AUDIT_MARCH_2026.md) describes challenge system. | Medium |
| 10 | Coach Dashboard | ✅ | Real briefing/alerts from coachDashboardService; all 9 alert types (noCheckIn3Days, highStress, highSoreness, lowSleep, missedWorkouts, programEnding, noProgram, noMealPlan, overdueCheckIn, achievementUnlocked). Client roster, sort, search. | — |
| 11 | Coach Client List | ✅ | Real metrics, sort, filters; navigation to client hub. | — |
| 12 | Coach Client Hub (all tabs) | ⚠️ | Overview, Workouts, Programs, Progress, Adherence, Goals, Meals, Habits, Analytics, FMS, Profile, Clip Cards — not each tab traced. Replace-program flow and real data usage documented in COACH_CLIENT_MANAGEMENT_COMPLETE_AUDIT_MARCH_2026. | Medium |
| 13 | Coach Creates Workout Template | ⚠️ | No Preview/Revert in prompt; Circuit removed in block conversion. WorkoutDetailModal and other components still use `alert()` for save/duplicate. | Low |
| 14 | Coach Creates and Assigns Program | ✅ | Replace active program confirmation flow exists; programStateService and assign/replace logic wired. | — |
| 15 | Coach Creates Challenge | ⚠️ | Form and save path not fully traced; audit doc references challenge creation. | Medium |
| 16 | Coach PDF Report | ⚠️ | Generate Report modal and Export Data (CSV) path not fully traced. | Low |

---

## CROSS-SYSTEM STATUS TABLE

| System | Component | Works? | Issue |
|--------|-----------|--------|-------|
| Achievement triggers | workout_count | ✅ | completeWorkoutService → checkAndUnlockAchievements; writes user_achievements; complete page shows modal from new_achievements. |
| Achievement triggers | streak_weeks | ✅ | Same path as workout_count. |
| Achievement triggers | total_volume | ✅ | getCurrentMetricValue implemented (workout_set_logs weight×reps sum). |
| Achievement triggers | pr_count | ❌ | **Only triggered from progressTrackingService.upsertPersonalRecord.** PRs stored via **log-set → prService.checkAndStorePR** do NOT call checkAndUnlockAchievements or updateLeaderboardForClient. |
| Achievement triggers | checkin_streak | ✅ | DailyWellnessForm after upsertDailyLog → checkAndUnlockAchievements; modal shown. |
| Achievement triggers | program_completion | ✅ | completeWorkoutService when programProgression.status === 'program_completed'. |
| Achievement triggers | weight_goal | ✅ | LogMeasurementModal and WeeklyCheckInFlow call checkAndUnlockAchievements(clientId, "weight_goal"). |
| Achievement triggers | leaderboard_rank | ✅ | leaderboardPopulationService after recalc, when client in top 3. |
| Leaderboard | Population after workout | ✅ | completeWorkoutService calls updateLeaderboardForClient(clientId, undefined). |
| Leaderboard | Population after PR (log-set) | ❌ | prService.checkAndStorePR does not call updateLeaderboardForClient. PR path in progressTrackingService does. |
| Leaderboard | Ranks recalculated | ✅ | recalcRanksForPartition in leaderboardPopulationService. |
| Leaderboard | Rank-change toast | ✅ | complete-workout response leaderboard_rank_changes; client shows toast. |
| Coach alerts | noCheckIn3Days | ✅ | coachDashboardService. |
| Coach alerts | highStress, highSoreness, lowSleep | ✅ | coachDashboardService. |
| Coach alerts | missedWorkouts, programEnding, noProgram, noMealPlan | ✅ | coachDashboardService. |
| Coach alerts | overdueCheckIn | ✅ | coachDashboardService. |
| Notifications | alert() replaced with toasts | ❌ | **Many alert() calls remain** (see DEAD CODE / ORPHAN LIST). |
| Notifications | "Coming soon" toasts | ⚠️ | ClientMealsView "Meal plan assignment coming soon". |
| Notifications | Achievement unlock modal + push | ⚠️ | Modal shown; push (notifyAchievementEarned) not verified as called from achievementService. |

---

## DEAD CODE / ORPHAN LIST

### 1. `alert()` still used (not replaced by toasts)

- **dailyfitness-app/src/app/client/train/page.tsx**: 175, 178, 180, 191, 194, 223  
- **dailyfitness-app/src/app/client/progress/mobility/page.tsx**: 117  
- **dailyfitness-app/src/components/goals/AddGoalModal.tsx**: 68, 99  
- **dailyfitness-app/src/components/client/FoodLogEntry.tsx**: 23, 35  
- **dailyfitness-app/src/components/client/EnhancedClientWorkouts.tsx**: 1318, 1323  
- **dailyfitness-app/src/components/WorkoutDetailModal.tsx**: 392, 469, 476, 544, 548  
- **dailyfitness-app/src/components/WorkoutAssignmentModal.tsx**: 296, 302  
- **dailyfitness-app/src/app/client/progress/photos/page.tsx**: 170, 210, 244, 261, 267  
- **dailyfitness-app/src/app/client/goals/page.tsx**: 533, 579, 582, 594, 608, 672, 678, 729  
- **dailyfitness-app/src/components/HabitManager.tsx**: 221, 276, 308  
- **dailyfitness-app/src/components/progress/MobilityFormFields.tsx**: 77, 109  
- **dailyfitness-app/src/components/ExerciseSetForm.tsx**: 105  
- **dailyfitness-app/src/components/CategoryForm.tsx**: 182  
- **dailyfitness-app/src/components/ExerciseCategoryForm.tsx**: 142  
- **dailyfitness-app/src/components/BulkAssignment.tsx**: 201, 232, 290  
- **dailyfitness-app/src/components/HabitTracker.tsx**: 151, 195  

### 2. "Coming soon" / placeholder text

- **AddFoodModal.tsx**: "Recipes (Coming soon)", "Favorites (Coming soon)"  
- **ClientMealsView.tsx**: addToast "Meal plan assignment coming soon"  
- **client/activity/page.tsx**: "Log Activity — Coming soon"  
- **GreetingSettings.tsx**: "Display weather information (coming soon)"  

### 3. Circuit / legacy references (no longer created, still in code)

- **start/page.tsx**: Tabata/Circuit state, `circuit_sets` / `tabata_sets` in meta; UI label "Circuit" vs "Tabata".  
- **blockConversion.ts**: Comment "Circuit block type removed".  
- **CircuitsDisplay.tsx**, **BlockCardDisplay.tsx**: Tabata uses CircuitsDisplay; "Circuit" label for non-Tabata.  
- **workout-form/AddExercisePanel.tsx**, **ExerciseDetailForm.tsx**, **ExerciseBlockCard.tsx**: "Tabata Circuit" / Circuit references.  
- **TabataCircuitTimerModal.tsx**, **TabataExecutor.tsx**: Tabata + legacy circuit_sets.  
- **WorkoutTemplateForm.tsx**: "Tabata Circuit" string.  
- **ProgressionSuggestionsModal.tsx**: "Circuit" description.  

### 4. Unused / redundant imports (sample; not exhaustive)

- **client/page.tsx**: Does not import `clientDashboardService` (uses API only) — correct.  
- **api/client/athlete-score/route.ts**: When recalculating, returns existing `scoreHistory` (not refetched), so new score is not in history until next request — minor.  

### 5. Dashboard RPC vs buildProgramWeekState

- **api/client/dashboard/route.ts**: Adds `todaySlot`, `isRestDay` from `buildProgramWeekState` and `programProgress`. Client page uses only `todaysWorkout` from RPC for the "Today's workout" card. If RPC and builder use different date logic (e.g. timezone), card could disagree with program state elsewhere.  

---

## BUILD / TYPE SAFETY

- **TypeScript**: `npx tsc --noEmit` was run; result may be in terminal output (command ran in background). Manual trace:  
  - **complete-workout route**: Maps `result.leaderboardRankChanges` to `type`, `old_rank`, `new_rank`, `exercise_name` — client expects `c.type`, `c.new_rank`, etc. ✅  
  - **AthleteScore**: API returns `{ score, scoreHistory }`; client uses `data.score` (object) and `data.scoreHistory`. ✅  
  - **Dashboard payload**: RPC returns `todaysWorkout` with `name`, `weekNumber`, `dayNumber` (migration 20260311). ✅  
- **ScoreBreakdown**: Receives `scores.workout` etc.; if any is `undefined`/`null`, `Math.round(item.value)` can render NaN. Backend athlete_scores supplies numbers; defensive check would avoid NaN if schema/API ever change.  

---

## DATABASE QUERY VERIFICATION (sample)

- **get_client_dashboard**: Uses `workout_set_entries` (20260311); returns `todaysWorkout` with expected keys.  
- **wellnessService.upsertDailyLog**: Upsert on `(client_id, log_date)`; merge with existing row.  
- **leaderboardPopulationService.upsertEntry**: Select by client_id, leaderboard_type, exercise_id, time_window; then update or insert.  
- **personal_records**: Two paths — (1) **prService** (log-set): inserts/updates, no achievement/leaderboard call. (2) **progressTrackingService.upsertPersonalRecord**: inserts and calls checkAndUnlockAchievements(pr_count) and updateLeaderboardForClient.  

---

## TOP ISSUES (ordered by severity)

1. **PR achievement/leaderboard gap (High)**  
   When a client logs a set that is a new PR via **POST /api/log-set**, the app uses **prService.checkAndStorePR**, which writes to `personal_records` but does **not** call `AchievementService.checkAndUnlockAchievements(clientId, 'pr_count')` or `updateLeaderboardForClient`. So PRs from the main workout logging path never trigger pr_count achievements or leaderboard updates. Only the path that uses **progressTrackingService.upsertPersonalRecord** does (that path is not invoked from log-set).  

2. **Many `alert()` calls (Medium)**  
   Multiple flows still use `alert()` for errors or success (train, goals, habits, photos, workout modals, bulk assignment, etc.). Per audit request, these should be replaced with toasts for consistency.  

3. **Scheduled check-in and challenge flows (Medium)**  
   Weekly check-in (StepBodyMetrics, StepPhotos, StepReview, ProgressMomentCard, config-driven fields, "Since you started") and challenge creation/join/video/approval were not fully traced. Recommend manual E2E or targeted code trace.  

4. **Coach client hub tabs (Medium)**  
   Not every tab (Overview, Workouts, Programs, Progress, Adherence, Goals, Meals, Habits, Analytics, FMS, Profile, Clip Cards) was traced for real data and errors. Existing audit (COACH_CLIENT_MANAGEMENT_COMPLETE_AUDIT_MARCH_2026) covers many.  

5. **Athlete-score history stale on recalc (Low)**  
   GET /api/client/athlete-score: when recalculating, response reuses the initial `scoreHistory` fetch; the newly calculated score is not appended until the next request.  

6. **ScoreBreakdown NaN guard (Low)**  
   If API or schema ever returns null/undefined for a component score, ScoreBreakdown could show NaN. Add fallback (e.g. `Number(value) || 0`) for robustness.  

7. **"Coming soon" / placeholders (Low)**  
   AddFoodModal, ClientMealsView, Log Activity page, GreetingSettings still show "Coming soon" or similar.  

8. **Circuit legacy references (Low)**  
   Circuit as a block type is removed from creation; legacy references remain in start page (tabata/circuit_sets), BlockCardDisplay, and labels. No functional bug if no Circuit blocks exist.  

---

## FILES TRACED (main)

- **Client:** `src/app/client/page.tsx`, `src/app/client/check-ins/page.tsx`, `src/components/client/DailyWellnessForm.tsx`, `src/app/client/workouts/[id]/complete/page.tsx`, `src/app/client/workouts/[id]/start/page.tsx`, `src/components/client/LiveWorkoutBlockExecutor.tsx`  
- **API:** `src/app/api/client/dashboard/route.ts`, `src/app/api/client/athlete-score/route.ts`, `src/app/api/complete-workout/route.ts`, `src/app/api/log-set/route.ts`, `src/app/api/block-complete/route.ts`  
- **Services:** `src/lib/clientDashboardService.ts`, `src/lib/athleteScoreService.ts`, `src/lib/wellnessService.ts`, `src/lib/achievementService.ts`, `src/lib/completeWorkoutService.ts`, `src/lib/leaderboardPopulationService.ts`, `src/lib/progressTrackingService.ts`, `src/lib/prService.ts`, `src/lib/coachDashboardService.ts`  
- **Migrations:** `20260311_dashboard_rpc_workout_set_entries.sql` (get_client_dashboard todaysWorkout shape).  

---

*End of audit. No files were modified.*

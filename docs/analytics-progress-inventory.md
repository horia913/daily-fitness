# Analytics & Progress – Full App Inventory

**Purpose:** Complete inventory of every route and component that shows or drives analytics, progress, compliance, reports, export, or share. Status = `mock data` | `wrong query` | `missing tracking` | `OK`.

**Scope:** Coach + Client; all stats, charts, compliance, progress, achievements, PRs, habits, nutrition adherence, goals, dashboards, reports, export/share.

---

## 1. Page routes (src/app)

### Coach

| Route | Description | Status | Notes |
|-------|--------------|--------|--------|
| `coach/analytics/page.tsx` | Analytics Reporting (Overview, Client Progress, Compliance tabs) | mock data, wrong query | OptimizedAnalyticsReporting: mock initial state; totalWorkouts/totalMeals/engagement from wrong sources |
| `coach/progress/page.tsx` | Coach progress hub – client list, sparklines, client detail | mock data, wrong query | duration_minutes, meal_logs; generateSparklineData random; getAnalyticsData mock |
| `coach/compliance/page.tsx` | Compliance dashboard | mock data, wrong query | OptimizedComplianceDashboard / OptimizedComplianceAnalytics: random compliance, workout_sessions |
| `coach/reports/page.tsx` | Reports Studio – export/share UI | mock data | OptimizedDetailedReports: John Smith / Maria Johnson / David Kim mock clients |
| `coach/adherence/page.tsx` | Adherence view | missing tracking / wrong query | May use assignments vs workout_logs |
| `coach/clients/[id]/page.tsx` | Client detail | mock data | Mock client data comment |
| `coach/clients/[id]/progress/page.tsx` | Per-client progress | missing tracking / wrong query | Depends on shared progress data layer |
| `coach/clients/[id]/analytics/page.tsx` | Per-client analytics | missing tracking / wrong query | ClientAnalyticsView |
| `coach/clients/[id]/adherence/page.tsx` | Per-client adherence | missing tracking | Same adherence/compliance sources |
| `coach/goals/page.tsx` | Goals management | wrong query | References meal_logs (daily avg) in template source |
| `coach/habits/page.tsx` | Habits management + analytics | mock data | generateMockUserHabits, generateMockHabitEntries, Math.random |
| `coach/page.tsx` | Coach dashboard | OK / partial | Uses coach dashboard RPC; may show stats from RPC |
| `coach/page_redesigned.tsx` | Coach dashboard (redesign) | OK / partial | Same as above |
| `coach/page_new.tsx` | Coach dashboard (new) | OK / partial | Same as above |

### Client

| Route | Description | Status | Notes |
|-------|--------------|--------|--------|
| `client/progress/page.tsx` | Client progress hub | OK | Uses getProgressStats (progressStatsService) – workout_logs, body_metrics, goals, etc. |
| `client/progress/analytics/page.tsx` | Client analytics (workout frequency, strength, body comp, goals) | missing tracking / wrong query | loadAnalyticsData from supabase; verify tables/columns |
| `client/progress/achievements/page.tsx` | Client achievements | OK / verify | achievements table |
| `client/progress/body-metrics/page.tsx` | Body metrics | OK / verify | body_metrics |
| `client/progress/goals/page.tsx` | Client goals | wrong query / mock | Math.random for habit progress; hardcoded fallback presets |
| `client/progress/leaderboard/page.tsx` | Leaderboard | OK / verify | leaderboardService |
| `client/progress/mobility/page.tsx` | Mobility | OK / verify | May have progress tracking |
| `client/progress/nutrition/page.tsx` | Nutrition progress | missing tracking | meal_completions if used |
| `client/progress/performance/page.tsx` | Performance | missing tracking | PRs, workout stats |
| `client/progress/personal-records/page.tsx` | Personal records | OK / verify | personal_records |
| `client/progress/workout-logs/page.tsx` | Workout logs list | OK / verify | workout_logs |
| `client/progress/workout-logs/[id]/page.tsx` | Single workout log | OK / verify | workout_logs |
| `client/page.tsx` | Client dashboard | OK / partial | Uses client dashboard RPC (weeklyProgress, weeklyStats, etc.) |

### API routes used by analytics/progress

| Route | Description | Status | Notes |
|-------|--------------|--------|--------|
| `api/client/dashboard/route.ts` | Client dashboard RPC | OK | get_client_dashboard |
| `api/coach/dashboard/route.ts` | Coach dashboard RPC | OK | get_coach_dashboard |
| `api/client/workouts/summary/route.ts` | Workout summary (weeklyProgress, weeklyStats) | verify | workout_sessions vs workout_logs |
| `api/complete-workout/route.ts` | Complete workout (writes workout_logs) | OK | total_duration_minutes used |

---

## 2. Components (analytics / progress / compliance / report / export / metrics / stats / dashboard)

### Coach

| Component | Used by | Status | Notes |
|-----------|---------|--------|--------|
| `OptimizedAnalyticsReporting.tsx` | coach/analytics | mock data, wrong query | Mock initial state; fetchAnalyticsData incomplete; Math.random progress |
| `OptimizedAnalyticsOverview.tsx` | coach/analytics (tab) | wrong query, missing tracking | totalWorkouts from assignments; client.id vs client_id; TODOs |
| `OptimizedClientProgress.tsx` | coach/analytics (tab) | mock data, wrong query | duration_minutes; meal_logs; placeholder images; hardcoded weight/bodyFat/strength |
| `OptimizedComplianceAnalytics.tsx` | coach/analytics (tab), compliance | mock data, wrong query | workout_sessions; Math.random compliance; weeklyTrend hardcoded |
| `OptimizedComplianceDashboard.tsx` | coach/compliance | mock data | Random compliance/engagement (workout_sessions, nutrition_logs, etc.) |
| `OptimizedDetailedReports.tsx` | coach/reports | mock data | John Smith / Maria Johnson / David Kim; hardcoded metrics |
| `OptimizedNutritionAssignments.tsx` | nutrition/meal flow | mock data | completed_days, streak_days, average_calories Math.random |
| `OptimizedWorkoutTemplates.tsx` | coach/workouts/templates | mock data | usageCount, rating, lastUsed Math.random |
| `ClientComplianceDashboard.tsx` | (coach/client compliance) | wrong query / mock | workout_sessions; engagement 0 or mock |
| `ClientComplianceDetail.tsx` | Compliance detail | wrong query | workout_sessions: 0 |
| `ComplianceSummaryWidget.tsx` | Dashboard widget | missing tracking | Depends on compliance data source |
| `ComplianceSnapshot.tsx` | Snapshot | missing tracking | Same |
| `ReportGenerator.tsx` | Reports | mock / missing | Depends on OptimizedDetailedReports data |
| `ReportPreview.tsx` | Reports | mock / missing | Same |
| `ReportTemplateSelector.tsx` | Reports | OK (UI) | Template selection only |
| `ClientAnalyticsView.tsx` | coach/clients/[id]/analytics | missing tracking / wrong query | Per-client analytics |
| `ClientProgressView.tsx` | coach/clients/[id]/progress | missing tracking | Per-client progress |
| `AnalyticsChart.tsx` | Charts | OK (presentation) | Data from parent |
| `CoachDashboardHeader.tsx` | Coach dashboard | OK (UI) | |
| `DashboardWrapper.tsx` (hybrid) | Dashboard | verify | Client list / stats |

### Client / shared

| Component | Used by | Status | Notes |
|-----------|---------|--------|--------|
| `WorkoutAnalytics.tsx` (progress) | client progress | OK | total_duration_minutes, completed_at from workout_logs |
| `LifestyleAnalytics.tsx` | client progress | verify | Data source |
| `HabitAnalytics.tsx` | habits | verify | habit_logs |
| `SummaryAnalytics.tsx` | Summary | verify | Data source |
| `ProgressPhotos.tsx` | client progress | placeholder / missing | Placeholder or real table |
| `ClientComplianceDashboard.tsx` | client (if used) | wrong query / mock | workout_sessions |
| `ClientComplianceDetail.tsx` | client (if used) | wrong query | workout_sessions: 0 |
| `EnhancedClientWorkouts.tsx` | client workouts | wrong query / mock | duration_minutes alias; Math.random message |
| `ProgressCircles.tsx` | client | OK (presentation) | Data from parent |
| `progress-indicator.tsx` / `progress.tsx` | UI only | OK | |

---

## 3. Services / libs used by analytics or progress

| File | Purpose | Status | Notes |
|------|---------|--------|--------|
| `progressStatsService.ts` | Client progress stats (hub) | OK | workout_logs, body_metrics, goals, achievements, personalRecords, streak |
| `programService.ts` | Weekly goal, streak, etc. | wrong query / placeholder | clientWeeklyGoal = 0 placeholder |
| `clientCompliance.ts` | Compliance scoring | wrong query | workout_sessions in interface; mock engagement |
| `goalSyncService.ts` | Goal sync | wrong query | workout_sessions, meal_logs |
| `useWorkoutSummary.ts` | Workout summary hook | wrong query | workout_sessions (multiple) |
| `useNutritionData.ts` | Nutrition data | wrong query | meal_logs |
| `useGreetingPreferences.ts` | Greeting / streak | wrong query | workout_sessions |
| `workoutTemplateService.ts` | Template usage stats, getProgramProgress | wrong query / verify | duration_minutes in log mapping; getTemplateUsageStats |
| `personalRecords.ts` | PRs | OK | workout_logs, no workout_sessions |
| `achievementService.ts` | Achievements | N+1 risk | templates.map(async) in progressPromises |
| `prefetch.ts` | Prefetch | OK | meal_logs disabled, meal plan system |

---

## 4. Summary by status

- **mock data:** Coach analytics/reporting, coach progress (sparkline, trend, engagement), coach compliance (all random), coach reports (John Smith etc.), coach habits (mock habits/entries), coach nutrition assignments (mock compliance), coach workout templates (usage/rating), client goals (Math.random progress), OptimizedClientProgress (weight/bodyFat/strength/placeholder images), EnhancedClientWorkouts (random message).
- **wrong query:** duration_minutes (use total_duration_minutes); meal_logs (use meal_completions); workout_sessions for “completed workout” (use workout_logs where appropriate); client.id vs client_id for filtering logs/metrics; coach goals page “meal_logs (daily avg)”.
- **missing tracking:** Many TODOs in OptimizedAnalyticsOverview; compliance formulas not wired to meal_completions/habit_logs; per-client analytics/progress views; export/share not using shared metrics.
- **OK / verify:** Client progress hub (progressStatsService), client dashboard RPC, coach dashboard RPC, WorkoutAnalytics (progress), personalRecords, complete-workout API; client progress subpages (achievements, body-metrics, personal-records, workout-logs) need verification against metric contract.

---

**Next:** Use this inventory with `docs/analytics-progress-audit.md` (red-flag locations) and `docs/metric-contract.md` (canonical definitions) for implementation.

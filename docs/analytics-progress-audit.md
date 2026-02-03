# Analytics & Progress – Red-Flag Audit

**Purpose:** Codebase-wide checklist of red flags with file paths and line numbers. Zero tolerance after implementation: no mock/random, no wrong columns/tables, no N+1 in analytics/progress paths.

---

## 1. duration_minutes (should be total_duration_minutes in workout_logs)

**Rule:** Table `workout_logs` has `total_duration_minutes`, not `duration_minutes`. Any select/insert/update for workout_logs must use `total_duration_minutes`.

| File | Line(s) | Context |
|------|---------|--------|
| `src/app/coach/progress/page.tsx` | 390 | getClientProgressData selects duration_minutes from workout_logs |
| `src/components/coach/OptimizedClientProgress.tsx` | 305, 319–323 | Select/display duration_minutes; should be total_duration_minutes |
| `src/components/client/EnhancedClientWorkouts.tsx` | 704, 914, 922, 1023, 1037 | estimatedDuration, total_duration_minutes (some OK); duration_minutes alias at 1037 |
| `src/app/client/workouts/[id]/complete/page.tsx` | 320, 339, 344–345 | duration_minutes in payload/display – verify source is total_duration_minutes |
| `src/app/api/complete-workout/route.ts` | 16, 23, 113–117, 132, 342 | Body param duration_minutes; writes total_duration_minutes (OK); confirm no read of duration_minutes from DB |
| `src/lib/workoutTemplateService.ts` | 227, 1724, 1835 | Interface/log mapping duration_minutes – ensure DB column is total_duration_minutes |
| `src/app/client/page.tsx` | 40 | Type duration_minutes – align with API/RPC |
| `src/app/client/scheduling/page.tsx` | 515, 529 | Session duration (sessions table, not workout_logs) – OK if sessions schema has duration_minutes |
| `src/app/coach/scheduling/page.tsx` | 117, 164, 420, 756, 1021, 1025 | Session type duration_minutes – sessions, not workout_logs |
| `src/app/coach/sessions/page.tsx` | 43, 81, 190, 256, 511, 618–619, 690–691 | Session duration_minutes – sessions |
| `src/components/coach/TodaySchedule.tsx` | 15, 61, 175, 186, 196, 206, 328, 331 | Session duration_minutes – sessions |

**Note:** `hr_duration_minutes` / `hr_work_duration_minutes` / `hr_rest_duration_minutes` in WorkoutTemplateForm, programProgressionService, workout_block_exercises are **not** workout_logs; they are template/protocol fields. Leave as-is unless schema says otherwise.

---

## 2. meal_logs (table does not exist; use meal_completions)

**Rule:** No `meal_logs` table. Use `meal_completions` (client_id, meal_id, completed_at).

| File | Line(s) | Context |
|------|---------|--------|
| `src/app/coach/progress/page.tsx` | 413 | .from('meal_logs') – replace with meal_completions |
| `src/components/coach/OptimizedClientProgress.tsx` | 332 | .from('meal_logs') – replace with meal_completions |
| `src/app/coach/goals/page.tsx` | 76 | Label source: 'meal_logs (daily avg)' – change to meal_completions and document |
| `src/lib/goalSyncService.ts` | 458 | .from('meal_logs') – replace with meal_completions |
| `src/hooks/useNutritionData.ts` | 170 | .from('meal_logs') – replace with meal_completions |
| `src/lib/prefetch.ts` | 253 | Comment: DISABLED meal_logs – OK (no code path) |

---

## 3. Math.random (for analytics/progress/compliance data)

**Rule:** No Math.random for any metric, compliance, trend, or progress value shown to user.

| File | Line(s) | Context |
|------|---------|--------|
| `src/app/coach/progress/page.tsx` | 325 | generateSparklineData: data.push(Math.floor(Math.random() * 5) + 1) |
| `src/app/coach/habits/page.tsx` | 690, 698–699, 714–715 | Mock habit dates, current/longest streak, completion, value |
| `src/app/client/goals/page.tsx` | 370 | progressPercentage = Math.random() * 100 (placeholder habit tracking) |
| `src/components/client/EnhancedClientWorkouts.tsx` | 1324 | messages[Math.floor(Math.random() * messages.length)] (encouragement message) |
| `src/components/coach/OptimizedComplianceAnalytics.tsx` | 234–240 | overallCompliance, workout/nutrition/habit compliance, lastActivity, streakDays, missedDays |
| `src/components/coach/OptimizedComplianceDashboard.tsx` | 145–150, 160–167 | workout_compliance, nutrition_compliance, habit_compliance, session_attendance, overall, engagement_score; app_logins, workout_sessions, nutrition_logs, habit_completions, messages_sent, progress_updates, session_duration |
| `src/components/coach/OptimizedNutritionAssignments.tsx` | 172–177 | completed_days, last_logged, streak_days, average_calories, average_protein |
| `src/components/coach/OptimizedWorkoutTemplates.tsx` | 141–143 | usageCount, rating, lastUsed |
| `src/components/coach/OptimizedAnalyticsReporting.tsx` | 237 | progress: Math.floor(Math.random() * 40) + 60 |
| `src/app/coach/clients/add/page.tsx` | 207 | Password generation (not analytics) – OK to keep or move to util |
| `src/components/client/LiveWorkoutBlockExecutor.tsx` | 240 | requestId (non-display) – OK |
| `src/components/progress/MobilityFormFields.tsx` | 59 | temp id for upload – OK |

---

## 4. Placeholder images (/placeholder-*.jpg or similar)

**Rule:** No placeholder image URLs for progress/photos in analytics/progress flows.

| File | Line(s) | Context |
|------|---------|--------|
| `src/components/coach/OptimizedClientProgress.tsx` | 420, 427 | url: '/placeholder-before.jpg', '/placeholder-after.jpg' |

---

## 5. Hardcoded arrays (client progress, achievements, compliance, trends)

**Rule:** No hardcoded demo client lists or metric arrays for analytics/progress/reports.

| File | Line(s) | Context |
|------|---------|--------|
| `src/components/coach/OptimizedDetailedReports.tsx` | 108–150+ | Mock clients (John Smith, Maria Johnson, David Kim) with hardcoded metrics |
| `src/components/coach/OptimizedAnalyticsReporting.tsx` | 109–199 (approx) | Initial state: totalClients 24, clientProgress with fake names, workoutTypes, engagementMetrics, achievements |
| `src/app/coach/habits/page.tsx` | 673–715, 852–861 | generateMockUserHabits, generateMockHabitEntries; setUserHabits(mockUserHabits) |
| `src/app/coach/progress/page.tsx` | 322, 493 | generateSparklineData mock; getAnalyticsData trendData/programEffectiveness/engagementMetrics/retentionData mock |
| `src/components/coach/OptimizedComplianceAnalytics.tsx` | 213–219 | weeklyTrend hardcoded (Week 1–4, fixed percentages) |
| `src/lib/clientCompliance.ts` | 174–183 | engagement defaults (workout_sessions: 10 etc.) |
| `src/components/ClientComplianceDashboard.tsx` | 148 | workout_sessions: 0 |
| `src/components/ClientComplianceDetail.tsx` | 132 | workout_sessions: 0 |
| `src/app/client/goals/page.tsx` | 492–493 | Fallback to hardcoded presets if no templates in DB |

---

## 6. Incorrect client id: clients.id vs clients.client_id

**Rule:** For joining to workout_logs, body_metrics, goals, etc., use `client_id` (user UUID). For routing/UI (e.g. `/coach/clients/[id]`), use `clients.id` (row PK). Filtering workout_assignments by “client” must use the same id as stored in assignment (workout_assignments.client_id is typically user id; confirm schema).

| File | Line(s) | Context |
|------|---------|--------|
| `src/components/coach/OptimizedAnalyticsOverview.tsx` | 235, 247 | clientWorkouts filter w.client_id === client.id – if client is from clients table, use client.client_id for comparison with workout_assignments.client_id |
| `src/components/coach/OptimizedComplianceAnalytics.tsx` | 225 | id: client.id – ensure consistency with data queries (client_id for logs) |
| `src/components/coach/OptimizedComplianceDashboard.tsx` | 100, 235, 442 | clientId = client.id; selectedClient !== client.client.id – mixed id vs client_id |
| `src/components/coach/OptimizedClientProgress.tsx` | 208, 560 | id: client.id – document whether parent passes row id or user id |
| `src/components/coach/OptimizedAnalyticsReporting.tsx` | 233 | clientId: client.id – same |
| `src/app/coach/progress/page.tsx` | 374, 838, 1025, 1096, 1183 | client.id for selection/display – use client.id for route/link; use client.client_id for any query to workout_logs/body_metrics etc. |

**Action:** Document in metric contract and inventory: “list from clients returns both id and client_id; use client_id for all metric queries.”

---

## 7. N+1: query per client (or per item) in a loop

**Rule:** No .map(async) or for-loop with await that runs a query per element for analytics/progress.

| File | Line(s) | Context |
|------|---------|--------|
| `src/lib/achievementService.ts` | 182 | templates.map(async (template) => ...) – batch by template ids or single query |
| `src/components/coach/OptimizedComplianceDashboard.tsx` | 99 | (clientsData || []).map(async (client) => ...) – replace with batched fetch then map in JS |
| `src/components/coach/OptimizedWorkoutTemplates.tsx` | 134 | (data || []).map(async (template) => ...) – batch template stats |
| `src/components/ClientComplianceDashboard.tsx` | 86 | (clientsData || []).map(async (client) => ...) – same as ComplianceDashboard |
| `src/app/client/sessions/page.tsx` | 290 | sessionsData.map(async (session) => ...) – batch session enrichment |
| `src/app/coach/nutrition/page.tsx` | 218 | mealPlansData.map(async (plan) => ...) – batch |
| `src/app/coach/categories/page.tsx` | 91 | (data || []).map(async (category) => ...) – batch |
| `src/app/coach/exercise-categories/page.tsx` | 74 | (data || []).map(async (category) => ...) – batch |
| `src/components/coach/client-views/ClientHabitsView.tsx` | 96 | assignments.map(async (assignment) => ...) – batch |
| `src/app/client/habits/page.tsx` | 104 | assignments.map(async (assignment) => ...) – batch |
| `src/lib/clientProgressionService.ts` | 362 | exerciseIds.map(async (exerciseId) => ...) – batch by exercise IDs |

**Note:** File uploads (MobilityFormFields, FMS) and non-analytics flows can stay as-is; focus on analytics/progress/compliance data paths.

---

## 8. workout_sessions used for “completed workout” or compliance

**Rule:** For “completed workout” counts and compliance, prefer `workout_logs` (completed_at not null). workout_sessions is for in-progress/session state; completion is recorded in workout_logs.

| File | Line(s) | Context |
|------|---------|--------|
| `src/components/coach/OptimizedComplianceAnalytics.tsx` | 160 | .from('workout_sessions') – switch to workout_logs for completion/compliance |
| `src/components/coach/OptimizedClientProgress.tsx` | 249 | .from('workout_sessions') – use workout_logs for completed activities |
| `src/lib/clientCompliance.ts` | 23, 174, 456 | engagement.workout_sessions – define from workout_logs count |
| `src/components/coach/OptimizedComplianceDashboard.tsx` | 161, 627 | workout_sessions random then display – use workout_logs |
| `src/components/ClientComplianceDetail.tsx` | 132, 534 | workout_sessions: 0 / display – use workout_logs |
| `src/components/ClientComplianceDashboard.tsx` | 148, 507 | workout_sessions: 0 / display – use workout_logs |
| `src/hooks/useWorkoutSummary.ts` | 150, 196, 368, 387 | .from('workout_sessions') – if summary is “completed” workouts, use workout_logs |
| `src/app/client/progress/page_new.tsx` | 70 | .from('workout_sessions') – confirm intent; if progress, prefer workout_logs |
| `src/lib/goalSyncService.ts` | 337 | workout_sessions – confirm; if completion count, use workout_logs |

**Exception:** Live workout flow (start page, complete-workout API) correctly uses workout_sessions for session status; keep those. Only analytics/compliance/reporting should use workout_logs for “completed” counts.

---

## Post-implementation checklist

After fixes:

- [ ] Grep `duration_minutes` in context of workout_logs: 0 results (or only in comments).
- [ ] Grep `meal_logs`: 0 results (or only in comments / “use meal_completions instead”).
- [ ] Grep `Math.random` in analytics/progress/compliance/report components: 0 results.
- [ ] Grep `placeholder.*\.(jpg|png|webp)` and `/placeholder-`: 0 in progress/analytics components.
- [ ] No hardcoded client arrays (John Smith etc.) in report/analytics components.
- [ ] client_id used for all metric queries; client.id only for routes/links where documented.
- [ ] No N+1 in analytics/progress paths (no .map(async) with DB calls in those files).
- [ ] Compliance and “completed workout” metrics use workout_logs (and meal_completions, habit_logs), not workout_sessions for counts.

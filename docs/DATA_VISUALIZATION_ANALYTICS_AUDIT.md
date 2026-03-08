# Data Visualization, Analytics, Progress Tracking & PR Screens Audit

**Date:** 2026-02-17  
**Purpose:** Complete understanding of all analytics, charts, personal records, trends, and progress visualization before building the data visualization layer.

---

## EXECUTIVE SUMMARY

### Chart Infrastructure
- **No external charting library** (no recharts, chart.js, d3, victory, nivo found)
- **Custom SVG-based charts** using inline SVG elements
- **CSS-based bar/line charts** using flexbox and gradients
- **SimpleCharts.tsx** and **ChartsAndGraphs.tsx** provide reusable chart components (but ChartsAndGraphs uses mock data)

### Personal Records System
- **Automatic detection** from `workout_set_logs` table
- **No manual entry** — PRs are computed from workout logs
- **Service:** `src/lib/personalRecords.ts` — `fetchPersonalRecords()`
- **Detection logic:** Finds max weight and max reps per exercise from all historical set logs
- **PR Page:** `/client/progress/personal-records` — shows PRs grouped by exercise, filterable

### Database Tables for Performance Data
- **`workout_logs`** — workout sessions (completed_at, total_duration_minutes, total_sets_completed, total_reps_completed, total_weight_lifted)
- **`workout_set_logs`** — individual sets (exercise_id, weight, reps, completed_at, notes)
- **`body_metrics`** — body composition (weight_kg, body_fat_percentage, waist_circumference, plus 8 circumference measurements)
- **`personal_records`** — **DOES NOT EXIST** — PRs are computed on-the-fly from workout_set_logs
- **`performance_tests`** — 1km run and step test results (time_seconds, recovery_score)
- **`daily_wellness_logs`** — check-ins (energy, stress, soreness, sleep, mood)
- **`goals`** — client goals with progress_percentage
- **`achievements`** — achievement unlocks

### Analytics Computation
- **On-the-fly calculation** — no pre-computed analytics tables
- **Services:** `src/lib/metrics.ts` (getTotalWorkouts, getTotalMeals, getPersonalRecordsCount, etc.)
- **Client-side aggregation** from raw logs
- **No server-side aggregation** or materialized views

---

## CLIENT-SIDE ANALYTICS & PROGRESS PAGES

### 1. `/client/progress/analytics` — Analytics Overview Page
**File:** `src/app/client/progress/analytics/page.tsx`  
**Purpose:** Main analytics dashboard for clients showing workout frequency, strength progress, body composition, and goal completion.

**Charts/Visualizations:**
- ✅ **Workout Frequency Chart** (bar chart) — Last 5 weeks, custom SVG bars
  - Data source: `workout_logs.completed_at`
  - Real data: YES
- ✅ **Strength Progress Charts** (bar charts) — Top 2 exercises by % weight increase
  - Data source: `workout_set_logs` grouped by exercise, max weight per day
  - Real data: YES
  - Shows: Weight progression over time, % increase from first to highest
- ✅ **Body Composition Chart** (bar chart) — Weight and body fat trends
  - Data source: `body_metrics.weight_kg`, `body_metrics.body_fat_percentage`
  - Real data: YES
  - Time range: Last 30 entries
- ✅ **Goal Completion** (progress bar) — % of goals completed
  - Data source: `goals.status`
  - Real data: YES
- ✅ **Exercise Progression Modal** — Search and view progression for any exercise
  - Data source: `workout_set_logs` filtered by exercise name
  - Real data: YES
  - Shows: Max weight per day over time, % increase

**Data Tables Touched:**
- `workout_logs`
- `workout_set_logs`
- `body_metrics`
- `goals`
- `exercises` (via join)

**Time Ranges:** 7D, 30D, 90D, ALL (UI exists but not fully implemented — defaults to 5 weeks for workout frequency)

---

### 2. `/client/progress/personal-records` — Personal Records Page
**File:** `src/app/client/progress/personal-records/page.tsx`  
**Purpose:** Display all personal records (PRs) grouped by exercise.

**Charts/Visualizations:**
- ❌ **No charts** — list/card view only
- ✅ **PR Summary Hero** — Total PRs count, this month count
- ✅ **Recent PRs Grid** — Last 5 PRs with exercise name, weight, reps, date
- ✅ **Grouped PR List** — Collapsible by exercise, shows all PRs per exercise

**Data Source:**
- Service: `src/lib/personalRecords.ts` → `fetchPersonalRecords()`
- Queries: `workout_logs` → `workout_set_logs` → finds max weight and max reps per exercise
- **Automatic detection** — no manual entry

**Data Tables Touched:**
- `workout_logs`
- `workout_set_logs`
- `exercises` (via join)

**PR Detection Logic:**
1. Groups all set logs by exercise name
2. Finds max weight record per exercise
3. Finds max reps record per exercise (if different from max weight)
4. Creates PR entries for both
5. Marks PRs as "recent" if within last 30 days

**Exercise-Level History:** ✅ YES — can see all PRs per exercise, grouped by exercise name

---

### 3. `/client/progress/performance` — Performance Tests Page
**File:** `src/app/client/progress/performance/page.tsx`  
**Purpose:** Track performance benchmarks (1km run, step test).

**Charts/Visualizations:**
- ✅ **Mini Sparkline** — Last 6 test results (visual trend)
  - Data source: `performance_tests`
  - Real data: YES
- ❌ **No full charts** — table view with trend indicators

**Data Tables Touched:**
- `performance_tests` (test_type: '1km_run' | 'step_test')

**Metrics Tracked:**
- 1km run: `time_seconds`
- Step test: `recovery_score` (BPM)

**Trend Calculation:** Compares latest vs previous test, shows improvement %

---

### 4. `/client/progress/workout-logs` — Workout History Page
**File:** `src/app/client/progress/workout-logs/page.tsx`  
**Purpose:** List all completed workouts with details.

**Charts/Visualizations:**
- ❌ **No charts** — list view only
- ✅ **Monthly Summary Hero** — This month workouts count, volume (kg), total sets
- ✅ **Workout Cards** — Expandable cards showing exercises and sets

**Data Tables Touched:**
- `workout_logs`
- `workout_set_logs`
- `workout_assignments` (for template names)
- `workout_templates` (via assignment)

**Volume Tracking:** ✅ YES — shows total weight lifted per workout, per month

**Exercise-Level History:** ✅ YES — can see all sets per exercise within a workout (but not across workouts)

---

### 5. `/client/progress/body-metrics` — Body Composition Page
**File:** `src/app/client/progress/body-metrics/page.tsx`  
**Purpose:** Track weight, body fat, and body measurements over time.

**Charts/Visualizations:**
- ✅ **Weight Chart** (bar chart) — Weight over time
  - Data source: `body_metrics.weight_kg`
  - Real data: YES
  - Time ranges: 12M, 6M, 1M (UI exists)
- ✅ **Body Fat Chart** (if data exists) — Body fat % over time
  - Data source: `body_metrics.body_fat_percentage`
  - Real data: YES
- ✅ **Comparison View** — Current vs previous month metrics
  - Shows: Weight change, waist change, body fat change

**Data Tables Touched:**
- `body_metrics` (all columns including 8 circumference measurements)

**Time Ranges Available:** 12M, 6M, 1M (UI selector exists)

**Measurements Tracked:**
- Weight (kg)
- Body fat (%)
- Waist circumference
- 8 additional circumference measurements (arms, torso, hips, thighs, calves)

---

### 6. `/client/progress/page.tsx` — Main Progress Hub
**File:** `src/app/client/progress/page.tsx`  
**Purpose:** Hub page linking to all progress sub-pages.

**Charts/Visualizations:**
- ❌ **No charts** — navigation hub only

**Links to:**
- Analytics
- Personal Records
- Performance Tests
- Workout Logs
- Body Metrics
- Nutrition
- Mobility
- Goals
- Achievements
- Leaderboard
- Photos

---

### 7. `/client/progress/workout-logs/[id]` — Individual Workout Detail
**File:** `src/app/client/progress/workout-logs/[id]/page.tsx`  
**Purpose:** Detailed view of a single workout session.

**Charts/Visualizations:**
- ❌ **No charts** — detailed table/list view

**Data Tables Touched:**
- `workout_logs`
- `workout_set_logs`
- `exercises`

**Shows:**
- All sets with exercise, weight, reps
- Workout duration
- Total volume

---

## COACH-SIDE ANALYTICS PAGES

### 8. `/coach/analytics` — Analytics Overview
**File:** `src/app/coach/analytics/page.tsx`  
**Component:** `OptimizedAnalyticsReporting`  
**Purpose:** Coach dashboard showing client progress, engagement metrics, and achievements.

**Charts/Visualizations:**
- ✅ **Client Progress Cards** — Progress bars per client
  - Data source: Goals progress_percentage + workout completion count
  - Real data: YES
- ✅ **Workout Types Pie Chart** (if implemented)
  - Data source: Workout templates/types
  - Status: UNKNOWN — code references it but may not be fully implemented
- ✅ **Engagement Metrics** — Avg session time, sessions per week, goal success rate
  - Data source: `workout_logs`, `goals`
  - Real data: YES
- ✅ **Achievements Feed** — Recent client achievements
  - Data source: `achievements`
  - Real data: YES

**Data Tables Touched:**
- `clients`
- `profiles`
- `workout_logs`
- `goals`
- `achievements`
- Uses `src/lib/metrics.ts` for aggregation

**Tabs:** Overview, Compliance, Progress (uses OptimizedAnalyticsOverview, OptimizedComplianceAnalytics, OptimizedClientProgress)

---

### 9. `/coach/compliance` — Compliance Dashboard
**File:** `src/app/coach/compliance/page.tsx`  
**Component:** `OptimizedComplianceAnalytics`  
**Purpose:** Track client compliance (workout, nutrition, habit adherence).

**Charts/Visualizations:**
- ✅ **Compliance Trends** (line/area charts) — Weekly compliance over time
  - Data source: Workout completion, nutrition logging, habit completion
  - Real data: YES (fetches from Supabase)
- ✅ **Client Compliance List** — Per-client compliance scores
  - Shows: Overall, workout, nutrition, habit compliance %
  - Real data: YES

**Data Tables Touched:**
- `workout_logs`
- `food_log_entries` (nutrition compliance)
- `habit_logs` (habit compliance)
- `clients`

**Client Status:** on_track | at_risk | needs_attention

---

### 10. `/coach/adherence` — Adherence Tracking
**File:** `src/app/coach/adherence/page.tsx`  
**Component:** `OptimizedAdherenceTracking`  
**Purpose:** Track client adherence and identify at-risk clients.

**Charts/Visualizations:**
- ⚠️ **Mock Data** — Component has hardcoded mock data
- ✅ **Adherence Trends** (if real data implemented)
  - Data source: Should use workout_logs, food_log_entries, habit_logs
  - Real data: NO — currently mock data

**Data Tables Touched:**
- Should touch: `workout_logs`, `food_log_entries`, `habit_logs`, `clients`
- Currently: Uses mock data array

**Status:** ⚠️ **PLACEHOLDER** — needs real data implementation

---

### 11. `/coach/progress` — Client Progress Dashboard
**File:** `src/app/coach/progress/page.tsx`  
**Purpose:** Monitor client momentum, streaks, and completion metrics.

**Charts/Visualizations:**
- ✅ **Client Progress Cards** — Per-client progress with adherence %
  - Data source: `workout_logs`, `body_metrics`, `goals`
  - Real data: YES
- ✅ **Workout Stats** — Total sessions, completion rate
  - Data source: `workout_logs`
  - Real data: YES
- ✅ **Wellness Overview** — Check-in stats, energy, stress
  - Data source: `daily_wellness_logs`
  - Real data: YES
- ✅ **Client Detail View** — Expandable per-client analytics
  - Shows: Workout history, strength progression, wellness trends
  - Real data: YES

**Data Tables Touched:**
- `clients`
- `workout_logs`
- `workout_set_logs`
- `body_metrics`
- `daily_wellness_logs`
- `goals`

**Features:**
- Search/filter clients
- Sort by adherence, streak, last workout
- Time range filters (week, month, quarter, year)
- Client detail modal with full analytics

---

### 12. `/coach/reports` — Detailed Reports
**File:** `src/app/coach/reports/page.tsx`  
**Component:** `OptimizedDetailedReports`  
**Purpose:** Build client-ready summaries and performance narratives.

**Charts/Visualizations:**
- ❌ **Unknown** — Component not fully audited
- Likely: Report generation with charts embedded

**Data Tables Touched:**
- Unknown — needs further investigation

---

## CHART COMPONENTS & INFRASTRUCTURE

### 13. `ChartsAndGraphs.tsx` — Reusable Chart Component
**File:** `src/components/progress/ChartsAndGraphs.tsx`  
**Purpose:** Generic chart component supporting line, bar, pie, area charts.

**Features:**
- ✅ Supports: line, bar, pie, area, scatter chart types
- ✅ Time range filters: 1M, 3M, 6M, 1Y, ALL
- ✅ Grid/list view modes
- ✅ Export/share functionality (UI only)
- ⚠️ **Uses mock data** — no real data integration yet
- ✅ Custom SVG rendering (no external library)

**Chart Types:**
- Line charts: SVG polyline
- Bar charts: Flexbox divs with gradients
- Pie charts: Not implemented (UI only)
- Area charts: Not implemented (UI only)

**Status:** ⚠️ **PLACEHOLDER** — component exists but uses mock data

---

### 14. `SimpleCharts.tsx` — Simple Chart Component
**File:** `src/components/progress/SimpleCharts.tsx`  
**Purpose:** Simple bar charts for workout frequency and weight progress.

**Charts:**
- ✅ **Weekly Activity** — Bar chart (flexbox divs)
  - Mock data: YES (hardcoded sample)
- ✅ **Weight Progress** — Bar chart (flexbox divs)
  - Mock data: YES (hardcoded sample)

**Status:** ⚠️ **PLACEHOLDER** — uses hardcoded sample data

---

### 15. `WorkoutAnalytics.tsx` — Workout Analytics Component
**File:** `src/components/progress/WorkoutAnalytics.tsx`  
**Purpose:** Comprehensive workout analytics with streaks, volume, PRs, exercise progress.

**Charts/Visualizations:**
- ✅ **Activity Calendar** — Visual calendar showing workout days
  - Data source: `workout_logs.completed_at`
  - Real data: YES
- ✅ **Recent PRs** — List of recent personal records
  - Data source: `workout_set_logs` (computed)
  - Real data: YES
- ✅ **On The Rise** — Exercises with increasing weight
  - Data source: `workout_set_logs` (computed trends)
  - Real data: YES
- ✅ **Exercise Progress** — Per-exercise progression charts
  - Data source: `workout_set_logs` grouped by exercise
  - Real data: YES
- ✅ **Weekly Volume** — Volume per week chart
  - Data source: `workout_set_logs` (weight × reps × sets)
  - Real data: YES

**Data Tables Touched:**
- `workout_logs`
- `workout_set_logs`
- `exercises`

**Metrics Computed:**
- Streak (consecutive days with workouts)
- Workouts this month/week
- Time spent this month
- Total volume lifted
- Exercise-level progress
- Weekly volume trends

---

### 16. `LifestyleAnalytics.tsx` — Lifestyle Analytics Component
**File:** `src/components/progress/LifestyleAnalytics.tsx`  
**Purpose:** Analytics for habits, wellness, nutrition.

**Status:** ⚠️ **NOT AUDITED** — file exists but not read

---

## DATABASE SCHEMA FOR PERFORMANCE DATA

### `workout_logs` Table
**Columns:**
- `id` (uuid, PK)
- `client_id` (uuid, FK to profiles)
- `workout_assignment_id` (uuid, FK to workout_assignments, nullable)
- `started_at` (timestamp)
- `completed_at` (timestamp, nullable)
- `total_duration_minutes` (integer, nullable)
- `total_sets_completed` (integer, nullable)
- `total_reps_completed` (integer, nullable)
- `total_weight_lifted` (numeric, nullable)

**Purpose:** Tracks workout sessions (when started, completed, duration, totals)

---

### `workout_set_logs` Table
**Columns:**
- `id` (uuid, PK)
- `workout_log_id` (uuid, FK to workout_logs)
- `exercise_id` (uuid, FK to exercises)
- `client_id` (uuid, FK to profiles)
- `weight` (numeric, nullable)
- `reps` (integer, nullable)
- `notes` (text, nullable)
- `completed_at` (timestamp)
- `created_at` (timestamp)

**Purpose:** Individual set data — **CRITICAL for strength charts and PR detection**

**Data Available:**
- Exercise name (via join to `exercises`)
- Weight per set
- Reps per set
- Date/time completed
- Notes

**This is the foundation for:**
- Exercise-level history ("all my bench press sets over time")
- Volume tracking (weight × reps × sets)
- Strength progression charts
- Personal records detection
- 1RM estimates (if calculated)

---

### `body_metrics` Table
**Columns:**
- `id` (uuid, PK)
- `client_id` (uuid, FK to profiles)
- `measured_date` (date)
- `weight_kg` (numeric, nullable)
- `body_fat_percentage` (numeric, nullable)
- `waist_circumference` (numeric, nullable)
- `left_arm_circumference` (numeric, nullable)
- `right_arm_circumference` (numeric, nullable)
- `torso_circumference` (numeric, nullable)
- `hips_circumference` (numeric, nullable)
- `left_thigh_circumference` (numeric, nullable)
- `right_thigh_circumference` (numeric, nullable)
- `left_calf_circumference` (numeric, nullable)
- `right_calf_circumference` (numeric, nullable)

**Purpose:** Body composition tracking — weight, body fat, measurements

---

### `performance_tests` Table
**Columns:**
- `id` (uuid, PK)
- `client_id` (uuid, FK to profiles)
- `test_type` (text) — '1km_run' | 'step_test'
- `tested_at` (timestamp)
- `time_seconds` (integer, nullable) — for 1km run
- `recovery_score` (integer, nullable) — BPM for step test
- `notes` (text, nullable)

**Purpose:** Performance benchmarks (aerobic capacity, recovery)

---

### `personal_records` Table
**Status:** ❌ **DOES NOT EXIST**

**Current Implementation:**
- PRs are computed on-the-fly from `workout_set_logs`
- Service: `src/lib/personalRecords.ts`
- No stored PR table

**Implications:**
- PR detection runs on every page load
- No PR history beyond what's in set logs
- No PR metadata (notes, context, etc.)

---

## SERVICES & HOOKS FOR ANALYTICS

### `src/lib/personalRecords.ts`
**Functions:**
- `fetchPersonalRecords(userId)` — Computes PRs from workout_set_logs
- `formatRecordDisplay(weight, reps)` — Formats PR display string
- `getRecordType(weight, reps)` — Classifies PR as strength/endurance/power

**Computation:**
- Groups set logs by exercise name
- Finds max weight and max reps per exercise
- Creates PR objects with date, weight, reps

---

### `src/lib/metrics.ts`
**Functions (referenced but not fully audited):**
- `getCoachClientIds(coachId, activeOnly)`
- `getTotalWorkouts(clientIds, period)`
- `getTotalMeals(clientIds, period)`
- `getPersonalRecordsCount(clientIds, period)`
- `getSuccessRate(clientIds, period)`
- `getAvgSessionTime(clientIds, period)`
- `getSessionsPerWeek(clientIds, period)`
- `getPeriodBounds(period)`

**Purpose:** Aggregation functions for coach analytics

---

### `src/lib/programService.ts`
**Functions:**
- `getStreak(clientId)` — Calculates workout streak

---

### `src/lib/performanceTestService.ts`
**Functions:**
- `getClientPerformanceTests(clientId, testType)` — Fetches performance test history

---

## ANSWERS TO SPECIFIC QUESTIONS

### 1. What can a client currently see about their performance trends?

**Working Charts/Metrics:**
- ✅ Workout frequency (last 5 weeks) — bar chart
- ✅ Strength progression (top 2 exercises) — bar charts with % increase
- ✅ Body composition (weight, body fat) — bar chart, last 30 entries
- ✅ Goal completion % — progress bar
- ✅ Exercise-level progression (via modal) — bar chart per exercise
- ✅ Personal records list — grouped by exercise
- ✅ Workout history — list view with volume totals
- ✅ Performance tests — table with trend indicators
- ✅ Activity calendar — visual calendar showing workout days
- ✅ Weekly volume — volume per week chart
- ✅ Exercise progress — per-exercise charts

**Missing/Placeholder:**
- ❌ Volume per muscle group
- ❌ 1RM estimates
- ❌ Workout-to-workout comparison
- ❌ Strength progression for all exercises (only top 2 shown)
- ❌ Volume trends over longer periods
- ❌ RPE trends
- ❌ Rest time trends

---

### 2. What SHOULD a client be able to see based on data that exists but has no UI?

**Available Data → Missing UI:**
- ✅ **Exercise-level history** — Data exists in `workout_set_logs`, UI exists in analytics modal but not prominent
- ✅ **Volume tracking** — Data exists (weight × reps), shown in workout logs but no dedicated volume chart
- ✅ **Volume per muscle group** — Exercise categories exist, but no muscle group aggregation
- ✅ **1RM estimates** — Can calculate from weight/reps (Epley/Brzycki), but not shown
- ✅ **RPE trends** — RPE data may exist in set logs, but no trend chart
- ✅ **Rest time trends** — Rest timer data may exist, but no trend chart
- ✅ **Workout duration trends** — `total_duration_minutes` exists, but no trend chart
- ✅ **Body measurement trends** — 8 circumference measurements exist, but only weight/body fat charted
- ✅ **Wellness trends** — `daily_wellness_logs` exists (energy, stress, soreness), but no trend charts
- ✅ **Nutrition trends** — Food logs exist, but no nutrition analytics page
- ✅ **Habit trends** — Habit logs exist, but no habit analytics

---

### 3. How are personal records tracked?

**Answer:** **Automatic detection from workout logs**

**Process:**
1. Client completes workout → sets logged to `workout_set_logs`
2. PR service queries all `workout_set_logs` for client
3. Groups by exercise name
4. Finds max weight and max reps per exercise
5. Creates PR entries (no stored table)
6. Displays on `/client/progress/personal-records`

**No manual entry** — PRs are computed on-the-fly

**Limitations:**
- No PR metadata (notes, context)
- No PR history beyond set logs
- PRs recalculated on every page load
- No PR goals/targets

---

### 4. Is there exercise-level history?

**Answer:** ✅ **YES, but limited**

**Where:**
- `/client/progress/analytics` → "Explore Exercises" modal → shows progression for selected exercise
- `/client/progress/personal-records` → grouped by exercise, shows all PRs per exercise
- `/client/progress/workout-logs/[id]` → shows all sets for a workout (but not across workouts)

**What's Missing:**
- Dedicated "Exercise History" page
- View all sets for an exercise across all workouts
- Volume per exercise over time
- Rep ranges per exercise over time

**Data Available:** ✅ All exercise-level data exists in `workout_set_logs`

---

### 5. Is there volume tracking?

**Answer:** ✅ **YES, but basic**

**Where:**
- `/client/progress/workout-logs` → shows total volume per workout, monthly volume summary
- `WorkoutAnalytics.tsx` → shows weekly volume chart

**What's Tracked:**
- Total volume per workout (weight × reps × sets)
- Monthly volume total
- Weekly volume trends

**What's Missing:**
- Volume per muscle group
- Volume per exercise over time
- Volume intensity zones (low/medium/high)
- Volume vs strength correlation

**Data Available:** ✅ Volume can be calculated from `workout_set_logs` (weight × reps)

---

### 6. What is the set_logs / workout set data structure?

**Answer:** **`workout_set_logs` table**

**Structure:**
```typescript
{
  id: uuid
  workout_log_id: uuid (FK to workout_logs)
  exercise_id: uuid (FK to exercises)
  client_id: uuid (FK to profiles)
  weight: numeric (nullable) — weight in kg
  reps: integer (nullable) — number of reps
  notes: text (nullable) — set notes
  completed_at: timestamp — when set was completed
  created_at: timestamp
}
```

**Joins:**
- `exercises` → exercise name, category
- `workout_logs` → workout session info

**This is CRITICAL for:**
- Strength charts (weight over time per exercise)
- Volume calculations (weight × reps)
- PR detection (max weight/reps)
- Exercise-level history
- 1RM estimates

**Missing Fields (that would be useful):**
- RPE (rate of perceived exertion) — may exist elsewhere
- Rest time — may exist elsewhere
- Tempo (eccentric/concentric timing)
- Set type (warmup, working, drop set, etc.)

---

### 7. Are there any computed/aggregated analytics tables?

**Answer:** ❌ **NO**

**Current Approach:**
- All analytics computed on-the-fly from raw logs
- Uses `src/lib/metrics.ts` for aggregation functions
- No materialized views or pre-computed tables

**Implications:**
- Slower queries as data grows
- No historical snapshots
- No pre-aggregated metrics

**Potential Optimization:**
- Create materialized views for common queries
- Pre-compute daily/weekly/monthly aggregates
- Cache PRs in a `personal_records` table

---

### 8. What data visualization features are completely missing?

**Missing Features:**
1. ❌ **1RM Estimates** — Can calculate from weight/reps, but not shown
2. ❌ **Volume per Muscle Group** — Exercise categories exist, but no aggregation
3. ❌ **RPE Trends** — RPE data may exist, but no trend charts
4. ❌ **Rest Time Trends** — Rest timer data may exist, but no trends
5. ❌ **Workout Duration Trends** — Duration exists, but no trend chart
6. ❌ **Body Measurement Trends** — 8 circumference measurements exist, but only weight/body fat charted
7. ❌ **Wellness Trends** — Energy, stress, soreness data exists, but no trend charts
8. ❌ **Nutrition Trends** — Food logs exist, but no nutrition analytics
9. ❌ **Habit Trends** — Habit logs exist, but no habit analytics
10. ❌ **Workout-to-Workout Comparison** — Can compare sessions, but no UI
11. ❌ **Strength Standards** — No comparison to population norms
12. ❌ **Volume Intensity Zones** — No low/medium/high volume classification
13. ❌ **Exercise-Specific Volume Trends** — Volume per exercise over time
14. ❌ **Rep Range Analysis** — Distribution of rep ranges per exercise
15. ❌ **Progression Rate** — Rate of strength/volume increase over time

---

### 9. Are there any charts that exist but show fake/placeholder data?

**Answer:** ✅ **YES**

**Placeholder Charts:**
1. ⚠️ **`ChartsAndGraphs.tsx`** — Uses mock data (hardcoded sample charts)
2. ⚠️ **`SimpleCharts.tsx`** — Uses hardcoded sample data
3. ⚠️ **`OptimizedAdherenceTracking`** — Uses mock data array (hardcoded client data)

**Real Data Charts:**
- ✅ `/client/progress/analytics` — Real data
- ✅ `/client/progress/personal-records` — Real data
- ✅ `/client/progress/body-metrics` — Real data
- ✅ `/client/progress/workout-logs` — Real data
- ✅ `/coach/analytics` — Real data
- ✅ `/coach/compliance` — Real data
- ✅ `/coach/progress` — Real data
- ✅ `WorkoutAnalytics.tsx` — Real data

---

### 10. How does the leaderboard work?

**Answer:** ⚠️ **NOT AUDITED**

**File:** `src/app/client/progress/leaderboard/page.tsx`  
**Status:** File exists but not read during audit

**Likely Implementation:**
- Compares clients on metrics (workouts completed, PRs, streaks)
- May use `athlete_scores` table
- May aggregate from `workout_logs`, `achievements`

**Needs Investigation:** ✅ YES

---

## COMPLETE FILE TREE

### Client Progress Pages
```
src/app/client/progress/
├── page.tsx (hub)
├── analytics/page.tsx ✅ (real charts)
├── personal-records/page.tsx ✅ (real data, no charts)
├── performance/page.tsx ✅ (real data, mini sparkline)
├── workout-logs/
│   ├── page.tsx ✅ (real data, no charts)
│   └── [id]/page.tsx ✅ (real data, no charts)
├── body-metrics/page.tsx ✅ (real charts)
├── nutrition/page.tsx ⚠️ (not audited)
├── mobility/page.tsx ⚠️ (not audited)
├── leaderboard/page.tsx ⚠️ (not audited)
├── achievements/page.tsx ⚠️ (not audited)
├── goals/page.tsx ⚠️ (not audited)
└── photos/page.tsx ⚠️ (not audited)
```

### Coach Analytics Pages
```
src/app/coach/
├── analytics/page.tsx ✅ (real data)
├── compliance/page.tsx ✅ (real data)
├── adherence/page.tsx ⚠️ (mock data)
├── progress/page.tsx ✅ (real data)
└── reports/page.tsx ⚠️ (not fully audited)
```

### Chart Components
```
src/components/
├── progress/
│   ├── ChartsAndGraphs.tsx ⚠️ (mock data)
│   ├── SimpleCharts.tsx ⚠️ (mock data)
│   ├── WorkoutAnalytics.tsx ✅ (real data)
│   └── LifestyleAnalytics.tsx ⚠️ (not audited)
└── coach/
    ├── OptimizedAnalyticsReporting.tsx ✅ (real data)
    ├── OptimizedComplianceAnalytics.tsx ✅ (real data)
    ├── OptimizedAdherenceTracking.tsx ⚠️ (mock data)
    ├── OptimizedClientProgress.tsx ✅ (real data)
    ├── AnalyticsChart.tsx ⚠️ (not audited)
    └── AdherenceTrendChart.tsx ⚠️ (not audited)
```

### Services
```
src/lib/
├── personalRecords.ts ✅ (PR detection)
├── metrics.ts ✅ (aggregation functions)
├── programService.ts ✅ (streak calculation)
├── performanceTestService.ts ✅ (performance tests)
└── coachDashboardService.ts ⚠️ (not fully audited)
```

---

## SUMMARY STATISTICS

### Charts with Real Data: **8**
- Client analytics (4 charts)
- Body metrics (2 charts)
- Workout analytics (5+ metrics)
- Coach analytics (multiple)

### Charts with Mock/Placeholder Data: **3**
- ChartsAndGraphs.tsx
- SimpleCharts.tsx
- OptimizedAdherenceTracking

### Pages with No Charts: **5**
- Personal records (list only)
- Workout logs (list only)
- Workout detail (table only)
- Performance tests (table only)
- Progress hub (navigation only)

### Missing Features: **15+**
- 1RM estimates
- Volume per muscle group
- RPE trends
- Rest time trends
- Workout duration trends
- Body measurement trends (8 measurements)
- Wellness trends
- Nutrition trends
- Habit trends
- Workout-to-workout comparison
- Strength standards
- Volume intensity zones
- Exercise-specific volume trends
- Rep range analysis
- Progression rate

---

## RECOMMENDATIONS FOR DATA VISUALIZATION LAYER

1. **Use existing custom SVG approach** — No need for external charting library
2. **Implement missing trend charts** — Wellness, nutrition, habits, body measurements
3. **Add 1RM estimates** — Calculate from weight/reps using Epley/Brzycki formulas
4. **Create volume analytics** — Per muscle group, per exercise, intensity zones
5. **Fix placeholder components** — Replace mock data with real data
6. **Add exercise-level history page** — Dedicated page for "all my bench press sets"
7. **Implement PR table** — Store PRs instead of computing on-the-fly
8. **Add comparison views** — Workout-to-workout, month-to-month, start vs current
9. **Create materialized views** — Pre-compute common aggregations for performance
10. **Add export functionality** — PDF/CSV export for charts (UI exists but not implemented)

---

**END OF AUDIT**

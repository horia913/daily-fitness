# Metric Contract – Single Source of Truth

**Purpose:** Canonical definition of every metric used in analytics, progress, compliance, and export/share. All screens and export MUST use these definitions only.

**Schema authority:** Supabase Public Schema Column Inventory CSVs. No column or table that does not exist in schema.

---

## 1. Identity and scope

- **Coach scope:** All metric queries for coach UI must filter by coach’s clients: `client_id IN (SELECT client_id FROM clients WHERE coach_id = auth.uid() AND status = 'active')` (or equivalent RLS-aligned filter). Use `clients.client_id` (user UUID) for joining to workout_logs, body_metrics, goals, achievements, habit_logs, meal_completions, personal_records.
- **Client scope:** Client-facing progress/analytics must filter by `client_id = auth.uid()` (or passed client_id when server-side with RLS). No cross-client data.
- **Ids:** `clients.id` = row PK (use for routing, e.g. `/coach/clients/[id]`). `clients.client_id` = user UUID (use for all metric tables). Document which id is passed into each screen/component.

---

## 2. Period and timezone

- **Definition:** “This week” = ISO week (Monday–Sunday) in UTC; “this month” = calendar month in UTC. (If product later adds coach timezone, define once in config and reuse.)
- **Rationale:** Consistency across coach and client and export; avoid per-screen interpretation.
- **Date filters:** Use `completed_at` / `log_date` / `measured_date` / `achieved_date` in the chosen period. All period comparisons use same window.

---

## 3. Workout metrics

### 3.1 Total workouts (count)

- **Name:** totalWorkouts
- **Definition:** Count of completed workouts in scope (coach’s clients or one client).
- **Source:** `workout_logs`
- **Filters:** `completed_at IS NOT NULL`; optional: `completed_at >= period_start AND completed_at < period_end`.
- **Scope:** Coach = all clients of coach; Client = auth.uid().
- **Edge case:** No rows ⇒ 0.

### 3.2 Workout compliance (rate)

- **Name:** workoutCompliance
- **Definition:** (Completed workouts in period) / (Workouts assigned in period). Ratio 0–1 or 0–100%.
- **Source:** Numerator: `workout_logs` count where `completed_at` in period. Denominator: assigned count from `workout_assignments` (and optionally program schedule) for same period and scope.
- **Filters:** Same client scope; period alignment.
- **Edge case:** No assignments ⇒ N/A or 0%; no completions ⇒ 0%.

### 3.3 Avg session time (minutes)

- **Name:** avgSessionTime
- **Definition:** Mean of `total_duration_minutes` for completed workouts in period.
- **Source:** `workout_logs`
- **Columns:** `total_duration_minutes`, `completed_at`
- **Filters:** `completed_at IS NOT NULL`, period, client scope. Exclude null total_duration_minutes from avg.
- **Edge case:** No rows ⇒ 0 or N/A.

### 3.4 Sessions per week

- **Name:** sessionsPerWeek
- **Definition:** Count of completed workouts in the period divided by number of weeks in period (e.g. last 4 weeks ⇒ count/4).
- **Source:** `workout_logs`
- **Filters:** `completed_at` in period, client scope.
- **Edge case:** No rows ⇒ 0.

### 3.5 Total duration (minutes) in period

- **Name:** totalWorkoutDurationMinutes
- **Definition:** Sum of `total_duration_minutes` for completed workouts in period.
- **Source:** `workout_logs`
- **Edge case:** No rows ⇒ 0.

---

## 4. Nutrition metrics

### 4.1 Total meals logged

- **Name:** totalMeals
- **Definition:** Count of meal completions in scope and period.
- **Source:** `meal_completions`
- **Columns:** `client_id`, `completed_at` (or equivalent date column; confirm in schema).
- **Filters:** client scope; completed_at in period.
- **Edge case:** No rows ⇒ 0.

### 4.2 Nutrition compliance

- **Name:** nutritionCompliance
- **Definition:** (Days with at least one meal completion in period) / (Days in period). Or: (Meal completions) / (Expected meals in period) if “expected” is defined (e.g. from meal plan).
- **Source:** `meal_completions`; optionally `assigned_meal_plans` or meal_plan_assignments for expected.
- **Filters:** client scope; period.
- **Edge case:** No days in period ⇒ N/A; no completions ⇒ 0%.

---

## 5. Habit metrics

### 5.1 Habit completions (count)

- **Name:** totalHabits or habitCompletions
- **Definition:** Count of habit_logs in period (or count of log_date with completed_at set).
- **Source:** `habit_logs`
- **Columns:** `client_id`, `log_date`, `completed_at`
- **Filters:** client scope; log_date (or completed_at) in period.
- **Edge case:** No rows ⇒ 0.

### 5.2 Habit compliance

- **Name:** habitCompliance
- **Definition:** (Days with at least one habit completion in period) / (Days in period) or (Completions) / (Expected from habit_assignments). Define one formula and stick to it.
- **Source:** `habit_logs`; optionally habit_assignments for expected.
- **Edge case:** No rows ⇒ 0%.

---

## 6. Goals and achievements

### 6.1 Goals achieved / total goals

- **Name:** goalsAchieved, totalGoals, successRate
- **Definition:** Count of goals with status = 'completed' (and optionally completed_date in period); total active/completed in scope.
- **Source:** `goals`
- **Columns:** `client_id`, `coach_id`, `status`, `completed_date`, `progress_percentage`
- **Filters:** client scope; for “in period” use completed_date.
- **Edge case:** No goals ⇒ 0; 0 total ⇒ success rate N/A or 0%.

### 6.2 Achievements (count or list)

- **Name:** achievementsUnlocked, achievementsInProgress (or list)
- **Definition:** Count (or list) of achievements for client(s). Unlocked = from `achievements` (and optionally user_achievements if used).
- **Source:** `achievements` (client_id, title, achievement_type, achieved_date)
- **Filters:** client scope; optional achieved_date in period.
- **Edge case:** No rows ⇒ 0 or empty list.

---

## 7. Personal records and strength

### 7.1 PR count

- **Name:** personalBests or prCount
- **Definition:** Count of distinct personal records (or records in period) for client(s).
- **Source:** `personal_records`
- **Columns:** `client_id`, `exercise_id`, `record_type`, `record_value`, `achieved_date`
- **Filters:** client scope; optional achieved_date in period.
- **Edge case:** No rows ⇒ 0.

### 7.2 Strength history / strength gains

- **Definition:** Time series or list of PRs by exercise and date. Use `personal_records` joined to `exercises` for names.
- **Edge case:** No rows ⇒ empty array.

---

## 8. Body composition

### 8.1 Current weight / weight trend

- **Name:** currentWeight, weightChange
- **Definition:** Latest `weight_kg` from body_metrics; weight change = (latest − previous) or vs start of period.
- **Source:** `body_metrics`
- **Columns:** `client_id`, `weight_kg`, `measured_date`
- **Filters:** client scope; order by measured_date desc, take first (and optionally second for change).
- **Edge case:** No rows ⇒ null; no previous ⇒ change 0 or N/A.

### 8.2 Body fat trend

- **Name:** bodyFatPercentage, bodyFatTrend
- **Definition:** Latest (or time series) `body_fat_percentage` from body_metrics.
- **Source:** `body_metrics`
- **Columns:** `client_id`, `body_fat_percentage`, `measured_date`
- **Edge case:** No rows ⇒ null or N/A.

---

## 9. Engagement and retention (coach)

### 9.1 New clients in period

- **Name:** newClientsThisPeriod
- **Definition:** Count of clients where coach_id = auth.uid() and created_at (or clients joined date) in period.
- **Source:** `clients`
- **Columns:** `id`, `client_id`, `coach_id`, `status`, `created_at` (if exists; else document actual column).
- **Edge case:** No rows ⇒ 0.

### 9.2 Retention / active clients

- **Name:** activeClients, retentionData
- **Definition:** Count of clients with status = 'active' (and optionally with at least one workout_log or activity in period).
- **Source:** `clients`; optionally join to workout_logs for “active in period”.
- **Edge case:** No rows ⇒ 0.

### 9.3 Total clients

- **Name:** totalClients
- **Definition:** Count of clients where coach_id = auth.uid() (and optionally status in allowed set).
- **Source:** `clients`
- **Edge case:** 0.

---

## 10. Weekly trend / sparkline

- **Name:** weeklyTrend, sparklineData
- **Definition:** Per-day or per-week series: e.g. count of workout_logs completed_at per day (or per week) in last 7 days (or last 4 weeks).
- **Source:** `workout_logs` (completed_at); aggregate by date_trunc('day', completed_at) or week.
- **Filters:** client scope; period.
- **Edge case:** No data ⇒ array of zeros or empty.

---

## 11. Streak

- **Name:** streak (workout streak)
- **Definition:** Consecutive days with at least one completed workout (workout_logs.completed_at). Define “day” in UTC.
- **Source:** `workout_logs`
- **Edge case:** No rows ⇒ 0.

---

## 12. Export and share

- **Rule:** Export (PDF/CSV) and share must call the same metrics layer (same functions or RPCs) as coach and client screens. No separate formulas.
- **Validation:** For a given time window and client(s), exported numbers must match on-screen numbers.

---

## 13. Table quick reference

| Metric area        | Primary table(s)        | Key columns                          |
|--------------------|-------------------------|--------------------------------------|
| Workouts           | workout_logs            | client_id, completed_at, total_duration_minutes |
| Nutrition          | meal_completions        | client_id, completed_at (or date)    |
| Habits             | habit_logs              | client_id, log_date, completed_at    |
| Goals              | goals                   | client_id, coach_id, status, completed_date |
| Achievements        | achievements            | client_id, achieved_date             |
| Personal records   | personal_records        | client_id, achieved_date             |
| Body               | body_metrics            | client_id, measured_date, weight_kg, body_fat_percentage |
| Clients (coach)     | clients                 | id, client_id, coach_id, status      |

**Do not use:** `meal_logs` (does not exist), `workout_logs.duration_minutes` (use total_duration_minutes). For “completed workout” counts/compliance use workout_logs, not workout_sessions (workout_sessions is for in-progress session state).

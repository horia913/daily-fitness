# Coach Adherence Metrics Diagnosis (`/coach/adherence`)

## Route + Data Pipeline

- UI component: `src/components/coach/OptimizedAdherenceTracking.tsx`
- API source: `src/app/api/coach/analytics/adherence/route.ts`
- Fetch call:
  - `fetch('/api/coach/analytics/adherence?period=${selectedPeriod}')`
  - API returns raw arrays (`clients`, `profiles`, `assignments`, `logs`, `wellness`) and now also `weekAdherence`.

## Live Data Presence Check (DB sanity, service-role query)

Checked with real records for the three target clients:

- Alice (`7aa53694-5bcd-4319-aa09-eda750c19f80`)
  - `workout_logs`: 12
  - `workout_assignments`: 12
  - `daily_wellness_logs`: 1
  - Active `program_assignments`: yes
- Popescu (`af9325e2-76e7-4df6-8ed7-9effd9c764d8`)
  - `workout_logs`: 49
  - `workout_assignments`: 31
  - `daily_wellness_logs`: 1
  - Active `program_assignments`: yes
- Roxana (`0048aff5-61df-4460-9292-11d89b478b99`)
  - `workout_logs`: 35
  - `workout_assignments`: 28
  - `daily_wellness_logs`: 7
  - Active `program_assignments`: yes

This confirms the "all zeros" UI state is not because these clients have no data.

## Metric-by-Metric Status

### 1) Overall adherence %
- **Status:** **(b) wired but broken**, now patched.
- **Previous behavior:** derived from `workoutAdherence` + check-ins; broken because workout adherence path was misaligned with canonical logic.
- **Fix:** workout side now comes from program-week adherence (`program_schedule` required slots vs `program_day_completions`) and feeds `overallAdherence`.

### 2) Workouts %
- **Status:** **(b) wired but broken**, now patched.
- **Root cause:** `OptimizedAdherenceTracking` computed workouts via `workout_assignments` matched to `workout_logs.workout_assignment_id` in a 7-day window. This diverges from `ClientAdherenceView` and `/coach/progress` logic.
- **Additional break found in live data:** active assignments had `duration_weeks = null`, allowing derived week to exceed authored `program_schedule` weeks (example Alice raw week 5 on a 4-week template), producing `0 required slots => 0%`.
- **Fix implemented:** API now computes `weekAdherence` using:
  - active `program_assignments`
  - current week via `computeCurrentProgramWeekForAssignment`
  - required slots from `program_schedule` (`is_optional = false`)
  - completions from `program_day_completions` excluding `"Skipped by coach"`
  - week clamp to max authored week in `program_schedule` when derived week exceeds available weeks
- Component now uses `weekAdherence.workout_adherence` as primary source.

### 3) Streak
- **Status:** **(a) wired and working** (with caveat).
- **Source:** computed from activity dates assembled from workout logs + wellness logs.
- **Caveat:** it reflects "any activity streak" (workout or wellness), not strict workout streak.

### 4) Alerts count
- **Status:** **(a) wired and working** (logic-driven).
- **Source:** `weeklyData.filter(day => !day.workout && !day.session).length`.
- **Note:** quality depends on `weeklyData` construction; improved indirectly by workout fix.

### 5) Nutrition %
- **Status:** **(c) not wired**.
- **Evidence:** hardcoded to `0` in mapper (`nutritionAdherence: 0`); API does not fetch nutrition adherence sources.
- **What would need to be built:** either meal-plan compliance (`getNutritionCompliance`) or nutrition-goal trend logic (as in `ClientAdherenceView`).

### 6) Habits %
- **Status:** **(c) not wired**.
- **Evidence:** hardcoded `habitAdherence: 0` and `weeklyData.habit = false`; API has no habits fetch.
- **What would need to be built:** pull habit definitions + completion logs and compute period adherence.

### 7) Sessions %
- **Status:** **(d) ambiguous naming, but wired to wellness check-ins**.
- **Current source:** `daily_wellness_logs` (log-date coverage over 7 days), rendered as `sessionAttendance`.
- **Issue:** tile label says "Sessions" but data is check-ins/wellness, not workout/coaching sessions.

### 8) 7-day adherence calendar (per-day icons)
- **Workouts icon:** **(b) wired but broken**, now patched.
  - Now uses `weekAdherence.day_strip` (program-week day completion) when available.
- **Nutrition icon:** **(c) not wired** (`false` stub).
- **Habit icon:** **(c) not wired** (`false` stub).
- **Session icon:** **(a) wired** to wellness check-ins.

### 9) Adherence trend chart
- **Status:** **(d) partially wired / semantically misleading**.
- **Current source:** chart data derived from `weeklyData` booleans transformed to 0/100.
- **Problem:** not a true historical adherence time series; it is only a transformed 7-day snapshot, and nutrition/habits are stubs.
- **Needs:** dedicated historical aggregation endpoint if true trend is required.

## Why all cards looked empty/0

Primary issue was workouts adherence logic mismatch on this page, compared to canonical client adherence logic used elsewhere. A second issue (week overflow when `duration_weeks` is null) collapsed required-slot denominator to zero for real clients. Since workouts feed overall score and multiple derived UI indicators, cards looked incorrect or flat even with real logs.

## Changes Applied (category B only)

- `src/app/api/coach/analytics/adherence/route.ts`
  - Added canonical program-week adherence computation and response payload `weekAdherence`.
- `src/components/coach/OptimizedAdherenceTracking.tsx`
  - Updated mapper to consume `weekAdherence` for workouts% and workout day flags in weekly calendar.
  - Kept nutrition/habits/session pipelines unchanged (no new behavior for category C).

## Not Implemented (by request)

- No build-out for nutrition/habits pipeline.
- No trend-model redesign.
- No tile hierarchy/UX redesign in this pass.

# Client-Side Progress Tracking & Display — Complete Map Audit

**Date:** March 2026  
**Scope:** READ-ONLY audit of every piece of progress data the app tracks for a client, where it's displayed, how the client accesses it, and what's tracked but not surfaced.  
**No files were modified.**

---

## PART 1: COMPLETE DATA INVENTORY

### 1A. Workout Data

| Table | Key columns (data stored) | Client-facing page(s) | Visualization / display | Tracked but NOT shown (gaps) |
|-------|---------------------------|------------------------|--------------------------|-------------------------------|
| **workout_logs** | id, client_id, started_at, completed_at, total_duration_minutes, overall_difficulty_rating, perceived_effort, total_sets_completed, total_reps_completed, total_weight_lifted, energy_level, muscle_fatigue_level, notes, total_hr_zone2_minutes, total_hr_zone45_minutes, average_hr_percentage, max_hr_percentage, total_distance_meters | Dashboard (today’s workout), Train, Progress Hub (weekly count), Workout Logs list, Workout Log detail, Analytics (frequency, time spent), Complete screen | Cards, list, bar chart (frequency), numbers (this week X/Y, volume) | **Gaps:** total_hr_zone2/45_minutes, average_hr_percentage, max_hr_percentage, total_distance_meters, energy_level, muscle_fatigue_level, overall_difficulty_rating, perceived_effort — not shown on any client page. Workout duration trend (e.g. avg over time) not charted. |
| **workout_set_logs** | weight, reps, exercise_id, workout_log_id, block_type, set_number, superset/giant/dropset/rest-pause/amrap/emom/tabata/fortime fields | Workout Logs list & detail, Analytics (volume, exercise progress, weekly volume, “on the rise”), Complete screen (set summary) | List of sets per log, volume calc, weekly volume chart, exercise progression charts | **Gaps:** RPE not in workout_set_logs (see workout_set_details). No volume-per-muscle-group chart. No workout-to-workout comparison view. |
| **workout_set_details** | set_number, weight_kg, reps_completed, rpe, rest_seconds, notes, completed_at | (Used in workout_exercise_logs flow) | — | **Gap:** RPE and rest_seconds are in workout_set_details; no client UI was found that displays RPE trends or rest time over time. |
| **workout_exercise_logs** | completed_sets (jsonb), total_sets_planned/completed, total_reps_completed, total_weight_lifted, difficulty_rating, form_quality_rating | — | — | **Gap:** Table exists; no client page was found that reads or displays workout_exercise_logs. Set-level display uses workout_set_logs. |
| **workout_giant_set_exercise_logs** | exercise_id, weight_kg, reps_completed | — | — | **Gap:** No dedicated client display; giant set data may be folded into workout_set_logs. |
| **workout_block_completions** | (block completion tracking) | — | — | Not found in schema CSV; if present in DB, no client UI mapped. |
| **workout_sessions** | started_at, completed_at, total_duration, status | Used internally for in-progress session; completion flow uses workout_logs | — | Session duration/status not shown as a distinct client view. |

**Specific answers**

- **Total volume (weight × reps) over time:** Yes — **Analytics** (WorkoutAnalytics + Analytics page): total volume lifted, weekly volume chart. Also Workout Logs page “Volume this month” and per-log totals.
- **Volume per exercise over time:** Partially — Analytics has “On the rise” (recent vs previous 4 weeks by exercise) and exercise progression (weight over 12 weeks). No dedicated “volume per exercise over time” chart.
- **Volume per muscle group:** No client visualization found.
- **Workout frequency over time:** Yes — Analytics: “Workout Frequency” (last 5 weeks bar chart) and WorkoutAnalytics activity calendar (30 days).
- **Average workout duration trend:** Not shown. total_duration_minutes is on logs but no trend chart.
- **RPE trends:** Not shown. RPE lives in workout_set_details; no client RPE trend view found.
- **Rest time data:** Tracked in workout_set_details (rest_seconds); not displayed to client.
- **Set-by-set progression for one exercise (e.g. bench over 3 months):** Yes — **Analytics** > Strength Progress > “All Exercises” expandable; per-exercise progression chart (strengthAnalytics + ExerciseProgressionChart).
- **Workout-to-workout comparison:** No dedicated “compare two workouts” view.

---

### 1B. Personal Records

| Table | Key columns | Display location | Notes |
|-------|-------------|------------------|--------|
| **personal_records** | client_id, exercise_id, record_type, record_value, record_unit, achieved_date, previous_record_value, improvement_percentage, is_current_record | PR page, Progress Hub (count + badge), Workout Logs (link “View all PRs”), Analytics (recent PRs in WorkoutAnalytics), Complete screen (PR celebration) | PRs: from set logs (prService backfill) + detection on complete. **Bug:** WorkoutAnalytics `loadRecentPRs` uses `pr.weight_kg` and `pr.reps`; schema has `record_value`/`record_unit`/`record_type` — Recent PRs in Analytics likely show 0/0. |
| **user_exercise_metrics** | user_id, exercise_id, estimated_1rm | Used by strength analytics and leaderboard; Analytics shows “Estimated 1RM — Compound Lifts” | Shown on Analytics (compound 1RM cards). Not on a dedicated “my 1RM” page. |

- **PR detection:** Automatic from set logs (prService backfill + completion flow).
- **PR display:** PR page (grouped + timeline), Progress Hub (count), Workout Logs (link), Analytics (recent PRs — currently buggy), Complete screen when PR is hit.
- **Progression (old → new with %):** Yes — PR page and prService support previous_record_value, improvement_percentage; PR timeline chart (PRTimelineChart) and “since you started” style stats.
- **PR timeline:** Yes — Personal Records page has view mode “timeline” and getPRTimeline.
- **Celebration at moment of PR:** Yes — Complete screen shows PR celebration.
- **Estimated 1RM:** Yes — Analytics > Strength Progress > “Estimated 1RM — Compound Lifts” (compound only). user_exercise_metrics used for 1RM; no global “all exercises 1RM” page.

---

### 1C. Program Progress

| Table | Key columns | Display location | Notes |
|-------|-------------|------------------|--------|
| **program_assignments** | client_id, program_id, current_day_number, completed_days, total_days, start_date, status | Train page (ActiveProgramCard, WeekStrip), program-week API | Shown as “this week” and day slots. |
| **program_assignment_progress** | current_week, current_day, days_completed_this_week, last_workout_date, total_weeks_completed, is_program_completed, completed_at | Train page, program-week API | Drives “week X” and completion state. |
| **program_day_assignments** | day_number, is_completed, completed_date, workout_assignment_id | Train (week strip, completed vs pending) | Per-day completion. |
| **program_day_completions** | — | — | Not directly mapped in client UI. |
| **program_workout_completions** | week_number, program_day, workout_date, duration_minutes | Used in completion flow and program state | Not a dedicated client list view. |
| **program_progress** | — | — | Referenced in docs; not in schema CSV. |

- **Where client sees program progress:** Train page (program card, week strip, overdue).
- **Program completion %:** Dashboard has `programProgress` but it’s hardcoded to 0 (TODO). Progress Hub does not show program %; Train shows week/day context, not a single “X% complete” number.
- **Weeks/days completed vs remaining:** Yes — Train WeekStrip shows which days are done vs remaining.
- **Week-over-week view of what they did:** Not a dedicated “program history” view; workout history is in Workout Logs.
- **Program completed summary/celebration:** ProgramCompletedCard on Train links to workout logs; no dedicated “program complete” summary screen found.

---

### 1D. Body Metrics

| Column / concept | Displayed where | Visualization | Gap |
|------------------|------------------|---------------|-----|
| weight_kg | Body Metrics, Analytics (latest + body composition chart), Progress Hub (currentWeight in stats), Check-ins (weekly flow), LogMeasurementModal | Line/bar chart, last vs current table, sparkline, “current” in hub | — |
| body_fat_percentage | Body Metrics (table + chart), Analytics (body composition) | Chart, table | — |
| waist_circumference | Body Metrics (table, MeasurementMiniChart), Check-ins, goal progress | Chart, table | — |
| hips, torso, left/right arm, left/right thigh, left/right calf | Body Metrics (Measurements tab: comparison table + MeasurementMiniChart per metric) | Table (prev vs current), mini charts | — |
| muscle_mass_kg | Body Metrics (last vs current table) | Table only | No trend chart for muscle mass. |
| visceral_fat_level | In body_metrics table | — | **MISSING:** Not displayed on any client page. |
| measurement_method | In body_metrics table | — | **MISSING:** Not shown in UI. |
| notes | In body_metrics table | — | **MISSING:** Not shown on Body Metrics page. |

- **Time ranges for body charts:** 12M, 6M, 1M on Body Metrics; Analytics uses limit 30.
- **“Since you started” total change:** Yes — Body Metrics “Measurements” tab has “Since [first date]” comparison summary (waist, hips, arms, thighs, calves).
- **Circumference trends:** Yes — MeasurementMiniChart per metric (waist, hips, torso, arms, thighs, calves) on Body Metrics.

---

### 1E. Wellness / Daily Check-In Data

**Table:** `daily_wellness_logs` (referenced in code; not in provided schema CSV).  
**wellnessService** interface: log_date, sleep_hours, sleep_quality, stress_level, soreness_level, steps, notes; legacy: energy_level, mood_rating, motivation_level.

| Field | Displayed where | Visualization | Gap |
|-------|------------------|---------------|-----|
| sleep_hours | Dashboard (today’s check-in card), Check-ins (form + history), WellnessTrendsCard, Analytics (WellnessTrendChart) | Today summary, week vs week averages, trend chart | — |
| sleep_quality | Dashboard (today), Check-ins, WellnessTrendsCard, wellnessAnalytics | Labels (e.g. “Good”), trends | — |
| stress_level | Dashboard (today), Check-ins, WellnessTrendsCard, Analytics (WellnessTrendChart) | 1–5 scale, trends | — |
| soreness_level | Dashboard (today), Check-ins, WellnessTrendsCard, Analytics (WellnessTrendChart) | 1–5 scale, trends | — |
| steps | Dashboard (today), Check-ins | Number (e.g. Xk steps) | — |
| notes | Check-ins (form + display) | Text | — |
| motivation_level | In DB (legacy) | — | **MISSING:** Not used in UI (wellnessService comment). |
| energy_level | In DB (legacy) | — | **MISSING:** Not used in UI. |
| mood_rating | In DB (legacy) | — | **MISSING:** Not used in UI. |

- **Wellness trend chart:** Yes — Analytics page (WellnessTrendChart from wellnessAnalytics).
- **Correlate wellness with training:** No dedicated “soreness vs volume” or “sleep vs performance” view.

---

### 1F. Nutrition Data

| Table / concept | Display location | Visualization | Gap |
|-----------------|------------------|---------------|-----|
| meal_plan_assignments, meals, meal_items / meal_food_items | Nutrition page (today’s plan, meal cards) | Meal cards, completion checkmarks | — |
| meal_completions | Nutrition (logged meals, photo) | Card “logged”, photo | — |
| Calories / protein / carbs / fat (from meal plan + completions) | Nutrition dashboard (NutritionData), GoalBasedNutritionView | Numbers, progress vs goal | Daily only; no “calories over time” or “protein over time” chart on client. |
| Water (glasses / ml) | Nutrition (water goal + consumed) | Number / progress | — |
| Nutrition goal adherence | Nutrition (goal vs consumed) | Progress bars / numbers | — |

- **Nutrition trends chart:** No client chart for “calories over time” or “protein over time.”
- **“Vs target” view:** Yes — daily intake vs goals on Nutrition page.
- **Weekly/monthly nutrition summary:** No client view found.

---

### 1G. Goals Data

| Table | Display location | Notes |
|-------|------------------|--------|
| **goals** | Goals page (all pillars), Check-ins (pillar goals), Body Metrics (check-in goals with body targets), Analytics (goal completion %) | GoalCard, CompactGoalCard, progress %, completed count |

- **Goal types / pillars:** training, nutrition, checkins, lifestyle, general — shown on Goals page and in Check-ins.
- **Progress:** Updated via manual progress and/or linked metrics (e.g. body metrics for check-in goals).
- **On achievement:** Achievement unlock can be tied to goals; no single “goal achieved” celebration flow documented.
- **Goal history (completed):** Goals page shows goals; filter by status (e.g. completed) available.

---

### 1H. Habits Data

| Table | Display location | Visualization | Gap |
|-------|------------------|---------------|-----|
| **habit_assignments** | Habits page (from Me or DashboardWrapper link) | List of assigned habits | — |
| **habit_logs** | Habits page | Completions / streaks | No habit heatmap/calendar or “completion rate over time” chart found on client. |

- **Streaks:** Shown on Habits page (from habit log data).
- **Habit completion calendar / heatmap:** Not found.
- **Habit trends over time:** Not found.

---

### 1I. Achievements Data

| Table | Display location | Visualization |
|-------|------------------|----------------|
| **achievement_templates** | Achievements page (via AchievementService.getAchievementProgress) | Cards with progress / locked |
| **user_achievements** | Achievements page, notifications (achievement unlock) | List/grid, unlock modal |

- **Achievement count on Progress Hub:** progressStatsService has achievementsUnlocked and achievementsInProgress; Progress Hub nav does not show a badge for achievements; Quick Stats Banner does not show achievement count.
- **“Recent achievements” section:** Not on Dashboard or Progress Hub; Achievements page is full list.
- **Achievement Unlock Modal:** Exists (AchievementUnlockModal); used after body-metric log and elsewhere when achievements are unlocked.

---

### 1J. Leaderboard Data

| Table | Display location | Notes |
|-------|------------------|--------|
| **leaderboard_entries** | Leaderboard page (by exercise, time window, metric) | Rank, score, filters |

- **Rank outside leaderboard page:** progressStatsService fetches leaderboard rank; Progress Hub Quick Stats does not show “your rank” or “X of Y athletes.” So **leaderboard rank is not on Dashboard or Progress Hub**.
- **Rank change notification:** Not found.

---

### 1K. Progress Photos

| Table | Display location | Visualization |
|-------|------------------|----------------|
| **progress_photos** (via progressPhotoService) | Progress > Photos, Body Metrics (last vs current comparison) | Timeline, comparison (before/after), by date |

- **Side-by-side comparison:** Yes — Photos page has comparison mode (two dates); Body Metrics shows previous vs current photos.
- **Timeline view:** Yes — getPhotoTimeline.
- **On Dashboard / Progress Hub:** Not shown; only from Progress > Photos or Body Metrics.

---

### 1L. Mobility Data

| Table | Display location | Visualization |
|-------|------------------|----------------|
| **mobility_metrics** | Progress > Mobility | List, add/edit form; progression per assessment type not clearly charted. |

- **Progression trend per assessment type:** Page shows list and form; no trend charts found for mobility metrics over time.
- **Fields:** Many (shoulder/hip/ankle ROM, etc.); displayed in form and list, not as time-series charts.

---

### 1M. Performance Tests

| Table | Display location | Visualization |
|-------|------------------|----------------|
| **performance_tests** | Progress > Performance | List, 1km_run and step_test; trend (improvement %) between latest and previous. |

- **Trend view:** Yes — improvement % and “vs previous” on Performance page.
- **Test types:** 1km_run, step_test (and possibly others in DB).

---

### 1N. Athlete Score

- **Display:** Dashboard (AthleteScoreRing + ScoreBreakdown).
- **Source:** athlete_scores table (or computed by athleteScoreService); API GET /api/client/athlete-score.
- **Components:** workout_completion_score, program_adherence_score, checkin_completion_score, goal_progress_score, nutrition_compliance_score (weighted 40/20/15/15/10).
- **Breakdown:** Yes — ScoreBreakdown (expandable) on Dashboard.
- **Score history / trend:** Only “latest” score is used; no score history or trend chart on client.

---

## PART 2: INFORMATION ARCHITECTURE MAP

### 2A. Page-by-Page Map

| Page | Route | Data shown | Data source tables | Charts? | Trends? | Comparisons? |
|------|--------|------------|--------------------|--------|--------|--------------|
| Dashboard | /client | Athlete score + breakdown, today’s workout, check-in prompt or today’s wellness, streak, weekly workouts (X/Y), program % (currently 0) | athlete_scores, program/week state, workout_logs, daily_wellness_logs, clientDashboardService | Ring (score) | No | No |
| Train | /client/train | Program week, day slots, completed vs pending, extra workouts, overdue | program_assignments, program_assignment_progress, program_day_assignments, program_workout_completions, workout_assignments | No | No | No |
| Check-ins | /client/check-ins | Today’s wellness form, history, streak, weekly comparison, pillar goals, links to body metrics/photos/mobility | daily_wellness_logs, goals | No | WellnessTrendsCard (week vs week) | Weekly comparison |
| Weekly Check-in | /client/check-ins/weekly | Weekly flow (wellness + body + photos) | daily_wellness_logs, body_metrics, progress_photos, goals | No | No | StepReview, ProgressMomentCard |
| Nutrition | /client/nutrition | Daily plan, meal completion, calories/protein/carbs/fat vs goal, water | meal_plan_assignments, meals, meal_items, meal_completions | No | No | Vs target (daily) |
| Progress Hub | /client/progress | Quick stats (workouts this week, volume placeholder “—”, PR count), nav to Analytics, Performance, Body Metrics, Mobility, PRs, Export | workout_logs, personal_records, progressStatsService | No | No | No |
| Analytics | /client/progress/analytics | Workout frequency (5 weeks), body composition, goal completion %, volume trend, wellness trend, strength progress (1RM, progression), “All Exercises” | workout_logs, workout_set_logs, body_metrics, goals, volumeAnalytics, wellnessAnalytics, strengthAnalytics | Yes | Yes | Yes |
| Workout Logs | /client/progress/workout-logs | List of logs, this month count/volume/sets, link to PRs | workout_logs, workout_set_logs | No | No | Monthly summary |
| Workout Log Detail | /client/progress/workout-logs/[id] | Single log with sets, exercises, totals | workout_logs, workout_set_logs | No | No | No |
| Personal Records | /client/progress/personal-records | PR list, timeline, stats, backfill | personal_records, prService | PRTimelineChart | Yes | Old vs new |
| Body Metrics | /client/progress/body-metrics | Weight/BF/muscle table + charts, circumferences, goal progress, photos, log history | body_metrics, goals, progress_photos | Yes | Yes | Last vs current, since start |
| Photos | /client/progress/photos | Timeline, comparison (two dates), upload | progress_photos | No | Timeline | Side-by-side |
| Leaderboard | /client/progress/leaderboard | Rank list by exercise/time/metric | leaderboard_entries | No | No | No |
| Achievements | /client/progress/achievements | All templates + progress / unlocked | achievement_templates, user_achievements | No | No | No |
| Mobility | /client/progress/mobility | List of assessments, add/edit | mobility_metrics | No | No | No |
| Performance | /client/progress/performance | Tests list, 1km/step_test, improvement % | performance_tests | No | Yes (vs previous) | Yes |
| Goals | /client/goals | Goals by pillar, progress, add/edit | goals | No | No | No |
| Habits | /client/habits | Assignments, completions (DashboardWrapper link) | habit_assignments, habit_logs | No | No | No |
| Activity | /client/activity | — | — | — | — | — |
| Lifestyle | /client/lifestyle | — | — | — | — | — |

**Note:** Progress Hub does not link to Workout Logs; client reaches Workout Logs via Me > Progress (then no direct hub tile) or from Train/EnhancedClientWorkouts/ProgramCompletedCard links.

### 2B. Navigation Paths (from Dashboard)

| User question | Where to get answer | Path (taps from Dashboard) | Rating |
|---------------|---------------------|----------------------------|--------|
| How many workouts this month? | Workout Logs “This month” hero | Me → Progress → (no Workout Logs on hub) — must go to Analytics or Train/other link; or Progress Hub shows “this week” only. Workout Logs: e.g. Me → Progress → open Workout Logs from workout-logs URL or from Train. So ~3–4 taps if user knows to go to Progress then finds Workout Logs. | 🟡 |
| Bench press progression over time? | Analytics > Strength Progress > All Exercises > expand “Bench Press” | Me → Progress → Analytics → scroll to All Exercises → expand exercise | 🟡 4 taps |
| Am I losing weight? | Body Metrics or Analytics (body composition) | Me → Progress → Body Metrics (or Analytics) | 🟢 2–3 taps |
| How’s my sleep trending? | Analytics (WellnessTrendChart) or Check-ins (WellnessTrendsCard) | Check-ins → history/trends; or Me → Progress → Analytics | 🟢 2–3 taps |
| What PRs did I hit recently? | Personal Records or Analytics (recent PRs — currently buggy) | Me → Progress → Personal Records | 🟢 2–3 taps |
| How compliant with nutrition plan? | Nutrition page (daily vs goal) | Fuel (bottom nav) | 🟢 1 tap |
| Where do I rank on leaderboard? | Leaderboard page | Me → Progress → Leaderboard (Leaderboard not in hub tiles; need to open Progress then Leaderboard) | 🟡 3 taps |
| What achievements have I earned? | Achievements page | Me → Progress → Achievements (Achievements not in hub tiles) | 🟡 3 taps |
| How far through my program? | Train page (week/day) | Train (bottom nav) | 🟢 1 tap |
| Before and after photos? | Progress > Photos (comparison mode) or Body Metrics | Me → Progress → Photos (or Body Metrics for last vs current) | 🟢 2–3 taps |
| Overall progress summary? | Dashboard (score + weekly + streak) or Progress Hub (stats) | Dashboard itself; or Me → Progress | 🟢 0–2 taps |
| Check-in streak? | Dashboard (if checked in), Check-ins page | Dashboard card or Check-in (bottom nav) | 🟢 1–2 taps |

### 2C. Overlap Analysis

- **Weight:** Dashboard (no), Progress Hub (currentWeight in stats), Body Metrics, Analytics, Check-ins (weekly flow), LogMeasurementModal. **Verdict:** Helpful (summary in hub, detail in Body Metrics).
- **Workout count:** Dashboard (this week X/Y), Progress Hub (this week), Workout Logs (this month + list), Analytics (5 weeks + total). **Verdict:** “This month” only on Workout Logs; hub shows “this week” and volume as “—”.
- **Check-in streak:** Dashboard (when checked in), Check-ins (current streak). **Verdict:** Consistent.
- **Body fat:** Body Metrics, Analytics (body composition). **Verdict:** Helpful.
- **PRs:** Progress Hub (count), Personal Records page, Workout Logs (link), Analytics (recent PRs), Complete screen. **Verdict:** Helpful; Analytics recent PRs bug (wrong columns) should be fixed.
- **Program progress:** Dashboard (program % = 0), Train (week/day). **Verdict:** Dashboard program % not implemented; Train is the single source of truth.

---

## PART 3: GAP ANALYSIS

### 3A. Tracked but Not Displayed

| Data point | Tracked in | Displayed where? | If NOT displayed |
|------------|------------|-------------------|------------------|
| Total volume per workout | workout_logs, workout_set_logs | Workout Logs (per log), Analytics (total/weekly) | — |
| Volume per exercise over time | workout_set_logs | Analytics (on the rise, progression by weight not volume) | Volume-per-exercise trend: **MISSING** |
| Volume per muscle group | workout_set_logs + exercises | — | **MISSING** |
| Workout duration trend | workout_logs.total_duration_minutes | — | **MISSING** |
| RPE trends | workout_set_details | — | **MISSING** |
| Rest time data | workout_set_details | — | **MISSING** |
| Exercise-specific progression (weight over time) | workout_set_logs | Analytics > Strength Progress > All Exercises | — |
| Workout-to-workout comparison | workout_logs | — | **MISSING** |
| Estimated 1RM per exercise | user_exercise_metrics | Analytics (compound 1RM only) | Full 1RM list: **MISSING** |
| Circumference trends (charts) | body_metrics | Body Metrics MeasurementMiniCharts | — |
| Muscle mass trend | body_metrics | Body Metrics table only | Chart: **MISSING** |
| Visceral fat trend | body_metrics | — | **MISSING** |
| Motivation level | daily_wellness_logs | — | **MISSING** (legacy) |
| Energy level | daily_wellness_logs | — | **MISSING** (legacy) |
| Mood rating | daily_wellness_logs | — | **MISSING** (legacy) |
| Nutrition calories over time | meal data | — | **MISSING** |
| Protein vs target over time | meal data | — | **MISSING** |
| Habit completion rate over time | habit_logs | — | **MISSING** |
| Athlete score breakdown | athlete_scores | Dashboard ScoreBreakdown | — |
| Athlete score trend | athlete_scores | — | **MISSING** |
| Leaderboard rank on dashboard | leaderboard_entries | — | **MISSING** (only on Leaderboard page) |
| Recent achievements on dashboard | user_achievements | — | **MISSING** |
| PR count on dashboard | personal_records | Progress Hub (not Dashboard) | Dashboard: **MISSING** |
| Program completion % on dashboard | program_assignments etc. | Dashboard shows 0 (TODO) | **MISSING** (not implemented) |
| Progress Hub “Volume” card | workout_set_logs | Progress Hub shows “—”) | **MISSING** (placeholder) |

### 3B. Pages That Feel Empty or Underdeveloped

- **Progress Hub:** Volume card is “—”; no link to Workout Logs; no achievement count or leaderboard rank in quick stats.
- **Dashboard:** Program progress % hardcoded to 0; no PR count, no leaderboard rank, no recent achievements.
- **WorkoutAnalytics (Analytics):** Recent PRs use wrong columns (weight_kg/reps vs record_value/record_type) → likely 0/0.
- **Mobility:** List + form only; no trend charts per metric.
- **Nutrition:** No historical or trend charts (calories/protein over time).
- **Habits:** No calendar/heatmap or completion rate over time.

### 3C. Missing Cross-Data Insights

- Training volume vs body weight (correlation).
- Soreness vs training volume (recovery).
- Sleep quality vs workout performance.
- Nutrition adherence vs body composition change.
- Check-in consistency vs overall progress.

---

## PART 4: DASHBOARD AUDIT

**File:** `src/app/client/page.tsx`

**What the dashboard shows (real data):**

1. **Header:** Greeting (“Hey, {name}”), date, avatar link to /client/me.
2. **Athlete Score Ring:** Score 0–100, tier; from `/api/client/athlete-score` (athlete_scores or athleteScoreService). Real.
3. **ScoreBreakdown (expandable):** Workout, Program, Check-ins, Goals, Nutrition (component scores). Real.
4. **Today’s Quick Actions:** “Today: {workout name}” or “Rest day” from clientDashboardService getTodaysWorkout (program or assignment). Real. Link: “Go to Training” → /client/train.
5. **Daily Check-in Card (if not checked in):** Prompt + streak from getCheckinStreak (wellnessService). Real. Link: /client/check-ins.
6. **If checked in today:** “Checked in today” + sleep, stress, soreness, steps (todayWellnessLog), streak, “Edit” → /client/check-ins. Real.
7. **Streak & Stats Row:**  
   - **Streak:** From dashboard API (clientDashboardService getDashboardStats → calculateStreak from workout_logs). Real.  
   - **This week:** weeklyProgress.current / weeklyProgress.goal from getWeeklyProgress (workout_logs + program state). Real.  
   - **Program:** programProgress; in code set to `const programProgress = 0; // TODO`. **Not real** — always 0, never shown if 0 (conditional render).

**What is NOT on the dashboard:**

- No “progress summary” line (e.g. “12 workouts this month, 15,000 kg, -2 kg”).
- No PR count, no leaderboard rank, no recent achievements.
- No total volume, no link to Workout Logs, no nutrition summary.

**Verdict:** Dashboard is a clear “home base” for score, today’s workout, and check-in, but program % is unimplemented and there is no single-sentence progress summary or links to key progress (PRs, leaderboard, achievements, workout count for month).

---

## OUTPUT FORMAT

### MASTER TABLE: Every Tracked Data Point (Abridged)

| # | Data point | DB table(s) | Displayed on page(s) | Visualization | Trend/chart? | Comparison? | Gap? |
|---|------------|-------------|----------------------|---------------|--------------|-------------|------|
| 1 | Workouts completed (count) | workout_logs | Dashboard (week), Progress Hub (week), Workout Logs (month + list), Analytics | Number, bar chart | Yes (Analytics) | No | Month on dashboard: no |
| 2 | Total volume (weight×reps) | workout_set_logs, workout_logs | Workout Logs, Analytics, Complete | Number, weekly chart | Yes | No | Progress Hub shows “—” |
| 3 | Weight over time | body_metrics | Body Metrics, Analytics, Progress Hub (latest) | Line/bar, sparkline | Yes | Yes | — |
| 4 | Body fat over time | body_metrics | Body Metrics, Analytics | Chart | Yes | Yes | — |
| 5 | Circumferences | body_metrics | Body Metrics | Table, MeasurementMiniChart | Yes | Yes | — |
| 6 | Check-in streak | workout_logs (streak) or daily_wellness (check-in streak) | Dashboard, Check-ins | Number | No | No | — |
| 7 | Wellness (sleep, stress, soreness, steps) | daily_wellness_logs | Dashboard (today), Check-ins, Analytics | Trend chart, week vs week | Yes | Yes | Motivation/energy/mood: no |
| 8 | Personal records | personal_records | PR page, Hub (count), Workout Logs link, Analytics (recent), Complete | List, timeline chart | Yes | Yes | Analytics recent PRs: wrong columns |
| 9 | Estimated 1RM | user_exercise_metrics | Analytics (compound only) | Cards | No | No | Full list: no |
| 10 | Program progress | program_assignments, program_assignment_progress | Train, Dashboard (0) | Week strip | No | No | Dashboard %: not implemented |
| 11 | Goals | goals | Goals, Check-ins, Body Metrics, Analytics | Cards, % | No | Vs target | — |
| 12 | Habits | habit_assignments, habit_logs | Habits | List | No | No | Heatmap/trend: no |
| 13 | Achievements | user_achievements, achievement_templates | Achievements page, unlock modal | Grid | No | No | Dashboard/hub summary: no |
| 14 | Leaderboard rank | leaderboard_entries | Leaderboard page | List | No | No | Dashboard/hub: no |
| 15 | Athlete score | athlete_scores | Dashboard | Ring + breakdown | No | No | History/trend: no |
| 16 | Progress photos | progress_photos | Photos, Body Metrics | Timeline, comparison | No | Yes | — |
| 17 | Mobility | mobility_metrics | Mobility | List, form | No | No | Trend charts: no |
| 18 | Performance tests | performance_tests | Performance | List, improvement % | No | Yes | — |
| 19 | RPE / rest time | workout_set_details | — | — | No | No | **MISSING** |
| 20 | HR / distance (workout) | workout_logs | — | — | No | No | **MISSING** |
| 21 | Visceral fat / measurement_method / notes | body_metrics | — | — | No | No | **MISSING** |
| 22 | Nutrition over time | meal/plan/completion | — | — | No | No | **MISSING** |

### NAVIGATION HEAT MAP (from Part 2B)

- 🟢 1–2 taps: Weight trend, nutrition compliance, program progress, photos, overall summary, check-in streak.
- 🟡 3–4 taps: Workouts this month (no direct hub tile), bench progression, leaderboard, achievements.
- 🔴 5+ or not accessible: Volume-per-muscle, RPE/rest trends, workout-to-workout compare (no view).

### TOP ISSUES (by impact)

1. **Tracked but never shown:** RPE and rest time (workout_set_details); HR/distance (workout_logs); visceral fat, measurement_method, notes (body_metrics); motivation/energy/mood (wellness legacy); volume per muscle group; workout duration trend; athlete score history; nutrition/calories over time; habit completion over time.
2. **Progress Hub and Dashboard gaps:** Volume card “—”; no Workout Logs tile on hub; no program % on dashboard (TODO); no PR count/leaderboard rank/recent achievements on dashboard or hub.
3. **Bug:** WorkoutAnalytics recent PRs use `weight_kg`/`reps` on personal_records (schema has record_value/record_type/record_unit) → fix to use record_value/record_type.
4. **Scattered experience:** Progress is spread across many pages (Hub, Analytics, Body Metrics, Check-ins, Workout Logs, PRs, Leaderboard, Achievements, Goals, Nutrition, Train) with no single “story” or cross-insights (e.g. volume vs weight, sleep vs performance).
5. **Underdeveloped pages:** Mobility (no trends), Nutrition (no trends), Habits (no heatmap/trend), Dashboard (no progress summary line, program % = 0).

---

*End of audit. No code or config was changed.*

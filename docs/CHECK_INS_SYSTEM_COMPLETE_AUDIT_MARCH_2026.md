# Check-In System — Complete Current State Audit

**Date:** March 2026  
**Scope:** READ-ONLY audit of ALL check-in, wellness, body metrics, progress photos, weekly check-in, and coach check-in configuration screens and data flows.  
**No files were modified.**

---

## PART 1: MAP EVERY CHECK-IN TYPE

### 1A. Daily Wellness Check-In

**Files read:**  
`src/components/client/DailyWellnessForm.tsx`, `src/app/client/check-ins/page.tsx`, `src/app/client/page.tsx`, `src/lib/wellnessService.ts`, `src/lib/wellnessAnalytics.ts`

#### 1. Fields collected
- **Required:** Sleep duration (hours), Sleep quality (1–5), Stress level (1–5), Muscle soreness (1–5).
- **Optional:** Steps, Notes.
- **Post-submit prompt:** Optional “quick weight” (writes to `body_metrics` via `createMeasurement`).

**Source:** `DailyWellnessForm.tsx` lines 230–234 (required), 254–255 (steps, notes), 364–386 (steps UI), 516–528 (notes). Stress/soreness stored in DB as 2,4,6,8,10 via `uiScaleToDb` (wellnessService).

#### 2. INSERT path
- **Write path:** Form submit → `upsertDailyLog(clientId, { sleep_hours, sleep_quality, stress_level, soreness_level, steps?, notes? })` (`wellnessService.ts` lines 48–98).
- **Table:** `daily_wellness_logs`. Upsert on `(client_id, log_date)`; merges with existing row so other columns are preserved.
- **Verified:** Yes. `upsertDailyLog` uses `supabase.from("daily_wellness_logs").upsert(row, { onConflict: "client_id,log_date" }).select().single()`.

#### 3. After submit
- Success: `setSubmitSuccess(true)`, `setShowSuccess(true)`, `setShowForm(false)`. Optional quick-weight prompt shown. `onSuccess?.()` triggers parent refetch (check-ins page sets `historyKey` to refetch).
- No redirect; user stays on check-ins page and sees “Check-in complete” card with summary and optional “Edit”.

#### 4. Dashboard “Check in” prompt
- **Location:** `src/app/client/page.tsx` lines 396–483.
- **Logic:** `checkTodayCheckIn()` calls `getTodayLog(user.id)` and `getCheckinStreak(user.id)`. If `hasCheckInToday === false` → show “How are you feeling today?” card with “Check in” button linking to `/client/check-ins`. If `hasCheckInToday === true` → show “Checked in today” summary (sleep, stress, soreness, steps, streak) with “Edit” to `/client/check-ins`.
- **Verified:** Dashboard uses real `daily_wellness_logs` via `getTodayLog` / `getCheckinStreak`. Link goes to check-ins page where `DailyWellnessForm` lives. End-to-end works.

#### 5. Streak / consistency
- **Service:** `getCheckinStreak(clientId)` in `wellnessService.ts`: consecutive days (counting back from today) where the log has all of sleep_hours, sleep_quality, stress_level, soreness_level non-null.
- **Dashboard:** Displays streak from `getCheckinStreak` in the check-in card.
- **Check-ins page:** Computes streak locally from `logRange` (90 days) and passes to `CheckInHistory` as `initialCurrentStreak` / `initialBestStreak`.
- **Gap:** In `DailyWellnessForm`, `streak` state is initialized to 0 and **never updated**. The success view (lines 334–355) shows “X-day check-in streak” only when `streak > 0`, but the form never calls `getCheckinStreak`. So the streak in the **form’s** success card is always 0. History section and dashboard show correct streak.

#### 6. Wellness history
- **Check-ins page:** Fetches `getLogRange(user.id, rangeStartDateStr, todayStr)` for last 90 days. Passes `logRange` to `CheckInHistory`.
- **CheckInHistory:** Uses `initialLogRange` only (no extra queries). Shows: streak / best streak / this month; calendar heatmap (month navigator); selected date detail; “Recent Entries” (last 7 days). All from the 90-day window passed in.
- **Format:** Calendar + list; no chart in CheckInHistory. `wellnessAnalytics.getWellnessTrends` exists and is used on `/client/progress/analytics` (WellnessTrendChart), not on the check-ins page.

#### 7. CheckInHistory and wellness entries
- **CheckInHistory.tsx:** Displays past wellness from `initialLogRange`. Calendar shows which dates have a log; clicking a date shows that day’s sleep, stress, soreness, steps, notes. “Recent Entries” lists last 7 days. No “how far back” limit beyond what the page fetches (90 days).

---

### 1B. Weekly Check-In Flow

**Files read:**  
`src/app/client/check-ins/weekly/page.tsx`, `src/components/client/weekly-checkin/WeeklyCheckInFlow.tsx`, `WeeklyCheckInFlowTypes.ts`, `StepBodyMetrics.tsx`, `StepPhotos.tsx`, `StepReview.tsx`, `WeeklyCheckInCard.tsx`, `WeeklyComparison.tsx`

#### 1. Step-by-step flow
- **Step 1:** Body metrics (`StepBodyMetrics`) — weight (required if config says so), body fat, circumferences (waist, hips, torso, arms, thighs, calves), muscle mass, visceral fat, notes. “Next.”
- **Step 2:** Photos (`StepPhotos`) — optional front/side/back file uploads. “Skip” or “Next.”
- **Step 3:** Review (`StepReview`) — table “Last check-in” vs “This check-in” (weight, body fat, waist; wellness averages if available). Notes to coach. “Submit ✓.”

**Source:** `WeeklyCheckInFlow.tsx` steps 1→2→3; title says “Monthly Check-In” (line 183).

#### 2. Data per step
- Step 1: `WeeklyCheckInBodyData` (weight_kg, body_fat_percentage, circumferences, muscle_mass_kg, visceral_fat_level, notes).
- Step 2: `WeeklyCheckInPhotoFiles` (front/side/back File objects).
- Step 3: Display only + notes to coach (included in measurement notes on submit).

#### 3. Tables written
- **Body:** On submit, `upsertMeasurement({ client_id, measured_date: today, weight_kg, body_fat_percentage, ...circumferences, notes })` → `body_metrics` (`measurementService.upsertMeasurement`). Single row per (client_id, measured_date).
- **Photos:** For each type (front/side/back) with a file, `uploadPhoto(clientId, { photo_date: today, photo_type, file, weight_kg?, body_fat_percentage?, notes? })` → Supabase Storage bucket `progress-photos`, path `{clientId}/{dateStr}/{type}.jpg`, and `progress_photos` table upsert on `(client_id, photo_date, photo_type)`.
- **Wellness:** Weekly flow does **not** write to `daily_wellness_logs`. Review step only *reads* wellness (this week vs last week) for comparison.

#### 4. Review step comparisons
- **StepReview.tsx:** Table “Last check-in” vs “This check-in” with **Change** column for weight, body fat, waist (▼/▲, delta and %). If wellness data loaded, also sleep avg and stress avg (this week vs last week). “Last” = previous measurement from `getClientMeasurements(clientId, 2)` (second row); “this” = current form body data.

#### 5. WeeklyComparison component
- **Location:** Check-ins page (`/client/check-ins`), not inside weekly flow.
- **Data:** Receives `current` and `previous` body measurements (two most recent from `getClientMeasurements(user.id, 2)`), plus `wellnessThisWeek` and `wellnessLastWeek` (from page’s `thisWeekLogs` / `lastWeekLogs`).
- **Metrics:** Weight, body fat, waist (last week vs this week); sleep avg and stress avg (wellness). Labels say “Last week” / “This week”; body data are “last vs current” measurements (not strictly calendar weeks). Change column with ▼/▲ and numeric delta.

#### 6. Before/after photo comparison
- Weekly flow does not show a before/after photo comparison. Photos are uploaded and stored; comparison is on `/client/progress/photos` (comparison mode) and on body-metrics page (previous vs current date photos).

#### 7. Weekly check-in frequency
- **Config:** `check_in_configs.frequency_days` (7, 14, or 30). Fetched via `getClientCheckInConfig(clientId)` on weekly page and check-ins page.
- **WeeklyCheckInCard:** Uses `frequencyDays` (default 30). “Due” when `daysSinceLast >= 25` (`DUE_DAYS_THRESHOLD`). Card links to `/client/check-ins/weekly`. So frequency is configurable by coach; client sees “Monthly check-in due” when 25+ days since last measurement.

#### 8. After completing weekly check-in
- `onComplete()` then `router.push("/client/check-ins")`. No in-app coach notification found; data is in `body_metrics` and `progress_photos` which coach can see in ClientProgressView.

---

### 1C. Body Metrics Logging

**Files read:**  
`src/app/client/progress/body-metrics/page.tsx`, `src/components/client/LogMeasurementModal.tsx`, `src/lib/measurementService.ts`

#### 1. Fields client can log
- **LogMeasurementModal:** Weight (required), body fat %, waist, hips, torso, left/right arm, left/right thigh, left/right calf, muscle mass, visceral fat, measurement method, notes. Optional progress photo uploads (front/side/back) via same flow as weekly.
- **StepBodyMetrics (weekly):** Same set, driven by `check_in_configs` (weight_required, body_fat_enabled, circumferences_enabled).

#### 2. Progression / comparison
- Body-metrics page: “Body check-in” section with table **Last check-in** vs **Current** (previous and latest from `body_metrics`) for weight, body fat, muscle mass, circumferences; Change column with ▼/▲ and numeric delta. Weight trend sparkline (last ~12 points). Separate Measurements tab with circumference comparison. Progress photos for latest and previous dates shown when available.

#### 3. Chart time ranges
- Tabs: “Weight & BF” and “Measurements”. Range selector: **12M, 6M, 1M** (lines 524–535). Data loaded as 12 months from today; chart filters by `chartRange` (slicing same dataset).

#### 4. Month-over-month deltas
- Shown in the “Body check-in” table (previous vs current); no explicit “this month vs last month” summary. Deltas are between last two measurement dates.

#### 5. Goal vs current
- Body-metrics page imports `Target` icon but no “Target weight: X, Current: Y, Z to go” block found. Goals are on check-ins page under “Check-in Goals” (pillar `checkins`) from `goals` table; not a dedicated “goal vs current” on body-metrics page.

---

### 1D. Progress Photos

**Files read:**  
`src/components/client/weekly-checkin/StepPhotos.tsx`, `src/app/client/progress/photos/page.tsx`, `src/lib/progressPhotoService.ts`, `src/lib/progressPhotoStorage.ts` (exists; primary logic in progressPhotoService)

#### 1. Upload flows
- **Weekly check-in:** Step 2 collects front/side/back files; on submit `WeeklyCheckInFlow` calls `uploadPhoto(clientId, { photo_date: today, photo_type, file, ... })` for each. Persisted.
- **Standalone:** `/client/progress/photos` — upload for “today” with slots front/side/back, weight/notes; uses `uploadPhoto` from progressPhotoService. Timeline and comparison mode.

#### 2. Storage
- **Bucket:** `progress-photos` (progressPhotoService.ts line 9).
- **Path:** `{clientId}/{dateStr}/{photo_type}.jpg` (e.g. `uuid/20260308/front.jpg`). Upsert in storage.

#### 3. DB references
- **Table:** `progress_photos`. Columns used: client_id, photo_date, photo_type, photo_url (placeholder), photo_path, weight_kg, body_fat_percentage, notes, updated_at. Upsert on `(client_id, photo_date, photo_type)`.

#### 4. Photo timeline
- **Client:** Photos page uses `getPhotoTimeline(clientId)` (dates + types per date). “Comparison mode”: pick two dates → `getComparisonPhotos(clientId, date1, date2)` → before/after. So “Week 1 vs Week 8” is possible by choosing dates.

#### 5. Coach view
- **ClientProgressView:** Loads `getPhotoTimeline(clientId)` and `getComparisonPhotos` when timeline has ≥2 dates. Coach sees timeline and before/after; data from DB + signed URLs.

#### 6. Persistence
- **Verified:** `uploadPhoto` uploads to Storage and upserts `progress_photos`. No mock or console.log-only path; real Supabase Storage and DB.

---

### 1E. Mobility Assessments

**Files read:**  
`src/app/client/progress/mobility/page.tsx`, `MobilityFormFields.tsx`, `src/lib/progressTrackingService.ts` (MobilityMetricsService)

#### 1. Summary
- Page lists mobility metrics; add/edit modal with date, assessment type, type-specific fields (from MobilityFormFields), notes. Create/update/delete via `MobilityMetricsService` → table `mobility_metrics`. Same pattern as before (no structural change from prior audit).

#### 2. Progression over time
- List is chronological; no dedicated “Shoulder mobility 45° → 52°” trend view in the audited code. Data is in `mobility_metrics`; progression would require aggregating by assessment type over time (not fully built in UI).

---

### 1F. Coach Check-In Configuration

**Files read:**  
`src/components/coach/CheckInConfigEditor.tsx`, `src/components/coach/AddClientCheckInModal.tsx`, `src/lib/checkInConfigService.ts`, `migrations/20260308_check_in_configs.sql`, `migrations/20260310_check_in_configs_default_monthly.sql`

#### 1. What coach can configure
- **CheckInConfigEditor:** Frequency (7, 14, or 30 days), weight required, body fat enabled, photos enabled, notes to coach enabled, circumferences (waist, hips, torso, arms, thighs, calves) — which are optional for client. Saved via `upsertCheckInConfig(coachId, clientId, input)`.

#### 2. check_in_configs table
- **Columns:** id, coach_id, client_id (null = coach default), frequency_days (default 30 after migration), weight_required, body_fat_enabled, photos_enabled, circumferences_enabled (text[]), notes_to_coach_enabled, created_at, updated_at. Unique: one default per coach (client_id IS NULL), one per coach-client when client_id set.

#### 3. Client flow reading config
- **Weekly flow:** `WeeklyCheckInFlow` receives `config` from weekly page; `getClientCheckInConfig(user.id)` used. StepBodyMetrics uses `config?.weight_required`, `body_fat_enabled`, `circumferences_enabled`. StepReview uses `config?.notes_to_coach_enabled`. StepPhotos visibility: `photosEnabled = config?.photos_enabled ?? true`.
- **Check-ins page:** Fetches `getClientCheckInConfig(user.id)`; passes `frequencyDays` to `WeeklyCheckInCard` (when to show “due”). So client flows **do** read `check_in_configs`.

#### 4. Coach viewing completed check-ins
- **ClientProgressView:** Wellness tab (getLogRange, getCompletionStats), Body tab (getClientMeasurements, getLatestMeasurement), Photos tab (getPhotoTimeline, getComparisonPhotos). All from DB. Coach does not have a separate “completed check-ins” list; they see the same data in progress view.

#### 5. AddClientCheckInModal
- **Purpose:** Coach manually adds a **body measurement** for a client (date, weight required, body fat, waist, notes). Calls `createMeasurement({ client_id, coach_id, measured_date, weight_kg, ... })` → `body_metrics`. Does **not** create a wellness log or photo; it is “add check-in” in the sense of “log a body check-in for the client.”

---

## PART 2: PROGRESSION & COMPARISON ANALYSIS

### 2A. What comparisons exist today

| Metric | This week vs last week | This month vs last month | 3M / 6M / 12M | Trend chart | Deltas (↑↓, +/-, color) |
|--------|------------------------|---------------------------|----------------|-------------|---------------------------|
| Weight | Yes (WeeklyComparison; last 2 measurements) | Implicit (last 2) | Yes (body-metrics chart 12M/6M/1M) | Yes (body-metrics) | Yes |
| Body fat | Yes | Implicit | Yes (chart) | Yes | Yes |
| Waist | Yes | Implicit | Yes (measurements tab) | Yes | Yes |
| Other circumferences | In StepReview / body-metrics table | — | In measurements tab | — | Yes |
| Sleep (wellness) | Yes (WeeklyComparison, StepReview, ThisWeekStrip avg) | No | No | Analytics page (getWellnessTrends) | Inline yesterday in form; week avg in strip |
| Stress (wellness) | Yes (WeeklyComparison, StepReview) | No | No | Analytics page | Inline yesterday; week avg |
| Soreness | Inline yesterday in form | No | No | Analytics | Inline |
| Steps | Inline yesterday in form | No | No | — | Inline |
| Photos | — | — | — | Timeline + comparison mode (two dates) | Before/after in photos page and body-metrics |

### 2B. What comparisons are missing

- **Wellness (sleep, stress, soreness, steps):** No “this month vs last month” or “3M/6M” summary on check-ins page; only this week vs last week and inline yesterday. No chart on check-ins page (chart is on `/client/progress/analytics`).
- **Mobility:** No trend view or “improved from X to Y” summary.
- **Body metrics:** No explicit “goal weight vs current” on body-metrics page; goals are separate (check-in goals pillar).
- **Wellness deltas:** No single “progress vs 3 months ago” for wellness; analytics provides trends but not a simple delta line.

### 2C. Coach-side progression

- **ClientProgressView:** Uses `getClientMeasurements`, `getLogRange`, `getCompletionStats`, `getPhotoTimeline`, `getComparisonPhotos` — all real DB. Weight sparkline, last two measurements, 7-day wellness averages, 4-week wellness by week, photo timeline and comparison. No localStorage; verified from code.

---

## PART 3: DATA FLOW INTEGRITY

### 3A. Write paths

| Table / storage | UI that writes | Component / flow | Verified |
|-----------------|----------------|------------------|----------|
| daily_wellness_logs | Yes | DailyWellnessForm → upsertDailyLog | Yes |
| body_metrics | Yes | LogMeasurementModal → createMeasurement; WeeklyCheckInFlow → upsertMeasurement; DailyWellnessForm quick weight → createMeasurement | Yes (note: LogMeasurementModal uses create, so duplicate date fails unless upsert used elsewhere) |
| mobility_metrics | Yes | Mobility page → MobilityMetricsService.createMobilityMetric / updateMobilityMetric | Yes |
| check_in_configs | Yes | CheckInConfigEditor → upsertCheckInConfig | Yes |
| progress_photos (table) | Yes | progressPhotoService.uploadPhoto (weekly flow + photos page) | Yes |
| Progress photos (Storage) | Yes | Same uploadPhoto → bucket progress-photos | Yes |

### 3B. Read paths

| Table | UI that reads | Component / page | What’s displayed |
|-------|----------------|-------------------|------------------|
| daily_wellness_logs | Yes | Dashboard, check-ins page, DailyWellnessForm, CheckInHistory, WeeklyCheckInFlow (review), WeeklyComparison, ClientProgressView, analytics page | Today log, 90-day history, calendar, streak, week comparison, coach wellness tab |
| body_metrics | Yes | Body-metrics page, LogMeasurementModal (prefill), WeeklyCheckInCard, WeeklyComparison, StepBodyMetrics, StepReview, ClientProgressView | Charts, last vs current, sparkline, coach body tab |
| mobility_metrics | Yes | Mobility page, (coach FMS if present) | List, add/edit form |
| check_in_configs | Yes | Check-ins page, weekly page, WeeklyCheckInFlow, StepBodyMetrics, StepPhotos, StepReview, CheckInConfigEditor | Frequency, required/optional fields, coach editor |
| progress_photos | Yes | Photos page, body-metrics page (getPhotosForDate), ClientProgressView, weekly flow (getPhotoTimeline for last date) | Timeline, comparison, latest/previous on body-metrics |

### 3C. Orphan / dead components

- **CheckIns** (`src/components/progress/CheckIns.tsx`): Not imported by any route in the audited tree; legacy body check-in list + modal. Superseded by check-ins hub + body-metrics + LogMeasurementModal / weekly flow.
- **DailyWellnessForm streak:** Form keeps local `streak` state but never calls `getCheckinStreak`, so success-view streak is always 0 (cosmetic only; History and dashboard are correct).
- **progressPhotoStorage.ts:** Exists; primary upload/read logic is in progressPhotoService (no evidence of progressPhotoStorage used in the flows audited; may be legacy or alternate entry).

---

## PART 4: FULL USER FLOW WALKTHROUGH

### Flow 1: Client does a daily check-in

1. **Dashboard:** If no log for today, “How are you feeling today?” card with “Check in” (link to `/client/check-ins`). If already logged, “Checked in today” summary + “Edit.”
2. **Tap Check in:** Navigate to `/client/check-ins`.
3. **Form:** DailyWellnessForm with sleep (hours + quality), stress, soreness, steps, notes. Yesterday comparison shown inline. Required: sleep hours, sleep quality, stress, soreness.
4. **Submit:** `upsertDailyLog` → `daily_wellness_logs`. Success card; optional quick weight; optional “Edit.”
5. **Back to dashboard:** User navigates back; on next load dashboard calls `checkTodayCheckIn()` and shows “Checked in today.”
6. **Next day:** Dashboard again shows “Check in” until they submit for that day.

### Flow 2: Client does a weekly (monthly) check-in

1. **Awareness:** Check-ins page shows WeeklyCheckInCard (“Monthly Check-In”); when `daysSinceLast >= 25` it’s “due.” Card links to `/client/check-ins/weekly`.
2. **Start:** User goes to weekly page → WeeklyCheckInFlow.
3. **Steps:** (1) StepBodyMetrics — weight required (if config), optional body fat/circumferences; (2) StepPhotos — optional front/side/back; (3) StepReview — last vs this (weight, BF, waist, wellness averages), notes to coach.
4. **Review comparisons:** “Last check-in” vs “This check-in” table with Change column; wellness this week vs last week if data exists.
5. **Submit:** `upsertMeasurement` → `body_metrics`; for each photo file `uploadPhoto` → Storage + `progress_photos`. Redirect to `/client/check-ins`.
6. **History:** Client can see body history on body-metrics page and weekly comparison on check-ins page (last two measurements + wellness weeks).

### Flow 3: Client views progression over time

1. **Entry:** From check-ins “Body Metrics History” or “Progress Photos” or “Mobility” → `/client/progress/body-metrics`, `/client/progress/photos`, `/client/progress/mobility`. Analytics (wellness trends) at `/client/progress/analytics`.
2. **Charts/comparisons:** Body-metrics: last vs current table, 12M/6M/1M weight (and BF) chart, measurements tab, progress photos for latest/previous dates. Photos: timeline + comparison mode (two dates). Wellness: CheckInHistory (calendar, recent list); analytics page has getWellnessTrends (averages, trends).
3. **“You improved by X”:** StepReview and body-metrics show deltas (▼/▲, %). No single “down Y% from peak” wellness message; body-metrics deltas are between last two measurements.

### Flow 4: Coach reviews client check-in data

1. **Entry:** Coach opens client → progress (e.g. `/coach/clients/[id]/progress`) with ClientProgressView tabs: Wellness, Body Metrics, Photos.
2. **Data:** Wellness (getLogRange, getCompletionStats), Body (getClientMeasurements, latest), Photos (getPhotoTimeline, getComparisonPhotos). All from DB.
3. **Source:** Real DB (Supabase); no localStorage.
4. **Config:** Same progress page includes CheckInConfigEditor (frequency, weight/body fat/photos/notes/circumferences). AddClientCheckInModal adds a body measurement (body_metrics) for the client.

---

## SUMMARY TABLE

| Check-in type      | Collects data? | Persists to DB? | Shows history? | Shows progression/comparison? | Coach can see? |
|--------------------|----------------|-----------------|----------------|--------------------------------|----------------|
| Daily wellness     | Yes            | Yes (daily_wellness_logs) | Yes (CheckInHistory, 90d) | Yes (yesterday inline, this week strip, WeeklyComparison; analytics page trends) | Yes (ClientProgressView) |
| Weekly/Monthly     | Yes            | Yes (body_metrics + progress_photos) | Yes (body-metrics page, WeeklyComparison) | Yes (StepReview + WeeklyComparison + body-metrics) | Yes |
| Body metrics       | Yes            | Yes (body_metrics) | Yes (body-metrics page, charts) | Yes (last vs current, 12M/6M/1M, deltas) | Yes |
| Progress photos    | Yes            | Yes (Storage + progress_photos) | Yes (photos page timeline) | Yes (comparison mode, body-metrics latest/previous) | Yes |
| Mobility           | Yes            | Yes (mobility_metrics) | Yes (list) | Limited (no trend UI) | Via FMS/progress if wired |

---

## TOP ISSUES (ordered by impact)

1. **DailyWellnessForm streak never updated** — Success view shows “X-day check-in streak” but `streak` is never set (no `getCheckinStreak` in form). So form always shows 0. Fix: call `getCheckinStreak` after submit or receive streak from parent.
2. **LogMeasurementModal duplicate date** — Uses `createMeasurement`; if client already has a row for today (e.g. quick weight in daily form or weekly flow), second submit can hit unique (client_id, measured_date) and fail. Consider upsert for “log today’s weight” from modal.
3. **Wellness: no long-range comparison on check-ins page** — No “vs 3 months ago” or month-over-month for sleep/stress/soreness on the main check-in hub; only week-over-week and analytics page. Users may expect a simple “last 3 months” summary on check-ins.
4. **Mobility: no progression UI** — Data stored but no trend or “improved from X to Y” view.
5. **Body metrics: no goal vs current** — No “Target weight: X, Current: Y, Z to go” on body-metrics page; goals are separate (check-in goals).
6. **Orphan CheckIns component** — Unused; can be removed or documented as deprecated to avoid confusion.
7. **progressPhotoStorage vs progressPhotoService** — Two modules; main flows use progressPhotoService. Clarify whether progressPhotoStorage is still required.

---

*End of audit. No code or schema was changed.*

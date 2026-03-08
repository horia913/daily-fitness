# Check-ins System Audit — Read-Only

**Date:** 2025-03-07  
**Scope:** Routes, components, services, database tables, UX flow. No code or schema changes.

---

## PART 1: Check-in Related Routes and Pages

### Client-side (`dailyfitness-app/src/app/client/`)

| Route / File | What it renders | Data loaded | Actions available |
|--------------|-----------------|-------------|-------------------|
| **`/client/check-ins`** — `check-ins/page.tsx` | Check-ins hub: Daily Wellness form, CheckInHistory (streak, calendar, recent entries), “Body & Mobility” cards (Body Metrics, Mobility, Progress Photos), Check-in Goals (pillar `checkins`) | `getTodayLog`, `getLogRange` (90 days), pillar goals (`goals` where `pillar = 'checkins'`) | Submit daily wellness; view history; navigate to Body Metrics, Mobility, Photos; add/manage check-in goals |
| **`/client/progress/body-metrics`** — `progress/body-metrics/page.tsx` | Body metrics hub: last vs current comparison (weight, BF%, muscle, circumferences), progress photos comparison, tabs “Weight & BF” and “Measurements”, measurement charts, link to Progress Photos | `body_metrics` (client_id, date range), progress photos via `ProgressPhotoStorage.getSignedUrl` | Open `LogMeasurementModal` to log measurement (weight required; circumferences, BF, photos optional); view trends/charts |
| **`/client/progress/mobility`** — `progress/mobility/page.tsx` | Mobility assessments list; add/edit modal with `MobilityFormFields` (date, assessment type, type-specific fields, notes) | `MobilityMetricsService.getClientMobilityMetrics(client_id)` → `mobility_metrics` | Create, edit, delete mobility assessments |
| **`/client/progress/photos`** — `progress/photos/page.tsx` | Progress photos: upload (front/side/back), weight/notes; timeline; comparison mode (before/after dates) | `getPhotoTimeline`, `getPhotosForDate`, `getLatestWeightForPhoto` → `progress_photos` + storage | Upload/retake/delete photos; compare two dates; fullscreen view |
| **`/client/progress`** — `progress/page.tsx` | Progress hub: quick stats (workouts, volume, records), nav grid to Analytics, Performance, Body metrics, Mobility, Personal records, Export | `getProgressStats` (workouts, PRs, weight, etc.) | Navigate to body-metrics, mobility, etc. (no direct check-in form here) |

**Notes:**

- There is **no** client route that renders the `CheckIns` component (`src/components/progress/CheckIns.tsx`). That component is **not used** anywhere in client app routes.
- “Check-in” in the app means: (1) **Daily wellness** (sleep, stress, soreness, steps, notes) on `/client/check-ins`, and (2) **Body metrics** (weight, circumferences, etc.) on `/client/progress/body-metrics` via `LogMeasurementModal`.

---

### Coach-side (`dailyfitness-app/src/app/coach/`)

| Route / File | What it renders | Data loaded | Actions available |
|--------------|-----------------|-------------|-------------------|
| **`/coach/clients/[id]/progress`** — `clients/[id]/progress/page.tsx` | “Check-ins & Metrics” header + `ClientProgressView` (tabs: Wellness, Body Metrics, Photos); link to FMS | Per tab: Wellness → `getLogRange`, `getCompletionStats`; Body → `getClientMeasurements`, `getLatestMeasurement`; Photos → `getPhotoTimeline`, `getPhotosForDate` | View only (no coach create/edit for wellness/body/photos); link to FMS |
| **`/coach/adherence`** — `adherence/page.tsx` | Adherence overview; `OptimizedAdherenceTracking` | Workouts + **wellness** (e.g. `daily_wellness_logs` for check-in dates); used for “checkinAdherence” (e.g. 7-day check-in completion) | Filter/export UI; no direct check-in entry |

**Other coach routes:** No other coach pages in the audited tree are dedicated to check-ins, body metrics, wellness, measurements, mobility, or progress photos. Client detail sub-routes (profile, meals, habits, goals, clipcards, analytics, adherence, workouts) do not host the main check-in/wellness/body UI.

---

## PART 2: Check-in Related Components

| Component | File | Purpose | Props | Data read/write |
|-----------|------|---------|-------|-----------------|
| **DailyWellnessForm** | `src/components/client/DailyWellnessForm.tsx` | Daily wellness form: sleep (hours + quality), stress, soreness, steps, notes; optional quick weight; success state + streak | `clientId`, `initialTodayLog?`, `onSuccess?` | Reads: `getTodayLog`, `getLogRange` (yesterday, week), `getLatestMeasurement` (weight today). Writes: `upsertDailyLog` → `daily_wellness_logs`; optional `createMeasurement` → `body_metrics` (weight only) |
| **CheckInHistory** | `src/components/client/CheckInHistory.tsx` | History & stats: current streak, best streak, this month; calendar heatmap; selected date detail; recent entries | `clientId`, `initialLogRange?`, `initialCurrentStreak?`, `initialBestStreak?`, `initialMonthlyStats?` | No direct queries; uses `initialLogRange` etc. from parent (page fetches via `getTodayLog` + `getLogRange`) |
| **LogMeasurementModal** | `src/components/client/LogMeasurementModal.tsx` | Modal to log one body measurement: weight (required), body fat, waist, expandable circumferences, method, notes, optional progress photos (front/side/back) | `clientId`, `onSuccess`, `onClose`, `lastMeasurement?` | Reads: pre-fill from `lastMeasurement`. Writes: `createMeasurement` → `body_metrics`; uploads photos via `ProgressPhotoStorage.uploadPhoto`, then `updateMeasurement(id, { photos })` (if `body_metrics.photos` exists) |
| **CheckIns** | `src/components/progress/CheckIns.tsx` | Full check-in list + detail modal: body metrics + circumferences + photos; create/edit/delete check-in (body_metrics) | `loading?` | Reads: `BodyMetricsService.getClientMetrics` → `body_metrics`. Writes: `BodyMetricsService.createBodyMetrics` / `updateBodyMetrics` / `deleteBodyMetrics`. **Photos:** UI collects them but payload to service does not include photos (see PHASE_S4_AUDIT); component is **not used** in any route |
| **ClientProgressView** | `src/components/coach/client-views/ClientProgressView.tsx` | Coach view: tabs Wellness / Body Metrics / Photos; latest check-in, 7-day averages, history toggles; body latest + history; photos timeline | `clientId` | Reads: Wellness → `getLogRange`, `getCompletionStats`; Body → `getClientMeasurements`, `getLatestMeasurement`; Photos → `getPhotoTimeline`, `getPhotosForDate` (no writes) |
| **MeasurementMiniChart** | `src/components/progress/MeasurementMiniChart.tsx` | Mini chart for a single measurement type over time | Used by body-metrics page | Receives `measurements` (body_metrics) + field name; display only |
| **MobilityFormFields** | `src/components/progress/MobilityFormFields.tsx` | Type-specific mobility fields + photo upload for mobility assessments | Used by mobility page | Used in mobility flow only (not “daily check-in”) |

**Summary:**

- **DailyWellnessForm** and **CheckInHistory** are the main client “check-in” UI (wellness); they are used only on `/client/check-ins`.
- **LogMeasurementModal** is the client body-metrics check-in (used on `/client/progress/body-metrics`).
- **CheckIns** is an orphan component (not imported by any page); it duplicates body-metrics-style check-in and does not persist photos to DB in current code.

---

## PART 3: Database Tables and Data Flow

### Tables present in schema CSV

**body_metrics** (from `Supabase Snippet Public Schema Column Inventory.csv`)

| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| id | uuid | NO | gen_random_uuid() |
| client_id | uuid | NO | null |
| coach_id | uuid | YES | null |
| weight_kg | numeric | YES | null |
| body_fat_percentage | numeric | YES | null |
| muscle_mass_kg | numeric | YES | null |
| visceral_fat_level | integer | YES | null |
| left_arm_circumference | numeric | YES | null |
| right_arm_circumference | numeric | YES | null |
| torso_circumference | numeric | YES | null |
| waist_circumference | numeric | YES | null |
| hips_circumference | numeric | YES | null |
| left_thigh_circumference | numeric | YES | null |
| right_thigh_circumference | numeric | YES | null |
| left_calf_circumference | numeric | YES | null |
| right_calf_circumference | numeric | YES | null |
| measured_date | date | NO | CURRENT_DATE |
| measurement_method | text | YES | null |
| notes | text | YES | null |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

- **Constraint (from Inventory (1).csv):** UNIQUE on `(client_id, measured_date)` (one row per client per day). CHECK: `visceral_fat_level` 0–25 (Inventory (4).csv).
- **RLS (Inventory (2).csv):** Clients can SELECT own; coaches have policy for their clients’ rows (ALL).
- **Note:** The provided schema CSV does **not** list a `photos` column. A migration `20260307_body_metrics_photos.sql` adds `photos text[]`. If that migration is applied, `body_metrics` has a `photos` column; otherwise `LogMeasurementModal`’s `updateMeasurement(..., { photos })` may fail or be a no-op depending on backend.

**mobility_metrics**

| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| id | uuid | NO | gen_random_uuid() |
| client_id | uuid | NO | null |
| coach_id | uuid | YES | null |
| left_shoulder_ir, right_shoulder_ir, left_shoulder_er, right_shoulder_er, left_shoulder_abduction, right_shoulder_abduction | numeric | YES | null |
| left_hip_ir, right_hip_ir, left_hip_er, right_hip_er | numeric | YES | null |
| left_foot_dorsiflexion, right_foot_dorsiflexion | numeric | YES | null |
| assessed_date | date | NO | CURRENT_DATE |
| assessment_type | text | YES | 'manual' |
| notes | text | YES | null |
| created_at, updated_at | timestamp with time zone | YES | now() |
| left_shoulder_flexion, right_shoulder_flexion | numeric | YES | null |
| left_hip_straight_leg_raise, left_hip_knee_to_chest, right_hip_straight_leg_raise, right_hip_knee_to_chest | numeric | YES | null |
| left_ankle_plantar_flexion, right_ankle_plantar_flexion | numeric | YES | null |
| forward_lean, toe_touch, squat_depth | numeric | YES | null |
| photos | ARRAY | YES | null |

- UNIQUE on `(client_id, assessed_date)` (Inventory (1).csv). RLS: client and coach policies for select/insert/update/delete.

**daily_wellness_logs**

- **Not** listed in the provided schema CSV. The app uses it in `wellnessService` (`getTodayLog`, `getLogRange`, `upsertDailyLog`) with columns: `client_id`, `log_date`, `sleep_hours`, `sleep_quality`, `stress_level`, `soreness_level`, `steps`, `notes`, and legacy fields `energy_level`, `mood_rating`, `motivation_level`. Upsert uses `onConflict: "client_id,log_date"`. **Recommend verifying this table and its columns/constraints in the actual DB.**

**progress_photos**

- **Not** in the provided schema CSV. `progressPhotoService` uses table `progress_photos` with `client_id`, `photo_date`, `photo_type`, `photo_url`, `photo_path`, `weight_kg`, `body_fat_percentage`, `notes`, and upsert on `client_id, photo_date, photo_type`. **Recommend verifying in DB.**

**Other related**

- **latest_body_metrics**, **monthly_body_metrics_summary**: views/summaries (schema CSV lists columns); not directly written by app.
- **fms_assessments**: coach FMS flow; separate from “check-in” wellness/body.

---

## PART 4: Check-in Types and Full Flow

### Type 1: Daily wellness (sleep, stress, soreness, steps, notes)

| Step | Detail |
|------|--------|
| **Initiation** | Client goes to `/client/check-ins`. Page shows `DailyWellnessForm` (and CheckInHistory below). |
| **Form/modal** | `DailyWellnessForm`: sleep hours + quality, stress, soreness, steps, notes. All four (sleep hours, sleep quality, stress, soreness) required to count as “complete”; steps and notes optional. Optional quick weight (writes to `body_metrics`). |
| **Table** | `daily_wellness_logs`. Upsert on `(client_id, log_date)` for today. |
| **Validation** | Client-side: required fields; stress/soreness stored as 2,4,6,8,10 (from 1–5 UI). No server-side validation described in code. |
| **View past** | Same page: `CheckInHistory` (calendar, streak, monthly stats, recent entries) from `initialLogRange` (90 days). |
| **Coach view** | `/coach/clients/[id]/progress` → Wellness tab: latest check-in, 7-day averages, “View History” (14 days). |
| **Comparison** | Coach: latest vs 7-day averages; no explicit “last vs current” wellness comparison. |
| **Trend/chart** | No chart; calendar and recent list only. |

### Type 2: Body metrics (weight, circumferences, body fat, photos)

| Step | Detail |
|------|--------|
| **Initiation** | Client goes to `/client/progress/body-metrics` and clicks “Log measurement” / “Log first measurement” (or FAB if present) → opens `LogMeasurementModal`. |
| **Form/modal** | `LogMeasurementModal`: weight (required), body fat, waist, expandable “Add more measurements” (hips, torso, arms, thighs, calves, muscle mass, visceral fat, method, notes), optional progress photos (front/side/back). |
| **Table** | `body_metrics`. One row per client per day (unique on `client_id`, `measured_date`). Photos: if `body_metrics.photos` exists, paths stored there after upload to storage. |
| **Validation** | `measurementService.validateMeasurement`: at least weight or waist; weight 30–300 kg; waist 40–200 cm; body fat 3–60%. Modal requires weight. |
| **View past** | Same page: “Body check-in” (last vs current), tabs Weight & BF and Measurements with charts; progress photos comparison. |
| **Coach view** | `/coach/clients/[id]/progress` → Body Metrics tab: current weight, total change, body fat; latest measurement; “View All Measurements” expandable. |
| **Comparison** | Client: previous vs current (weight, BF%, muscle, circumferences); progress photos side-by-side. Coach: latest + history list (no side-by-side comparison UI). |
| **Trend/chart** | Client: weight sparkline (last 3 months); `MeasurementMiniChart` per circumference. |

### Type 3: Mobility assessments

| Step | Detail |
|------|--------|
| **Initiation** | Client goes to `/client/progress/mobility` → “New Assessment” or “Add First Assessment”. |
| **Form/modal** | Page modal with date, assessment type (shoulder/hip/ankle/spine/overall), `MobilityFormFields` (type-specific angles/values, photos), notes. |
| **Table** | `mobility_metrics`. One row per client per day (unique on `client_id`, `assessed_date`). |
| **Validation** | Date and assessment type; type-specific fields in form. |
| **View past** | Same page: list of assessments with edit/delete. |
| **Coach view** | Not in `ClientProgressView`; coach has FMS at `/coach/clients/[id]/fms`, which is a different flow (fms_assessments). |
| **Comparison / trend** | None in audited code. |

### Type 4: Progress photos (standalone)

| Step | Detail |
|------|--------|
| **Initiation** | Client goes to `/client/progress/photos` → take/select front, side, back; optional weight/notes → Save. |
| **Form** | Inline on page (no modal); slots per type; weight/notes optional. |
| **Table** | `progress_photos` (and storage bucket). Upsert by `client_id`, `photo_date`, `photo_type`. |
| **View past** | Timeline on same page; expand date to see photos; Compare mode (two dates). |
| **Coach view** | `/coach/clients/[id]/progress` → Photos tab: latest photos, photo timeline. |
| **Comparison** | Client: “Compare” picks two dates; before/after layout. |

---

## PART 5: Current UX Assessment

### `/client/check-ins`

- **First impression:** Title “Check-ins”, subtitle “Body metrics, mobility, and reporting”. Daily wellness form or “Check-in complete” state; below that, History & Stats (streak, best, month), calendar, recent entries; then “Body & Mobility” cards (Body Metrics, Mobility, Progress Photos) and Check-in Goals.
- **Taps to complete a wellness check-in:** Open form (if not already) → set sleep, quality, stress, soreness (and optionally steps, notes) → Submit. One page, one submit (plus optional weight prompt).
- **Confusing/unclear:** “Check-in” mixes wellness and body/mobility in one hub; body metrics are not logged here but on another page. “Body & Mobility” are links, so users must leave to log measurements or photos.
- **Missing:** Single place to “do everything” for a check-in (e.g. wellness + weight + photos in one flow); in-app explanation of what “counts” as a check-in for streaks (all four wellness fields).
- **Redundant paths:** Body metrics can be logged from Body Metrics page **or** via optional weight in DailyWellnessForm (weight only); full measurement + photos only from body-metrics page. So two ways to log weight, one way for full body check-in.
- **Mobile (375px):** Layout uses responsive grid and cards; modals use `items-start` and scroll (see MOBILE_DARK_MODE_AUDIT_INVENTORY). No specific 375px issues called out in audited files.

### `/client/progress/body-metrics`

- **First impression:** “Body Metrics” with last updated or “Weight and measurements over time”; if no data, “No measurements yet” and “Log first measurement”. If data: “Body check-in” table (previous vs current), then tabs and charts.
- **Taps to complete a body check-in:** Click “Log measurement” / FAB → fill weight (required), optionally circumferences/photos → Save. One modal, one save.
- **Confusing/unclear:** “Body check-in” vs “Log measurement” wording; “Progress photos” here are from `LogMeasurementModal` (body_metrics.photos) vs Progress Photos page (progress_photos) — two different photo flows.
- **Missing:** Clarification that one row per day (editing = update that day); link back to Check-ins hub for wellness.
- **Redundant paths:** Weight can be logged here or as “quick weight” on check-ins page.
- **Mobile:** Modal is scrollable; table may horizontal scroll on small screens (overflow-x-auto present).

### `/client/progress/mobility`

- **First impression:** “Mobility Metrics” and list of assessments or “No assessments yet” with “New Assessment” / “Add First Assessment”.
- **Taps:** New Assessment → fill date, type, fields, notes → Save. Edit/delete from list.
- **Unclear:** Assessment types (shoulder/hip/ankle/spine/overall) and what to enter per type live in `MobilityFormFields`; no high-level explanation on page.
- **Missing:** Connection to “check-in” (e.g. whether it counts toward adherence); trend or comparison across dates.

### `/client/progress/photos`

- **First impression:** “Progress Photos”, “Take Progress Photos”, three slots (front/side/back), optional weight/notes, then timeline.
- **Taps:** Select/retake photos → optional weight/notes → Save Photos; or open timeline and Compare.
- **Unclear:** Relationship to body-metrics photos (same bucket/different tables) not explained.
- **Missing:** No explicit “check-in” wording; could be clearer how this fits with daily/weekly check-in goals.

### Coach `/coach/clients/[id]/progress`

- **First impression:** “Check-ins & Metrics”, tabs Wellness / Body Metrics / Photos; FMS link. Read-only.
- **Missing:** No way for coach to add or edit a check-in on behalf of client; no side-by-side comparison for body metrics; no explicit compliance “target” (e.g. 5/7 days).

---

## PART 6: Coach-Side Check-in Visibility

| Question | Answer |
|----------|--------|
| **How does the coach see a client’s check-in data?** | Via `/coach/clients/[id]/progress`. Component: `ClientProgressView` with tabs Wellness, Body Metrics, Photos. Data: wellness from `getLogRange` + `getCompletionStats`; body from `getClientMeasurements` + `getLatestMeasurement`; photos from `getPhotoTimeline` + `getPhotosForDate`. |
| **Which component renders it?** | `ClientProgressView` (`src/components/coach/client-views/ClientProgressView.tsx`). |
| **Can the coach add check-ins for the client?** | **No.** No UI in the audited code for coach to create or edit daily_wellness_logs, body_metrics, or progress_photos. Coach can only view. |
| **Comparison view for coach?** | **Limited.** Body: “Latest Measurement” and “View All Measurements” list; no previous-vs-current table. Wellness: latest check-in + 7-day averages; no date-vs-date comparison. Photos: latest set + timeline. |
| **Compliance / adherence for check-ins?** | **Yes, at aggregate level.** `OptimizedAdherenceTracking` (on `/coach/adherence`) uses wellness data: for each client it computes `checkinDates` from wellness rows, `checkinsCompleted` (count of distinct dates in window), and `checkinAdherence` (e.g. 7-day completion %). “Schedule Check-in” appears in that component. No dedicated “check-in compliance” page; adherence combines workouts and check-ins (e.g. overall formula uses workout + checkin adherence). Coach dashboard (`/coach/page.tsx`) uses `lastCheckinDate`, `checkinStreak` for alerts (e.g. `noCheckIn3Days`). |

---

## Summary Table

| Item | Client | Coach |
|------|--------|--------|
| **Daily wellness (sleep, stress, soreness, steps)** | `/client/check-ins` → DailyWellnessForm → `daily_wellness_logs` | View in Progress → Wellness tab; adherence uses wellness dates |
| **Body metrics (weight, circumferences, photos)** | `/client/progress/body-metrics` → LogMeasurementModal → `body_metrics` (photos if column exists) | View in Progress → Body Metrics tab; no add/edit |
| **Mobility** | `/client/progress/mobility` → modal → `mobility_metrics` | Not in ClientProgressView; FMS is separate |
| **Progress photos (standalone)** | `/client/progress/photos` → `progress_photos` + storage | View in Progress → Photos tab |
| **CheckIns component** | Not used (orphan) | Not used |
| **Coach add check-in** | N/A | Not available |

---

## File Paths Quick Reference

- **Pages:**  
  `src/app/client/check-ins/page.tsx`  
  `src/app/client/progress/body-metrics/page.tsx`  
  `src/app/client/progress/mobility/page.tsx`  
  `src/app/client/progress/photos/page.tsx`  
  `src/app/client/progress/page.tsx`  
  `src/app/coach/clients/[id]/progress/page.tsx`  
  `src/app/coach/adherence/page.tsx`

- **Components:**  
  `src/components/client/DailyWellnessForm.tsx`  
  `src/components/client/CheckInHistory.tsx`  
  `src/components/client/LogMeasurementModal.tsx`  
  `src/components/progress/CheckIns.tsx` (unused)  
  `src/components/coach/client-views/ClientProgressView.tsx`  
  `src/components/progress/MeasurementMiniChart.tsx`  
  `src/components/progress/MobilityFormFields.tsx`  
  `src/components/coach/OptimizedAdherenceTracking.tsx`

- **Services:**  
  `src/lib/wellnessService.ts`  
  `src/lib/measurementService.ts`  
  `src/lib/progressPhotoService.ts`  
  `src/lib/progressTrackingService.ts` (BodyMetricsService, MobilityMetricsService)  
  `src/lib/progressPhotoStorage.ts` (used by LogMeasurementModal for body-metrics photos)

- **Schema:**  
  `Supabase Snippet Public Schema Column Inventory.csv` (and related constraint/RLS/check CSVs).  
  `dailyfitness-app/migrations/20260307_body_metrics_photos.sql` (body_metrics.photos).

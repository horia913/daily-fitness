# Check-in / Wellness / Body Metrics — Read-Only Audit Report

**Date:** 2026-02-17  
**Scope:** All check-in, wellness, body metrics, assessments, and progress-tracking screens and data flows.  
**No files were modified.**

---

## 1. Check-in pages (client)

### 1.1 `src/app/client/check-ins/page.tsx`
- **Component/Page name:** `ClientCheckInsPage`
- **Purpose:** Hub page for “Check-ins” — lists links to Body Metrics and Mobility; shows check-in goals (pillar = checkins).
- **Key inputs/outputs:** User selects “Body Metrics” or “Mobility” (navigation). Displays up to 3 active goals with pillar `checkins`; “Add goal” opens `AddGoalModal`; “Manage all goals” goes to `/client/goals`.
- **Data tables touched:** `goals` (SELECT: client_id, pillar = 'checkins', status = 'active').

### 1.2 `src/app/client/page.tsx` (Dashboard)
- **Component/Page name:** `ClientDashboard`
- **Purpose:** Client home: Athlete Score, today’s workout, and a **daily check-in prompt** when the user has not logged a wellness entry for today.
- **Key inputs/outputs:** If `hasCheckInToday === false`, shows “How are you feeling today? Share your energy and mood” with a “Check in” link to `/client/check-ins`. If true, shows “Checked in today” with checkmark. No form here — only link to check-ins hub.
- **Data tables touched:** `daily_wellness_logs` (SELECT id where client_id, log_date = today) — **read-only; no insert/upsert on this page**.

### 1.3 `src/app/client/progress/body-metrics/page.tsx`
- **Component/Page name:** `BodyMetricsPage` / `BodyMetricsPageContent`
- **Purpose:** Body metrics history and logging: weight, waist, body fat over time (chart + list).
- **Key inputs/outputs:** Displays current weight, waist, body fat; month-over-month deltas; 12M/6M/1M chart; history list. “Log measurement” opens `LogMeasurementModal` (weight required; waist, body fat optional).
- **Data tables touched:** `body_metrics` (SELECT: measured_date, weight_kg, waist_circumference, body_fat_percentage for client, last ~84 days).

### 1.4 `src/app/client/progress/mobility/page.tsx`
- **Component/Page name:** `MobilityMetricsPage`
- **Purpose:** Mobility assessments: list by date, add/edit/delete; type (shoulder, hip, ankle, spine, overall) with type-specific fields and photo uploads.
- **Key inputs/outputs:** User picks assessment type; fills numeric fields (degrees) and optional photos/notes; saves to `mobility_metrics`. No client-side FMS here — only mobility.
- **Data tables touched:** `mobility_metrics` (SELECT, INSERT, UPDATE, DELETE via `MobilityMetricsService`).

### 1.5 `src/app/client/progress/page.tsx`
- **Component/Page name:** `ProgressHub` / `ProgressHubContent`
- **Purpose:** Progress hub with links to Analytics, Performance tests, Body metrics, Mobility, Personal records, and Export. No direct wellness/check-in form.
- **Data tables touched:** Indirect via `getProgressStats` (workouts, PRs, leaderboard, etc.). No direct wellness/body_metrics in this page’s queries.

### 1.6 `src/app/client/progress/analytics/page.tsx`
- **Component/Page name:** Analytics page
- **Purpose:** Analytics/charts; includes body composition from body_metrics (weight, body fat over time).
- **Key inputs/outputs:** Reads body_metrics for charts; no check-in or wellness form.
- **Data tables touched:** `body_metrics` (SELECT measured_date, weight_kg, body_fat_percentage), plus goals/workouts for other charts.

### 1.7 `src/app/client/progress/page_new.tsx`
- **Component/Page name:** Alternative progress page with menu (workout logs, personal records, progress photos, charts, measurements, goals).
- **Purpose:** Alternate progress UI; “Progress Photos” view uses `ProgressPhotos` with **placeholder/mock data** (single placeholder photo; onUpload/onShare/onDelete are console.log).
- **Data tables touched:** None for progress photos (mock). Other sections may use real data (e.g. personal records).

---

## 2. Check-in–related components

### 2.1 `src/components/client/LogMeasurementModal.tsx`
- **Component name:** `LogMeasurementModal`
- **Purpose:** Modal to log one body measurement: weight (required), waist (optional), body fat % (optional).
- **Key inputs:** Weight (kg), waist (cm), body fat (%). Uses `createMeasurement()` from `measurementService` with `measured_date: today`.
- **Data tables touched:** `body_metrics` (INSERT via `measurementService.createMeasurement`).

### 2.2 `src/components/progress/CheckIns.tsx`
- **Component name:** `CheckIns`
- **Purpose:** Full check-in form and list: date, weight, body fat, muscle mass, measurements (arms, chest, waist, hips, thighs), photos (front/side/back), notes. Uses `BodyMetricsService` to load/save; maps to `body_metrics` (no photos in DB; comment says “Photos not stored in body_metrics yet”).
- **Key inputs:** Same as above; creates/updates body_metrics rows.
- **Data tables touched:** `body_metrics` (SELECT, INSERT, UPDATE, DELETE via `BodyMetricsService`).
- **Usage:** **Not imported or rendered anywhere** in the app. Orphan component.

### 2.3 `src/components/progress/MobilityFormFields.tsx`
- **Component name:** `MobilityFormFields`
- **Purpose:** Renders assessment-type-specific fields (shoulder, hip, ankle, spine, overall) with reference values and photo upload/delete.
- **Key inputs:** Numeric mobility fields, photos (uploaded via `ProgressPhotoStorage`), notes.
- **Data tables touched:** None directly; parent passes `formData`/`setFormData`; photos go to Supabase Storage bucket `progress-photos` (path `mobility/{clientId}/{recordId}/`). Mobility record (including `photos` array) saved by parent to `mobility_metrics`.

### 2.4 `src/components/progress/ProgressPhotos.tsx`
- **Component name:** `ProgressPhotos`
- **Purpose:** UI for a list of progress photos: grid/timeline, compare before/after, tags, fullscreen. Expects `photos` prop (id, url, date, bodyweight, notes, tags, transformation).
- **Key inputs/outputs:** Display and actions (upload, share, delete) are callback props; no direct DB or storage calls. Used in `page_new.tsx` with **mock data only** (one placeholder photo; callbacks log to console).

---

## 3. Coach-side check-in views

### 3.1 `src/app/coach/clients/[id]/progress/page.tsx`
- **Component/Page name:** Coach client progress page
- **Purpose:** “Check-ins & Metrics” — wrapper that renders `ClientProgressView` for the selected client.
- **Key inputs/outputs:** Header only; content is `ClientProgressView`.

### 3.2 `src/components/coach/client-views/ClientProgressView.tsx`
- **Component name:** `ClientProgressView`
- **Purpose:** Coach view of a client’s “check-ins” and quick actions (e.g. FMS).
- **Key inputs/outputs:** “Check-ins” count and list (weight, body fat, etc.) and “Current Weight” / “Total Change” are loaded from **localStorage** (`checkIns_${clientId}`), not from Supabase. Comment: “Load from localStorage for now (will integrate with database later)”. So coach does **not** see real body_metrics from DB here.
- **Data tables touched:** None (localStorage only). Link to FMS: `/coach/clients/[id]/fms`.

### 3.3 `src/app/coach/clients/[id]/fms/page.tsx`
- **Component/Page name:** FMS Assessment page (coach)
- **Purpose:** Coach-only FMS (Functional Movement Screen): list assessments by date, create/edit/delete, 7 tests (deep squat, hurdle step L/R, inline lunge L/R, shoulder mobility L/R, active straight leg raise L/R, trunk stability pushup, rotary stability L/R), total score, notes, photos.
- **Key inputs/outputs:** Assessment date, 7 test scores (0–3), notes, photos (via `ProgressPhotoStorage`). Uses `FMSAssessmentService` and `progressTrackingService` (FMS interface uses `*_score` suffix in code; DB schema uses names without `_score` — see Database section).
- **Data tables touched:** `fms_assessments` (SELECT, INSERT, UPDATE, DELETE). Photos: Storage bucket `progress-photos`, path `fms/{clientId}/{recordId}/`.

### 3.4 `src/components/coach/OptimizedClientProgress.tsx`
- **Component name:** OptimizedClientProgress
- **Purpose:** Coach “Client Progress” analytics: client selector, weight/body fat/compliance/activity. Body data from `body_metrics` (e.g. weight history).
- **Key inputs/outputs:** Displays client list and per-client metrics; no check-in configuration.
- **Data tables touched:** `body_metrics` (SELECT), plus other metrics (nutrition, habits, workouts).

### 3.5 `src/app/coach/progress/page.tsx`
- **Component name:** Coach progress/analytics
- **Purpose:** Aggregated client progress (streak, weight, body fat, compliance, etc.). Uses `getCurrentWeight`, `getWeightChange`, `getCurrentBodyFat`, `getBodyMetricsHistory(clientId, 3)` from `@/lib/metrics/body`.
- **Data tables touched:** `body_metrics` (via metrics/body). “Schedule Check-ins” / “Schedule Group Check-in” buttons show `alert('Schedule Check-ins feature coming soon!')` — **not implemented**.

**Summary (coach):**
- Coach sees body-style metrics via `body_metrics` in progress/analytics and OptimizedClientProgress.
- Coach does **not** see `daily_wellness_logs` anywhere; the “Check-ins & Metrics” view uses localStorage for “check-ins,” so it’s not real DB data.
- Coach can configure FMS per client (create/edit/delete assessments) but **cannot** configure which check-in or wellness fields a client sees (no such configuration exists).
- No coach UI for wellness logs (energy, mood, stress, etc.).

---

## 4. Check-in API routes

There are **no dedicated API routes** for check-ins, wellness, or body metrics. All client and coach flows use:

- **Direct Supabase client** in the browser (e.g. `supabase.from('body_metrics')`, `supabase.from('daily_wellness_logs')`, etc.).
- **Server-side** only where athlete score or dashboard is computed:
  - **GET `/api/client/athlete-score`** — Returns/computes athlete score; internally uses `athleteScoreService`, which **reads** `daily_wellness_logs` to compute `checkin_completion_score` (days with a row in last 7 days / 7 * 100). No write to wellness.

So:
- **Check-in/wellness:** No API route; dashboard and athlete-score only **read** `daily_wellness_logs`. No API or client code **inserts** into `daily_wellness_logs`.
- **Body metrics:** No API route; client uses `measurementService.createMeasurement` (Supabase insert) and pages use Supabase SELECT directly.
- **Mobility / FMS:** No API route; services use Supabase from client.

---

## 5. Check-in services / hooks

### 5.1 `src/lib/measurementService.ts`
- **Purpose:** Body measurements CRUD and helpers. Used by `LogMeasurementModal` for create.
- **Key functions:** `getClientMeasurements`, `getLatestMeasurement`, `getMeasurementForDate`, `getMeasurementsInRange`, `createMeasurement`, `updateMeasurement`, `deleteMeasurement`, `getMeasurementProgress`, `getMeasurementTrend`, `getChallengeProgress`, `isDueForMeasurement`, `validateMeasurement`.
- **Data tables touched:** `body_metrics` only.

### 5.2 `src/lib/progressTrackingService.ts`
- **Purpose:** Body metrics, goals, achievements, personal records, **mobility_metrics**, **FMS assessments**.
- **Key classes:** `BodyMetricsService`, `GoalsService`, `AchievementsService`, `PersonalRecordsService`, `MobilityMetricsService`, `FMSAssessmentService`. All use Supabase client; no server-only APIs.
- **Data tables touched:** `body_metrics`, `goals`, `achievements`, `personal_records`, `mobility_metrics`, `fms_assessments`.

### 5.3 `src/lib/athleteScoreService.ts`
- **Purpose:** Computes athlete score (workout, program, **checkin**, goals, nutrition). Check-in component: `calculateCheckinCompletionScore` — counts distinct `log_date` in `daily_wellness_logs` in the last 7 days; score = (days / 7) * 100.
- **Data tables touched:** `daily_wellness_logs` (SELECT only). No insert/update/delete.

### 5.4 `src/lib/progressPhotoStorage.ts`
- **Purpose:** Upload/delete photos for progress records. Bucket: `progress-photos`. Path pattern: `{recordType}/{clientId}/{recordId}/{fileName}`; recordType in `'body-metrics' | 'mobility' | 'fms'`.
- **Data tables touched:** None (Storage only). No DB table for “progress_photos”; URLs stored in `mobility_metrics.photos`, `fms_assessments.photos`, or similar JSON/array columns.

### 5.5 Hooks
- **`src/hooks/useMeasurements.ts`** — Exposes measurements and “due for measurement” for body metrics; no wellness/check-in.
- No hooks found that specifically load/save daily wellness or check-in forms.

---

## 6. Database tables (check-in / wellness / body / assessments)

### 6.1 `daily_wellness_logs` (migration `20260201_tracking_tables_and_admin_permissions.sql`)
| Column            | Type      | Nullable | Default        |
|-------------------|-----------|----------|----------------|
| id                | uuid      | NO       | gen_random_uuid() |
| client_id         | uuid      | NO       | FK profiles(id) |
| log_date          | date      | NO       | CURRENT_DATE   |
| energy_level      | integer   | YES      | 1–10           |
| mood_rating      | integer   | YES      | 1–10           |
| stress_level      | integer   | YES      | 1–10           |
| motivation_level  | integer   | YES      | 1–10           |
| soreness_level    | integer   | YES      | 1–10           |
| notes             | text      | YES      |                |
| created_at        | timestamptz | YES    | now()          |

- Constraint: `UNIQUE (client_id, log_date)` (one row per client per day).
- RLS enabled. **No columns for sleep, water, or steps** in this table (those are in other tables in the same migration).

### 6.2 `body_metrics` (Supabase schema CSV)
| Column                     | Type      | Nullable |
|----------------------------|-----------|----------|
| id                         | uuid      | NO       |
| client_id                  | uuid      | NO       |
| coach_id                   | uuid      | YES      |
| weight_kg                  | numeric   | YES      |
| body_fat_percentage        | numeric   | YES      |
| muscle_mass_kg             | numeric   | YES      |
| visceral_fat_level         | integer   | YES      |
| left_arm_circumference     | numeric   | YES      |
| right_arm_circumference    | numeric   | YES      |
| torso_circumference        | numeric   | YES      |
| waist_circumference        | numeric   | YES      |
| hips_circumference         | numeric   | YES      |
| left_thigh_circumference   | numeric   | YES      |
| right_thigh_circumference | numeric   | YES      |
| left_calf_circumference    | numeric   | YES      |
| right_calf_circumference   | numeric   | YES      |
| measured_date              | date      | NO       |
| measurement_method         | text      | YES      |
| notes                      | text      | YES      |
| created_at, updated_at     | timestamptz | YES    |

- Unique: (client_id, measured_date) — one row per client per day. No dedicated progress_photos table; photos can be stored in Storage and referenced elsewhere (e.g. CheckIns component intended photos but they are not in body_metrics).

### 6.3 `mobility_metrics` (Supabase schema CSV)
- Columns include: id, client_id, coach_id, assessed_date, assessment_type, left/right shoulder/hip/ankle fields (e.g. left_shoulder_ir, right_hip_er), forward_lean, toe_touch, squat_depth, photos (ARRAY), notes, created_at, updated_at.

### 6.4 `fms_assessments` (Supabase schema CSV)
- Columns: id, client_id, coach_id, total_score, assessed_date, assessor_certified, notes, pain_points (ARRAY), created_at, updated_at.
- Score columns in **schema**: `deep_squat`, `hurdle_step_left`, `hurdle_step_right`, `inline_lunge_left`, `inline_lunge_right`, `shoulder_mobility_left`, `shoulder_mobility_right`, `active_straight_leg_raise_left`, `active_straight_leg_raise_right`, `trunk_stability_pushup`, `rotary_stability_left`, `rotary_stability_right` (all integer, 0–3). **Code** in `progressTrackingService` and coach FMS page uses `deep_squat_score`, `hurdle_step_left_score`, etc. If the DB columns are actually without `_score`, inserts/updates from the app could fail or rely on Supabase defaulting; this should be verified against the live DB.

---

## 7. Current user flow (client)

### 7.1 How the client reaches “check-in”
- **Dashboard:** If there is no row in `daily_wellness_logs` for today, a card says “How are you feeling today? Share your energy and mood” with a “Check in” button linking to **`/client/check-ins`**.
- **Navigation:** Client can also go to Check-ins via app nav (if present) or Progress; from Progress hub they can go to Body metrics or Mobility.

### 7.2 What “Check in” actually does
- **`/client/check-ins`** is a **hub**: it does **not** show a wellness form. It shows two tiles: “Body Metrics” and “Mobility.” So the dashboard prompt (“Share your energy and mood”) leads to a page that **does not** collect energy/mood at all. There is **no UI that inserts into `daily_wellness_logs`** anywhere in the codebase.

### 7.3 Body metrics flow
- Client goes to **Progress → Body metrics** (or Check-ins → Body Metrics).
- Sees history (weight, waist, body fat) and chart. Clicks “Log measurement” or FAB → `LogMeasurementModal` opens.
- Enters weight (required), optional waist and body fat; submits → `createMeasurement()` → insert into `body_metrics` for today. One row per client per day (unique on client_id, measured_date).

### 7.4 Progress photos
- **Progress hub (main)** does not link to a progress-photos page.
- **`page_new.tsx`** has a “Progress Photos” view that uses **mock data** and placeholder image; upload/share/delete only log to console. No DB or storage integration for a dedicated “progress photos” flow.

### 7.5 Mobility
- Client: **Progress → Mobility**. Add assessment (type: shoulder/hip/ankle/spine/overall), fill degrees and optional photos/notes → saved to `mobility_metrics`. Photos uploaded to Storage.

### 7.6 Formal assessments (FMS)
- **Client:** No FMS UI for clients. FMS is coach-only at `/coach/clients/[id]/fms`.
- **Coach:** Creates/edits/deletes FMS assessments; scores 0–3 per test; optional notes and photos.

### 7.7 Check-in scheduling / frequency
- No scheduling of “check-in” frequency. Dashboard only checks “is there a row for today?” and shows the prompt or “Checked in today”. No reminder/notification for wellness check-in (workout and goal reminders exist elsewhere).

### 7.8 After “check-in”
- Because no wellness form exists, the only way `hasCheckInToday` can become true is if a row is inserted into `daily_wellness_logs` by some other means (e.g. manual DB, future feature, or script). So in the current UI, after tapping “Check in” the user lands on the hub; they can log body metrics or mobility, but **that does not** create a `daily_wellness_logs` row, so the dashboard would still show the prompt next time.
- If a wellness row did exist: dashboard would show “Checked in today”; athlete score’s check-in component would count that day in the last 7 days and increase `checkin_completion_score`. No explicit confirmation screen or coach notification for wellness.

---

## 8. Answers to specific questions

1. **How many different “check-in” or “logging” entry points?**  
   - **Wellness (energy/mood):** 0 — no UI that writes to `daily_wellness_logs`.  
   - **Body metrics:** 1 — Body Metrics page + `LogMeasurementModal`.  
   - **Mobility:** 1 — Mobility page (assessments + photos).  
   - **Progress photos:** 1 entry point in `page_new.tsx` but mock-only; no real persistence.  
   - **Assessments (FMS):** Coach-only; client has no FMS entry.  
   So: **separate flows**; no unified “daily check-in” that does wellness + body + photos in one.

2. **What fields does the daily wellness log capture (backend)?**  
   `daily_wellness_logs`: energy_level, mood_rating, stress_level, motivation_level, soreness_level (all 1–10), notes. No sleep, water, or steps in this table (they exist in other tracking tables).

3. **Is there a check-in streak or consistency tracker for wellness?**  
   **No.** The dashboard “streak” is from `clientDashboardService.calculateStreak` and is based on **workout completion** (consecutive days with completed workouts), not wellness logs. Habits have their own streak. There is no wellness-check-in streak.

4. **Does the Athlete Score factor in check-in data? How?**  
   **Yes.** `checkin_completion_score` = (number of distinct days with at least one row in `daily_wellness_logs` in the last 7 days) / 7 * 100. So it’s “days with wellness log” in the rolling week. Because there is no UI to create those rows, this score is effectively 0 for typical users unless data is added by other means.

5. **Can coaches customize which check-in fields their clients see?**  
   **No.** There is no configuration or feature for coaches to choose which check-in or wellness fields a client sees. Coach sees body-style data via `body_metrics` and FMS; no coach UI for wellness logs.

6. **Is there a check-in reminder/notification system?**  
   **No** for wellness/check-in. Workout and goal reminders exist (`onesignalSender`, coach notifications, habit reminder_time); nothing triggers “time to do your daily check-in”.

7. **Biggest gap: backend can store vs what UI lets clients input?**  
   - **Wellness:** Backend has `daily_wellness_logs` (energy, mood, stress, motivation, soreness, notes). **UI has no form or API that inserts into this table.** Dashboard and athlete score read it, but users cannot create records.  
   - **Body metrics:** Backend has full circumferences (arms, torso, waist, hips, thighs, calves), muscle_mass_kg, visceral_fat_level, measurement_method, notes. **Client UI only collects weight, waist, body fat** in `LogMeasurementModal`. The richer `CheckIns` component (which could use more fields) is unused and does not persist photos to DB.

8. **Broken / half-built / unimplemented references?**  
   - **Daily wellness:** Dashboard prompts “Check in” and links to `/client/check-ins`, but that page never creates `daily_wellness_logs` — **broken flow**.  
   - **Coach “Check-ins & Metrics”:** Uses **localStorage** for check-ins, not `body_metrics` — **half-built**; comment says “will integrate with database later”.  
   - **Progress photos:** `page_new.tsx` uses **mock data** and console.log callbacks — **unimplemented** for real storage/DB.  
   - **Schedule Check-ins:** Coach progress page has “Schedule Check-ins” and “Schedule Group Check-in” that **alert “coming soon”** — **unimplemented**.  
   - **CheckIns component:** Full body + photos form exists but is **never imported** — orphan; photos not stored in body_metrics.  
   - **FMS column names:** Code uses `*_score`; schema CSV has no `_score` — possible **schema/code mismatch** to confirm against live DB.

---

## 9. File tree (check-in / wellness / body metrics / assessments / progress tracking)

```
src/
├── app/
│   ├── client/
│   │   ├── page.tsx                          # Dashboard + check-in prompt
│   │   ├── check-ins/
│   │   │   └── page.tsx                      # Check-ins hub (body + mobility links)
│   │   └── progress/
│   │       ├── page.tsx                      # Progress hub
│   │       ├── page_new.tsx                  # Alt progress (mock progress photos)
│   │       ├── body-metrics/
│   │       │   └── page.tsx                  # Body metrics list + chart
│   │       ├── mobility/
│   │       │   └── page.tsx                  # Mobility assessments
│   │       └── analytics/
│   │           └── page.tsx                  # Analytics (uses body_metrics)
│   ├── coach/
│   │   ├── clients/
│   │   │   └── [id]/
│   │   │       ├── progress/
│   │   │       │   └── page.tsx              # Check-ins & Metrics wrapper
│   │   │       └── fms/
│   │   │           └── page.tsx             # FMS assessments (coach)
│   │   └── progress/
│   │       └── page.tsx                      # Coach progress (body metrics, “Schedule Check-ins” coming soon)
│   └── api/
│       └── client/
│           └── athlete-score/
│               └── route.ts                 # GET; uses wellness for score
├── components/
│   ├── client/
│   │   └── LogMeasurementModal.tsx          # Log weight/waist/body fat
│   ├── progress/
│   │   ├── CheckIns.tsx                     # Orphan: full check-in form (not used)
│   │   ├── MobilityFormFields.tsx           # Mobility form + photos
│   │   └── ProgressPhotos.tsx               # Progress photos UI (used with mock in page_new)
│   └── coach/
│       ├── client-views/
│       │   └── ClientProgressView.tsx       # Coach check-ins view (localStorage)
│       ├── OptimizedClientProgress.tsx      # Client progress (body_metrics)
│       └── OptimizedDetailedReports.tsx    # Reports (body_metrics)
├── lib/
│   ├── measurementService.ts                # body_metrics CRUD
│   ├── progressTrackingService.ts           # body_metrics, mobility, FMS services
│   ├── athleteScoreService.ts               # Reads daily_wellness_logs for score
│   ├── progressPhotoStorage.ts              # Storage upload/delete (progress-photos bucket)
│   ├── mobilityReferenceValues.ts           # Mobility reference values
│   └── metrics/
│       └── body.ts                          # getCurrentWeight, getBodyMetricsHistory, etc.
├── hooks/
│   └── useMeasurements.ts                   # Measurements + “due” (body only)
migrations/
└── 20260201_tracking_tables_and_admin_permissions.sql   # daily_wellness_logs, RLS, indexes
```

**Supabase schema (reference):**  
`Supabase Snippet Public Schema Column Inventory.csv` (and related CSVs) — body_metrics, mobility_metrics, fms_assessments.  
`daily_wellness_logs` is defined in the migration above; not in the provided schema CSVs.

---

**End of audit. No files were modified.**

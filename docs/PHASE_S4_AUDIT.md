# Phase S4: Check-ins Comparison View — Audit (Step 0)

**Date:** Pre-implementation audit per plan.

## Body metrics

- **Schema:** `body_metrics` has no `photos` column. Columns: id, client_id, coach_id, weight_kg, body_fat_percentage, muscle_mass_kg, visceral_fat_level, circumferences (left_arm, right_arm, torso, waist, hips, left_thigh, right_thigh, left_calf, right_calf), measured_date, measurement_method, notes, created_at, updated_at.
- **Client:** Body metrics page at `src/app/client/progress/body-metrics/page.tsx`; logging via `LogMeasurementModal` → `measurementService.createMeasurement`. No photo fields in modal or service.
- **Coach:** `CheckIns.tsx` has progress photo UI (front/side/back) but stores photos only in local state as data URLs; on save, `bodyMetricsData` does not include photos and DB mapping uses `photos: []`. Photos are lost on save.

## Daily wellness

- `daily_wellness_logs` used via `wellnessService` (getTodayLog, getLogRange, upsertDailyLog). `DailyWellnessForm` on client check-ins page; no “yesterday” reference or 7-day strip.

## Progress photos storage

- `progressPhotoStorage.ts` uses bucket `progress-photos`, path `{recordType}/{clientId}/{recordId}/{fileName}`, and **getPublicUrl** (public bucket assumption). Spec requires private bucket and **signed URLs** (same pattern as meal photos: `createSignedUrl`).
- Existing migration `20260217_progress_photos_storage_policies.sql` uses path segment `[1] = auth.uid()` (first folder = user id). Our path uses first segment = recordType (e.g. `body-metrics`), so additional policies for path segment `[2] = client_id` are needed for body-metrics uploads/reads.

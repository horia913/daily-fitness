-- =====================================================================
-- PROGRAM SPINE REBUILD — PASTE #1b: make instance content a faithful
-- mirror of the master content model (group model).
-- Run manually in the Supabase SQL editor, AFTER paste #1. One transaction.
--
-- Additive + a type fix on an empty table (data was wiped in paste #1):
--   - program_instance_set_entries: add group-model columns; fix reps_per_set
--     to text (master workout_set_entries.reps_per_set is varchar).
--   - program_instance_set_entry_exercises: add ALL group-model columns.
--   - NEW program_instance_set_prescriptions (mirror of workout_set_prescriptions).
--   - Drop the program_id+client_id uniqueness so re-assign creates a fresh
--     instance (D8). See note below — pulled forward from step 10 because the
--     assign RPC's fresh-instance semantics require it.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) program_instance_set_entries — mirror workout_set_entries
-- ---------------------------------------------------------------------
-- Type fix: master workout_set_entries.reps_per_set is varchar; the instance
-- must hold the real value. Table is empty (wiped), so this is safe.
ALTER TABLE public.program_instance_set_entries
  ALTER COLUMN reps_per_set TYPE text USING reps_per_set::text;

ALTER TABLE public.program_instance_set_entries
  ADD COLUMN IF NOT EXISTS rounds_driver text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS interval_seconds integer,
  ADD COLUMN IF NOT EXISTS time_cap_seconds integer,
  ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------
-- 2) program_instance_set_entry_exercises — mirror workout_set_entry_exercises
--    (full group model). Already present: exercise_id, exercise_order,
--    exercise_letter, sets, reps, weight_kg, rir, tempo, rest_seconds,
--    load_percentage, notes, source_set_entry_exercise_id, created_at.
-- ---------------------------------------------------------------------
ALTER TABLE public.program_instance_set_entry_exercises
  ADD COLUMN IF NOT EXISTS measurement text NOT NULL DEFAULT 'reps',
  ADD COLUMN IF NOT EXISTS technique text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS work_seconds integer,
  ADD COLUMN IF NOT EXISTS distance_meters numeric,
  ADD COLUMN IF NOT EXISTS target_time_seconds integer,
  ADD COLUMN IF NOT EXISTS target_pace_seconds_per_km numeric,
  ADD COLUMN IF NOT EXISTS target_speed_pct numeric,
  ADD COLUMN IF NOT EXISTS hr_zone text,
  ADD COLUMN IF NOT EXISTS target_hr_pct numeric,
  ADD COLUMN IF NOT EXISTS drop_percentage numeric,
  ADD COLUMN IF NOT EXISTS max_drops integer,
  ADD COLUMN IF NOT EXISTS reps_per_cluster integer,
  ADD COLUMN IF NOT EXISTS clusters_per_set integer,
  ADD COLUMN IF NOT EXISTS intra_cluster_rest_seconds integer,
  ADD COLUMN IF NOT EXISTS rest_pause_seconds integer,
  ADD COLUMN IF NOT EXISTS max_rest_pauses integer,
  ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------
-- 3) program_instance_set_prescriptions — mirror workout_set_prescriptions,
--    keyed to the INSTANCE exercise row.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.program_instance_set_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL
    REFERENCES public.program_instance_set_entry_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  reps varchar,
  weight_kg numeric,
  load_percentage numeric,
  rir integer,
  tempo varchar,
  work_seconds integer,
  distance_meters numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pisp_slot
  ON public.program_instance_set_prescriptions(slot_id);

-- ---------------------------------------------------------------------
-- 4) Re-assign = fresh instance (D8). The assign RPC always inserts a NEW
--    program_assignments row; the legacy UNIQUE(program_id, client_id) would
--    block re-assigning the same program to the same client. Drop it now.
--    (The one-ACTIVE-program-per-client index uq_one_active_program_per_client
--    is KEPT.) NOTE: this is the constraint-drop portion of step 10, pulled
--    forward because the RPC depends on it; the TS id-reuse/reset-run-data
--    removal still happens in step 10.
-- ---------------------------------------------------------------------
ALTER TABLE public.program_assignments
  DROP CONSTRAINT IF EXISTS program_assignments_program_id_client_id_key;

COMMIT;

-- Sanity (optional):
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='program_instance_set_entry_exercises'
--  ORDER BY ordinal_position;

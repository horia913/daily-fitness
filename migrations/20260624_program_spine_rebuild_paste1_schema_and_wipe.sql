-- =====================================================================
-- PROGRAM SPINE REBUILD — PASTE #1: schema build + wipe (clean build)
-- Run manually in the Supabase SQL editor. One paste, one transaction.
--
-- Maintenance mode: loss of existing assignment/run/history data is
-- ACCEPTED. This is NOT a migration. It wipes run/assignment/history
-- data and builds the new per-client instance schema. Authoring
-- templates (workout_programs, training_blocks, program_schedule,
-- workout_templates, workout_set_entries, workout_set_entry_exercises,
-- program_progression_rules, exercises) are KEPT intact.
--
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards. (The TRUNCATE
-- is idempotent — re-running just clears already-empty tables.)
--
-- This paste does NOT drop any old columns and does NOT add the final
-- NOT NULL / unique constraints. Those happen in paste #2A / #2B AFTER
-- the new write/read paths are proven at the verification gate.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- PART 1 — WIPE assignment + run + history data (clean slate)
-- ---------------------------------------------------------------------
-- TRUNCATE ... CASCADE clears the named tables AND every table that has
-- a foreign key referencing them. Because all of these are *children*
-- of the authoring tables, CASCADE only flows DOWNWARD into run/history
-- data — it never touches workout_programs / training_blocks /
-- program_schedule / workout_templates / workout_set_entries /
-- workout_set_entry_exercises / program_progression_rules / exercises.
--
-- In addition to the named tables, CASCADE will also clear dependent
-- run-data tables, including (non-exhaustive):
--   workout_set_entry_completions, workout_exercise_logs,
--   personal_records, workout_assignments, coach_week_reviews,
--   program_week_time_override, daily_workout_cache.
-- This is intended: a fully clean run/history state.
TRUNCATE TABLE
  public.program_assignments,
  public.program_day_assignments,
  public.client_program_progression_rules,
  public.program_day_completions,
  public.program_progress,
  public.workout_sessions,
  public.workout_logs,
  public.workout_set_logs
CASCADE;

-- ---------------------------------------------------------------------
-- PART 2 — CREATE new client-owned instance tables
-- ---------------------------------------------------------------------

-- 2.1 Instance phases (copy of training_blocks for one instance)
CREATE TABLE IF NOT EXISTS public.program_instance_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_assignment_id uuid NOT NULL
    REFERENCES public.program_assignments(id) ON DELETE CASCADE,
  source_training_block_id uuid NULL,              -- provenance only, NO FK (master may be deleted)
  name text NOT NULL,
  goal text NOT NULL DEFAULT 'custom',
  custom_goal_label text,
  duration_weeks integer NOT NULL DEFAULT 1 CHECK (duration_weeks >= 1),
  phase_order integer NOT NULL DEFAULT 1,
  progression_profile text DEFAULT 'none',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.2 Instance workouts (copy of workout_templates used by this instance)
CREATE TABLE IF NOT EXISTS public.program_instance_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_assignment_id uuid NOT NULL
    REFERENCES public.program_assignments(id) ON DELETE CASCADE,
  source_template_id uuid NULL,                    -- provenance only, NO FK
  name text NOT NULL,
  description text,
  estimated_duration integer,
  category text,                                   -- template category (kept), not program category
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.3 Instance set entries (copy of workout_set_entries)
CREATE TABLE IF NOT EXISTS public.program_instance_set_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_instance_workout_id uuid NOT NULL
    REFERENCES public.program_instance_workouts(id) ON DELETE CASCADE,
  source_set_entry_id uuid NULL,                   -- provenance only, NO FK
  set_order integer NOT NULL DEFAULT 1,
  set_name text,
  set_notes text,
  set_type text NOT NULL DEFAULT 'straight_set',
  total_sets integer,
  reps_per_set integer,
  duration_seconds integer,
  rest_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.4 Instance set-entry exercises (copy of workout_set_entry_exercises;
--     exercise_id references the GLOBAL exercises catalog — not copied)
CREATE TABLE IF NOT EXISTS public.program_instance_set_entry_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_instance_set_entry_id uuid NOT NULL
    REFERENCES public.program_instance_set_entries(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id),
  source_set_entry_exercise_id uuid NULL,          -- provenance only
  exercise_order integer NOT NULL DEFAULT 1,
  exercise_letter text,
  sets integer,
  reps text,
  weight_kg numeric,
  rir integer,
  tempo text,
  rest_seconds integer,
  load_percentage numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.5 Instance set-entry protocols (consolidated JSONB — D9)
--     Self-contained protocol params, read/written whole, never queried into.
CREATE TABLE IF NOT EXISTS public.program_instance_set_entry_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_instance_set_entry_id uuid NOT NULL
    REFERENCES public.program_instance_set_entries(id) ON DELETE CASCADE,
  protocol_type text NOT NULL,                     -- 'dropset' | 'cluster' | 'timed' | 'speed' | 'endurance' | ...
  protocol_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- PART 3 — ADD new nullable columns to existing tables
-- ---------------------------------------------------------------------

-- 3.1 program_day_assignments becomes the instance schedule row +
--     completion key. Add phase link, canonical week_number, and the
--     instance workout link.
ALTER TABLE public.program_day_assignments
  ADD COLUMN IF NOT EXISTS program_instance_phase_id uuid NULL
    REFERENCES public.program_instance_phases(id) ON DELETE SET NULL;

ALTER TABLE public.program_day_assignments
  ADD COLUMN IF NOT EXISTS week_number integer NULL;

ALTER TABLE public.program_day_assignments
  ADD COLUMN IF NOT EXISTS program_instance_workout_id uuid NULL;

-- FK for program_instance_workout_id (guarded — add only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pda_instance_workout_fk'
  ) THEN
    ALTER TABLE public.program_day_assignments
      ADD CONSTRAINT pda_instance_workout_fk
      FOREIGN KEY (program_instance_workout_id)
      REFERENCES public.program_instance_workouts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3.2 client_program_progression_rules — re-point structural refs onto
--     the instance (added now, populated by the new assign RPC; old
--     block_* columns kept transitionally, dropped in paste #2B).
ALTER TABLE public.client_program_progression_rules
  ADD COLUMN IF NOT EXISTS program_instance_set_entry_id uuid NULL
    REFERENCES public.program_instance_set_entries(id) ON DELETE CASCADE;

ALTER TABLE public.client_program_progression_rules
  ADD COLUMN IF NOT EXISTS program_instance_phase_id uuid NULL
    REFERENCES public.program_instance_phases(id) ON DELETE SET NULL;

-- 3.3 History tables key to the instance schedule row (program_day_assignments.id).
--     Old program_schedule_id columns stay until paste #2B so the codebase
--     remains buildable while read paths are swapped.
ALTER TABLE public.program_day_completions
  ADD COLUMN IF NOT EXISTS program_day_assignment_id uuid NULL
    REFERENCES public.program_day_assignments(id) ON DELETE CASCADE;

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS program_day_assignment_id uuid NULL
    REFERENCES public.program_day_assignments(id) ON DELETE SET NULL;

ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS program_day_assignment_id uuid NULL
    REFERENCES public.program_day_assignments(id) ON DELETE SET NULL;

-- 3.4 The new instance-keyed write path (step 4) does NOT populate the
--     legacy master program_schedule_id. Relax its NOT NULL now so writes
--     succeed before the column is dropped in paste #2B.
ALTER TABLE public.program_day_completions
  ALTER COLUMN program_schedule_id DROP NOT NULL;

-- ---------------------------------------------------------------------
-- PART 4 — INDEXES for the new tables / columns
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pip_assignment_order
  ON public.program_instance_phases(program_assignment_id, phase_order);

CREATE INDEX IF NOT EXISTS idx_piw_assignment
  ON public.program_instance_workouts(program_assignment_id);

CREATE INDEX IF NOT EXISTS idx_pise_workout_order
  ON public.program_instance_set_entries(program_instance_workout_id, set_order);

CREATE INDEX IF NOT EXISTS idx_pisee_set_entry
  ON public.program_instance_set_entry_exercises(program_instance_set_entry_id);

CREATE INDEX IF NOT EXISTS idx_pisep_set_entry
  ON public.program_instance_set_entry_protocols(program_instance_set_entry_id);

CREATE INDEX IF NOT EXISTS idx_pda_instance_phase
  ON public.program_day_assignments(program_instance_phase_id);

CREATE INDEX IF NOT EXISTS idx_pda_instance_workout
  ON public.program_day_assignments(program_instance_workout_id);

CREATE INDEX IF NOT EXISTS idx_pda_assignment_week
  ON public.program_day_assignments(program_assignment_id, week_number);

CREATE INDEX IF NOT EXISTS idx_cppr_instance_set_entry
  ON public.client_program_progression_rules(program_instance_set_entry_id);

CREATE INDEX IF NOT EXISTS idx_cppr_instance_phase
  ON public.client_program_progression_rules(program_instance_phase_id);

CREATE INDEX IF NOT EXISTS idx_pdc_program_day_assignment
  ON public.program_day_completions(program_day_assignment_id);

CREATE INDEX IF NOT EXISTS idx_wl_program_day_assignment
  ON public.workout_logs(program_day_assignment_id);

CREATE INDEX IF NOT EXISTS idx_ws_program_day_assignment
  ON public.workout_sessions(program_day_assignment_id);

COMMIT;

-- =====================================================================
-- POST-RUN SANITY CHECK (optional — run separately to confirm)
-- =====================================================================
-- SELECT
--   (SELECT count(*) FROM public.program_assignments)              AS assignments,
--   (SELECT count(*) FROM public.program_day_assignments)          AS instance_schedule_rows,
--   (SELECT count(*) FROM public.program_day_completions)          AS completions,
--   (SELECT count(*) FROM public.workout_logs)                     AS logs,
--   (SELECT count(*) FROM public.workout_set_logs)                 AS set_logs,
--   (SELECT count(*) FROM public.program_instance_phases)          AS instance_phases,
--   (SELECT count(*) FROM public.program_instance_workouts)        AS instance_workouts,
--   (SELECT count(*) FROM public.workout_programs)                 AS programs_kept,
--   (SELECT count(*) FROM public.training_blocks)                  AS blocks_kept,
--   (SELECT count(*) FROM public.program_schedule)                 AS master_schedule_kept;
-- Expect: first 7 = 0, last 3 = unchanged (templates intact).

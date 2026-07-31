-- ============================================================================
-- PR 1 — workout_assignments: program-execution discriminator
-- Date: 2026-05-30
--
-- Adds a deterministic discriminator that distinguishes program-execution
-- assignment rows (created by client Start / coach pickup) from true coach
-- standalone assignments.
--
--   program_assignment_id IS NULL      -> standalone (coach-assigned extra)
--   program_assignment_id IS NOT NULL  -> program-execution row
--
-- This PR only introduces + populates the column. NO reader behaviour changes
-- here (that is PR 2). After this migration the data is correctly classified
-- but nothing should look different to coaches or clients.
--
-- NOTE on the contract: the tracked CSV column inventory is stale and does not
-- list workout_logs.program_assignment_id / program_schedule_id, but those
-- columns DO exist in production (verified via information_schema). The backfill
-- below relies on workout_logs.program_assignment_id as the primary source.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Column
-- ----------------------------------------------------------------------------
ALTER TABLE public.workout_assignments
  ADD COLUMN IF NOT EXISTS program_assignment_id uuid NULL;

COMMENT ON COLUMN public.workout_assignments.program_assignment_id IS
  'Discriminator: NULL = true standalone (coach-assigned extra); NOT NULL = '
  'program-execution row created by client Start / coach pickup. References '
  'program_assignments(id) ON DELETE SET NULL so removing a program assignment '
  'demotes its execution rows to standalone rather than deleting workout history.';

-- ----------------------------------------------------------------------------
-- 2. Foreign key (idempotent, ON DELETE SET NULL)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workout_assignments_program_assignment_id_fkey'
  ) THEN
    ALTER TABLE public.workout_assignments
      ADD CONSTRAINT workout_assignments_program_assignment_id_fkey
      FOREIGN KEY (program_assignment_id)
      REFERENCES public.program_assignments(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Index (covers both equality lookups and IS NULL standalone filters)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_workout_assignments_program_assignment_id
  ON public.workout_assignments (program_assignment_id);

-- ----------------------------------------------------------------------------
-- 4. Backfill — source 1 (preferred): workout_logs.program_assignment_id
--    Explicit, deterministic. DISTINCT ON keeps the earliest log per assignment
--    so re-runs are stable.
-- ----------------------------------------------------------------------------
UPDATE public.workout_assignments wa
SET program_assignment_id = src.program_assignment_id
FROM (
  SELECT DISTINCT ON (wl.workout_assignment_id)
         wl.workout_assignment_id AS wa_id,
         wl.program_assignment_id
  FROM public.workout_logs wl
  WHERE wl.program_assignment_id IS NOT NULL
  ORDER BY wl.workout_assignment_id, wl.started_at ASC
) src
WHERE wa.id = src.wa_id
  AND wa.program_assignment_id IS NULL;

-- ----------------------------------------------------------------------------
-- 5. Backfill — source 2 (fallback): program_day_assignments bridge
--    Only fills rows still NULL after source 1.
-- ----------------------------------------------------------------------------
UPDATE public.workout_assignments wa
SET program_assignment_id = src.program_assignment_id
FROM (
  SELECT DISTINCT ON (pda.workout_assignment_id)
         pda.workout_assignment_id AS wa_id,
         pda.program_assignment_id
  FROM public.program_day_assignments pda
  WHERE pda.workout_assignment_id IS NOT NULL
    AND pda.program_assignment_id IS NOT NULL
  ORDER BY pda.workout_assignment_id, pda.program_assignment_id
) src
WHERE wa.id = src.wa_id
  AND wa.program_assignment_id IS NULL;

-- ----------------------------------------------------------------------------
-- 6. Verification notice (does not fail the migration)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_total       bigint;
  v_program     bigint;
  v_standalone  bigint;
BEGIN
  SELECT COUNT(*) INTO v_total       FROM public.workout_assignments;
  SELECT COUNT(*) INTO v_program     FROM public.workout_assignments WHERE program_assignment_id IS NOT NULL;
  SELECT COUNT(*) INTO v_standalone  FROM public.workout_assignments WHERE program_assignment_id IS NULL;

  RAISE NOTICE 'PR1 backfill: workout_assignments total=%, program-execution=%, standalone=%',
    v_total, v_program, v_standalone;
END $$;

-- ============================================================================
-- End of migration 20260530_workout_assignments_program_assignment_id.sql
-- ============================================================================
